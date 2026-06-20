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
const UPSTASH_DISABLE_TTL_MS = 5 * 60 * 1000

// When true, production requests are DENIED if Upstash is unavailable instead
// of falling back to the per-instance in-memory store. The in-memory store is
// bypassable across serverless instances (each instance counts separately), so
// security-sensitive deployments should fail closed. Default false keeps the
// availability-first in-memory fallback. Read at call time so tests/ops can
// toggle without a cold start.
const isFailClosed = () => process.env.RATE_LIMIT_FAIL_CLOSED === 'true'

// Upstash Redis client singleton
let redisClient: Redis | null = null
let upstashDisabledUntil = 0

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

  if (Date.now() < upstashDisabledUntil) {
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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

function isUpstashQuotaExceededError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  return (
    message.includes('max requests limit exceeded') ||
    (message.includes('err max requests') && message.includes('limit'))
  )
}

function disableUpstashTemporarily(reason: string): void {
  const nextDisabledUntil = Date.now() + UPSTASH_DISABLE_TTL_MS
  if (nextDisabledUntil <= upstashDisabledUntil) {
    return
  }

  upstashDisabledUntil = nextDisabledUntil
  redisClient = null
  logger.error('[RateLimit] Upstash temporarily disabled', {
    reason,
    disabledForMs: UPSTASH_DISABLE_TTL_MS,
  })
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

    // incr 와 expire 는 한 파이프라인이지만 원자적 트랜잭션은 아니다 — incr 만
    // 적용되고 expire 가 누락되면 키가 TTL 없이 남아 rate window 가 영영 안
    // 닫힌다. expire 결과(키 존재 시 1)가 명시적으로 1 이 아니면 TTL 을 한 번
    // 더 보장한다. (매 incr 마다 expire 를 재적용하므로 보통 자가 치유되지만,
    // 막 생성된 키에서 즉시 보장.) 결과 shape 를 모르면(undefined) skip.
    const expireResult = results[1]
    if (expireResult !== undefined && expireResult !== 1) {
      try {
        await client.expire(key, windowSeconds)
      } catch {
        /* best-effort — 다음 incr 가 expire 를 재적용한다 */
      }
    }

    return count
  } catch (error) {
    if (isUpstashQuotaExceededError(error)) {
      disableUpstashTemporarily(getErrorMessage(error))
    }
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
 * Per-call options for {@link rateLimit}.
 *
 * `failClosed` opts an individual call into fail-closed behavior: when the
 * authoritative Upstash backend is unavailable (down, quota-disabled, or not
 * configured), the request is DENIED rather than silently allowed. This is the
 * caller-scoped counterpart to the deployment-wide RATE_LIMIT_FAIL_CLOSED env
 * flag — use it on security-sensitive routes (auth, admin, credit/billing)
 * where bypassing the limiter is worse than rejecting a request. For most
 * routes, availability-first (the default fail-open behavior) is preferred and
 * `failClosed` should be omitted.
 *
 * Example (do NOT add this here — wire it up in the route handler):
 *   await rateLimit(`auth:${ip}`, { limit: 5, windowSeconds: 60, failClosed: true })
 */
export type RateLimitOptions = {
  limit?: number
  windowSeconds?: number
  /**
   * Opt this call into fail-closed behavior. When true and the authoritative
   * Upstash backend is unavailable, the request is denied instead of falling
   * back to the per-instance (bypassable) in-memory store. Defaults to false to
   * preserve the existing availability-first behavior for all current callers.
   */
  failClosed?: boolean
}

/**
 * Main rate limiting function with fallback:
 *   1. Try Upstash Redis (shared, authoritative).
 *   2. If Upstash is unavailable, decide based on fail-closed policy:
 *        - Per-call `failClosed: true` OR deployment-wide
 *          RATE_LIMIT_FAIL_CLOSED=true → DENY the request.
 *        - Otherwise fall back to the per-instance in-memory store.
 * Development without Upstash configured → allow all (disabled), UNLESS the
 * caller passed `failClosed: true`, in which case the request is denied.
 *
 * The signature is backward-compatible: `failClosed` is optional and defaults
 * to false, so existing callers behave exactly as before.
 */
export async function rateLimit(
  key: string,
  { limit = 60, windowSeconds = 60, failClosed = false }: RateLimitOptions = {}
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
      // `key` 는 per-user/IP 식별자(고카디널리티) — metric 라벨에 넣으면 metrics.ts
      // 의 series 맵이 고유 사용자/IP 수만큼 무한 증가한다(공격자 증폭 가능). 라벨엔
      // backend 만 남기고 key 는 아래 logger 로만 남긴다.
      recordCounter('api.rate_limit.exceeded', 1, { backend })
    }

    return { allowed, limit, remaining, reset, retryAfter, headers, backend }
  }

  const isDev = process.env.NODE_ENV === 'development'

  /**
   * Build a fail-closed (denied) result for when the authoritative backend is
   * unavailable. Used both for the dev-without-Upstash path and the
   * Upstash-down path when fail-closed is requested.
   */
  const buildDeniedResult = (reason: string): RateLimitResult => {
    // key(고카디널리티)는 라벨에서 제외 — metrics series 무한 증가 방지. 진단용
    // key 는 아래 logger.error 에 남는다.
    recordCounter('api.rate_limit.fail_closed', 1)
    logger.error(`[RateLimit] ${reason} — failing closed (deny)`, {
      env: process.env.NODE_ENV || 'unknown',
      key,
    })
    headers.set('X-RateLimit-Remaining', '0')
    headers.set('X-RateLimit-Backend', 'disabled')
    headers.set('Retry-After', String(windowSeconds))
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset,
      retryAfter: windowSeconds,
      headers,
      backend: 'disabled',
    }
  }

  // Development mode without Redis: allow all — UNLESS this call opted into
  // fail-closed (security-sensitive route), in which case deny rather than
  // silently allowing when no authoritative backend exists.
  if (isDev && !UPSTASH_URL) {
    if (failClosed) {
      return buildDeniedResult('Upstash unavailable (dev, not configured)')
    }
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

  // 2. Upstash unavailable. Fail closed when either this specific call requested
  // it (`failClosed`) or the deployment-wide RATE_LIMIT_FAIL_CLOSED flag is set,
  // rather than using the per-instance in-memory store, which an attacker can
  // bypass by spreading requests across serverless instances. The per-call
  // option fails closed in any environment (including dev) so security-sensitive
  // routes are consistently protected; the env flag remains production-only.
  if (failClosed || (!isDev && isFailClosed())) {
    return buildDeniedResult('Upstash unavailable')
  }

  // 3. Fall back to in-memory (per-instance; see RATE_LIMIT_FAIL_CLOSED).
  const memoryCount = inMemoryIncrement(fullKey, windowSeconds)
  recordCounter('api.rate_limit.check', 1, { backend: 'memory' })
  recordCounter('api.rate_limit.fallback', 1, { from: 'upstash', to: 'memory' })
  logger.warn('[RateLimit] Using in-memory fallback', {
    env: process.env.NODE_ENV || 'unknown',
    key,
  })
  return buildResult(memoryCount, 'memory')
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
        if (isUpstashQuotaExceededError(error)) {
          disableUpstashTemporarily(getErrorMessage(error))
        }
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
        if (isUpstashQuotaExceededError(error)) {
          disableUpstashTemporarily(getErrorMessage(error))
        }
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
    } catch (error) {
      if (isUpstashQuotaExceededError(error)) {
        disableUpstashTemporarily(getErrorMessage(error))
      }
      upstashHealthy = false
    }
  }

  return {
    upstash: upstashHealthy,
    memory: inMemoryStore.size > 0,
  }
}
