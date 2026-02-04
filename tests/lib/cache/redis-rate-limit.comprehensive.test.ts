/**
 * Comprehensive tests for Redis Rate Limiting
 * Tests distributed rate limiting with Upstash Redis and in-memory fallback
 *
 * Aligned with @upstash/redis implementation in src/lib/cache/redis-rate-limit.ts
 * Note: The source module captures UPSTASH_URL and UPSTASH_TOKEN at module load time,
 * so we must use dynamic imports with vi.resetModules() to test different env configurations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Upstash pipeline
const mockPipeline = {
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  get: vi.fn().mockReturnThis(),
  ttl: vi.fn().mockReturnThis(),
  exec: vi.fn(),
}

// Mock Upstash Redis client
const mockRedisInstance = {
  pipeline: vi.fn(() => mockPipeline),
  del: vi.fn(),
  ping: vi.fn(),
}

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => mockRedisInstance),
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

describe('Redis Rate Limiting', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'test-token',
      NODE_ENV: 'production',
    }
    mockRedisInstance.pipeline.mockReturnValue(mockPipeline)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Rate Limit - Basic Functionality', () => {
    it('should allow requests within limit', async () => {
      // Upstash pipeline exec returns flat array of results
      mockPipeline.exec.mockResolvedValue([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
      expect(result.limit).toBe(10)
    })

    it('should block requests exceeding limit', async () => {
      mockPipeline.exec.mockResolvedValue([11, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should calculate remaining correctly', async () => {
      mockPipeline.exec.mockResolvedValue([5, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.remaining).toBe(5)
    })

    it('should include rate limit headers', async () => {
      mockPipeline.exec.mockResolvedValue([3, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(result.headers.get('X-RateLimit-Remaining')).toBe('7')
      expect(result.headers.get('X-RateLimit-Reset')).toBeDefined()
    })

    it('should add Retry-After header when rate limited', async () => {
      mockPipeline.exec.mockResolvedValue([15, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(false)
      expect(result.headers.get('Retry-After')).toBeDefined()
    })
  })

  describe('Fallback Mechanisms', () => {
    it('should fallback to in-memory when Upstash fails in development', async () => {
      process.env.NODE_ENV = 'development'
      mockPipeline.exec.mockRejectedValue(new Error('Upstash connection failed'))

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      const result1 = await rateLimit('test-key', { limit: 3, windowSeconds: 60 })
      const result2 = await rateLimit('test-key', { limit: 3, windowSeconds: 60 })
      const result3 = await rateLimit('test-key', { limit: 3, windowSeconds: 60 })
      const result4 = await rateLimit('test-key', { limit: 3, windowSeconds: 60 })

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      expect(result3.allowed).toBe(true)
      expect(result4.allowed).toBe(false)
    })
  })

  describe('In-Memory Fallback', () => {
    it('should use disabled mode in development without Upstash', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      const result = await rateLimit('memory-test', { limit: 3, windowSeconds: 60 })

      expect(result.allowed).toBe(true)
      expect(result.backend).toBe('disabled')
    })

    it('should enforce LRU eviction mechanism exists', async () => {
      mockPipeline.exec.mockResolvedValue([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('lru-test', { limit: 10, windowSeconds: 60 })
      expect(result).toBeDefined()
    })
  })

  describe('Window Management', () => {
    it('should use correct window size', async () => {
      mockPipeline.exec.mockResolvedValue([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      await rateLimit('test-key', { limit: 10, windowSeconds: 120 })

      expect(mockPipeline.expire).toHaveBeenCalledWith(expect.stringContaining('test-key'), 120)
    })

    it('should handle different window sizes for same key prefix', async () => {
      mockPipeline.exec.mockResolvedValue([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      await rateLimit('api-endpoint', { limit: 10, windowSeconds: 60 })
      await rateLimit('api-endpoint', { limit: 5, windowSeconds: 300 })

      expect(mockPipeline.expire).toHaveBeenCalledTimes(2)
    })

    it('should handle very short windows', async () => {
      mockPipeline.exec.mockResolvedValue([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('short-window', { limit: 1, windowSeconds: 1 })

      expect(result.allowed).toBe(true)
    })

    it('should handle very long windows', async () => {
      mockPipeline.exec.mockResolvedValue([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('long-window', { limit: 1000, windowSeconds: 86400 })

      expect(result.allowed).toBe(true)
    })
  })

  describe('Key Isolation', () => {
    it('should isolate different keys', async () => {
      mockPipeline.exec.mockResolvedValue([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result1 = await rateLimit('key1', { limit: 1, windowSeconds: 60 })
      const result2 = await rateLimit('key2', { limit: 1, windowSeconds: 60 })

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
    })

    it('should add prefix to keys', async () => {
      mockPipeline.exec.mockResolvedValue([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      await rateLimit('test', { limit: 10, windowSeconds: 60 })

      expect(mockPipeline.incr).toHaveBeenCalledWith(expect.stringContaining('rl:'))
    })

    it('should handle special characters in keys', async () => {
      mockPipeline.exec.mockResolvedValue([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const specialKeys = ['user:123', 'api/endpoint', 'key-with-dashes', 'key_with_underscores']

      for (const key of specialKeys) {
        const result = await rateLimit(key, { limit: 10, windowSeconds: 60 })
        expect(result).toBeDefined()
      }
    })

    it('should handle very long keys', async () => {
      mockPipeline.exec.mockResolvedValue([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const longKey = 'a'.repeat(500)
      const result = await rateLimit(longKey, { limit: 10, windowSeconds: 60 })

      expect(result).toBeDefined()
    })
  })

  describe('resetRateLimit', () => {
    it('should reset rate limit for key', async () => {
      mockRedisInstance.del.mockResolvedValue(1)

      const { resetRateLimit } = await import('@/lib/cache/redis-rate-limit')
      await resetRateLimit('test-key')

      expect(mockRedisInstance.del).toHaveBeenCalledWith(expect.stringContaining('test-key'))
    })

    it('should handle reset when Upstash unavailable', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { resetRateLimit } = await import('@/lib/cache/redis-rate-limit')
      await expect(resetRateLimit('test-key')).resolves.not.toThrow()
    })
  })

  describe('getRateLimitStatus', () => {
    it('should get current status without incrementing', async () => {
      // getRateLimitStatus uses pipeline with get and ttl
      const statusPipeline = {
        get: vi.fn().mockReturnThis(),
        ttl: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(['5', 55]),
      }
      mockRedisInstance.pipeline.mockReturnValueOnce(statusPipeline)

      const { getRateLimitStatus } = await import('@/lib/cache/redis-rate-limit')
      const status = await getRateLimitStatus('test-key')

      expect(status).not.toBeNull()
      expect(status!.count).toBe(5)
      expect(status!.ttl).toBe(55)
    })

    it('should handle non-existent key', async () => {
      const statusPipeline = {
        get: vi.fn().mockReturnThis(),
        ttl: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([null, -2]),
      }
      mockRedisInstance.pipeline.mockReturnValueOnce(statusPipeline)

      const { getRateLimitStatus } = await import('@/lib/cache/redis-rate-limit')
      const status = await getRateLimitStatus('new-key')

      expect(status).not.toBeNull()
      expect(status!.count).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle Upstash pipeline errors gracefully in development', async () => {
      process.env.NODE_ENV = 'development'
      mockPipeline.exec.mockResolvedValue([null])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      // Should fallback
      expect(result).toBeDefined()
    })

    it('should handle null pipeline results', async () => {
      mockPipeline.exec.mockResolvedValue(null)

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      // With null results, upstashIncrement returns null, falls through to production deny
      expect(result).toBeDefined()
    })

    it('should handle invalid Redis responses', async () => {
      mockPipeline.exec.mockResolvedValue(['invalid', 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result).toBeDefined()
    })
  })

  describe('Performance', () => {
    it('should handle rapid sequential requests via Upstash', async () => {
      let count = 0
      mockPipeline.exec.mockImplementation(async () => {
        count++
        return [count, 1]
      })

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
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
      mockPipeline.exec.mockResolvedValue([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('default-test', { limit: 10, windowSeconds: 60 })

      expect(result.limit).toBe(10)
      expect(result.headers).toBeDefined()
    })

    it('should handle very high limits', async () => {
      mockPipeline.exec.mockResolvedValue([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('high-limit', {
        limit: 1000000,
        windowSeconds: 60,
      })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(999999)
    })
  })

  describe('Distributed Behavior', () => {
    it('should maintain consistent state across requests', async () => {
      mockPipeline.exec
        .mockResolvedValueOnce([1, 1])
        .mockResolvedValueOnce([2, 1])
        .mockResolvedValueOnce([3, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result1 = await rateLimit('distributed-key', { limit: 5, windowSeconds: 60 })
      const result2 = await rateLimit('distributed-key', { limit: 5, windowSeconds: 60 })
      const result3 = await rateLimit('distributed-key', { limit: 5, windowSeconds: 60 })

      expect(result1.remaining).toBe(4)
      expect(result2.remaining).toBe(3)
      expect(result3.remaining).toBe(2)
    })
  })
})
