// Lightweight rate limiter using Upstash REST API.
// If Upstash envs are missing, the limiter is a no-op (always allowed).

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
  if (!data?.result || !Array.isArray(data.result) || typeof data.result[0] !== "number") {
    return null;
  }
  return data.result[0] as number; // current count after increment
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
    headers.set("X-RateLimit-Policy", "disabled");
    headers.set("X-RateLimit-Remaining", "unlimited");
    headers.set("X-RateLimit-Reset", "0");
    return { allowed: true, limit, remaining: limit, reset: 0, headers };
  }

  const reset = Math.floor(Date.now() / 1000) + windowSeconds;
  headers.set("X-RateLimit-Reset", String(reset));

  try {
    const count = await incrementCounter(key, windowSeconds);
    if (count === null) {
      headers.set("X-RateLimit-Remaining", "unknown");
      headers.set("X-RateLimit-Policy", "error");
      return { allowed: true, limit, remaining: limit, reset, headers };
    }

    const remaining = Math.max(0, limit - count);
    headers.set("X-RateLimit-Remaining", String(remaining));
    return {
      allowed: count <= limit,
      limit,
      remaining,
      reset,
      headers,
    };
  } catch {
    headers.set("X-RateLimit-Remaining", "unknown");
    headers.set("X-RateLimit-Policy", "error");
    return { allowed: true, limit, remaining: limit, reset, headers };
  }
}
