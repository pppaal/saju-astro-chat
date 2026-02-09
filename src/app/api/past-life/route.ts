// src/app/api/past-life/route.ts
/**
 * Past Life Reading API
 * 전생 리딩 API - 사주 + 점성술 기반 전생 분석
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createPublicStreamGuard, type ApiContext } from '@/lib/api/middleware'
import { logger } from '@/lib/logger'
import { calculateSajuData } from '@/lib/Saju/saju'
import { calculateNatalChart } from '@/lib/astrology'
import { analyzePastLife } from '@/lib/past-life/analyzer'
import { pastLifeRequestSchema } from '@/lib/api/zodValidation'
import { HTTP_STATUS } from '@/lib/constants/http'

/**
 * POST /api/past-life
 *
 * Request body:
 * {
 *   "birthDate": "YYYY-MM-DD",
 *   "birthTime": "HH:mm",
 *   "latitude": number,
 *   "longitude": number,
 *   "timezone": "Asia/Seoul",
 *   "locale": "ko" | "en"
 * }
 */
export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const rawBody = await req.json()
    const validationResult = pastLifeRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[past-life] validation failed', { errors: validationResult.error.issues })
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
      birthDate,
      birthTime,
      latitude,
      longitude,
      timezone,
      locale = 'ko',
    } = validationResult.data

    // Parse birth date and time
    const [year, month, day] = birthDate.split('-').map(Number)
    const [hour, minute] = (birthTime || '12:00').split(':').map(Number)

    const isKo = locale === 'ko'

    // Calculate Saju data
    const safeBirthTime = birthTime || '12:00'
    let sajuData = null
    try {
      sajuData = calculateSajuData(birthDate, safeBirthTime, 'male', 'solar', timezone || 'UTC')
    } catch (err) {
      logger.warn('[PastLife API] Saju calculation failed:', err)
    }

    // Calculate Astrology data
    let astroData = null
    try {
      astroData = await calculateNatalChart({
        year,
        month,
        date: day,
        hour: hour ?? 12,
        minute: minute ?? 0,
        latitude,
        longitude,
        timeZone: timezone || 'UTC',
      })
    } catch (err) {
      logger.warn('[PastLife API] Astrology calculation failed:', err)
    }

    // Analyze past life
    const result = analyzePastLife(sajuData, astroData, isKo)

    return NextResponse.json(result)
  },
  createPublicStreamGuard({
    route: '/api/past-life',
    limit: 20,
    windowSeconds: 60,
  })
)
