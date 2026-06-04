/**
 * Redis caching utilities for expensive calculations
 * Saju, Tarot, Destiny Map results
 *
 * Uses @upstash/redis (HTTP/REST) — no persistent connections needed.
 */

import { Redis } from '@upstash/redis'
import { logger } from '@/lib/logger'
import type { CacheResult, CacheWriteResult } from './types'

let redis: Redis | null = null

/**
 * Base64 encoding that works in both Node.js and browser
 */
function safeBase64Encode(str: string): string {
  if (typeof window !== 'undefined' && typeof window.btoa !== 'undefined') {
    return btoa(str)
  }
  return Buffer.from(str, 'utf-8').toString('base64')
}

/**
 * Get or create Upstash Redis client (singleton, stateless HTTP — no connection management needed)
 */
function getRedisClient(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  if (redis) {
    return redis
  }

  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })

  return redis
}

/**
 * Gracefully disconnect Redis client
 * No-op for Upstash (HTTP-based, no persistent connection)
 */
export async function disconnectRedis(): Promise<void> {
  // Upstash uses HTTP REST — nothing to disconnect
  redis = null
}

/**
 * Cache configuration for different data types
 */
export const CACHE_TTL = {
  TAROT_READING: 60 * 60 * 24, // 1 day (oracle)
  CALENDAR_DATA: 60 * 60 * 24, // 1 day (counselor realtime daily context, calendar route)
  COMPATIBILITY: 60 * 60 * 24 * 7, // 7 days (destiny-match discover)
  NATAL_CHART: 60 * 60 * 24 * 30, // 30 days (counselor stable context, ephe-cache)
} as const

/**
 * Validate cache key format
 */
function validateCacheKey(key: string): void {
  if (!key || typeof key !== 'string') {
    throw new Error('Cache key must be a non-empty string')
  }
  if (key.length > 512) {
    throw new Error('Cache key too long (max 512 characters)')
  }
  // Prevent key injection attacks
  if (key.includes('\n') || key.includes('\r')) {
    throw new Error('Cache key contains invalid characters')
  }
}

/**
 * Cache get with structured result — distinguishes miss from error.
 */
export async function cacheGetResult<T>(key: string): Promise<CacheResult<T>> {
  try {
    validateCacheKey(key)

    const client = getRedisClient()
    if (!client) {
      return { hit: false, data: null }
    }

    const data = await client.get<T>(key)
    if (data === null || data === undefined) {
      return { hit: false, data: null }
    }

    return { hit: true, data }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.warn('[Redis] Get failed, falling back to uncached path', { key, error })
    return { hit: false, data: null, error: err }
  }
}

/**
 * Cache get — returns value or null (backward-compatible convenience wrapper).
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const result = await cacheGetResult<T>(key)
  return result.hit ? result.data : null
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
    validateCacheKey(key)

    if (ttl <= 0 || ttl > 31536000) {
      // Max 1 year
      throw new Error('TTL must be between 1 second and 1 year')
    }

    const client = getRedisClient()
    if (!client) {
      return { ok: false, error: new Error('Redis client unavailable') }
    }

    await client.set(key, JSON.stringify(value), { ex: ttl })
    return { ok: true }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.warn('[Redis] Set failed', { key, error })
    return { ok: false, error: err }
  }
}

/**
 * Cache set — returns boolean (backward-compatible convenience wrapper).
 */
export async function cacheSet(key: string, value: unknown, ttl: number = 3600): Promise<boolean> {
  const result = await cacheSetResult(key, value, ttl)
  return result.ok
}

/**
 * Cache delete with error result
 */
export async function cacheDelResult(key: string): Promise<CacheWriteResult> {
  try {
    validateCacheKey(key)

    const client = getRedisClient()
    if (!client) {
      return { ok: false, error: new Error('Redis client unavailable') }
    }

    await client.del(key)
    return { ok: true }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.warn('[Redis] Delete failed', { key, error })
    return { ok: false, error: err }
  }
}

/**
 * Cache delete — returns boolean (backward-compatible convenience wrapper).
 */
export async function cacheDel(key: string): Promise<boolean> {
  const result = await cacheDelResult(key)
  return result.ok
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
  // v2: lunarLeap + timezone 추가. v1 키는 (a) 윤4월/평4월 충돌 (b) 동일 lunar
  // Y/M/D 서로 다른 타임존 사용자 충돌이 있어 정확성 회귀가 있었음. 키 형태가
  // 바뀌므로 prefix 도 v1 → v2 로 bump. 이전 캐시는 자연 만료.
  saju: (
    birthDate: string,
    birthTime: string,
    gender: string,
    calendar: string = 'solar',
    timezone: string = 'Asia/Seoul',
    lunarLeap: boolean = false,
    // 진태양시(진경도) 보정 경도. 도시별로 시주가 달라지므로 키에 포함해야
    // 다른 도시 사용자끼리 캐시가 섞이지 않는다. 경도 없으면 옛 키 형태 유지.
    longitude?: number
  ) =>
    `saju:v2:${birthDate}:${birthTime}:${gender}:${calendar}:${timezone}:${lunarLeap ? 'L' : 'N'}` +
    (typeof longitude === 'number' && Number.isFinite(longitude)
      ? `:lon=${longitude.toFixed(4)}`
      : ''),

  tarot: (userId: string, question: string, spread: string) =>
    `tarot:v1:${userId}:${safeBase64Encode(question)}:${spread}`,

  destinyMap: (birthDate: string, birthTime: string) => `destiny:v1:${birthDate}:${birthTime}`,

  grading: (date: string, sajuData: string) =>
    `grade:v1:${date}:${safeBase64Encode(sajuData).slice(0, 20)}`,

  calendar: (year: number, month: number, userId: string) => `cal:v1:${year}:${month}:${userId}`,

  /** fusion bundle (sajuLayers + astroLayers + 18테마 cross) — birth + targetDate 기반 */
  fusionDateDetail: (birthDate: string, birthTime: string, date: string) =>
    `fusion:dd:v1:${birthDate}:${birthTime}:${date}`,

  calendarAINarrative: (userId: string, date: string, payloadKey: string) =>
    `cal-ai:v1:${userId}:${date}:${safeBase64Encode(payloadKey).slice(0, 32)}`,

  calendarAIMonthly: (userId: string, yearMonth: string, payloadKey: string) =>
    `cal-ai-month:v1:${userId}:${yearMonth}:${safeBase64Encode(payloadKey).slice(0, 32)}`,

  yearlyCalendar: (
    birthDate: string,
    birthTime: string,
    gender: string,
    year: number,
    category?: string,
    birthPlace?: string
  ) =>
    `yearly:v6:${birthDate}:${birthTime}:${gender}:${year}:${category || 'all'}:${safeBase64Encode(
      birthPlace || 'Seoul'
    )}`,

  compatibility: (person1: string, person2: string) => `compat:v1:${person1}:${person2}`,

  transitChart: (latitude: number, longitude: number) => {
    const now = new Date()
    const dateHour = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`
    return `transit:v1:${dateHour}:${latitude.toFixed(2)}:${longitude.toFixed(2)}`
  },

  natalChart: (birthDate: string, birthTime: string, latitude: number, longitude: number) =>
    `natal:v1:${birthDate}:${birthTime}:${latitude.toFixed(2)}:${longitude.toFixed(2)}`,
} as const

/**
 * SCAN patterns aligned with CacheKeys above — used by invalidation paths
 * (e.g. profile birth-info edits). Versions MUST be kept in sync with the
 * generators in CacheKeys, otherwise SCAN finds no matches and stale data
 * survives until TTL.
 */
export const CacheInvalidationPatterns = {
  /**
   * Matches `saju:v*:${birthDate}:*` entries across versions. Wildcarding the
   * version segment covers both currently-live keys and any not-yet-evicted
   * older-version entries after a CacheKeys.saju version bump.
   */
  sajuByBirthDate: (birthDate: string) => `saju:v*:${birthDate}:*`,
  /** Matches all `destiny:v1:${birthDate}:*` entries (any birthTime). */
  destinyByBirthDate: (birthDate: string) => `destiny:v1:${birthDate}:*`,
  /** Matches all `yearly:v6:${birthDate}:*` entries (any birthTime/gender/year/category/place). */
  yearlyByBirthDate: (birthDate: string) => `yearly:v6:${birthDate}:*`,
  /**
   * Matches all `cal:v1:${year}:${month}:${userId}` entries for one user.
   * userId is the LAST segment — wildcards stand in for year and month.
   */
  calendarByUser: (userId: string) => `cal:v1:*:*:${userId}`,
} as const

/**
 * Wrapper for cache-or-calculate pattern
 */
export async function cacheOrCalculate<T>(
  key: string,
  calculate: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key)
  if (cached !== null) {
    return cached
  }

  // Calculate
  const result = await calculate()

  // Cache the result (fire and forget)
  cacheSet(key, result, ttl).catch((err) => {
    logger.error('[Redis] Background cache set failed', { error: err })
  })

  return result
}

/**
 * Batch cache operations with result
 */
export async function cacheGetManyResult<T>(keys: string[]): Promise<CacheResult<(T | null)[]>> {
  try {
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error('Keys must be a non-empty array')
    }

    // Validate all keys
    keys.forEach(validateCacheKey)

    const client = getRedisClient()
    if (!client) {
      return { hit: false, data: null }
    }

    const results = await client.mget<(T | null)[]>(...keys)
    return { hit: true, data: results }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    logger.error('[Redis] Batch get error', { error })
    return { hit: false, data: null, error: err }
  }
}

/**
 * Batch cache operations (backward-compatible wrapper)
 */
export async function cacheGetMany<T>(keys: string[]): Promise<(T | null)[]> {
  const result = await cacheGetManyResult<T>(keys)
  return result.data || keys.map(() => null)
}

/**
 * Clear cache by pattern using SCAN (production-safe, non-blocking)
 */
export async function clearCacheByPattern(pattern: string): Promise<number> {
  try {
    if (!pattern || typeof pattern !== 'string') {
      throw new Error('Pattern must be a non-empty string')
    }

    const client = getRedisClient()
    if (!client) {
      return 0
    }

    let cursor = 0 as number | string
    let deletedCount = 0

    do {
      const result: [number | string, string[]] = await client.scan(cursor, {
        match: pattern,
        count: 100,
      })

      cursor = result[0]
      const keys = result[1]

      if (keys.length > 0) {
        await client.del(...keys)
        deletedCount += keys.length
      }
    } while (String(cursor) !== '0')

    if (deletedCount > 0) {
      logger.info(`[Redis] Cleared ${deletedCount} keys matching pattern: ${pattern}`)
    }

    return deletedCount
  } catch (error) {
    logger.error('[Redis] Clear pattern error', { pattern, error })
    return 0
  }
}

/**
 * Get cache info (simplified for Upstash — returns connection status)
 */
export async function getCacheInfo(): Promise<string | null> {
  try {
    const client = getRedisClient()
    if (!client) {
      return null
    }

    const pong = await client.ping()
    return pong === 'PONG' ? 'connected' : null
  } catch (error) {
    logger.error('[Redis] Info error', { error })
    return null
  }
}

/**
 * Generate cache key from object with optional versioning
 */
export function makeCacheKey(
  prefix: string,
  params: Record<string, unknown>,
  version: number = 1
): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}:${params[k]}`)
    .join('|')
  return `${prefix}:v${version}:${sorted}`
}

// Aliases for backwards compatibility
const getCache = cacheGet
const setCache = cacheSet
