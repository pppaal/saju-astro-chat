// Lightweight rate limiter using Upstash REST API.
// In production, missing Redis credentials blocks requests; in dev, it allows all.

import { recordCounter } from "@/lib/metrics";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  headers: Headers;
};

async function incrementCounter(key: string, windowSeconds: number) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;

  const url = `${UPSTASH_URL}/pipeline`;
  const body = JSON.stringify([
    ["INCR", key],
    ["EXPIRE", key, windowSeconds],
  ]);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) return null;
  const data = await res.json().catch(() => null);

  // Upstash pipeline returns: [{ result: 1 }, { result: "OK" }]
  if (!Array.isArray(data) || !data[0] || typeof data[0].result !== "number") {
    return null;
  }
  return data[0].result as number; // current count after increment
}

export async function rateLimit(
  key: string,
  {
    limit = 60,
    windowSeconds = 60,
  }: { limit?: number; windowSeconds?: number } = {}
): Promise<RateLimitResult> {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", String(limit));

  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    if (process.env.NODE_ENV === "production") {
      console.error("[SECURITY] Rate limiting not configured in production (UPSTASH_REDIS_REST_URL/TOKEN missing)");
      recordCounter("api.rate_limit.misconfig", 1, { env: "prod" });
      headers.set("X-RateLimit-Policy", "enforced-no-backend");
      headers.set("X-RateLimit-Remaining", "0");
      headers.set("X-RateLimit-Reset", "0");
      return { allowed: false, limit, remaining: 0, reset: 0, headers };
    }
    // Dev mode: allow all if Redis is not configured.
    headers.set("X-RateLimit-Policy", "disabled-dev");
    headers.set("X-RateLimit-Remaining", "unlimited");
    headers.set("X-RateLimit-Reset", "0");
    return { allowed: true, limit, remaining: limit, reset: 0, headers };
  }

  const reset = Math.floor(Date.now() / 1000) + windowSeconds;
  headers.set("X-RateLimit-Reset", String(reset));

  try {
    const count = await incrementCounter(key, windowSeconds);
    if (count === null) {
      // Redis unavailable: fail closed in prod, open in dev.
      if (process.env.NODE_ENV === "production") {
        console.error("[SECURITY] Rate limit check failed - blocking request in production");
        recordCounter("api.rate_limit.blocked", 1, { env: "prod" });
        headers.set("X-RateLimit-Policy", "error-blocked");
        headers.set("X-RateLimit-Remaining", "0");
        return { allowed: false, limit, remaining: 0, reset, headers };
      }
      headers.set("X-RateLimit-Remaining", "unknown");
      headers.set("X-RateLimit-Policy", "error-dev");
      return { allowed: true, limit, remaining: limit, reset, headers };
    }

    const remaining = Math.max(0, limit - count);
    headers.set("X-RateLimit-Remaining", String(remaining));
    if (count > limit) {
      recordCounter("api.rate_limit.hit", 1, { key });
    }
    return {
      allowed: count <= limit,
      limit,
      remaining,
      reset,
      headers,
    };
  } catch {
    // Unexpected error: fail closed in prod, open in dev.
    if (process.env.NODE_ENV === "production") {
      console.error("[SECURITY] Rate limit exception - blocking request in production");
      recordCounter("api.rate_limit.blocked", 1, { env: "prod" });
      headers.set("X-RateLimit-Policy", "exception-blocked");
      headers.set("X-RateLimit-Remaining", "0");
      return { allowed: false, limit, remaining: 0, reset, headers };
    }
    headers.set("X-RateLimit-Remaining", "unknown");
    headers.set("X-RateLimit-Policy", "error-dev");
    return { allowed: true, limit, remaining: limit, reset, headers };
  }
}
