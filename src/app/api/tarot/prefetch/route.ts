// src/app/api/tarot/prefetch/route.ts
// Prefetch RAG context while user is selecting cards

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { enforceBodySize } from "@/lib/http";

function pickBackendUrl() {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.BACKEND_AI_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    "http://localhost:5000";
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[tarot prefetch] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn("[tarot prefetch] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
  return url;
}

const MAX_ID_LEN = 64;
const BODY_LIMIT = 8 * 1024;

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

    const oversized = enforceBodySize(req as any, BODY_LIMIT, limit.headers);
    if (oversized) return oversized;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: limit.headers });
    }
    const categoryIdRaw = typeof (body as any).categoryId === "string" ? (body as any).categoryId.trim() : "";
    const spreadIdRaw = typeof (body as any).spreadId === "string" ? (body as any).spreadId.trim() : "";
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
