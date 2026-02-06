// src/app/api/astrology/advanced/solar-return/route.ts
// Solar Return (태양 회귀) API 엔드포인트

import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { logger } from '@/lib/logger'
import { SolarReturnRequestSchema } from '@/lib/api/astrology-validation'
import { calculateSolarReturn, getSolarReturnSummary } from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import { extractLocale } from '@/lib/api/middleware'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`astro-solar-return:${ip}`, { limit: 20, windowSeconds: 60 })
    if (!limit.allowed) {
      return createErrorResponse({
        code: ErrorCodes.RATE_LIMITED,
        locale: extractLocale(request),
        route: 'astrology/advanced/solar-return',
        headers: Object.fromEntries(limit.headers.entries()),
      })
    }
    const tokenCheck = requirePublicToken(request)
    if (!tokenCheck.valid) {
      return createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale: extractLocale(request),
        route: 'astrology/advanced/solar-return',
        headers: Object.fromEntries(limit.headers.entries()),
      })
    }

    // Validate request body with Zod
    const body = await request.json().catch(() => ({}))
    const validation = SolarReturnRequestSchema.safeParse(body)

    if (!validation.success) {
      logger.warn('[SolarReturn API] Validation failed', { errors: validation.error.issues })
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(request),
        route: 'astrology/advanced/solar-return',
      })
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
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'astrology/advanced/solar-return',
      originalError: error instanceof Error ? error : new Error(String(error)),
    })
  }
}
