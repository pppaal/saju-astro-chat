// src/app/api/premium-reports/ultimate-context/route.ts
//
// Computes the deterministic `computed` slice of an UltimateReport
// (saju pillars, astro placements, five-element balance) for a given
// birth profile. Called by the period pages right after the AI report
// is generated, so the result page can hydrate the new visual layout
// without a second round-trip.

import {
  apiError,
  apiSuccess,
  createAuthenticatedGuard,
  parseJsonBody,
  withApiMiddleware,
} from '@/lib/api/middleware'
import { ErrorCodes } from '@/lib/api/errorHandler'
import { computeUltimateContext } from '@/lib/premium-reports/computeUltimateContext'
import { logger } from '@/lib/logger'

interface UltimateContextBody {
  birthDate?: string
  birthTime?: string
  gender?: 'male' | 'female'
  calendarType?: 'solar' | 'lunar'
  lunarLeap?: boolean
  timezone?: string
  latitude?: number
  longitude?: number
}

const isString = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

export const POST = withApiMiddleware(
  async (req) => {
    const body = await parseJsonBody<UltimateContextBody>(req).catch(() => null)
    if (!body) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body')
    }

    if (!isString(body.birthDate)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'birthDate is required (YYYY-MM-DD)')
    }
    if (!isString(body.timezone)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'timezone is required (e.g. Asia/Seoul)')
    }
    if (!isNumber(body.latitude) || !isNumber(body.longitude)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'latitude and longitude are required')
    }

    try {
      const computed = await computeUltimateContext({
        birthDate: body.birthDate,
        birthTime: isString(body.birthTime) ? body.birthTime : '00:00',
        gender: body.gender === 'female' ? 'female' : 'male',
        calendarType: body.calendarType === 'lunar' ? 'lunar' : 'solar',
        lunarLeap: !!body.lunarLeap,
        timezone: body.timezone,
        latitude: body.latitude,
        longitude: body.longitude,
      })
      return apiSuccess({ computed })
    } catch (error) {
      logger.error('[premium-reports/ultimate-context] compute failed', {
        message: error instanceof Error ? error.message : String(error),
      })
      return apiError(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to compute saju + astrology context for the report'
      )
    }
  },
  createAuthenticatedGuard({
    route: '/api/premium-reports/ultimate-context',
    limit: 30,
    windowSeconds: 60,
  })
)
