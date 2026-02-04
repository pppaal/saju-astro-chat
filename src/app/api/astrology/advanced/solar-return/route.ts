// src/app/api/astrology/advanced/solar-return/route.ts
// Solar Return (태양 회귀) API 엔드포인트

import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { sanitizeError } from '@/lib/security/errorSanitizer'
import { logger } from '@/lib/logger'
import { SolarReturnRequestSchema } from '@/lib/api/astrology-validation'
import { calculateSolarReturn, getSolarReturnSummary } from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`astro-solar-return:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again soon.' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }
    const tokenCheck = requirePublicToken(request)
    if (!tokenCheck.valid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED, headers: limit.headers }
      )
    }

    // Validate request body with Zod
    const body = await request.json().catch(() => ({}))
    const validation = SolarReturnRequestSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[SolarReturn API] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
          issues: validation.error.issues,
        },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const { date, time, latitude, longitude, timeZone, year } = validation.data

    const [birthYear, birthMonth, birthDay] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)

    // 계산할 연도 (기본값: 현재 연도)
    const targetYear = year ?? new Date().getFullYear()

    const chart = await calculateSolarReturn({
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
    })

    const summary = getSolarReturnSummary(chart)

    const res = NextResponse.json(
      {
        chart,
        summary,
        year: targetYear,
      },
      { status: HTTP_STATUS.OK }
    )

    limit.headers.forEach((value, key) => res.headers.set(key, value))
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (error: unknown) {
    captureServerError(error, { route: '/api/astrology/advanced/solar-return' })
    const sanitized = sanitizeError(error, 'internal')
    return NextResponse.json(sanitized, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
