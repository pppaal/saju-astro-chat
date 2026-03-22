import { fetchWithRetry } from '@/lib/http'
import { prepareForMatching } from './utils/koreanTextNormalizer'
import { recommendSpreads } from './tarot-recommend'
import { tarotThemes } from './tarot-spreads-data'

export type QuestionEngineV2FallbackReason =
  | 'auth_failed'
  | 'server_error'
  | 'network_error'
  | 'parse_failed'
  | 'no_candidate'

type EngineLanguage = 'ko' | 'en'
type AnalyzeSource = 'llm' | 'heuristic' | 'fallback'
type QuestionSubject =
  | 'self'
  | 'other_person'
  | 'relationship'
  | 'overall_flow'
  | 'external_situation'
type QuestionTimeframe = 'immediate' | 'near_term' | 'current_phase' | 'mid_term' | 'open'
type QuestionTone = 'prediction' | 'advice' | 'emotion' | 'flow'
type TarotQuestionIntent =
  | 'self_decision'
  | 'other_person_response'
  | 'meeting_likelihood'
  | 'near_term_outcome'
  | 'timing'
  | 'reconciliation'
  | 'inner_feelings'
  | 'unknown'

interface SpreadOption {
  id: string
  themeId: string
  themeTitle: string
  themeTitleKo: string
  title: string
  titleKo: string
  cardCount: number
}

interface QuestionProfileField {
  code: string
  label: string
}

interface QuestionProfile {
  type: QuestionProfileField
  subject: QuestionProfileField
  focus: QuestionProfileField
  timeframe: QuestionProfileField
  tone: QuestionProfileField
}

interface StructuredIntent {
  questionType: TarotQuestionIntent
  subject: QuestionSubject
  focus: string
  timeframe: QuestionTimeframe
  tone: QuestionTone
}

interface EngineSpreadOption {
  themeId: string
  themeTitle: string
  spreadId: string
  spreadTitle: string
  cardCount: number
  reason: string
  matchScore: number | null
  path: string
  recommended: boolean
}

interface LLMAnalysisPayload {
  questionType?: string
  subject?: string
  focus?: string
  timeframe?: string
  tone?: string
  themeId?: string
  spreadId?: string
  reason?: string
  userFriendlyExplanation?: string
  directAnswer?: string
}

interface PrimarySelection {
  themeId: string
  spreadId: string
  reason: string
  userFriendlyExplanation: string
}

export interface QuestionEngineV2Result {
  isDangerous: boolean
  message?: string
  themeId: string
  spreadId: string
  spreadTitle: string
  cardCount: number
  userFriendlyExplanation: string
  question_summary: string
  question_profile: QuestionProfile
  direct_answer: string
  intent: string
  intent_label: string
  recommended_spreads: EngineSpreadOption[]
  path: string
  source: AnalyzeSource
  fallback_reason: QuestionEngineV2FallbackReason | null
}

const DANGEROUS_KEYWORDS = [
  '자살',
  '죽고 싶',
  '죽을래',
  '살기 싫',
  '끝내고 싶',
  '죽어버릴',
  '자해',
  '목숨',
  '생을 마감',
  '세상 떠나',
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
]

function getSpreadOptions(): SpreadOption[] {
  const options: SpreadOption[] = []

  for (const theme of tarotThemes) {
    for (const spread of theme.spreads) {
      options.push({
        id: spread.id,
        themeId: theme.id,
        themeTitle: theme.category,
        themeTitleKo: theme.categoryKo || theme.category,
        title: spread.title,
        titleKo: spread.titleKo || spread.title,
        cardCount: spread.cardCount,
      })
    }
  }

  return options
}

function buildPath(themeId: string, spreadId: string, question: string) {
  return `/tarot/${themeId}/${spreadId}?question=${encodeURIComponent(question)}`
}

async function callOpenAI(messages: { role: string; content: string }[], maxTokens = 420) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY_MISSING')
  }

  const response = await fetchWithRetry(
    'https://api.openai.com/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    },
    {
      maxRetries: 2,
      initialDelayMs: 500,
      maxDelayMs: 2000,
      timeoutMs: 12000,
      retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],
    }
  )

  if (!response.ok) {
    throw new Error(await response.text())
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

function isDangerousQuestion(question: string) {
  const normalized = question.toLowerCase()
  return DANGEROUS_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()))
}

function buildQuestionVariants(question: string): string[] {
  const variants = prepareForMatching(question)
    .map((entry) => entry.trim())
    .filter(Boolean)

  return Array.from(new Set([question.trim(), ...variants])).slice(0, 6)
}

function hasPattern(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text))
}

function hasRelationshipSignal(questionVariants: string[]) {
  const joined = questionVariants.join(' ').toLowerCase()
  return /(우리\s*관계|관계|사이|연애|결혼|사귀|만나는\s*사람|썸|애인|남자친구|여자친구|남친|여친|배우자|소개팅|커플|부부|relationship|dating|marriage|partner)/.test(
    joined
  )
}

function hasSelfDecisionSignal(questionVariants: string[]) {
  const joined = questionVariants.join(' ').toLowerCase()
  return /(내가.*(해야|해도|하면|움직이면|연락하면|사과하면|고백하면|선택하면|기다리면)|(하는\s*게|하는게|해도|가도|믿어도|사인해도|이어가도|그만둬도|쉬는\s*게|참고\s*기다리면)\s*(맞아|맞을까|나아|괜찮을까|될까)|먼저\s*연락|할지\s*말지|해야\s*할까|해야\s*돼|should i|shall i|can i|may i|not sure if i should)/.test(
    joined
  )
}

function detectQuestionIntent(questionVariants: string[]): TarotQuestionIntent {
  const joined = questionVariants
    .map((variant) => variant.toLowerCase().replace(/\s+/g, ' ').trim())
    .join(' || ')

  const reconciliationPatterns = [
    /재회/,
    /다시 만나/,
    /돌아오/,
    /복합/,
    /헤어졌/,
    /get back together/,
    /reconcil/,
    /come back/,
    /ex\b/,
  ]
  if (hasPattern(joined, reconciliationPatterns)) {
    return 'reconciliation'
  }

  const innerFeelingPatterns = [
    /속마음/,
    /그 사람 마음/,
    /상대(방)? 마음/,
    /어떻게 생각/,
    /좋아하/,
    /관심 있/,
    /ë¯¸ë ¨ ìžˆ/,
    /ìˆ¨ê¸°ëŠ” ê°ì •/,
    /ì‹ì€ ê±¸ê¹Œ/,
    /ë‚˜ë¥¼ ì–´ë–»ê²Œ ë³´/,
    /ì™œ .*ê±°ë¦¬ ë‘/,
    /ì™œ .*ì½ì”¹/,
    /feelings?/,
    /feel about me/,
    /think of me/,
    /into me/,
  ]
  if (hasPattern(joined, innerFeelingPatterns)) {
    return 'inner_feelings'
  }

  if (
    /(\uC0DD\uAC01\uD574\??|\uAC70\uB9AC\s*\uB450\uB294\uC9C0|\uBBF8\uB828\s*\uC788\uC5B4\??|\uC228\uAE30\uB294\s*\uAC10\uC815|\uB9C8\uC74C\uC774\s*\uC2DD\uC740\s*\uAC78\uAE4C)/.test(
      joined
    )
  ) {
    return 'inner_feelings'
  }

  const timingPatterns = [
    /언제/,
    /시기/,
    /타이밍/,
    /몇 월/,
    /\bwhen\b/,
    /\btiming\b/,
    /what time/,
    /right moment/,
    /best time/,
  ]
  if (hasPattern(joined, timingPatterns)) {
    return 'timing'
  }

  const broadFlowPatterns = [
    /(\uD750\uB984|\uC804\uCCB4\s*\uD750\uB984|\uD070\s*\uD750\uB984|\uAD6D\uBA74|\uBC29\uD5A5)/,
    /(\uC6B4\s*\uC5B4\uB54C|\uCCB4\uD06C\uD574\uC918|\uAD81\uAE08\uD574|\uC54C\uACE0\s*\uC2F6\uC5B4)/,
    /(\uBC30\uC6CC\uC57C\s*\uD560\s*\uAC74|\uC65C\s*\uC790\uAFB8\s*\uAF2C\uC774\uB294\uC9C0)/,
    /overall flow|big picture|current flow|direction/,
  ]
  if (hasPattern(joined, broadFlowPatterns)) {
    return 'unknown'
  }

  const otherSubjectPatterns = [
    /그 사람|그사람|상대(방)?|그분|그녀|그가|걔|얘|전남친|전여친/,
    /\bthey\b|\bhe\b|\bshe\b|\bpartner\b|\bex\b/,
  ]
  const namedOtherSubjectPatterns = [
    /[가-힣]{2,4}(이|가)\s*(나|내|저|제)를/,
    /[가-힣]{2,4}(이|가)\s*(나|내|저|제)에게/,
    /[가-힣]{2,4}(이|가)\s*(나|내|저|제)한테/,
    /[가-힣]{2,4}(이|가)\s*(내일|오늘|이번|곧)/,
    /[가-힣]{2,4}(이|가)\s*(연락|답장|만나|올|답할|말할|뭐라|무슨 말)/,
  ]
  const hasOtherSubject =
    hasPattern(joined, otherSubjectPatterns) || hasPattern(joined, namedOtherSubjectPatterns)

  const meetingLikelihoodPatterns = [
    /만날까|만날 수|만날 가능/,
    /성사될까|가능성/,
    /연락 올까|답장 올까/,
    /(\uC5F0\uB77D\uD560\s*\uD655\uB960|\uB2F5\uC7A5\uD560\s*\uD655\uB960|\uC5F0\uB77D\s*\uAC00\uB2A5\uC131|\uB2F5\uC7A5\s*\uAC00\uB2A5\uC131)/,
    /\bmeet\b|\bmeeting\b|\bshow up\b/,
    /\breply\b|\brespond\b/,
  ]
  if (hasOtherSubject && hasPattern(joined, meetingLikelihoodPatterns)) {
    return 'meeting_likelihood'
  }

  if (/(\uC5F0\uB77D\s*\uC62C\uAE4C|\uC911\uC694\uD55C\s*\uC5F0\uB77D)/.test(joined)) {
    return 'meeting_likelihood'
  }

  const otherResponsePatterns = [
    /해줄까|올까|볼까|답할까|받아줄까|반응|말할까|무슨 말|뭐라(고)? 할까|어떻게 말할까/,
    /ë°˜ì‘ì´ ì–´ë–¨ê¹Œ|ë‹¤ì‹œ ìƒê° ë°”ê¿€ê¹Œ/,
    /(\uBC18\uC751\uC774\s*\uC5B4\uB5A8\uAE4C|\uB2E4\uC2DC\s*\uC0DD\uAC01\s*\uBC14\uAFC0\uAE4C)/,
    /will (they|he|she)/,
    /would (they|he|she)/,
    /do (they|he|she)/,
    /what will (they|he|she) say/,
  ]
  if (hasOtherSubject && hasPattern(joined, otherResponsePatterns)) {
    return 'other_person_response'
  }

  const selfDecisionPatterns = [
    /할까|해야 할까|해도 될까|할지 말지|가도 될까|보내도 될까/,
    /\bshould i\b|\bshall i\b|\bcan i\b|\bmay i\b/,
    /thinking about/,
    /not sure if i should/,
  ]
  if (hasSelfDecisionSignal(questionVariants) || hasPattern(joined, selfDecisionPatterns)) {
    return 'self_decision'
  }

  if (/(\uB2E4\uC74C\s*\uD55C\s*\uC218|\uBC29\uD5A5\s*\uB9DE\uC544|\uBB50\uC5EC\uC57C\s*\uD574|\uC870\uC5B8\uC740|\uB193\uCE58\uACE0\s*\uC788\uB294\s*\uAC74\s*\uBB50)/.test(joined)) {
    return 'self_decision'
  }
  if (/(\uC9C1\uC7A5\s*\uC62E\uAE30\uBA74|\uC774\uC9C1\uD574\uB3C4|\uC62E\uAE30\uBA74\s*\uB098\uC744\uAE4C)/.test(joined)) {
    return 'self_decision'
  }

  const nearTermOutcomePatterns = [
    /결과|성공|실패|붙을까|합격|될까/,
    /가능성|확률|전망/,
    /(\uC798\s*\uB05D\uB0A0\uAE4C|\uC624\uB798\uAC08\uAE4C|\uB05D\uB09C\s*\uAC78\uAE4C|\uAD1C\uCC2E\uC744\uAE4C|\uC5B4\uB5BB\uAC8C\s*\uB420\uAE4C|\uBD84\uC704\uAE30\s*\uC5B4\uB54C|\uBD84\uC704\uAE30\s*\uC5B4\uB5A8\uAE4C)/,
    /\boutcome\b|\bchance\b|\blikely\b|\bprobability\b/,
    /\bwill it\b/,
  ]
  if (hasPattern(joined, nearTermOutcomePatterns)) {
    return 'near_term_outcome'
  }

  return 'unknown'
}

function hasStrongOtherSubjectSignal(questionVariants: string[]) {
  const joined = questionVariants.join(' ').toLowerCase()
  return /([가-힣]{2,4}(이|가).*(나|내|저|제))|(그 사람|그사람|상대|전남친|전여친|partner|ex|they|he|she)/.test(
    joined
  )
}

function hasStrongFlowSignal(questionVariants: string[]) {
  const joined = questionVariants.join(' ').toLowerCase()
  return /(전체 흐름|흐름은|국면|방향|phase|overall flow|big picture|current flow|direction)/.test(
    joined
  )
}

function hasStrongTimingSignal(questionVariants: string[]) {
  const joined = questionVariants.join(' ').toLowerCase()
  return /(언제|시기|타이밍|몇 월|when|timing|what time|right moment|best time)/.test(joined)
}

function detectQuestionSubject(
  questionVariants: string[],
  intent: TarotQuestionIntent
): QuestionSubject {
  if (intent === 'other_person_response' || intent === 'meeting_likelihood') {
    return 'other_person'
  }
  if (intent === 'reconciliation' || intent === 'inner_feelings') {
    return 'relationship'
  }
  if (intent === 'unknown') {
    const joinedUnknown = questionVariants.join(' ').toLowerCase()
    if (hasRelationshipSignal(questionVariants)) {
      return 'relationship'
    }
    if (/(감정|기분|컨디션|상태|feel|emotion|마음)/.test(joinedUnknown)) {
      return 'self'
    }
    if (/(회의|미팅|프로젝트|직장|회사|면접|시험|계약|투자|사업|job|career|exam|interview)/.test(joinedUnknown)) {
      return 'external_situation'
    }
    return 'overall_flow'
  }

  const joined = questionVariants.join(' ').toLowerCase()
  if (hasRelationshipSignal(questionVariants)) {
    return 'relationship'
  }
  if (/(그 사람|상대|전남친|전여친|partner|ex|they|he|she)/.test(joined)) {
    return 'other_person'
  }
  if (/(회사|직장|면접|시험|계약|투자|사업|job|career|exam|interview)/.test(joined)) {
    return 'external_situation'
  }
  if (/(회의|미팅|프로젝트|발표|프레젠테이션)/.test(joined)) {
    return 'external_situation'
  }
  return 'self'
}

function detectQuestionTimeframe(questionVariants: string[]): QuestionTimeframe {
  const joined = questionVariants.join(' ').toLowerCase()
  if (/(오늘|지금|당장|today|right now|immediately|now)/.test(joined)) {
    return 'immediate'
  }
  if (/(내일|이번 주|곧|soon|tomorrow|this week|next few days)/.test(joined)) {
    return 'near_term'
  }
  if (/(지금.*흐름|현재.*국면|overall flow|current phase|current situation)/.test(joined)) {
    return 'current_phase'
  }
  if (/(이번 달|올해|3개월|6개월|month|year|quarter)/.test(joined)) {
    return 'mid_term'
  }
  return 'open'
}

function detectQuestionTone(
  intent: TarotQuestionIntent,
  questionVariants: string[]
): QuestionTone {
  const joined = questionVariants.join(' ').toLowerCase()
  if (intent === 'inner_feelings') {
    return 'emotion'
  }
  if (intent === 'unknown' || /(흐름|국면|overall flow|direction|phase)/.test(joined)) {
    return 'flow'
  }
  if (intent === 'self_decision' || /(어떻게|해야|조언|what should i|advice)/.test(joined)) {
    return 'advice'
  }
  return 'prediction'
}

function normalizeQuestionType(
  value: string | undefined,
  fallback: TarotQuestionIntent
): TarotQuestionIntent {
  const allowed: TarotQuestionIntent[] = [
    'self_decision',
    'other_person_response',
    'meeting_likelihood',
    'near_term_outcome',
    'timing',
    'reconciliation',
    'inner_feelings',
    'unknown',
  ]
  return value && allowed.includes(value as TarotQuestionIntent)
    ? (value as TarotQuestionIntent)
    : fallback
}

function normalizeSubject(value: string | undefined, fallback: QuestionSubject): QuestionSubject {
  const allowed: QuestionSubject[] = [
    'self',
    'other_person',
    'relationship',
    'overall_flow',
    'external_situation',
  ]
  return value && allowed.includes(value as QuestionSubject) ? (value as QuestionSubject) : fallback
}

function normalizeTimeframe(
  value: string | undefined,
  fallback: QuestionTimeframe
): QuestionTimeframe {
  const allowed: QuestionTimeframe[] = ['immediate', 'near_term', 'current_phase', 'mid_term', 'open']
  return value && allowed.includes(value as QuestionTimeframe)
    ? (value as QuestionTimeframe)
    : fallback
}

function normalizeTone(value: string | undefined, fallback: QuestionTone): QuestionTone {
  const allowed: QuestionTone[] = ['prediction', 'advice', 'emotion', 'flow']
  return value && allowed.includes(value as QuestionTone) ? (value as QuestionTone) : fallback
}

function getIntentLabel(intent: TarotQuestionIntent, language: EngineLanguage): string {
  const koLabels: Record<TarotQuestionIntent, string> = {
    self_decision: '내 선택과 행동을 묻는 질문',
    other_person_response: '상대의 반응이나 행동을 묻는 질문',
    meeting_likelihood: '연락 또는 만남 가능성을 묻는 질문',
    near_term_outcome: '가까운 결과를 확인하는 질문',
    timing: '시기를 확인하는 질문',
    reconciliation: '재회 또는 관계 회복 질문',
    inner_feelings: '상대의 속마음을 묻는 질문',
    unknown: '전체 흐름을 살피는 질문',
  }

  const enLabels: Record<TarotQuestionIntent, string> = {
    self_decision: 'A question about your own decision',
    other_person_response: "A question about the other person's response",
    meeting_likelihood: 'A question about contact or meeting likelihood',
    near_term_outcome: 'A question about a near-term outcome',
    timing: 'A timing question',
    reconciliation: 'A reconciliation question',
    inner_feelings: "A question about the other person's feelings",
    unknown: 'A question about the overall flow',
  }

  return language === 'ko' ? koLabels[intent] : enLabels[intent]
}

function getSubjectLabel(subject: QuestionSubject, language: EngineLanguage): string {
  const koLabels: Record<QuestionSubject, string> = {
    self: '나 자신이 주체인 질문',
    other_person: '상대방이 주체인 질문',
    relationship: '관계 자체를 보는 질문',
    overall_flow: '전체 흐름을 보는 질문',
    external_situation: '외부 상황을 보는 질문',
  }
  const enLabels: Record<QuestionSubject, string> = {
    self: 'The subject is you',
    other_person: 'The subject is the other person',
    relationship: 'The subject is the relationship itself',
    overall_flow: 'The subject is the overall flow',
    external_situation: 'The subject is the external situation',
  }
  return language === 'ko' ? koLabels[subject] : enLabels[subject]
}

function getFocusLabel(intent: TarotQuestionIntent, language: EngineLanguage): string {
  const koLabels: Record<TarotQuestionIntent, string> = {
    self_decision: '내 선택과 행동 방향',
    other_person_response: '상대의 반응과 다음 행동',
    meeting_likelihood: '연락 또는 만남 성사 가능성',
    near_term_outcome: '가까운 결과와 전개',
    timing: '적절한 시기와 타이밍',
    reconciliation: '재회 가능성과 관계 회복 조건',
    inner_feelings: '겉으로 보이지 않는 속마음',
    unknown: '현재 국면과 전체 흐름',
  }
  const enLabels: Record<TarotQuestionIntent, string> = {
    self_decision: 'Your decision and next move',
    other_person_response: "The other person's response and next action",
    meeting_likelihood: 'Likelihood of contact or meeting',
    near_term_outcome: 'Near-term outcome and direction',
    timing: 'Timing and right moment',
    reconciliation: 'Reconciliation potential and conditions',
    inner_feelings: 'Hidden feelings beneath the surface',
    unknown: 'Current phase and overall flow',
  }
  return language === 'ko' ? koLabels[intent] : enLabels[intent]
}

function getTimeframeLabel(timeframe: QuestionTimeframe, language: EngineLanguage): string {
  const koLabels: Record<QuestionTimeframe, string> = {
    immediate: '아주 단기',
    near_term: '단기',
    current_phase: '현재 국면',
    mid_term: '중기',
    open: '시간축이 열려 있음',
  }
  const enLabels: Record<QuestionTimeframe, string> = {
    immediate: 'Immediate',
    near_term: 'Near term',
    current_phase: 'Current phase',
    mid_term: 'Mid term',
    open: 'Open-ended timeframe',
  }
  return language === 'ko' ? koLabels[timeframe] : enLabels[timeframe]
}

function getToneLabel(tone: QuestionTone, language: EngineLanguage): string {
  const koLabels: Record<QuestionTone, string> = {
    prediction: '예측 중심',
    advice: '조언 중심',
    emotion: '감정 해석 중심',
    flow: '흐름 해석 중심',
  }
  const enLabels: Record<QuestionTone, string> = {
    prediction: 'Prediction-focused',
    advice: 'Advice-focused',
    emotion: 'Emotion-focused',
    flow: 'Flow-focused',
  }
  return language === 'ko' ? koLabels[tone] : enLabels[tone]
}

function buildHeuristicIntent(
  questionVariants: string[],
  language: EngineLanguage
): StructuredIntent {
  const questionType = detectQuestionIntent(questionVariants)
  return {
    questionType,
    subject: detectQuestionSubject(questionVariants, questionType),
    focus: getFocusLabel(questionType, language),
    timeframe: detectQuestionTimeframe(questionVariants),
    tone: detectQuestionTone(questionType, questionVariants),
  }
}

function repairIntentAnalysis(
  questionVariants: string[],
  baseIntent: StructuredIntent,
  analysis: LLMAnalysisPayload,
  language: EngineLanguage
): StructuredIntent {
  const next: StructuredIntent = {
    questionType: normalizeQuestionType(analysis.questionType, baseIntent.questionType),
    subject: normalizeSubject(analysis.subject, baseIntent.subject),
    focus: analysis.focus?.trim() || baseIntent.focus,
    timeframe: normalizeTimeframe(analysis.timeframe, baseIntent.timeframe),
    tone: normalizeTone(analysis.tone, baseIntent.tone),
  }

  if (hasStrongOtherSubjectSignal(questionVariants) && next.subject === 'self') {
    next.subject =
      next.questionType === 'reconciliation' || next.questionType === 'inner_feelings'
        ? 'relationship'
        : 'other_person'
  }

  if (
    baseIntent.subject === 'relationship' &&
    (next.subject === 'self' || next.subject === 'overall_flow')
  ) {
    next.subject = 'relationship'
  }

  if (hasStrongFlowSignal(questionVariants)) {
    next.timeframe = 'current_phase'
    next.tone = 'flow'
    if (!analysis.focus || analysis.focus === 'unknown') {
      next.focus = getFocusLabel(next.questionType, language)
    }
  }

  if (hasStrongTimingSignal(questionVariants)) {
    next.timeframe = next.timeframe === 'open' ? 'near_term' : next.timeframe
    if (next.tone === 'flow') {
      next.tone = 'prediction'
    }
  }

  if (
    next.questionType === 'meeting_likelihood' &&
    next.subject !== 'other_person' &&
    next.subject !== 'relationship'
  ) {
    next.subject = 'other_person'
  }

  if (next.questionType === 'unknown' && next.tone === 'prediction' && hasStrongFlowSignal(questionVariants)) {
    next.tone = 'flow'
  }

  return next
}

function buildQuestionProfile(intent: StructuredIntent, language: EngineLanguage): QuestionProfile {
  return {
    type: {
      code: intent.questionType,
      label: getIntentLabel(intent.questionType, language),
    },
    subject: {
      code: intent.subject,
      label: getSubjectLabel(intent.subject, language),
    },
    focus: {
      code: intent.focus,
      label: intent.focus,
    },
    timeframe: {
      code: intent.timeframe,
      label: getTimeframeLabel(intent.timeframe, language),
    },
    tone: {
      code: intent.tone,
      label: getToneLabel(intent.tone, language),
    },
  }
}

function buildQuestionSummary(intent: StructuredIntent, language: EngineLanguage) {
  if (language === 'ko') {
    const summaryByIntent: Record<TarotQuestionIntent, string> = {
      self_decision: '먼저 내 선택 기준을 정리한 뒤 행동 방향을 보는 질문입니다.',
      other_person_response: '상대가 어떻게 반응할지 읽는 질문입니다.',
      meeting_likelihood: '가까운 시점의 연락이나 만남 가능성을 보는 질문입니다.',
      near_term_outcome: '당장 이어질 결과와 전개를 확인하는 질문입니다.',
      timing: '결과보다 적절한 시기와 타이밍을 확인하는 질문입니다.',
      reconciliation: '관계 회복 가능성과 조건을 확인하는 질문입니다.',
      inner_feelings: '겉으로 보이지 않는 상대의 내면을 읽는 질문입니다.',
      unknown: '지금 질문은 전체 흐름과 핵심 포인트를 먼저 읽는 편이 맞습니다.',
    }
    return summaryByIntent[intent.questionType]
  }

  const summaryByIntent: Record<TarotQuestionIntent, string> = {
    self_decision: 'This question is best answered by clarifying your decision criteria first.',
    other_person_response: "This question is mainly about the other person's likely response.",
    meeting_likelihood: 'This question is about near-term contact or meeting probability.',
    near_term_outcome: 'This question is best answered by tracking the next outcome and direction.',
    timing: 'This question is mainly about timing rather than a simple yes or no.',
    reconciliation: 'This question is about reconciliation and the conditions around it.',
    inner_feelings: 'This question is about reading hidden feelings beneath the surface.',
    unknown: 'This question is better treated as an overall flow reading first.',
  }

  return summaryByIntent[intent.questionType]
}

function buildHeuristicDirectAnswer(
  intent: StructuredIntent,
  questionVariants: string[],
  language: EngineLanguage
) {
  const joined = questionVariants.join(' ').toLowerCase()
  const isTomorrow = /(내일|tomorrow)/.test(joined)

  if (language === 'ko') {
    const answers: Record<TarotQuestionIntent, string> = {
      self_decision: '지금은 바로 결정하기보다 기준을 먼저 정리한 뒤 움직이는 편이 좋아 보여요.',
      other_person_response: '상대 반응은 즉각적이기보다 한 템포 늦게 드러날 가능성에 무게가 있어 보여요.',
      meeting_likelihood: isTomorrow
        ? '내일 바로 성사 쪽보다는 간격과 변수 확인이 먼저라서, 기대를 낮추고 가볍게 접근하는 편이 좋아 보여요.'
        : '연락이나 만남은 열려 있지만, 바로 확정된다고 보기보다 천천히 반응을 보는 편이 좋아 보여요.',
      near_term_outcome: '단기 결과는 열려 있지만, 확정적으로 밀기보다 변수 점검이 먼저입니다.',
      timing: '지금은 결과보다 타이밍을 보는 질문이라서, 서두르기보다 시기를 기다리는 편이 맞아 보여요.',
      reconciliation: '지금은 바로 재회를 단정하기보다 관계를 다시 여는 조건부터 보는 편이 맞아 보여요.',
      inner_feelings: '겉으로는 조심스러워 보여도, 내면에서는 신경 쓰는 흐름이 남아 있을 가능성이 있습니다.',
      unknown: '지금 전체 흐름은 확장보다 정리와 기준 재정비가 먼저인 전환기로 읽히는 편입니다.',
    }
    return answers[intent.questionType]
  }

  const answers: Record<TarotQuestionIntent, string> = {
    self_decision:
      'It looks better to clarify your standards first rather than forcing a quick decision.',
    other_person_response:
      "The other person's response looks more delayed than immediate right now.",
    meeting_likelihood: isTomorrow
      ? 'A meeting tomorrow does not look strongly fixed yet, so a lighter approach is better than high expectations.'
      : 'Contact or a meeting is possible, but it looks better to watch the response slowly than expect a fast confirmation.',
    near_term_outcome:
      'The near-term outcome is open, but checking the variables first is better than forcing certainty.',
    timing:
      'This looks more like a timing question, so waiting for the right moment makes more sense than rushing.',
    reconciliation:
      'It looks better to read the conditions for reopening the connection before assuming reconciliation.',
    inner_feelings:
      'Even if the surface looks cautious, there may still be attention and feeling underneath.',
    unknown:
      'The overall flow looks more like a transition phase focused on reordering and resetting your direction.',
  }

  return answers[intent.questionType]
}

function buildHeuristicExplanation(intent: StructuredIntent, language: EngineLanguage) {
  if (language === 'ko') {
    if (intent.tone === 'flow') {
      return '이 질문은 단순 예측보다 현재 국면과 흐름을 먼저 읽는 편이 맞습니다.'
    }
    if (intent.subject === 'other_person') {
      return '내 선택보다 상대의 반응과 움직임을 읽는 쪽이 핵심인 질문입니다.'
    }
    if (intent.tone === 'emotion') {
      return '사실 확인보다 감정선과 내면 상태를 읽는 방식이 더 잘 맞는 질문입니다.'
    }
    return '질문의 핵심 의도를 먼저 정리한 뒤 그에 맞는 스프레드로 들어가는 편이 안정적입니다.'
  }

  if (intent.tone === 'flow') {
    return 'This question is better read as a current phase and flow reading than a narrow prediction.'
  }
  if (intent.subject === 'other_person') {
    return "This question is mainly about the other person's response rather than your own action."
  }
  if (intent.tone === 'emotion') {
    return 'This question is closer to an emotional reading than a factual prediction.'
  }
  return 'This question works better when the real intent is interpreted first and cards are applied after.'
}

function findSpread(themeId: string, spreadId: string, spreadOptions = getSpreadOptions()) {
  return spreadOptions.find((item) => item.themeId === themeId && item.id === spreadId)
}

function chooseIntentStableSpread(
  intent: StructuredIntent,
  question: string,
  spreadOptions: SpreadOption[]
) {
  const stableCandidates: Array<{ themeId: string; spreadId: string }> = []

  if (intent.questionType === 'timing') {
    stableCandidates.push({ themeId: 'decisions-crossroads', spreadId: 'timing-window' })
  }
  if (intent.questionType === 'reconciliation') {
    stableCandidates.push({ themeId: 'love-relationships', spreadId: 'reconciliation' })
  }
  if (intent.questionType === 'inner_feelings' || intent.questionType === 'other_person_response') {
    stableCandidates.push({ themeId: 'love-relationships', spreadId: 'crush-feelings' })
  }
  if (intent.subject === 'relationship' && intent.questionType === 'near_term_outcome') {
    stableCandidates.push({ themeId: 'love-relationships', spreadId: 'relationship-cross' })
  }
  if (intent.subject === 'relationship' && intent.tone === 'emotion') {
    stableCandidates.push({ themeId: 'love-relationships', spreadId: 'relationship-check-in' })
  }
  if (intent.subject === 'relationship') {
    stableCandidates.push({ themeId: 'love-relationships', spreadId: 'relationship-check-in' })
  }
  if (intent.tone === 'flow' || intent.timeframe === 'current_phase') {
    stableCandidates.push({ themeId: 'general-insight', spreadId: 'past-present-future' })
  }
  if (intent.questionType === 'meeting_likelihood') {
    stableCandidates.push({ themeId: 'decisions-crossroads', spreadId: 'yes-no-why' })
  }
  if (intent.subject === 'external_situation' && /(직장|이직|옮기|퇴사|job change|quit)/i.test(question)) {
    stableCandidates.push({ themeId: 'career-work', spreadId: 'job-change' })
  }
  if (intent.questionType === 'self_decision') {
    stableCandidates.push({ themeId: 'decisions-crossroads', spreadId: 'yes-no-why' })
    stableCandidates.push({ themeId: 'decisions-crossroads', spreadId: 'two-paths' })
  }

  if (intent.subject === 'external_situation' && /(직장|이직|옮기|퇴사|job change|quit)/i.test(question)) {
    stableCandidates.push({ themeId: 'career-work', spreadId: 'job-change' })
  }
  if (
    intent.subject === 'external_situation' &&
    intent.questionType === 'near_term_outcome' &&
    /(회의|미팅|프로젝트|계약|사업|투자|발표|프레젠테이션|meeting|project|contract|business|presentation)/i.test(
      question
    )
  ) {
    stableCandidates.push({ themeId: 'general-insight', spreadId: 'past-present-future' })
  }

  if (intent.subject === 'external_situation' && /(면접|interview)/i.test(question)) {
    stableCandidates.push({ themeId: 'career-work', spreadId: 'interview-result' })
  }
  if (intent.subject === 'external_situation' && /(시험|합격|exam)/i.test(question)) {
    stableCandidates.push({ themeId: 'career-work', spreadId: 'exam-pass' })
  }

  for (const candidate of stableCandidates) {
    const spread = findSpread(candidate.themeId, candidate.spreadId, spreadOptions)
    if (spread) {
      return spread
    }
  }

  return null
}

function resolveDeterministicSpread(
  question: string,
  language: EngineLanguage,
  spreadOptions: SpreadOption[],
  questionVariants: string[],
  intent: StructuredIntent
): PrimarySelection {
  const stableIntentSpread = chooseIntentStableSpread(intent, question, spreadOptions)
  if (stableIntentSpread) {
    return {
      themeId: stableIntentSpread.themeId,
      spreadId: stableIntentSpread.id,
      reason:
        language === 'ko'
          ? '질문 의도와 가장 가까운 안정적인 스프레드로 연결했어요.'
          : 'Routed to the most stable spread for this intent.',
      userFriendlyExplanation: buildHeuristicExplanation(intent, language),
    }
  }

  const candidates = Array.from(new Set([question, ...questionVariants].map((q) => q.trim()))).filter(Boolean)
  const ranked = candidates.flatMap((q) =>
    recommendSpreads(q, 3).map((rec) => ({
      ...rec,
      sourceQuestion: q,
    }))
  )

  const sorted = ranked.sort((a, b) => {
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore
    }
    const aIsDefault = a.themeId === 'general-insight' && a.spreadId === 'past-present-future'
    const bIsDefault = b.themeId === 'general-insight' && b.spreadId === 'past-present-future'
    if (aIsDefault !== bIsDefault) {
      return aIsDefault ? 1 : -1
    }
    return 0
  })

  if (sorted.length > 0) {
    const top = sorted[0]
    return {
      themeId: top.themeId,
      spreadId: top.spreadId,
      reason: language === 'ko' ? top.reasonKo || top.reason : top.reason,
      userFriendlyExplanation:
        language === 'ko'
          ? '질문과 가장 가까운 스프레드로 먼저 연결했어요.'
          : 'Routed first to the closest spread for your question.',
    }
  }

  const defaultSpread =
    findSpread('general-insight', 'quick-reading', spreadOptions) || spreadOptions[0]

  return {
    themeId: defaultSpread?.themeId || 'general-insight',
    spreadId: defaultSpread?.id || 'quick-reading',
    reason: language === 'ko' ? '기본 스프레드 추천' : 'Default spread recommendation',
    userFriendlyExplanation:
      language === 'ko'
        ? '질문을 해석할 수 있는 기본 스프레드로 연결했어요.'
        : 'Routed to a default spread that can interpret your question.',
  }
}

function buildRecommendedSpreads(
  question: string,
  language: EngineLanguage,
  primary: { themeId: string; spreadId: string; reason: string },
  spreadOptions: SpreadOption[]
): EngineSpreadOption[] {
  const recommendations: EngineSpreadOption[] = []
  const seen = new Set<string>()

  const addSpread = (
    themeId: string,
    spreadId: string,
    reason: string,
    recommended: boolean,
    matchScore: number | null
  ) => {
    const key = `${themeId}:${spreadId}`
    if (seen.has(key)) {
      return
    }
    const spread = findSpread(themeId, spreadId, spreadOptions)
    if (!spread) {
      return
    }
    recommendations.push({
      themeId,
      themeTitle: language === 'ko' ? spread.themeTitleKo : spread.themeTitle,
      spreadId,
      spreadTitle: spread.titleKo || spread.title,
      cardCount: spread.cardCount,
      reason,
      matchScore,
      path: buildPath(themeId, spreadId, question),
      recommended,
    })
    seen.add(key)
  }

  addSpread(primary.themeId, primary.spreadId, primary.reason, true, null)

  const external = recommendSpreads(question, 3)
  for (const rec of external) {
    addSpread(
      rec.themeId,
      rec.spreadId,
      language === 'ko' ? rec.reasonKo || rec.reason : rec.reason,
      false,
      rec.matchScore
    )
  }

  addSpread(
    'general-insight',
    'quick-reading',
    language === 'ko'
      ? '질문이 흔들려도 핵심을 먼저 읽기 좋은 기본 진입점입니다.'
      : 'A stable starting point when the question is noisy.',
    false,
    null
  )
  addSpread(
    'general-insight',
    'past-present-future',
    language === 'ko'
      ? '질문의 흐름을 시간축으로 정리하기 좋습니다.'
      : 'Useful for reading the flow across time.',
    false,
    null
  )

  return recommendations.slice(0, 3)
}

function isGenericSpread(themeId: string, spreadId: string) {
  return (
    (themeId === 'general-insight' &&
      (spreadId === 'past-present-future' || spreadId === 'quick-reading')) ||
    (themeId === 'daily-reading' && spreadId === 'weekly-forecast')
  )
}

function chooseResolvedIntent(
  heuristicIntent: StructuredIntent,
  llmIntent: StructuredIntent
): StructuredIntent {
  if (heuristicIntent.questionType !== 'unknown' && llmIntent.questionType === 'unknown') {
    return heuristicIntent
  }
  if (heuristicIntent.questionType === 'self_decision' && llmIntent.questionType === 'near_term_outcome') {
    return heuristicIntent
  }
  if (heuristicIntent.questionType === 'timing' && llmIntent.questionType === 'near_term_outcome') {
    return heuristicIntent
  }
  if (
    heuristicIntent.questionType === 'inner_feelings' &&
    llmIntent.questionType === 'other_person_response'
  ) {
    return heuristicIntent
  }
  if (
    heuristicIntent.subject === 'external_situation' &&
    heuristicIntent.questionType === 'near_term_outcome' &&
    (llmIntent.questionType === 'meeting_likelihood' ||
      llmIntent.questionType === 'other_person_response')
  ) {
    return heuristicIntent
  }
  if (
    heuristicIntent.subject === 'relationship' &&
    heuristicIntent.questionType === 'near_term_outcome' &&
    llmIntent.questionType === 'reconciliation'
  ) {
    return heuristicIntent
  }
  return llmIntent
}

function shouldPreferHeuristicSpread(
  heuristicIntent: StructuredIntent,
  resolvedIntent: StructuredIntent,
  heuristicSpread: SpreadOption,
  llmSpread: SpreadOption
) {
  if (heuristicIntent.questionType === 'unknown') {
    return false
  }

  if (llmSpread.themeId === 'self-discovery' && heuristicIntent.subject === 'relationship') {
    return true
  }

  if (
    heuristicSpread.themeId === 'love-relationships' &&
    heuristicIntent.subject === 'relationship' &&
    llmSpread.themeId !== 'love-relationships'
  ) {
    return true
  }

  if (
    heuristicSpread.themeId === 'decisions-crossroads' &&
    heuristicIntent.questionType === 'self_decision' &&
    llmSpread.themeId !== 'decisions-crossroads'
  ) {
    return true
  }

  if (
    heuristicSpread.themeId === 'decisions-crossroads' &&
    heuristicIntent.questionType === 'meeting_likelihood' &&
    llmSpread.themeId !== 'decisions-crossroads'
  ) {
    return true
  }

  if (
    heuristicIntent.subject === 'external_situation' &&
    heuristicIntent.questionType === 'near_term_outcome' &&
    heuristicSpread.themeId === 'general-insight' &&
    llmSpread.themeId === 'daily-reading'
  ) {
    return true
  }

  if (
    resolvedIntent.questionType !== 'unknown' &&
    isGenericSpread(llmSpread.themeId, llmSpread.id) &&
    !isGenericSpread(heuristicSpread.themeId, heuristicSpread.id)
  ) {
    return true
  }

  if (
    resolvedIntent.questionType === 'timing' &&
    heuristicSpread.id === 'timing-window' &&
    llmSpread.id !== 'timing-window'
  ) {
    return true
  }

  if (
    resolvedIntent.questionType === 'reconciliation' &&
    heuristicSpread.id === 'reconciliation' &&
    llmSpread.id !== 'reconciliation'
  ) {
    return true
  }

  if (
    (resolvedIntent.questionType === 'meeting_likelihood' ||
      resolvedIntent.questionType === 'other_person_response' ||
      resolvedIntent.questionType === 'inner_feelings' ||
      resolvedIntent.questionType === 'self_decision') &&
    isGenericSpread(llmSpread.themeId, llmSpread.id) &&
    !isGenericSpread(heuristicSpread.themeId, heuristicSpread.id)
  ) {
    return true
  }

  return false
}

function buildAnalysisPrompt(spreadList: string) {
  return `You are a tarot question understanding engine.

Understand the user's actual intent before any reading starts.
Even if the wording is messy, abbreviated, playful, or indirect, interpret it as a real human question.

Return JSON only with:
- questionType: self_decision | other_person_response | meeting_likelihood | near_term_outcome | timing | reconciliation | inner_feelings | unknown
- subject: self | other_person | relationship | overall_flow | external_situation
- focus: short phrase
- timeframe: immediate | near_term | current_phase | mid_term | open
- tone: prediction | advice | emotion | flow
- directAnswer: 1-2 sentence opener that answers the real question
- userFriendlyExplanation: short explanation of what reading posture fits
- reason: why the chosen spread fits
- themeId: exact theme ID from the list
- spreadId: exact spread ID from the list

Rules:
- When the subject is someone else, do not answer as if it were about the user.
- Broad questions should stay broad.
- Timing questions should talk about timing posture, not fake certainty.
- Weird questions should still be interpreted as human intent, not dismissed as nonsense.
- Use a stable spread from the list.

Available spreads:
${spreadList}`
}

function classifyOpenAIFailure(error: unknown): QuestionEngineV2FallbackReason {
  if (error instanceof Error && /OPENAI_API_KEY_MISSING/.test(error.message)) {
    return 'auth_failed'
  }
  if (error instanceof SyntaxError) {
    return 'parse_failed'
  }
  return 'server_error'
}

function buildResult(args: {
  question: string
  language: EngineLanguage
  intent: StructuredIntent
  primarySpread: SpreadOption
  reason: string
  userFriendlyExplanation: string
  directAnswer: string
  source: AnalyzeSource
  fallbackReason: QuestionEngineV2FallbackReason | null
  message?: string
  isDangerous?: boolean
  recommended_spreads?: EngineSpreadOption[]
}): QuestionEngineV2Result {
  const questionProfile = buildQuestionProfile(args.intent, args.language)
  const outputIntent =
    args.intent.questionType === 'unknown' &&
    (args.intent.tone === 'flow' ||
      args.intent.subject === 'overall_flow' ||
      args.intent.subject === 'relationship' ||
      args.intent.subject === 'external_situation')
      ? 'broad_flow'
      : args.intent.questionType
  const outputIntentLabel =
    outputIntent === 'broad_flow'
      ? args.language === 'ko'
        ? '큰 흐름과 전체 국면을 보는 질문'
        : 'A question about the bigger flow and overall context'
      : questionProfile.type.label
  const outputQuestionProfile =
    outputIntent === 'broad_flow'
      ? {
          ...questionProfile,
          type: {
            code: 'broad_flow',
            label: outputIntentLabel,
          },
        }
      : questionProfile
  return {
    isDangerous: Boolean(args.isDangerous),
    message: args.message,
    themeId: args.primarySpread.themeId,
    spreadId: args.primarySpread.id,
    spreadTitle: args.primarySpread.titleKo || args.primarySpread.title,
    cardCount: args.primarySpread.cardCount,
    userFriendlyExplanation: args.userFriendlyExplanation,
    question_summary: buildQuestionSummary(args.intent, args.language),
    question_profile: outputQuestionProfile,
    direct_answer: args.directAnswer,
    intent: outputIntent,
    intent_label: outputIntentLabel,
    recommended_spreads:
      args.recommended_spreads ||
      buildRecommendedSpreads(
        args.question,
        args.language,
        {
          themeId: args.primarySpread.themeId,
          spreadId: args.primarySpread.id,
          reason: args.reason,
        },
        getSpreadOptions()
      ),
    path: buildPath(args.primarySpread.themeId, args.primarySpread.id, args.question),
    source: args.source,
    fallback_reason: args.fallbackReason,
  }
}

export async function analyzeTarotQuestionV2(input: {
  question: string
  language: EngineLanguage
}): Promise<QuestionEngineV2Result> {
  const { question, language } = input
  const trimmedQuestion = question.trim()
  const spreadOptions = getSpreadOptions()
  const questionVariants = buildQuestionVariants(trimmedQuestion)
  const heuristicIntent = buildHeuristicIntent(questionVariants, language)
  const heuristicSelection = resolveDeterministicSpread(
    trimmedQuestion,
    language,
    spreadOptions,
    questionVariants,
    heuristicIntent
  )
  const defaultSpread =
    findSpread(heuristicSelection.themeId, heuristicSelection.spreadId, spreadOptions) ||
    findSpread('general-insight', 'quick-reading', spreadOptions) ||
    spreadOptions[0]

  if (!defaultSpread) {
    return {
      isDangerous: false,
      themeId: 'general-insight',
      spreadId: 'quick-reading',
      spreadTitle: language === 'ko' ? '빠른 리딩' : 'Quick Reading',
      cardCount: 1,
      userFriendlyExplanation:
        language === 'ko'
          ? '기본 스프레드를 찾지 못해 최소 설정으로 연결했어요.'
          : 'A minimal default spread was used because no spread could be resolved.',
      question_summary: buildQuestionSummary(heuristicIntent, language),
      question_profile: buildQuestionProfile(heuristicIntent, language),
      direct_answer: buildHeuristicDirectAnswer(heuristicIntent, questionVariants, language),
      intent: heuristicIntent.questionType,
      intent_label: getIntentLabel(heuristicIntent.questionType, language),
      recommended_spreads: [],
      path: buildPath('general-insight', 'quick-reading', trimmedQuestion),
      source: 'fallback',
      fallback_reason: 'no_candidate',
    }
  }

  if (isDangerousQuestion(trimmedQuestion)) {
    return buildResult({
      question: trimmedQuestion,
      language,
      intent: heuristicIntent,
      primarySpread: defaultSpread,
      reason: heuristicSelection.reason,
      userFriendlyExplanation: '',
      directAnswer: '',
      source: 'fallback',
      fallbackReason: 'no_candidate',
      isDangerous: true,
      message:
        language === 'ko'
          ? '힘든 시간을 보내고 계신 것 같아요. 전문가의 도움을 받으시길 권해드려요. 자살예방상담전화: 1393 (24시간)'
          : 'I sense you may be going through a difficult time. Please reach out to a professional or local crisis service.',
      recommended_spreads: [],
    })
  }

  const heuristicResult = buildResult({
    question: trimmedQuestion,
    language,
    intent: heuristicIntent,
    primarySpread: defaultSpread,
    reason: heuristicSelection.reason,
    userFriendlyExplanation: heuristicSelection.userFriendlyExplanation,
    directAnswer: buildHeuristicDirectAnswer(heuristicIntent, questionVariants, language),
    source: 'heuristic',
    fallbackReason: null,
  })

  const spreadList = spreadOptions
    .map((spread) => `- ${spread.themeId}/${spread.id}: ${spread.titleKo || spread.title} (${spread.cardCount} cards)`)
    .join('\n')

  try {
    const responseText = await callOpenAI(
      [
        { role: 'system', content: buildAnalysisPrompt(spreadList) },
        {
          role: 'user',
          content: [
            `Raw question: ${trimmedQuestion}`,
            `Normalized variants: ${questionVariants.join(' || ')}`,
            `Heuristic intent hint: ${JSON.stringify(heuristicIntent)}`,
          ].join('\n'),
        },
      ],
      420
    )

    const parsed = JSON.parse(responseText) as LLMAnalysisPayload
    const repairedLlmIntent = repairIntentAnalysis(questionVariants, heuristicIntent, parsed, language)
    const resolvedIntent = chooseResolvedIntent(heuristicIntent, repairedLlmIntent)
    const parsedPrimarySpread =
      (parsed.themeId && parsed.spreadId && findSpread(parsed.themeId, parsed.spreadId, spreadOptions)) ||
      defaultSpread
    const preferHeuristicSpread = shouldPreferHeuristicSpread(
      heuristicIntent,
      resolvedIntent,
      defaultSpread,
      parsedPrimarySpread
    )
    const primarySpread = preferHeuristicSpread ? defaultSpread : parsedPrimarySpread
    const shouldUseHeuristicCopy =
      preferHeuristicSpread &&
      primarySpread.id === defaultSpread.id &&
      primarySpread.themeId === defaultSpread.themeId

    return buildResult({
      question: trimmedQuestion,
      language,
      intent: resolvedIntent,
      primarySpread,
      reason: shouldUseHeuristicCopy ? heuristicSelection.reason : parsed.reason?.trim() || heuristicSelection.reason,
      userFriendlyExplanation:
        shouldUseHeuristicCopy
          ? heuristicSelection.userFriendlyExplanation
          : parsed.userFriendlyExplanation?.trim() || heuristicSelection.userFriendlyExplanation,
      directAnswer:
        shouldUseHeuristicCopy && heuristicIntent.questionType !== 'unknown'
          ? buildHeuristicDirectAnswer(resolvedIntent, questionVariants, language)
          : parsed.directAnswer?.trim() || buildHeuristicDirectAnswer(resolvedIntent, questionVariants, language),
      source: 'llm',
      fallbackReason: null,
      recommended_spreads: buildRecommendedSpreads(
        trimmedQuestion,
        language,
        {
          themeId: primarySpread.themeId,
          spreadId: primarySpread.id,
          reason: shouldUseHeuristicCopy ? heuristicSelection.reason : parsed.reason?.trim() || heuristicSelection.reason,
        },
        spreadOptions
      ),
    })
  } catch (error) {
    const fallbackReason = classifyOpenAIFailure(error)

    if (fallbackReason === 'auth_failed' || fallbackReason === 'parse_failed' || fallbackReason === 'server_error') {
      return heuristicResult
    }

    return {
      ...heuristicResult,
      source: 'fallback',
      fallback_reason: fallbackReason,
    }
  }
}
