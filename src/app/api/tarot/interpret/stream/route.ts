// src/app/api/tarot/interpret/stream/route.ts
// Streaming Tarot Interpretation API - Real-time SSE for first interpretation

import { NextRequest } from 'next/server'
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

    const { category, spreadTitle, cards, userQuestion, language } = parsed.data

    // Extract optional counselor fields (not in schema yet)
    const counselorId = typeof body.counselorId === 'string' ? body.counselorId : undefined
    const counselorStyle = typeof body.counselorStyle === 'string' ? body.counselorStyle : undefined

    // Call backend chat-stream endpoint (tarot interpret-stream is not exposed)
    const latestQuestion = userQuestion || 'general reading'

    const streamResult = await apiClient.postSSEStream(
      '/api/tarot/chat-stream',
      {
        messages: [{ role: 'user', content: latestQuestion }],
        context: {
          category,
          spread_title: spreadTitle || `${category} spread`,
          cards: cards.map((c) => ({
            name: c.name,
            is_reversed: c.isReversed,
            position: c.position || '',
            meaning: `Key message from ${c.name}`,
          })),
          overall_message: '',
          guidance: '',
        },
        language,
        counselor_id: counselorId,
        counselor_style: counselorStyle,
      },
      { timeout: 20000 }
    )

    if (!streamResult.ok) {
      logger.error('[TarotInterpretStream] Backend error:', {
        status: streamResult.status,
        error: streamResult.error,
      })
      return createErrorResponse({
        code: ErrorCodes.BACKEND_ERROR,
        message: streamResult.error || 'Backend service error',
        locale: extractLocale(req),
        route: 'tarot/interpret/stream',
      })
    }

    // Relay the SSE stream
    return createSSEStreamProxy({ source: streamResult.response, route: 'TarotInterpretStream' })
  },
  createPublicStreamGuard({
    route: 'tarot-interpret-stream',
    limit: 10,
    windowSeconds: 60,
    requireCredits: true,
    creditType: 'reading',
    creditAmount: 1,
  })
)
