// src/app/api/tarot/interpret/stream/route.ts
// Streaming Tarot Interpretation API - Real-time SSE for first interpretation

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard, type ApiContext } from '@/lib/api/middleware'
import { createSSEStreamProxy } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { logger } from '@/lib/logger'
import { TarotInterpretSchema } from '@/lib/api/validator'

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
    }

    const parsed = TarotInterpretSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ') },
        { status: 400 }
      )
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
      });
      return NextResponse.json(
        { error: 'Backend error', detail: streamResult.error },
        { status: streamResult.status || 500 }
      )
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
