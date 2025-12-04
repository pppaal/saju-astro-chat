import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { captureServerError } from '@/lib/telemetry';
import { requirePublicToken } from '@/lib/auth/publicToken';

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

    const body = await req.json();
    const persons: PersonInput[] = Array.isArray(body?.persons) ? body.persons : [];

    if (persons.length < 2 || persons.length > 4) {
      return bad('Provide between 2 and 4 people for compatibility.', 400, limit.headers);
    }

    for (let i = 0; i < persons.length; i++) {
      const p = persons[i];
      if (!p?.date || !p?.time || !p?.timeZone) {
        return bad(`${i + 1}: date, time, and timeZone are required.`, 400, limit.headers);
      }
      if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') {
        return bad(`${i + 1}: latitude/longitude must be numbers.`, 400, limit.headers);
      }
      if (i > 0 && !p.relationToP1) {
        return bad(`${i + 1}: relationToP1 is required.`, 400, limit.headers);
      }
      if (i > 0 && p.relationToP1 === 'other' && !p.relationNoteToP1?.trim()) {
        return bad(`${i + 1}: add a short note for relationToP1 = "other".`, 400, limit.headers);
      }
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
    lines.push('');
    lines.push('Note: This is a playful heuristic score, not professional guidance.');

    const res = NextResponse.json({
      interpretation: lines.join('\n'),
      pairs: scores,
      average: avg,
    });
    return withHeaders(res, limit.headers);
  } catch (e: any) {
    captureServerError(e, { route: "/api/compatibility" });
    return bad(e?.message || 'Unexpected server error', 500);
  }
}
