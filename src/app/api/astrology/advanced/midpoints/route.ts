// src/app/api/astrology/advanced/midpoints/route.ts
// 미드포인트 (Midpoints) 분석 API 엔드포인트

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
import { MidpointsRequestSchema } from '@/lib/api/astrology-validation'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import {
  calculateNatalChart,
  toChart,
  calculateMidpoints,
  findMidpointActivations,
} from '@/lib/astrology'
import { HTTP_STATUS } from '@/lib/constants/http'

type MidpointsResponse = {
  midpoints: Array<{
    id: string
    planet1: string
    planet2: string
    longitude: number
    sign: string
    degree: number
    minute: number
    formatted: string
    nameKo: string
    keywords: string[]
  }>
  activations: Array<{
    midpointId: string
    midpointNameKo: string
    activator: string
    aspectType: string
    orb: number
    description: string
  }>
  totalMidpoints: number
  totalActivations: number
}

export const POST = withApiMiddleware<MidpointsResponse>(
  async (request: NextRequest, context: ApiContext) => {
    try {
      // Validate request body with Zod
      const body = await request.json().catch(() => ({}))
      const validation = MidpointsRequestSchema.safeParse(body)

      if (!validation.success) {
        logger.warn('[Midpoints API] Validation failed', { errors: validation.error.issues })
        return createValidationErrorResponse(validation.error, {
          locale: context.locale,
          route: 'astrology/advanced/midpoints',
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

      return {
        data: response,
        status: HTTP_STATUS.OK,
        headers: { 'Cache-Control': 'no-store' },
      }
    } catch (error: unknown) {
      captureServerError(error, { route: '/api/astrology/advanced/midpoints' })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAstrologyGuard({
    route: 'astrology/advanced/midpoints',
    limit: 20,
    windowSeconds: 60,
  })
)
