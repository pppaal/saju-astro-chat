// src/lib/redis-cache.ts
// Simple Redis cache using Upstash REST API

import { logger } from "@/lib/logger";
import type { CacheResult, CacheWriteResult } from './cache/types';

// Re-export cache version management
export { CACHE_VERSIONS, getCacheKey } from './cache/cache-versions';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Get cached value with structured result — distinguishes miss from error.
 */
export async function cacheGetResult<T>(key: string): Promise<CacheResult<T>> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {return { hit: false, data: null };}

  try {
    const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache: "no-store",
    });

    if (!res.ok) {return { hit: false, data: null };}

    const data = await res.json();
    if (!data?.result) {return { hit: false, data: null };}

    const parsed = JSON.parse(data.result);

    // Handle legacy format where value was wrapped in { value, ex } object
    if (parsed && typeof parsed === 'object' && 'value' in parsed && 'ex' in parsed) {
      logger.debug("[Redis Cache] Converting legacy cache format");
      if (typeof parsed.value === 'string') {
        return { hit: true, data: JSON.parse(parsed.value) as T };
      }
      return { hit: true, data: parsed.value as T };
    }

    return { hit: true, data: parsed as T };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("[Redis Cache] GET error:", err);
    return { hit: false, data: null, error };
  }
}

/**
 * Get cached value — returns value or null (backward-compatible).
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const result = await cacheGetResult<T>(key);
  return result.hit ? result.data : null;
}

/**
 * Set cached value with structured result.
 */
export async function cacheSetResult(
  key: string,
  value: unknown,
  ttlSeconds: number = 86400
): Promise<CacheWriteResult> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return { ok: false, error: new Error('Upstash credentials not configured') };
  }

  try {
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

    if (res.ok) {return { ok: true };}
    return { ok: false, error: new Error(`Upstash SET failed: ${res.status}`) };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("[Redis Cache] SET error:", err);
    return { ok: false, error };
  }
}

/**
 * Set cached value — returns boolean (backward-compatible).
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = 86400
): Promise<boolean> {
  const result = await cacheSetResult(key, value, ttlSeconds);
  return result.ok;
}

/**
 * Generate cache key from object with optional versioning
 *
 * Version helps invalidate cache when logic changes:
 * - Increment version when calculation algorithm changes
 * - Old cache entries automatically become stale
 *
 * @param prefix - Cache key prefix (e.g., "saju", "tarot", "compatibility")
 * @param params - Parameters to include in key
 * @param version - Optional version number (default: 1)
 */
export function makeCacheKey(
  prefix: string,
  params: Record<string, unknown>,
  version: number = 1
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}:${params[k]}`)
    .join("|");
  return `${prefix}:v${version}:${sorted}`;
}
