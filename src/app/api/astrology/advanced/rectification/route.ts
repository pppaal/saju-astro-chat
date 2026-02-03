// src/app/api/astrology/advanced/rectification/route.ts
// 출생 시간 교정(Rectification) API 엔드포인트

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { logger } from '@/lib/logger'
import {
  performRectification,
  estimateAscendantByAppearance,
  getAscendantAppearance,
  getSajuHourRange,
  generateRectificationGuide,
  type LifeEvent,
  type LifeEventType,
  type ZodiacKo,
} from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'

const VALID_EVENT_TYPES: LifeEventType[] = [
  'marriage',
  'divorce',
  'birth_of_child',
  'death_of_parent_mother',
  'death_of_parent_father',
  'career_change',
  'career_peak',
  'job_loss',
  'major_move',
  'accident',
  'surgery',
  'graduation',
  'major_relationship_start',
  'major_relationship_end',
  'financial_gain',
  'financial_loss',
  'spiritual_awakening',
  'health_crisis',
  'other',
]

// Zod schema for input validation
const RectificationRequestSchema = z.object({
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Birth date must be in YYYY-MM-DD format'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timeZone: z.string().min(1),
  events: z
    .array(
      z.object({
        date: z.string(),
        type: z.string(),
        description: z.string().optional(),
        importance: z.enum(['low', 'moderate', 'high']).optional(),
      })
    )
    .min(1, 'At least one event is required'),
  approximateTimeRange: z
    .object({
      startHour: z.number().int().min(0).max(23).optional(),
      endHour: z.number().int().min(0).max(23).optional(),
      intervalMinutes: z.number().int().min(1).max(60).optional(),
    })
    .optional(),
  appearanceProfile: z.record(z.unknown()).optional(),
  sajuSijin: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`astro-rectification:${ip}`, { limit: 10, windowSeconds: 60 })
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
    const validation = RectificationRequestSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues
        .map((e: z.ZodIssue) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')
      logger.warn('[Rectification API] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: errors,
          issues: validation.error.issues,
        },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const {
      birthDate,
      latitude,
      longitude,
      timeZone,
      events,
      approximateTimeRange,
      appearanceProfile,
      sajuSijin,
    } = validation.data

    const [year, month, day] = birthDate.split('-').map(Number)

    // 이벤트 파싱 및 검증
    const parsedEvents: LifeEvent[] = []
    for (const event of events) {
      if (!VALID_EVENT_TYPES.includes(event.type as LifeEventType)) {
        return NextResponse.json(
          {
            error: `Invalid event type: ${event.type}. Valid types: ${VALID_EVENT_TYPES.join(', ')}`,
          },
          { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
        )
      }
      parsedEvents.push({
        date: new Date(event.date),
        type: event.type as LifeEventType,
        description: event.description || '',
        importance: event.importance || 'moderate',
      })
    }

    // 시간 범위 설정
    let startHour = 0
    let endHour = 23
    let intervalMinutes = 30

    if (approximateTimeRange) {
      startHour = approximateTimeRange.startHour ?? 0
      endHour = approximateTimeRange.endHour ?? 23
      intervalMinutes = approximateTimeRange.intervalMinutes ?? 30
    }

    // 사주 시진으로 범위 좁히기
    if (sajuSijin) {
      const range = getSajuHourRange(sajuSijin)
      if (range) {
        startHour = range.start
        endHour = range.end === 1 ? 1 : range.end // 자시 처리
      }
    }

    // 외모/성격으로 ASC 추정
    let estimatedAscSigns: ZodiacKo[] | undefined
    if (appearanceProfile) {
      estimatedAscSigns = estimateAscendantByAppearance(appearanceProfile)
    }

    // 교정 수행
    const result = await performRectification(
      {
        year,
        month,
        date: day,
        latitude,
        longitude,
        timeZone: String(timeZone),
      },
      parsedEvents,
      {
        startHour,
        endHour,
        intervalMinutes,
        estimatedAscSigns,
      }
    )

    // 가이드 생성
    const guide = generateRectificationGuide(
      !!(approximateTimeRange || sajuSijin),
      parsedEvents.length
    )

    const res = NextResponse.json(
      {
        result: {
          bestCandidate: result.bestCandidate
            ? {
                time: result.bestCandidate.time.toISOString(),
                ascendantSign: result.bestCandidate.ascendantSign,
                ascendantDegree: result.bestCandidate.ascendantDegree.toFixed(2),
                mcSign: result.bestCandidate.mcSign,
                mcDegree: result.bestCandidate.mcDegree.toFixed(2),
                confidence: result.bestCandidate.confidence,
                matchingEvents: result.bestCandidate.matchingEvents.length,
              }
            : null,
          confidenceLevel: result.confidenceLevel,
          candidates: result.candidates.slice(0, 5).map((c) => ({
            time: c.time.toISOString(),
            ascendantSign: c.ascendantSign,
            confidence: c.confidence,
          })),
          methodology: result.methodology,
          recommendations: result.recommendations,
        },
        guide,
        estimatedAscSigns,
        inputSummary: {
          birthDate,
          eventsCount: parsedEvents.length,
          timeRange: { startHour, endHour, intervalMinutes },
        },
      },
      { status: HTTP_STATUS.OK }
    )

    limit.headers.forEach((value, key) => res.headers.set(key, value))
    res.headers.set('Cache-Control', 'no-store')
    return res
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    captureServerError(error, { route: '/api/astrology/advanced/rectification' })
    return NextResponse.json({ error: message }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}

// GET: 가이드라인과 ASC 외모 정보
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`astro-rectification-get:${ip}`, { limit: 30, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests.' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const { searchParams } = new URL(request.url)
    const sign = searchParams.get('sign') as ZodiacKo | null

    const validSigns: ZodiacKo[] = [
      'Aries',
      'Taurus',
      'Gemini',
      'Cancer',
      'Leo',
      'Virgo',
      'Libra',
      'Scorpio',
      'Sagittarius',
      'Capricorn',
      'Aquarius',
      'Pisces',
    ]

    if (sign && validSigns.includes(sign)) {
      const appearance = getAscendantAppearance(sign)
      return NextResponse.json({ sign, appearance }, { status: HTTP_STATUS.OK })
    }

    // 전체 ASC 외모 정보 반환
    const allAppearances = validSigns.reduce(
      (acc, s) => {
        acc[s] = getAscendantAppearance(s)
        return acc
      },
      {} as Record<ZodiacKo, ReturnType<typeof getAscendantAppearance>>
    )

    const res = NextResponse.json(
      {
        validEventTypes: VALID_EVENT_TYPES,
        ascendantAppearances: allAppearances,
        sajuHours: [
          '자시',
          '축시',
          '인시',
          '묘시',
          '진시',
          '사시',
          '오시',
          '미시',
          '신시',
          '유시',
          '술시',
          '해시',
        ],
      },
      { status: HTTP_STATUS.OK }
    )

    limit.headers.forEach((value, key) => res.headers.set(key, value))
    return res
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.'
    captureServerError(error, { route: '/api/astrology/advanced/rectification GET' })
    return NextResponse.json({ error: message }, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
