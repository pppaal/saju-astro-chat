/**
 * Tests for Redis Rate Limiting
 *
 * Tests the actual rateLimit API behavior.
 * In development without Upstash configured, rate limiting uses disabled mode.
 *
 * Aligned with @upstash/redis implementation in src/lib/cache/redis-rate-limit.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  rateLimit,
  resetRateLimit,
  getRateLimitStatus,
  rateLimitHealthCheck,
} from '@/lib/cache/redis-rate-limit'

vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('Redis Rate Limiting', () => {
  const testKey = 'test-rate-limit-' + Date.now()

  beforeEach(async () => {
    // Reset rate limit before each test
    await resetRateLimit(testKey)
  })

  it('should allow requests within limit', async () => {
    const result = await rateLimit(testKey, { limit: 5, windowSeconds: 60 })

    expect(result.allowed).toBe(true)
    expect(result.limit).toBe(5)
    // In disabled mode, remaining equals limit; otherwise >= limit-1
    expect(result.remaining).toBeGreaterThanOrEqual(result.backend === 'disabled' ? 5 : 4)
    expect(result.headers).toBeInstanceOf(Headers)
    expect(result.backend).toMatch(/upstash|memory|disabled/)
  })

  it('should deny requests over limit (when backend available)', async () => {
    const limit = 3
    const windowSeconds = 60
    const key = testKey + '-deny-' + Date.now()

    // First check if we have a working backend
    const initial = await rateLimit(key, { limit, windowSeconds })

    // If disabled mode, skip this test logic
    if (initial.backend === 'disabled') {
      expect(initial.allowed).toBe(true) // Dev mode allows all
      return
    }

    // Exhaust the limit
    for (let i = 0; i < limit - 1; i++) {
      await rateLimit(key, { limit, windowSeconds })
    }

    // Next request should be denied
    const deniedResult = await rateLimit(key, { limit, windowSeconds })
    expect(deniedResult.allowed).toBe(false)
    expect(deniedResult.remaining).toBe(0)

    // Cleanup
    await resetRateLimit(key)
  })

  it('should decrement remaining count correctly (when backend available)', async () => {
    const limit = 10
    const key = testKey + '-decrement-' + Date.now()

    const result1 = await rateLimit(key, { limit, windowSeconds: 60 })

    // If disabled mode, remaining equals limit
    if (result1.backend === 'disabled') {
      expect(result1.remaining).toBe(limit)
      return
    }

    expect(result1.remaining).toBe(limit - 1)

    const result2 = await rateLimit(key, { limit, windowSeconds: 60 })
    expect(result2.remaining).toBe(limit - 2)

    // Cleanup
    await resetRateLimit(key)
  })

  it('should set correct rate limit headers', async () => {
    const limit = 5
    const result = await rateLimit(testKey + '-headers', { limit, windowSeconds: 60 })

    expect(result.headers.get('X-RateLimit-Limit')).toBe(String(limit))
    // X-RateLimit-Remaining is always set (even as 'unlimited' in dev)
    expect(result.headers.has('X-RateLimit-Remaining')).toBe(true)
    expect(result.headers.has('X-RateLimit-Backend')).toBe(true)

    // Cleanup
    await resetRateLimit(testKey + '-headers')
  })

  it('should reset rate limit (when backend available)', async () => {
    const key = testKey + '-reset-' + Date.now()
    const limit = 5

    // Make some requests
    const first = await rateLimit(key, { limit, windowSeconds: 60 })

    // If disabled mode, skip counting tests
    if (first.backend === 'disabled') {
      expect(first.allowed).toBe(true)
      return
    }

    await rateLimit(key, { limit, windowSeconds: 60 })
    await rateLimit(key, { limit, windowSeconds: 60 })

    // Reset
    const resetResult = await resetRateLimit(key)
    expect(resetResult).toBe(true)

    // Should be back to full limit
    const afterReset = await rateLimit(key, { limit, windowSeconds: 60 })
    expect(afterReset.remaining).toBe(limit - 1)

    // Cleanup
    await resetRateLimit(key)
  })

  it('should get rate limit status (when backend available)', async () => {
    const key = testKey + '-status-' + Date.now()
    const limit = 10

    // Make some requests
    const first = await rateLimit(key, { limit, windowSeconds: 60 })

    // Get status
    const status = await getRateLimitStatus(key)

    // Status behavior varies by backend
    if (first.backend === 'disabled') {
      // In disabled mode, status might be null or zero
      expect(status === null || status.count === 0).toBe(true)
    } else {
      expect(status).not.toBeNull()
      if (status) {
        expect(status.count).toBeGreaterThanOrEqual(1)
      }
    }

    // Cleanup
    await resetRateLimit(key)
  })

  it('should perform health check', async () => {
    const health = await rateLimitHealthCheck()

    expect(health).toHaveProperty('upstash')
    expect(health).toHaveProperty('memory')

    expect(typeof health.upstash).toBe('boolean')
    expect(typeof health.memory).toBe('boolean')
  })

  it('should handle different window sizes (when backend available)', async () => {
    const key1 = testKey + '-window-5-' + Date.now()
    const key2 = testKey + '-window-60-' + Date.now()

    const result5 = await rateLimit(key1, { limit: 10, windowSeconds: 5 })
    const result60 = await rateLimit(key2, { limit: 10, windowSeconds: 60 })

    // In disabled mode, reset is always 0
    if (result5.backend === 'disabled') {
      expect(result5.reset).toBe(0)
      expect(result60.reset).toBe(0)
    } else {
      expect(result5.reset).toBeLessThan(result60.reset)
    }

    // Cleanup
    await resetRateLimit(key1)
    await resetRateLimit(key2)
  })

  it('should handle concurrent requests correctly (when backend available)', async () => {
    const key = testKey + '-concurrent-' + Date.now()
    const limit = 20

    // Make 10 concurrent requests
    const promises = Array.from({ length: 10 }, () => rateLimit(key, { limit, windowSeconds: 60 }))

    const results = await Promise.all(promises)

    // All should be allowed (within limit)
    results.forEach((result) => {
      expect(result.allowed).toBe(true)
    })

    // Check remaining based on backend
    const lastResult = results[results.length - 1]
    if (lastResult.backend === 'disabled') {
      expect(lastResult.remaining).toBe(limit)
    } else {
      expect(lastResult.remaining).toBeLessThanOrEqual(limit - 1)
    }

    // Cleanup
    await resetRateLimit(key)
  })

  it('should handle fallback gracefully', async () => {
    // Even if primary backend is down, should not throw
    const key = testKey + '-fallback'

    await expect(rateLimit(key, { limit: 5, windowSeconds: 60 })).resolves.toBeTruthy()

    // Cleanup
    await resetRateLimit(key)
  })

  it('should support different limits per key', async () => {
    const key1 = testKey + '-limit-5-' + Date.now()
    const key2 = testKey + '-limit-10-' + Date.now()

    const result1 = await rateLimit(key1, { limit: 5, windowSeconds: 60 })
    const result2 = await rateLimit(key2, { limit: 10, windowSeconds: 60 })

    expect(result1.limit).toBe(5)
    expect(result2.limit).toBe(10)

    // Remaining depends on backend mode
    if (result1.backend === 'disabled') {
      expect(result1.remaining).toBe(5)
      expect(result2.remaining).toBe(10)
    } else {
      expect(result1.remaining).toBe(4)
      expect(result2.remaining).toBe(9)
    }

    // Cleanup
    await resetRateLimit(key1)
    await resetRateLimit(key2)
  })
})
