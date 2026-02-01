// src/app/api/past-life/route.ts
/**
 * Past Life Reading API
 * 전생 리딩 API - 사주 + 점성술 기반 전생 분석
 */

import { NextRequest, NextResponse } from 'next/server';
import { withApiMiddleware, createSimpleGuard, type ApiContext } from '@/lib/api/middleware';
import { logger } from '@/lib/logger';
import { calculateSajuData } from '@/lib/Saju/saju';
import { calculateNatalChart } from '@/lib/astrology';
import { analyzePastLife } from '@/lib/past-life/analyzer';

import { parseRequestBody } from '@/lib/api/requestParser';
import { HTTP_STATUS } from '@/lib/constants/http';
interface PastLifeBody {
  birthDate: string;
  birthTime?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  locale?: string;
}

/**
 * POST /api/past-life
 *
 * Request body:
 * {
 *   "birthDate": "YYYY-MM-DD",
 *   "birthTime": "HH:mm",
 *   "latitude": number,
 *   "longitude": number,
 *   "timezone": "Asia/Seoul",
 *   "locale": "ko" | "en"
 * }
 */
export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      const body = await parseRequestBody<PastLifeBody>(req, { context: 'Past-life' });
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const { birthDate, birthTime, latitude, longitude, timezone, locale = 'ko' } = body;

    // Validate required fields
    if (!birthDate) {
      return NextResponse.json({ error: 'birthDate is required' }, { status: HTTP_STATUS.BAD_REQUEST });
    }
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'latitude and longitude are required' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    // Parse birth date and time
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hour, minute] = (birthTime || '12:00').split(':').map(Number);

    if (!year || !month || !day) {
      return NextResponse.json({ error: 'Invalid birthDate format (use YYYY-MM-DD)' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const isKo = locale === 'ko';

    // Calculate Saju data
    const safeBirthTime = birthTime || '12:00';
    let sajuData = null;
    try {
      sajuData = calculateSajuData(
        birthDate,
        safeBirthTime,
        'male',
        'solar',
        timezone || 'UTC'
      );
    } catch (err) {
      logger.warn('[PastLife API] Saju calculation failed:', err);
    }

    // Calculate Astrology data
    let astroData = null;
    try {
      astroData = await calculateNatalChart({
        year,
        month,
        date: day,
        hour: hour ?? 12,
        minute: minute ?? 0,
        latitude,
        longitude,
        timeZone: timezone || 'UTC',
      });
    } catch (err) {
      logger.warn('[PastLife API] Astrology calculation failed:', err);
    }

    // Analyze past life
    const result = analyzePastLife(sajuData, astroData, isKo);

      return NextResponse.json(result);

    } catch (err) {
      logger.error('[PastLife API] Unexpected error:', err);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      );
    }
  },
  createSimpleGuard({
    route: '/api/past-life',
    limit: 20,
    windowSeconds: 60,
  })
)
