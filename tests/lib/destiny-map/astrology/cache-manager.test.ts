import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  CacheManager,
  generateDestinyMapCacheKey,
  DEFAULT_CACHE_CONFIG,
  type CacheConfig,
} from '@/lib/destiny-map/astrology/cache-manager'
import { logger } from '@/lib/logger'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
  },
}))

describe('cache-manager Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('DEFAULT_CACHE_CONFIG', () => {
    it('should have correct default TTL (5 minutes)', () => {
      expect(DEFAULT_CACHE_CONFIG.ttl).toBe(5 * 60 * 1000)
    })

    it('should have correct default maxSize', () => {
      expect(DEFAULT_CACHE_CONFIG.maxSize).toBe(50)
    })
  })

  describe('CacheManager Class', () => {
    describe('Constructor', () => {
      it('should create cache with default config', () => {
        const cache = new CacheManager()

        expect(cache.getSize()).toBe(0)
      })

      it('should accept partial config overrides', () => {
        const cache = new CacheManager({ ttl: 10000 })

        // Should use custom TTL but default maxSize
        cache.set('key1', 'value1')
        expect(cache.getSize()).toBe(1)
      })

      it('should accept full config override', () => {
        const customConfig: CacheConfig = {
          ttl: 2000,
          maxSize: 10,
        }

        const cache = new CacheManager(customConfig)

        // Verify by filling to maxSize
        for (let i = 0; i < 10; i++) {
          cache.set(`key${i}`, `value${i}`)
        }

        expect(cache.getSize()).toBe(10)

        // Next set should evict oldest
        cache.set('key10', 'value10')
        expect(cache.getSize()).toBe(10)
      })

      it('should accept enableDebugLogs parameter', () => {
        const cache = new CacheManager({}, true)

        cache.set('key1', 'value1')

        expect(logger.debug).toHaveBeenCalledWith('[Cache] Set', {
          key: 'key1',
          size: 1,
        })
      })

      it('should not log when debugLogs disabled', () => {
        const cache = new CacheManager({}, false)

        cache.set('key1', 'value1')

        expect(logger.debug).not.toHaveBeenCalled()
      })
    })

    describe('set() method', () => {
      it('should store value with key', () => {
        const cache = new CacheManager<string>()

        cache.set('key1', 'value1')

        expect(cache.get('key1')).toBe('value1')
      })

      it('should store complex objects', () => {
        const cache = new CacheManager<{ data: string; count: number }>()

        const obj = { data: 'test', count: 42 }
        cache.set('key1', obj)

        expect(cache.get('key1')).toEqual(obj)
      })

      it('should store arrays', () => {
        const cache = new CacheManager<number[]>()

        const arr = [1, 2, 3, 4, 5]
        cache.set('key1', arr)

        expect(cache.get('key1')).toEqual(arr)
      })

      it('should overwrite existing key', () => {
        const cache = new CacheManager<string>()

        cache.set('key1', 'value1')
        cache.set('key1', 'value2')

        expect(cache.get('key1')).toBe('value2')
        expect(cache.getSize()).toBe(1)
      })

      it('should increment size for new keys', () => {
        const cache = new CacheManager<string>()

        cache.set('key1', 'value1')
        expect(cache.getSize()).toBe(1)

        cache.set('key2', 'value2')
        expect(cache.getSize()).toBe(2)
      })

      it('should not increment size when overwriting', () => {
        const cache = new CacheManager<string>()

        cache.set('key1', 'value1')
        cache.set('key1', 'value2')

        expect(cache.getSize()).toBe(1)
      })

      it('should log set operation when debug enabled', () => {
        const cache = new CacheManager<string>({}, true)

        cache.set('key1', 'value1')

        expect(logger.debug).toHaveBeenCalledWith('[Cache] Set', {
          key: 'key1',
          size: 1,
        })
      })
    })

    describe('get() method', () => {
      it('should return null for missing key', () => {
        const cache = new CacheManager<string>()

        expect(cache.get('nonexistent')).toBeNull()
      })

      it('should return cached value within TTL', () => {
        const cache = new CacheManager<string>({ ttl: 5000 })

        cache.set('key1', 'value1')

        expect(cache.get('key1')).toBe('value1')
      })

      it('should return null for expired entries', async () => {
        const cache = new CacheManager<string>({ ttl: 50 }) // 50ms TTL

        cache.set('key1', 'value1')

        // Wait for expiration
        await new Promise((resolve) => setTimeout(resolve, 100))

        expect(cache.get('key1')).toBeNull()
      })

      it('should delete expired entry on get', async () => {
        const cache = new CacheManager<string>({ ttl: 50 })

        cache.set('key1', 'value1')
        expect(cache.getSize()).toBe(1)

        // Wait for expiration
        await new Promise((resolve) => setTimeout(resolve, 100))

        cache.get('key1')

        // Entry should be removed
        expect(cache.getSize()).toBe(0)
      })

      it('should log cache miss when debug enabled', () => {
        const cache = new CacheManager<string>({}, true)

        cache.get('nonexistent')

        expect(logger.debug).toHaveBeenCalledWith('[Cache] Miss', {
          key: 'nonexistent',
        })
      })

      it('should log cache hit when debug enabled', () => {
        const cache = new CacheManager<string>({}, true)

        cache.set('key1', 'value1')
        vi.clearAllMocks() // Clear set log

        cache.get('key1')

        expect(logger.debug).toHaveBeenCalledWith(
          '[Cache] Hit',
          expect.objectContaining({
            key: 'key1',
            age: expect.any(Number),
          })
        )
      })

      it('should log expired entry when debug enabled', async () => {
        const cache = new CacheManager<string>({ ttl: 50 }, true)

        cache.set('key1', 'value1')
        vi.clearAllMocks()

        // Wait for expiration
        await new Promise((resolve) => setTimeout(resolve, 100))

        cache.get('key1')

        expect(logger.debug).toHaveBeenCalledWith(
          '[Cache] Expired',
          expect.objectContaining({
            key: 'key1',
            age: expect.any(Number),
          })
        )
      })
    })

    describe('LRU Eviction', () => {
      it('should evict oldest entry when maxSize reached', () => {
        const cache = new CacheManager<string>({ maxSize: 3 })

        cache.set('key1', 'value1')
        cache.set('key2', 'value2')
        cache.set('key3', 'value3')

        expect(cache.getSize()).toBe(3)

        // Adding 4th item should evict key1 (oldest)
        cache.set('key4', 'value4')

        expect(cache.getSize()).toBe(3)
        expect(cache.get('key1')).toBeNull()
        expect(cache.get('key2')).toBe('value2')
        expect(cache.get('key3')).toBe('value3')
        expect(cache.get('key4')).toBe('value4')
      })

      it('should evict correct entry based on timestamp', async () => {
        const cache = new CacheManager<string>({ maxSize: 3 })

        cache.set('key1', 'value1')
        await new Promise((resolve) => setTimeout(resolve, 10))

        cache.set('key2', 'value2')
        await new Promise((resolve) => setTimeout(resolve, 10))

        cache.set('key3', 'value3')
        await new Promise((resolve) => setTimeout(resolve, 10))

        // key1 is oldest, should be evicted first
        cache.set('key4', 'value4')

        expect(cache.get('key1')).toBeNull()
        expect(cache.get('key2')).toBe('value2')
      })

      it('should log eviction when debug enabled', () => {
        const cache = new CacheManager<string>({ maxSize: 2 }, true)

        cache.set('key1', 'value1')
        cache.set('key2', 'value2')
        vi.clearAllMocks()

        cache.set('key3', 'value3')

        expect(logger.debug).toHaveBeenCalledWith('[Cache] Evicted', {
          key: 'key1',
        })
      })

      it('should handle rapid insertions at maxSize', () => {
        const cache = new CacheManager<number>({ maxSize: 5 })

        // Fill cache
        for (let i = 0; i < 5; i++) {
          cache.set(`key${i}`, i)
        }

        // Add more items (should evict oldest ones)
        for (let i = 5; i < 10; i++) {
          cache.set(`key${i}`, i)
        }

        // Size should remain at maxSize
        expect(cache.getSize()).toBe(5)

        // Oldest 5 should be evicted, newest 5 should remain
        expect(cache.get('key0')).toBeNull()
        expect(cache.get('key4')).toBeNull()
        expect(cache.get('key5')).toBe(5)
        expect(cache.get('key9')).toBe(9)
      })
    })

    describe('clear() method', () => {
      it('should remove all entries', () => {
        const cache = new CacheManager<string>()

        cache.set('key1', 'value1')
        cache.set('key2', 'value2')
        cache.set('key3', 'value3')

        cache.clear()

        expect(cache.getSize()).toBe(0)
        expect(cache.get('key1')).toBeNull()
        expect(cache.get('key2')).toBeNull()
      })

      it('should handle clearing empty cache', () => {
        const cache = new CacheManager<string>()

        cache.clear()

        expect(cache.getSize()).toBe(0)
      })

      it('should log clear operation when debug enabled', () => {
        const cache = new CacheManager<string>({}, true)

        cache.set('key1', 'value1')
        cache.set('key2', 'value2')
        vi.clearAllMocks()

        cache.clear()

        expect(logger.debug).toHaveBeenCalledWith('[Cache] Cleared', {
          itemsRemoved: 2,
        })
      })

      it('should allow re-use after clear', () => {
        const cache = new CacheManager<string>()

        cache.set('key1', 'value1')
        cache.clear()

        cache.set('key2', 'value2')

        expect(cache.get('key2')).toBe('value2')
        expect(cache.getSize()).toBe(1)
      })
    })

    describe('getSize() method', () => {
      it('should return 0 for empty cache', () => {
        const cache = new CacheManager<string>()

        expect(cache.getSize()).toBe(0)
      })

      it('should return correct size', () => {
        const cache = new CacheManager<string>()

        cache.set('key1', 'value1')
        expect(cache.getSize()).toBe(1)

        cache.set('key2', 'value2')
        expect(cache.getSize()).toBe(2)
      })

      it('should not count expired entries removed by get', async () => {
        const cache = new CacheManager<string>({ ttl: 50 })

        cache.set('key1', 'value1')
        cache.set('key2', 'value2')

        // Wait for expiration
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Accessing expired entries removes them
        cache.get('key1')
        cache.get('key2')

        expect(cache.getSize()).toBe(0)
      })
    })

    describe('cleanup() method', () => {
      it('should remove all expired entries', async () => {
        const cache = new CacheManager<string>({ ttl: 50 })

        cache.set('key1', 'value1')
        cache.set('key2', 'value2')
        cache.set('key3', 'value3')

        // Wait for expiration
        await new Promise((resolve) => setTimeout(resolve, 100))

        const removed = cache.cleanup()

        expect(removed).toBe(3)
        expect(cache.getSize()).toBe(0)
      })

      it('should not remove non-expired entries', async () => {
        const cache = new CacheManager<string>({ ttl: 1000 })

        cache.set('key1', 'value1')

        // Wait a bit but not long enough to expire
        await new Promise((resolve) => setTimeout(resolve, 100))

        const removed = cache.cleanup()

        expect(removed).toBe(0)
        expect(cache.getSize()).toBe(1)
        expect(cache.get('key1')).toBe('value1')
      })

      it('should remove only expired entries (mixed scenario)', async () => {
        const cache = new CacheManager<string>({ ttl: 100 })

        cache.set('key1', 'value1')
        cache.set('key2', 'value2')

        // Wait for first two to expire
        await new Promise((resolve) => setTimeout(resolve, 150))

        // Add new entry
        cache.set('key3', 'value3')

        const removed = cache.cleanup()

        expect(removed).toBe(2)
        expect(cache.getSize()).toBe(1)
        expect(cache.get('key1')).toBeNull()
        expect(cache.get('key2')).toBeNull()
        expect(cache.get('key3')).toBe('value3')
      })

      it('should return 0 when no entries need cleanup', () => {
        const cache = new CacheManager<string>({ ttl: 10000 })

        cache.set('key1', 'value1')
        cache.set('key2', 'value2')

        const removed = cache.cleanup()

        expect(removed).toBe(0)
        expect(cache.getSize()).toBe(2)
      })

      it('should handle cleanup on empty cache', () => {
        const cache = new CacheManager<string>()

        const removed = cache.cleanup()

        expect(removed).toBe(0)
      })

      it('should log cleanup when debug enabled and entries removed', async () => {
        const cache = new CacheManager<string>({ ttl: 50 }, true)

        cache.set('key1', 'value1')
        cache.set('key2', 'value2')
        vi.clearAllMocks()

        // Wait for expiration
        await new Promise((resolve) => setTimeout(resolve, 100))

        cache.cleanup()

        expect(logger.debug).toHaveBeenCalledWith('[Cache] Cleanup', {
          removed: 2,
          remaining: 0,
        })
      })

      it('should not log when no entries removed', () => {
        const cache = new CacheManager<string>({ ttl: 10000 }, true)

        cache.set('key1', 'value1')
        vi.clearAllMocks()

        cache.cleanup()

        expect(logger.debug).not.toHaveBeenCalled()
      })
    })

    describe('Generic Type Support', () => {
      it('should work with string type', () => {
        const cache = new CacheManager<string>()

        cache.set('key', 'value')

        expect(cache.get('key')).toBe('value')
      })

      it('should work with number type', () => {
        const cache = new CacheManager<number>()

        cache.set('key', 42)

        expect(cache.get('key')).toBe(42)
      })

      it('should work with boolean type', () => {
        const cache = new CacheManager<boolean>()

        cache.set('key', true)

        expect(cache.get('key')).toBe(true)
      })

      it('should work with interface type', () => {
        interface TestData {
          id: number
          name: string
          nested: { value: string }
        }

        const cache = new CacheManager<TestData>()

        const data: TestData = {
          id: 1,
          name: 'Test',
          nested: { value: 'deep' },
        }

        cache.set('key', data)

        expect(cache.get('key')).toEqual(data)
      })

      it('should work with union types', () => {
        const cache = new CacheManager<string | number | null>()

        cache.set('key1', 'string')
        cache.set('key2', 42)
        cache.set('key3', null)

        expect(cache.get('key1')).toBe('string')
        expect(cache.get('key2')).toBe(42)
        expect(cache.get('key3')).toBeNull()
      })
    })

    describe('Edge Cases & Performance', () => {
      it('should handle many sequential operations', () => {
        const cache = new CacheManager<number>({ maxSize: 100 })

        // Insert 100 items
        for (let i = 0; i < 100; i++) {
          cache.set(`key${i}`, i)
        }

        expect(cache.getSize()).toBe(100)

        // Retrieve all
        for (let i = 0; i < 100; i++) {
          expect(cache.get(`key${i}`)).toBe(i)
        }
      })

      it('should handle key collision with different values', () => {
        const cache = new CacheManager<string>()

        cache.set('key', 'value1')
        cache.set('key', 'value2')
        cache.set('key', 'value3')

        expect(cache.get('key')).toBe('value3')
        expect(cache.getSize()).toBe(1)
      })

      it('should handle special characters in keys', () => {
        const cache = new CacheManager<string>()

        const specialKeys = [
          'key with spaces',
          'key|with|pipes',
          'key:with:colons',
          'key/with/slashes',
          'key#with#hash',
          '🚀emoji🚀key',
        ]

        specialKeys.forEach((key, index) => {
          cache.set(key, `value${index}`)
        })

        specialKeys.forEach((key, index) => {
          expect(cache.get(key)).toBe(`value${index}`)
        })
      })

      it('should handle very long keys', () => {
        const cache = new CacheManager<string>()

        const longKey = 'a'.repeat(1000)
        cache.set(longKey, 'value')

        expect(cache.get(longKey)).toBe('value')
      })

      it('should handle maxSize of 1', () => {
        const cache = new CacheManager<string>({ maxSize: 1 })

        cache.set('key1', 'value1')
        expect(cache.getSize()).toBe(1)

        cache.set('key2', 'value2')
        expect(cache.getSize()).toBe(1)
        expect(cache.get('key1')).toBeNull()
        expect(cache.get('key2')).toBe('value2')
      })

      it('should handle very short TTL (1ms)', async () => {
        const cache = new CacheManager<string>({ ttl: 1 })

        cache.set('key', 'value')

        // Wait longer than TTL
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(cache.get('key')).toBeNull()
      })
    })
  })

  describe('generateDestinyMapCacheKey Function', () => {
    // The implementation uses null byte separator and JSON serialization with dmap prefix
    const SEP = '\x00'

    describe('Happy Path - Standard Inputs', () => {
      it('should generate key with all required fields', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
        }

        const key = generateDestinyMapCacheKey(input)

        // Format: dmap\x00"birthDate"\x00"birthTime"\x00lat\x00lon\x00"gender"\x00"tz"
        expect(key).toBe(`dmap${SEP}"1990-01-01"${SEP}"12:00"${SEP}37.5665${SEP}126.978${SEP}"male"${SEP}"auto"`)
      })

      it('should include gender when provided', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
          gender: 'female',
        }

        const key = generateDestinyMapCacheKey(input)

        expect(key).toContain('female')
      })

      it('should include timezone when provided', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
          tz: 'Asia/Seoul',
        }

        const key = generateDestinyMapCacheKey(input)

        expect(key).toContain('Asia/Seoul')
      })

      it('should include all optional fields', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
          gender: 'female',
          tz: 'America/New_York',
        }

        const key = generateDestinyMapCacheKey(input)

        expect(key).toBe(`dmap${SEP}"1990-01-01"${SEP}"12:00"${SEP}37.5665${SEP}126.978${SEP}"female"${SEP}"America/New_York"`)
      })
    })

    describe('Default Values', () => {
      it('should use "male" as default gender', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
        }

        const key = generateDestinyMapCacheKey(input)

        expect(key).toContain(`${SEP}"male"${SEP}`)
      })

      it('should use "auto" as default timezone', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
        }

        const key = generateDestinyMapCacheKey(input)

        expect(key.endsWith(`${SEP}"auto"`)).toBe(true)
      })
    })

    describe('Coordinate Precision', () => {
      it('should round latitude to 4 decimal places', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.123456789,
          longitude: 126.978,
        }

        const key = generateDestinyMapCacheKey(input)

        // Number(37.123456789.toFixed(4)) = 37.1235
        expect(key).toContain(`${SEP}37.1235${SEP}`)
      })

      it('should round longitude to 4 decimal places', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.987654321,
        }

        const key = generateDestinyMapCacheKey(input)

        // Number(126.987654321.toFixed(4)) = 126.9877
        expect(key).toContain(`${SEP}126.9877${SEP}`)
      })

      it('should not pad coordinates with trailing zeros (Number removes them)', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5,
          longitude: 126.9,
        }

        const key = generateDestinyMapCacheKey(input)

        // Number(37.5.toFixed(4)) = 37.5 (not 37.5000), Number(126.9.toFixed(4)) = 126.9
        expect(key).toContain(`${SEP}37.5${SEP}126.9${SEP}`)
      })

      it('should handle negative coordinates', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: -33.8688,
          longitude: 151.2093,
        }

        const key = generateDestinyMapCacheKey(input)

        expect(key).toContain(`${SEP}-33.8688${SEP}151.2093${SEP}`)
      })
    })

    describe('Key Consistency', () => {
      it('should generate same key for same inputs', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
          gender: 'female',
          tz: 'Asia/Seoul',
        }

        const key1 = generateDestinyMapCacheKey(input)
        const key2 = generateDestinyMapCacheKey(input)

        expect(key1).toBe(key2)
      })

      it('should generate different keys for different birth dates', () => {
        const input1 = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
        }

        const input2 = {
          birthDate: '1990-01-02',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
        }

        const key1 = generateDestinyMapCacheKey(input1)
        const key2 = generateDestinyMapCacheKey(input2)

        expect(key1).not.toBe(key2)
      })

      it('should generate different keys for different times', () => {
        const input1 = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
        }

        const input2 = {
          birthDate: '1990-01-01',
          birthTime: '13:00',
          latitude: 37.5665,
          longitude: 126.978,
        }

        const key1 = generateDestinyMapCacheKey(input1)
        const key2 = generateDestinyMapCacheKey(input2)

        expect(key1).not.toBe(key2)
      })

      it('should generate different keys for different coordinates', () => {
        const input1 = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
        }

        const input2 = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5666,
          longitude: 126.978,
        }

        const key1 = generateDestinyMapCacheKey(input1)
        const key2 = generateDestinyMapCacheKey(input2)

        expect(key1).not.toBe(key2)
      })

      it('should generate different keys for different genders', () => {
        const input1 = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
          gender: 'male',
        }

        const input2 = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
          gender: 'female',
        }

        const key1 = generateDestinyMapCacheKey(input1)
        const key2 = generateDestinyMapCacheKey(input2)

        expect(key1).not.toBe(key2)
      })

      it('should generate different keys for different timezones', () => {
        const input1 = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
          tz: 'Asia/Seoul',
        }

        const input2 = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
          tz: 'America/New_York',
        }

        const key1 = generateDestinyMapCacheKey(input1)
        const key2 = generateDestinyMapCacheKey(input2)

        expect(key1).not.toBe(key2)
      })
    })

    describe('Edge Cases', () => {
      it('should handle zero coordinates', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 0,
          longitude: 0,
        }

        const key = generateDestinyMapCacheKey(input)

        // Number(0.toFixed(4)) = 0 (not 0.0000)
        expect(key).toContain(`${SEP}0${SEP}0${SEP}`)
      })

      it('should handle boundary coordinates', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 90,
          longitude: 180,
        }

        const key = generateDestinyMapCacheKey(input)

        // Number(90.toFixed(4)) = 90 (not 90.0000)
        expect(key).toContain(`${SEP}90${SEP}180${SEP}`)
      })

      it('should handle negative boundary coordinates', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: -90,
          longitude: -180,
        }

        const key = generateDestinyMapCacheKey(input)

        expect(key).toContain(`${SEP}-90${SEP}-180${SEP}`)
      })

      it('should handle empty string gender (defaults to male)', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
          gender: '',
        }

        const key = generateDestinyMapCacheKey(input)

        expect(key).toContain(`${SEP}"male"${SEP}`)
      })

      it('should handle empty string timezone (defaults to auto)', () => {
        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
          tz: '',
        }

        const key = generateDestinyMapCacheKey(input)

        expect(key.endsWith(`${SEP}"auto"`)).toBe(true)
      })

      it('should handle various date formats', () => {
        const formats = ['1990-01-01', '1990/01/01', '01-01-1990', '2000-12-31']

        formats.forEach((date) => {
          const key = generateDestinyMapCacheKey({
            birthDate: date,
            birthTime: '12:00',
            latitude: 37.5665,
            longitude: 126.978,
          })

          expect(key).toContain(date)
        })
      })

      it('should handle various time formats', () => {
        const times = ['00:00', '12:00', '23:59', '12:30:45']

        times.forEach((time) => {
          const key = generateDestinyMapCacheKey({
            birthDate: '1990-01-01',
            birthTime: time,
            latitude: 37.5665,
            longitude: 126.978,
          })

          expect(key).toContain(time)
        })
      })
    })

    describe('Integration with CacheManager', () => {
      it('should work as cache key', () => {
        const cache = new CacheManager<string>()

        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
        }

        const key = generateDestinyMapCacheKey(input)
        cache.set(key, 'cached result')

        expect(cache.get(key)).toBe('cached result')
      })

      it('should enable cache hits for identical inputs', () => {
        const cache = new CacheManager<{ calculated: boolean }>()

        const input = {
          birthDate: '1990-01-01',
          birthTime: '12:00',
          latitude: 37.5665,
          longitude: 126.978,
          gender: 'female',
          tz: 'Asia/Seoul',
        }

        const key1 = generateDestinyMapCacheKey(input)
        const key2 = generateDestinyMapCacheKey({ ...input })

        cache.set(key1, { calculated: true })

        // Second call with same input should hit cache
        expect(cache.get(key2)).toEqual({ calculated: true })
      })
    })
  })
})
