// Lightweight rate limiter using Upstash REST API.
// In production, missing Redis credentials blocks requests; in dev, it allows all.
// Includes in-memory fallback for Redis failures to prevent server downtime.

import { recordCounter } from "@/lib/metrics";
import { logger } from "@/lib/logger";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory fallback rate limiter for when Redis is unavailable
// Uses a simple sliding window approach with automatic cleanup
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();
const CLEANUP_INTERVAL_MS = 60_000; // Clean up expired entries every minute
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  const nowSeconds = Math.floor(now / 1000);

  for (const [key, value] of inMemoryStore) {
    if (value.resetAt < nowSeconds) {
      inMemoryStore.delete(key);
    }
  }
}

function inMemoryIncrement(key: string, windowSeconds: number): number {
  cleanupExpiredEntries();

  const now = Math.floor(Date.now() / 1000);
  const existing = inMemoryStore.get(key);

  if (existing && existing.resetAt > now) {
    existing.count++;
    return existing.count;
  }

  // New window
  inMemoryStore.set(key, { count: 1, resetAt: now + windowSeconds });
  return 1;
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
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
      logger.error("[SECURITY] Rate limiting not configured in production (UPSTASH_REDIS_REST_URL/TOKEN missing)");
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

  // Helper to build rate limit result with Retry-After header
  const buildResult = (count: number, policy?: string): RateLimitResult => {
    const remaining = Math.max(0, limit - count);
    const allowed = count <= limit;
    const retryAfter = allowed ? undefined : reset - Math.floor(Date.now() / 1000);

    headers.set("X-RateLimit-Remaining", String(remaining));
    if (policy) {
      headers.set("X-RateLimit-Policy", policy);
    }
    if (!allowed && retryAfter && retryAfter > 0) {
      headers.set("Retry-After", String(retryAfter));
    }
    if (count > limit) {
      recordCounter("api.rate_limit.hit", 1, { key });
    }

    return { allowed, limit, remaining, reset, retryAfter, headers };
  };

  try {
    const count = await incrementCounter(key, windowSeconds);
    if (count === null) {
      // Redis unavailable: use in-memory fallback instead of blocking
      logger.warn("[RATE_LIMIT] Redis unavailable, using in-memory fallback");
      recordCounter("api.rate_limit.fallback", 1, { reason: "redis_unavailable" });

      const fallbackCount = inMemoryIncrement(key, windowSeconds);
      return buildResult(fallbackCount, "in-memory-fallback");
    }

    return buildResult(count);
  } catch (err) {
    // Redis error: use in-memory fallback instead of blocking
    logger.warn("[RATE_LIMIT] Redis error, using in-memory fallback:", err);
    recordCounter("api.rate_limit.fallback", 1, { reason: "redis_error" });

    const fallbackCount = inMemoryIncrement(key, windowSeconds);
    return buildResult(fallbackCount, "in-memory-fallback");
  }
}
