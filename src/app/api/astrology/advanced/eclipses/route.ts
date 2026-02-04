// src/app/api/astrology/advanced/eclipses/route.ts
// 이클립스 (Eclipse) 영향 분석 API 엔드포인트

import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { logger } from '@/lib/logger'
import {
  calculateNatalChart,
  toChart,
  findEclipseImpact,
  getUpcomingEclipses,
  checkEclipseSensitivity,
} from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'
import { EclipsesRequestSchema } from '@/lib/api/astrology-validation'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`astro-eclipses:${ip}`, { limit: 20, windowSeconds: 60 })
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
    const validation = EclipsesRequestSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[Eclipses API] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
          issues: validation.error.issues,
        },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const { date, time, latitude, longitude, timeZone, orb } = validation.data

    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)

    // 출생 차트 계산
    const chartData = await calculateNatalChart({
      year,
      month,
      date: day,
      hour,
      minute,
      latitude,
      longitude,
      timeZone: String(timeZone),
    })

    const natalChart = toChart(chartData)

    // 이클립스 영향 찾기
    const impacts = findEclipseImpact(natalChart, undefined, orb)

    // 다가오는 이클립스 (4개)
    const upcoming = getUpcomingEclipses(new Date(), 4)

    // 이클립스 민감도 체크
    const sensitivity = checkEclipseSensitivity(natalChart)

    const response = {
      impacts: impacts.map((i) => ({
        eclipseDate: i.eclipse.date,
        eclipseType: i.eclipse.type,
        eclipseSign: i.eclipse.sign,
        eclipseDegree: i.eclipse.degree,
        eclipseDescription: i.eclipse.description,
        affectedPoint: i.affectedPoint,
        aspectType: i.aspectType,
        orb: i.orb,
        house: i.house,
        interpretation: i.interpretation,
      })),
      upcoming: upcoming.map((e) => ({
        date: e.date,
        type: e.type,
        sign: e.sign,
        degree: e.degree,
        description: e.description,
      })),
      sensitivity: {
        isSensitive: sensitivity.sensitive,
        sensitivePoints: sensitivity.sensitivePoints,
        nodeSign: sensitivity.nodeSign,
      },
      totalImpacts: impacts.length,
    }

    const res = NextResponse.json(response, { status: HTTP_STATUS.OK })
    limit.headers.forEach((value, key) => res.headers.set(key, value))
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (error: unknown) {
    captureServerError(error, { route: '/api/astrology/advanced/eclipses' })
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
