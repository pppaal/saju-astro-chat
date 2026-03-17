import { tarotThemes } from './tarot-spreads-data'
import { prepareForMatching } from './utils/koreanTextNormalizer'
import { recommendSpreads } from './tarot-recommend'
import { fetchWithRetry } from '@/lib/http'

export type QuestionEngineV2FallbackReason =
  | 'auth_failed'
  | 'server_error'
  | 'network_error'
  | 'parse_failed'
  | 'no_candidate'

type EngineLanguage = 'ko' | 'en'
type QuestionSubject = 'self' | 'other_person' | 'relationship' | 'overall_flow' | 'external_situation'
type QuestionTimeframe = 'immediate' | 'near_term' | 'current_phase' | 'mid_term' | 'open'
type QuestionTone = 'prediction' | 'advice' | 'emotion' | 'flow'

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
  questionType: string
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
  source: 'llm' | 'fallback'
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

async function callOpenAI(messages: { role: string; content: string }[], maxTokens = 300) {
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

function getIntentPrompt() {
  return `You are a tarot question understanding engine.

Your job is not to recommend a spread first.
Your job is to understand what the user really means, even if the question is messy, weird, casual, indirect, or playful.

Classify:
- questionType: short code
- subject: self | other_person | relationship | overall_flow | external_situation
- focus: short phrase of the real question
- timeframe: immediate | near_term | current_phase | mid_term | open
- tone: prediction | advice | emotion | flow

Examples:
- "내일 이차연이 무슨 대답을 할까?" => other_person, near_term, prediction
- "지금 나를 둘러싼 전체 흐름은 어떤가요?" => overall_flow, current_phase, flow
- "내일 똥을 싸면 무슨 감정일까?" => self, immediate, emotion or flow, focus on psychological state and condition
- "내가 먼저 연락해야 할까?" => self, advice

Output JSON only.`
}

function getAnswerPrompt(spreadList: string) {
  return `You are a tarot pre-reading engine.

You will receive the user's raw question and a structured intent analysis.
Return:
- directAnswer: 1-2 sentence answer that directly responds to the question
- userFriendlyExplanation: explain what kind of reading posture fits this question
- reason: why the primary spread fits
- themeId / spreadId: choose one stable spread from the list

Rules:
- Understand weird or playful questions as human intent, not literal nonsense
- Answer the real question first
- Do not mention prompts, internal analysis, or spreads in directAnswer
- Prefer stable general spreads unless the fit is very clear
- If the question is broad, use a broad spread
- If the question is messy, still answer it naturally

Available spreads:
${spreadList}

Output JSON only.`
}

function detectSubject(question: string): QuestionSubject {
  if (/(그 사람|그사람|상대|전남친|전여친|partner|ex|they|he|she|이차연)/i.test(question)) {
    return 'other_person'
  }
  if (/(관계|재회|속마음|연애|relationship|reconciliation|feelings)/i.test(question)) {
    return 'relationship'
  }
  if (/(전체 흐름|흐름|국면|overall flow|direction|phase)/i.test(question)) {
    return 'overall_flow'
  }
  if (/(회사|직장|돈|재물|시험|면접|career|money|exam|interview)/i.test(question)) {
    return 'external_situation'
  }
  return 'self'
}

function detectTimeframe(question: string): QuestionTimeframe {
  if (/(오늘|지금|당장|today|right now|now|immediately)/i.test(question)) {
    return 'immediate'
  }
  if (/(내일|이번 주|곧|soon|tomorrow|this week)/i.test(question)) {
    return 'near_term'
  }
  if (/(흐름|국면|overall flow|current phase)/i.test(question)) {
    return 'current_phase'
  }
  if (/(이번 달|올해|3개월|month|year|quarter)/i.test(question)) {
    return 'mid_term'
  }
  return 'open'
}

function detectTone(question: string): QuestionTone {
  if (/(속마음|기분|감정|feel|emotion|마음)/i.test(question)) {
    return 'emotion'
  }
  if (/(흐름|국면|overall flow|phase|direction)/i.test(question)) {
    return 'flow'
  }
  if (/(어떻게|해야|조언|what should i|advice)/i.test(question)) {
    return 'advice'
  }
  return 'prediction'
}

function detectQuestionType(question: string): string {
  if (/(무슨 대답|뭐라고|답장|반응|response|reply)/i.test(question)) {
    return 'other_response'
  }
  if (/(속마음|감정|feelings?|emotion)/i.test(question)) {
    return 'emotion_read'
  }
  if (/(흐름|국면|overall flow|direction)/i.test(question)) {
    return 'flow_read'
  }
  if (/(할까|해야 할까|should i)/i.test(question)) {
    return 'decision'
  }
  return 'open_read'
}

function fallbackIntent(question: string, language: EngineLanguage): StructuredIntent {
  const subject = detectSubject(question)
  const timeframe = detectTimeframe(question)
  const tone = detectTone(question)
  const questionType = detectQuestionType(question)

  return {
    questionType,
    subject,
    focus:
      language === 'ko'
        ? '질문의 실제 의도와 감정 포인트'
        : 'The real intent and emotional focus of the question',
    timeframe,
    tone,
  }
}

function getLabelMap(language: EngineLanguage) {
  return {
    typeLabels: {
      other_response: language === 'ko' ? '상대 반응 질문' : 'A question about another person response',
      emotion_read: language === 'ko' ? '감정 해석 질문' : 'An emotion reading question',
      flow_read: language === 'ko' ? '흐름 해석 질문' : 'A flow reading question',
      decision: language === 'ko' ? '선택/조언 질문' : 'A decision or advice question',
      open_read: language === 'ko' ? '열린 질문' : 'An open reading question',
    } as Record<string, string>,
    subjectLabels: {
      self: language === 'ko' ? '나 자신이 주체인 질문' : 'The subject is you',
      other_person: language === 'ko' ? '상대방이 주체인 질문' : 'The subject is the other person',
      relationship: language === 'ko' ? '관계 자체를 보는 질문' : 'The subject is the relationship',
      overall_flow: language === 'ko' ? '전체 흐름을 보는 질문' : 'The subject is the overall flow',
      external_situation:
        language === 'ko' ? '외부 상황을 보는 질문' : 'The subject is the external situation',
    } as Record<QuestionSubject, string>,
    timeframeLabels: {
      immediate: language === 'ko' ? '아주 단기' : 'Immediate',
      near_term: language === 'ko' ? '단기' : 'Near term',
      current_phase: language === 'ko' ? '현재 국면' : 'Current phase',
      mid_term: language === 'ko' ? '중기' : 'Mid term',
      open: language === 'ko' ? '시간축이 열려 있음' : 'Open-ended timeframe',
    } as Record<QuestionTimeframe, string>,
    toneLabels: {
      prediction: language === 'ko' ? '예측 중심' : 'Prediction-focused',
      advice: language === 'ko' ? '조언 중심' : 'Advice-focused',
      emotion: language === 'ko' ? '감정 해석 중심' : 'Emotion-focused',
      flow: language === 'ko' ? '흐름 해석 중심' : 'Flow-focused',
    } as Record<QuestionTone, string>,
  }
}

function buildQuestionProfile(intent: StructuredIntent, language: EngineLanguage): QuestionProfile {
  const labels = getLabelMap(language)

  return {
    type: {
      code: intent.questionType,
      label: labels.typeLabels[intent.questionType] || (language === 'ko' ? '열린 질문' : 'Open question'),
    },
    subject: {
      code: intent.subject,
      label: labels.subjectLabels[intent.subject],
    },
    focus: {
      code: intent.focus,
      label: intent.focus,
    },
    timeframe: {
      code: intent.timeframe,
      label: labels.timeframeLabels[intent.timeframe],
    },
    tone: {
      code: intent.tone,
      label: labels.toneLabels[intent.tone],
    },
  }
}

function getStableSpread(intent: StructuredIntent, question: string) {
  if (intent.tone === 'flow' || intent.timeframe === 'current_phase') {
    return { themeId: 'general-insight', spreadId: 'past-present-future' }
  }
  if (intent.subject === 'relationship' && intent.tone === 'emotion') {
    return { themeId: 'love-relationships', spreadId: 'relationship-check-in' }
  }
  if (intent.subject === 'other_person' && /대답|답장|response|reply|말/i.test(question)) {
    return { themeId: 'love-relationships', spreadId: 'crush-feelings' }
  }
  return { themeId: 'general-insight', spreadId: 'quick-reading' }
}

function findSpread(themeId: string, spreadId: string) {
  return getSpreadOptions().find((item) => item.themeId === themeId && item.id === spreadId)
}

function buildRecommendedSpreads(
  question: string,
  language: EngineLanguage,
  primary: { themeId: string; spreadId: string; reason: string }
): EngineSpreadOption[] {
  const options = getSpreadOptions()
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
    const spread = options.find((item) => item.themeId === themeId && item.id === spreadId)
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

  const stableFallbacks = [
    {
      themeId: 'general-insight',
      spreadId: 'quick-reading',
      reason: language === 'ko' ? '질문이 흔들려도 핵심만 먼저 읽기 좋습니다.' : 'A stable one-card entry when the question is noisy.',
    },
    {
      themeId: 'general-insight',
      spreadId: 'past-present-future',
      reason: language === 'ko' ? '질문의 흐름을 시간축으로 정리하기 좋습니다.' : 'Useful for reading the flow across time.',
    },
  ]

  for (const fallback of stableFallbacks) {
    addSpread(fallback.themeId, fallback.spreadId, fallback.reason, false, null)
  }

  const external = recommendSpreads(question, 2)
  for (const rec of external) {
    addSpread(
      rec.themeId,
      rec.spreadId,
      language === 'ko' ? rec.reasonKo : rec.reason,
      false,
      rec.matchScore
    )
  }

  return recommendations.slice(0, 3)
}

function buildQuestionSummary(intent: StructuredIntent, language: EngineLanguage) {
  if (language === 'ko') {
    if (intent.tone === 'flow') {
      return '이 질문은 단순 예측보다 현재 국면과 흐름을 먼저 읽는 편이 맞습니다.'
    }
    if (intent.subject === 'other_person') {
      return '이 질문은 내 선택보다 상대의 반응과 움직임을 읽는 쪽이 핵심입니다.'
    }
    if (intent.tone === 'emotion') {
      return '이 질문은 사실 확인보다 감정과 내면 상태를 읽는 쪽에 가깝습니다.'
    }
    return '이 질문은 질문의 진짜 포인트를 먼저 해석한 뒤 카드를 붙이는 편이 안정적입니다.'
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

function buildFallbackDirectAnswer(intent: StructuredIntent, question: string, language: EngineLanguage) {
  const isTomorrow = /(내일|tomorrow)/i.test(question)
  if (language === 'ko') {
    if (intent.subject === 'other_person' && isTomorrow) {
      return '내일 바로 확정적으로 움직인다고 보기보다, 상대 반응의 결이 먼저 드러날 가능성에 더 무게가 있어 보여요.'
    }
    if (intent.tone === 'flow') {
      return '지금 전체 흐름은 밀어붙이기보다 방향을 정리하고 감각을 재정비하는 쪽에 더 가깝게 읽혀요.'
    }
    if (intent.tone === 'emotion') {
      return '이 질문은 겉으로 보이는 행동보다 그 순간의 심리 반응과 컨디션을 읽는 쪽이 더 맞아 보여요.'
    }
    return '지금은 질문의 핵심을 먼저 좁혀 읽고, 그 다음 카드 해석으로 들어가는 편이 더 자연스러워 보여요.'
  }

  if (intent.subject === 'other_person' && isTomorrow) {
    return 'It looks less like a fixed answer tomorrow and more like a reaction pattern that will show itself first.'
  }
  if (intent.tone === 'flow') {
    return 'The overall flow looks more like a phase of reordering and resetting your direction than forcing momentum.'
  }
  if (intent.tone === 'emotion') {
    return 'This question reads better as a psychological and emotional state than a literal event prediction.'
  }
  return 'It looks better to narrow the core meaning of the question first and then apply the card reading on top of that.'
}

export async function analyzeTarotQuestionV2(input: {
  question: string
  language: EngineLanguage
}): Promise<QuestionEngineV2Result> {
  const { question, language } = input
  const trimmedQuestion = question.trim()

  if (isDangerousQuestion(trimmedQuestion)) {
    return {
      isDangerous: true,
      message:
        language === 'ko'
          ? '힘든 시간을 보내고 계신 것 같아요. 전문가의 도움을 받으시길 권해드려요. 자살예방상담전화: 1393 (24시간)'
          : 'I sense you may be going through a difficult time. Please reach out to a professional or local crisis service.',
      themeId: 'general-insight',
      spreadId: 'quick-reading',
      spreadTitle: language === 'ko' ? '빠른 리딩' : 'Quick Reading',
      cardCount: 1,
      userFriendlyExplanation: '',
      question_summary: '',
      question_profile: buildQuestionProfile(fallbackIntent(trimmedQuestion, language), language),
      direct_answer: '',
      intent: 'danger',
      intent_label: language === 'ko' ? '위험 신호' : 'Danger signal',
      recommended_spreads: [],
      path: buildPath('general-insight', 'quick-reading', trimmedQuestion),
      source: 'fallback',
      fallback_reason: 'no_candidate',
    }
  }

  const variants = prepareForMatching(trimmedQuestion).map((item) => item.trim()).filter(Boolean)
  const normalizedQuestion = Array.from(new Set([trimmedQuestion, ...variants])).join(' || ')
  const spreadList = getSpreadOptions()
    .map((spread) => `- ${spread.themeId}/${spread.id}: ${spread.titleKo} (${spread.cardCount}장)`)
    .join('\n')

  let intent = fallbackIntent(trimmedQuestion, language)
  let directAnswer = buildFallbackDirectAnswer(intent, trimmedQuestion, language)
  let userFriendlyExplanation =
    language === 'ko'
      ? '질문을 먼저 해석한 뒤, 그 질문에 맞게 카드를 읽는 흐름으로 들어갑니다.'
      : 'The question is interpreted first, then cards are read against that intent.'
  let fallbackReason: QuestionEngineV2FallbackReason | null = null
  let source: 'llm' | 'fallback' = 'fallback'

  try {
    const intentResponse = await callOpenAI(
      [
        { role: 'system', content: getIntentPrompt() },
        { role: 'user', content: normalizedQuestion },
      ],
      220
    )
    const intentParsed = JSON.parse(intentResponse) as Partial<StructuredIntent>
    intent = {
      questionType: intentParsed.questionType || intent.questionType,
      subject: (intentParsed.subject as QuestionSubject) || intent.subject,
      focus: intentParsed.focus || intent.focus,
      timeframe: (intentParsed.timeframe as QuestionTimeframe) || intent.timeframe,
      tone: (intentParsed.tone as QuestionTone) || intent.tone,
    }

    const answerResponse = await callOpenAI(
      [
        { role: 'system', content: getAnswerPrompt(spreadList) },
        {
          role: 'user',
          content: `Question: ${trimmedQuestion}\nIntent: ${JSON.stringify(intent)}`,
        },
      ],
      320
    )

    const answerParsed = JSON.parse(answerResponse) as Partial<{
      themeId: string
      spreadId: string
      reason: string
      userFriendlyExplanation: string
      directAnswer: string
    }>

    if (typeof answerParsed.directAnswer === 'string' && answerParsed.directAnswer.trim()) {
      directAnswer = answerParsed.directAnswer.trim()
    }
    if (
      typeof answerParsed.userFriendlyExplanation === 'string' &&
      answerParsed.userFriendlyExplanation.trim()
    ) {
      userFriendlyExplanation = answerParsed.userFriendlyExplanation.trim()
    }
    source = 'llm'

    const selected = getStableSpread(intent, trimmedQuestion)
    const reason =
      typeof answerParsed.reason === 'string' && answerParsed.reason.trim()
        ? answerParsed.reason.trim()
        : language === 'ko'
          ? '질문 의도를 먼저 잡은 뒤 안정적인 기본 리딩으로 연결합니다.'
          : 'The question intent is captured first, then routed into a stable base reading.'

    const primarySpread = findSpread(
      answerParsed.themeId || selected.themeId,
      answerParsed.spreadId || selected.spreadId
    ) || findSpread(selected.themeId, selected.spreadId)

    if (!primarySpread) {
      throw new Error('PRIMARY_SPREAD_NOT_FOUND')
    }

    const recommendedSpreads = buildRecommendedSpreads(trimmedQuestion, language, {
      themeId: primarySpread.themeId,
      spreadId: primarySpread.id,
      reason,
    })

    return {
      isDangerous: false,
      themeId: primarySpread.themeId,
      spreadId: primarySpread.id,
      spreadTitle: primarySpread.titleKo || primarySpread.title,
      cardCount: primarySpread.cardCount,
      userFriendlyExplanation,
      question_summary: buildQuestionSummary(intent, language),
      question_profile: buildQuestionProfile(intent, language),
      direct_answer: directAnswer,
      intent: intent.questionType,
      intent_label: buildQuestionProfile(intent, language).type.label,
      recommended_spreads: recommendedSpreads,
      path: buildPath(primarySpread.themeId, primarySpread.id, trimmedQuestion),
      source,
      fallback_reason: null,
    }
  } catch (error) {
    fallbackReason =
      error instanceof Error && /OPENAI_API_KEY_MISSING/.test(error.message)
        ? 'auth_failed'
        : error instanceof SyntaxError
          ? 'parse_failed'
          : 'server_error'
  }

  const selected = getStableSpread(intent, trimmedQuestion)
  const primarySpread = findSpread(selected.themeId, selected.spreadId) || findSpread('general-insight', 'quick-reading')
  const questionProfile = buildQuestionProfile(intent, language)
  const reason =
    language === 'ko'
      ? '추천이 흔들려도 질문 해석을 유지한 채 안정적인 기본 리딩으로 연결합니다.'
      : 'Even when recommendation is noisy, the question intent is preserved and routed into a stable base reading.'

  return {
    isDangerous: false,
    themeId: primarySpread?.themeId || 'general-insight',
    spreadId: primarySpread?.id || 'quick-reading',
    spreadTitle:
      primarySpread?.titleKo || primarySpread?.title || (language === 'ko' ? '빠른 리딩' : 'Quick Reading'),
    cardCount: primarySpread?.cardCount || 1,
    userFriendlyExplanation,
    question_summary: buildQuestionSummary(intent, language),
    question_profile: questionProfile,
    direct_answer: directAnswer,
    intent: intent.questionType,
    intent_label: questionProfile.type.label,
    recommended_spreads: buildRecommendedSpreads(trimmedQuestion, language, {
      themeId: primarySpread?.themeId || 'general-insight',
      spreadId: primarySpread?.id || 'quick-reading',
      reason,
    }),
    path: buildPath(
      primarySpread?.themeId || 'general-insight',
      primarySpread?.id || 'quick-reading',
      trimmedQuestion
    ),
    source: 'fallback',
    fallback_reason: fallbackReason,
  }
}
