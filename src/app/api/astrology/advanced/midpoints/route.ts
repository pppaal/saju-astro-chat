// src/app/api/astrology/advanced/midpoints/route.ts
// 미드포인트 (Midpoints) 분석 API 엔드포인트

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { logger } from '@/lib/logger'
import { AdvancedAstrologyRequestSchema } from '@/lib/api/astrology-validation'
import {
  calculateNatalChart,
  toChart,
  calculateMidpoints,
  findMidpointActivations,
} from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'

// Zod schema for input validation
const MidpointsRequestSchema = AdvancedAstrologyRequestSchema.extend({
  orb: z.number().min(0).max(5).optional().default(1.5),
})

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`astro-midpoints:${ip}`, { limit: 20, windowSeconds: 60 })
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
    const validation = MidpointsRequestSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues
        .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[Midpoints API] Validation failed', { errors: validation.error.issues })
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

    // 미드포인트 계산
    const midpoints = calculateMidpoints(natalChart)

    // 미드포인트 활성화 찾기
    const activations = findMidpointActivations(natalChart, orb)

    const response = {
      midpoints: midpoints.map((mp) => ({
        id: mp.id,
        planet1: mp.planet1,
        planet2: mp.planet2,
        longitude: mp.longitude,
        sign: mp.sign,
        degree: mp.degree,
        minute: mp.minute,
        formatted: mp.formatted,
        nameKo: mp.name_ko,
        keywords: mp.keywords,
      })),
      activations: activations.map((a) => ({
        midpointId: a.midpoint.id,
        midpointNameKo: a.midpoint.name_ko,
        activator: a.activator,
        aspectType: a.aspectType,
        orb: a.orb,
        description: a.description,
      })),
      totalMidpoints: midpoints.length,
      totalActivations: activations.length,
    }

    const res = NextResponse.json(response, { status: HTTP_STATUS.OK })
    limit.headers.forEach((value, key) => res.headers.set(key, value))
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (error: unknown) {
    captureServerError(error, { route: '/api/astrology/advanced/midpoints' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected server error.' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
