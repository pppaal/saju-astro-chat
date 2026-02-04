/**
 * Chart Cache API
 * Provides Redis-backed caching for chart calculations
 */

import { withApiMiddleware, apiSuccess, apiError, ErrorCodes } from '@/lib/api/middleware'
import { loadChartData, saveChartData, clearChartCache } from '@/lib/cache/chart-cache-server'
import {
  cacheChartSaveSchema,
  cacheChartDeleteSchema,
  cacheChartGetQuerySchema,
} from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

// Type for cached chart data
type ChartData = {
  saju?: Record<string, unknown>
  astro?: Record<string, unknown>
  advancedAstro?: Record<string, unknown>
}

// Response type for GET endpoint
type GetCacheResponse = { cached: false; data: null } | { cached: true; data: ChartData }

/**
 * GET /api/cache/chart
 * Load chart data from Redis cache
 */
export const GET = withApiMiddleware<GetCacheResponse>(
  async (req) => {
    const { searchParams } = new URL(req.url)

    // Validate query params with Zod
    const queryValidation = cacheChartGetQuerySchema.safeParse({
      birthDate: searchParams.get('birthDate'),
      birthTime: searchParams.get('birthTime'),
      latitude: searchParams.get('latitude'),
      longitude: searchParams.get('longitude'),
    })
    if (!queryValidation.success) {
      logger.warn('[Cache chart GET] query validation failed', {
        errors: queryValidation.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${queryValidation.error.issues.map((e) => e.message).join(', ')}`
      )
    }
    const { birthDate, birthTime, latitude, longitude } = queryValidation.data

    // Load from cache
    const cached = await loadChartData(birthDate, birthTime, latitude, longitude)

    if (!cached) {
      return apiSuccess({ cached: false, data: null })
    }

    return apiSuccess({
      cached: true,
      data: cached,
    })
  },
  {
    requireToken: true,
    rateLimit: {
      limit: 100,
      windowSeconds: 60,
      keyPrefix: 'cache:chart:get',
    },
  }
)

/**
 * POST /api/cache/chart
 * Save chart data to Redis cache
 */
export const POST = withApiMiddleware(
  async (req) => {
    const rawBody = await req.json()
    const validationResult = cacheChartSaveSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[cache/chart POST] validation failed', { errors: validationResult.error.issues })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { birthDate, birthTime, latitude, longitude, data } = validationResult.data

    // Save to cache
    const success = await saveChartData(birthDate, birthTime, latitude, longitude, data)

    if (!success) {
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to save chart data to cache')
    }

    return apiSuccess({ success: true })
  },
  {
    requireToken: true,
    rateLimit: {
      limit: 50,
      windowSeconds: 60,
      keyPrefix: 'cache:chart:post',
    },
  }
)

/**
 * DELETE /api/cache/chart
 * Clear chart cache
 */
export const DELETE = withApiMiddleware(
  async (req) => {
    const rawBody = await req.json()
    const validationResult = cacheChartDeleteSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[cache/chart DELETE] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { birthDate, birthTime } = validationResult.data

    // Clear cache
    const success = await clearChartCache(birthDate, birthTime)

    if (!success) {
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to clear chart cache')
    }

    return apiSuccess({ success: true })
  },
  {
    requireToken: true,
    rateLimit: {
      limit: 20,
      windowSeconds: 60,
      keyPrefix: 'cache:chart:delete',
    },
  }
)
