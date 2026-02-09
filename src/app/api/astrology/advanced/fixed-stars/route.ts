// src/app/api/astrology/advanced/fixed-stars/route.ts
// 항성 (Fixed Stars) 분석 API 엔드포인트

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAstrologyGuard,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { captureServerError } from '@/lib/telemetry'
import { logger } from '@/lib/logger'
import { FixedStarsRequestSchema } from '@/lib/api/astrology-validation'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import {
  calculateNatalChart,
  toChart,
  findFixedStarConjunctions,
  getAllFixedStars,
} from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'

type FixedStarsResponse = {
  conjunctions: Array<{
    starName: string
    starNameKo: string
    planet: string
    orb: number
    magnitude: number
    nature: string
    keywords: string[]
    interpretation: string
    description: string
  }>
  brightStarsCount: number
  totalConjunctions: number
}

export const POST = withApiMiddleware<FixedStarsResponse>(
  async (request: NextRequest, context: ApiContext) => {
    try {
      // Validate request body with Zod
      const body = await request.json().catch(() => ({}))
      const validation = FixedStarsRequestSchema.safeParse(body)

      if (!validation.success) {
        logger.warn('[FixedStars API] Validation failed', { errors: validation.error.issues })
        return createValidationErrorResponse(validation.error, {
          locale: context.locale,
          route: 'astrology/advanced/fixed-stars',
        })
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

      return {
        data: response,
        status: HTTP_STATUS.OK,
        headers: { 'Cache-Control': 'no-store' },
      }
    } catch (error: unknown) {
      captureServerError(error, { route: '/api/astrology/advanced/fixed-stars' })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAstrologyGuard({
    route: 'astrology/advanced/fixed-stars',
    limit: 20,
    windowSeconds: 60,
  })
)
