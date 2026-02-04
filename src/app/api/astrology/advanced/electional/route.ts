// src/app/api/astrology/advanced/electional/route.ts
// 택일 점성학 API 엔드포인트

import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { logger } from '@/lib/logger'
import { ElectionalRequestSchema } from '@/lib/api/astrology-validation'
import {
  calculateNatalChart,
  toChart,
  analyzeElection,
  getMoonPhaseName,
  getElectionalGuidelines,
  type ElectionalEventType,
} from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'

const validEventTypes: ElectionalEventType[] = [
  'business_start',
  'signing_contracts',
  'marriage',
  'engagement',
  'first_date',
  'surgery',
  'dental',
  'start_treatment',
  'long_journey',
  'moving_house',
  'investment',
  'buying_property',
  'major_purchase',
  'creative_start',
  'publishing',
  'starting_studies',
  'exam',
  'lawsuit',
  'court_appearance',
]

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`astro-electional:${ip}`, { limit: 20, windowSeconds: 60 })
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
    const validation = ElectionalRequestSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[Electional API] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
          issues: validation.error.issues,
        },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const { date, time, latitude, longitude, timeZone, eventType, basicOnly } = validation.data

    // Validate eventType if provided
    if (!basicOnly && !eventType) {
      return NextResponse.json(
        { error: 'eventType is required (or set basicOnly: true for basic moon/VOC info)' },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    if (eventType && !validEventTypes.includes(eventType as ElectionalEventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Valid types: ${validEventTypes.join(', ')}` },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)

    // 차트 계산
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
    const dateTime = new Date(year, month - 1, day, hour, minute)

    // basicOnly 모드: 기본 Moon Phase/VOC/역행 정보만 반환
    if (basicOnly) {
      // analyzeElection을 general 목적으로 호출하여 기본 정보 추출
      const basicAnalysis = analyzeElection(
        chart,
        'business_start' as ElectionalEventType,
        dateTime
      )

      const res = NextResponse.json(
        {
          moonPhase: basicAnalysis.moonPhase,
          moonPhaseName: getMoonPhaseName(basicAnalysis.moonPhase),
          moonSign: basicAnalysis.moonSign,
          voidOfCourse: basicAnalysis.voidOfCourse,
          retrogradePlanets: basicAnalysis.retrogradePlanets,
          dateTime: dateTime.toISOString(),
          basicOnly: true,
        },
        { status: HTTP_STATUS.OK }
      )

      limit.headers.forEach((value, key) => res.headers.set(key, value))
      res.headers.set('Cache-Control', 'no-store')
      return res
    }

    // 택일 분석 (full mode)
    const analysis = analyzeElection(chart, eventType as ElectionalEventType, dateTime)

    // 이벤트 가이드라인
    const guidelines = getElectionalGuidelines(eventType as ElectionalEventType)

    const res = NextResponse.json(
      {
        analysis: {
          score: analysis.score,
          moonPhase: analysis.moonPhase,
          moonPhaseName: getMoonPhaseName(analysis.moonPhase),
          moonSign: analysis.moonSign,
          voidOfCourse: analysis.voidOfCourse,
          retrogradePlanets: analysis.retrogradePlanets,
          beneficAspects: analysis.beneficAspects,
          maleficAspects: analysis.maleficAspects,
          recommendations: analysis.recommendations,
          warnings: analysis.warnings,
        },
        guidelines,
        eventType,
        dateTime: dateTime.toISOString(),
      },
      { status: HTTP_STATUS.OK }
    )

    limit.headers.forEach((value, key) => res.headers.set(key, value))
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (error: unknown) {
    const message = 'Internal Server Error'
    captureServerError(error, { route: '/api/astrology/advanced/electional' })
    return NextResponse.json({ error: message }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
