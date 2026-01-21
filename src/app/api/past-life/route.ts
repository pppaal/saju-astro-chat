// src/app/api/past-life/route.ts
/**
 * Past Life Reading API
 * 전생 리딩 API - 사주 + 점성술 기반 전생 분석
 */

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { logger } from '@/lib/logger';
import { calculateSajuData } from '@/lib/Saju/saju';
import { calculateNatalChart } from '@/lib/astrology';
import { analyzePastLife } from '@/lib/past-life/analyzer';

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
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers as Headers);
    const rlKey = `past-life:${ip}`;
    const limit = await rateLimit(rlKey, { limit: 20, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: limit.reset },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { birthDate, birthTime, latitude, longitude, timezone, locale = 'ko' } = body;

    // Validate required fields
    if (!birthDate) {
      return NextResponse.json({ error: 'birthDate is required' }, { status: 400 });
    }
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json({ error: 'latitude and longitude are required' }, { status: 400 });
    }

    // Parse birth date and time
    const [year, month, day] = birthDate.split('-').map(Number);
    const [hour, minute] = (birthTime || '12:00').split(':').map(Number);

    if (!year || !month || !day) {
      return NextResponse.json({ error: 'Invalid birthDate format (use YYYY-MM-DD)' }, { status: 400 });
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
      { status: 500 }
    );
  }
}
