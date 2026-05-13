import { logger } from '@/lib/logger'
import { evaluateTarotInterpretationQuality } from '@/lib/tarot/interpretationQuality'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/tarot/questionFlow'

const MAX_CARD_MEANING_LENGTH = 500

export interface CardInput {
  name: string
  nameKo?: string
  isReversed: boolean
  position: string
  positionKo?: string
  // What this seat means inside the spread (passed through from SpreadPosition).
  // Lets the LLM ground its per-card interpretation on the predefined role of
  // the slot instead of guessing from the position title alone.
  positionMeaning?: string
  positionMeaningKo?: string
  meaning?: string
  meaningKo?: string
  keywords?: string[]
  keywordsKo?: string[]
}

export type ParsedTarotJson = {
  overall?: unknown
  cards?: unknown
  advice?: unknown
  combinations?: unknown
  synergy?: unknown
}

export type TarotInsight = {
  position: string
  card_name: string
  is_reversed: boolean
  interpretation: string
  spirit_animal: null
  chakra: null
  element: null
  shadow: null
}

export type TarotInterpretResult = {
  overall_message: string
  card_insights: TarotInsight[]
  guidance: string
  affirmation: string
  combinations: Array<{ cards: string[]; meaning: string }> | unknown[]
  followup_questions: unknown[]
  fallback: boolean
}

export function parseStructuredContextFromString(
  raw: string | undefined,
  label: 'saju_context' | 'astro_context'
): Record<string, unknown> | undefined {
  if (!raw) return undefined
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) {
    return undefined
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    logger.warn('[Tarot interpret] context payload is not an object; dropping for backend', {
      label,
      parsedType: Array.isArray(parsed) ? 'array' : typeof parsed,
    })
    return undefined
  } catch (error) {
    logger.warn('[Tarot interpret] failed to parse context JSON; dropping for backend', {
      label,
      error: error instanceof Error ? error.message : String(error),
    })
    return undefined
  }
}

export function contextForPrompt(
  raw: string | undefined,
  parsed: Record<string, unknown> | undefined
): string | undefined {
  if (raw && raw.trim().length > 0) return raw
  if (!parsed) return undefined
  try {
    return JSON.stringify(parsed)
  } catch {
    return undefined
  }
}

export function normalizeQuestionContext(
  value: unknown
): TarotQuestionAnalysisSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as TarotQuestionAnalysisSnapshot
}

export function truncateToMax(value: unknown, maxLength: number): string | unknown {
  if (typeof value !== 'string') return value
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength)
}

export function normalizeInterpretRequestBody(rawBody: unknown): {
  body: unknown
  truncatedCount: number
} {
  if (!rawBody || typeof rawBody !== 'object') {
    return { body: rawBody, truncatedCount: 0 }
  }

  const source = rawBody as Record<string, unknown>
  if (!Array.isArray(source.cards)) {
    return { body: rawBody, truncatedCount: 0 }
  }

  let truncatedCount = 0
  const normalizedCards = source.cards.map((card) => {
    if (!card || typeof card !== 'object') {
      return card
    }

    const cardRecord = card as Record<string, unknown>
    const nextMeaning = truncateToMax(cardRecord.meaning, MAX_CARD_MEANING_LENGTH)
    const nextMeaningKo = truncateToMax(cardRecord.meaningKo, MAX_CARD_MEANING_LENGTH)

    if (typeof cardRecord.meaning === 'string' && cardRecord.meaning !== nextMeaning) {
      truncatedCount += 1
    }
    if (typeof cardRecord.meaningKo === 'string' && cardRecord.meaningKo !== nextMeaningKo) {
      truncatedCount += 1
    }

    return {
      ...cardRecord,
      meaning: nextMeaning,
      meaningKo: nextMeaningKo,
    }
  })

  return {
    body: {
      ...source,
      cards: normalizedCards,
    },
    truncatedCount,
  }
}

export function stripMarkdownCodeFence(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return (fenceMatch?.[1] || raw).trim()
}

export function extractJsonObjectSlice(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) {
    return null
  }
  return raw.slice(start, end + 1)
}

export function sanitizeJsonLikeText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/[\uFFFD\u201D]/g, '"')
    .replace(/[\uFFFD\u2019]/g, "'")
    .replace(/\/\/[^\n\r]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1')
}

export function normalizeSingleQuoteJson(raw: string): string {
  return raw
    .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'(?=\s*[,}])/g, (_match, value: string) => {
      const normalized = value.replace(/"/g, '\\"')
      return `: "${normalized}"`
    })
}

export function normalizeUnquotedKeysJson(raw: string): string {
  return raw.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)/g, '$1"$2"$3')
}

export function tryParseJsonCandidate(raw: string): ParsedTarotJson | null {
  const attempts: string[] = []
  const fenced = stripMarkdownCodeFence(raw)
  const directSlice = extractJsonObjectSlice(raw)
  const fencedSlice = extractJsonObjectSlice(fenced)

  attempts.push(raw, fenced)
  if (directSlice) attempts.push(directSlice)
  if (fencedSlice) attempts.push(fencedSlice)

  const uniqueAttempts = Array.from(new Set(attempts.map((item) => item.trim()).filter(Boolean)))
  for (const candidate of uniqueAttempts) {
    try {
      const parsed = JSON.parse(candidate) as unknown
      if (parsed && typeof parsed === 'object') {
        return parsed as ParsedTarotJson
      }
    } catch {
      // continue
    }

    try {
      const sanitized = sanitizeJsonLikeText(candidate)
      const parsed = JSON.parse(sanitized) as unknown
      if (parsed && typeof parsed === 'object') {
        return parsed as ParsedTarotJson
      }
    } catch {
      // continue
    }

    try {
      const normalizedSingleQuote = normalizeSingleQuoteJson(sanitizeJsonLikeText(candidate))
      const parsed = JSON.parse(normalizedSingleQuote) as unknown
      if (parsed && typeof parsed === 'object') {
        return parsed as ParsedTarotJson
      }
    } catch {
      // continue
    }

    try {
      const normalizedUnquotedKeys = normalizeUnquotedKeysJson(
        normalizeSingleQuoteJson(sanitizeJsonLikeText(candidate))
      )
      const parsed = JSON.parse(normalizedUnquotedKeys) as unknown
      if (parsed && typeof parsed === 'object') {
        return parsed as ParsedTarotJson
      }
    } catch {
      // continue
    }
  }

  return null
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

export function isTooGenericGuidance(guidance: string, language: string): boolean {
  const normalized = guidance.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!normalized || normalized.length < 25) return true

  if (language === 'ko') {
    return /(메시지에 귀 기울|화이팅|힘내|좋은 하루)/i.test(guidance)
  }
  return /(listen to the cards|you got this|stay positive|good luck)/i.test(normalized)
}

export function buildActionableGuidance(
  language: string,
  userQuestion: string | undefined
): string {
  const question = (userQuestion || '').trim()
  const focusLabel =
    question.length > 0
      ? language === 'ko'
        ? `질문(${question}) 기준으로`
        : `Based on your question (${question})`
      : ''

  if (language === 'ko') {
    return [
      `1) 오늘: ${focusLabel || '현재 카드 흐름 기준으로'} 가장 중요한 변수 1개를 정하고, 실행할 행동 1개를 20분 안에 시작하세요.`,
      '2) 이번 주: 결과를 3줄로 기록하세요. (무엇을 했는지/어떤 반응이 있었는지/다음 수정 포인트)',
      '3) 다음 7일: 반복 패턴 1개를 끊는 실험을 하고, 효과가 있으면 같은 방식으로 1회 더 실행하세요.',
    ].join('\n')
  }

  return [
    `1) Today: ${focusLabel || 'Using your current card flow'}, pick one controllable variable and execute one 20-minute action block.`,
    '2) This week: log outcomes in 3 lines (what you did / response you saw / what to adjust).',
    '3) Within 7 days: run one repeat-pattern interruption experiment, then repeat once if it works.',
  ].join('\n')
}

export function extractQuestionAnchorTerms(question: string): string[] {
  return question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(
      (token) =>
        token.length >= 2 &&
        ![
          '지금',
          '이번',
          '오늘',
          '내일',
          '정말',
          '그냥',
          '어떻게',
          '뭐',
          '무슨',
          '대한',
          '기준',
          'where',
          'what',
          'when',
          'with',
          'about',
          'this',
          'that',
        ].includes(token)
    )
    .slice(0, 8)
}

export function buildMinimumOverall(
  language: string,
  cards: CardInput[],
  userQuestion?: string,
  _existingOverall?: string
): string {
  const cardNames = cards
    .slice(0, 3)
    .map((card) => (language === 'ko' ? card.nameKo || card.name : card.name))
    .join(', ')

  const question = (userQuestion || '').trim()
  const focusSummary = summarizeQuestionFocus(language, question)

  if (language === 'ko') {
    const qLine = question ? `질문 "${question}" 기준으로 보면, ` : ''
    return `${qLine}${cardNames} 조합은 ${focusSummary} 지금은 결론을 서두르기보다 조건과 신호를 먼저 분리해서 읽는 편이 맞습니다. 오늘 바로 확인할 행동 하나를 정하고, 이번 주 안에 결과를 다시 점검하세요.`
  }

  const qLine = question ? `For your question "${question}", ` : ''
  return `${qLine}the combination of ${cardNames} suggests that ${focusSummary} Instead of forcing a quick conclusion, separate observable signals from assumptions and test one concrete condition first. Choose one action you can verify today and review the outcome within this week.`
}

export function summarizeQuestionFocus(language: string, userQuestion: string): string {
  const normalized = userQuestion.toLowerCase().replace(/\s+/g, ' ').trim()

  if (language === 'ko') {
    const hasAny = (terms: string[]) => terms.some((term) => normalized.includes(term))

    if (hasAny(['연애', '사랑', '재회', '이별', '썬', '고백', '연락'])) {
      return '관계의 흐름을 단정하기보다 상대의 반응과 거리 변화를 차분하게 읽어야 하는 질문입니다.'
    }
    if (hasAny(['직업', '커리어', '이직', '면접', '회사', '승진', '취업'])) {
      return '일의 방향과 기회를 고를 때, 조건과 실행 순서를 먼저 정리해야 하는 질문입니다.'
    }
    if (hasAny(['돈', '재정', '투자', '매매', '집', '부동산', '계약'])) {
      return '손익보다 조건과 기준을 먼저 세워야 결과가 달라지는 질문입니다.'
    }
    if (hasAny(['건강', '몸', '컨디션', '회복', '병원', '수술'])) {
      return '몸 상태와 회복 리듬을 먼저 살피고 무리한 판단을 줄여야 하는 질문입니다.'
    }
    if (hasAny(['가족', '부모', '형제', '자녀', '집안'])) {
      return '가까운 관계의 기대치와 역할을 다시 조정해야 풀리는 질문입니다.'
    }
    if (hasAny(['이사', '이동', '변화', '유학', '해외'])) {
      return '방향을 바꾸기 전에 생활 조건과 이동 비용을 먼저 따져야 하는 질문입니다.'
    }
    if (hasAny(['결정', '선택', '맞아', '해도 될까', '해야 할까'])) {
      return '감정 반응보다 기준과 우선순위를 세워야 답이 보이는 질문입니다.'
    }
    if (hasAny(['연락', '답장', '반응'])) {
      return '상대의 반응 속도보다 실제 의도와 흐름을 읽는 것이 중요한 질문입니다.'
    }
    return '핵심 조건과 다음 행동을 나눠서 읽을수록 해석 정확도가 높아지는 질문입니다.'
  }

  return 'The question is easier to read when you separate the key condition from the next action first.'
}

export function getCardKeywordSummary(card: CardInput, language: string): string {
  const list =
    (language === 'ko' ? card.keywordsKo || card.keywords : card.keywords || card.keywordsKo) || []
  const compact = list
    .map((item) => item?.trim())
    .filter((item): item is string => Boolean(item))
    .slice(0, 3)

  if (compact.length === 0) {
    return ''
  }

  return language === 'ko'
    ? `핵심 단서는 ${compact.join(', ')} 입니다. `
    : `Key cues are ${compact.join(', ')}. `
}

// 위치 라벨을 의미 클래스로 분류 (fallback 템플릿 다변화용)
export type PositionSemantics =
  | 'feelings'
  | 'desire'
  | 'possibility'
  | 'current'
  | 'future'
  | 'past'
  | 'advice'
  | 'self'
  | 'other'
  | 'obstacle'
  | 'opportunity'
  | 'timing'
  | 'outcome'
  | 'lesson'
  | 'default'

export function classifyPositionSemantics(positionLabel: string | undefined): PositionSemantics {
  const label = (positionLabel || '').toLowerCase()
  if (!label) return 'default'
  if (/(feeling|마음|속마음|감정|heart|inner)/.test(label)) return 'feelings'
  if (/(want|desire|원하는|바라|need|wish)/.test(label)) return 'desire'
  if (/(possibility|가능성|chance|likelihood|기회)/.test(label)) return 'possibility'
  if (/(current|now|present|현재|지금)/.test(label)) return 'current'
  if (/(future|soon|coming|미래|앞으로|가까운)/.test(label)) return 'future'
  if (/(past|이전|과거)/.test(label)) return 'past'
  if (/(advice|조언|guidance)/.test(label)) return 'advice'
  if (/(self|본인|나|내|me|my)/.test(label)) return 'self'
  if (/(other|상대|partner|그 사람|them|him|her)/.test(label)) return 'other'
  if (/(obstacle|장애|block|challenge|어려움)/.test(label)) return 'obstacle'
  if (/(opportunity|기회)/.test(label)) return 'opportunity'
  if (/(timing|when|시기|언제|타이밍)/.test(label)) return 'timing'
  if (/(outcome|result|결과|결실|end|최종)/.test(label)) return 'outcome'
  if (/(lesson|교훈|insight|배움)/.test(label)) return 'lesson'
  return 'default'
}

// 위치 의미 × 정/역방향 별 톤 한 줄 — fallback 카드 해석 고유성 확보
function getPositionTone(
  semantics: PositionSemantics,
  isReversed: boolean,
  isKorean: boolean
): string {
  const tones: Record<PositionSemantics, [string, string]> = {
    feelings: isKorean
      ? [
          '속에 흐르는 감정의 결을 보여주는 자리예요.',
          '겉으로 드러나지 않은 망설임이 흐르고 있어요.',
        ]
      : [
          'shows the inner current of feeling underneath the surface.',
          'reveals hesitation that has not surfaced yet.',
        ],
    desire: isKorean
      ? ['속으로 원하는 그림을 솔직하게 비춰요.', '바라는 마음이 있지만 표현 방식이 어긋나 있어요.']
      : [
          'mirrors what is genuinely wanted underneath.',
          'shows desire that has trouble finding clear expression.',
        ],
    possibility: isKorean
      ? [
          '지금 흐름에서 열려 있는 가능성의 폭을 보여줘요.',
          '가능성이 있지만 조건이 정렬돼야 보이는 자리예요.',
        ]
      : [
          'marks the range of possibility currently open.',
          'flags possibility that needs alignment to appear.',
        ],
    current: isKorean
      ? ['지금 이 시점의 진짜 상태를 비춰요.', '지금이 정체된 듯 보여도 정리되는 중인 흐름이에요.']
      : [
          'shows the real state of the current moment.',
          'reads as a paused phase that is actually re-sorting.',
        ],
    future: isKorean
      ? ['가까운 미래로 흐르는 방향을 가리켜요.', '곧 다가올 흐름이지만 속도가 늦어질 수 있어요.']
      : [
          'points to the direction shaping up soon.',
          'the next phase is moving but on a slower clock.',
        ],
    past: isKorean
      ? [
          '지금 이 자리까지 끌고 온 배경을 보여줘요.',
          '아직 정리되지 않은 과거의 잔상이 영향을 주고 있어요.',
        ]
      : [
          'shows the background that brought you here.',
          'an unresolved residue still presses on the present.',
        ],
    advice: isKorean
      ? [
          '지금 가장 도움 되는 태도를 알려줘요.',
          '조언이지만 즉시 적용보다 한 박자 늦춰서 적용할 카드예요.',
        ]
      : [
          'points to the most useful posture right now.',
          'advice that lands better with one beat of delay.',
        ],
    self: isKorean
      ? [
          '지금 내 안에서 일어나는 진짜 흐름을 보여줘요.',
          '내가 지금 인정하기 어려운 부분을 비춰요.',
        ]
      : [
          'mirrors what is actually moving inside you.',
          'reflects the part you are reluctant to acknowledge.',
        ],
    other: isKorean
      ? [
          '상대 안에서 일어나는 진짜 흐름을 보여줘요.',
          '상대가 인정하지 못한 채 흘러가는 감정을 보여줘요.',
        ]
      : [
          'shows what is genuinely moving in the other person.',
          'reads what flows through them unacknowledged.',
        ],
    obstacle: isKorean
      ? [
          '지금 흐름을 잡고 있는 진짜 장애물을 보여줘요.',
          '겉으로 보이는 문제 뒤의 더 깊은 막힘을 비춰요.',
        ]
      : [
          'shows the real obstacle holding the flow.',
          'points behind the visible problem to a deeper block.',
        ],
    opportunity: isKorean
      ? [
          '지금 잡으면 결이 바뀌는 기회의 자리예요.',
          '기회는 있지만 조건을 갖춰야 잡히는 흐름이에요.',
        ]
      : [
          'marks an opportunity that shifts the texture if taken.',
          'opportunity is available but conditional.',
        ],
    timing: isKorean
      ? [
          '지금 적절한 시점인지 짚어주는 자리예요.',
          '시기는 가까워지는 중이지만 아직 핵심 조건이 빠져 있어요.',
        ]
      : [
          'points to whether the timing fits now.',
          'timing is approaching but a key condition is still missing.',
        ],
    outcome: isKorean
      ? [
          '지금 흐름이 향하는 결말의 결을 보여줘요.',
          '결말은 보이지만 중간에 한 번 결이 바뀔 수 있어요.',
        ]
      : [
          'shows the texture of the outcome this flow is heading to.',
          'the outcome is shaping up but may pivot once midway.',
        ],
    lesson: isKorean
      ? ['이 흐름이 남기는 의미를 보여줘요.', '교훈은 명확하지만 받아들이기까지 시간이 필요해요.']
      : [
          'shows the meaning this phase is leaving with you.',
          'the lesson is clear but takes time to settle.',
        ],
    default: isKorean
      ? ['이 자리에서 카드가 말하는 결을 보여줘요.', '흐름은 있지만 표현이 아직 정리되지 않았어요.']
      : ['shows what this seat is voicing.', 'a current is present but not yet articulated.'],
  }
  return tones[semantics][isReversed ? 1 : 0]
}

export function buildMinimumInsight(
  language: string,
  card: CardInput,
  userQuestion?: string
): string {
  const cardName = language === 'ko' ? card.nameKo || card.name : card.name
  const orientation = card.isReversed
    ? language === 'ko'
      ? '역방향'
      : 'reversed'
    : language === 'ko'
      ? '정방향'
      : 'upright'
  const isKorean = language === 'ko'
  const positionLabel = (isKorean ? card.positionKo || card.position : card.position) || ''
  const semantics = classifyPositionSemantics(positionLabel)
  const positionTone = getPositionTone(semantics, Boolean(card.isReversed), isKorean)
  const keywordSummary = getCardKeywordSummary(card, language)
  const reversedNote = card.isReversed
    ? isKorean
      ? '역방향이라 그 흐름이 막히거나 늦춰진 상태로 표현돼요. '
      : 'Being reversed, that current shows up blocked or delayed. '
    : ''
  const question = (userQuestion || '').trim()
  const questionLine = question
    ? isKorean
      ? `"${question}" 자리에서 보면, `
      : `On "${question}", `
    : ''

  if (isKorean) {
    return `${questionLine}${positionLabel ? `${positionLabel} 자리는 ` : ''}${positionTone} 여기 ${cardName}(${orientation})이 떠올랐다는 건 ${keywordSummary}이 결이 지금 작동하고 있다는 뜻이에요. ${reversedNote}이번 주 안에 그 결이 보이는 작은 신호 하나를 직접 확인해 보세요.`
      .replace(/\s+/g, ' ')
      .trim()
  }

  return `${questionLine}the ${positionLabel || 'position'} ${positionTone} ${cardName} (${orientation}) here means that ${keywordSummary.toLowerCase()}this thread is actively at work. ${reversedNote}Within this week, look for one tangible signal that this thread is in motion.`
    .replace(/\s+/g, ' ')
    .trim()
}

export function ensureCardAnchoring(
  language: string,
  card: CardInput,
  interpretation: string,
  userQuestion?: string
): string {
  const cardName = language === 'ko' ? card.nameKo || card.name : card.name
  const position = language === 'ko' ? card.positionKo || card.position : card.position
  const question = (userQuestion || '').trim()
  const normalized = interpretation.trim()

  const hasCardName = normalized.includes(cardName)
  const hasPosition = position ? normalized.includes(position) : false
  const hasQuestionAnchor = question.length === 0 || normalized.includes(question.slice(0, 6))

  if (hasCardName && hasPosition && hasQuestionAnchor) {
    return normalized
  }

  if (language === 'ko') {
    const questionLine = question ? `질문 "${question}" 기준으로 보면, ` : ''
    return `${questionLine}${position}의 ${cardName}는 ${normalized}`
  }

  const questionLine = question ? `For your question "${question}", ` : ''
  return `${questionLine}${cardName} in the ${position} position indicates: ${normalized}`
}

export function ensureActionAndTimeAnchor(language: string, interpretation: string): string {
  const normalized = interpretation.trim()
  const lower = normalized.toLowerCase()
  const hasTimeAnchor = [
    'today',
    'this week',
    'within 7 days',
    'next week',
    '오늘',
    '이번 주',
    '7일',
    '다음 주',
  ].some((term) => lower.includes(term))
  const hasActionVerb = [
    'write',
    'plan',
    'track',
    'review',
    'start',
    'focus',
    'set',
    'talk',
    'record',
    'apply',
    '적기',
    '계획',
    '기록',
    '검토',
    '시작',
    '집중',
    '정리',
    '대화',
    '확인',
    '실행',
  ].some((term) => lower.includes(term))

  if (hasTimeAnchor && hasActionVerb) {
    return normalized
  }

  if (language === 'ko') {
    return `${normalized} 오늘은 바로 확인할 행동 하나만 정하고, 이번 주 안에 7일 기준으로 결과를 다시 점검하세요.`
  }

  return `${normalized} Pick one 20-minute action for today, then log outcomes in 3 lines within this week to guide your next move.`
}

export function normalizeResultPayload(raw: unknown): Partial<TarotInterpretResult> {
  if (!raw || typeof raw !== 'object') return {}
  return raw as Partial<TarotInterpretResult>
}

export function diversifyDuplicateInsights(input: {
  insights: TarotInsight[]
  cards: CardInput[]
  language: string
  userQuestion?: string
}): TarotInsight[] {
  const { insights, cards, language, userQuestion } = input
  const seen = new Map<string, number>()

  return insights.map((insight, index) => {
    const duplicateKey = insight.interpretation
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const count = seen.get(duplicateKey) || 0
    seen.set(duplicateKey, count + 1)

    if (count === 0) return insight

    const card = cards[index]
    if (!card) return insight

    const cardName = language === 'ko' ? card.nameKo || card.name : card.name
    const position = language === 'ko' ? card.positionKo || card.position : card.position
    const orientation = card.isReversed
      ? language === 'ko'
        ? '역방향'
        : 'reversed'
      : language === 'ko'
        ? '정방향'
        : 'upright'

    const koVariations = [
      `핵심은 ${position}의 ${cardName}(${orientation}) 메시지를 오늘 바로 실천하는 것입니다. 지금 당장 할 수 있는 행동 1가지를 정하고, 하루가 끝나기 전에 변화 여부를 확인하세요.`,
      `${position}의 ${cardName}(${orientation})는 미루지 말고 작은 실행으로 확인하는 카드입니다. 오늘 한 번 시도하고, 결과를 한 줄로 남겨 다음 선택 기준으로 삼으세요.`,
      `이번에는 ${position}의 ${cardName}(${orientation})를 계획보다 실행에 연결해 보세요. 10분 안에 가능한 행동부터 시작하고, 끝난 뒤 체감 변화를 점검하세요.`,
    ]
    const enVariations = [
      `The key is to apply ${cardName} (${orientation}) in the ${position} position today. Choose one immediate action and check before the day ends whether anything shifted.`,
      `${cardName} (${orientation}) in the ${position} position asks for a quick real-world test. Try one small step today and write one line about the result for your next decision.`,
      `Use ${cardName} (${orientation}) in the ${position} position as an execution cue, not just a plan. Start with a 10-minute action and review what changed right after.`,
    ]
    const variationPool = language === 'ko' ? koVariations : enVariations
    const variation = variationPool[count % variationPool.length]

    return {
      ...insight,
      interpretation: ensureCardAnchoring(language, card, variation, userQuestion),
    }
  })
}

export function enforceInterpretationQuality(input: {
  rawResult: unknown
  cards: CardInput[]
  language: string
  userQuestion?: string
}): TarotInterpretResult {
  const payload = normalizeResultPayload(input.rawResult)
  const isKorean = input.language === 'ko'

  const normalizedInsights: TarotInsight[] = input.cards.map((card, i) => {
    const rawInsight =
      Array.isArray(payload.card_insights) &&
      payload.card_insights[i] &&
      typeof payload.card_insights[i] === 'object'
        ? (payload.card_insights[i] as Record<string, unknown>)
        : {}

    const baseInterpretation =
      typeof rawInsight.interpretation === 'string' && rawInsight.interpretation.trim().length >= 80
        ? rawInsight.interpretation.trim()
        : buildMinimumInsight(input.language, card, input.userQuestion)
    const interpretation = ensureActionAndTimeAnchor(
      input.language,
      ensureCardAnchoring(input.language, card, baseInterpretation, input.userQuestion)
    )

    return {
      position:
        typeof rawInsight.position === 'string' && rawInsight.position.trim()
          ? rawInsight.position
          : card.position,
      card_name:
        typeof rawInsight.card_name === 'string' && rawInsight.card_name.trim()
          ? rawInsight.card_name
          : card.name,
      is_reversed:
        typeof rawInsight.is_reversed === 'boolean' ? rawInsight.is_reversed : card.isReversed,
      interpretation,
      spirit_animal: null,
      chakra: null,
      element: null,
      shadow: null,
    }
  })

  const diversifiedInsights = diversifyDuplicateInsights({
    insights: normalizedInsights,
    cards: input.cards,
    language: input.language,
    userQuestion: input.userQuestion,
  })

  const initialOverall =
    typeof payload.overall_message === 'string' ? payload.overall_message.trim() : ''
  const initialGuidance = typeof payload.guidance === 'string' ? payload.guidance.trim() : ''

  let overall = buildMinimumOverall(input.language, input.cards, input.userQuestion, initialOverall)
  let guidance = isTooGenericGuidance(initialGuidance, input.language)
    ? buildActionableGuidance(input.language, input.userQuestion)
    : initialGuidance

  const quality = evaluateTarotInterpretationQuality({
    language: input.language,
    cards: input.cards.map((card) => ({ name: card.name, position: card.position })),
    result: {
      overall_message: overall,
      card_insights: diversifiedInsights,
      guidance,
      fallback: Boolean(payload.fallback),
    },
  })

  if (quality.overallScore < 72) {
    overall = buildMinimumOverall(input.language, input.cards, input.userQuestion, '')
    guidance = buildActionableGuidance(input.language, input.userQuestion)
    logger.warn('[Tarot interpret] low-quality interpretation auto-repaired', {
      score: quality.overallScore,
      grade: quality.grade,
      issues: quality.issues.slice(0, 4),
    })
  }

  return {
    overall_message: overall,
    card_insights: diversifiedInsights,
    guidance,
    affirmation:
      typeof payload.affirmation === 'string' && payload.affirmation.trim()
        ? payload.affirmation
        : isKorean
          ? '오늘의 선택을 작은 실행으로 증명해보세요.'
          : "Prove today's choice with one small execution.",
    combinations: normalizeCombinations(payload.combinations, input.cards, input.language),
    followup_questions: Array.isArray(payload.followup_questions) ? payload.followup_questions : [],
    fallback: Boolean(payload.fallback),
  }
}

export function buildEmergencyFallbackResult(
  cards: CardInput[],
  language: string,
  userQuestion?: string
): TarotInterpretResult {
  return enforceInterpretationQuality({
    rawResult: {
      overall_message: '',
      card_insights: [],
      guidance: '',
      fallback: true,
    },
    cards,
    language,
    userQuestion,
  })
}

export function normalizeCombinations(
  raw: unknown,
  cards: CardInput[],
  language: string
): Array<{ cards: string[]; meaning: string }> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return buildLocalCombinationHints(cards, language)
  }

  const normalized = raw
    .map((item) => {
      const record = asRecord(item)
      const cardsField = Array.isArray(record.cards)
        ? record.cards
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter((entry): entry is string => entry.length > 0)
        : []
      const meaningField =
        typeof record.meaning === 'string'
          ? record.meaning.trim()
          : typeof record.summary === 'string'
            ? record.summary.trim()
            : ''
      const titleField =
        typeof record.title === 'string'
          ? record.title
              .split('+')
              .map((entry) => entry.trim())
              .filter((entry) => entry.length > 0)
          : []

      const mergedCards = cardsField.length > 0 ? cardsField : titleField
      if (mergedCards.length === 0 || !meaningField) {
        return null
      }

      return { cards: mergedCards, meaning: meaningField }
    })
    .filter((entry): entry is { cards: string[]; meaning: string } => Boolean(entry))

  return normalized.length > 0 ? normalized : buildLocalCombinationHints(cards, language)
}

export function buildLocalCombinationHints(
  cards: CardInput[],
  language: string,
  limit = 6
): Array<{ cards: string[]; meaning: string }> {
  const isKorean = language === 'ko'
  const hints: Array<{ cards: string[]; meaning: string }> = []

  for (let i = 0; i < cards.length; i += 1) {
    for (let j = i + 1; j < cards.length; j += 1) {
      const cardA = cards[i]
      const cardB = cards[j]
      const nameA = isKorean ? cardA.nameKo || cardA.name : cardA.name
      const nameB = isKorean ? cardB.nameKo || cardB.name : cardB.name
      const orientationA = cardA.isReversed
        ? isKorean
          ? '역방향'
          : 'reversed'
        : isKorean
          ? '정방향'
          : 'upright'
      const orientationB = cardB.isReversed
        ? isKorean
          ? '역방향'
          : 'reversed'
        : isKorean
          ? '정방향'
          : 'upright'

      const summary = isKorean
        ? `${nameA}(${orientationA})와 ${nameB}(${orientationB}) 조합은 같은 주제를 강화 또는 견제 방향으로 묶습니다.`
        : `${nameA} (${orientationA}) with ${nameB} (${orientationB}) creates either reinforcement or tension in the same theme.`

      hints.push({
        cards: [nameA, nameB],
        meaning: summary,
      })

      if (hints.length >= limit) {
        return hints
      }
    }
  }

  return hints
}

export function buildAnchoredCardInsights(
  cards: CardInput[],
  language: string,
  userQuestion?: string
): TarotInsight[] {
  return cards.map((card) => ({
    position: card.position,
    card_name: card.name,
    is_reversed: card.isReversed,
    interpretation: ensureActionAndTimeAnchor(
      language,
      ensureCardAnchoring(
        language,
        card,
        buildMinimumInsight(language, card, userQuestion),
        userQuestion
      )
    ),
    spirit_animal: null,
    chakra: null,
    element: null,
    shadow: null,
  }))
}

// 시너지 한 줄 — 카드들이 *함께* 말하는 것
function buildSynergyLine(cards: CardInput[], language: string, userQuestion?: string): string {
  const isKorean = language === 'ko'
  const reversedCount = cards.filter((c) => c.isReversed).length
  const total = cards.length
  const allUpright = reversedCount === 0
  const allReversed = reversedCount === total
  const mostlyUpright = reversedCount > 0 && reversedCount <= Math.floor(total / 2)
  const cardNames = cards.map((c) => (isKorean ? c.nameKo || c.name : c.name))
  const firstTwo = cardNames.slice(0, 2).join(isKorean ? '와 ' : ' and ')
  const last = cardNames[cardNames.length - 1]
  const q = (userQuestion || '').trim()
  const questionRef = q ? (isKorean ? `"${q}"라는 질문에서 ` : `On "${q}", `) : ''

  if (allUpright) {
    return isKorean
      ? `${questionRef}${firstTwo} 흐름이 ${last}로 이어지면서 막힘 없이 한 방향으로 정렬되고 있어요. 결과 자체보다 그 정렬을 받아들이는 속도가 관건이에요.`
      : `${questionRef}${firstTwo} flowing into ${last} reads as one aligned direction with no major block. The pace at which you accept that alignment matters more than the outcome itself.`
  }
  if (allReversed) {
    return isKorean
      ? `${questionRef}세 자리 모두 역방향이라 표현이 늦거나 내면화된 상태예요. 결과를 끌어오기보다 막힌 결을 한 칸씩 푸는 흐름이 맞아요.`
      : `${questionRef}all three positions are reversed, signaling delayed expression or internalized currents. Loosen one knot at a time rather than forcing the outcome.`
  }
  if (mostlyUpright) {
    return isKorean
      ? `${questionRef}대체로 흐름은 열려 있는데 ${reversedCount}장이 역방향이라 그 부분만 박자가 늦은 상태예요. 그 한 자리만 조정하면 결이 풀려요.`
      : `${questionRef}the flow is largely open, but ${reversedCount} reversed card${reversedCount > 1 ? 's' : ''} mark${reversedCount > 1 ? '' : 's'} the spot where the rhythm is off. Adjust just that beat and the rest aligns.`
  }
  return isKorean
    ? `${questionRef}흐름은 양면적이에요. 정/역방향이 섞여 있다는 건 결과보다 *해석의 각도*에 따라 길이 갈리는 자리라는 뜻이에요.`
    : `${questionRef}the flow is two-sided. Mixed orientations say the path branches by the *angle of interpretation*, not the outcome.`
}

// 카드 키워드 기반 동적 가이던스
function buildDynamicGuidance(cards: CardInput[], language: string): string {
  const isKorean = language === 'ko'
  const allKeywords = cards
    .flatMap((c) => (isKorean ? c.keywordsKo || c.keywords : c.keywords) || [])
    .filter(Boolean)
    .slice(0, 4)
  const reversedCount = cards.filter((c) => c.isReversed).length
  const tone =
    reversedCount === 0
      ? isKorean
        ? '흐름은 열려 있어요'
        : 'The flow is open'
      : reversedCount === cards.length
        ? isKorean
          ? '지금은 멈춰서 고르는 시간이에요'
          : 'This is a pause-and-sort phase'
        : isKorean
          ? '흐름은 가능성과 늦어짐이 섞여 있어요'
          : 'The flow mixes openness with delay'
  const kw = allKeywords.length > 0 ? allKeywords.join(isKorean ? ' · ' : ' / ') : ''
  const kwLine = kw ? (isKorean ? `핵심 결: ${kw}` : `Core threads: ${kw}`) : ''

  if (isKorean) {
    return [
      `${tone}. ${kwLine}`,
      '오늘: 위 결 중 하나만 골라, 그 결이 보이는 신호를 20분 안에 한 가지 직접 확인하세요.',
      '이번 주: 그 신호가 어떻게 움직였는지 한 줄로 적어두고, 같은 결로 한 번 더 시도해 보세요.',
      '14일: 결이 살아있는 길만 남기고, 흐려진 길은 잠시 내려놓아도 괜찮아요.',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    `${tone}. ${kwLine}`,
    'Today: pick one of those threads and verify a single signal of it in under 20 minutes.',
    'This week: log how that signal moved in one line, and try the same thread once more.',
    'Within 14 days: keep only the threads that are still alive; the faded ones can rest for now.',
  ]
    .filter(Boolean)
    .join('\n')
}

// 안전한 fallback (GPT가 실패할 경우) — 페르소나 + 위치별 톤 + 시너지
export function generateSimpleFallback(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  userQuestion?: string
) {
  const isKorean = language === 'ko'
  const question = (userQuestion || '').trim()

  // 오프닝 — 카드 펼친 첫 인상을 질문에 묶어서
  const cardNames = cards.map((c) => (isKorean ? c.nameKo || c.name : c.name))
  const reversedCount = cards.filter((c) => c.isReversed).length
  const opener = isKorean
    ? question
      ? `"${question}"라는 자리에 ${cardNames.join(', ')}이 같이 떠올랐어요.`
      : `${spreadTitle} 자리에 ${cardNames.join(', ')}이 떠올랐어요.`
    : question
      ? `On "${question}", ${cardNames.join(', ')} landed together.`
      : `In the ${spreadTitle} spread, ${cardNames.join(', ')} appeared.`

  const firstReadKo =
    reversedCount === 0
      ? '전체적으로 흐름은 막힘 없이 열려 있는 모습이에요'
      : reversedCount === cards.length
        ? '세 자리 모두 역방향이라 지금은 표현이 늦거나 안으로 흐르는 시점이에요'
        : `${reversedCount}장이 역방향이라 일부 결은 살아있고 일부는 늦춰진 상태예요`
  const firstReadEn =
    reversedCount === 0
      ? 'The overall flow reads as open with no major block'
      : reversedCount === cards.length
        ? 'All three reversed — expression is currently delayed or turned inward'
        : `${reversedCount} reversed card${reversedCount > 1 ? 's' : ''} — some threads are alive, others held back`

  const synergy = buildSynergyLine(cards, language, userQuestion)
  const overallMessage = isKorean
    ? `${opener} ${firstReadKo}.\n\n${synergy}`
    : `${opener} ${firstReadEn}.\n\n${synergy}`

  const guidanceMessage = buildDynamicGuidance(cards, language)

  return {
    overall_message: overallMessage,
    card_insights: cards.map((card) => {
      const baseInterpretation = buildMinimumInsight(language, card, userQuestion)
      const anchoredInterpretation = ensureCardAnchoring(
        language,
        card,
        baseInterpretation,
        userQuestion
      )

      return {
        position: card.position,
        card_name: card.name,
        is_reversed: card.isReversed,
        interpretation: ensureActionAndTimeAnchor(language, anchoredInterpretation),
        spirit_animal: null,
        chakra: null,
        element: null,
        shadow: null,
      }
    }),
    guidance: guidanceMessage,
    affirmation: isKorean
      ? '실행한 결과의 작은 단서들이 다음 길을 비춰줍니다.'
      : 'Let evidence from your actions lead your next move.',
    combinations: buildLocalCombinationHints(cards, language),
    followup_questions: [],
    fallback: true,
  }
}
