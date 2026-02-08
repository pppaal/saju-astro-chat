/**
 * Mock-based tests for Chart Data Cache
 * Tests chart cache logic without actual Redis connection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock redis-cache module
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheDel: vi.fn(),
  CacheKeys: {
    destinyMap: (date: string, time: string) => `destiny_map:${date}:${time}`,
  },
  CACHE_TTL: {
    DESTINY_MAP: 86400,
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { cacheGet, cacheSet, cacheDel } from '@/lib/cache/redis-cache'
import {
  saveChartData,
  loadChartData,
  hasCachedData,
  clearChartCache,
} from '@/lib/cache/chart-cache-server'

describe('Chart Data Cache (Mocked)', () => {
  const mockCacheGet = cacheGet as ReturnType<typeof vi.fn>
  const mockCacheSet = cacheSet as ReturnType<typeof vi.fn>
  const mockCacheDel = cacheDel as ReturnType<typeof vi.fn>

  const testBirthDate = '1990-01-15'
  const testBirthTime = '14:30'
  const testLatitude = 37.5665
  const testLongitude = 126.978

  const testChartData = {
    saju: {
      year: { heavenly: '庚', earthly: '午' },
      month: { heavenly: '丁', earthly: '丑' },
      day: { heavenly: '癸', earthly: '巳' },
      hour: { heavenly: '己', earthly: '未' },
    },
    astro: {
      sun: { sign: 'Capricorn', degree: 24.5 },
      moon: { sign: 'Pisces', degree: 12.3 },
      ascendant: { sign: 'Gemini', degree: 5.8 },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('saveChartData', () => {
    it('should save chart data successfully', async () => {
      mockCacheSet.mockResolvedValue(true)

      const result = await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        testChartData
      )

      expect(result).toBe(true)
      expect(mockCacheSet).toHaveBeenCalledTimes(1)
      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.stringContaining('destiny_map'),
        expect.objectContaining({
          saju: testChartData.saju,
          astro: testChartData.astro,
          birthKey: expect.stringContaining(testBirthDate),
          timestamp: expect.any(Number),
        }),
        expect.any(Number)
      )
    })

    it('should return false when cache set fails', async () => {
      mockCacheSet.mockResolvedValue(false)

      const result = await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        testChartData
      )

      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      mockCacheSet.mockRejectedValue(new Error('Redis error'))

      const result = await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        testChartData
      )

      expect(result).toBe(false)
    })

    it('should save partial data (saju only)', async () => {
      mockCacheSet.mockResolvedValue(true)

      const result = await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        { saju: testChartData.saju }
      )

      expect(result).toBe(true)
      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          saju: testChartData.saju,
        }),
        expect.any(Number)
      )
    })

    it('should save partial data (astro only)', async () => {
      mockCacheSet.mockResolvedValue(true)

      const result = await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        { astro: testChartData.astro }
      )

      expect(result).toBe(true)
    })

    it('should include advancedAstro when provided', async () => {
      mockCacheSet.mockResolvedValue(true)

      const advancedAstroData = {
        progressions: { sun: { sign: 'Aquarius' } },
        transits: { jupiter: { sign: 'Taurus' } },
      }

      const result = await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        { ...testChartData, advancedAstro: advancedAstroData }
      )

      expect(result).toBe(true)
      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          advancedAstro: advancedAstroData,
        }),
        expect.any(Number)
      )
    })
  })

  describe('loadChartData', () => {
    it('should load chart data successfully', async () => {
      const cachedData = {
        ...testChartData,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      }

      mockCacheGet.mockResolvedValue(cachedData)

      const result = await loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).not.toBeNull()
      expect(result?.saju).toEqual(testChartData.saju)
      expect(result?.astro).toEqual(testChartData.astro)
    })

    it('should return null for non-existent cache', async () => {
      mockCacheGet.mockResolvedValue(null)

      const result = await loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBeNull()
    })

    it('should validate birth key matches', async () => {
      const cachedData = {
        ...testChartData,
        timestamp: Date.now(),
        birthKey: 'different_birth_key',
      }

      mockCacheGet.mockResolvedValue(cachedData)

      const result = await loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      // Should return null due to birthKey mismatch
      expect(result).toBeNull()
    })

    it('should handle errors gracefully', async () => {
      mockCacheGet.mockRejectedValue(new Error('Redis error'))

      const result = await loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBeNull()
    })
  })

  describe('hasCachedData', () => {
    it('should return true when data exists', async () => {
      const cachedData = {
        ...testChartData,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      }

      mockCacheGet.mockResolvedValue(cachedData)

      const result = await hasCachedData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBe(true)
    })

    it('should return false when data does not exist', async () => {
      mockCacheGet.mockResolvedValue(null)

      const result = await hasCachedData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockCacheGet.mockRejectedValue(new Error('Redis error'))

      const result = await hasCachedData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBe(false)
    })
  })

  describe('clearChartCache', () => {
    it('should clear cache successfully', async () => {
      mockCacheDel.mockResolvedValue(true)

      const result = await clearChartCache(testBirthDate, testBirthTime)

      expect(result).toBe(true)
      expect(mockCacheDel).toHaveBeenCalledTimes(1)
    })

    it('should return false when delete fails', async () => {
      mockCacheDel.mockResolvedValue(false)

      const result = await clearChartCache(testBirthDate, testBirthTime)

      expect(result).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      mockCacheDel.mockRejectedValue(new Error('Redis error'))

      const result = await clearChartCache(testBirthDate, testBirthTime)

      expect(result).toBe(false)
    })
  })

  describe('Birth key generation', () => {
    it('should generate consistent birth keys', async () => {
      mockCacheSet.mockResolvedValue(true)

      await saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, testChartData)

      const expectedBirthKey = `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`

      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          birthKey: expectedBirthKey,
        }),
        expect.any(Number)
      )
    })

    it('should handle different coordinates', async () => {
      mockCacheSet.mockResolvedValue(true)

      const lat1 = 35.6762
      const lon1 = 139.6503
      const lat2 = 40.7128
      const lon2 = -74.006

      await saveChartData(testBirthDate, testBirthTime, lat1, lon1, testChartData)
      await saveChartData(testBirthDate, testBirthTime, lat2, lon2, testChartData)

      const call1 = mockCacheSet.mock.calls[0][1]
      const call2 = mockCacheSet.mock.calls[1][1]

      expect(call1.birthKey).not.toBe(call2.birthKey)
    })
  })

  describe('Timestamp handling', () => {
    it('should include timestamp in saved data', async () => {
      mockCacheSet.mockResolvedValue(true)

      const beforeSave = Date.now()
      await saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, testChartData)
      const afterSave = Date.now()

      const savedData = mockCacheSet.mock.calls[0][1]

      expect(savedData.timestamp).toBeGreaterThanOrEqual(beforeSave)
      expect(savedData.timestamp).toBeLessThanOrEqual(afterSave)
    })
  })
})
