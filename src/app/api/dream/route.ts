import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { captureServerError } from '@/lib/telemetry';
import { requirePublicToken } from '@/lib/auth/publicToken';

const BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND || 'http://127.0.0.1:5000';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`dream:${ip}`, { limit: 30, windowSeconds: 60 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: limit.headers });
  }
  if (!requirePublicToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: limit.headers });
  }
  try {
    const body = await req.json();
    const { dreamText, locale = 'ko', birthDate, birthTime, latitude, longitude, timeZone } = body;

    if (!dreamText || typeof dreamText !== 'string' || dreamText.trim().length < 5) {
      return NextResponse.json({ error: 'Dream description required (min 5 characters)' }, { status: 400 });
    }

    // ======== AI 백엔드 호출 (GPT) ========
    let aiInterpretation = '';
    let aiModelUsed = '';
    let symbols: string[] = [];

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const apiToken = process.env.ADMIN_API_TOKEN;
      if (apiToken) {
        headers['X-API-KEY'] = apiToken;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      const aiResponse = await fetch(`${BACKEND_URL}/api/dream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dream_text: dreamText,
          locale,
          birthDate,
          birthTime,
          latitude,
          longitude,
          timeZone,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiInterpretation = aiData?.data?.interpretation || aiData?.interpretation || '';
        aiModelUsed = aiData?.data?.model || 'gpt-4o';
        symbols = aiData?.data?.symbols || aiData?.symbols || [];
      }
    } catch (aiErr) {
      console.warn('[Dream API] AI backend call failed:', aiErr);
      aiInterpretation = locale === 'ko'
        ? '꿈 해석 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
        : 'Dream interpretation service unavailable. Please try again later.';
      aiModelUsed = 'error-fallback';
    }

    const res = NextResponse.json({
      ok: true,
      interpretation: aiInterpretation,
      aiModelUsed,
      symbols,
      dreamText,
    });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;
  } catch (e: any) {
    captureServerError(e, { route: "/api/dream", method: "POST" });
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`dream:get:${ip}`, { limit: 30, windowSeconds: 60 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: limit.headers });
  }
  if (!requirePublicToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: limit.headers });
  }
  try {
    const res = NextResponse.json({ message: 'Dream API alive!' });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;
  } catch (e: any) {
    captureServerError(e, { route: "/api/dream", method: "GET" });
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
