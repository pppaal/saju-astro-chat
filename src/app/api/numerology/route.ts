// src/app/api/numerology/route.ts
/**
 * Numerology Analysis API
 * 수비학 분석 API - 생년월일/이름 기반 수비학 프로필 및 궁합 분석
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';

function pickBackendUrl() {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    'http://127.0.0.1:5000';
  return url;
}

/**
 * POST /api/numerology
 *
 * Request body:
 * {
 *   "action": "analyze" | "compatibility",
 *   "birthDate": "YYYY-MM-DD",
 *   "englishName": "Full Name" (optional),
 *   "koreanName": "한글이름" (optional),
 *   "locale": "ko",
 *   // For compatibility:
 *   "person1": { "birthDate": "...", "name": "..." },
 *   "person2": { "birthDate": "...", "name": "..." }
 * }
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers as Headers);
    const rlKey = `numerology:${ip}`;
    const limit = await rateLimit(rlKey, { limit: 30, windowSeconds: 60 });

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

    const action = body.action || 'analyze';
    const locale = body.locale || 'ko';
    const backendUrl = pickBackendUrl();

    // Build request headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const apiToken = process.env.ADMIN_API_TOKEN;
    if (apiToken) {
      headers['X-API-KEY'] = apiToken;
    }

    let endpoint = '';
    let requestBody: Record<string, any> = {};

    if (action === 'analyze') {
      // Single person numerology analysis
      if (!body.birthDate) {
        return NextResponse.json({ error: 'birthDate is required' }, { status: 400 });
      }

      endpoint = '/api/numerology/analyze';
      requestBody = {
        birthDate: body.birthDate,
        englishName: body.englishName,
        koreanName: body.koreanName,
        locale,
      };
    } else if (action === 'compatibility') {
      // Two-person compatibility analysis
      const p1 = body.person1;
      const p2 = body.person2;

      if (!p1?.birthDate || !p2?.birthDate) {
        return NextResponse.json(
          { error: 'Both person1.birthDate and person2.birthDate are required' },
          { status: 400 }
        );
      }

      endpoint = '/api/numerology/compatibility';
      requestBody = {
        person1: { birthDate: p1.birthDate, name: p1.name },
        person2: { birthDate: p2.birthDate, name: p2.name },
        locale,
      };
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Call backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Numerology API] Backend error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Backend service error', status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API /api/numerology] Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Internal Server Error: ${msg}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/numerology?birthDate=YYYY-MM-DD&name=...
 * Quick single-person analysis
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const birthDate = url.searchParams.get('birthDate');
    const englishName = url.searchParams.get('name') || url.searchParams.get('englishName');
    const koreanName = url.searchParams.get('koreanName');
    const locale = url.searchParams.get('locale') || 'ko';

    if (!birthDate) {
      return NextResponse.json({ error: 'birthDate query param is required' }, { status: 400 });
    }

    const ip = getClientIp(req.headers as Headers);
    const rlKey = `numerology-get:${ip}`;
    const limit = await rateLimit(rlKey, { limit: 60, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: limit.reset },
        { status: 429 }
      );
    }

    const backendUrl = pickBackendUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const apiToken = process.env.ADMIN_API_TOKEN;
    if (apiToken) {
      headers['X-API-KEY'] = apiToken;
    }

    const response = await fetch(`${backendUrl}/api/numerology/analyze`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ birthDate, englishName, koreanName, locale }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Backend service error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('[API /api/numerology GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
