// src/lib/redis-cache.ts
// Simple Redis cache using Upstash REST API

import { logger } from "@/lib/logger";

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

    const parsed = JSON.parse(data.result);

    // Handle legacy format where value was wrapped in { value, ex } object
    // This ensures backward compatibility with old cache entries
    if (parsed && typeof parsed === 'object' && 'value' in parsed && 'ex' in parsed) {
      logger.debug("[Redis Cache] Converting legacy cache format");
      // The 'value' field contains the actual stringified data
      if (typeof parsed.value === 'string') {
        return JSON.parse(parsed.value) as T;
      }
      return parsed.value as T;
    }

    return parsed as T;
  } catch (err) {
    logger.error("[Redis Cache] GET error:", err);
    return null;
  }
}

/**
 * Set cached value in Redis with TTL
 * Uses Upstash REST API pipeline format: [["SET", key, value, "EX", seconds]]
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 86400 // default 24 hours
): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return false;

  try {
    // Use Upstash pipeline format for SET with EX (expiry)
    // This is the correct way to set a value with TTL
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["SET", key, JSON.stringify(value), "EX", ttlSeconds],
      ]),
      cache: "no-store",
    });

    return res.ok;
  } catch (err) {
    logger.error("[Redis Cache] SET error:", err);
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
