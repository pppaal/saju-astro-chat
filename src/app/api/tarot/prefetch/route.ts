// src/app/api/tarot/prefetch/route.ts
// Prefetch RAG context while user is selecting cards

import { NextResponse } from "next/server";
import { getBackendUrl as pickBackendUrl } from "@/lib/backend-url";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { enforceBodySize } from "@/lib/http";

const MAX_ID_LEN = 64;
const BODY_LIMIT = 8 * 1024;
type TarotPrefetchBody = {
  categoryId?: string;
  spreadId?: string;
};

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`tarot-prefetch:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: limit.headers });
    }
    if (!requirePublicToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const oversized = enforceBodySize(req, BODY_LIMIT, limit.headers);
    if (oversized) return oversized;

    const body = (await req.json().catch(() => null)) as TarotPrefetchBody | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: limit.headers });
    }
    const categoryIdRaw = typeof body.categoryId === "string" ? body.categoryId.trim() : "";
    const spreadIdRaw = typeof body.spreadId === "string" ? body.spreadId.trim() : "";
    const categoryId = categoryIdRaw.slice(0, MAX_ID_LEN);
    const spreadId = spreadIdRaw.slice(0, MAX_ID_LEN);
    if (!categoryId || !spreadId) {
      return NextResponse.json({ error: "categoryId and spreadId are required" }, { status: 400, headers: limit.headers });
    }

    // Fire-and-forget prefetch to backend
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    fetch(`${pickBackendUrl()}/api/tarot/prefetch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
      },
      body: JSON.stringify({ categoryId, spreadId }),
      signal: controller.signal,
      cache: "no-store",
    }).catch(() => {}).finally(() => clearTimeout(timeoutId)); // Ignore errors silently

    const res = NextResponse.json({ status: "prefetching" }, { headers: limit.headers });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;
  } catch {
    return NextResponse.json({ status: "ok" });
  }
}
