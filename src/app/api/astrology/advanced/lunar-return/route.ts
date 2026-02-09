// src/app/api/astrology/advanced/lunar-return/route.ts
// Lunar Return (달 회귀) API 엔드포인트

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAstrologyGuard } from '@/lib/api/middleware'
import { captureServerError } from '@/lib/telemetry'
import { sanitizeError } from '@/lib/security/errorSanitizer'
import { logger } from '@/lib/logger'
import { LunarReturnRequestSchema } from '@/lib/api/astrology-validation'
import { calculateLunarReturn, getLunarReturnSummary } from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'

export const POST = withApiMiddleware(
  async (request: NextRequest) => {
    try {
      // Validate request body with Zod
      const body = await request.json().catch(() => ({}))
      const validation = LunarReturnRequestSchema.safeParse(body)

      if (!validation.success) {
        const errors = validation.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')
        logger.warn('[LunarReturn API] Validation failed', { errors: validation.error.issues })
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: errors,
            issues: validation.error.issues,
          },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const { date, time, latitude, longitude, timeZone, year, month } = validation.data

      const [birthYear, birthMonth, birthDay] = date.split('-').map(Number)
      const [hour, minute] = time.split(':').map(Number)

      // 계산할 연도와 월 (기본값: 현재)
      const now = new Date()
      const targetYear = year ?? now.getFullYear()
      const targetMonth = month ?? now.getMonth() + 1

      const chart = await calculateLunarReturn({
        natal: {
          year: birthYear,
          month: birthMonth,
          date: birthDay,
          hour,
          minute,
          latitude,
          longitude,
          timeZone: String(timeZone),
        },
        year: targetYear,
        month: targetMonth,
      })

      const summary = getLunarReturnSummary(chart)

      const res = NextResponse.json(
        {
          chart,
          summary,
          year: targetYear,
          month: targetMonth,
        },
        { status: HTTP_STATUS.OK }
      )

      res.headers.set('Cache-Control', 'no-store')
      return res
    } catch (error: unknown) {
      captureServerError(error, { route: '/api/astrology/advanced/lunar-return' })
      const sanitized = sanitizeError(error, 'internal')
      return NextResponse.json(sanitized, { status: HTTP_STATUS.SERVER_ERROR })
    }
  },
  createAstrologyGuard({
    route: 'astrology/advanced/lunar-return',
    limit: 20,
    windowSeconds: 60,
  })
)
