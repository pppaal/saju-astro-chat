/**
 * Redis-based Rate Limiting using @upstash/redis
 *
 * Features:
 * - Upstash REST API (HTTP, serverless-friendly)
 * - In-memory fallback for maximum reliability
 * - Sliding window algorithm
 * - Configurable per-route limits
 */

import { Redis } from '@upstash/redis'
import { recordCounter } from '@/lib/metrics'
import { logger } from '@/lib/logger'

// Configuration
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

// Rate limit prefix for Redis keys
const RATE_LIMIT_PREFIX = 'rl:'

// Upstash Redis client singleton
let redisClient: Redis | null = null

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
 * Initialize Upstash Redis client
 */
function getRedisClient(): Redis | null {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return null
  }

  if (redisClient) {
    return redisClient
  }

  redisClient = new Redis({
    url: UPSTASH_URL,
    token: UPSTASH_TOKEN,
  })

  return redisClient
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

  // LRU eviction if still over limit (partial scan instead of full sort)
  if (inMemoryStore.size > MAX_MEMORY_ENTRIES) {
    const targetRemoval = inMemoryStore.size - MAX_MEMORY_ENTRIES + 1000
    let oldestTime = Infinity
    let oldestKey: string | null = null
    let removed = 0

    // Multi-pass removal: find and remove oldest entries iteratively
    while (removed < targetRemoval && inMemoryStore.size > 0) {
      oldestTime = Infinity
      oldestKey = null
      for (const [key, value] of inMemoryStore) {
        if (value.lastAccess < oldestTime) {
          oldestTime = value.lastAccess
          oldestKey = key
        }
      }
      if (oldestKey) {
        inMemoryStore.delete(oldestKey)
        removed++
      } else {
        break
      }
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
    existing.lastAccess = Date.now()
    return existing.count
  }

  // New window
  inMemoryStore.set(key, { count: 1, resetAt: now + windowSeconds, lastAccess: Date.now() })
  return 1
}

/**
 * Increment counter using Upstash Redis
 */
async function upstashIncrement(key: string, windowSeconds: number): Promise<number | null> {
  const client = getRedisClient()

  if (!client) {
    return null
  }

  try {
    const pipeline = client.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, windowSeconds)

    const results = await pipeline.exec()

    if (!results || !results[0]) {
      return null
    }

    const count = results[0] as number

    if (typeof count !== 'number') {
      return null
    }

    return count
  } catch (error) {
    logger.warn('[RateLimit] Upstash increment failed:', error)
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
  backend: 'upstash' | 'memory' | 'disabled'
}

/**
 * Main rate limiting function with fallback
 * 1. Try Upstash Redis
 * 2. Fall back to in-memory
 * 3. In production without any backend: deny all
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
    backend: 'upstash' | 'memory' | 'disabled'
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
  if (process.env.NODE_ENV !== 'production' && !UPSTASH_URL) {
    headers.set('X-RateLimit-Remaining', 'unlimited')
    headers.set('X-RateLimit-Backend', 'disabled')
    return { allowed: true, limit, remaining: limit, reset: 0, headers, backend: 'disabled' }
  }

  // 1. Try Upstash Redis
  const upstashCount = await upstashIncrement(fullKey, windowSeconds)
  if (upstashCount !== null) {
    recordCounter('api.rate_limit.check', 1, { backend: 'upstash' })
    return buildResult(upstashCount, 'upstash')
  }

  // 2. Fall back to in-memory
  if (process.env.NODE_ENV !== 'production') {
    // In development: use in-memory and allow
    const memoryCount = inMemoryIncrement(fullKey, windowSeconds)
    recordCounter('api.rate_limit.check', 1, { backend: 'memory' })
    recordCounter('api.rate_limit.fallback', 1, { from: 'upstash', to: 'memory' })
    logger.warn('[RateLimit] Using in-memory fallback in development')
    return buildResult(memoryCount, 'memory')
  }

  // 3. Production without any backend: DENY for security
  logger.error('[SECURITY] Rate limiting completely unavailable in production - denying request')
  recordCounter('api.rate_limit.misconfig', 1, { env: 'prod' })
  headers.set('X-RateLimit-Backend', 'disabled')
  headers.set('X-RateLimit-Remaining', '0')

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
    // Try Upstash
    const client = getRedisClient()
    if (client) {
      try {
        await client.del(fullKey)
        return true
      } catch (error) {
        logger.warn('[RateLimit] Upstash delete failed:', error)
      }
    }

    // In-memory
    inMemoryStore.delete(fullKey)
    return true
  } catch (error) {
    logger.error('[RateLimit] Failed to reset rate limit:', error)
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
    // Try Upstash
    const client = getRedisClient()
    if (client) {
      try {
        const pipeline = client.pipeline()
        pipeline.get(fullKey)
        pipeline.ttl(fullKey)
        const results = await pipeline.exec()

        const count = results[0] as string | null
        const ttl = results[1] as number

        return {
          count: count ? parseInt(String(count), 10) : 0,
          ttl: ttl || 0,
        }
      } catch (error) {
        logger.warn('[RateLimit] Upstash get status failed:', error)
      }
    }

    // In-memory fallback
    const entry = inMemoryStore.get(fullKey)
    if (entry) {
      const now = Math.floor(Date.now() / 1000)
      return {
        count: entry.count,
        ttl: Math.max(0, entry.resetAt - now),
      }
    }

    return { count: 0, ttl: 0 }
  } catch (error) {
    logger.error('[RateLimit] Failed to get rate limit status:', error)
    return null
  }
}

/**
 * Health check for rate limiting backend
 */
export async function rateLimitHealthCheck(): Promise<{
  upstash: boolean
  memory: boolean
}> {
  let upstashHealthy = false

  // Check Upstash
  const client = getRedisClient()
  if (client) {
    try {
      const pong = await client.ping()
      upstashHealthy = pong === 'PONG'
    } catch {
      upstashHealthy = false
    }
  }

  return {
    upstash: upstashHealthy,
    memory: inMemoryStore.size > 0,
  }
}
