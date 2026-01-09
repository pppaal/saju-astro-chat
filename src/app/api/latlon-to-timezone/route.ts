import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { captureServerError } from '@/lib/telemetry';
import { requirePublicToken } from '@/lib/auth/publicToken';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`tz:${ip}`, { limit: 60, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: limit.headers });
    }
    const tokenCheck = requirePublicToken(req); if (!tokenCheck.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: limit.headers });
    }

    const { lat, lon } = await req.json();

    const latitude = Number(lat);
    const longitude = Number(lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: 'invalid lat/lon' }, { status: 400, headers: limit.headers });
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: 'lat/lon out of range' }, { status: 400, headers: limit.headers });
    }

    const { default: tzLookup } = await import('tz-lookup');
    const timeZone = tzLookup(latitude, longitude);
    const res = NextResponse.json({ timeZone });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;
  } catch (e: unknown) {
    captureServerError(e, { route: "/api/latlon-to-timezone" });
    return NextResponse.json({ error: e instanceof Error ? e.message : 'server error' }, { status: 500 });
  }
}
