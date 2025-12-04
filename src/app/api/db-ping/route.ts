// app/api/db-ping/route.ts
import { Client } from 'pg';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { captureServerError } from '@/lib/telemetry';

export const runtime = 'nodejs';

function json(data: any, status = 200, headers?: Headers) {
  const res = new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
  headers?.forEach((value, key) => res.headers.set(key, value));
  return res;
}

function authorize(req: Request) {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) return true; // no token configured, allow (development)
  return req.headers.get('x-admin-token') === token;
}

export async function GET(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`dbping:${ip}`, { limit: 10, windowSeconds: 60 });
    if (!limit.allowed) return json({ ok: false, error: 'Too many requests' }, 429, limit.headers);
    if (!authorize(req)) return json({ ok: false, error: 'Unauthorized' }, 401, limit.headers);

    const dbUrl = process.env.DATABASE_URL;
    const ca = process.env.DB_CA_PEM;

    if (!dbUrl) {
      return json({ ok: false, error: 'Missing env: DATABASE_URL' }, 500, limit.headers);
    }
    if (!ca) {
      return json({ ok: false, error: 'Missing env: DB_CA_PEM' }, 500, limit.headers);
    }

    const client = new Client({
      connectionString: dbUrl,
      ssl: { ca, rejectUnauthorized: true },
    });

    await client.connect();
    const r = await client.query('select 1');
    await client.end();

    return json({ ok: true, rows: r.rows }, 200, limit.headers);
  } catch (e: any) {
    captureServerError(e, { route: "/api/db-ping" });
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}
