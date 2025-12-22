import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { captureServerError } from '@/lib/telemetry';
import { requirePublicToken } from '@/lib/auth/publicToken';
import { enforceBodySize } from '@/lib/http';

type Relation = 'friend' | 'lover' | 'other';

type PersonInput = {
  name?: string;
  date: string;     // YYYY-MM-DD
  time: string;     // HH:mm
  city: string;
  latitude: number;
  longitude: number;
  timeZone: string; // e.g., Asia/Seoul
  relationToP1?: Relation;
  relationNoteToP1?: string;
};

function withHeaders(res: NextResponse, headers?: Headers) {
  headers?.forEach((value, key) => res.headers.set(key, value));
  return res;
}

function bad(msg: string, status = 400, headers?: Headers) {
  return withHeaders(NextResponse.json({ error: msg }, { status }), headers);
}

function relationWeight(r?: Relation) {
  if (!r) return 1.0;
  if (r === 'lover') return 1.0;
  if (r === 'friend') return 0.95;
  return 0.9; // other
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const MAX_NOTE = 240;
const MAX_NAME = 80;
const MAX_CITY = 120;

function sanitizeStr(value: unknown, max = 120) {
  return String(value ?? '').trim().slice(0, max);
}

function pickBackendUrl() {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    'http://127.0.0.1:5000';

  if (!url.startsWith('https://') && process.env.NODE_ENV === 'production') {
    console.warn('[Compatibility API] Using non-HTTPS AI backend in production');
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn('[Compatibility API] NEXT_PUBLIC_AI_BACKEND is exposed; prefer AI_BACKEND_URL');
  }
  return url;
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`compat:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!limit.allowed) {
      return bad('Too many requests. Please try again in a minute.', 429, limit.headers);
    }
    if (!requirePublicToken(req)) {
      return bad('Unauthorized', 401, limit.headers);
    }
    const oversized = enforceBodySize(req as any, 256 * 1024, limit.headers);
    if (oversized) return oversized;

    const body = await req.json();
    const persons: PersonInput[] = Array.isArray(body?.persons) ? body.persons : [];

    if (persons.length < 2 || persons.length > 4) {
      return bad('Provide between 2 and 4 people for compatibility.', 400, limit.headers);
    }

    for (let i = 0; i < persons.length; i++) {
      const p = persons[i] || ({} as PersonInput);
      p.name = sanitizeStr(p.name, MAX_NAME);
      p.city = sanitizeStr(p.city, MAX_CITY);
      p.relationNoteToP1 = sanitizeStr(p.relationNoteToP1, MAX_NOTE);

      if (!p?.date || !p?.time || !p?.timeZone) {
        return bad(`${i + 1}: date, time, and timeZone are required.`, 400, limit.headers);
      }
      if (!DATE_RE.test(p.date) || Number.isNaN(Date.parse(p.date))) {
        return bad(`${i + 1}: date must be YYYY-MM-DD.`, 400, limit.headers);
      }
      if (!TIME_RE.test(p.time)) {
        return bad(`${i + 1}: time must be HH:mm (24h).`, 400, limit.headers);
      }
      if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') {
        return bad(`${i + 1}: latitude/longitude must be numbers.`, 400, limit.headers);
      }
      if (i > 0 && !p.relationToP1) {
        return bad(`${i + 1}: relationToP1 is required.`, 400, limit.headers);
      }
      if (i > 0 && !['friend', 'lover', 'other'].includes(p.relationToP1 as string)) {
        return bad(`${i + 1}: relationToP1 must be friend | lover | other.`, 400, limit.headers);
      }
      if (i > 0 && p.relationToP1 === 'other' && !p.relationNoteToP1?.trim()) {
        return bad(`${i + 1}: add a short note for relationToP1 = "other".`, 400, limit.headers);
      }
      persons[i] = p;
    }

    const names = persons.map((p, i) => p.name?.trim() || `Person ${i + 1}`);

    const pairs: [number, number][] = [];
    for (let i = 0; i < persons.length; i++) {
      for (let j = i + 1; j < persons.length; j++) pairs.push([i, j]);
    }

    const scores = pairs.map(([a, b]) => {
      const pa = persons[a];
      const pb = persons[b];
      const geo = Math.hypot(pa.latitude - pb.latitude, pa.longitude - pb.longitude);
      const base = Math.max(0, 100 - Math.min(100, Math.round(geo)));

      let weight = 1.0;
      if (a === 0) {
        weight = relationWeight(pb.relationToP1);
      } else if (b === 0) {
        weight = relationWeight(pa.relationToP1);
      } else {
        weight = (relationWeight(pa.relationToP1) + relationWeight(pb.relationToP1)) / 2;
      }

      const score = Math.round(base * weight);
      return { pair: [a, b], score };
    });

    const avg = Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length);

    const lines: string[] = [];
    lines.push(`People: ${persons.length}`);
    lines.push('');
    for (let i = 1; i < persons.length; i++) {
      const r = persons[i].relationToP1!;
      const rLabel = r === 'lover' ? 'Partner' : r === 'friend' ? 'Friend' : persons[i].relationNoteToP1 || 'Other';
      lines.push(`vs Person 1 -> ${names[i]}: ${rLabel}`);
    }
    lines.push('');
    scores.forEach(({ pair: [a, b], score }) => {
      lines.push(`${names[a]} & ${names[b]}: compatibility ${score}/100`);
    });
    lines.push('');
    lines.push(`Average: ${avg}/100`);

    // ======== AI backend call (GPT + Fusion) ========
    let aiInterpretation = '';
    let aiModelUsed = '';
    let aiScore: number | null = null;
    let timing: Record<string, unknown> | null = null;
    let actionItems: string[] = [];
    let isGroup = false;
    let groupAnalysis: Record<string, unknown> | null = null;
    let synergyBreakdown: Record<string, unknown> | null = null;
    const backendUrl = pickBackendUrl();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const apiToken = process.env.ADMIN_API_TOKEN;
      if (apiToken) {
        headers['X-API-KEY'] = apiToken;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      // Send to backend with full birth data for Saju+Astrology fusion analysis
      const aiResponse = await fetch(`${backendUrl}/api/compatibility`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          persons: persons.map((p, i) => ({
            name: names[i],
            birthDate: p.date,
            birthTime: p.time,
            latitude: p.latitude,
            longitude: p.longitude,
            timeZone: p.timeZone,
            relation: i > 0 ? p.relationToP1 : undefined,
            relationNote: i > 0 ? p.relationNoteToP1 : undefined,
          })),
          relationship_type: persons[1]?.relationToP1 || 'lover',
          locale: body?.locale || 'ko',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        // Handle both nested (data.report) and flat response formats
        aiInterpretation = aiData?.data?.report || aiData?.interpretation || '';
        aiModelUsed = aiData?.data?.model || aiData?.model || 'gpt-4o';
        // Get the AI-calculated overall score (Saju+Astrology fusion)
        aiScore = aiData?.data?.overall_score || aiData?.overall_score || null;
        // Get timing analysis
        timing = aiData?.data?.timing || aiData?.timing || null;
        // Get action items
        actionItems = aiData?.data?.action_items || aiData?.action_items || [];
        // Get group analysis data (for 3+ people)
        isGroup = aiData?.is_group || false;
        groupAnalysis = aiData?.group_analysis || null;
        synergyBreakdown = aiData?.synergy_breakdown || null;
      }
    } catch (aiErr) {
      console.warn('[Compatibility API] AI backend call failed:', aiErr);
      aiInterpretation = '';
      aiModelUsed = 'error-fallback';
    }

    // Use AI score if available, otherwise use geo-based fallback
    const finalScore = aiScore ?? avg;
    const fallbackInterpretation = lines.join('\n') + '\n\nNote: This is a playful heuristic score, not professional guidance.';

    // ======== 기록 저장 (로그인 사용자만) ========
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      try {
        await prisma.reading.create({
          data: {
            userId: session.user.id,
            type: 'compatibility',
            title: `${names.slice(0, 2).join(' & ')} 궁합 분석 (${finalScore}점)`,
            content: JSON.stringify({
              persons: persons.map((p, i) => ({
                name: names[i],
                date: p.date,
                time: p.time,
                relation: i > 0 ? p.relationToP1 : undefined,
              })),
              score: finalScore,
              pairScores: scores,
            }),
          },
        });
      } catch (saveErr) {
        console.warn('[Compatibility API] Failed to save reading:', saveErr);
      }
    }

    const res = NextResponse.json({
      interpretation: aiInterpretation || fallbackInterpretation,
      aiInterpretation,
      aiModelUsed,
      pairs: scores,
      average: finalScore,
      overall_score: finalScore,
      timing,
      action_items: actionItems,
      fusion_enabled: !!aiScore,
      is_group: isGroup,
      group_analysis: groupAnalysis,
      synergy_breakdown: synergyBreakdown,
    });
    res.headers.set('Cache-Control', 'no-store');
    return withHeaders(res, limit.headers);
  } catch (e: any) {
    captureServerError(e, { route: "/api/compatibility" });
    return bad(e?.message || 'Unexpected server error', 500);
  }
}
