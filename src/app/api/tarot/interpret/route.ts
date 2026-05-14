// src/app/api/tarot/interpret/route.ts
// Premium Tarot Interpretation API — Claude Haiku 4.5 with prompt caching, GPT fallback.

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { captureServerError } from '@/lib/telemetry'
import { enforceBodySize, fetchWithRetry } from '@/lib/http'
import {
  applyCreditResultCookies,
  checkAndConsumeCredits,
  creditErrorResponse,
} from '@/lib/credits/withCredits'
import { refundCredits } from '@/lib/credits/creditRefund'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { tarotInterpretRequestSchema } from '@/lib/api/zodValidation'
import { buildQuestionContextPrompt } from '@/lib/tarot/questionFlow'
import { recordCounter, recordTiming } from '@/lib/metrics'
import { callClaude as callSharedClaude, isClaudeAvailable } from '@/lib/llm/claude'
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

export const POST = withApiMiddleware(
  async (req: NextRequest, context) => {
    let fallbackCards: CardInput[] = []
    let fallbackLanguage = 'ko'
    let fallbackQuestion: string | undefined
    let creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null = null
    const startedAt = Date.now()
    let interpretationSource: 'gpt_fallback' | 'emergency_fallback' = 'gpt_fallback'

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
        includeAstrology = true,
        includeSaju = true,
        sajuContext,
        astroContext,
        questionContext,
        questionMeta,
      } = validationResult.data

      fallbackCards = validatedCards
      fallbackLanguage = language
      const normalizedQuestionContext = normalizeQuestionContext(questionContext)
      // questionMeta가 있으면 profile 필드(type/subject/focus/timeframe/tone)는
      // 프롬프트의 "사전 분석" 블록에서 이미 다루므로 중복 제거 — summary/direct_answer만 남김.
      const contextForEnrichment =
        questionMeta && normalizedQuestionContext
          ? {
              question_summary: normalizedQuestionContext.question_summary,
              direct_answer: normalizedQuestionContext.direct_answer,
            }
          : normalizedQuestionContext
      const enrichedUserQuestion = buildQuestionContextPrompt(
        userQuestion || '',
        contextForEnrichment,
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

      // Python backend 제거 — Claude 직접 호출 (옛 backend RAG 흐름 폐기)
      const isLargeSpread = validatedCards.length >= LARGE_SPREAD_THRESHOLD
      if (isLargeSpread) {
        logger.info('[Tarot interpret] large spread detected', {
          spreadId,
          cardCount: validatedCards.length,
        })
      }

      let result
      {
        try {
          result = await generateGPTInterpretation(
            validatedCards,
            spreadTitle,
            language,
            enrichedUserQuestion,
            promptSajuContext,
            promptAstroContext,
            questionMeta
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

      // Refund credit when we fell all the way back to emergency text
      // (user gets degraded output, shouldn't be charged)
      if (interpretationSource === 'emergency_fallback' && creditResult?.userId) {
        await refundCredits({
          userId: creditResult.userId,
          creditType: 'reading',
          amount: 1,
          reason: 'tarot_emergency_fallback',
          apiRoute: '/api/tarot/interpret',
          errorMessage: 'AI providers failed; emergency fallback served',
        }).catch((refundErr) => {
          logger.warn('[Tarot interpret] refund failed (non-fatal):', refundErr)
        })
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

      // Refund credit on hard error path (user got degraded output)
      if (creditResult?.userId) {
        await refundCredits({
          userId: creditResult.userId,
          creditType: 'reading',
          amount: 1,
          reason: 'tarot_route_error',
          apiRoute: '/api/tarot/interpret',
          errorMessage: err instanceof Error ? err.message : String(err),
        }).catch((refundErr) => {
          logger.warn('[Tarot interpret] refund failed (non-fatal):', refundErr)
        })
      }

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

// 공유 Claude helper로 위임 (src/lib/llm/claude.ts)
async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 1500,
  timeoutMs = OPENAI_TIMEOUT_MS
): Promise<string> {
  const result = await callSharedClaude({
    systemPrompt,
    userPrompt,
    maxTokens,
    temperature: 0.7,
    timeoutMs,
    label: 'tarot-interpret',
  })
  return result.text
}

// GPT-4o-mini fallback (Claude 실패 시)
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
  // Large spread (8+장): 2 chunks 병렬 — 각 chunk가 일부 카드만 담당하므로
  // 6-7장 single-call 과 비슷한 per-card 분량을 유지한다.
  if (cardCount >= LARGE_SPREAD_THRESHOLD) {
    return isKorean
      ? {
          overallGuide: '320-480자',
          perCardGuide: '140-220자',
          adviceGuide: '140-200자',
          maxTokens: 2400,
          timeoutMs: 40000,
        }
      : {
          overallGuide: '180-260 words',
          perCardGuide: '80-130 words',
          adviceGuide: '90-130 words',
          maxTokens: 2400,
          timeoutMs: 40000,
        }
  }

  // 6-7장: 중대형
  if (cardCount >= 6) {
    return isKorean
      ? {
          overallGuide: '320-480자',
          perCardGuide: '160-240자',
          adviceGuide: '140-200자',
          maxTokens: 2400,
          timeoutMs: 50000,
        }
      : {
          overallGuide: '180-260 words',
          perCardGuide: '80-130 words',
          adviceGuide: '90-130 words',
          maxTokens: 2400,
          timeoutMs: 50000,
        }
  }

  // 4-5장: 중간
  if (cardCount >= 4) {
    return isKorean
      ? {
          overallGuide: '280-450자',
          perCardGuide: '180-260자',
          adviceGuide: '140-200자',
          maxTokens: 2000,
          timeoutMs: 40000,
        }
      : {
          overallGuide: '160-240 words',
          perCardGuide: '90-130 words',
          adviceGuide: '90-130 words',
          maxTokens: 2000,
          timeoutMs: 40000,
        }
  }

  // 2-3장: 소형
  if (cardCount >= 2) {
    return isKorean
      ? {
          overallGuide: '200-350자',
          perCardGuide: '180-280자',
          adviceGuide: '120-180자',
          maxTokens: 1400,
          timeoutMs: 30000,
        }
      : {
          overallGuide: '120-200 words',
          perCardGuide: '90-150 words',
          adviceGuide: '80-120 words',
          maxTokens: 1400,
          timeoutMs: 30000,
        }
  }

  // 1장 (daily reading): 가장 작음 — 시너지 단계 없음
  return isKorean
    ? {
        overallGuide: '120-200자',
        perCardGuide: '180-300자',
        adviceGuide: '100-160자',
        maxTokens: 700,
        timeoutMs: 25000,
      }
    : {
        overallGuide: '70-120 words',
        perCardGuide: '90-160 words',
        adviceGuide: '60-100 words',
        maxTokens: 700,
        timeoutMs: 25000,
      }
}

function truncatePromptContext(input: string | undefined, maxLength = 1200): string {
  if (!input) return ''
  const normalized = input.trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength)}\n...[truncated]`
}

type QuestionMetaShape = {
  intent?: string
  subject?: string
  focus?: string
  timeframe?: string
  tone?: string
  questionType?: string
}

// LLM 통합형 타로 해석 — Claude 우선, GPT fallback.
// 8장 미만: 단일 호출.  8장 이상: 카드를 절반으로 나눠 2회 병렬 호출 (양쪽 모두 전체
// 카드 리스트를 컨텍스트로 받아 일관성 유지) 후 card_insights 를 머지.
async function generateGPTInterpretation(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  userQuestion?: string,
  sajuContext?: string,
  astroContext?: string,
  questionMeta?: QuestionMetaShape
) {
  const isKorean = language === 'ko'
  const isLargeSpread = cards.length >= LARGE_SPREAD_THRESHOLD
  const budget = getPromptBudget(cards.length, isKorean)

  // 전체 카드 정보 (양 chunk 모두 컨텍스트로 받음).
  // 자리 의미(positionMeaning)가 있으면 함께 보내 LLM 이 추측 대신 그 의미에 맞춰 매핑하도록.
  const cardListText = cards
    .map((c, i) => {
      const name = isKorean && c.nameKo ? c.nameKo : c.name
      const pos = isKorean && c.positionKo ? c.positionKo : c.position
      const posMeaning = isKorean
        ? c.positionMeaningKo || c.positionMeaning
        : c.positionMeaning
      const keywords = (isKorean && c.keywordsKo ? c.keywordsKo : c.keywords) || []
      const seat = posMeaning ? `${pos} — ${posMeaning}` : pos
      return `${i + 1}. [${seat}] ${name}${c.isReversed ? '(역방향)' : ''} - ${keywords.slice(0, 3).join(', ')}`
    })
    .join('\n')

  const q = userQuestion || (isKorean ? '일반 상담' : 'general reading')
  const compactSaju = truncatePromptContext(sajuContext)
  const compactAstro = truncatePromptContext(astroContext)
  const sajuBlock = compactSaju
    ? isKorean
      ? `\n## 사주 컨텍스트\n${compactSaju}`
      : `\n## Saju Context\n${compactSaju}`
    : ''
  const astroBlock = compactAstro
    ? isKorean
      ? `\n## 점성 컨텍스트\n${compactAstro}`
      : `\n## Astrology Context\n${compactAstro}`
    : ''
  const hasContext = Boolean(sajuBlock || astroBlock)

  // chunk 별 카드 예시 + JSON 스키마 빌더
  const buildChunkSchemas = (chunkStart: number, chunkEnd: number, includeMeta: boolean) => {
    const chunkCards = cards.slice(chunkStart, chunkEnd)
    const cardExamples = chunkCards
      .map((c, j) => {
        const i = chunkStart + j
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
      "interpretation": "${ordinal} 카드 해석 (${budget.perCardGuide})",
      "actionTip": "이 카드 + 이 자리 + 질문 맥락에 맞춘 실천 행동 1-2문장 (80-140자) — 시간 앵커 + 구체 행동 1개 이상"
    }`
          : `    {
      "position": "${pos}",
      "interpretation": "${ordinal} card interpretation (${budget.perCardGuide})",
      "actionTip": "Concrete action tied to this card+seat+question (50-90 words) — include a time anchor + one specific action"
    }`
      })
      .join(',\n')

    const schemaKo = includeMeta
      ? `{
  "overall": "오프닝 + 시너지 (${budget.overallGuide})",
  "cards": [
${cardExamples}
  ],
  "synergy": "카드들이 함께 말하는 한 줄 (60-120자)",
  "advice": "실행 지침 (${budget.adviceGuide})"
}`
      : `{
  "cards": [
${cardExamples}
  ]
}`
    const schemaEn = includeMeta
      ? `{
  "overall": "Opening + synergy (${budget.overallGuide})",
  "cards": [
${cardExamples}
  ],
  "synergy": "One-line on what the cards say together (40-80 words)",
  "advice": "Practical action steps (${budget.adviceGuide})"
}`
      : `{
  "cards": [
${cardExamples}
  ]
}`
    return { schemaKo, schemaEn }
  }

  // System 프롬프트 — 정적 (페르소나 + 4단계 메서드 + 출력 형식). 캐시 가능.
  const systemPrompt = isKorean
    ? `당신은 15년차 한국인 타로 리더입니다. 길에서 만난 친구처럼 따뜻하고, 사촌언니처럼 직설적이며, 구체적인 행동까지 짚어줍니다.

# 페르소나
- 사전식 정의("연인은 선택을 의미합니다")는 절대 쓰지 않습니다. 학습된 일반론 금지.
- 카드를 *질문의 상황 안*에서 다시 봅니다. 예: 컵 2가 "사랑"이면, "그 사람이 나를 좋아하나"라는 질문에선 "이미 시선이 마주친 끌림"으로 구체화.
- 정/역방향, 위치, 카드끼리의 관계를 **이야기로** 엮습니다.
- 절대 운명론 금지. 가능성과 변수, 사용자가 움직일 여지를 함께 보여줍니다.
- 톤: 차분, 따뜻, 신뢰감. 과장이나 점쟁이톤("당신은 반드시…") 금지.

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
- 사전식 정의 금지. 카드 이름을 직접 인용하기보다 *그 카드가 이 자리에서 말하는 것*을 풀어쓰세요.

## 3) 시너지 (synergy 필드)
카드들이 *함께* 말하는 한 줄. 카드들 사이의 관계(보완·충돌·전개)를 봅니다.
좋은 예: "끌림(컵 2)과 망설임(컵 기사 역)이 별의 가능성을 만나면, 결과는 닫힌 게 아니라 그 사람의 신호 해석이 늦은 거예요."
나쁜 예: "세 카드 모두 긍정적입니다." (요약식)

## 4) 클로징 (advice)
구체 행동 1-3개. 두루뭉술 금지.
좋은 예: "이번 주 안에 가벼운 안부 한 번. 답이 늦어도 재촉하지 말고, 그 사람의 평일 저녁 톤을 보세요."
나쁜 예: "마음을 열고 기다리세요." (추상)

# 작성 규칙
- 출력은 오직 JSON. 마크다운 코드펜스 금지.
- 사용자 질문이 모호하면 가장 가능성 높은 의도로 해석하고 그 전제를 첫 문장에 한 번 명시.
- 같은 문장 골격을 반복하지 마세요 (카드별로 다른 문장 형태).
- 출력 스키마가 cards[] 일부만 요구하면(예: 대형 스프레드의 일부 chunk), 요청된 카드의 해석만 출력하되 전체 흐름은 컨텍스트로 인지하고 일관성을 유지하세요.

# 입체 통합 규칙 (사주/점성 컨텍스트가 같이 들어왔을 때)
- "사주" 또는 "점성"으로 시작하는 컨텍스트가 입력에 보이면 cross-only 모드:
  - *모든 카드별 해석*에 카드 ↔ 사주 anchor 또는 카드 ↔ 점성 anchor를 1회 이상 묶어 쓰세요. 카드 단독 해석 금지.
  - 시너지(synergy) 단락은 "카드 흐름 ↔ 사주/점성" cross 한 줄로 시작.
  - overall_message 첫 문장에도 cross anchor 1개 포함 (예: "일간 X의 약한 시기에 컵 2가 떠올랐다는 건…").
- 사주/점성 정보가 없으면 이 규칙은 무시하고 카드만으로 해석.`
    : `You are a 15-year veteran tarot reader. Warm like a friend, direct like an older sister, concrete with action.

# Persona
- Never use dictionary-style definitions ("The Lovers means choice"). No textbook generalities.
- Always re-read the card *inside the user's specific situation*. E.g. "Two of Cups in 'does she like me?' question = an attraction where eyes have already met."
- Weave the cards into a *story*: orientation, position, and how they speak to each other.
- No fatalism. Show possibilities, variables, and what the user can move.
- Tone: calm, warm, trustworthy. No fortune-teller theatrics ("you must…").

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
- No definitions. Rather than name-dropping the card, unpack *what it says in this seat*.

## 3) Synergy (synergy field)
One line on what the cards say *together*. Look at the relationships (complement / clash / progression).
Good: "Attraction (Two of Cups) and hesitation (Knight of Cups reversed) meeting the Star's possibility = the answer is not closed; his timing of reading signals is just slow."
Bad: "All three cards are positive." (summary)

## 4) Closing (advice)
1-3 concrete actions. No fluff.
Good: "Send a light hello within the week. If the reply is slow, do not push; observe his weekday-evening tone instead."
Bad: "Open your heart and wait." (abstract)

# Rules
- Output JSON only. No markdown code fences.
- If the question is ambiguous, pick the most likely intent and state that assumption in the first sentence.
- Vary sentence shape across cards — do not reuse the same sentence skeleton.
- If the output schema requests only a subset of cards (e.g. one chunk of a large spread), output interpretations only for the requested cards, but stay aware of the full flow as context for consistency.

# Cross-Integration Rules (when saju / astrology context is supplied)
- When a "Saju" or "Astrology" context line is present, switch to cross-only mode:
  - *Every per-card interpretation* must tie the card to a saju or astrology anchor at least once. No standalone card readings.
  - The synergy line must open with "card flow ↔ saju/astrology" cross.
  - The first sentence of overall_message must include a cross anchor (e.g., "On the weak phase of Day Master X, the appearance of Two of Cups means…").
- If neither context is provided, ignore this rule and read cards alone.`

  // chunk 별 user 프롬프트 빌더
  const buildChunkUserPrompt = (
    chunkStart: number,
    chunkEnd: number,
    includeMeta: boolean
  ): string => {
    const { schemaKo, schemaEn } = buildChunkSchemas(chunkStart, chunkEnd, includeMeta)
    const isChunked = chunkStart > 0 || chunkEnd < cards.length
    const chunkInfoKo = isChunked
      ? `(전체 ${cards.length}장 중 ${chunkStart + 1}~${chunkEnd}번 카드만 해석)`
      : ''
    const chunkInfoEn = isChunked
      ? `(interpret only cards ${chunkStart + 1}-${chunkEnd} of ${cards.length})`
      : ''

    const taskKo = includeMeta
      ? isChunked
        ? `- 전체 카드 흐름을 보고 overall + synergy + advice를 작성하고, ${chunkInfoKo} 의 카드별 해석을 cards[] 에 채우세요.`
        : `- 반드시 ${cards.length}개 카드 해석을 모두 포함하고, synergy 한 줄과 advice를 작성.`
      : `- 전체 카드 흐름은 컨텍스트로만 참고. ${chunkInfoKo} 의 카드별 해석만 cards[] 에 채우세요. overall/synergy/advice는 출력하지 마세요.`
    const taskEn = includeMeta
      ? isChunked
        ? `- Read the full ${cards.length}-card flow; write overall + synergy + advice, and fill cards[] with per-card interpretations ${chunkInfoEn}.`
        : `- Include all ${cards.length} per-card interpretations, plus synergy and advice.`
      : `- Use the full ${cards.length}-card flow as context only. Output ONLY per-card interpretations ${chunkInfoEn} in cards[]. Do NOT include overall/synergy/advice.`

    return isKorean
      ? `# 입력
## 스프레드: ${spreadTitle}
## 사용자 질문: "${q}"${
          questionMeta
            ? `
## 사전 분석 (이미 추출됨 — 다시 추론하지 말고 그대로 사용)
- intent: ${questionMeta.intent || '-'}
- subject: ${questionMeta.subject || '-'} | focus: ${questionMeta.focus || '-'}
- timeframe: ${questionMeta.timeframe || '-'} | tone: ${questionMeta.tone || '-'}`
            : ''
        }${sajuBlock}${astroBlock}
## 뽑힌 카드 (전체)
${cardListText}

# 출력 지시
${taskKo}
- overall ${budget.overallGuide}, 카드별 ${budget.perCardGuide}, advice ${budget.adviceGuide}.${
          hasContext
            ? '\n- 사주/점성 컨텍스트가 입력됐으니 cross-only 모드: 모든 카드별 해석에 카드 ↔ 사주/점성 anchor 1회 이상, synergy/overall 첫 문장도 cross로 시작.'
            : ''
        }

# 출력 형식 (JSON)
${schemaKo}`
      : `# Input
## Spread: ${spreadTitle}
## User Question: "${q}"${
          questionMeta
            ? `
## Pre-analyzed (already extracted — do NOT re-infer, use as-is)
- intent: ${questionMeta.intent || '-'}
- subject: ${questionMeta.subject || '-'} | focus: ${questionMeta.focus || '-'}
- timeframe: ${questionMeta.timeframe || '-'} | tone: ${questionMeta.tone || '-'}`
            : ''
        }${sajuBlock}${astroBlock}
## Cards Drawn (full)
${cardListText}

# Output instructions
${taskEn}
- Length: overall ${budget.overallGuide}, per-card ${budget.perCardGuide}, advice ${budget.adviceGuide}.${
          hasContext
            ? '\n- Saju/Astrology context provided: enter cross-only mode. Each card interpretation must anchor to saju OR astro at least once. Synergy and opening lines must start with a cross.'
            : ''
        }

# Output Format (JSON)
${schemaEn}`
  }

  // Claude 우선 → GPT fallback. chunk 1건씩 호출.
  const useClaude = isClaudeAvailable()
  const runChunkCall = async (
    chunkStart: number,
    chunkEnd: number,
    includeMeta: boolean
  ): Promise<{ raw: string; parsed: Record<string, unknown> | null }> => {
    const userPrompt = buildChunkUserPrompt(chunkStart, chunkEnd, includeMeta)
    let raw: string
    if (useClaude) {
      try {
        raw = await callClaude(systemPrompt, userPrompt, budget.maxTokens, budget.timeoutMs)
      } catch (claudeErr) {
        logger.warn('[Tarot interpret] Claude failed, falling back to GPT', {
          error: claudeErr instanceof Error ? claudeErr.message : String(claudeErr),
          chunk: `${chunkStart}-${chunkEnd}`,
        })
        recordCounter('tarot.interpret.fallback_total', 1, { from: 'claude', to: 'gpt' })
        raw = await callGPT(
          `${systemPrompt}\n\n${userPrompt}`,
          budget.maxTokens,
          budget.timeoutMs
        )
      }
    } else {
      raw = await callGPT(`${systemPrompt}\n\n${userPrompt}`, budget.maxTokens, budget.timeoutMs)
    }
    return { raw, parsed: tryParseJsonCandidate(raw) }
  }

  // 파싱된 cards[] 를 우리 CardInsight 구조로 변환 (앵커링 + 시간/행동 보강)
  const assembleChunkInsights = (
    parsedCardsArr: unknown,
    chunkStart: number,
    chunkEnd: number
  ) => {
    const parsedCards = Array.isArray(parsedCardsArr) ? parsedCardsArr : []
    return cards.slice(chunkStart, chunkEnd).map((card, j) => {
      const cardData = asRecord(parsedCards[j])
      let interpretation =
        typeof cardData.interpretation === 'string' ? cardData.interpretation : ''
      if (!interpretation || interpretation.length < 80) {
        interpretation = ensureCardAnchoring(
          language,
          card,
          buildMinimumInsight(language, card, userQuestion),
          userQuestion
        )
      }
      const anchored = ensureActionAndTimeAnchor(
        language,
        ensureCardAnchoring(language, card, interpretation, userQuestion)
      )
      const actionTipRaw =
        typeof cardData.actionTip === 'string' ? cardData.actionTip.trim() : ''
      return {
        position: card.position,
        card_name: card.name,
        is_reversed: card.isReversed,
        interpretation: anchored,
        action_tip: actionTipRaw || undefined,
        spirit_animal: null,
        chakra: null,
        element: null,
        shadow: null,
      }
    })
  }

  const mergeOverallWithSynergy = (overall: string, synergy: string) =>
    overall && synergy
      ? `${overall}\n\n${isKorean ? '함께 보면, ' : 'Read together, '}${synergy}`
      : overall || synergy

  const textFallback = (raw: string) => {
    logger.warn('[Tarot interpret] LLM returned non-JSON; using text fallback payload', {
      preview: raw.slice(0, 280),
    })
    return {
      overall_message: raw,
      card_insights: buildAnchoredCardInsights(cards, language, userQuestion),
      guidance: isKorean ? '카드의 메시지에 귀 기울여보세요.' : 'Listen to the cards.',
      affirmation: isKorean ? '오늘도 화이팅!' : 'You got this!',
      combinations: normalizeCombinations(undefined, cards, language),
      followup_questions: [],
      fallback: false,
    }
  }

  try {
    if (!isLargeSpread) {
      // 단일 호출
      const { raw, parsed } = await runChunkCall(0, cards.length, true)
      if (!parsed) return textFallback(raw)

      const overall = typeof parsed.overall === 'string' ? parsed.overall : ''
      const synergy = typeof parsed.synergy === 'string' ? parsed.synergy.trim() : ''
      return {
        overall_message: mergeOverallWithSynergy(overall, synergy),
        card_insights: assembleChunkInsights(parsed.cards, 0, cards.length),
        guidance:
          (typeof parsed.advice === 'string' && parsed.advice) ||
          buildActionableGuidance(language, userQuestion),
        affirmation: isKorean ? '오늘 하루도 나답게 가면 돼요.' : 'Just be yourself today.',
        combinations: normalizeCombinations(parsed.combinations, cards, language),
        followup_questions: [],
        fallback: false,
      }
    }

    // 8장 이상: 두 chunk 병렬 호출
    const mid = Math.ceil(cards.length / 2)
    logger.info('[Tarot interpret] large spread parallel call', {
      cardCount: cards.length,
      chunkA: `0-${mid}`,
      chunkB: `${mid}-${cards.length}`,
    })
    const [chunkA, chunkB] = await Promise.all([
      runChunkCall(0, mid, true),
      runChunkCall(mid, cards.length, false),
    ])

    if (!chunkA.parsed) return textFallback(chunkA.raw)

    const overall = typeof chunkA.parsed.overall === 'string' ? chunkA.parsed.overall : ''
    const synergy =
      typeof chunkA.parsed.synergy === 'string' ? chunkA.parsed.synergy.trim() : ''
    const insightsA = assembleChunkInsights(chunkA.parsed.cards, 0, mid)
    // chunk B 가 파싱 실패하면 후반 카드들은 정적 앵커 fallback
    const insightsB = chunkB.parsed
      ? assembleChunkInsights(chunkB.parsed.cards, mid, cards.length)
      : buildAnchoredCardInsights(cards.slice(mid), language, userQuestion)
    if (!chunkB.parsed) {
      logger.warn('[Tarot interpret] chunk B parse failed; using anchored fallback for tail', {
        cardCount: cards.length,
      })
    }

    return {
      overall_message: mergeOverallWithSynergy(overall, synergy),
      card_insights: [...insightsA, ...insightsB],
      guidance:
        (typeof chunkA.parsed.advice === 'string' && chunkA.parsed.advice) ||
        buildActionableGuidance(language, userQuestion),
      affirmation: isKorean ? '오늘 하루도 나답게 가면 돼요.' : 'Just be yourself today.',
      combinations: normalizeCombinations(chunkA.parsed.combinations, cards, language),
      followup_questions: [],
      fallback: false,
    }
  } catch (error) {
    logger.error('Tarot interpretation failed:', error)
    return generateSimpleFallback(cards, spreadTitle, language, userQuestion)
  }
}
