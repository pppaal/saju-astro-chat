// src/app/api/tarot/interpret/route.ts
// Premium Tarot Interpretation API using Hybrid RAG

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { prisma } from '@/lib/db/prisma'
import { captureServerError } from '@/lib/telemetry'
import { enforceBodySize, fetchWithRetry } from '@/lib/http'
import {
  applyCreditResultCookies,
  checkAndConsumeCredits,
  creditErrorResponse,
} from '@/lib/credits/withCredits'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { tarotInterpretRequestSchema } from '@/lib/api/zodValidation'
import { evaluateTarotInterpretationQuality } from '@/lib/Tarot/interpretationQuality'
import {
  buildQuestionContextPrompt,
  type TarotQuestionAnalysisSnapshot,
} from '@/lib/Tarot/questionFlow'
import { recordCounter, recordTiming } from '@/lib/metrics'

interface CardInput {
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

type ParsedTarotJson = {
  overall?: unknown
  cards?: unknown
  advice?: unknown
  combinations?: unknown
}

type TarotInsight = {
  position: string
  card_name: string
  is_reversed: boolean
  interpretation: string
  spirit_animal: null
  chakra: null
  element: null
  shadow: null
}

type TarotInterpretResult = {
  overall_message: string
  card_insights: TarotInsight[]
  guidance: string
  affirmation: string
  combinations: Array<{ cards: string[]; meaning: string }> | unknown[]
  followup_questions: unknown[]
  fallback: boolean
}

const MAX_CARD_MEANING_LENGTH = 500
const OPENAI_TIMEOUT_MS = 40000
const OPENAI_MAX_RETRIES = 1
const LARGE_SPREAD_THRESHOLD = 8
const LARGE_SPREAD_BACKEND_TIMEOUT_MS = 12000
const LARGE_SPREAD_GPT_TIMEOUT_MS = 16000
const LARGE_SPREAD_GPT_MAX_TOKENS = 1600

function parseStructuredContextFromString(
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

function contextForPrompt(
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

function normalizeQuestionContext(
  value: unknown
): TarotQuestionAnalysisSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as TarotQuestionAnalysisSnapshot
}

function truncateToMax(value: unknown, maxLength: number): string | unknown {
  if (typeof value !== 'string') return value
  if (value.length <= maxLength) return value
  return value.slice(0, maxLength)
}

function normalizeInterpretRequestBody(rawBody: unknown): {
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

function stripMarkdownCodeFence(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return (fenceMatch?.[1] || raw).trim()
}

function extractJsonObjectSlice(raw: string): string | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) {
    return null
  }
  return raw.slice(start, end + 1)
}

function sanitizeJsonLikeText(raw: string): string {
  return raw
    .replace(/^\uFEFF/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\/\/[^\n\r]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*([}\]])/g, '$1')
}

function normalizeSingleQuoteJson(raw: string): string {
  return raw
    .replace(/([{,]\s*)'([^']+?)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^'\\]*(?:\\.[^'\\]*)*)'(?=\s*[,}])/g, (_match, value: string) => {
      const normalized = value.replace(/"/g, '\\"')
      return `: "${normalized}"`
    })
}

function normalizeUnquotedKeysJson(raw: string): string {
  return raw.replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)/g, '$1"$2"$3')
}

function tryParseJsonCandidate(raw: string): ParsedTarotJson | null {
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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function isTooGenericGuidance(guidance: string, language: string): boolean {
  const normalized = guidance.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!normalized || normalized.length < 25) return true

  if (language === 'ko') {
    return /(메시지에 귀 기울|화이팅|힘내|좋은 하루)/i.test(guidance)
  }
  return /(listen to the cards|you got this|stay positive|good luck)/i.test(normalized)
}

function buildActionableGuidance(language: string, userQuestion: string | undefined): string {
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

function buildMinimumOverall(
  language: string,
  cards: CardInput[],
  userQuestion: string | undefined,
  currentOverall: string
): string {
  if (currentOverall.trim().length >= 90) {
    return currentOverall
  }

  const cardNames = cards
    .slice(0, 3)
    .map((card) => (language === 'ko' ? card.nameKo || card.name : card.name))
    .join(', ')

  if (language === 'ko') {
    const q = (userQuestion || '').trim()
    const qLine = q ? `질문 "${q}" 기준으로 보면, ` : ''
    return `${qLine}${cardNames} 카드 조합은 지금은 성급한 결정보다 우선순위 정리와 실행 리듬 회복이 핵심이라는 신호예요. 감정 반응으로 바로 움직이기보다, 작은 실행 단위를 먼저 만들고 결과를 확인하면서 조정하면 흐름이 안정됩니다. 결론: 오늘 바로 실행 가능한 1개 행동부터 시작하세요.`
  }

  const q = (userQuestion || '').trim()
  const qLine = q ? `For your question "${q}", ` : ''
  return `${qLine}the combination of ${cardNames} suggests that stabilizing priorities and execution rhythm matters more than reacting fast. Start with one small concrete action, observe the outcome, and iterate from evidence. Conclusion: begin with one action you can complete today.`
}

function getCardKeywordSummary(card: CardInput, language: string): string {
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
    ? `핵심 키워드는 ${compact.join(', ')} 입니다. `
    : `Key cues are ${compact.join(', ')}. `
}

function buildMinimumInsight(language: string, card: CardInput): string {
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
      ? '현재 상황의 핵심 변수를 확인하고 단계별 실행으로 전환하세요.'
      : 'Check the key variable in your current situation and move with staged execution.')
  const keywordSummary = getCardKeywordSummary(card, language)

  if (language === 'ko') {
    return `${cardName}(${orientation}) 카드는 지금 국면에서 감정 반응보다 구조화된 선택이 중요하다고 말해요. ${keywordSummary}${baseMeaning} 오늘은 이 카드가 가리키는 변수 1개만 정리하고, 이번 주에는 결과 기록으로 판단 정확도를 높이세요.`
  }

  return `${cardName} (${orientation}) signals that structured choices beat emotional reaction in this phase. ${keywordSummary}${baseMeaning} Today, isolate one variable this card points to, and this week, use outcome logging to improve decision accuracy.`
}

function ensureCardAnchoring(
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
  const hasQuestionAnchor = question.length === 0 || normalized.includes(question.slice(0, 12))

  if (hasCardName && hasPosition && hasQuestionAnchor) {
    return normalized
  }

  if (language === 'ko') {
    const questionLine = question ? `질문 "${question}"을 기준으로, ` : ''
    return `${questionLine}${position}의 ${cardName} 카드는 ${normalized}`
  }

  const questionLine = question ? `For your question "${question}", ` : ''
  return `${questionLine}${cardName} in the ${position} position indicates: ${normalized}`
}

function ensureActionAndTimeAnchor(language: string, interpretation: string): string {
  const normalized = interpretation.trim()
  const hasTimeAnchor =
    /(?:today|this week|within 7 days|next week|오늘|이번\s*주|다음\s*7일|이번\s*달)/i.test(
      normalized
    )
  const hasActionVerb =
    /(?:write|plan|track|review|start|focus|set|talk|record|apply|정리|기록|실행|집중|설정|점검|대화|시작|적어|해보)/i.test(
      normalized
    )

  if (hasTimeAnchor && hasActionVerb) {
    return normalized
  }

  if (language === 'ko') {
    return `${normalized} 오늘 20분 실행 1개를 정하고, 이번 주 안에 결과를 3줄로 기록해 다음 선택 기준으로 삼으세요.`
  }

  return `${normalized} Pick one 20-minute action for today, then log outcomes in 3 lines within this week to guide your next move.`
}

function normalizeResultPayload(raw: unknown): Partial<TarotInterpretResult> {
  if (!raw || typeof raw !== 'object') return {}
  return raw as Partial<TarotInterpretResult>
}

function diversifyDuplicateInsights(input: {
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

function enforceInterpretationQuality(input: {
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
          ? '오늘의 선택을 작은 실행으로 증명해보세요.'
          : 'Prove today’s choice with one small execution.',
    combinations: normalizeCombinations(payload.combinations, input.cards, input.language),
    followup_questions: Array.isArray(payload.followup_questions) ? payload.followup_questions : [],
    fallback: Boolean(payload.fallback),
  }
}

function buildEmergencyFallbackResult(
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

function normalizeCombinations(
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

export const POST = withApiMiddleware(
  async (req: NextRequest, context) => {
    let fallbackCards: CardInput[] = []
    let fallbackLanguage = 'ko'
    let fallbackQuestion: string | undefined
    let creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null = null
    const startedAt = Date.now()
    let interpretationSource: 'backend_rag' | 'gpt_fallback' | 'emergency_fallback' = 'backend_rag'

    try {
      recordCounter('tarot.interpret.request_total', 1, { stage: 'received' })

      const oversized = enforceBodySize(req, 256 * 1024)
      if (oversized) {
        recordCounter('tarot.interpret.request_total', 1, { stage: 'rejected_oversized' })
        return oversized
      }

      let rawBody: unknown
      try {
        rawBody = await req.json()
      } catch (parseErr) {
        logger.warn('[Tarot interpret] invalid JSON request body', {
          error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        })
        recordCounter('tarot.interpret.request_total', 1, { stage: 'invalid_json' })
        return NextResponse.json(
          { error: 'invalid_json_body' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }
      const { body: normalizedBody, truncatedCount } = normalizeInterpretRequestBody(rawBody)
      if (truncatedCount > 0) {
        logger.info('[Tarot interpret] truncated oversized card meaning fields', {
          truncatedCount,
          max: MAX_CARD_MEANING_LENGTH,
        })
      }

      // Validate with Zod
      const validationResult = tarotInterpretRequestSchema.safeParse(normalizedBody)
      if (!validationResult.success) {
        logger.warn('[Tarot interpret] validation failed', {
          errors: validationResult.error.issues,
        })
        recordCounter('tarot.interpret.request_total', 1, { stage: 'validation_failed' })
        return NextResponse.json(
          {
            error: 'validation_failed',
            details: validationResult.error.issues.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const {
        categoryId,
        spreadId,
        spreadTitle,
        cards: validatedCards,
        userQuestion,
        language = 'ko',
        birthdate,
        moonPhase,
        includeAstrology = true,
        includeSaju = true,
        sajuContext,
        astroContext,
        questionContext,
      } = validationResult.data

      fallbackCards = validatedCards
      fallbackLanguage = language
      const normalizedQuestionContext = normalizeQuestionContext(questionContext)
      const enrichedUserQuestion = buildQuestionContextPrompt(
        userQuestion || '',
        normalizedQuestionContext,
        language
      )
      fallbackQuestion = enrichedUserQuestion

      const parsedSajuContext =
        includeSaju && sajuContext
          ? parseStructuredContextFromString(sajuContext, 'saju_context')
          : undefined
      const parsedAstroContext =
        includeAstrology && astroContext
          ? parseStructuredContextFromString(astroContext, 'astro_context')
          : undefined
      const promptSajuContext = includeSaju
        ? contextForPrompt(sajuContext, parsedSajuContext)
        : undefined
      const promptAstroContext = includeAstrology
        ? contextForPrompt(astroContext, parsedAstroContext)
        : undefined

      creditResult = await checkAndConsumeCredits('reading', 1, req)
      if (!creditResult.allowed) {
        recordCounter('tarot.interpret.request_total', 1, { stage: 'credit_denied' })
        return creditErrorResponse(creditResult)
      }

      // Call Python backend for Hybrid RAG interpretation (with fallback on connection failure)
      let interpretation = null
      const isLargeSpread = validatedCards.length >= LARGE_SPREAD_THRESHOLD
      const backendRequestOptions = isLargeSpread
        ? { timeout: LARGE_SPREAD_BACKEND_TIMEOUT_MS, retries: 0, retryDelay: 500 }
        : { timeout: 60000, retries: 2, retryDelay: 1200 }
      if (isLargeSpread) {
        logger.info('[Tarot interpret] large spread detected; using fast backend fallback policy', {
          spreadId,
          cardCount: validatedCards.length,
          timeout: backendRequestOptions.timeout,
          retries: backendRequestOptions.retries,
        })
      }
      try {
        const response = await apiClient.post(
          '/api/tarot/interpret',
          {
            category: categoryId,
            spread_id: spreadId,
            spread_title: spreadTitle,
            cards: validatedCards.map((c) => ({
              name: c.name,
              is_reversed: c.isReversed,
              position: c.position,
            })),
            user_question: enrichedUserQuestion,
            language,
            birthdate: includeAstrology ? birthdate : undefined,
            moon_phase: moonPhase,
            saju_context: parsedSajuContext,
            astro_context: parsedAstroContext,
          },
          backendRequestOptions
        )

        if (response.ok) {
          interpretation = response.data
        } else {
          logger.warn('[Tarot interpret] backend response not ok', {
            status: response.status,
            error: response.error,
          })
        }
      } catch (fetchError) {
        logger.warn('Backend connection failed, using fallback:', fetchError)
      }

      // Use backend response or GPT fallback
      let result
      if (interpretation && !(interpretation as Record<string, unknown>).error) {
        result = interpretation
        interpretationSource = 'backend_rag'
      } else {
        logger.warn('Backend unavailable, using GPT interpretation')
        recordCounter('tarot.interpret.fallback_total', 1, { from: 'backend_rag', to: 'gpt' })
        try {
          result = await generateGPTInterpretation(
            validatedCards,
            spreadTitle,
            language,
            enrichedUserQuestion,
            promptSajuContext,
            promptAstroContext
          )
          interpretationSource = 'gpt_fallback'
        } catch (gptErr) {
          logger.error('GPT interpretation failed:', gptErr)
          result = buildEmergencyFallbackResult(validatedCards, language, enrichedUserQuestion)
          interpretationSource = 'emergency_fallback'
          recordCounter('tarot.interpret.fallback_total', 1, { from: 'gpt', to: 'emergency' })
        }
      }

      result = enforceInterpretationQuality({
        rawResult: result,
        cards: validatedCards,
        language,
        userQuestion: enrichedUserQuestion,
      })

      if (
        interpretationSource === 'gpt_fallback' &&
        Boolean((result as { fallback?: boolean }).fallback)
      ) {
        interpretationSource = 'emergency_fallback'
      }

      const finalizedResult = {
        ...result,
        interpretation_source: interpretationSource,
      }

      const elapsedMs = Date.now() - startedAt
      recordCounter('tarot.interpret.source_total', 1, {
        source: interpretationSource,
        fallback: String(Boolean(finalizedResult.fallback)),
      })
      recordTiming('tarot.interpret.duration_ms', elapsedMs, {
        source: interpretationSource,
      })

      logger.info('[Tarot interpret] response finalized', {
        source: interpretationSource,
        cardCount: validatedCards.length,
        elapsedMs,
        fallback: Boolean(finalizedResult.fallback),
      })

      // ======== 기록 저장 (로그인 사용자만) ========
      const session = context.session
      if (session?.user?.id) {
        try {
          await prisma.reading.create({
            data: {
              userId: session.user.id,
              type: 'tarot',
              title: `${spreadTitle} - ${validatedCards.map((c: CardInput) => c.nameKo || c.name).join(', ')}`,
              content: JSON.stringify({
                categoryId,
                spreadId,
                spreadTitle,
                cards: validatedCards.map((c: CardInput) => ({
                  name: c.name,
                  nameKo: c.nameKo,
                  isReversed: c.isReversed,
                  position: c.position,
                })),
                userQuestion,
              }),
            },
          })
        } catch (saveErr) {
          logger.warn('[Tarot API] Failed to save reading:', saveErr)
        }
      }

      const response = NextResponse.json(finalizedResult)
      return applyCreditResultCookies(response, creditResult)
    } catch (err: unknown) {
      captureServerError(err as Error, { route: '/api/tarot/interpret' })

      // Return fallback even on error
      logger.error('Tarot interpretation error:', err)
      const fallback = buildEmergencyFallbackResult(
        fallbackCards,
        fallbackLanguage,
        fallbackQuestion
      )
      const elapsedMs = Date.now() - startedAt
      const fallbackWithSource = {
        ...fallback,
        interpretation_source: 'emergency_fallback' as const,
      }
      recordCounter('tarot.interpret.source_total', 1, {
        source: 'emergency_fallback',
        fallback: 'true',
      })
      recordTiming('tarot.interpret.duration_ms', elapsedMs, {
        source: 'emergency_fallback',
      })
      logger.warn('[Tarot interpret] emergency fallback returned', {
        cardCount: fallbackCards.length,
        elapsedMs,
      })
      const response = NextResponse.json(fallbackWithSource, { status: HTTP_STATUS.OK })
      return applyCreditResultCookies(response, creditResult)
    }
  },
  createPublicStreamGuard({
    route: 'tarot/interpret',
    limit: 10,
    windowSeconds: 60,
  })
)

// GPT-4o-mini API 호출 헬퍼 (속도 최적화)
async function callGPT(
  prompt: string,
  maxTokens = 400,
  timeoutMs = OPENAI_TIMEOUT_MS
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set')
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
        messages: [
          {
            role: 'system',
            content:
              'Return a single valid JSON object only. Do not include markdown fences, comments, or trailing text.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.75,
        response_format: { type: 'json_object' },
      }),
    },
    {
      maxRetries: OPENAI_MAX_RETRIES,
      initialDelayMs: 700,
      maxDelayMs: 4000,
      timeoutMs,
      retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],
      onRetry: (attempt, error, delayMs) => {
        logger.warn('[Tarot interpret] OpenAI retry scheduled', {
          attempt,
          delayMs,
          reason: error.message,
        })
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`OpenAI API error: ${response.status} ${errorText.slice(0, 280)}`)
  }

  // Read the body once as text to avoid stream-consumption issues on JSON parse fallback.
  const rawText = await response.text().catch(() => '')
  let data: { choices?: Array<{ message?: { content?: string } }> } | null = null
  try {
    data = JSON.parse(rawText) as { choices?: Array<{ message?: { content?: string } }> }
  } catch (parseErr) {
    logger.warn('[Tarot interpret] OpenAI JSON parse failed', {
      error: parseErr instanceof Error ? parseErr.message : String(parseErr),
      preview: rawText.slice(0, 280),
    })
    throw new Error('OpenAI response parse failed')
  }

  return data?.choices?.[0]?.message?.content || ''
}

type PromptBudget = {
  overallGuide: string
  perCardGuide: string
  adviceGuide: string
  maxTokens: number
  timeoutMs: number
}

function getPromptBudget(cardCount: number, isKorean: boolean): PromptBudget {
  if (cardCount >= LARGE_SPREAD_THRESHOLD) {
    return isKorean
      ? {
          overallGuide: '180-300자',
          perCardGuide: '90-160자',
          adviceGuide: '120-180자',
          maxTokens: LARGE_SPREAD_GPT_MAX_TOKENS,
          timeoutMs: LARGE_SPREAD_GPT_TIMEOUT_MS,
        }
      : {
          overallGuide: '100-170 words',
          perCardGuide: '40-70 words',
          adviceGuide: '60-100 words',
          maxTokens: LARGE_SPREAD_GPT_MAX_TOKENS,
          timeoutMs: LARGE_SPREAD_GPT_TIMEOUT_MS,
        }
  }

  if (cardCount >= 5) {
    return isKorean
      ? {
          overallGuide: '320-520자',
          perCardGuide: '180-320자',
          adviceGuide: '140-220자',
          maxTokens: 2600,
          timeoutMs: 55000,
        }
      : {
          overallGuide: '180-300 words',
          perCardGuide: '90-150 words',
          adviceGuide: '90-130 words',
          maxTokens: 2600,
          timeoutMs: 55000,
        }
  }

  return isKorean
    ? {
        overallGuide: '500-850자',
        perCardGuide: '260-480자',
        adviceGuide: '160-260자',
        maxTokens: 3000,
        timeoutMs: OPENAI_TIMEOUT_MS,
      }
    : {
        overallGuide: '260-420 words',
        perCardGuide: '120-220 words',
        adviceGuide: '100-150 words',
        maxTokens: 3000,
        timeoutMs: OPENAI_TIMEOUT_MS,
      }
}

function truncatePromptContext(input: string | undefined, maxLength = 1200): string {
  if (!input) return ''
  const normalized = input.trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}\n...[truncated]`
}

// GPT를 사용한 해석 생성 (백엔드 없이 직접 호출) - 통합 프롬프트로 속도 최적화
async function generateGPTInterpretation(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  userQuestion?: string,
  sajuContext?: string,
  astroContext?: string
) {
  const isKorean = language === 'ko'
  const isLargeSpread = cards.length >= LARGE_SPREAD_THRESHOLD
  const budget = getPromptBudget(cards.length, isKorean)

  // 위치별 카드 정보
  const cardListText = cards
    .map((c, i) => {
      const name = isKorean && c.nameKo ? c.nameKo : c.name
      const pos = isKorean && c.positionKo ? c.positionKo : c.position
      const keywords = (isKorean && c.keywordsKo ? c.keywordsKo : c.keywords) || []
      return `${i + 1}. [${pos}] ${name}${c.isReversed ? '(역방향)' : ''} - ${keywords.slice(0, 3).join(', ')}`
    })
    .join('\n')

  let q = userQuestion || (isKorean ? '일반 운세' : 'general reading')
  const compactSaju = truncatePromptContext(sajuContext)
  const compactAstro = truncatePromptContext(astroContext)
  const contextBlock = [compactSaju, compactAstro].filter(Boolean).join('\n')
  if (contextBlock) {
    q = `${q}\n${contextBlock}`
  }

  const cardExamples = isLargeSpread
    ? ''
    : cards
        .map((c, i) => {
          const pos = isKorean && c.positionKo ? c.positionKo : c.position
          const ordinal = isKorean
            ? `${i + 1}번째`
            : i === 0
              ? 'First'
              : i === 1
                ? 'Second'
                : i === 2
                  ? 'Third'
                  : `${i + 1}th`
          return isKorean
            ? `    {
      "position": "${pos}",
      "interpretation": "${ordinal} 카드 해석 (${budget.perCardGuide})"
    }`
            : `    {
      "position": "${pos}",
      "interpretation": "${ordinal} card interpretation (${budget.perCardGuide})"
    }`
        })
        .join(',\n')

  const outputSchemaKo = isLargeSpread
    ? `{
  "overall": "전체 메시지 (${budget.overallGuide})",
  "advice": "실행 지침 (150-230자)"
}`
    : `{
  "overall": "전체 메시지 (${budget.overallGuide})",
  "cards": [
${cardExamples}
  ],
  "advice": "실행 지침 (${budget.adviceGuide})"
}`

  const outputSchemaEn = isLargeSpread
    ? `{
  "overall": "Overall message (${budget.overallGuide})",
  "advice": "Practical action steps (80-130 words)"
}`
    : `{
  "overall": "Overall message (${budget.overallGuide})",
  "cards": [
${cardExamples}
  ],
  "advice": "Practical action steps (${budget.adviceGuide})"
}`

  // 통합 프롬프트 (전체 해석 + 카드별 해석 + 조언)
  const unifiedPrompt = isKorean
    ? `당신은 실전형 타로 리더입니다. 핵심만 정확하고 따뜻하게 전달하세요.

## 스프레드: ${spreadTitle}
## 질문: "${q}"

## 뽑힌 카드
${cardListText}

## 중요
- 질문에 직접 답하고, 장황한 설명은 금지합니다.
- 출력은 오직 JSON입니다.
- ${
        isLargeSpread
          ? '대형 스프레드이므로 cards 필드는 출력하지 말고, 전체 메시지와 실행 지침만 정확히 작성하세요.'
          : `반드시 모든 ${cards.length}개 카드 해석을 포함하세요.`
      }

## 출력 형식 (JSON)
다음 형식으로 정확히 JSON 응답:
${outputSchemaKo}

## 작성 규칙
- ${isLargeSpread ? '전체 메시지는 질문 중심으로 작성하고, 실행 지침은 3단계로 구체화' : '각 카드 해석은 위치 의미 + 현재 상황 연결 + 오늘 실행 포인트를 포함'}
- 역방향 카드는 막힘/지연/내면화 관점으로 구체화
- 추상적 문장 금지, 바로 실행 가능한 문장 사용`
    : `You are a practical tarot reader. Be precise, warm, and concise.

## Spread: ${spreadTitle}
## Question: "${q}"

## Cards Drawn
${cardListText}

## IMPORTANT
- Answer the user question directly with concise, practical language.
- Output JSON only.
- ${
        isLargeSpread
          ? 'For large spreads, do not output cards array. Return only overall + advice.'
          : `Include all ${cards.length} card interpretations.`
      }

## Output Format (JSON)
Respond in this exact JSON format:
${outputSchemaEn}

## Rules
- ${
        isLargeSpread
          ? 'Advice must be concrete and step-based.'
          : 'Each card interpretation must include: position meaning + current situation link + one concrete action.'
      }
- For reversed cards, explain blockage/delay/internalization explicitly.
- Avoid generic platitudes; keep it actionable.
- Include at least one time anchor in each card insight (today/this week/within 7 days).`

  try {
    const result = await callGPT(unifiedPrompt, budget.maxTokens, budget.timeoutMs)

    const parsed = tryParseJsonCandidate(result)
    if (parsed) {
      const card_insights = isLargeSpread
        ? buildAnchoredCardInsights(cards, language, userQuestion)
        : cards.map((card, i) => {
            const parsedCards = Array.isArray(parsed.cards) ? parsed.cards : []
            const cardData = asRecord(parsedCards[i])
            let interpretation =
              typeof cardData.interpretation === 'string' ? cardData.interpretation : ''

            // 해석이 너무 짧거나 없으면, 카드명/포지션/질문 앵커가 있는 최소 품질 문장으로 보강
            if (!interpretation || interpretation.length < 80) {
              interpretation = ensureCardAnchoring(
                language,
                card,
                buildMinimumInsight(language, card),
                userQuestion
              )
            }

            const anchoredInterpretation = ensureActionAndTimeAnchor(
              language,
              ensureCardAnchoring(language, card, interpretation, userQuestion)
            )

            return {
              position: card.position,
              card_name: card.name,
              is_reversed: card.isReversed,
              interpretation: anchoredInterpretation,
              spirit_animal: null,
              chakra: null,
              element: null,
              shadow: null,
            }
          })

      return {
        overall_message: typeof parsed.overall === 'string' ? parsed.overall : '',
        card_insights,
        guidance:
          (typeof parsed.advice === 'string' && parsed.advice) ||
          buildActionableGuidance(language, userQuestion),
        affirmation: isKorean ? '오늘 하루도 나답게 가면 돼요.' : 'Just be yourself today.',
        combinations: normalizeCombinations(parsed.combinations, cards, language),
        followup_questions: [],
        fallback: false,
      }
    }

    logger.warn('[Tarot interpret] GPT returned non-JSON content; using text fallback payload', {
      preview: result.slice(0, 280),
    })

    // JSON 파싱 실패 시 전체 텍스트를 overall로 사용
    return {
      overall_message: result,
      card_insights: buildAnchoredCardInsights(cards, language, userQuestion),
      guidance: isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.',
      affirmation: isKorean ? '오늘도 화이팅!' : 'You got this!',
      combinations: normalizeCombinations(undefined, cards, language),
      followup_questions: [],
      fallback: false,
    }
  } catch (error) {
    logger.error('GPT interpretation failed:', error)
    return generateSimpleFallback(cards, spreadTitle, language, userQuestion)
  }
}

function buildLocalCombinationHints(
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
        ? `${nameA}(${orientationA})와 ${nameB}(${orientationB}) 조합은 같은 주제에서 보완 또는 긴장 흐름을 만듭니다.`
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

function buildAnchoredCardInsights(
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

// 간단한 fallback (GPT도 실패한 경우)
function generateSimpleFallback(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  userQuestion?: string
) {
  const isKorean = language === 'ko'
  const question = (userQuestion || '').trim()
  const questionLine = question
    ? isKorean
      ? `질문 "${question}"을 기준으로 보면, `
      : `For your question "${question}", `
    : ''

  const overallMessage = isKorean
    ? `${questionLine}${cards.map((c) => c.nameKo || c.name).join(', ')} 카드 조합은 지금 흐름을 억지로 밀어붙이기보다, 우선순위를 정리한 뒤 작은 실행으로 판을 바꾸라는 신호예요.`
    : `${questionLine}the spread of ${cards.map((c) => c.name).join(', ')} suggests that steady prioritization and small decisive actions will shift the current momentum more effectively than forcing outcomes.`

  const guidanceMessage = isKorean
    ? [
        '1) 오늘: 지금 가장 큰 변수 1개만 정해 20분 실행하세요.',
        '2) 3일: 결과를 기록하고(무엇을 했는지/반응/수정점) 같은 패턴을 한 번 더 검증하세요.',
        '3) 7일: 효과 있었던 방식만 남기고 나머지는 과감히 정리하세요.',
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
      ? '감정이 아니라 실행 데이터가 당신의 다음 길을 열어줍니다.'
      : 'Let evidence from your actions lead your next move.',
    combinations: buildLocalCombinationHints(cards, language),
    followup_questions: [],
    fallback: true,
  }
}
