import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data'
import { logger } from '@/lib/logger'
import { PATTERN_MAPPINGS, getExamInterviewMapping } from './pattern-mappings'
import { prepareForMatching } from '@/lib/Tarot/utils/koreanTextNormalizer'
import { recommendSpreads } from '@/lib/Tarot/tarot-recommend'

export interface ParsedResult {
  themeId: string
  spreadId: string
  reason: string
  userFriendlyExplanation: string
  questionType?: string
  subject?: string
  focus?: string
  timeframe?: string
  tone?: string
  directAnswer?: string
}

export interface SpreadOption {
  id: string
  themeId: string
  themeTitle: string
  themeTitleKo: string
  title: string
  titleKo: string
  description: string
  cardCount: number
}

export interface RecommendedSpreadResult {
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

export interface PatternMatch {
  parsed: ParsedResult
  priority: number
  matchedQuestion: string
}

export type AnalyzeSource = 'pattern' | 'llm' | 'fallback'
export type AnalyzeFallbackReason =
  | 'auth_failed'
  | 'rate_limited'
  | 'server_error'
  | 'parse_failed'
  | 'no_candidate'
  | 'invalid_spread'

export type TarotQuestionIntent =
  | 'self_decision'
  | 'other_person_response'
  | 'meeting_likelihood'
  | 'near_term_outcome'
  | 'timing'
  | 'reconciliation'
  | 'inner_feelings'
  | 'unknown'

export type QuestionSubject =
  | 'self'
  | 'other_person'
  | 'relationship'
  | 'overall_flow'
  | 'external_situation'

export type QuestionTimeframe = 'immediate' | 'near_term' | 'current_phase' | 'mid_term' | 'open'

export type QuestionTone = 'prediction' | 'advice' | 'emotion' | 'flow'

export interface QuestionProfileField {
  code: string
  label: string
}

export interface QuestionProfile {
  type: QuestionProfileField
  subject: QuestionProfileField
  focus: QuestionProfileField
  timeframe: QuestionProfileField
  tone: QuestionProfileField
}

export interface IntentAnalysisResult {
  questionType?: string
  subject?: string
  focus?: string
  timeframe?: string
  tone?: string
}

export function getSpreadOptions(): SpreadOption[] {
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
        description: spread.descriptionKo || spread.description,
        cardCount: spread.cardCount,
      })
    }
  }

  return options
}

// 위험한 질문 체크
export const dangerousKeywords = [
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

export function checkDangerous(question: string): boolean {
  const normalized = question.toLowerCase()
  return dangerousKeywords.some((kw) => normalized.includes(kw.toLowerCase()))
}

export function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text))
}

export function detectQuestionIntent(questionVariants: string[]): TarotQuestionIntent {
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
    /feelings?/,
    /feel about me/,
    /think of me/,
    /into me/,
  ]
  if (hasPattern(joined, innerFeelingPatterns)) {
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
    /\bmeet\b|\bmeeting\b|\bshow up\b/,
    /\breply\b|\brespond\b/,
  ]
  if (hasOtherSubject && hasPattern(joined, meetingLikelihoodPatterns)) {
    return 'meeting_likelihood'
  }

  const otherResponsePatterns = [
    /해줄까|올까|볼까|답할까|받아줄까|반응|말할까|무슨 말|뭐라(고)? 할까|어떻게 말할까/,
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
  if (hasPattern(joined, selfDecisionPatterns)) {
    return 'self_decision'
  }

  const nearTermOutcomePatterns = [
    /결과|성공|실패|붙을까|합격|될까/,
    /가능성|확률|전망/,
    /\boutcome\b|\bchance\b|\blikely\b|\bprobability\b/,
    /\bwill it\b/,
  ]
  if (hasPattern(joined, nearTermOutcomePatterns)) {
    return 'near_term_outcome'
  }

  return 'unknown'
}

export function hasStrongOtherSubjectSignal(questionVariants: string[]): boolean {
  const joined = questionVariants.join(' ').toLowerCase()
  return /([가-힣]{2,4}(이|가).*(나|내|저|제))|(그 사람|그사람|상대|전남친|전여친|partner|ex|they|he|she)/.test(
    joined
  )
}

export function hasStrongFlowSignal(questionVariants: string[]): boolean {
  const joined = questionVariants.join(' ').toLowerCase()
  return /(전체 흐름|흐름은|국면|방향|phase|overall flow|big picture|current flow|direction)/.test(
    joined
  )
}

export function hasStrongTimingSignal(questionVariants: string[]): boolean {
  const joined = questionVariants.join(' ').toLowerCase()
  return /(언제|시기|타이밍|몇 월|when|timing|what time|right moment|best time)/.test(joined)
}

export function detectQuestionSubject(
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
    return 'overall_flow'
  }

  const joined = questionVariants.join(' ').toLowerCase()
  if (/(그 사람|상대|전남친|전여친|partner|ex|they|he|she)/.test(joined)) {
    return 'other_person'
  }
  if (/(회사|직장|면접|시험|계약|투자|사업|job|career|exam|interview)/.test(joined)) {
    return 'external_situation'
  }
  return 'self'
}

export function detectQuestionTimeframe(questionVariants: string[]): QuestionTimeframe {
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

export function detectQuestionTone(
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

export function getQuestionTypeLabel(intent: TarotQuestionIntent, language: string): string {
  return getIntentLabel(intent, language)
}

export function getSubjectLabel(subject: QuestionSubject, language: string): string {
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

export function getFocusLabel(intent: TarotQuestionIntent, language: string): string {
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

export function getTimeframeLabel(timeframe: QuestionTimeframe, language: string): string {
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

export function getToneLabel(tone: QuestionTone, language: string): string {
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

export function normalizeSubject(
  value: string | undefined,
  fallback: QuestionSubject
): QuestionSubject {
  const allowed: QuestionSubject[] = [
    'self',
    'other_person',
    'relationship',
    'overall_flow',
    'external_situation',
  ]
  return value && allowed.includes(value as QuestionSubject) ? (value as QuestionSubject) : fallback
}

export function normalizeTimeframe(
  value: string | undefined,
  fallback: QuestionTimeframe
): QuestionTimeframe {
  const allowed: QuestionTimeframe[] = [
    'immediate',
    'near_term',
    'current_phase',
    'mid_term',
    'open',
  ]
  return value && allowed.includes(value as QuestionTimeframe)
    ? (value as QuestionTimeframe)
    : fallback
}

export function normalizeTone(value: string | undefined, fallback: QuestionTone): QuestionTone {
  const allowed: QuestionTone[] = ['prediction', 'advice', 'emotion', 'flow']
  return value && allowed.includes(value as QuestionTone) ? (value as QuestionTone) : fallback
}

export function repairIntentAnalysis(
  questionVariants: string[],
  intent: TarotQuestionIntent,
  analysis: IntentAnalysisResult
): IntentAnalysisResult {
  const repaired = { ...analysis }

  if (hasStrongOtherSubjectSignal(questionVariants) && repaired.subject === 'self') {
    repaired.subject =
      intent === 'reconciliation' || intent === 'inner_feelings' ? 'relationship' : 'other_person'
  }

  if (hasStrongFlowSignal(questionVariants)) {
    repaired.timeframe = 'current_phase'
    repaired.tone = 'flow'
    if (!repaired.focus || repaired.focus === 'unknown') {
      repaired.focus = '현재 국면과 전체 흐름'
    }
  }

  if (hasStrongTimingSignal(questionVariants)) {
    repaired.timeframe = repaired.timeframe === 'open' ? 'near_term' : repaired.timeframe
    repaired.tone = repaired.tone === 'flow' ? 'prediction' : repaired.tone
  }

  if (
    intent === 'meeting_likelihood' &&
    repaired.subject !== 'other_person' &&
    repaired.subject !== 'relationship'
  ) {
    repaired.subject = 'other_person'
  }

  if (
    intent === 'unknown' &&
    repaired.tone === 'prediction' &&
    hasStrongFlowSignal(questionVariants)
  ) {
    repaired.tone = 'flow'
  }

  return repaired
}

export function buildQuestionProfile(
  questionVariants: string[],
  intent: TarotQuestionIntent,
  language: string,
  llmFields?: Partial<ParsedResult>
): QuestionProfile {
  const subjectCode = normalizeSubject(
    llmFields?.subject,
    detectQuestionSubject(questionVariants, intent)
  )
  const timeframeCode = normalizeTimeframe(
    llmFields?.timeframe,
    detectQuestionTimeframe(questionVariants)
  )
  const toneCode = normalizeTone(llmFields?.tone, detectQuestionTone(intent, questionVariants))
  const focusCode = llmFields?.focus || intent
  const typeCode = llmFields?.questionType || intent

  return {
    type: {
      code: typeCode,
      label: getQuestionTypeLabel(intent, language),
    },
    subject: {
      code: subjectCode,
      label: getSubjectLabel(subjectCode, language),
    },
    focus: {
      code: focusCode,
      label: llmFields?.focus || getFocusLabel(intent, language),
    },
    timeframe: {
      code: timeframeCode,
      label: getTimeframeLabel(timeframeCode, language),
    },
    tone: {
      code: toneCode,
      label: getToneLabel(toneCode, language),
    },
  }
}

export function buildDirectAnswer(
  intent: TarotQuestionIntent,
  questionVariants: string[],
  language: string,
  llmDirectAnswer?: string
): string {
  if (typeof llmDirectAnswer === 'string' && llmDirectAnswer.trim()) {
    return llmDirectAnswer.trim()
  }

  const joined = questionVariants.join(' ').toLowerCase()
  const isTomorrow = /(내일|tomorrow)/.test(joined)

  if (language === 'ko') {
    const answers: Record<TarotQuestionIntent, string> = {
      self_decision: '지금은 바로 결정하기보다 기준을 먼저 정리한 뒤 움직이는 편이 좋아 보여요.',
      other_person_response:
        '상대 반응은 즉각적이기보다 한 템포 늦게 드러날 가능성에 무게가 있어 보여요.',
      meeting_likelihood: isTomorrow
        ? '내일 바로 성사 쪽보다는 간격과 변수 확인이 먼저라서, 기대를 낮추고 가볍게 접근하는 편이 좋아 보여요.'
        : '연락이나 만남은 열려 있지만, 바로 확정된다고 보기보다 천천히 반응을 보는 편이 좋아 보여요.',
      near_term_outcome: '단기 결과는 열려 있지만, 확정적으로 밀기보다 변수 점검이 먼저입니다.',
      timing:
        '지금은 결과보다 타이밍을 보는 질문이라서, 서두르기보다 시기를 기다리는 편이 맞아 보여요.',
      reconciliation:
        '지금은 바로 재회를 단정하기보다 관계를 다시 여는 조건부터 보는 편이 맞아 보여요.',
      inner_feelings:
        '겉으로는 조심스러워 보여도, 내면에서는 신경 쓰는 흐름이 남아 있을 가능성이 있습니다.',
      unknown: '지금 전체 흐름은 확장보다 정리와 기준 재정비가 먼저인 전환기로 읽히는 편입니다.',
    }
    return answers[intent]
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
  return answers[intent]
}

// ============================================================
// GPT System Prompts
// ============================================================
export function buildIntentAnalysisPrompt(): string {
  return `You are an expert at understanding tarot user questions before any reading starts.

Your only task is to analyze the structure of the user's question.

Decide:
- questionType: what kind of question this is
- subject: self | other_person | relationship | overall_flow | external_situation
- focus: the real thing being asked
- timeframe: immediate | near_term | current_phase | mid_term | open
- tone: prediction | advice | emotion | flow

Important rules:
- "이차연이 나를 내일 만날까?" => other_person, near_term, prediction
- "지금 나를 둘러싼 전체 흐름은 어떤가요?" => overall_flow, current_phase, flow
- "그 사람이 나를 어떻게 생각해?" => relationship or other_person, emotion
- "내가 먼저 연락해야 할까?" => self, advice
- "이번 달 이직운은 어때?" => external_situation, mid_term, flow or prediction
- When the subject is someone else, do not classify as self just because "할까" appears.
- Be concise. Focus on intent, not keywords alone.
- If the question is broad, do not force it into yes/no.
- Preserve the user's real focus even when the wording is casual or abbreviated.

Output JSON only:
{
  "questionType": "short code",
  "subject": "self | other_person | relationship | overall_flow | external_situation",
  "focus": "short phrase",
  "timeframe": "immediate | near_term | current_phase | mid_term | open",
  "tone": "prediction | advice | emotion | flow"
}`
}

export function buildAnswerAndSpreadPrompt(spreadListForPrompt: string): string {
  return `You are an expert tarot pre-reader and spread router.

You will receive:
1. The user's raw question
2. A structured intent analysis prepared beforehand

Your job:
- Give a short direct answer first. This answer should feel like a real reading opener.
- Then choose the single best spread from the list.

Direct answer rules:
- 1-2 sentences only
- cautious, readable, and emotionally natural
- answer the user's real question directly
- do not mention cards, spreads, prompts, or internal analysis
- do not overclaim certainty
- if the question is broad, answer the broad flow first
- if the question is about another person, do not accidentally answer as if it were about the user
- if the question is about timing, answer with timing posture rather than fake certainty

Spread selection rules:
- use the structured analysis as the primary guide
- prefer semantic fit over surface keywords
- choose one exact spread ID from the list

Examples of good direct answers:
- "내일 바로 성사 쪽보다는 간격과 변수 확인이 먼저라서, 기대를 낮추고 가볍게 접근하는 편이 좋아 보여요."
- "지금 전체 흐름은 정리와 재정비가 먼저인 전환기로 읽혀요."
- "지금 먼저 움직일 수는 있지만, 강하게 밀기보다 반응을 볼 여지를 남기는 편이 좋아 보여요."

Available spreads:
${spreadListForPrompt}

Output JSON only:
{
  "themeId": "exact theme ID from list",
  "spreadId": "exact spread ID from list",
  "reason": "why this spread fits",
  "userFriendlyExplanation": "short user-facing explanation",
  "directAnswer": "1-2 sentence direct answer before the spread"
}`
}

// ============================================================
// Pattern Matching Corrections (Data-Driven)
// ============================================================
export function findPatternMatch(
  questionVariants: string[],
  language: string
): PatternMatch | null {
  for (const variant of questionVariants) {
    const examMapping = getExamInterviewMapping(variant, language)
    if (examMapping) {
      return {
        parsed: examMapping,
        priority: 0,
        matchedQuestion: variant,
      }
    }

    for (const mapping of PATTERN_MAPPINGS) {
      if (mapping.check(variant)) {
        return {
          parsed: {
            themeId: mapping.themeId,
            spreadId: mapping.targetSpread,
            reason: mapping.reason,
            userFriendlyExplanation:
              language === 'ko' ? mapping.koExplanation : mapping.enExplanation,
          },
          priority: mapping.priority,
          matchedQuestion: variant,
        }
      }
    }
  }

  return null
}

export function buildQuestionVariants(question: string): string[] {
  const variants = prepareForMatching(question)
  const trimmed = variants.map((entry) => entry.trim()).filter(Boolean)
  const unique = Array.from(new Set(trimmed))
  return unique.slice(0, 6)
}

export function formatQuestionForPrompt(
  questionVariants: string[],
  detectedIntent: TarotQuestionIntent
): string {
  const [raw, ...rest] = questionVariants
  const hintLine =
    detectedIntent !== 'unknown'
      ? `Intent hint (heuristic, non-binding): ${detectedIntent}`
      : 'Intent hint (heuristic, non-binding): unknown'
  if (rest.length === 0) {
    return `${hintLine}\n사용자 질문: "${raw}"`
  }
  return `${hintLine}\n사용자 질문(원문): "${raw}"\n정규화/보정 버전: ${rest.map((q) => `"${q}"`).join(', ')}`
}

export function revalidateWithRecommendations(
  parsed: ParsedResult,
  question: string,
  language: string,
  spreadOptions: SpreadOption[]
): ParsedResult {
  const selectedExists = spreadOptions.some(
    (s) => s.themeId === parsed.themeId && s.id === parsed.spreadId
  )

  // Keep AI autonomy: if AI picked a valid spread, don't override it with recommender heuristics.
  if (selectedExists) {
    return parsed
  }

  const recommended = recommendSpreads(question, 3)
  if (!recommended.length) {
    return parsed
  }

  const top = recommended[0]
  logger.info(
    `[analyze-question] Invalid AI spread replaced by recommender: "${question}" -> ${top.themeId}/${top.spreadId} (was: ${parsed.themeId}/${parsed.spreadId})`
  )

  return {
    themeId: top.themeId,
    spreadId: top.spreadId,
    reason: top.reasonKo || top.reason,
    userFriendlyExplanation:
      language === 'ko'
        ? '질문 의도와 가장 가까운 스프레드로 조정했어요'
        : "Adjusted to the spread that best matches your question's intent.",
  }
}

export function getIntentLabel(intent: TarotQuestionIntent, language: string): string {
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

export function buildQuestionSummary(
  question: string,
  intent: TarotQuestionIntent,
  language: string
): string {
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
    return summaryByIntent[intent]
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

  return summaryByIntent[intent]
}

export function buildPath(themeId: string, spreadId: string, question: string): string {
  return `/tarot/${themeId}/${spreadId}?question=${encodeURIComponent(question)}`
}

export function buildRecommendedSpreads(
  question: string,
  language: string,
  spreadOptions: SpreadOption[],
  parsed: ParsedResult
): RecommendedSpreadResult[] {
  const selectedSpread = spreadOptions.find(
    (option) => option.themeId === parsed.themeId && option.id === parsed.spreadId
  )
  const ranked = recommendSpreads(question, 3)
  const results: RecommendedSpreadResult[] = []
  const seen = new Set<string>()

  if (selectedSpread) {
    const selectedScore =
      ranked.find(
        (item) => item.themeId === selectedSpread.themeId && item.spreadId === selectedSpread.id
      )?.matchScore ?? null
    const selectedReason =
      parsed.reason ||
      (language === 'ko' ? '질문 의도와 가장 가까운 선택' : 'Closest fit for your question')

    results.push({
      themeId: selectedSpread.themeId,
      themeTitle: language === 'ko' ? selectedSpread.themeTitleKo : selectedSpread.themeTitle,
      spreadId: selectedSpread.id,
      spreadTitle: selectedSpread.titleKo || selectedSpread.title,
      cardCount: selectedSpread.cardCount,
      reason: selectedReason,
      matchScore: selectedScore,
      path: buildPath(selectedSpread.themeId, selectedSpread.id, question),
      recommended: true,
    })
    seen.add(`${selectedSpread.themeId}:${selectedSpread.id}`)
  }

  for (const recommendation of ranked) {
    const key = `${recommendation.themeId}:${recommendation.spreadId}`
    if (seen.has(key)) {
      continue
    }

    const matchedSpread = spreadOptions.find(
      (option) => option.themeId === recommendation.themeId && option.id === recommendation.spreadId
    )

    if (!matchedSpread) {
      continue
    }

    results.push({
      themeId: matchedSpread.themeId,
      themeTitle: language === 'ko' ? matchedSpread.themeTitleKo : matchedSpread.themeTitle,
      spreadId: matchedSpread.id,
      spreadTitle: matchedSpread.titleKo || matchedSpread.title,
      cardCount: matchedSpread.cardCount,
      reason: language === 'ko' ? recommendation.reasonKo : recommendation.reason,
      matchScore: recommendation.matchScore,
      path: buildPath(matchedSpread.themeId, matchedSpread.id, question),
      recommended: results.length === 0,
    })
    seen.add(key)
  }

  return results.slice(0, 3)
}

export function resolveDeterministicFallback(
  question: string,
  language: string,
  spreadOptions: SpreadOption[],
  questionVariants: string[] = []
): ParsedResult {
  const candidates = Array.from(
    new Set([question, ...questionVariants].map((q) => q.trim()))
  ).filter(Boolean)

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
    // Prefer non-default general fallback when scores tie
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
      reason: top.reasonKo || top.reason,
      userFriendlyExplanation:
        language === 'ko'
          ? '질문과 가장 가까운 기본 스프레드로 연결했어요'
          : 'Routed to the closest default spread for your question.',
    }
  }

  const defaultSpread =
    spreadOptions.find((s) => s.themeId === 'general-insight' && s.id === 'quick-reading') ||
    spreadOptions[0]

  if (defaultSpread) {
    return {
      themeId: defaultSpread.themeId,
      spreadId: defaultSpread.id,
      reason: language === 'ko' ? '기본 스프레드 추천' : 'Default spread recommendation',
      userFriendlyExplanation:
        language === 'ko'
          ? '질문을 해석할 수 있는 기본 스프레드로 연결했어요'
          : 'Routed to a default spread that can interpret your question.',
    }
  }

  return {
    themeId: 'general-insight',
    spreadId: 'past-present-future',
    reason: language === 'ko' ? '기본 흐름 확인' : 'General flow check',
    userFriendlyExplanation:
      language === 'ko' ? '기본 흐름 스프레드를 사용했어요' : 'Using general flow spread.',
  }
}
