import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { captureServerError } from '@/lib/telemetry';
import { requirePublicToken } from '@/lib/auth/publicToken';

type InsightResponse = {
  summary?: string;
  dreamSymbols?: { label: string; meaning: string }[];
  astrology?: { highlights: string[]; sun?: string; moon?: string; asc?: string };
  crossInsights?: string[];
  recommendations?: string[];
  themes?: { label: string; weight: number }[];
  error?: string;
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = await rateLimit(`dream-insight:${ip}`, { limit: 10, windowSeconds: 60 });

  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: limit.headers });
  }

  if (!requirePublicToken(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: limit.headers });
  }

  try {
    const body = await req.json();
    const { dream, birth: _birth } = body;

    if (!dream || typeof dream !== 'string' || dream.trim().length < 10) {
      return NextResponse.json(
        { error: 'Please provide a detailed dream description (at least 10 characters)' },
        { status: 400, headers: limit.headers }
      );
    }

    // Mock response for now - replace with actual AI analysis later
    const response: InsightResponse = {
      summary: `Your dream reflects themes of ${dream.includes('fly') ? 'freedom and aspiration' : 'exploration and discovery'}. The symbols suggest a period of personal transformation.`,
      dreamSymbols: [
        { label: 'Main Theme', meaning: 'Personal growth and transformation' },
        { label: 'Emotional Tone', meaning: 'Curiosity and wonder' }
      ],
      themes: [
        { label: 'Transformation', weight: 0.85 },
        { label: 'Discovery', weight: 0.65 },
        { label: 'Growth', weight: 0.75 }
      ],
      astrology: {
        highlights: ['Your chart suggests heightened intuition during dream time'],
        sun: 'Influences clarity of vision',
        moon: 'Governs emotional dreamscape'
      },
      crossInsights: [
        'Dream themes align with current astrological transits',
        'Subconscious processing recent life events'
      ],
      recommendations: [
        'Journal your dreams regularly',
        'Reflect on recurring symbols',
        'Trust your intuition'
      ]
    };

    const res = NextResponse.json(response);
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;

  } catch (e: any) {
    captureServerError(e, { route: "/api/dream-insight", method: "POST" });
    return NextResponse.json(
      { error: e?.message || "server error" },
      { status: 500 }
    );
  }
}
