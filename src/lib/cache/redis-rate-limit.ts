/**
 * Redis-based Rate Limiting with Upstash Fallback
 * High-performance distributed rate limiting using IORedis
 * Falls back to Upstash REST API and in-memory storage
 *
 * Features:
 * - IORedis for optimal performance
 * - Upstash REST fallback
 * - In-memory fallback for maximum reliability
 * - Sliding window algorithm
 * - Configurable per-route limits
 */

import Redis from 'ioredis'
import { recordCounter } from '@/lib/metrics'
import { logger } from '@/lib/logger'

// Configuration
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
const REDIS_URL = process.env.REDIS_URL

// Rate limit prefix for Redis keys
const RATE_LIMIT_PREFIX = 'rl:'

// Redis client singleton
let redisClient: Redis | null = null
let redisAvailable = true

// In-memory fallback store with automatic cleanup and LRU eviction
interface RateLimitEntry {
  count: number
  resetAt: number
  lastAccess: number
}

const inMemoryStore = new Map<string, RateLimitEntry>()
const CLEANUP_INTERVAL_MS = 60_000 // 1 minute
const MAX_MEMORY_ENTRIES = 10_000 // Prevent unbounded growth
let lastCleanup = Date.now()

/**
 * Initialize IORedis client
 */
function initializeRedis(): Redis | null {
  if (!REDIS_URL) {
    logger.debug('[RateLimit] REDIS_URL not configured');
    return null
  }

  if (redisClient) {
    return redisClient
  }

  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => {
        if (times > 2) {
          redisAvailable = false
          return null
        }
        return Math.min(times * 50, 500)
      },
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 3000,
      commandTimeout: 2000,
    })

    redisClient.on('connect', () => {
      logger.info('[RateLimit] Connected to Redis')
      redisAvailable = true
    })

    redisClient.on('error', (error) => {
      logger.warn('[RateLimit] Redis error:', error.message)
      redisAvailable = false
    })

    // Connect lazily
    redisClient.connect().catch((error) => {
      logger.warn('[RateLimit] Redis connection failed:', error.message)
      redisAvailable = false
    });

    return redisClient
  } catch (error) {
    logger.warn('[RateLimit] Failed to initialize Redis:', error)
    redisAvailable = false
    return null
  }
}

/**
 * Cleanup expired in-memory entries and enforce LRU eviction
 */
function cleanupInMemory(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) {
    return
  }

  lastCleanup = now
  const nowSeconds = Math.floor(now / 1000)

  // Remove expired entries
  for (const [key, value] of inMemoryStore) {
    if (value.resetAt < nowSeconds) {
      inMemoryStore.delete(key)
    }
  }

  // LRU eviction if still over limit
  if (inMemoryStore.size > MAX_MEMORY_ENTRIES) {
    const entries = Array.from(inMemoryStore.entries()).sort(
      (a, b) => a[1].lastAccess - b[1].lastAccess
    )

    const toRemove = entries.slice(0, inMemoryStore.size - MAX_MEMORY_ENTRIES + 1000)
    for (const [key] of toRemove) {
      inMemoryStore.delete(key)
    }
  }
}

/**
 * In-memory increment with sliding window
 */
function inMemoryIncrement(key: string, windowSeconds: number): number {
  cleanupInMemory()

  const now = Math.floor(Date.now() / 1000)
  const existing = inMemoryStore.get(key)

  if (existing && existing.resetAt > now) {
    existing.count++
    existing.lastAccess = Date.now();
    return existing.count
  }

  // New window
  inMemoryStore.set(key, { count: 1, resetAt: now + windowSeconds, lastAccess: Date.now() });
  return 1
}

/**
 * Increment counter using IORedis
 */
async function redisIncrement(key: string, windowSeconds: number): Promise<number | null> {
  const client = redisClient || initializeRedis()

  if (!client || !redisAvailable) {
    return null
  }

  try {
    // Use pipeline for atomic INCR + EXPIRE
    const pipeline = client.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, windowSeconds)

    const results = await pipeline.exec()

    if (!results || !results[0]) {
      return null
    }

    const [incrError, count] = results[0]

    if (incrError || typeof count !== 'number') {
      return null
    }

    return count
  } catch (error) {
    logger.warn('[RateLimit] Redis increment failed:', error)
    redisAvailable = false
    return null
  }
}

/**
 * Increment counter using Upstash REST API
 */
async function upstashIncrement(key: string, windowSeconds: number): Promise<number | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return null
  }

  try {
    const url = `${UPSTASH_URL}/pipeline`
    const body = JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, windowSeconds],
    ])

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(3000), // 3s timeout
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json()

    if (!Array.isArray(data) || !data[0] || typeof data[0].result !== 'number') {
      return null
    }

    return data[0].result as number
  } catch (error) {
    logger.warn('[RateLimit] Upstash increment failed:', error);
    return null
  }
}

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  reset: number
  retryAfter?: number
  headers: Headers
  backend: 'redis' | 'upstash' | 'memory' | 'disabled'
}

/**
 * Main rate limiting function with cascading fallback
 * 1. Try IORedis
 * 2. Fall back to Upstash REST
 * 3. Fall back to in-memory
 * 4. In production without any backend: deny all
 */
export async function rateLimit(
  key: string,
  { limit = 60, windowSeconds = 60 }: { limit?: number; windowSeconds?: number } = {}
): Promise<RateLimitResult> {
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', String(limit))

  const fullKey = `${RATE_LIMIT_PREFIX}${key}`
  const reset = Math.floor(Date.now() / 1000) + windowSeconds
  headers.set('X-RateLimit-Reset', String(reset))

  /**
   * Build rate limit result
   */
  const buildResult = (
    count: number,
    backend: 'redis' | 'upstash' | 'memory' | 'disabled'
  ): RateLimitResult => {
    const remaining = Math.max(0, limit - count)
    const allowed = count <= limit
    const retryAfter = allowed ? undefined : reset - Math.floor(Date.now() / 1000)

    headers.set('X-RateLimit-Remaining', String(remaining))
    headers.set('X-RateLimit-Backend', backend)

    if (!allowed && retryAfter && retryAfter > 0) {
      headers.set('Retry-After', String(retryAfter))
    }

    if (count > limit) {
      recordCounter('api.rate_limit.exceeded', 1, { backend, key })
    }

    return { allowed, limit, remaining, reset, retryAfter, headers, backend }
  }

  // Development mode without Redis: allow all
  if (process.env.NODE_ENV !== 'production' && !REDIS_URL && !UPSTASH_URL) {
    headers.set('X-RateLimit-Remaining', 'unlimited')
    headers.set('X-RateLimit-Backend', 'disabled');
    return { allowed: true, limit, remaining: limit, reset: 0, headers, backend: 'disabled' }
  }

  // 1. Try IORedis first (fastest)
  const redisCount = await redisIncrement(fullKey, windowSeconds)
  if (redisCount !== null) {
    recordCounter('api.rate_limit.check', 1, { backend: 'redis' });
    return buildResult(redisCount, 'redis')
  }

  // 2. Fall back to Upstash REST
  const upstashCount = await upstashIncrement(fullKey, windowSeconds)
  if (upstashCount !== null) {
    recordCounter('api.rate_limit.check', 1, { backend: 'upstash' })
    recordCounter('api.rate_limit.fallback', 1, { from: 'redis', to: 'upstash' });
    return buildResult(upstashCount, 'upstash')
  }

  // 3. Fall back to in-memory
  if (process.env.NODE_ENV !== 'production') {
    // In development: use in-memory and allow
    const memoryCount = inMemoryIncrement(fullKey, windowSeconds)
    recordCounter('api.rate_limit.check', 1, { backend: 'memory' })
    recordCounter('api.rate_limit.fallback', 1, { from: 'upstash', to: 'memory' })
    logger.warn('[RateLimit] Using in-memory fallback in development');
    return buildResult(memoryCount, 'memory')
  }

  // 4. Production without any backend: DENY for security
  logger.error('[SECURITY] Rate limiting completely unavailable in production - denying request')
  recordCounter('api.rate_limit.misconfig', 1, { env: 'prod' })
  headers.set('X-RateLimit-Backend', 'disabled')
  headers.set('X-RateLimit-Remaining', '0');

  return {
    allowed: false,
    limit,
    remaining: 0,
    reset,
    headers,
    backend: 'disabled',
  }
}

/**
 * Reset rate limit for a specific key (admin use)
 */
export async function resetRateLimit(key: string): Promise<boolean> {
  const fullKey = `${RATE_LIMIT_PREFIX}${key}`

  try {
    // Try Redis
    if (redisClient && redisAvailable) {
      try {
        await redisClient.del(fullKey);
        return true
      } catch (error) {
        logger.warn('[RateLimit] Redis delete failed:', error)
      }
    }

    // Try Upstash
    if (UPSTASH_URL && UPSTASH_TOKEN) {
      try {
        const url = `${UPSTASH_URL}/del/${encodeURIComponent(fullKey)}`
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
          },
        })

        if (res.ok) {
          return true
        }
      } catch (error) {
        logger.warn('[RateLimit] Upstash delete failed:', error)
      }
    }

    // In-memory
    inMemoryStore.delete(fullKey);
    return true
  } catch (error) {
    logger.error('[RateLimit] Failed to reset rate limit:', error);
    return false
  }
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  key: string
): Promise<{ count: number; ttl: number } | null> {
  const fullKey = `${RATE_LIMIT_PREFIX}${key}`

  try {
    // Try Redis
    if (redisClient && redisAvailable) {
      try {
        const [count, ttl] = await Promise.all([redisClient.get(fullKey), redisClient.ttl(fullKey)]);

        return {
          count: count ? parseInt(count, 10) : 0,
          ttl: ttl || 0,
        }
      } catch (error) {
        logger.warn('[RateLimit] Redis get status failed:', error)
      }
    }

    // In-memory fallback
    const entry = inMemoryStore.get(fullKey)
    if (entry) {
      const now = Math.floor(Date.now() / 1000);
      return {
        count: entry.count,
        ttl: Math.max(0, entry.resetAt - now),
      }
    }

    return { count: 0, ttl: 0 }
  } catch (error) {
    logger.error('[RateLimit] Failed to get rate limit status:', error);
    return null
  }
}

/**
 * Health check for rate limiting backends
 */
export async function rateLimitHealthCheck(): Promise<{
  redis: boolean
  upstash: boolean
  memory: boolean
}> {
  let redisHealthy = false
  let upstashHealthy = false

  // Check Redis
  if (redisClient) {
    try {
      await redisClient.ping()
      redisHealthy = true
      redisAvailable = true
    } catch {
      redisHealthy = false
      redisAvailable = false
    }
  }

  // Check Upstash
  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const res = await fetch(`${UPSTASH_URL}/ping`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
        signal: AbortSignal.timeout(2000),
      })
      upstashHealthy = res.ok
    } catch {
      upstashHealthy = false
    }
  }

  return {
    redis: redisHealthy,
    upstash: upstashHealthy,
    memory: inMemoryStore.size > 0,
  }
}
