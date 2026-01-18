/**
 * Chart Cache API
 * Provides Redis-backed caching for chart calculations
 */

import { NextRequest } from 'next/server';
import { withApiMiddleware, apiSuccess, apiError, ErrorCodes } from '@/lib/api/middleware';
import {
  loadChartData,
  saveChartData,
  clearChartCache,
} from '@/lib/cache/chart-cache-server';

/**
 * GET /api/cache/chart
 * Load chart data from Redis cache
 */
export const GET = withApiMiddleware(
  async (req) => {
    const { searchParams } = new URL(req.url);

    const birthDate = searchParams.get('birthDate');
    const birthTime = searchParams.get('birthTime');
    const latitudeStr = searchParams.get('latitude');
    const longitudeStr = searchParams.get('longitude');

    // Validate required parameters
    if (!birthDate || !birthTime || !latitudeStr || !longitudeStr) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required parameters: birthDate, birthTime, latitude, longitude'
      );
    }

    const latitude = parseFloat(latitudeStr);
    const longitude = parseFloat(longitudeStr);

    if (isNaN(latitude) || isNaN(longitude)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid latitude or longitude');
    }

    // Load from cache
    const cached = await loadChartData(birthDate, birthTime, latitude, longitude);

    if (!cached) {
      return apiSuccess({ cached: false, data: null });
    }

    return apiSuccess({
      cached: true,
      data: cached,
    });
  },
  {
    requireToken: true,
    rateLimit: {
      limit: 100,
      windowSeconds: 60,
      keyPrefix: 'cache:chart:get',
    },
  }
);

/**
 * POST /api/cache/chart
 * Save chart data to Redis cache
 */
export const POST = withApiMiddleware(
  async (req) => {
    const body = await req.json();

    const { birthDate, birthTime, latitude, longitude, data } = body;

    // Validate required fields
    if (!birthDate || !birthTime || latitude === undefined || longitude === undefined || !data) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields: birthDate, birthTime, latitude, longitude, data'
      );
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid latitude or longitude');
    }

    // Save to cache
    const success = await saveChartData(
      birthDate,
      birthTime,
      latitude,
      longitude,
      data
    );

    if (!success) {
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to save chart data to cache');
    }

    return apiSuccess({ success: true });
  },
  {
    requireToken: true,
    rateLimit: {
      limit: 50,
      windowSeconds: 60,
      keyPrefix: 'cache:chart:post',
    },
  }
);

/**
 * DELETE /api/cache/chart
 * Clear chart cache
 */
export const DELETE = withApiMiddleware(
  async (req) => {
    const body = await req.json();

    const { birthDate, birthTime } = body;

    if (!birthDate || !birthTime) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required fields: birthDate, birthTime'
      );
    }

    // Clear cache
    const success = await clearChartCache(birthDate, birthTime);

    if (!success) {
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to clear chart cache');
    }

    return apiSuccess({ success: true });
  },
  {
    requireToken: true,
    rateLimit: {
      limit: 20,
      windowSeconds: 60,
      keyPrefix: 'cache:chart:delete',
    },
  }
);
