// src/app/api/tarot/interpret/stream/route.ts
// Streaming Tarot Interpretation API - Real-time SSE for first interpretation

import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createPublicStreamGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { createSSEStreamProxy } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { logger } from '@/lib/logger'
import { TarotInterpretSchema } from '@/lib/api/validator'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import {
  buildQuestionContextPrompt,
  type TarotQuestionAnalysisSnapshot,
} from '@/lib/Tarot/questionFlow'
import {
  applyCreditResultCookies,
  checkAndConsumeCredits,
  creditErrorResponse,
} from '@/lib/credits/withCredits'

function buildCardContextMeaning(input: {
  name: string
  position?: string
  isReversed?: boolean
  language: 'ko' | 'en'
  keywords?: string[]
}): string {
  const { name, position, isReversed, language, keywords } = input
  const trimmedKeywords = Array.isArray(keywords)
    ? keywords
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3)
    : []
  const orientation = isReversed
    ? language === 'ko'
      ? '역방향'
      : 'reversed'
    : language === 'ko'
      ? '정방향'
      : 'upright'
  const pos = position?.trim() || (language === 'ko' ? '현재 포지션' : 'current position')
  const keywordText =
    trimmedKeywords.length > 0
      ? language === 'ko'
        ? `키워드: ${trimmedKeywords.join(', ')}. `
        : `Keywords: ${trimmedKeywords.join(', ')}. `
      : ''

  if (language === 'ko') {
    return `${pos}의 ${name}(${orientation}) 카드 맥락입니다. ${keywordText}질문에 직접 연결해 해석하세요.`
  }
  return `${name} (${orientation}) in ${pos}. ${keywordText}Interpret it directly for the user's question.`
}

function withCreditCookies(
  response: Response,
  creditResult: Awaited<ReturnType<typeof checkAndConsumeCredits>> | null
): Response {
  if (!creditResult?.guestReadingAccess) {
    return response
  }

  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  })

  return applyCreditResultCookies(nextResponse, creditResult)
}

function normalizeQuestionContext(value: unknown): TarotQuestionAnalysisSnapshot | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined
  }
  return value as TarotQuestionAnalysisSnapshot
}

function normalizeContextText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || undefined
  }
  if (value && typeof value === 'object') {
    const serialized = JSON.stringify(value)
    return serialized === '{}' ? undefined : serialized
  }
  return undefined
}

function extractPreviousReadings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 3)
}

function buildOneShotSSEPayload(payload: unknown): Response {
  const encoder = new TextEncoder()
  const jsonText = JSON.stringify(payload)
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: jsonText })}\n\n`))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const body = await req.json().catch(() => null)
    if (!body) {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
        locale: extractLocale(req),
        route: 'tarot/interpret/stream',
      })
    }

    const parsed = TarotInterpretSchema.safeParse(body)
    if (!parsed.success) {
      return createValidationErrorResponse(parsed.error, {
        locale: extractLocale(req),
        route: 'tarot/interpret/stream',
      })
    }

    const creditResult = await checkAndConsumeCredits('reading', 1, req)
    if (!creditResult.allowed) {
      return creditErrorResponse(creditResult)
    }

    const { category, spreadId, spreadTitle, cards, userQuestion, language, birthDate } =
      parsed.data

    // Extract optional counselor fields (not in schema yet)
    const counselorId = typeof body.counselorId === 'string' ? body.counselorId : undefined
    const counselorStyle = typeof body.counselorStyle === 'string' ? body.counselorStyle : undefined
    const questionContext = normalizeQuestionContext(
      (body as { questionContext?: unknown }).questionContext
    )
    const birthdate =
      typeof (body as { birthdate?: unknown }).birthdate === 'string'
        ? ((body as { birthdate?: string }).birthdate ?? '').trim()
        : birthDate
    const sajuContext = normalizeContextText((body as { sajuContext?: unknown }).sajuContext)
    const astroContext = normalizeContextText((body as { astroContext?: unknown }).astroContext)
    const previousReadings = extractPreviousReadings(
      (body as { previousReadings?: unknown }).previousReadings
    )

    const latestQuestionBase = buildQuestionContextPrompt(
      userQuestion || 'general reading',
      questionContext,
      language === 'en' ? 'en' : 'ko'
    )
    const latestQuestion =
      previousReadings.length > 0
        ? `${latestQuestionBase}\n\n[Previous readings]\n${previousReadings.join('\n')}`
        : latestQuestionBase

    const shouldUseHybridInterpret =
      Boolean(questionContext) ||
      Boolean(birthdate) ||
      Boolean(sajuContext) ||
      Boolean(astroContext)

    const contextLanguage: 'ko' | 'en' = language === 'en' ? 'en' : 'ko'
    const rawCards = Array.isArray((body as { cards?: unknown[] }).cards)
      ? ((body as { cards?: unknown[] }).cards as Array<Record<string, unknown>>)
      : []
    if (shouldUseHybridInterpret) {
      const interpretResult = await apiClient.post(
        '/api/tarot/interpret',
        {
          category,
          spread_id: spreadId,
          spread_title: spreadTitle || `${category} spread`,
          cards: cards.map((c) => ({
            name: c.name,
            is_reversed: c.isReversed,
            position: c.position || '',
          })),
          user_question: latestQuestion,
          language,
          birthdate: birthdate || undefined,
          saju_context: sajuContext,
          astro_context: astroContext,
        },
        { timeout: 60000, retries: 1, retryDelay: 1200 }
      )

      if (!interpretResult.ok) {
        logger.error('[TarotInterpretStream] Hybrid backend error:', {
          status: interpretResult.status,
          error: interpretResult.error,
        })
        return withCreditCookies(
          createErrorResponse({
            code: ErrorCodes.BACKEND_ERROR,
            message: interpretResult.error || 'Backend service error',
            locale: extractLocale(req),
            route: 'tarot/interpret/stream',
          }),
          creditResult
        )
      }

      return withCreditCookies(buildOneShotSSEPayload(interpretResult.data), creditResult)
    }

    const streamResult = await apiClient.postSSEStream(
      '/api/tarot/chat-stream',
      {
        messages: [{ role: 'user', content: latestQuestion }],
        context: {
          category,
          spread_title: spreadTitle || `${category} spread`,
          cards: cards.map((c, index) => {
            const rawKeywords = Array.isArray(rawCards[index]?.keywords)
              ? (rawCards[index]?.keywords as unknown[])
                  .filter((item) => typeof item === 'string')
                  .map((item) => String(item))
              : []
            return {
              // Keywords are optional in schema; hydrate from raw body if provided.
              keywords: rawKeywords,
              name: c.name,
              is_reversed: c.isReversed,
              position: c.position || '',
              meaning: buildCardContextMeaning({
                name: c.name,
                position: c.position,
                isReversed: c.isReversed,
                language: contextLanguage,
                keywords: rawKeywords,
              }),
            }
          }),
          overall_message: '',
          guidance: '',
        },
        language,
        counselor_id: counselorId,
        counselor_style: counselorStyle,
      },
      { timeout: 60000, retries: 1, retryDelay: 1200 }
    )

    if (!streamResult.ok) {
      logger.error('[TarotInterpretStream] Backend error:', {
        status: streamResult.status,
        error: streamResult.error,
      })
      return withCreditCookies(
        createErrorResponse({
          code: ErrorCodes.BACKEND_ERROR,
          message: streamResult.error || 'Backend service error',
          locale: extractLocale(req),
          route: 'tarot/interpret/stream',
        }),
        creditResult
      )
    }

    // Relay the SSE stream
    return withCreditCookies(
      createSSEStreamProxy({ source: streamResult.response, route: 'TarotInterpretStream' }),
      creditResult
    )
  },
  createPublicStreamGuard({
    route: 'tarot-interpret-stream',
    limit: 10,
    windowSeconds: 60,
  })
)
