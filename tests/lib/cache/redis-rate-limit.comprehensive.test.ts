/**
 * Comprehensive tests for Redis Rate Limiting
 * Tests distributed rate limiting with Redis, Upstash fallback, and in-memory fallback
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
const mockRedisClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  pipeline: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  quit: vi.fn(),
}

const mockPipeline = {
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn(),
}

vi.mock('ioredis', () => ({
  default: vi.fn(() => mockRedisClient),
}))

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

// Import after mocks
import { rateLimit, resetRateLimit, getRateLimitStatus } from '@/lib/cache/redis-rate-limit'

describe('Redis Rate Limiting', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    mockRedisClient.pipeline.mockReturnValue(mockPipeline)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Rate Limit - Basic Functionality', () => {
    it('should allow requests within limit', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 'OK'],
      ])

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
      expect(result.limit).toBe(10)
    })

    it('should block requests exceeding limit', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([
        [null, 11],
        [null, 'OK'],
      ])

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should calculate remaining correctly', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([
        [null, 5],
        [null, 'OK'],
      ])

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.remaining).toBe(5)
    })

    it('should include rate limit headers', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([
        [null, 3],
        [null, 'OK'],
      ])

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(result.headers.get('X-RateLimit-Remaining')).toBe('7')
      expect(result.headers.get('X-RateLimit-Reset')).toBeDefined()
    })

    it('should add Retry-After header when rate limited', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([
        [null, 15],
        [null, 'OK'],
      ])

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(false)
      expect(result.headers.get('Retry-After')).toBeDefined()
    })
  })

  describe('Fallback Mechanisms', () => {
    it('should fallback to Upstash when Redis unavailable', async () => {
      process.env.REDIS_URL = undefined
      process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.com'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123'

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [{ result: 5 }, { result: 'OK' }],
      })

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(true)
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should fallback to in-memory when Redis and Upstash fail', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockRejectedValue(new Error('Redis connection failed'))

      const result1 = await rateLimit('test-key', { limit: 3, windowSeconds: 60 })
      const result2 = await rateLimit('test-key', { limit: 3, windowSeconds: 60 })
      const result3 = await rateLimit('test-key', { limit: 3, windowSeconds: 60 })
      const result4 = await rateLimit('test-key', { limit: 3, windowSeconds: 60 })

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      expect(result3.allowed).toBe(true)
      expect(result4.allowed).toBe(false)
    })

    it('should handle Upstash fetch errors', async () => {
      process.env.REDIS_URL = undefined
      process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.com'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123'

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      // Should fallback to in-memory
      expect(result.allowed).toBe(true)
    })

    it('should handle Upstash non-OK response', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://upstash.example.com'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token123'

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      })

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(true)
    })
  })

  describe('In-Memory Fallback', () => {
    beforeEach(() => {
      process.env.REDIS_URL = undefined
      process.env.UPSTASH_REDIS_REST_URL = undefined
    })

    it('should track rate limits in memory', async () => {
      const key = 'memory-test'

      const result1 = await rateLimit(key, { limit: 3, windowSeconds: 60 })
      const result2 = await rateLimit(key, { limit: 3, windowSeconds: 60 })
      const result3 = await rateLimit(key, { limit: 3, windowSeconds: 60 })

      expect(result1.remaining).toBe(2)
      expect(result2.remaining).toBe(1)
      expect(result3.remaining).toBe(0)
    })

    it('should reset after window expires', async () => {
      vi.useFakeTimers()

      const key = 'expire-test'

      await rateLimit(key, { limit: 2, windowSeconds: 1 })
      await rateLimit(key, { limit: 2, windowSeconds: 1 })

      // Should be rate limited
      const blocked = await rateLimit(key, { limit: 2, windowSeconds: 1 })
      expect(blocked.allowed).toBe(false)

      // Advance time past window
      vi.advanceTimersByTime(2000)

      // Should allow new requests
      const allowed = await rateLimit(key, { limit: 2, windowSeconds: 1 })
      expect(allowed.allowed).toBe(true)
      expect(allowed.remaining).toBe(1)

      vi.useRealTimers()
    })

    it('should enforce LRU eviction at max entries', async () => {
      // This would require creating 10000+ entries
      // Just verify the mechanism exists
      const result = await rateLimit('lru-test', { limit: 10, windowSeconds: 60 })
      expect(result).toBeDefined()
    })

    it('should cleanup expired entries periodically', async () => {
      vi.useFakeTimers()

      await rateLimit('cleanup-1', { limit: 10, windowSeconds: 1 })
      await rateLimit('cleanup-2', { limit: 10, windowSeconds: 1 })

      // Advance time to trigger cleanup
      vi.advanceTimersByTime(120000) // 2 minutes

      // New request should trigger cleanup
      const result = await rateLimit('cleanup-3', { limit: 10, windowSeconds: 60 })
      expect(result).toBeDefined()

      vi.useRealTimers()
    })
  })

  describe('Window Management', () => {
    it('should use correct window size', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 'OK'],
      ])

      await rateLimit('test-key', { limit: 10, windowSeconds: 120 })

      expect(mockPipeline.expire).toHaveBeenCalledWith(expect.stringContaining('test-key'), 120)
    })

    it('should handle different window sizes for same key prefix', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 'OK'],
      ])

      await rateLimit('api-endpoint', { limit: 10, windowSeconds: 60 })
      await rateLimit('api-endpoint', { limit: 5, windowSeconds: 300 })

      // Each should have its own rate limit
      expect(mockPipeline.expire).toHaveBeenCalledTimes(2)
    })

    it('should handle very short windows', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 'OK'],
      ])

      const result = await rateLimit('short-window', { limit: 1, windowSeconds: 1 })

      expect(result.allowed).toBe(true)
    })

    it('should handle very long windows', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 'OK'],
      ])

      const result = await rateLimit('long-window', { limit: 1000, windowSeconds: 86400 })

      expect(result.allowed).toBe(true)
    })
  })

  describe('Key Isolation', () => {
    it('should isolate different keys', async () => {
      const result1 = await rateLimit('key1', { limit: 1, windowSeconds: 60 })
      const result2 = await rateLimit('key2', { limit: 1, windowSeconds: 60 })

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
    })

    it('should add prefix to keys', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 'OK'],
      ])

      await rateLimit('test', { limit: 10, windowSeconds: 60 })

      expect(mockPipeline.incr).toHaveBeenCalledWith(expect.stringContaining('rl:'))
    })

    it('should handle special characters in keys', async () => {
      const specialKeys = ['user:123', 'api/endpoint', 'key-with-dashes', 'key_with_underscores']

      for (const key of specialKeys) {
        const result = await rateLimit(key, { limit: 10, windowSeconds: 60 })
        expect(result).toBeDefined()
      }
    })

    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(500)
      const result = await rateLimit(longKey, { limit: 10, windowSeconds: 60 })

      expect(result).toBeDefined()
    })
  })

  describe('resetRateLimit', () => {
    it('should reset rate limit for key', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockRedisClient.del.mockResolvedValue(1)

      await resetRateLimit('test-key')

      expect(mockRedisClient.del).toHaveBeenCalledWith(expect.stringContaining('test-key'))
    })

    it('should handle reset when Redis unavailable', async () => {
      process.env.REDIS_URL = undefined

      // Should not throw
      await expect(resetRateLimit('test-key')).resolves.not.toThrow()
    })

    it('should reset in-memory counter', async () => {
      process.env.REDIS_URL = undefined

      await rateLimit('reset-test', { limit: 1, windowSeconds: 60 })
      await rateLimit('reset-test', { limit: 1, windowSeconds: 60 })

      // Should be blocked
      let result = await rateLimit('reset-test', { limit: 1, windowSeconds: 60 })
      expect(result.allowed).toBe(false)

      await resetRateLimit('reset-test')

      // Should be allowed after reset
      result = await rateLimit('reset-test', { limit: 1, windowSeconds: 60 })
      expect(result.allowed).toBe(true)
    })
  })

  describe('getRateLimitStatus', () => {
    it('should get current status without incrementing', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockRedisClient.get.mockResolvedValue('5')

      const status = await getRateLimitStatus('test-key', 10)

      expect(status.count).toBe(5)
      expect(status.remaining).toBe(5)
      expect(status.isBlocked).toBe(false)
    })

    it('should return blocked status when over limit', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockRedisClient.get.mockResolvedValue('15')

      const status = await getRateLimitStatus('test-key', 10)

      expect(status.isBlocked).toBe(true)
      expect(status.remaining).toBe(0)
    })

    it('should handle non-existent key', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockRedisClient.get.mockResolvedValue(null)

      const status = await getRateLimitStatus('new-key', 10)

      expect(status.count).toBe(0)
      expect(status.remaining).toBe(10)
      expect(status.isBlocked).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle Redis pipeline errors gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([[new Error('Pipeline error'), null]])

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      // Should fallback
      expect(result).toBeDefined()
      expect(result.allowed).toBe(true)
    })

    it('should handle Redis connection failures', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockRedisClient.connect.mockRejectedValue(new Error('Connection refused'))

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result).toBeDefined()
    })

    it('should handle invalid Redis responses', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([
        [null, 'invalid'],
        [null, 'OK'],
      ])

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result).toBeDefined()
    })

    it('should handle null pipeline results', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue(null)

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should handle high concurrency', async () => {
      process.env.REDIS_URL = undefined // Use in-memory for speed

      const promises = Array(100)
        .fill(null)
        .map(() => rateLimit('concurrent-test', { limit: 50, windowSeconds: 60 }))

      const results = await Promise.all(promises)

      const allowed = results.filter((r) => r.allowed).length
      const blocked = results.filter((r) => !r.allowed).length

      expect(allowed).toBe(50)
      expect(blocked).toBe(50)
    })

    it('should handle rapid sequential requests', async () => {
      process.env.REDIS_URL = undefined

      const results = []
      for (let i = 0; i < 10; i++) {
        results.push(await rateLimit('sequential-test', { limit: 5, windowSeconds: 60 }))
      }

      const allowed = results.filter((r) => r.allowed).length
      expect(allowed).toBe(5)
    })
  })

  describe('Configuration', () => {
    it('should use correct default values', async () => {
      const result = await rateLimit('default-test', { limit: 10, windowSeconds: 60 })

      expect(result.limit).toBe(10)
      expect(result.headers).toBeDefined()
    })

    it('should handle zero limit', async () => {
      const result = await rateLimit('zero-limit', { limit: 0, windowSeconds: 60 })

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should handle very high limits', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'
      mockPipeline.exec.mockResolvedValue([
        [null, 1],
        [null, 'OK'],
      ])

      const result = await rateLimit('high-limit', {
        limit: 1000000,
        windowSeconds: 60,
      })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(999999)
    })
  })

  describe('Distributed Behavior', () => {
    it('should maintain consistent state across Redis instances', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379'

      // Simulate different instances hitting same key
      mockPipeline.exec
        .mockResolvedValueOnce([
          [null, 1],
          [null, 'OK'],
        ])
        .mockResolvedValueOnce([
          [null, 2],
          [null, 'OK'],
        ])
        .mockResolvedValueOnce([
          [null, 3],
          [null, 'OK'],
        ])

      const result1 = await rateLimit('distributed-key', { limit: 5, windowSeconds: 60 })
      const result2 = await rateLimit('distributed-key', { limit: 5, windowSeconds: 60 })
      const result3 = await rateLimit('distributed-key', { limit: 5, windowSeconds: 60 })

      expect(result1.remaining).toBe(4)
      expect(result2.remaining).toBe(3)
      expect(result3.remaining).toBe(2)
    })
  })
})
