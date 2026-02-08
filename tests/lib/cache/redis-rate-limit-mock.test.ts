/**
 * Mock-based tests for Redis Rate Limiting
 * Tests rate limiting logic without actual Redis connection
 *
 * Aligned with @upstash/redis implementation in src/lib/cache/redis-rate-limit.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Upstash pipeline
const mockPipeline = {
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  get: vi.fn().mockReturnThis(),
  ttl: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([1, 1]),
}

// Mock Upstash Redis client
const mockRedisInstance = {
  pipeline: vi.fn(() => mockPipeline),
  del: vi.fn().mockResolvedValue(1),
  ping: vi.fn().mockResolvedValue('PONG'),
}

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => mockRedisInstance),
}))

vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Redis Rate Limiting (Mocked)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    mockRedisInstance.pipeline.mockReturnValue(mockPipeline)
    mockPipeline.exec.mockResolvedValue([1, 1])
  })

  afterEach(() => {
    vi.restoreAllMocks()
    process.env = originalEnv
  })

  describe('Rate limit result structure', () => {
    it('should return proper rate limit result structure', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 })

      expect(result).toHaveProperty('allowed')
      expect(result).toHaveProperty('limit')
      expect(result).toHaveProperty('remaining')
      expect(result).toHaveProperty('reset')
      expect(result).toHaveProperty('headers')
      expect(result).toHaveProperty('backend')

      expect(typeof result.allowed).toBe('boolean')
      expect(typeof result.limit).toBe('number')
      expect(typeof result.remaining).toBe('number')
      expect(typeof result.reset).toBe('number')
      expect(result.headers).toBeInstanceOf(Headers)
      expect(typeof result.backend).toBe('string')
    })

    it('should have headers with rate limit info', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      const result = await rateLimit('test-key-headers', { limit: 5, windowSeconds: 30 })

      const headers = result.headers
      expect(headers.get('X-RateLimit-Limit')).toBe('5')
      expect(headers.get('X-RateLimit-Remaining')).toBeDefined()
      expect(headers.get('X-RateLimit-Reset')).toBeDefined()
    })

    it('should respect the limit parameter', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      const result = await rateLimit('test-key-limit', { limit: 100, windowSeconds: 60 })

      expect(result.limit).toBe(100)
    })

    it('should use default limit and window when not specified', async () => {
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      const result = await rateLimit('test-key-defaults')

      expect(result.limit).toBe(60) // Default limit
      expect(result.headers.get('X-RateLimit-Limit')).toBe('60')
    })

    it('should set Retry-After header when rate limit exceeded', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'production'

      // Count exceeds limit
      mockPipeline.exec.mockResolvedValue([100, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      const result = await rateLimit('test-exceeded', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.headers.has('Retry-After')).toBe(true)
      expect(result.retryAfter).toBeGreaterThan(0)
    })
  })

  describe('Backend detection', () => {
    it('should report backend type', async () => {
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      const result = await rateLimit('test-key-backend', { limit: 10, windowSeconds: 60 })

      // Should be one of the valid backends
      expect(['upstash', 'memory', 'disabled']).toContain(result.backend)
    })
  })

  describe('Rate limit status', () => {
    it('should get rate limit status', async () => {
      const { getRateLimitStatus } = await import('@/lib/cache/redis-rate-limit')

      const status = await getRateLimitStatus('test-status-key')

      // Returns { count, ttl } or null
      if (status !== null) {
        expect(status).toHaveProperty('count')
        expect(status).toHaveProperty('ttl')
        expect(typeof status.count).toBe('number')
        expect(typeof status.ttl).toBe('number')
      } else {
        expect(status).toBeNull()
      }
    })
  })

  describe('Reset rate limit', () => {
    it('should reset rate limit for a key', async () => {
      const { resetRateLimit } = await import('@/lib/cache/redis-rate-limit')

      // Should not throw
      await expect(resetRateLimit('test-reset-key')).resolves.not.toThrow()
    })
  })

  describe('Health check', () => {
    it('should perform health check', async () => {
      const { rateLimitHealthCheck } = await import('@/lib/cache/redis-rate-limit')

      const health = await rateLimitHealthCheck()

      // Returns { upstash, memory }
      expect(health).toHaveProperty('upstash')
      expect(health).toHaveProperty('memory')
      expect(typeof health.upstash).toBe('boolean')
      expect(typeof health.memory).toBe('boolean')
    })
  })

  describe('In-memory fallback behavior', () => {
    it('should work without Upstash (disabled mode in development)', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      process.env.NODE_ENV = 'development'

      vi.resetModules()

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      const result = await rateLimit('fallback-test', { limit: 5, windowSeconds: 60 })

      // Should still return valid result
      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(5)
    })

    it('should deny in production when all backends unavailable', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      process.env.NODE_ENV = 'production'

      vi.resetModules()

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      const result = await rateLimit('prod-no-backend', { limit: 5, windowSeconds: 60 })

      expect(result.allowed).toBe(false)
      expect(result.backend).toBe('disabled')
      expect(result.remaining).toBe(0)
    })
  })

  describe('getRateLimitStatus', () => {
    it('should get status from Upstash via pipeline', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      // Reset modules so the module re-captures env vars at load time
      vi.resetModules()

      const statusPipeline = {
        get: vi.fn().mockReturnThis(),
        ttl: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(['5', 55]),
      }
      mockRedisInstance.pipeline.mockReturnValueOnce(statusPipeline)

      const { getRateLimitStatus } = await import('@/lib/cache/redis-rate-limit')

      const status = await getRateLimitStatus('status-test')
      expect(status).not.toBeNull()
      expect(status?.count).toBe(5)
      expect(status?.ttl).toBe(55)
    })

    it('should return zero status for non-existent key', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      vi.resetModules()

      const { getRateLimitStatus } = await import('@/lib/cache/redis-rate-limit')

      const status = await getRateLimitStatus('non-existent-' + Date.now())
      expect(status).toEqual({ count: 0, ttl: 0 })
    })
  })

  describe('rateLimitHealthCheck', () => {
    it('should report Upstash health', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      // Reset modules so the module re-captures env vars at load time
      vi.resetModules()

      mockRedisInstance.ping.mockResolvedValueOnce('PONG')

      const { rateLimitHealthCheck } = await import('@/lib/cache/redis-rate-limit')

      const health = await rateLimitHealthCheck()
      expect(health.upstash).toBe(true)
    })

    it('should report Upstash unhealthy on ping failure', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      // Reset modules so the module re-captures env vars at load time
      vi.resetModules()

      mockRedisInstance.ping.mockRejectedValueOnce(new Error('Ping failed'))

      const { rateLimitHealthCheck } = await import('@/lib/cache/redis-rate-limit')

      const health = await rateLimitHealthCheck()
      expect(health.upstash).toBe(false)
    })

    it('should report Upstash unhealthy when ping returns wrong response', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      vi.resetModules()

      mockRedisInstance.ping.mockResolvedValueOnce('NOT-PONG')

      const { rateLimitHealthCheck } = await import('@/lib/cache/redis-rate-limit')

      const health = await rateLimitHealthCheck()
      expect(health.upstash).toBe(false)
    })
  })

  describe('Error handling scenarios', () => {
    it('should handle pipeline execution failure in development', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'development'

      vi.resetModules()

      mockPipeline.exec.mockRejectedValueOnce(new Error('Pipeline execution failed'))

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('error-test', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(true)
      expect(result.backend).toBe('memory')
    })

    it('should deny in production when pipeline fails', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'production'

      vi.resetModules()

      mockPipeline.exec.mockResolvedValueOnce(null)

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('prod-error', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(false)
      expect(result.backend).toBe('disabled')
    })

    it('should handle non-number count result', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'development'

      vi.resetModules()

      mockPipeline.exec.mockResolvedValueOnce(['not-a-number', 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('non-number-test', { limit: 10, windowSeconds: 60 })

      expect(result.backend).toBe('memory')
    })

    it('should handle null count in pipeline result', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'development'

      vi.resetModules()

      mockPipeline.exec.mockResolvedValueOnce([null, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('null-count-test', { limit: 10, windowSeconds: 60 })

      expect(result.backend).toBe('memory')
    })

    it('should handle empty pipeline result array', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'development'

      vi.resetModules()

      mockPipeline.exec.mockResolvedValueOnce([])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('empty-array-test', { limit: 10, windowSeconds: 60 })

      expect(result.backend).toBe('memory')
    })
  })

  describe('Reset rate limit error handling', () => {
    it('should handle Upstash delete failure gracefully', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      vi.resetModules()

      mockRedisInstance.del.mockRejectedValueOnce(new Error('Delete failed'))

      const { resetRateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await resetRateLimit('delete-error-test')

      // Should still return true (falls back to in-memory clear)
      expect(result).toBe(true)
    })
  })

  describe('Get status error handling', () => {
    it('should handle Upstash get status failure gracefully', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      vi.resetModules()

      const statusPipeline = {
        get: vi.fn().mockReturnThis(),
        ttl: vi.fn().mockReturnThis(),
        exec: vi.fn().mockRejectedValue(new Error('Get status failed')),
      }
      mockRedisInstance.pipeline.mockReturnValueOnce(statusPipeline)

      const { getRateLimitStatus } = await import('@/lib/cache/redis-rate-limit')
      const result = await getRateLimitStatus('status-error-test')

      // Should return default status from in-memory
      expect(result).toEqual({ count: 0, ttl: 0 })
    })
  })

  describe('Concurrent requests simulation', () => {
    it('should handle multiple concurrent requests', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'production'

      vi.resetModules()

      // Simulate incrementing count for each call
      let callCount = 0
      mockPipeline.exec.mockImplementation(async () => {
        callCount++
        return [callCount, 1]
      })

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      const results = await Promise.all([
        rateLimit('concurrent-test', { limit: 3 }),
        rateLimit('concurrent-test', { limit: 3 }),
        rateLimit('concurrent-test', { limit: 3 }),
        rateLimit('concurrent-test', { limit: 3 }),
        rateLimit('concurrent-test', { limit: 3 }),
      ])

      const allowed = results.filter((r) => r.allowed).length
      const blocked = results.filter((r) => !r.allowed).length

      expect(allowed).toBe(3)
      expect(blocked).toBe(2)
    })
  })

  describe('Metrics recording', () => {
    it('should record rate limit check metric', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'production'

      vi.resetModules()

      mockPipeline.exec.mockResolvedValueOnce([1, 1])

      const { recordCounter } = await import('@/lib/metrics')
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      await rateLimit('metrics-test', { limit: 10 })

      expect(recordCounter).toHaveBeenCalledWith('api.rate_limit.check', 1, { backend: 'upstash' })
    })

    it('should record exceeded metric when over limit', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'production'

      vi.resetModules()

      mockPipeline.exec.mockResolvedValueOnce([11, 1])

      const { recordCounter } = await import('@/lib/metrics')
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      await rateLimit('exceeded-test', { limit: 10 })

      expect(recordCounter).toHaveBeenCalledWith(
        'api.rate_limit.exceeded',
        1,
        expect.objectContaining({ backend: 'upstash' })
      )
    })

    it('should record fallback metric when using memory', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'development'

      vi.resetModules()

      mockPipeline.exec.mockRejectedValueOnce(new Error('Upstash down'))

      const { recordCounter } = await import('@/lib/metrics')
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      await rateLimit('fallback-metrics-test', { limit: 10 })

      expect(recordCounter).toHaveBeenCalledWith('api.rate_limit.fallback', 1, {
        from: 'upstash',
        to: 'memory',
      })
    })

    it('should record misconfig metric in production without backend', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      process.env.NODE_ENV = 'production'

      vi.resetModules()

      const { recordCounter } = await import('@/lib/metrics')
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')

      await rateLimit('misconfig-test', { limit: 10 })

      expect(recordCounter).toHaveBeenCalledWith('api.rate_limit.misconfig', 1, { env: 'prod' })
    })
  })

  describe('Key prefixing', () => {
    it('should use rl: prefix for rate limit keys', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'production'

      vi.resetModules()

      mockPipeline.exec.mockResolvedValueOnce([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      await rateLimit('my-key', { limit: 10 })

      expect(mockPipeline.incr).toHaveBeenCalledWith('rl:my-key')
    })

    it('should prefix reset key with rl:', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      vi.resetModules()

      mockRedisInstance.del.mockResolvedValueOnce(1)

      const { resetRateLimit } = await import('@/lib/cache/redis-rate-limit')
      await resetRateLimit('reset-key')

      expect(mockRedisInstance.del).toHaveBeenCalledWith('rl:reset-key')
    })
  })

  describe('Window and limit edge cases', () => {
    it('should handle limit of 1', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'production'

      vi.resetModules()

      mockPipeline.exec.mockResolvedValueOnce([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result1 = await rateLimit('limit-1-test', { limit: 1, windowSeconds: 60 })

      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(0)

      mockPipeline.exec.mockResolvedValueOnce([2, 1])
      const result2 = await rateLimit('limit-1-test', { limit: 1, windowSeconds: 60 })

      expect(result2.allowed).toBe(false)
    })

    it('should handle very large limit', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'production'

      vi.resetModules()

      mockPipeline.exec.mockResolvedValueOnce([1, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('large-limit-test', { limit: 1000000, windowSeconds: 60 })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(999999)
    })

    it('should handle exact limit count', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'
      process.env.NODE_ENV = 'production'

      vi.resetModules()

      mockPipeline.exec.mockResolvedValueOnce([10, 1])

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit')
      const result = await rateLimit('exact-limit-test', { limit: 10, windowSeconds: 60 })

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0)
    })
  })
})
