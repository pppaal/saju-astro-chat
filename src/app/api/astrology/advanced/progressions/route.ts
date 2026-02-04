// src/app/api/astrology/advanced/progressions/route.ts
// Secondary Progressions & Solar Arc API 엔드포인트

import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { logger } from '@/lib/logger'
import { ProgressionsRequestSchema } from '@/lib/api/astrology-validation'
import {
  calculateSecondaryProgressions,
  calculateSolarArcDirections,
  getProgressedMoonPhase,
  getProgressionSummary,
} from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`astro-progressions:${ip}`, { limit: 20, windowSeconds: 60 })
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
    const validation = ProgressionsRequestSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[Progressions API] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
          issues: validation.error.issues,
        },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const { date, time, latitude, longitude, timeZone, targetDate } = validation.data

    const [birthYear, birthMonth, birthDay] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)

    // 목표 날짜 (기본값: 오늘)
    const target = targetDate ?? new Date().toISOString().split('T')[0]

    const natal = {
      year: birthYear,
      month: birthMonth,
      date: birthDay,
      hour,
      minute,
      latitude,
      longitude,
      timeZone: String(timeZone),
    }

    // Secondary Progressions 계산
    const secondary = await calculateSecondaryProgressions({
      natal,
      targetDate: target,
    })

    // Solar Arc Directions 계산
    const solarArc = await calculateSolarArcDirections({
      natal,
      targetDate: target,
    })

    // 진행 달 위상 계산 (Secondary Progressions 기준)
    const progressedMoon = secondary.planets.find((p) => p.name === 'Moon')
    const progressedSun = secondary.planets.find((p) => p.name === 'Sun')
    const moonPhase =
      progressedMoon && progressedSun
        ? getProgressedMoonPhase(progressedMoon.longitude, progressedSun.longitude)
        : null

    const res = NextResponse.json(
      {
        secondary: {
          chart: secondary,
          summary: getProgressionSummary(secondary),
        },
        solarArc: {
          chart: solarArc,
          summary: getProgressionSummary(solarArc),
        },
        moonPhase: moonPhase
          ? {
              phase: moonPhase,
              progressedMoonSign: progressedMoon?.sign,
              progressedMoonHouse: progressedMoon?.house,
            }
          : null,
        targetDate: target,
      },
      { status: HTTP_STATUS.OK }
    )

    limit.headers.forEach((value, key) => res.headers.set(key, value))
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (error: unknown) {
    const message = 'Internal Server Error'
    captureServerError(error, { route: '/api/astrology/advanced/progressions' })
    return NextResponse.json({ error: message }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
