// src/app/api/tarot/interpret/route.ts
// Premium Tarot Interpretation API using Hybrid RAG

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { prisma } from '@/lib/db/prisma'
import { captureServerError } from '@/lib/telemetry'
import { enforceBodySize, fetchWithRetry } from '@/lib/http'
import { checkAndConsumeCredits, creditErrorResponse } from '@/lib/credits/withCredits'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { tarotInterpretRequestSchema } from '@/lib/api/zodValidation'
import { evaluateTarotInterpretationQuality } from '@/lib/Tarot/interpretationQuality'

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
  combinations: Array<{ title: string; summary: string }> | unknown[]
  followup_questions: unknown[]
  fallback: boolean
}

const MAX_CARD_MEANING_LENGTH = 500
const OPENAI_TIMEOUT_MS = 40000
const OPENAI_MAX_RETRIES = 1

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

  if (language === 'ko') {
    return `${cardName}(${orientation}) 카드는 지금 국면에서 감정 반응보다 구조화된 선택이 중요하다고 말해요. ${baseMeaning} 오늘은 이 카드가 가리키는 변수 1개만 정리하고, 이번 주에는 결과 기록으로 판단 정확도를 높이세요.`
  }

  return `${cardName} (${orientation}) signals that structured choices beat emotional reaction in this phase. ${baseMeaning} Today, isolate one variable this card points to, and this week, use outcome logging to improve decision accuracy.`
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

function normalizeResultPayload(raw: unknown): Partial<TarotInterpretResult> {
  if (!raw || typeof raw !== 'object') return {}
  return raw as Partial<TarotInterpretResult>
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
    const interpretation = ensureCardAnchoring(
      input.language,
      card,
      baseInterpretation,
      input.userQuestion
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
      card_insights: normalizedInsights,
      guidance,
      fallback: Boolean(payload.fallback),
    },
  })

  if (quality.overallScore < 60) {
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
    card_insights: normalizedInsights,
    guidance,
    affirmation:
      typeof payload.affirmation === 'string' && payload.affirmation.trim()
        ? payload.affirmation
        : isKorean
          ? '오늘의 선택을 작은 실행으로 증명해보세요.'
          : 'Prove today’s choice with one small execution.',
    combinations:
      Array.isArray(payload.combinations) && payload.combinations.length > 0
        ? payload.combinations
        : buildLocalCombinationHints(input.cards, input.language),
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

export const POST = withApiMiddleware(
  async (req: NextRequest, context) => {
    let fallbackCards: CardInput[] = []
    let fallbackLanguage = 'ko'
    let fallbackQuestion: string | undefined

    try {
      const oversized = enforceBodySize(req, 256 * 1024)
      if (oversized) {
        return oversized
      }

      let rawBody: unknown
      try {
        rawBody = await req.json()
      } catch (parseErr) {
        logger.warn('[Tarot interpret] invalid JSON request body', {
          error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        })
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
      } = validationResult.data

      fallbackCards = validatedCards
      fallbackLanguage = language
      fallbackQuestion = userQuestion

      const creditResult = await checkAndConsumeCredits('reading', 1)
      if (!creditResult.allowed) {
        return creditErrorResponse(creditResult)
      }

      // Call Python backend for Hybrid RAG interpretation (with fallback on connection failure)
      let interpretation = null
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
            user_question: userQuestion,
            language,
            birthdate: includeAstrology ? birthdate : undefined,
            moon_phase: moonPhase,
            saju_context: includeSaju ? sajuContext : undefined,
            astro_context: includeAstrology ? astroContext : undefined,
          },
          { timeout: 20000 }
        )

        if (response.ok) {
          interpretation = response.data
        }
      } catch (fetchError) {
        logger.warn('Backend connection failed, using fallback:', fetchError)
      }

      // Use backend response or GPT fallback
      let result
      if (interpretation && !(interpretation as Record<string, unknown>).error) {
        result = interpretation
      } else {
        logger.warn('Backend unavailable, using GPT interpretation')
        try {
          result = await generateGPTInterpretation(
            validatedCards,
            spreadTitle,
            language,
            userQuestion,
            includeSaju ? sajuContext : undefined,
            includeAstrology ? astroContext : undefined
          )
        } catch (gptErr) {
          logger.error('GPT interpretation failed:', gptErr)
          result = buildEmergencyFallbackResult(validatedCards, language, userQuestion)
        }
      }

      result = enforceInterpretationQuality({
        rawResult: result,
        cards: validatedCards,
        language,
        userQuestion,
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

      return NextResponse.json(result)
    } catch (err: unknown) {
      captureServerError(err as Error, { route: '/api/tarot/interpret' })

      // Return fallback even on error
      logger.error('Tarot interpretation error:', err)
      const fallback = buildEmergencyFallbackResult(
        fallbackCards,
        fallbackLanguage,
        fallbackQuestion
      )
      return NextResponse.json(fallback, { status: HTTP_STATUS.OK })
    }
  },
  createPublicStreamGuard({
    route: 'tarot/interpret',
    limit: 10,
    windowSeconds: 60,
  })
)

// GPT-4o-mini API 호출 헬퍼 (속도 최적화)
async function callGPT(prompt: string, maxTokens = 400): Promise<string> {
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
      timeoutMs: OPENAI_TIMEOUT_MS,
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
}

function getPromptBudget(cardCount: number, isKorean: boolean): PromptBudget {
  if (cardCount >= 8) {
    return isKorean
      ? {
          overallGuide: '220-380자',
          perCardGuide: '120-220자',
          adviceGuide: '120-180자',
          maxTokens: 2400,
        }
      : {
          overallGuide: '140-220 words',
          perCardGuide: '60-100 words',
          adviceGuide: '70-110 words',
          maxTokens: 2400,
        }
  }

  if (cardCount >= 5) {
    return isKorean
      ? {
          overallGuide: '320-520자',
          perCardGuide: '180-320자',
          adviceGuide: '140-220자',
          maxTokens: 2600,
        }
      : {
          overallGuide: '180-300 words',
          perCardGuide: '90-150 words',
          adviceGuide: '90-130 words',
          maxTokens: 2600,
        }
  }

  return isKorean
    ? {
        overallGuide: '500-850자',
        perCardGuide: '260-480자',
        adviceGuide: '160-260자',
        maxTokens: 3000,
      }
    : {
        overallGuide: '260-420 words',
        perCardGuide: '120-220 words',
        adviceGuide: '100-150 words',
        maxTokens: 3000,
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

  // 카드 개수에 맞춘 JSON 예시 생성
  const cardExamples = cards
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

  // 통합 프롬프트 (전체 해석 + 카드별 해석 + 조언)
  const unifiedPrompt = isKorean
    ? `당신은 실전형 타로 리더입니다. 핵심만 정확하고 따뜻하게 전달하세요.

## 스프레드: ${spreadTitle}
## 질문: "${q}"

## 뽑힌 카드
${cardListText}

## 중요
- 반드시 모든 ${cards.length}개 카드 해석 포함
- 장황한 설명 금지, 질문에 직접 답
- 출력은 오직 JSON

## 출력 형식 (JSON)
다음 형식으로 정확히 JSON 응답:
{
  "overall": "전체 메시지 (${budget.overallGuide})",
  "cards": [
${cardExamples}
  ],
  "advice": "실행 지침 (${budget.adviceGuide})"
}

## 작성 규칙
- 각 카드 해석은 위치 의미 + 현재 상황 연결 + 오늘 실행 포인트를 포함
- 역방향 카드는 막힘/지연/내면화 관점으로 구체화
- 추상적 문장 금지, 바로 실행 가능한 문장 사용`
    : `You are a practical tarot reader. Be precise, warm, and concise.

## Spread: ${spreadTitle}
## Question: "${q}"

## Cards Drawn
${cardListText}

## IMPORTANT
- Include all ${cards.length} card interpretations
- No verbose filler
- Output JSON only

## Output Format (JSON)
Respond in this exact JSON format:
{
  "overall": "Overall message (${budget.overallGuide})",
  "cards": [
${cardExamples}
  ],
  "advice": "Practical action steps (${budget.adviceGuide})"
}

## Rules
- Each card interpretation must include: position meaning + current situation link + one concrete action.
- For reversed cards, explain blockage/delay/internalization explicitly.
- Avoid generic platitudes; keep it actionable.`

  try {
    const result = await callGPT(unifiedPrompt, budget.maxTokens)

    const parsed = tryParseJsonCandidate(result)
    if (parsed) {
      const parsedCards = Array.isArray(parsed.cards) ? parsed.cards : []

      // 카드별 해석이 비어있거나 너무 짧으면 기본 meaning 사용
      const card_insights = cards.map((card, i) => {
        const cardData = asRecord(parsedCards[i])
        let interpretation =
          typeof cardData.interpretation === 'string' ? cardData.interpretation : ''

        // 해석이 너무 짧거나 없으면 카드의 기본 meaning 사용
        if (!interpretation || interpretation.length < 50) {
          interpretation = isKorean && card.meaningKo ? card.meaningKo : card.meaning || ''
        }

        return {
          position: card.position,
          card_name: card.name,
          is_reversed: card.isReversed,
          interpretation,
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
          (isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.'),
        affirmation: isKorean ? '오늘 하루도 나답게 가면 돼요.' : 'Just be yourself today.',
        combinations:
          Array.isArray(parsed.combinations) && parsed.combinations.length > 0
            ? parsed.combinations
            : buildLocalCombinationHints(cards, language),
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
      card_insights: cards.map((card) => ({
        position: card.position,
        card_name: card.name,
        is_reversed: card.isReversed,
        interpretation: '',
        spirit_animal: null,
        chakra: null,
        element: null,
        shadow: null,
      })),
      guidance: isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.',
      affirmation: isKorean ? '오늘도 화이팅!' : 'You got this!',
      combinations: buildLocalCombinationHints(cards, language),
      followup_questions: [],
      fallback: false,
    }
  } catch (error) {
    logger.error('GPT interpretation failed:', error)
    return generateSimpleFallback(cards, spreadTitle, language, userQuestion)
  }
}

function buildLocalCombinationHints(cards: CardInput[], language: string, limit = 6) {
  const isKorean = language === 'ko'
  const hints: Array<{ title: string; summary: string }> = []

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
        title: `${nameA} + ${nameB}`,
        summary,
      })

      if (hints.length >= limit) {
        return hints
      }
    }
  }

  return hints
}

// 간단한 fallback (GPT도 실패한 경우)
function generateSimpleFallback(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  _userQuestion?: string
) {
  const isKorean = language === 'ko'

  return {
    overall_message: isKorean
      ? `${cards.map((c) => c.nameKo || c.name).join(', ')} 카드가 나왔습니다.`
      : `You drew: ${cards.map((c) => c.name).join(', ')}.`,
    card_insights: cards.map((card) => ({
      position: card.position,
      card_name: card.name,
      is_reversed: card.isReversed,
      interpretation: isKorean && card.meaningKo ? card.meaningKo : card.meaning || '',
      spirit_animal: null,
      chakra: null,
      element: null,
      shadow: null,
    })),
    guidance: isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.',
    affirmation: isKorean ? '오늘도 화이팅!' : 'You got this!',
    combinations: buildLocalCombinationHints(cards, language),
    followup_questions: [],
    fallback: true,
  }
}
