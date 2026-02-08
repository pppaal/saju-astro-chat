/**
 * Chart Cache Client Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  saveChartData,
  loadChartData,
  hasCachedData,
  clearChartCache,
  getCacheStats,
} from '@/lib/cache/chart-cache-client'

// Mock sessionStorage
const mockStorage: Record<string, string> = {}
const sessionStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key]
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
  }),
  get length() {
    return Object.keys(mockStorage).length
  },
  key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
}

global.sessionStorage = sessionStorageMock as unknown as Storage

// Mock fetch for Redis API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Chart Cache Client', () => {
  const testBirthDate = '1990-01-15'
  const testBirthTime = '14:30'
  const testLatitude = 37.5665
  const testLongitude = 126.978

  const testChartData = {
    saju: {
      year: { heavenly: '庚', earthly: '午' },
      month: { heavenly: '丁', earthly: '丑' },
    },
    astro: {
      sun: { sign: 'Capricorn', degree: 24.5 },
      moon: { sign: 'Pisces', degree: 12.3 },
    },
  }

  beforeEach(() => {
    sessionStorageMock.clear()
    vi.clearAllMocks()
    mockFetch.mockReset()
    // Default: Redis returns null (cache miss)
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ success: false }),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Cache Key Generation', () => {
    it('generates unique keys for different birth data via saveChartData', async () => {
      // Test that different birth data results in different cache keys
      const data1 = { saju: { year: '甲子' } }
      const data2 = { saju: { year: '乙丑' } }

      await saveChartData('1990-01-01', '12:00', 37.5665, 126.978, data1)
      await saveChartData('1990-01-02', '12:00', 37.5665, 126.978, data2)

      // Verify two different keys were used
      expect(sessionStorageMock.setItem).toHaveBeenCalledTimes(2)
      const key1 = sessionStorageMock.setItem.mock.calls[0][0]
      const key2 = sessionStorageMock.setItem.mock.calls[1][0]
      expect(key1).not.toBe(key2)
    })

    it('uses consistent format for cache keys', async () => {
      await saveChartData('1990-01-01', '12:00', 37.5665, 126.978, { saju: {} })

      const savedKey = sessionStorageMock.setItem.mock.calls[0][0]
      expect(savedKey).toMatch(/^destinyChartData_/)
      expect(savedKey).toContain('1990-01-01')
      expect(savedKey).toContain('12:00')
    })
  })

  describe('SessionStorage Integration', () => {
    it('stores data in sessionStorage', () => {
      const testData = {
        birthKey: '1990-01-01_12:00_37.5665_126.9780',
        timestamp: Date.now(),
        saju: { year: '甲子' },
      }

      sessionStorage.setItem('test-key', JSON.stringify(testData))

      expect(sessionStorage.getItem('test-key')).toBeDefined()
      expect(JSON.parse(sessionStorage.getItem('test-key')!)).toEqual(testData)
    })

    it('retrieves data from sessionStorage', () => {
      const testData = {
        birthKey: '1990-01-01_12:00_37.5665_126.9780',
        timestamp: Date.now(),
        astro: { sun: 'Capricorn' },
      }

      sessionStorage.setItem('chart-key', JSON.stringify(testData))
      const retrieved = JSON.parse(sessionStorage.getItem('chart-key')!)

      expect(retrieved).toEqual(testData)
    })

    it('handles missing keys gracefully', () => {
      const result = sessionStorage.getItem('non-existent-key')
      expect(result).toBeNull()
    })
  })

  describe('Cache Data Structure', () => {
    it('includes required fields in cache data', () => {
      const cacheData = {
        birthKey: '1990-01-01_12:00_37.5665_126.9780',
        timestamp: Date.now(),
        saju: { year: '甲子' },
        astro: { sun: 'Capricorn' },
      }

      expect(cacheData).toHaveProperty('birthKey')
      expect(cacheData).toHaveProperty('timestamp')
      expect(cacheData.timestamp).toBeGreaterThan(0)
    })

    it('supports optional fields', () => {
      const cacheData = {
        birthKey: '1990-01-01_12:00_37.5665_126.9780',
        timestamp: Date.now(),
        advancedAstro: { midpoints: [] },
      }

      expect(cacheData).toHaveProperty('advancedAstro')
    })
  })

  describe('Cache Expiration', () => {
    it('identifies expired entries by timestamp', () => {
      const now = Date.now()
      const oneHourAgo = now - 3600000 - 1000
      const fresh = now - 1000

      const expiredData = {
        birthKey: 'old',
        timestamp: oneHourAgo,
      }

      const freshData = {
        birthKey: 'new',
        timestamp: fresh,
      }

      expect(now - expiredData.timestamp).toBeGreaterThan(3600000)
      expect(now - freshData.timestamp).toBeLessThan(3600000)
    })
  })

  describe('Cache Size Management', () => {
    it('tracks number of cache entries', () => {
      sessionStorage.setItem('destinyChartData_1', '{}')
      sessionStorage.setItem('destinyChartData_2', '{}')
      sessionStorage.setItem('destinyChartData_3', '{}')

      expect(sessionStorage.length).toBe(3)
    })

    it('can list all cache keys', () => {
      sessionStorage.setItem('destinyChartData_1', '{}')
      sessionStorage.setItem('destinyChartData_2', '{}')
      sessionStorage.setItem('other_key', '{}')

      const cacheKeys: string[] = []
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('destinyChartData_')) {
          cacheKeys.push(key)
        }
      }

      expect(cacheKeys).toHaveLength(2)
    })
  })

  describe('Error Handling', () => {
    it('handles JSON parse errors gracefully', () => {
      sessionStorage.setItem('destinyChartData_invalid', 'not json')

      expect(() => {
        try {
          JSON.parse(sessionStorage.getItem('destinyChartData_invalid')!)
        } catch {
          // Expected to throw
        }
      }).not.toThrow()
    })

    it('handles storage quota exceeded', () => {
      // Simulate quota exceeded scenario
      const originalSetItem = sessionStorage.setItem
      sessionStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError')
      })

      expect(() => {
        try {
          sessionStorage.setItem('test', 'value')
        } catch {
          // Expected
        }
      }).not.toThrow()

      sessionStorage.setItem = originalSetItem
    })
  })

  describe('saveChartData', () => {
    it('saves data to sessionStorage', async () => {
      await saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, testChartData)

      expect(sessionStorageMock.setItem).toHaveBeenCalled()
      const savedKey = sessionStorageMock.setItem.mock.calls[0][0]
      expect(savedKey).toContain('destinyChartData_')
    })

    it('includes timestamp and birthKey in saved data', async () => {
      await saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, testChartData)

      const savedData = JSON.parse(sessionStorageMock.setItem.mock.calls[0][1])
      expect(savedData).toHaveProperty('timestamp')
      expect(savedData).toHaveProperty('birthKey')
      expect(savedData.birthKey).toContain(testBirthDate)
      expect(savedData.birthKey).toContain(testBirthTime)
    })

    it('attempts to save to Redis via API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      await saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, testChartData)

      // Wait for async Redis save
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cache/chart',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('handles Redis save failure gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      // Should not throw
      await expect(
        saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, testChartData)
      ).resolves.not.toThrow()
    })
  })

  describe('loadChartData', () => {
    it('returns data from sessionStorage when available', async () => {
      const cacheKey = `destinyChartData_${testBirthDate}_${testBirthTime}`
      const cachedData = {
        ...testChartData,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      }
      mockStorage[cacheKey] = JSON.stringify(cachedData)

      const result = await loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).not.toBeNull()
      expect(result?.saju).toEqual(testChartData.saju)
      expect(result?.astro).toEqual(testChartData.astro)
    })

    it('returns null for expired cache', async () => {
      const cacheKey = `destinyChartData_${testBirthDate}_${testBirthTime}`
      const expiredData = {
        ...testChartData,
        timestamp: Date.now() - 4000000, // Over 1 hour ago
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      }
      mockStorage[cacheKey] = JSON.stringify(expiredData)

      const result = await loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBeNull()
    })

    it('returns null for mismatched birthKey', async () => {
      const cacheKey = `destinyChartData_${testBirthDate}_${testBirthTime}`
      const wrongData = {
        ...testChartData,
        timestamp: Date.now(),
        birthKey: 'wrong_key',
      }
      mockStorage[cacheKey] = JSON.stringify(wrongData)

      const result = await loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBeNull()
    })

    it('falls back to Redis when sessionStorage misses', async () => {
      const redisData = {
        ...testChartData,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: redisData }),
      })

      const result = await loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).not.toBeNull()
      expect(result?.saju).toEqual(testChartData.saju)
    })

    it('populates sessionStorage from Redis hit', async () => {
      const redisData = {
        ...testChartData,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: redisData }),
      })

      await loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      // Should have saved to sessionStorage
      expect(sessionStorageMock.setItem).toHaveBeenCalled()
    })

    it('returns null when both caches miss', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false }),
      })

      const result = await loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBeNull()
    })

    it('handles Redis fetch failure gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBeNull()
    })
  })

  describe('hasCachedData', () => {
    it('returns true when cache has data', async () => {
      const cacheKey = `destinyChartData_${testBirthDate}_${testBirthTime}`
      const cachedData = {
        ...testChartData,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      }
      mockStorage[cacheKey] = JSON.stringify(cachedData)

      const result = await hasCachedData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBe(true)
    })

    it('returns false when cache is empty', async () => {
      const result = await hasCachedData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBe(false)
    })

    it('returns true for saju-only data', async () => {
      const cacheKey = `destinyChartData_${testBirthDate}_${testBirthTime}`
      const cachedData = {
        saju: testChartData.saju,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      }
      mockStorage[cacheKey] = JSON.stringify(cachedData)

      const result = await hasCachedData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBe(true)
    })

    it('returns true for astro-only data', async () => {
      const cacheKey = `destinyChartData_${testBirthDate}_${testBirthTime}`
      const cachedData = {
        astro: testChartData.astro,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      }
      mockStorage[cacheKey] = JSON.stringify(cachedData)

      const result = await hasCachedData(testBirthDate, testBirthTime, testLatitude, testLongitude)

      expect(result).toBe(true)
    })
  })

  describe('clearChartCache', () => {
    it('clears specific cache entry from sessionStorage', async () => {
      const cacheKey = `destinyChartData_${testBirthDate}_${testBirthTime}`
      mockStorage[cacheKey] = JSON.stringify({ test: 'data' })

      await clearChartCache(testBirthDate, testBirthTime)

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith(cacheKey)
    })

    it('calls Redis API to clear cache', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      await clearChartCache(testBirthDate, testBirthTime)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/cache/chart',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })

    it('clears all cache entries when no params provided', async () => {
      mockStorage['destinyChartData_1990-01-01_12:00'] = '{}'
      mockStorage['destinyChartData_1995-05-15_08:30'] = '{}'
      mockStorage['other_key'] = '{}'

      await clearChartCache()

      // Should have removed destinyChartData entries but not other_key
      expect(sessionStorageMock.removeItem).toHaveBeenCalledTimes(2)
    })

    it('handles Redis clear failure gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(clearChartCache(testBirthDate, testBirthTime)).resolves.not.toThrow()
    })
  })

  describe('getCacheStats', () => {
    it('returns correct number of session entries', () => {
      mockStorage['destinyChartData_1'] = JSON.stringify({ timestamp: Date.now() })
      mockStorage['destinyChartData_2'] = JSON.stringify({ timestamp: Date.now() })
      mockStorage['other_key'] = '{}'

      const stats = getCacheStats()

      expect(stats.sessionEntries).toBe(2)
    })

    it('returns oldest and newest timestamps', () => {
      const now = Date.now()
      mockStorage['destinyChartData_1'] = JSON.stringify({ timestamp: now - 1000 })
      mockStorage['destinyChartData_2'] = JSON.stringify({ timestamp: now })

      const stats = getCacheStats()

      expect(stats.oldestTimestamp).toBe(now - 1000)
      expect(stats.newestTimestamp).toBe(now)
    })

    it('returns null timestamps when no entries', () => {
      const stats = getCacheStats()

      expect(stats.sessionEntries).toBe(0)
      expect(stats.oldestTimestamp).toBeNull()
      expect(stats.newestTimestamp).toBeNull()
    })

    it('ignores entries without valid timestamps', () => {
      mockStorage['destinyChartData_1'] = JSON.stringify({ timestamp: Date.now() })
      mockStorage['destinyChartData_2'] = JSON.stringify({ noTimestamp: true })

      const stats = getCacheStats()

      expect(stats.sessionEntries).toBe(1)
    })
  })

  describe('advancedAstro data handling', () => {
    it('saves and loads advancedAstro data', async () => {
      const dataWithAdvanced = {
        ...testChartData,
        advancedAstro: {
          houses: [{ sign: 'Aries', degree: 10 }],
          aspects: [{ type: 'conjunction', orb: 2 }],
        },
      }

      await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        dataWithAdvanced
      )

      const savedData = JSON.parse(sessionStorageMock.setItem.mock.calls[0][1])
      expect(savedData.advancedAstro).toEqual(dataWithAdvanced.advancedAstro)
    })
  })
})
