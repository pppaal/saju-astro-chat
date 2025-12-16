// src/lib/redis-cache.ts
// Simple Redis cache using Upstash REST API

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Get cached value from Redis
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;

  try {
    const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.result) return null;

    return JSON.parse(data.result) as T;
  } catch (err) {
    console.error("[Redis Cache] GET error:", err);
    return null;
  }
}

/**
 * Set cached value in Redis with TTL
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 86400 // default 24 hours
): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return false;

  try {
    const res = await fetch(`${UPSTASH_URL}/set/${encodeURIComponent(key)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value: JSON.stringify(value),
        ex: ttlSeconds,
      }),
      cache: "no-store",
    });

    return res.ok;
  } catch (err) {
    console.error("[Redis Cache] SET error:", err);
    return false;
  }
}

/**
 * Generate cache key from object
 */
export function makeCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}:${params[k]}`)
    .join("|");
  return `${prefix}:${sorted}`;
}
