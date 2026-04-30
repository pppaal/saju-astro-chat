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
import { buildQuestionContextPrompt } from '@/lib/Tarot/questionFlow'
import { recordCounter, recordTiming } from '@/lib/metrics'
import {
  type CardInput,
  asRecord,
  buildActionableGuidance,
  buildAnchoredCardInsights,
  buildEmergencyFallbackResult,
  buildMinimumInsight,
  contextForPrompt,
  enforceInterpretationQuality,
  ensureActionAndTimeAnchor,
  ensureCardAnchoring,
  generateSimpleFallback,
  normalizeCombinations,
  normalizeInterpretRequestBody,
  normalizeQuestionContext,
  parseStructuredContextFromString,
  tryParseJsonCandidate,
} from './routeSupport'

const MAX_CARD_MEANING_LENGTH = 500
const OPENAI_TIMEOUT_MS = 40000
const OPENAI_MAX_RETRIES = 1
const LARGE_SPREAD_THRESHOLD = 8
const LARGE_SPREAD_BACKEND_TIMEOUT_MS = 12000
const LARGE_SPREAD_GPT_TIMEOUT_MS = 16000
const LARGE_SPREAD_GPT_MAX_TOKENS = 1600

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

      // ======== DB 저장 (사용자 인증 시) ========
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

// GPT-4o-mini API 호출 함수 (저비용 모델)
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

// GPT로 통합형 타로 해석 (전체 메시지 + 카드별 + 조언) — 백엔드 RAG 실패 시 폴백
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

  // 카드 정보 정리
  const cardListText = cards
    .map((c, i) => {
      const name = isKorean && c.nameKo ? c.nameKo : c.name
      const pos = isKorean && c.positionKo ? c.positionKo : c.position
      const keywords = (isKorean && c.keywordsKo ? c.keywordsKo : c.keywords) || []
      return `${i + 1}. [${pos}] ${name}${c.isReversed ? '(역방향)' : ''} - ${keywords.slice(0, 3).join(', ')}`
    })
    .join('\n')

  let q = userQuestion || (isKorean ? '일반 상담' : 'general reading')
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
  "overall": "오프닝 + 시너지 (${budget.overallGuide})",
  "advice": "실행 지침 (150-230자)"
}`
    : `{
  "overall": "오프닝 + 시너지 (${budget.overallGuide})",
  "cards": [
${cardExamples}
  ],
  "synergy": "세 카드가 함께 말하는 한 줄 (60-120자)",
  "advice": "실행 지침 (${budget.adviceGuide})"
}`

  const outputSchemaEn = isLargeSpread
    ? `{
  "overall": "Opening + synergy (${budget.overallGuide})",
  "advice": "Practical action steps (80-130 words)"
}`
    : `{
  "overall": "Opening + synergy (${budget.overallGuide})",
  "cards": [
${cardExamples}
  ],
  "synergy": "One-line on what the cards say together (40-80 words)",
  "advice": "Practical action steps (${budget.adviceGuide})"
}`

  // 통합 프롬프트 — 전문 리더 페르소나 + 4단계 메서드
  const unifiedPrompt = isKorean
    ? `당신은 15년차 한국인 타로 리더입니다. 길에서 만난 친구처럼 따뜻하고, 사촌언니처럼 직설적이며, 구체적인 행동까지 짚어줍니다.

# 페르소나
- 사전식 정의("연인은 선택을 의미합니다")는 절대 쓰지 않습니다. 학습된 일반론 금지.
- 카드를 *질문의 상황 안*에서 다시 봅니다. 예: 컵 2가 "사랑"이면, "그 사람이 나를 좋아하나"라는 질문에선 "이미 시선이 마주친 끌림"으로 구체화.
- 정/역방향, 위치, 카드끼리의 관계를 **이야기로** 엮습니다.
- 절대 운명론 금지. 가능성과 변수, 사용자가 움직일 여지를 함께 보여줍니다.
- 톤: 차분, 따뜻, 신뢰감. 과장이나 점쟁이톤("당신은 반드시…") 금지.

# 입력 정보
## 스프레드: ${spreadTitle}
## 사용자 질문: "${q}"

## 뽑힌 카드
${cardListText}

# 4단계 메서드 (반드시 이 순서로 사고)

## 1) 오프닝 (overall 앞 1-2문장)
카드를 펼친 첫 인상을 사용자 질문에 묶어 말합니다.
좋은 예: "그 사람 마음을 묻는 자리에 컵 2와 별이 같이 떠올랐네요. 끌림은 분명히 있는데 표현이 늦은 흐름이에요."
나쁜 예: "오늘 카드는 흥미롭습니다." (일반론)

## 2) 카드별 해석 (cards[].interpretation)
각 카드를 **위치 × 카드 × 정/역 × 질문 4중 cross**로 해석:
- 위치 의미 (예: "상대 마음" = 표면 행동이 아닌 속의 흐름)
- 카드의 핵심 (정의가 아니라 *이 질문에서의 의미*)
- 정/역 톤 (역방향 = 막힘/지연/내면화/미숙함)
- 질문 맥락 (주체·대상·상황) 한 번 이상
- 마무리에 시간 앵커 (오늘/이번 주/14일 안)
${
  isLargeSpread
    ? ''
    : '- 사전식 정의 금지. 카드 이름을 직접 인용하기보다 *그 카드가 이 자리에서 말하는 것*을 풀어쓰세요.'
}

## 3) 시너지 (synergy 필드 ${isLargeSpread ? '— 대형 스프레드는 overall 안에 포함' : ''})
세 카드가 *함께* 말하는 한 줄. 카드들 사이의 관계(보완·충돌·전개)를 봅니다.
좋은 예: "끌림(컵 2)과 망설임(컵 기사 역)이 별의 가능성을 만나면, 결과는 닫힌 게 아니라 그 사람의 신호 해석이 늦은 거예요."
나쁜 예: "세 카드 모두 긍정적입니다." (요약식)

## 4) 클로징 (advice)
구체 행동 1-3개. 두루뭉술 금지.
좋은 예: "이번 주 안에 가벼운 안부 한 번. 답이 늦어도 재촉하지 말고, 그 사람의 평일 저녁 톤을 보세요."
나쁜 예: "마음을 열고 기다리세요." (추상)

# 작성 규칙
- 출력은 오직 JSON.
- ${
        isLargeSpread
          ? '대형 스프레드이므로 cards 배열은 출력하지 말고, overall에 오프닝+카드 흐름+시너지를 모두 녹여서 작성하고, advice는 3단계로 구체화.'
          : `반드시 ${cards.length}개 카드 해석을 모두 포함하고, 그 외에 synergy 한 줄과 advice를 작성.`
      }
- 사용자 질문이 모호하면 가장 가능성 높은 의도로 해석하고 그 전제를 첫 문장에 한 번 명시.
- 같은 문장 골격을 반복하지 마세요 (카드별로 다른 문장 형태).

# 출력 형식 (JSON)
${outputSchemaKo}`
    : `You are a 15-year veteran tarot reader. Warm like a friend, direct like an older sister, concrete with action.

# Persona
- Never use dictionary-style definitions ("The Lovers means choice"). No textbook generalities.
- Always re-read the card *inside the user's specific situation*. E.g. "Two of Cups in 'does she like me?' question = an attraction where eyes have already met."
- Weave the cards into a *story*: orientation, position, and how they speak to each other.
- No fatalism. Show possibilities, variables, and what the user can move.
- Tone: calm, warm, trustworthy. No fortune-teller theatrics ("you must…").

# Input
## Spread: ${spreadTitle}
## User Question: "${q}"

## Cards Drawn
${cardListText}

# 4-Step Method (think in this order)

## 1) Opening (first 1-2 sentences of overall)
First impression of the spread, anchored to the user's question.
Good: "On 'does he like me?', Two of Cups and the Star landed together — there is real attraction, but the expression of it is running late."
Bad: "Today's cards are interesting." (generic)

## 2) Per-card (cards[].interpretation)
Cross **position × card × upright/reversed × question** four ways:
- Position meaning (e.g., "their feelings" = the inner current, not surface behavior)
- Card's core (not a definition — what *this card means in this question*)
- Upright/reversed tone (reversed = blockage / delay / internalization / immaturity)
- Question context (subject/object/situation) at least once
- End with a time anchor (today / this week / within 14 days)
${
  isLargeSpread
    ? ''
    : '- No definitions. Rather than name-dropping the card, unpack *what it says in this seat*.'
}

## 3) Synergy (synergy field${isLargeSpread ? ' — for large spreads, fold into overall' : ''})
One line on what the cards say *together*. Look at the relationships (complement / clash / progression).
Good: "Attraction (Two of Cups) and hesitation (Knight of Cups reversed) meeting the Star's possibility = the answer is not closed; his timing of reading signals is just slow."
Bad: "All three cards are positive." (summary)

## 4) Closing (advice)
1-3 concrete actions. No fluff.
Good: "Send a light hello within the week. If the reply is slow, do not push; observe his weekday-evening tone instead."
Bad: "Open your heart and wait." (abstract)

# Rules
- Output JSON only.
- ${
        isLargeSpread
          ? 'Large spread: do not output cards array. Fold opening + card flow + synergy into overall, and write 3 concrete advice steps.'
          : `Include all ${cards.length} per-card interpretations, plus a synergy line and advice.`
      }
- If the question is ambiguous, pick the most likely intent and state that assumption in the first sentence.
- Vary sentence shape across cards — do not reuse the same sentence skeleton.

# Output Format (JSON)
${outputSchemaEn}`

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

            // 해석이 너무 짧으면 스프레드/위치/방향 정보 기반 최소 보장 텍스트로 보강
            if (!interpretation || interpretation.length < 80) {
              interpretation = ensureCardAnchoring(
                language,
                card,
                buildMinimumInsight(language, card, userQuestion),
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

      // synergy 필드가 있으면 overall에 한 단락으로 합쳐 보냄
      const overallText = typeof parsed.overall === 'string' ? parsed.overall : ''
      const synergyText = typeof parsed.synergy === 'string' ? parsed.synergy.trim() : ''
      const mergedOverall =
        overallText && synergyText
          ? `${overallText}\n\n${isKorean ? '함께 보면, ' : 'Read together, '}${synergyText}`
          : overallText || synergyText

      return {
        overall_message: mergedOverall,
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

    // JSON 파싱 실패 시 원본 텍스트로 overall 폴백
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
