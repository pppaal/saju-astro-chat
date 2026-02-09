// src/app/api/precompute-chart/route.ts
// 서버에서 사주/점성술 데이터 미리 계산 (swisseph 사용)

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard } from '@/lib/api/middleware'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { precomputeChartRequestSchema } from '@/lib/api/zodValidation'
import { computePrecomputedChart } from './compute'

export const POST = withApiMiddleware(
  async (req: NextRequest) => {
    try {
      const rawBody = await req.json()

      // Validate with Zod
      const validationResult = precomputeChartRequestSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[precompute-chart] validation failed', {
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

      const result = await computePrecomputedChart(validationResult.data)
      return NextResponse.json(result)
    } catch (error) {
      logger.error('[precompute-chart] Error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createPublicStreamGuard({ route: 'precompute-chart', limit: 10, windowSeconds: 60 })
)
