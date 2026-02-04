/**
 * Redis Cache Tests
 *
 * Aligned with the actual @upstash/redis implementation in src/lib/cache/redis-cache.ts
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
  cacheOrCalculate,
  cacheGetMany,
  clearCacheByPattern,
  getCacheInfo,
  disconnectRedis,
  CacheKeys,
  CACHE_TTL,
} from '@/lib/cache/redis-cache'

describe('Redis Cache', () => {
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

  describe('CACHE_TTL', () => {
    it('defines TTL for different data types', () => {
      expect(CACHE_TTL.SAJU_RESULT).toBe(60 * 60 * 24 * 7)
      expect(CACHE_TTL.TAROT_READING).toBe(60 * 60 * 24)
      expect(CACHE_TTL.DESTINY_MAP).toBe(60 * 60 * 24 * 3)
      expect(CACHE_TTL.CALENDAR_DATA).toBe(60 * 60 * 24)
    })
  })

  describe('CacheKeys', () => {
    it('generates saju cache key', () => {
      const key = CacheKeys.saju('1990-01-01', '12:00', 'M')
      expect(key).toBe('saju:v1:1990-01-01:12:00:M:solar')
    })

    it('generates tarot cache key', () => {
      const key = CacheKeys.tarot('user123', 'question', 'celtic')
      expect(key).toContain('tarot:v1:user123')
      expect(key).toContain('celtic')
    })

    it('generates destiny map key', () => {
      const key = CacheKeys.destinyMap('1990-01-01', '12:00')
      expect(key).toBe('destiny:v1:1990-01-01:12:00')
    })

    it('generates calendar key', () => {
      const key = CacheKeys.calendar(2024, 1, 'user123')
      expect(key).toBe('cal:v1:2024:1:user123')
    })

    it('generates compatibility key', () => {
      const key = CacheKeys.compatibility('person1', 'person2')
      expect(key).toBe('compat:v1:person1:person2')
    })

    it('generates yearly calendar key with category', () => {
      const key = CacheKeys.yearlyCalendar('1990-01-01', '12:00', 'M', 2024, 'love')
      expect(key).toBe('yearly:v2:1990-01-01:12:00:M:2024:love')
    })

    it('generates yearly calendar key without category', () => {
      const key = CacheKeys.yearlyCalendar('1990-01-01', '12:00', 'M', 2024)
      expect(key).toBe('yearly:v2:1990-01-01:12:00:M:2024:all')
    })
  })

  describe('cacheGet', () => {
    it('returns null when Upstash not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      await disconnectRedis()

      const result = await cacheGet('test-key')

      expect(result).toBeNull()
    })
  })

  describe('cacheSet', () => {
    it('returns false when Upstash not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      await disconnectRedis()

      const result = await cacheSet('test-key', { data: 'test' })

      expect(result).toBe(false)
    })
  })

  describe('cacheDel', () => {
    it('returns false when Upstash not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      await disconnectRedis()

      const result = await cacheDel('test-key')

      expect(result).toBe(false)
    })
  })

  describe('cacheOrCalculate', () => {
    it('calls calculate function when cache misses', async () => {
      mockRedisInstance.get.mockResolvedValueOnce(null)
      mockRedisInstance.set.mockResolvedValueOnce('OK')
      const calculate = vi.fn().mockResolvedValue({ data: 'calculated' })

      const result = await cacheOrCalculate('test-key', calculate, 3600)

      expect(calculate).toHaveBeenCalled()
      expect(result).toEqual({ data: 'calculated' })
    })
  })

  describe('cacheGetMany', () => {
    it('returns array of nulls when Upstash not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      await disconnectRedis()

      const result = await cacheGetMany(['key1', 'key2', 'key3'])

      expect(result).toEqual([null, null, null])
    })
  })

  describe('clearCacheByPattern', () => {
    it('returns 0 when Upstash not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      await disconnectRedis()

      const result = await clearCacheByPattern('test:*')

      expect(result).toBe(0)
    })
  })

  describe('CacheKeys edge cases', () => {
    it('generates grading key with truncated hash', () => {
      const key = CacheKeys.grading('2024-01-15', JSON.stringify({ test: 'data' }))
      expect(key).toMatch(/^grade:v1:2024-01-15:/)
      // btoa produces base64, sliced to 20 chars
      expect(key.split(':')[3].length).toBeLessThanOrEqual(20)
    })

    it('handles special characters in tarot question', () => {
      const key = CacheKeys.tarot('user1', 'What is my love life?', 'celtic')
      expect(key).toContain('tarot:v1:user1:')
      // btoa should encode the question
      expect(key).not.toContain('What is my love life?')
    })

    it('generates unique keys for different birth times', () => {
      const key1 = CacheKeys.saju('1990-01-01', '12:00', 'M')
      const key2 = CacheKeys.saju('1990-01-01', '12:01', 'M')
      const key3 = CacheKeys.saju('1990-01-01', '12:00', 'F')

      expect(key1).not.toBe(key2)
      expect(key1).not.toBe(key3)
    })

    it('generates consistent keys for same inputs', () => {
      const key1 = CacheKeys.destinyMap('1990-01-01', '12:00')
      const key2 = CacheKeys.destinyMap('1990-01-01', '12:00')

      expect(key1).toBe(key2)
    })
  })

  describe('CACHE_TTL values', () => {
    it('has correct TTL for compatibility', () => {
      expect(CACHE_TTL.COMPATIBILITY).toBe(60 * 60 * 24 * 7)
    })

    it('has correct TTL for grading', () => {
      expect(CACHE_TTL.GRADING_RESULT).toBe(60 * 60 * 24)
    })

    it('all TTL values are positive numbers', () => {
      Object.values(CACHE_TTL).forEach((ttl) => {
        expect(ttl).toBeGreaterThan(0)
        expect(typeof ttl).toBe('number')
      })
    })
  })

  describe('error handling patterns', () => {
    it('cacheOrCalculate returns calculated value on cache miss', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      await disconnectRedis()

      const calculate = vi.fn().mockResolvedValue({ computed: true })
      const result = await cacheOrCalculate('key', calculate)

      expect(result).toEqual({ computed: true })
      expect(calculate).toHaveBeenCalledOnce()
    })

    it('cacheGetMany returns correct length array', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      await disconnectRedis()

      const keys = ['key1', 'key2', 'key3', 'key4', 'key5']
      const result = await cacheGetMany(keys)

      expect(result).toHaveLength(5)
      expect(result.every((r) => r === null)).toBe(true)
    })
  })

  describe('Redis operations with mocked Upstash client', () => {
    it('cacheGet retrieves data from Redis', async () => {
      const testData = { test: 'data', value: 123 }
      // Upstash auto-deserializes JSON, so the mock returns the object directly
      mockRedisInstance.get.mockResolvedValueOnce(testData)

      const result = await cacheGet('test-key')

      expect(mockRedisInstance.get).toHaveBeenCalledWith('test-key')
      expect(result).toEqual(testData)
    })

    it('cacheGet returns null for non-existent key', async () => {
      mockRedisInstance.get.mockResolvedValueOnce(null)

      const result = await cacheGet('non-existent')

      expect(result).toBeNull()
    })

    it('cacheGet handles Redis errors', async () => {
      mockRedisInstance.get.mockRejectedValueOnce(new Error('Redis error'))

      const result = await cacheGet('error-key')

      expect(result).toBeNull()
    })

    it('cacheSet stores data with TTL using set with ex option', async () => {
      mockRedisInstance.set.mockResolvedValueOnce('OK')

      const data = { test: 'value' }
      const result = await cacheSet('test-key', data, 3600)

      expect(mockRedisInstance.set).toHaveBeenCalledWith('test-key', JSON.stringify(data), {
        ex: 3600,
      })
      expect(result).toBe(true)
    })

    it('cacheSet uses default TTL when not specified', async () => {
      mockRedisInstance.set.mockResolvedValueOnce('OK')

      await cacheSet('test-key', { data: 'test' })

      expect(mockRedisInstance.set).toHaveBeenCalledWith('test-key', expect.any(String), {
        ex: 3600,
      })
    })

    it('cacheSet handles Redis errors', async () => {
      mockRedisInstance.set.mockRejectedValueOnce(new Error('Set error'))

      const result = await cacheSet('error-key', { data: 'test' })

      expect(result).toBe(false)
    })

    it('cacheDel removes key from Redis', async () => {
      mockRedisInstance.del.mockResolvedValueOnce(1)

      const result = await cacheDel('test-key')

      expect(mockRedisInstance.del).toHaveBeenCalledWith('test-key')
      expect(result).toBe(true)
    })

    it('cacheDel handles Redis errors', async () => {
      mockRedisInstance.del.mockRejectedValueOnce(new Error('Delete error'))

      const result = await cacheDel('error-key')

      expect(result).toBe(false)
    })

    it('cacheOrCalculate uses cached value when available', async () => {
      const cachedData = { cached: true }
      mockRedisInstance.get.mockResolvedValueOnce(cachedData)

      const calculate = vi.fn()
      const result = await cacheOrCalculate('cached-key', calculate, 3600)

      expect(result).toEqual(cachedData)
      expect(calculate).not.toHaveBeenCalled()
    })

    it('cacheOrCalculate calculates and caches on miss', async () => {
      mockRedisInstance.get.mockResolvedValueOnce(null)
      mockRedisInstance.set.mockResolvedValueOnce('OK')

      const calculatedData = { calculated: true }
      const calculate = vi.fn().mockResolvedValue(calculatedData)

      const result = await cacheOrCalculate('miss-key', calculate, 7200)

      expect(calculate).toHaveBeenCalled()
      expect(result).toEqual(calculatedData)

      // Wait a bit for fire-and-forget cache set
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'miss-key',
        JSON.stringify(calculatedData),
        { ex: 7200 }
      )
    })

    it('cacheOrCalculate handles cache set failure gracefully', async () => {
      mockRedisInstance.get.mockResolvedValueOnce(null)
      mockRedisInstance.set.mockRejectedValueOnce(new Error('Set failed'))

      const calculatedData = { data: 'test' }
      const calculate = vi.fn().mockResolvedValue(calculatedData)

      const result = await cacheOrCalculate('key', calculate)

      expect(result).toEqual(calculatedData)
    })

    it('cacheGetMany retrieves multiple keys', async () => {
      const data1 = { value: 1 }
      const data2 = { value: 2 }
      // Upstash mget returns array directly
      mockRedisInstance.mget.mockResolvedValueOnce([data1, data2, null])

      const result = await cacheGetMany(['key1', 'key2', 'key3'])

      expect(mockRedisInstance.mget).toHaveBeenCalledWith('key1', 'key2', 'key3')
      expect(result).toEqual([data1, data2, null])
    })

    it('cacheGetMany handles Redis errors', async () => {
      mockRedisInstance.mget.mockRejectedValueOnce(new Error('mGet error'))

      const result = await cacheGetMany(['key1', 'key2'])

      expect(result).toEqual([null, null])
    })

    it('clearCacheByPattern clears matching keys using scan', async () => {
      // Upstash scan returns [cursor, keys]
      mockRedisInstance.scan.mockResolvedValueOnce([0, ['saju:key1', 'saju:key2', 'saju:key3']])
      mockRedisInstance.del.mockResolvedValueOnce(3)

      const result = await clearCacheByPattern('saju:*')

      expect(mockRedisInstance.scan).toHaveBeenCalled()
      expect(mockRedisInstance.del).toHaveBeenCalledWith('saju:key1', 'saju:key2', 'saju:key3')
      expect(result).toBe(3)
    })

    it('clearCacheByPattern returns 0 when no keys match', async () => {
      mockRedisInstance.scan.mockResolvedValueOnce([0, []])

      const result = await clearCacheByPattern('nonexistent:*')

      expect(mockRedisInstance.del).not.toHaveBeenCalled()
      expect(result).toBe(0)
    })

    it('clearCacheByPattern handles Redis errors', async () => {
      mockRedisInstance.scan.mockRejectedValueOnce(new Error('Scan error'))

      const result = await clearCacheByPattern('pattern:*')

      expect(result).toBe(0)
    })

    it('getCacheInfo returns connected on PONG', async () => {
      mockRedisInstance.ping.mockResolvedValueOnce('PONG')

      const result = await getCacheInfo()

      expect(mockRedisInstance.ping).toHaveBeenCalled()
      expect(result).toBe('connected')
    })

    it('getCacheInfo handles Redis errors', async () => {
      mockRedisInstance.ping.mockRejectedValueOnce(new Error('Info error'))

      const result = await getCacheInfo()

      expect(result).toBeNull()
    })

    it('getCacheInfo returns null when Redis not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      await disconnectRedis()

      const result = await getCacheInfo()

      expect(result).toBeNull()
    })
  })

  describe('Complex data type handling', () => {
    it('handles nested objects', async () => {
      const complexData = {
        user: {
          name: 'Test',
          profile: {
            age: 25,
            tags: ['admin', 'user'],
          },
        },
      }

      mockRedisInstance.set.mockResolvedValueOnce('OK')

      await cacheSet('complex', complexData)

      const serialized = (mockRedisInstance.set as ReturnType<typeof vi.fn>).mock.calls[0][1]
      expect(JSON.parse(serialized)).toEqual(complexData)
    })

    it('handles arrays', async () => {
      const arrayData = [1, 2, 3, { nested: true }]
      mockRedisInstance.set.mockResolvedValueOnce('OK')

      await cacheSet('array', arrayData)

      const serialized = (mockRedisInstance.set as ReturnType<typeof vi.fn>).mock.calls[0][1]
      expect(JSON.parse(serialized)).toEqual(arrayData)
    })

    it('handles special values', async () => {
      const specialData = {
        nullValue: null,
        boolTrue: true,
        boolFalse: false,
        number: 123,
        float: 123.456,
      }

      mockRedisInstance.set.mockResolvedValueOnce('OK')
      await cacheSet('special', specialData)

      const serialized = (mockRedisInstance.set as ReturnType<typeof vi.fn>).mock.calls[0][1]
      const parsed = JSON.parse(serialized)

      expect(parsed.nullValue).toBeNull()
      expect(parsed.boolTrue).toBe(true)
      expect(parsed.boolFalse).toBe(false)
      expect(parsed.number).toBe(123)
      expect(parsed.float).toBe(123.456)
    })
  })
})
