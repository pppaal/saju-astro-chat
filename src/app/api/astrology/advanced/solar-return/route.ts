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
import { nowInTimezone } from '@/lib/utils/timezone'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import { extractLocale } from '@/lib/api/middleware'
import { enforceBodySize } from '@/lib/http'

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

    // 거대 본문 버퍼링 전 413 — 이 라우트는 createAstrologyGuard(1MB 캡)를 쓰지
    // 않고 가드를 손수 조립하므로, 형제 라우트(eclipses/fixed-stars/lunar-return)
    // 가 가드로 얻는 body-size 캡을 여기서 직접 건다(메모리 DoS 차단).
    const tooLarge = enforceBodySize(request, 1024 * 1024)
    if (tooLarge) return tooLarge

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

    // Default to the user's current local year at the birth-place
    // timezone. `new Date().getFullYear()` on the production UTC server
    // flips to the next year shortly after midnight in west-of-UTC zones
    // — a Californian calling on Dec 31 evening would otherwise get next
    // year's solar return.
    const targetYear = year ?? nowInTimezone(timeZone).getUTCFullYear()

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
