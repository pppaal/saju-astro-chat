// src/app/api/astrology/advanced/asteroids/route.ts
// 4대 소행성 (Ceres, Pallas, Juno, Vesta) API 엔드포인트

import { NextResponse } from 'next/server'
import { z } from 'zod'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import {
  calculateNatalChart,
  toChart,
  calculateAllAsteroids,
  interpretAsteroid,
  findAllAsteroidAspects,
  getAsteroidInfo,
} from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'
import { logger } from '@/lib/logger'

dayjs.extend(utc)
dayjs.extend(timezone)

const swisseph = require('swisseph')

// Zod schema for input validation
const AsteroidsRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'),
  latitude: z.number().min(-90, 'Latitude must be >= -90').max(90, 'Latitude must be <= 90'),
  longitude: z.number().min(-180, 'Longitude must be >= -180').max(180, 'Longitude must be <= 180'),
  timeZone: z.string().min(1, 'Timezone is required'),
  includeAspects: z.boolean().optional().default(true),
})

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`astro-asteroids:${ip}`, { limit: 20, windowSeconds: 60 })
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
    const validation = AsteroidsRequestSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues
        .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[Asteroids API] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
          issues: validation.error.issues,
        },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const { date, time, latitude, longitude, timeZone, includeAspects } = validation.data

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

    const chart = toChart(chartData)

    // Julian Day 계산
    const pad = (v: number) => String(v).padStart(2, '0')
    const local = dayjs.tz(
      `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`,
      timeZone
    )
    const utcDate = local.utc().toDate()

    const jdResult = swisseph.swe_utc_to_jd(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth() + 1,
      utcDate.getUTCDate(),
      utcDate.getUTCHours(),
      utcDate.getUTCMinutes(),
      utcDate.getUTCSeconds(),
      swisseph.SE_GREG_CAL
    )

    if ('error' in jdResult) {
      return NextResponse.json(
        { error: 'Failed to calculate Julian Day.' },
        { status: HTTP_STATUS.SERVER_ERROR, headers: limit.headers }
      )
    }

    const jdUT = jdResult.julianDayUT
    const houseCusps = chart.houses.map((h) => h.cusp)

    // 소행성 계산
    const asteroids = calculateAllAsteroids(jdUT, houseCusps)

    // 해석 생성
    const interpretations = {
      Ceres: interpretAsteroid(asteroids.Ceres),
      Pallas: interpretAsteroid(asteroids.Pallas),
      Juno: interpretAsteroid(asteroids.Juno),
      Vesta: interpretAsteroid(asteroids.Vesta),
    }

    // 기본 정보
    const asteroidInfo = {
      Ceres: getAsteroidInfo('Ceres'),
      Pallas: getAsteroidInfo('Pallas'),
      Juno: getAsteroidInfo('Juno'),
      Vesta: getAsteroidInfo('Vesta'),
    }

    // 애스펙트 (선택적)
    let aspects = null
    if (includeAspects) {
      aspects = findAllAsteroidAspects(asteroids, chart.planets)
    }

    const res = NextResponse.json(
      {
        asteroids: {
          Ceres: {
            ...asteroids.Ceres,
            info: asteroidInfo.Ceres,
            interpretation: interpretations.Ceres,
          },
          Pallas: {
            ...asteroids.Pallas,
            info: asteroidInfo.Pallas,
            interpretation: interpretations.Pallas,
          },
          Juno: {
            ...asteroids.Juno,
            info: asteroidInfo.Juno,
            interpretation: interpretations.Juno,
          },
          Vesta: {
            ...asteroids.Vesta,
            info: asteroidInfo.Vesta,
            interpretation: interpretations.Vesta,
          },
        },
        aspects,
      },
      { status: HTTP_STATUS.OK }
    )

    limit.headers.forEach((value, key) => res.headers.set(key, value))
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    captureServerError(error, { route: '/api/astrology/advanced/asteroids' })
    return NextResponse.json({ error: message }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
