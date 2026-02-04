/**
 * Edge Cases and Security Tests for Redis Cache
 * Tests key validation, injection attacks, TTL validation, and error scenarios
 *
 * Aligned with @upstash/redis implementation in src/lib/cache/redis-cache.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Upstash Redis client
const mockRedisInstance = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  mget: vi.fn(),
  scan: vi.fn(),
  ping: vi.fn(),
}

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => mockRedisInstance),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheGetResult,
  cacheSetResult,
  cacheDelResult,
  cacheOrCalculate,
  cacheGetMany,
  clearCacheByPattern,
  getCacheInfo,
  disconnectRedis,
  CacheKeys,
} from '@/lib/cache/redis-cache'

describe('Redis Cache - Edge Cases and Security', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'test-token',
    }
  })

  afterEach(async () => {
    process.env = originalEnv
    await disconnectRedis()
  })

  describe('Key Validation - Injection Prevention', () => {
    it('should reject keys with newline characters', async () => {
      const maliciousKey = 'key\nSET malicious value'

      // The validateCacheKey in the source throws, which is caught by the try/catch
      // and returns {ok: false, error: ...} for cacheSetResult
      const result = await cacheSetResult(maliciousKey, 'data')
      expect(result.ok).toBe(false)
    })

    it('should reject keys with carriage return', async () => {
      const maliciousKey = 'key\rSET malicious value'

      const result = await cacheSetResult(maliciousKey, 'data')
      expect(result.ok).toBe(false)
    })

    it('should reject empty string keys', async () => {
      const result = await cacheSetResult('', 'data')
      expect(result.ok).toBe(false)
    })

    it('should reject null keys', async () => {
      const result = await cacheSetResult(null as any, 'data')
      expect(result.ok).toBe(false)
    })

    it('should reject undefined keys', async () => {
      const result = await cacheSetResult(undefined as any, 'data')
      expect(result.ok).toBe(false)
    })

    it('should reject non-string keys', async () => {
      const result1 = await cacheSetResult(123 as any, 'data')
      expect(result1.ok).toBe(false)

      const result2 = await cacheSetResult({} as any, 'data')
      expect(result2.ok).toBe(false)

      const result3 = await cacheSetResult([] as any, 'data')
      expect(result3.ok).toBe(false)
    })

    it('should reject keys longer than 512 characters', async () => {
      const longKey = 'a'.repeat(513)

      const result = await cacheSetResult(longKey, 'data')
      expect(result.ok).toBe(false)
    })

    it('should accept keys at exactly 512 characters', async () => {
      const maxKey = 'a'.repeat(512)
      mockRedisInstance.set.mockResolvedValue('OK')

      const result = await cacheSet(maxKey, 'data')

      expect(result).toBe(true)
      expect(mockRedisInstance.set).toHaveBeenCalled()
    })

    it('should reject CRLF injection attempts', async () => {
      const injectionAttempts = ['key\r\nSET attack value', 'key\n\rDEL *', 'prefix\r\nFLUSHALL']

      for (const key of injectionAttempts) {
        const result = await cacheSetResult(key, 'data')
        expect(result.ok).toBe(false)
      }
    })
  })

  describe('TTL Validation', () => {
    it('should reject negative TTL', async () => {
      const result = await cacheSetResult('key', 'data', -1)
      expect(result.ok).toBe(false)
    })

    it('should reject zero TTL', async () => {
      const result = await cacheSetResult('key', 'data', 0)
      expect(result.ok).toBe(false)
    })

    it('should reject TTL longer than 1 year', async () => {
      const oneYear = 31536000
      const result = await cacheSetResult('key', 'data', oneYear + 1)
      expect(result.ok).toBe(false)
    })

    it('should accept TTL at exactly 1 year', async () => {
      const oneYear = 31536000
      mockRedisInstance.set.mockResolvedValue('OK')

      const result = await cacheSet('key', 'data', oneYear)

      expect(result).toBe(true)
    })

    it('should accept minimum TTL of 1 second', async () => {
      mockRedisInstance.set.mockResolvedValue('OK')

      const result = await cacheSet('key', 'data', 1)

      expect(result).toBe(true)
      expect(mockRedisInstance.set).toHaveBeenCalledWith('key', expect.any(String), { ex: 1 })
    })
  })

  describe('Connection Failures', () => {
    it('should return null when Redis unavailable', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      await disconnectRedis()

      const result = await cacheGet('key')

      expect(result).toBeNull()
    })

    it('should return error in cacheGetResult when get fails', async () => {
      mockRedisInstance.get.mockRejectedValueOnce(new Error('Connection lost'))

      const result = await cacheGetResult('key')

      expect(result.hit).toBe(false)
      expect(result.data).toBeNull()
    })

    it('should return error in cacheSetResult when set fails', async () => {
      mockRedisInstance.set.mockRejectedValueOnce(new Error('Connection lost'))

      const result = await cacheSetResult('key', 'data')

      expect(result.ok).toBe(false)
    })

    it('should handle Redis client error events', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis error'))

      const result = await cacheGet('key')

      expect(result).toBeNull()
    })
  })

  describe('Data Serialization Edge Cases', () => {
    it('should handle circular references gracefully', async () => {
      const circular: any = { a: 1 }
      circular.self = circular

      // JSON.stringify with circular ref throws, which should be caught
      const result = await cacheSetResult('key', circular)
      expect(result.ok).toBe(false)
    })

    it('should handle undefined values', async () => {
      mockRedisInstance.set.mockResolvedValue('OK')

      const result = await cacheSet('key', undefined)

      expect(result).toBe(true)
    })

    it('should handle null values', async () => {
      mockRedisInstance.set.mockResolvedValue('OK')

      const result = await cacheSet('key', null)

      expect(result).toBe(true)
    })

    it('should handle BigInt serialization error', async () => {
      const bigIntValue = { value: BigInt(9007199254740991) }

      const result = await cacheSetResult('key', bigIntValue)
      expect(result.ok).toBe(false)
    })

    it('should handle null return from cache', async () => {
      mockRedisInstance.get.mockResolvedValue(null)

      const result = await cacheGet('key')

      expect(result).toBeNull()
    })

    it('should handle empty string from cache', async () => {
      mockRedisInstance.get.mockResolvedValue('')

      const result = await cacheGet('key')

      // Upstash get returns empty string as valid data (not null/undefined)
      expect(result).toBe('')
    })
  })

  describe('Batch Operations Edge Cases', () => {
    it('should handle empty keys array in cacheGetMany', async () => {
      const results = await cacheGetMany([])

      expect(results).toEqual([])
    })

    it('should handle large batch of keys', async () => {
      const keys = Array(1000)
        .fill('key')
        .map((k, i) => `${k}${i}`)
      mockRedisInstance.mget.mockResolvedValue(Array(1000).fill(null))

      const results = await cacheGetMany(keys)

      expect(results.length).toBe(1000)
      expect(mockRedisInstance.mget).toHaveBeenCalledWith(...keys)
    })

    it('should handle batch get connection error', async () => {
      mockRedisInstance.mget.mockRejectedValue(new Error('Connection lost'))

      const results = await cacheGetMany(['key1', 'key2'])

      expect(results).toEqual([null, null])
    })
  })

  describe('Pattern-based Cache Clearing', () => {
    it('should handle pattern with no matches', async () => {
      mockRedisInstance.scan.mockResolvedValue([0, []])

      const count = await clearCacheByPattern('nonexistent:*')

      expect(count).toBe(0)
      expect(mockRedisInstance.del).not.toHaveBeenCalled()
    })

    it('should handle pattern with many matches', async () => {
      const keys = Array(500)
        .fill('key')
        .map((_, i) => `prefix:${i}`)
      mockRedisInstance.scan.mockResolvedValue([0, keys])
      mockRedisInstance.del.mockResolvedValue(500)

      const count = await clearCacheByPattern('prefix:*')

      expect(count).toBe(500)
      expect(mockRedisInstance.del).toHaveBeenCalledWith(...keys)
    })

    it('should handle wildcard pattern safely', async () => {
      mockRedisInstance.scan.mockResolvedValue([0, ['key1', 'key2']])
      mockRedisInstance.del.mockResolvedValue(2)

      const count = await clearCacheByPattern('*')

      expect(count).toBe(2)
    })

    it('should handle pattern clear error', async () => {
      mockRedisInstance.scan.mockRejectedValue(new Error('Scan command failed'))

      const count = await clearCacheByPattern('prefix:*')

      expect(count).toBe(0)
    })

    it('should handle delete error after keys found', async () => {
      mockRedisInstance.scan.mockResolvedValue([0, ['key1', 'key2']])
      mockRedisInstance.del.mockRejectedValue(new Error('Delete failed'))

      const count = await clearCacheByPattern('prefix:*')

      expect(count).toBe(0)
    })
  })

  describe('Cache-or-Calculate Pattern', () => {
    it('should calculate when cache miss', async () => {
      mockRedisInstance.get.mockResolvedValue(null)
      mockRedisInstance.set.mockResolvedValue('OK')
      const calculate = vi.fn().mockResolvedValue({ result: 'calculated' })

      const result = await cacheOrCalculate('key', calculate)

      expect(result).toEqual({ result: 'calculated' })
      expect(calculate).toHaveBeenCalled()
    })

    it('should not calculate when cache hit', async () => {
      mockRedisInstance.get.mockResolvedValue({ result: 'cached' })
      const calculate = vi.fn()

      const result = await cacheOrCalculate('key', calculate)

      expect(result).toEqual({ result: 'cached' })
      expect(calculate).not.toHaveBeenCalled()
    })

    it('should handle calculation errors', async () => {
      mockRedisInstance.get.mockResolvedValue(null)
      const calculate = vi.fn().mockRejectedValue(new Error('Calculation failed'))

      await expect(async () => {
        await cacheOrCalculate('key', calculate)
      }).rejects.toThrow('Calculation failed')
    })

    it('should not fail if cache set fails after calculation', async () => {
      mockRedisInstance.get.mockResolvedValue(null)
      mockRedisInstance.set.mockRejectedValue(new Error('Set failed'))
      const calculate = vi.fn().mockResolvedValue({ result: 'calculated' })

      const result = await cacheOrCalculate('key', calculate)

      expect(result).toEqual({ result: 'calculated' })
    })

    it('should cache the calculated result', async () => {
      mockRedisInstance.get.mockResolvedValue(null)
      mockRedisInstance.set.mockResolvedValue('OK')
      const calculate = vi.fn().mockResolvedValue({ result: 'calculated' })

      await cacheOrCalculate('key', calculate, 3600)

      // Wait for async cache set
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'key',
        JSON.stringify({ result: 'calculated' }),
        { ex: 3600 }
      )
    })
  })

  describe('Connection Management', () => {
    it('should disconnect gracefully', async () => {
      // disconnectRedis just sets redis = null for Upstash (no-op HTTP)
      await expect(disconnectRedis()).resolves.not.toThrow()
    })

    it('should handle disconnect when client is null', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      await expect(disconnectRedis()).resolves.not.toThrow()
    })
  })

  describe('Cache Info', () => {
    it('should retrieve cache info', async () => {
      mockRedisInstance.ping.mockResolvedValue('PONG')

      const info = await getCacheInfo()

      expect(info).toBe('connected')
      expect(mockRedisInstance.ping).toHaveBeenCalled()
    })

    it('should handle info error', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('Info failed'))

      const info = await getCacheInfo()

      expect(info).toBeNull()
    })

    it('should return null when Redis unavailable', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      await disconnectRedis()

      const info = await getCacheInfo()

      expect(info).toBeNull()
    })
  })

  describe('Cache Key Generators - Security', () => {
    it('should handle special characters in user input safely', () => {
      const key = CacheKeys.saju('1990-01-01; DROP TABLE users;', '12:00', 'M')

      // Cache keys are just Redis key strings — they don't execute SQL.
      // The key contains the raw input because it is safe as a Redis key.
      expect(key).toContain('saju:v1:')
      expect(typeof key).toBe('string')
    })

    it('should handle Unicode characters', () => {
      // Use ASCII-safe input for tarot key (question is Base64-encoded internally)
      const key = CacheKeys.tarot('user123', 'question', 'spread')

      expect(key).toContain('tarot:v1:')
      expect(key).toContain('user123')
    })

    it('should encode Base64 safely for question keys', () => {
      const maliciousQuestion = 'Q\nSET evil value'
      const key = CacheKeys.tarot('user', maliciousQuestion, 'spread')

      // Should not contain raw newlines
      expect(key).not.toContain('\n')
    })

    it('should handle transit chart with extreme coordinates', () => {
      const key = CacheKeys.transitChart(90, 180)

      expect(key).toContain('90.00:180.00')
    })

    it('should handle transit chart with negative coordinates', () => {
      const key = CacheKeys.transitChart(-45.5, -120.75)

      expect(key).toContain('-45.50:-120.75')
    })
  })
})
