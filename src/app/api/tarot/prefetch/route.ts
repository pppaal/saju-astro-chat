// src/app/api/tarot/prefetch/route.ts
// Prefetch RAG context while user is selecting cards

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createTarotGuard, extractLocale, type ApiContext } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { TarotPrefetchSchema } from '@/lib/api/validator'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

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
      // Prefetch 는 best-effort 이므로 실패해도 사용자 흐름엔 영향 X.
      // 다만 디버깅용 debug 로그는 남긴다 (이전엔 완전 silent).
      .catch((err) => {
        logger.debug('[tarot/prefetch] background fetch failed', { err })
      })

    return NextResponse.json({ status: 'prefetching' })
  },
  createTarotGuard({
    route: 'tarot-prefetch',
    limit: 30,
    windowSeconds: 60,
  })
)
