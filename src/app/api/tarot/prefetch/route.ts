// src/app/api/tarot/prefetch/route.ts
// Prefetch RAG context while user is selecting cards

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createSimpleGuard, extractLocale, type ApiContext } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { TarotPrefetchSchema } from '@/lib/api/validator'
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
        route: 'tarot/prefetch',
      })
    }

    const parsed = TarotPrefetchSchema.safeParse(body)
    if (!parsed.success) {
      return createValidationErrorResponse(parsed.error, {
        locale: extractLocale(req),
        route: 'tarot/prefetch',
      })
    }

    const { categoryId, spreadId } = parsed.data

    // Fire-and-forget prefetch to backend
    apiClient
      .post(
        '/api/tarot/prefetch',
        {
          categoryId,
          spreadId,
        },
        { timeout: 10000 }
      )
      .catch(() => {}) // Ignore errors silently

    return NextResponse.json({ status: 'prefetching' })
  },
  createSimpleGuard({
    route: 'tarot-prefetch',
    limit: 30,
    windowSeconds: 60,
  })
)
