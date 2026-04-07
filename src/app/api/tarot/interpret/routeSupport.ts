import { logger } from '@/lib/logger'
import { evaluateTarotInterpretationQuality } from '@/lib/Tarot/interpretationQuality'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/Tarot/questionFlow'

const MAX_CARD_MEANING_LENGTH = 500

export interface CardInput {
  name: string
  nameKo?: string
  isReversed: boolean
  position: string
  positionKo?: string
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
    .replace(/[��]/g, '"')
    .replace(/[��]/g, "'")
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
    return ['??? ???', '??? ???', '?? ??', '?????'].some((term) => guidance.includes(term))
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
        ? `??(${question}) ????`
        : `Based on your question (${question})`
      : ''

  if (language === 'ko') {
    return [
      `1) ??: ${focusLabel || '?? ?? ?? ????'} ?? ??? ?? 1?? ???, ??? ?? 1?? 20? ?? ?????.`,
      '2) ?? ?: ??? 3?? ?????. (??? ???/?? ??? ????/?? ?? ???)',
      '3) ?? 7?: ?? ?? 1?? ?? ??? ??, ??? ??? ?? ???? 1? ? ?????.',
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
          '??',
          '??',
          '??',
          '??',
          '??',
          '??',
          '???',
          '?',
          '??',
          '??',
          '??',
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

export function buildMinimumInsight(language: string, card: CardInput): string {
  const cardName = language === 'ko' ? card.nameKo || card.name : card.name
  const orientation = card.isReversed
    ? language === 'ko'
      ? '역방향'
      : 'reversed'
    : language === 'ko'
      ? '정방향'
      : 'upright'
  const baseMeaning =
    (language === 'ko' ? card.meaningKo || card.meaning : card.meaning) ||
    (language === 'ko'
      ? '핵심 변수 하나를 먼저 확인하고, 단계적으로 움직이는 편이 맞습니다.'
      : 'Check the key variable in your current situation and move with staged execution.')
  const keywordSummary = getCardKeywordSummary(card, language)

  if (language === 'ko') {
    return `${cardName}(${orientation})은 지금 감정 반응보다 구조를 먼저 읽으라고 말합니다. ${keywordSummary}${baseMeaning} 오늘은 이 카드가 가리키는 변수 하나만 확인하고, 이번 주 안에 작은 행동으로 검증해 보세요.`
  }

  return `${cardName} (${orientation}) signals that structured choices beat emotional reaction in this phase. ${keywordSummary}${baseMeaning} Today, isolate one variable this card points to, and this week, use outcome logging to improve decision accuracy.`
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
        ? '???'
        : 'reversed'
      : language === 'ko'
        ? '???'
        : 'upright'

    const koVariations = [
      `??? ${position}? ${cardName}(${orientation}) ???? ?? ?? ???? ????. ?? ?? ? ? ?? ?? 1??? ???, ??? ??? ?? ?? ??? ?????.`,
      `${position}? ${cardName}(${orientation})? ??? ?? ?? ???? ???? ?????. ?? ? ? ????, ??? ? ?? ?? ?? ?? ???? ????.`,
      `???? ${position}? ${cardName}(${orientation})? ???? ??? ??? ???. 10? ?? ??? ???? ????, ?? ? ?? ??? ?????.`,
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
        : buildMinimumInsight(input.language, card)
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
          ? '??? ??? ?? ???? ??????.'
          : 'Prove today�s choice with one small execution.',
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
          ? '???'
          : 'reversed'
        : isKorean
          ? '???'
          : 'upright'
      const orientationB = cardB.isReversed
        ? isKorean
          ? '???'
          : 'reversed'
        : isKorean
          ? '???'
          : 'upright'

      const summary = isKorean
        ? `${nameA}(${orientationA})? ${nameB}(${orientationB}) ??? ?? ???? ?? ?? ?? ??? ????.`
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
      ensureCardAnchoring(language, card, buildMinimumInsight(language, card), userQuestion)
    ),
    spirit_animal: null,
    chakra: null,
    element: null,
    shadow: null,
  }))
}

// ??? fallback (GPT? ??? ??)
export function generateSimpleFallback(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  userQuestion?: string
) {
  const isKorean = language === 'ko'
  const question = (userQuestion || '').trim()
  const questionLine = question
    ? isKorean
      ? `?? "${question}"? ???? ??, `
      : `For your question "${question}", `
    : ''

  const overallMessage = isKorean
    ? `${questionLine}${cards.map((c) => c.nameKo || c.name).join(', ')} ?? ??? ?? ??? ??? ???????, ????? ??? ? ?? ???? ?? ???? ????.`
    : `${questionLine}the spread of ${cards.map((c) => c.name).join(', ')} suggests that steady prioritization and small decisive actions will shift the current momentum more effectively than forcing outcomes.`

  const guidanceMessage = isKorean
    ? [
        '1) ??: ?? ?? ? ?? 1?? ?? 20? ?????.',
        '2) 3?: ??? ????(??? ???/??/???) ?? ??? ? ? ? ?????.',
        '3) 7?: ?? ??? ??? ??? ???? ??? ?????.',
      ].join('\n')
    : [
        '1) Today: choose one controllable variable and run a focused 20-minute action block.',
        '2) In 3 days: log outcome signals (what you did / response / adjustment) and repeat once.',
        '3) In 7 days: keep only what worked and prune low-signal actions.',
      ].join('\n')

  return {
    overall_message: overallMessage,
    card_insights: cards.map((card) => {
      const baseInterpretation = buildMinimumInsight(language, card)
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
      ? '??? ??? ?? ???? ??? ?? ?? ?????.'
      : 'Let evidence from your actions lead your next move.',
    combinations: buildLocalCombinationHints(cards, language),
    followup_questions: [],
    fallback: true,
  }
}
