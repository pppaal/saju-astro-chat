// src/app/api/astrology/advanced/harmonics/route.ts
// 하모닉 분석 API 엔드포인트

import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { logger } from '@/lib/logger'
import { HarmonicsRequestSchema } from '@/lib/api/astrology-validation'
import {
  calculateNatalChart,
  toChart,
  calculateHarmonicChart,
  analyzeHarmonic,
  generateHarmonicProfile,
  getHarmonicMeaning,
} from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`astro-harmonics:${ip}`, { limit: 20, windowSeconds: 60 })
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
    const validation = HarmonicsRequestSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[Harmonics API] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
          issues: validation.error.issues,
        },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const { date, time, latitude, longitude, timeZone, harmonic, currentAge, fullProfile } =
      validation.data

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

    const response: Record<string, unknown> = {}

    // 특정 하모닉 분석
    if (harmonic) {
      const harmonicChart = calculateHarmonicChart(natalChart, harmonic)
      const analysis = analyzeHarmonic(natalChart, harmonic)
      const meaning = getHarmonicMeaning(harmonic)

      response.harmonicChart = {
        harmonicNumber: harmonic,
        planets: harmonicChart.planets,
        ascendant: harmonicChart.ascendant,
        mc: harmonicChart.mc,
      }
      response.analysis = {
        strength: analysis.strength,
        conjunctions: analysis.conjunctions,
        patterns: analysis.patterns,
        interpretation: analysis.interpretation,
      }
      response.meaning = meaning
    }

    // 전체 프로필 (선택적)
    if (fullProfile || currentAge) {
      const profile = generateHarmonicProfile(natalChart, currentAge)
      response.profile = {
        strongestHarmonics: profile.strongestHarmonics,
        weakestHarmonics: profile.weakestHarmonics,
        overallInterpretation: profile.overallInterpretation,
      }

      if (currentAge && profile.ageHarmonic) {
        response.ageHarmonic = {
          age: currentAge,
          strength: profile.ageHarmonic.strength,
          conjunctions: profile.ageHarmonic.conjunctions,
          patterns: profile.ageHarmonic.patterns,
          interpretation: profile.ageHarmonic.interpretation,
        }
      }
    }

    const res = NextResponse.json(response, { status: HTTP_STATUS.OK })

    limit.headers.forEach((value, key) => res.headers.set(key, value))
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (error: unknown) {
    captureServerError(error, { route: '/api/astrology/advanced/harmonics' })
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
