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
    ? keywords.map((item) => item.trim()).filter(Boolean).slice(0, 3)
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

    const { category, spreadTitle, cards, userQuestion, language } = parsed.data

    // Extract optional counselor fields (not in schema yet)
    const counselorId = typeof body.counselorId === 'string' ? body.counselorId : undefined
    const counselorStyle = typeof body.counselorStyle === 'string' ? body.counselorStyle : undefined

    // Call backend chat-stream endpoint (tarot interpret-stream is not exposed)
    const latestQuestion = userQuestion || 'general reading'

    const contextLanguage: 'ko' | 'en' = language === 'en' ? 'en' : 'ko'
    const rawCards = Array.isArray((body as { cards?: unknown[] }).cards)
      ? ((body as { cards?: unknown[] }).cards as Array<Record<string, unknown>>)
      : []
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
