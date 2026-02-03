// src/app/api/astrology/advanced/fixed-stars/route.ts
// 항성 (Fixed Stars) 분석 API 엔드포인트

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
  findFixedStarConjunctions,
  getAllFixedStars,
} from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'

// Zod schema for input validation
const FixedStarsRequestSchema = AdvancedAstrologyRequestSchema.extend({
  orb: z.number().min(0).max(5).optional().default(1.0),
})

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`astro-fixed-stars:${ip}`, { limit: 20, windowSeconds: 60 })
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
    const validation = FixedStarsRequestSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues
        .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[FixedStars API] Validation failed', { errors: validation.error.issues })
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

    // 항성 합 찾기
    const conjunctions = findFixedStarConjunctions(natalChart, year, orb)

    // 주요 항성 목록 (등급 2.0 이하)
    const brightStars = getAllFixedStars().filter((s) => s.magnitude <= 2.0)

    const response = {
      conjunctions: conjunctions.map((c) => ({
        starName: c.star.name,
        starNameKo: c.star.name_ko,
        planet: c.planet,
        orb: c.orb,
        magnitude: c.star.magnitude,
        nature: c.star.nature,
        keywords: c.star.keywords,
        interpretation: c.star.interpretation,
        description: c.description,
      })),
      brightStarsCount: brightStars.length,
      totalConjunctions: conjunctions.length,
    }

    const res = NextResponse.json(response, { status: HTTP_STATUS.OK })
    limit.headers.forEach((value, key) => res.headers.set(key, value))
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (error: unknown) {
    captureServerError(error, { route: '/api/astrology/advanced/fixed-stars' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected server error.' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
