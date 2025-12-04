import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { captureServerError } from '@/lib/telemetry';
import { requirePublicToken } from '@/lib/auth/publicToken';

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
    const res = NextResponse.json({ ok: true, data: body });
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
