/**
 * Redis caching utilities for expensive calculations
 * Saju, Tarot, Destiny Map results
 */

import { createClient, RedisClientType } from 'redis'
import { logger } from '@/lib/logger'
import type { CacheResult, CacheWriteResult } from './types'

let redisClient: RedisClientType | null = null
let isConnecting = false
let connectionPromise: Promise<RedisClientType | null> | null = null

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
 * Get or create Redis client with proper connection management
 * Prevents connection leaks by ensuring only one connection attempt at a time
 */
async function getRedisClient(): Promise<RedisClientType | null> {
  if (!process.env.REDIS_URL) {
    return null
  }

  // Return existing connected client
  if (redisClient?.isOpen) {
    return redisClient
  }

  // Wait for ongoing connection attempt
  if (isConnecting && connectionPromise) {
    return connectionPromise
  }

  // Start new connection
  isConnecting = true
  connectionPromise = (async () => {
    try {
      // Clean up any existing disconnected client
      if (redisClient && !redisClient.isOpen) {
        try {
          await redisClient.quit()
        } catch {
          // Ignore quit errors on already closed connections
        }
        redisClient = null
      }

      redisClient = createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          keepAlive: true,
          reconnectStrategy: (retries) => {
            if (retries > 5) {
              logger.error('[Redis] Max reconnection attempts reached')
              return new Error('Max reconnection attempts reached')
            }
            return Math.min(retries * 200, 3000)
          },
        },
      })

      redisClient.on('error', (err) => {
        logger.error('[Redis] Connection error', { error: err })
      })

      await redisClient.connect()
      logger.info('[Redis] Connected successfully')
      return redisClient
    } catch (error) {
      logger.error('[Redis] Failed to connect', { error })
      redisClient = null
      return null
    } finally {
      isConnecting = false
      connectionPromise = null
    }
  })()

  return connectionPromise
}

/**
 * Gracefully disconnect Redis client
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit()
      logger.info('[Redis] Disconnected successfully')
      redisClient = null
    } catch (error) {
      logger.error('[Redis] Error during disconnect', { error })
      // Force disconnect if graceful quit fails
      try {
        if (redisClient) {
          await redisClient.disconnect()
        }
        redisClient = null
      } catch (forceError) {
        logger.error('[Redis] Force disconnect failed', { error: forceError })
      }
    }
  }
}

/**
 * Setup cleanup handlers for graceful shutdown
 */
if (typeof process !== 'undefined') {
  const cleanup = async () => {
    await disconnectRedis()
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)
  process.on('exit', () => {
    // Synchronous cleanup on exit
    if (redisClient) {
      redisClient.disconnect().catch(() => {
        // Ignore errors during exit
      })
    }
  })
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

    const client = await getRedisClient()
    if (!client) {
      return { hit: false, data: null }
    }

    const data = await client.get(key)
    if (!data) {
      return { hit: false, data: null }
    }

    return { hit: true, data: JSON.parse(data) as T }
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

    const client = await getRedisClient()
    if (!client) {
      return { ok: false, error: new Error('Redis client unavailable') }
    }

    await client.setEx(key, ttl, JSON.stringify(value))
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

    const client = await getRedisClient()
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
  saju: (birthDate: string, birthTime: string, gender: string) =>
    `saju:v1:${birthDate}:${birthTime}:${gender}`,

  tarot: (userId: string, question: string, spread: string) =>
    `tarot:v1:${userId}:${safeBase64Encode(question)}:${spread}`,

  destinyMap: (birthDate: string, birthTime: string) => `destiny:v1:${birthDate}:${birthTime}`,

  grading: (date: string, sajuData: string) =>
    `grade:v1:${date}:${safeBase64Encode(sajuData).slice(0, 20)}`,

  calendar: (year: number, month: number, userId: string) => `cal:v1:${year}:${month}:${userId}`,

  yearlyCalendar: (
    birthDate: string,
    birthTime: string,
    gender: string,
    year: number,
    category?: string
  ) => `yearly:v2:${birthDate}:${birthTime}:${gender}:${year}:${category || 'all'}`, // v2: 날짜 필터링 제거, category 명시화로 키 충돌 방지

  compatibility: (person1: string, person2: string) => `compat:v1:${person1}:${person2}`,

  transitChart: (latitude: number, longitude: number) => {
    const now = new Date()
    const dateHour = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`
    return `transit:v1:${dateHour}:${latitude.toFixed(2)}:${longitude.toFixed(2)}`
  },
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

    const client = await getRedisClient()
    if (!client) {
      return { hit: false, data: null }
    }

    const results = await client.mGet(keys)
    const data = results.map((item) => (item ? (JSON.parse(item) as T) : null))
    return { hit: true, data }
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
 * SCAN is preferred over KEYS in production to avoid blocking Redis
 */
export async function clearCacheByPattern(pattern: string): Promise<number> {
  try {
    if (!pattern || typeof pattern !== 'string') {
      throw new Error('Pattern must be a non-empty string')
    }

    const client = await getRedisClient()
    if (!client) {
      return 0
    }

    let cursor: number | string = 0
    let deletedCount = 0
    const batchSize = 100 // Delete in batches to avoid memory issues

    do {
      // Use SCAN instead of KEYS to avoid blocking Redis
      const result = await client.scan(String(cursor), {
        MATCH: pattern,
        COUNT: 100,
      })

      cursor =
        typeof result.cursor === 'string' ? parseInt(result.cursor, 10) : Number(result.cursor)
      const keys = result.keys

      if (keys.length > 0) {
        // Delete in batches
        for (let i = 0; i < keys.length; i += batchSize) {
          const batch = keys.slice(i, i + batchSize)
          await client.del(batch)
          deletedCount += batch.length
        }
      }
    } while (cursor !== 0)

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
 * Get cache statistics
 */
export async function getCacheInfo() {
  try {
    const client = await getRedisClient()
    if (!client) {
      return null
    }

    const info = await client.info('stats')
    return info
  } catch (error) {
    logger.error('[Redis] Info error', { error })
    return null
  }
}
