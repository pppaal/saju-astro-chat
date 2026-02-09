// src/app/api/iching/changing-line/route.ts
// 변효 해석 API - 백엔드에서 변효 데이터를 가져옴

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard, extractLocale, type ApiContext } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { logger } from '@/lib/logger'
import { IChingChangingLineSchema } from '@/lib/api/validator'
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
        route: 'iching/changing-line',
      })
    }

    const parsed = IChingChangingLineSchema.safeParse(body)
    if (!parsed.success) {
      return createValidationErrorResponse(parsed.error, {
        locale: extractLocale(req),
        route: 'iching/changing-line',
      })
    }

    const { hexagramNumber, lineIndex, locale } = parsed.data

    // Call backend to get changing line interpretation
    const response = await apiClient.post(
      '/iching/changing-line',
      {
        hexagramNumber,
        lineIndex: lineIndex + 1, // Backend uses 1-6
        locale,
      },
      { timeout: 10000 }
    )

    if (!response.ok) {
      logger.error('[ChangingLine] Backend error:', {
        status: response.status,
        error: response.error,
      });
      return createErrorResponse({
        code: ErrorCodes.BACKEND_ERROR,
        message: response.error || 'Backend service error',
        locale: extractLocale(req),
        route: 'iching/changing-line',
      })
    }

    return NextResponse.json(response.data)
  },
  createPublicStreamGuard({
    route: 'iching-changing-line',
    limit: 60,
    windowSeconds: 60,
  })
)
