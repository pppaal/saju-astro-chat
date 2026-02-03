/**
 * Edge Cases and Security Tests for Redis Cache
 * Tests connection failures, key validation, injection attacks, and error scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

// Mock redis client with realistic behaviors
const mockRedisClient = {
  isOpen: true,
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  get: vi.fn(),
  setEx: vi.fn(),
  del: vi.fn(),
  mGet: vi.fn(),
  keys: vi.fn(),
  info: vi.fn(),
}

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Redis Cache - Edge Cases and Security', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, REDIS_URL: 'redis://localhost:6379' }
    mockRedisClient.isOpen = true
  })

  afterEach(async () => {
    process.env = originalEnv
    await disconnectRedis()
  })

  describe('Key Validation - Injection Prevention', () => {
    it('should reject keys with newline characters', async () => {
      const maliciousKey = 'key\nSET malicious value'

      await expect(async () => {
        await cacheSet(maliciousKey, 'data')
      }).rejects.toThrow('Cache key contains invalid characters')
    })

    it('should reject keys with carriage return', async () => {
      const maliciousKey = 'key\rSET malicious value'

      await expect(async () => {
        await cacheSet(maliciousKey, 'data')
      }).rejects.toThrow('Cache key contains invalid characters')
    })

    it('should reject empty string keys', async () => {
      await expect(async () => {
        await cacheSet('', 'data')
      }).rejects.toThrow('Cache key must be a non-empty string')
    })

    it('should reject null keys', async () => {
      await expect(async () => {
        await cacheSet(null as any, 'data')
      }).rejects.toThrow('Cache key must be a non-empty string')
    })

    it('should reject undefined keys', async () => {
      await expect(async () => {
        await cacheSet(undefined as any, 'data')
      }).rejects.toThrow('Cache key must be a non-empty string')
    })

    it('should reject non-string keys', async () => {
      await expect(async () => {
        await cacheSet(123 as any, 'data')
      }).rejects.toThrow('Cache key must be a non-empty string')

      await expect(async () => {
        await cacheSet({} as any, 'data')
      }).rejects.toThrow('Cache key must be a non-empty string')

      await expect(async () => {
        await cacheSet([] as any, 'data')
      }).rejects.toThrow('Cache key must be a non-empty string')
    })

    it('should reject keys longer than 512 characters', async () => {
      const longKey = 'a'.repeat(513)

      await expect(async () => {
        await cacheSet(longKey, 'data')
      }).rejects.toThrow('Cache key too long')
    })

    it('should accept keys at exactly 512 characters', async () => {
      const maxKey = 'a'.repeat(512)
      mockRedisClient.setEx.mockResolvedValue('OK')

      const result = await cacheSet(maxKey, 'data')

      expect(result).toBe(true)
      expect(mockRedisClient.setEx).toHaveBeenCalled()
    })

    it('should reject CRLF injection attempts', async () => {
      const injectionAttempts = ['key\r\nSET attack value', 'key\n\rDEL *', 'prefix\r\nFLUSHALL']

      for (const key of injectionAttempts) {
        await expect(async () => {
          await cacheSet(key, 'data')
        }).rejects.toThrow('Cache key contains invalid characters')
      }
    })
  })

  describe('TTL Validation', () => {
    it('should reject negative TTL', async () => {
      await expect(async () => {
        await cacheSet('key', 'data', -1)
      }).rejects.toThrow('TTL must be between 1 second and 1 year')
    })

    it('should reject zero TTL', async () => {
      await expect(async () => {
        await cacheSet('key', 'data', 0)
      }).rejects.toThrow('TTL must be between 1 second and 1 year')
    })

    it('should reject TTL longer than 1 year', async () => {
      const oneYear = 31536000
      await expect(async () => {
        await cacheSet('key', 'data', oneYear + 1)
      }).rejects.toThrow('TTL must be between 1 second and 1 year')
    })

    it('should accept TTL at exactly 1 year', async () => {
      const oneYear = 31536000
      mockRedisClient.setEx.mockResolvedValue('OK')

      const result = await cacheSet('key', 'data', oneYear)

      expect(result).toBe(true)
    })

    it('should accept minimum TTL of 1 second', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK')

      const result = await cacheSet('key', 'data', 1)

      expect(result).toBe(true)
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('key', 1, expect.any(String))
    })
  })

  describe('Connection Failures', () => {
    it('should handle connection timeout gracefully', async () => {
      mockRedisClient.connect.mockRejectedValueOnce(new Error('Connection timeout'))

      const result = await cacheGet('key')

      expect(result).toBeNull()
    })

    it('should handle connection refused', async () => {
      mockRedisClient.connect.mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const result = await cacheGet('key')

      expect(result).toBeNull()
    })

    it('should return error in cacheGetResult when connection fails', async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error('Connection lost'))

      const result = await cacheGetResult('key')

      expect(result.hit).toBe(false)
      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
    })

    it('should return error in cacheSetResult when connection fails', async () => {
      mockRedisClient.setEx.mockRejectedValueOnce(new Error('Connection lost'))

      const result = await cacheSetResult('key', 'data')

      expect(result.ok).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should prevent concurrent connection attempts', async () => {
      let connectResolve: any
      mockRedisClient.connect.mockReturnValue(
        new Promise((resolve) => {
          connectResolve = resolve
        })
      )

      const promise1 = cacheGet('key1')
      const promise2 = cacheGet('key2')
      const promise3 = cacheGet('key3')

      connectResolve()

      await Promise.all([promise1, promise2, promise3])

      // Should only connect once despite multiple requests
      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1)
    })

    it('should handle Redis server unavailable', async () => {
      process.env.REDIS_URL = undefined

      const result = await cacheGet('key')

      expect(result).toBeNull()
      expect(mockRedisClient.connect).not.toHaveBeenCalled()
    })

    it('should handle Redis client error events', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'))

      const result = await cacheGet('key')

      expect(result).toBeNull()
    })
  })

  describe('Data Serialization Edge Cases', () => {
    it('should handle circular references gracefully', async () => {
      const circular: any = { a: 1 }
      circular.self = circular

      await expect(async () => {
        await cacheSet('key', circular)
      }).rejects.toThrow()
    })

    it('should handle undefined values', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK')

      const result = await cacheSet('key', undefined)

      expect(result).toBe(true)
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'key',
        expect.any(Number),
        'null' // JSON.stringify(undefined) returns undefined but we handle it
      )
    })

    it('should handle null values', async () => {
      mockRedisClient.setEx.mockResolvedValue('OK')

      const result = await cacheSet('key', null)

      expect(result).toBe(true)
      expect(mockRedisClient.setEx).toHaveBeenCalledWith('key', expect.any(Number), 'null')
    })

    it('should handle BigInt serialization error', async () => {
      const bigIntValue = { value: BigInt(9007199254740991) }

      await expect(async () => {
        await cacheSet('key', bigIntValue)
      }).rejects.toThrow()
    })

    it('should handle corrupted cache data', async () => {
      mockRedisClient.get.mockResolvedValue('{ invalid json')

      const result = await cacheGet('key')

      expect(result).toBeNull()
    })

    it('should handle non-JSON string in cache', async () => {
      mockRedisClient.get.mockResolvedValue('plain text')

      const result = await cacheGet('key')

      expect(result).toBeNull()
    })

    it('should handle empty string from cache', async () => {
      mockRedisClient.get.mockResolvedValue('')

      const result = await cacheGet('key')

      expect(result).toBeNull()
    })
  })

  describe('Batch Operations Edge Cases', () => {
    it('should handle empty keys array in cacheGetMany', async () => {
      const results = await cacheGetMany([])

      expect(results).toEqual([])
      expect(mockRedisClient.mGet).not.toHaveBeenCalled()
    })

    it('should handle large batch of keys', async () => {
      const keys = Array(1000)
        .fill('key')
        .map((k, i) => `${k}${i}`)
      mockRedisClient.mGet.mockResolvedValue(Array(1000).fill(null))

      const results = await cacheGetMany(keys)

      expect(results.length).toBe(1000)
      expect(mockRedisClient.mGet).toHaveBeenCalledWith(keys)
    })

    it('should handle partial failures in batch get', async () => {
      mockRedisClient.mGet.mockResolvedValue(['{"data": 1}', null, '{"data": 2}', 'invalid json'])

      const results = await cacheGetMany(['key1', 'key2', 'key3', 'key4'])

      expect(results[0]).toEqual({ data: 1 })
      expect(results[1]).toBeNull()
      expect(results[2]).toEqual({ data: 2 })
      expect(results[3]).toBeNull() // Invalid JSON returns null
    })

    it('should handle batch get connection error', async () => {
      mockRedisClient.mGet.mockRejectedValue(new Error('Connection lost'))

      const results = await cacheGetMany(['key1', 'key2'])

      expect(results).toEqual([null, null])
    })
  })

  describe('Pattern-based Cache Clearing', () => {
    it('should handle pattern with no matches', async () => {
      mockRedisClient.keys.mockResolvedValue([])

      const count = await clearCacheByPattern('nonexistent:*')

      expect(count).toBe(0)
      expect(mockRedisClient.del).not.toHaveBeenCalled()
    })

    it('should handle pattern with many matches', async () => {
      const keys = Array(500)
        .fill('key')
        .map((k, i) => `prefix:${i}`)
      mockRedisClient.keys.mockResolvedValue(keys)
      mockRedisClient.del.mockResolvedValue(500)

      const count = await clearCacheByPattern('prefix:*')

      expect(count).toBe(500)
      expect(mockRedisClient.del).toHaveBeenCalledWith(keys)
    })

    it('should handle wildcard pattern safely', async () => {
      mockRedisClient.keys.mockResolvedValue(['key1', 'key2'])
      mockRedisClient.del.mockResolvedValue(2)

      const count = await clearCacheByPattern('*')

      expect(count).toBe(2)
    })

    it('should handle pattern clear error', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Keys command failed'))

      const count = await clearCacheByPattern('prefix:*')

      expect(count).toBe(0)
    })

    it('should handle delete error after keys found', async () => {
      mockRedisClient.keys.mockResolvedValue(['key1', 'key2'])
      mockRedisClient.del.mockRejectedValue(new Error('Delete failed'))

      const count = await clearCacheByPattern('prefix:*')

      expect(count).toBe(0)
    })
  })

  describe('Cache-or-Calculate Pattern', () => {
    it('should calculate when cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null)
      const calculate = vi.fn().mockResolvedValue({ result: 'calculated' })

      const result = await cacheOrCalculate('key', calculate)

      expect(result).toEqual({ result: 'calculated' })
      expect(calculate).toHaveBeenCalled()
    })

    it('should not calculate when cache hit', async () => {
      mockRedisClient.get.mockResolvedValue('{"result":"cached"}')
      const calculate = vi.fn()

      const result = await cacheOrCalculate('key', calculate)

      expect(result).toEqual({ result: 'cached' })
      expect(calculate).not.toHaveBeenCalled()
    })

    it('should handle calculation errors', async () => {
      mockRedisClient.get.mockResolvedValue(null)
      const calculate = vi.fn().mockRejectedValue(new Error('Calculation failed'))

      await expect(async () => {
        await cacheOrCalculate('key', calculate)
      }).rejects.toThrow('Calculation failed')
    })

    it('should not fail if cache set fails after calculation', async () => {
      mockRedisClient.get.mockResolvedValue(null)
      mockRedisClient.setEx.mockRejectedValue(new Error('Set failed'))
      const calculate = vi.fn().mockResolvedValue({ result: 'calculated' })

      const result = await cacheOrCalculate('key', calculate)

      expect(result).toEqual({ result: 'calculated' })
    })

    it('should cache the calculated result', async () => {
      mockRedisClient.get.mockResolvedValue(null)
      mockRedisClient.setEx.mockResolvedValue('OK')
      const calculate = vi.fn().mockResolvedValue({ result: 'calculated' })

      await cacheOrCalculate('key', calculate, 3600)

      // Wait for async cache set
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'key',
        3600,
        JSON.stringify({ result: 'calculated' })
      )
    })
  })

  describe('Connection Management', () => {
    it('should disconnect gracefully', async () => {
      mockRedisClient.quit.mockResolvedValue(undefined)

      await disconnectRedis()

      expect(mockRedisClient.quit).toHaveBeenCalled()
    })

    it('should force disconnect if quit fails', async () => {
      mockRedisClient.quit.mockRejectedValue(new Error('Quit failed'))
      mockRedisClient.disconnect.mockResolvedValue(undefined)

      await disconnectRedis()

      expect(mockRedisClient.disconnect).toHaveBeenCalled()
    })

    it('should handle disconnect when client is null', async () => {
      process.env.REDIS_URL = undefined

      await expect(disconnectRedis()).resolves.not.toThrow()
    })

    it('should reuse existing open connection', async () => {
      mockRedisClient.isOpen = true
      mockRedisClient.get.mockResolvedValue(null)

      await cacheGet('key1')
      await cacheGet('key2')

      expect(mockRedisClient.connect).not.toHaveBeenCalled()
    })

    it('should reconnect if connection is closed', async () => {
      mockRedisClient.isOpen = false
      mockRedisClient.connect.mockResolvedValue(undefined)
      mockRedisClient.get.mockResolvedValue(null)

      await cacheGet('key')

      expect(mockRedisClient.connect).toHaveBeenCalled()
    })
  })

  describe('Cache Info', () => {
    it('should retrieve cache info', async () => {
      const mockInfo = 'total_connections_received:1000\ntotal_commands_processed:5000'
      mockRedisClient.info.mockResolvedValue(mockInfo)

      const info = await getCacheInfo()

      expect(info).toBe(mockInfo)
      expect(mockRedisClient.info).toHaveBeenCalledWith('stats')
    })

    it('should handle info error', async () => {
      mockRedisClient.info.mockRejectedValue(new Error('Info failed'))

      const info = await getCacheInfo()

      expect(info).toBeNull()
    })

    it('should return null when Redis unavailable', async () => {
      process.env.REDIS_URL = undefined

      const info = await getCacheInfo()

      expect(info).toBeNull()
    })
  })

  describe('Cache Key Generators - Security', () => {
    it('should handle special characters in user input safely', () => {
      const key = CacheKeys.saju('1990-01-01; DROP TABLE users;', '12:00', 'M')

      expect(key).not.toContain('DROP')
      expect(key).toContain('1990-01-01; DROP TABLE users;')
    })

    it('should handle Unicode characters', () => {
      const key = CacheKeys.tarot('유저123', '질문 🔮', 'spread')

      expect(key).toContain('tarot:v1:')
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
