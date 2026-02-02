/**
 * Redis caching utilities for expensive calculations
 * Saju, Tarot, Destiny Map results
 */

import { createClient, RedisClientType } from 'redis';
import { logger } from '@/lib/logger';
import type { CacheResult, CacheWriteResult } from './types';

let redisClient: RedisClientType | null = null;

/**
 * Get or create Redis client
 */
async function getRedisClient(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        keepAlive: true,
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            logger.error('[Redis] Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 200, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error('[Redis] Connection error', { error: err });
    });

    try {
      await redisClient.connect();
    } catch (error) {
      logger.error('[Redis] Failed to connect', { error });
      redisClient = null;
      return null;
    }
  }

  return redisClient;
}

/**
 * Cache configuration for different data types
 */
export const CACHE_TTL = {
  SAJU_RESULT: 60 * 60 * 24 * 7, // 7 days (사주는 불변)
  TAROT_READING: 60 * 60 * 24, // 1 day (타로는 매일 변경 가능)
  DESTINY_MAP: 60 * 60 * 24 * 3, // 3 days
  GRADING_RESULT: 60 * 60 * 24, // 1 day
  CALENDAR_DATA: 60 * 60 * 24, // 1 day
  COMPATIBILITY: 60 * 60 * 24 * 7, // 7 days
  TRANSIT_CHART: 60 * 60, // 1 hour (천체 트랜짓은 시간 단위로 변동)
} as const;

/**
 * Cache get with structured result — distinguishes miss from error.
 */
export async function cacheGetResult<T>(key: string): Promise<CacheResult<T>> {
  try {
    const client = await getRedisClient();
    if (!client) {return { hit: false, data: null };}

    const data = await client.get(key);
    if (!data) {return { hit: false, data: null };}

    return { hit: true, data: JSON.parse(data) as T };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn('[Redis] Get failed, falling back to uncached path', { key, error });
    return { hit: false, data: null, error: err };
  }
}

/**
 * Cache get — returns value or null (backward-compatible convenience wrapper).
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const result = await cacheGetResult<T>(key);
  return result.hit ? result.data : null;
}

/**
 * Cache set with structured result.
 */
export async function cacheSetResult(
  key: string,
  value: unknown,
  ttl: number = 3600
): Promise<CacheWriteResult> {
  try {
    const client = await getRedisClient();
    if (!client) {return { ok: false, error: new Error('Redis client unavailable') };}

    await client.setEx(key, ttl, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.warn('[Redis] Set failed', { key, error });
    return { ok: false, error: err };
  }
}

/**
 * Cache set — returns boolean (backward-compatible convenience wrapper).
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttl: number = 3600
): Promise<boolean> {
  const result = await cacheSetResult(key, value, ttl);
  return result.ok;
}

/**
 * Cache delete — returns boolean (cache-aside pattern).
 */
export async function cacheDel(key: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) {return false;}

    await client.del(key);
    return true;
  } catch (error) {
    logger.warn('[Redis] Delete failed', { key, error });
    return false;
  }
}

/**
 * Cache key generators with versioning for automatic invalidation
 *
 * Versioning strategy:
 * - Include version in key (e.g., "saju:v1:...")
 * - Increment version when calculation logic changes
 * - Old cache entries become stale automatically
 */
export const CacheKeys = {
  saju: (birthDate: string, birthTime: string, gender: string) =>
    `saju:v1:${birthDate}:${birthTime}:${gender}`,

  tarot: (userId: string, question: string, spread: string) =>
    `tarot:v1:${userId}:${btoa(question)}:${spread}`,

  destinyMap: (birthDate: string, birthTime: string) =>
    `destiny:v1:${birthDate}:${birthTime}`,

  grading: (date: string, sajuData: string) =>
    `grade:v1:${date}:${btoa(sajuData).slice(0, 20)}`,

  calendar: (year: number, month: number, userId: string) =>
    `cal:v1:${year}:${month}:${userId}`,

  yearlyCalendar: (birthDate: string, birthTime: string, gender: string, year: number, category?: string) =>
    `yearly:v2:${birthDate}:${birthTime}:${gender}:${year}${category ? `:${category}` : ''}`, // v2: 날짜 필터링 제거

  compatibility: (person1: string, person2: string) =>
    `compat:v1:${person1}:${person2}`,

  transitChart: (latitude: number, longitude: number) => {
    const now = new Date();
    const dateHour = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
    return `transit:v1:${dateHour}:${latitude.toFixed(2)}:${longitude.toFixed(2)}`;
  },
} as const;

/**
 * Wrapper for cache-or-calculate pattern
 */
export async function cacheOrCalculate<T>(
  key: string,
  calculate: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Calculate
  const result = await calculate();

  // Cache the result (fire and forget)
  cacheSet(key, result, ttl).catch((err) => {
    logger.error('[Redis] Background cache set failed', { error: err });
  });

  return result;
}

/**
 * Batch cache operations
 */
export async function cacheGetMany<T>(keys: string[]): Promise<(T | null)[]> {
  try {
    const client = await getRedisClient();
    if (!client) {return keys.map(() => null);}

    const results = await client.mGet(keys);
    return results.map((data) => (data ? JSON.parse(data) as T : null));
  } catch (error) {
    logger.error('[Redis] Batch get error', { error });
    return keys.map(() => null);
  }
}

/**
 * Clear cache by pattern
 */
export async function clearCacheByPattern(pattern: string): Promise<number> {
  try {
    const client = await getRedisClient();
    if (!client) {return 0;}

    const keys = await client.keys(pattern);
    if (keys.length === 0) {return 0;}

    await client.del(keys);
    return keys.length;
  } catch (error) {
    logger.error('[Redis] Clear pattern error', { error });
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheInfo() {
  try {
    const client = await getRedisClient();
    if (!client) {return null;}

    const info = await client.info('stats');
    return info;
  } catch (error) {
    logger.error('[Redis] Info error', { error });
    return null;
  }
}
