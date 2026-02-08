/**
 * Mock-based tests for Redis Cache utilities
 * Tests cache operations without actual Redis connection
 *
 * Aligned with @upstash/redis implementation in src/lib/cache/redis-cache.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Upstash Redis client
const mockRedisInstance = {
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  mget: vi.fn().mockResolvedValue([]),
  scan: vi.fn().mockResolvedValue([0, []]),
  ping: vi.fn().mockResolvedValue('PONG'),
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

describe('Redis Cache Utilities (Mocked)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(async () => {
    process.env = originalEnv
    const { disconnectRedis } = await import('@/lib/cache/redis-cache')
    await disconnectRedis()
  })

  describe('CACHE_TTL constants', () => {
    it('should export all cache TTL values', async () => {
      const { CACHE_TTL } = await import('@/lib/cache/redis-cache')

      expect(CACHE_TTL.SAJU_RESULT).toBe(60 * 60 * 24 * 7) // 7 days
      expect(CACHE_TTL.TAROT_READING).toBe(60 * 60 * 24) // 1 day
      expect(CACHE_TTL.DESTINY_MAP).toBe(60 * 60 * 24 * 3) // 3 days
      expect(CACHE_TTL.GRADING_RESULT).toBe(60 * 60 * 24) // 1 day
      expect(CACHE_TTL.CALENDAR_DATA).toBe(60 * 60 * 24) // 1 day
      expect(CACHE_TTL.COMPATIBILITY).toBe(60 * 60 * 24 * 7) // 7 days
      expect(CACHE_TTL.TRANSIT_CHART).toBe(60 * 60) // 1 hour
      expect(CACHE_TTL.NATAL_CHART).toBe(60 * 60 * 24 * 30) // 30 days
      expect(CACHE_TTL.SAJU).toBe(60 * 60 * 24 * 7) // 7 days
    })
  })

  describe('CacheKeys generators', () => {
    it('should generate saju cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache')

      const key = CacheKeys.saju('1990-01-01', '12:00', 'M')
      expect(key).toBe('saju:v1:1990-01-01:12:00:M:solar')
    })

    it('should generate tarot cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache')

      const key = CacheKeys.tarot('user123', 'What is my future?', 'celtic-cross')
      expect(key).toContain('tarot:v1:user123:')
      expect(key).toContain(':celtic-cross')
    })

    it('should generate destiny map cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache')

      const key = CacheKeys.destinyMap('1990-01-01', '12:00')
      expect(key).toBe('destiny:v1:1990-01-01:12:00')
    })

    it('should generate grading cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache')

      const key = CacheKeys.grading('2024-01-01', 'saju-data-string')
      expect(key).toContain('grade:v1:2024-01-01:')
    })

    it('should generate calendar cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache')

      const key = CacheKeys.calendar(2024, 1, 'user123')
      expect(key).toBe('cal:v1:2024:1:user123')
    })

    it('should generate yearly calendar cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache')

      const key = CacheKeys.yearlyCalendar('1990-01-01', '12:00', 'M', 2024)
      expect(key).toBe('yearly:v2:1990-01-01:12:00:M:2024:all')

      const keyWithCategory = CacheKeys.yearlyCalendar('1990-01-01', '12:00', 'M', 2024, 'health')
      expect(keyWithCategory).toBe('yearly:v2:1990-01-01:12:00:M:2024:health')
    })

    it('should generate compatibility cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache')

      const key = CacheKeys.compatibility('person1', 'person2')
      expect(key).toBe('compat:v1:person1:person2')
    })
  })

  describe('cacheGet', () => {
    it('should get cached data from Upstash Redis', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      // Upstash auto-deserializes, returns the object directly
      mockRedisInstance.get.mockResolvedValueOnce({ result: 'success' })

      const { cacheGet } = await import('@/lib/cache/redis-cache')

      const result = await cacheGet<{ result: string }>('test-key')

      expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key')
      expect(result).toEqual({ result: 'success' })
    })

    it('should return null when Upstash not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { cacheGet, disconnectRedis } = await import('@/lib/cache/redis-cache')
      await disconnectRedis()

      const result = await cacheGet('test-key')

      expect(result).toBeNull()
    })

    it('should return null when key not found', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.get.mockResolvedValueOnce(null)

      const { cacheGet } = await import('@/lib/cache/redis-cache')

      const result = await cacheGet('non-existent')

      expect(result).toBeNull()
    })

    it('should handle Redis errors gracefully', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.get.mockRejectedValueOnce(new Error('Redis error'))

      const { cacheGet } = await import('@/lib/cache/redis-cache')

      const result = await cacheGet('error-key')

      expect(result).toBeNull()
    })
  })

  describe('cacheSet', () => {
    it('should set data in Upstash Redis with TTL', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { cacheSet } = await import('@/lib/cache/redis-cache')

      const result = await cacheSet('test-key', { data: 'value' }, 3600)

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ data: 'value' }),
        { ex: 3600 }
      )
      expect(result).toBe(true)
    })

    it('should use default TTL when not provided', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { cacheSet } = await import('@/lib/cache/redis-cache')

      await cacheSet('test-key', { data: 'value' })

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'test-key',
        expect.any(String),
        { ex: 3600 } // Default TTL
      )
    })

    it('should return false when Upstash not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { cacheSet, disconnectRedis } = await import('@/lib/cache/redis-cache')
      await disconnectRedis()

      const result = await cacheSet('test-key', { data: 'value' })

      expect(result).toBe(false)
    })

    it('should handle Redis errors gracefully', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.set.mockRejectedValueOnce(new Error('Redis error'))

      const { cacheSet } = await import('@/lib/cache/redis-cache')

      const result = await cacheSet('error-key', { data: 'value' })

      expect(result).toBe(false)
    })

    it('should serialize complex objects correctly', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { cacheSet } = await import('@/lib/cache/redis-cache')

      const complexData = {
        string: 'test',
        number: 123,
        nested: { deep: { value: 'nested' } },
        array: [1, 2, 3],
      }

      await cacheSet('complex', complexData, 3600)

      const serialized = (mockRedisInstance.set as ReturnType<typeof vi.fn>).mock.calls[0][1]
      expect(JSON.parse(serialized)).toEqual(complexData)
    })
  })

  describe('cacheDel', () => {
    it('should delete key from Redis', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { cacheDel } = await import('@/lib/cache/redis-cache')

      const result = await cacheDel('test-key')

      expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key')
      expect(result).toBe(true)
    })

    it('should return false when Upstash not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { cacheDel, disconnectRedis } = await import('@/lib/cache/redis-cache')
      await disconnectRedis()

      const result = await cacheDel('test-key')

      expect(result).toBe(false)
    })

    it('should handle Redis errors gracefully', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.del.mockRejectedValueOnce(new Error('Redis error'))

      const { cacheDel } = await import('@/lib/cache/redis-cache')

      const result = await cacheDel('error-key')

      expect(result).toBe(false)
    })
  })

  describe('cacheOrCalculate', () => {
    it('should return cached value when available', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.get.mockResolvedValueOnce({ cached: true })

      const { cacheOrCalculate } = await import('@/lib/cache/redis-cache')

      const calculate = vi.fn().mockResolvedValue({ calculated: true })
      const result = await cacheOrCalculate('test-key', calculate, 3600)

      expect(result).toEqual({ cached: true })
      expect(calculate).not.toHaveBeenCalled()
    })

    it('should calculate and cache when not in cache', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.get.mockResolvedValueOnce(null)

      const { cacheOrCalculate } = await import('@/lib/cache/redis-cache')

      const calculate = vi.fn().mockResolvedValue({ calculated: true })
      const result = await cacheOrCalculate('test-key', calculate, 3600)

      expect(result).toEqual({ calculated: true })
      expect(calculate).toHaveBeenCalled()

      // Wait for background cache set
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'test-key',
        JSON.stringify({ calculated: true }),
        { ex: 3600 }
      )
    })

    it('should handle cache set failure gracefully', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.get.mockResolvedValueOnce(null)
      mockRedisInstance.set.mockRejectedValueOnce(new Error('Set failed'))

      const { cacheOrCalculate } = await import('@/lib/cache/redis-cache')

      const calculate = vi.fn().mockResolvedValue({ calculated: true })
      const result = await cacheOrCalculate('test-key', calculate, 3600)

      expect(result).toEqual({ calculated: true })
    })

    it('should use default TTL when not provided', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.get.mockResolvedValueOnce(null)

      const { cacheOrCalculate } = await import('@/lib/cache/redis-cache')

      const calculate = vi.fn().mockResolvedValue({ data: 'test' })
      await cacheOrCalculate('test-key', calculate)

      // Wait for background cache set
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'test-key',
        expect.any(String),
        { ex: 3600 } // Default TTL
      )
    })
  })

  describe('cacheGetMany', () => {
    it('should get multiple keys from Redis', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.mget.mockResolvedValueOnce([{ id: 1 }, { id: 2 }, null])

      const { cacheGetMany } = await import('@/lib/cache/redis-cache')

      const results = await cacheGetMany<{ id: number }>(['key1', 'key2', 'key3'])

      expect(mockRedisInstance.mget).toHaveBeenCalledWith('key1', 'key2', 'key3')
      expect(results).toEqual([{ id: 1 }, { id: 2 }, null])
    })

    it('should return all nulls when Upstash not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { cacheGetMany, disconnectRedis } = await import('@/lib/cache/redis-cache')
      await disconnectRedis()

      const results = await cacheGetMany(['key1', 'key2', 'key3'])

      expect(results).toEqual([null, null, null])
    })

    it('should handle Redis errors gracefully', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.mget.mockRejectedValueOnce(new Error('Redis error'))

      const { cacheGetMany } = await import('@/lib/cache/redis-cache')

      const results = await cacheGetMany(['key1', 'key2'])

      expect(results).toEqual([null, null])
    })

    it('should handle empty keys array', async () => {
      const { cacheGetMany } = await import('@/lib/cache/redis-cache')

      const results = await cacheGetMany([])

      expect(results).toEqual([])
    })
  })

  describe('clearCacheByPattern', () => {
    it('should clear all keys matching pattern using scan', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.scan.mockResolvedValueOnce([0, ['key1', 'key2', 'key3']])
      mockRedisInstance.del.mockResolvedValueOnce(3)

      const { clearCacheByPattern } = await import('@/lib/cache/redis-cache')

      const count = await clearCacheByPattern('test:*')

      expect(mockRedisInstance.scan).toHaveBeenCalled()
      expect(mockRedisInstance.del).toHaveBeenCalledWith('key1', 'key2', 'key3')
      expect(count).toBe(3)
    })

    it('should return 0 when no keys match pattern', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.scan.mockResolvedValueOnce([0, []])

      const { clearCacheByPattern } = await import('@/lib/cache/redis-cache')

      const count = await clearCacheByPattern('non-existent:*')

      expect(count).toBe(0)
      expect(mockRedisInstance.del).not.toHaveBeenCalled()
    })

    it('should return 0 when Upstash not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { clearCacheByPattern, disconnectRedis } = await import('@/lib/cache/redis-cache')
      await disconnectRedis()

      const count = await clearCacheByPattern('test:*')

      expect(count).toBe(0)
    })

    it('should handle Redis errors gracefully', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.scan.mockRejectedValueOnce(new Error('Redis error'))

      const { clearCacheByPattern } = await import('@/lib/cache/redis-cache')

      const count = await clearCacheByPattern('test:*')

      expect(count).toBe(0)
    })
  })

  describe('getCacheInfo', () => {
    it('should return connected when ping succeeds', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.ping.mockResolvedValueOnce('PONG')

      const { getCacheInfo } = await import('@/lib/cache/redis-cache')

      const info = await getCacheInfo()

      expect(mockRedisInstance.ping).toHaveBeenCalled()
      expect(info).toBe('connected')
    })

    it('should return null when Upstash not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { getCacheInfo, disconnectRedis } = await import('@/lib/cache/redis-cache')
      await disconnectRedis()

      const info = await getCacheInfo()

      expect(info).toBeNull()
    })

    it('should handle Redis errors gracefully', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.ping.mockRejectedValueOnce(new Error('Redis error'))

      const { getCacheInfo } = await import('@/lib/cache/redis-cache')

      const info = await getCacheInfo()

      expect(info).toBeNull()
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle null values correctly', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { cacheSet, cacheGet } = await import('@/lib/cache/redis-cache')

      await cacheSet('null-key', null, 3600)

      const serialized = (mockRedisInstance.set as ReturnType<typeof vi.fn>).mock.calls[0][1]
      expect(serialized).toBe('null')
    })

    it('should handle very large data correctly', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { cacheSet } = await import('@/lib/cache/redis-cache')

      const largeData = {
        items: Array(1000)
          .fill(null)
          .map((_, i) => ({
            id: i,
            data: 'x'.repeat(100),
          })),
      }

      const result = await cacheSet('large-key', largeData, 3600)

      expect(result).toBe(true)
      const serialized = (mockRedisInstance.set as ReturnType<typeof vi.fn>).mock.calls[0][1]
      expect(JSON.parse(serialized)).toEqual(largeData)
    })

    it('should handle special characters in keys', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { cacheSet } = await import('@/lib/cache/redis-cache')

      const specialKeys = [
        'key:with:colons',
        'key/with/slashes',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key@with@at',
      ]

      for (const key of specialKeys) {
        await cacheSet(key, { test: key }, 3600)
        expect(mockRedisInstance.set).toHaveBeenCalledWith(key, expect.any(String), { ex: 3600 })
      }
    })

    it('should handle concurrent operations', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { cacheSet, cacheGet } = await import('@/lib/cache/redis-cache')

      // Simulate concurrent operations
      await Promise.all([
        cacheSet('concurrent-1', { id: 1 }, 3600),
        cacheSet('concurrent-2', { id: 2 }, 3600),
        cacheSet('concurrent-3', { id: 3 }, 3600),
        cacheGet('concurrent-read-1'),
        cacheGet('concurrent-read-2'),
      ])

      expect(mockRedisInstance.set).toHaveBeenCalledTimes(3)
      expect(mockRedisInstance.get).toHaveBeenCalledTimes(2)
    })
  })
})
