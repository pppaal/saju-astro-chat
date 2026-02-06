/**
 * Comprehensive Tests for Chart Data Cache
 * src/lib/chartDataCache.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  saveChartData,
  loadChartData,
  loadCurrentChartData,
  clearChartCache,
  hasCachedData,
  cleanupExpiredCache,
} from '@/lib/cache/chartDataCache';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {};
const sessionStorageMock = {
  getItem: vi.fn((key: string) => mockSessionStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockSessionStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockSessionStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
  }),
};

Object.defineProperty(global, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

describe('chartDataCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveChartData', () => {
    it('should save chart data to session storage', () => {
      const sajuData = { dayMaster: '甲', elements: { wood: 2 } };
      const astroData = { sun: 'Aries', moon: 'Cancer' };

      saveChartData('1990-01-15', '10:30', 37.5665, 126.978, {
        saju: sajuData,
        astro: astroData,
      });

      expect(sessionStorageMock.setItem).toHaveBeenCalled();

      // Find the chart data call
      const chartDataCall = sessionStorageMock.setItem.mock.calls.find(
        (call) => call[0].startsWith('destinyChartData_')
      );
      expect(chartDataCall).toBeDefined();

      const savedData = JSON.parse(chartDataCall![1]);
      expect(savedData.saju).toEqual(sajuData);
      expect(savedData.astro).toEqual(astroData);
      expect(savedData.timestamp).toBeDefined();
      expect(savedData.birthKey).toBeDefined();
    });

    it('should include timestamp in saved data', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      saveChartData('1990-01-15', '10:30', 37.5665, 126.978, {
        saju: { test: true },
      });

      const chartDataCall = sessionStorageMock.setItem.mock.calls.find(
        (call) => call[0].startsWith('destinyChartData_')
      );
      const savedData = JSON.parse(chartDataCall![1]);

      expect(savedData.timestamp).toBe(now);

      vi.useRealTimers();
    });

    it('should generate unique birth key', () => {
      saveChartData('1990-01-15', '10:30', 37.5665, 126.978, { saju: {} });

      const chartDataCall = sessionStorageMock.setItem.mock.calls.find(
        (call) => call[0].startsWith('destinyChartData_')
      );
      const savedData = JSON.parse(chartDataCall![1]);

      expect(savedData.birthKey).toBe('1990-01-15_10:30_37.5665_126.9780');
    });

    it('should save advancedAstro data', () => {
      const advancedAstroData = { houses: [], aspects: [] };

      saveChartData('1990-01-15', '10:30', 37.5665, 126.978, {
        advancedAstro: advancedAstroData,
      });

      const chartDataCall = sessionStorageMock.setItem.mock.calls.find(
        (call) => call[0].startsWith('destinyChartData_')
      );
      const savedData = JSON.parse(chartDataCall![1]);

      expect(savedData.advancedAstro).toEqual(advancedAstroData);
    });
  });

  describe('loadChartData', () => {
    it('should return null when no cache exists', () => {
      const result = loadChartData('1990-01-15', '10:30', 37.5665, 126.978);

      expect(result).toBeNull();
    });

    it('should load cached data when valid', () => {
      const sajuData = { dayMaster: '甲' };
      const birthKey = '1990-01-15_10:30_37.5665_126.9780';

      mockSessionStorage['destinyChartData_1990-01-15_10:30'] = JSON.stringify({
        saju: sajuData,
        timestamp: Date.now(),
        birthKey,
      });

      const result = loadChartData('1990-01-15', '10:30', 37.5665, 126.978);

      expect(result).not.toBeNull();
      expect(result?.saju).toEqual(sajuData);
    });

    it('should return null for expired cache', () => {
      const expiredTimestamp = Date.now() - 4000000; // More than 1 hour ago
      const birthKey = '1990-01-15_10:30_37.5665_126.9780';

      mockSessionStorage['destinyChartData_1990-01-15_10:30'] = JSON.stringify({
        saju: { test: true },
        timestamp: expiredTimestamp,
        birthKey,
      });

      const result = loadChartData('1990-01-15', '10:30', 37.5665, 126.978);

      expect(result).toBeNull();
    });

    it('should return null when birth key does not match', () => {
      mockSessionStorage['destinyChartData_1990-01-15_10:30'] = JSON.stringify({
        saju: { test: true },
        timestamp: Date.now(),
        birthKey: '1990-01-15_10:30_40.0000_127.0000', // Different location
      });

      const result = loadChartData('1990-01-15', '10:30', 37.5665, 126.978);

      expect(result).toBeNull();
    });

    it('should return null when no saju or astro data', () => {
      const birthKey = '1990-01-15_10:30_37.5665_126.9780';

      mockSessionStorage['destinyChartData_1990-01-15_10:30'] = JSON.stringify({
        timestamp: Date.now(),
        birthKey,
      });

      const result = loadChartData('1990-01-15', '10:30', 37.5665, 126.978);

      expect(result).toBeNull();
    });

    it('should fallback to legacy cache key', () => {
      const birthKey = '1990-01-15_10:30_37.5665_126.9780';

      mockSessionStorage['destinyChartData'] = JSON.stringify({
        saju: { legacy: true },
        timestamp: Date.now(),
        birthKey,
      });

      const result = loadChartData('1990-01-15', '10:30', 37.5665, 126.978);

      expect(result?.saju).toEqual({ legacy: true });
    });
  });

  describe('loadCurrentChartData', () => {
    it('should return null when no cache exists', () => {
      const result = loadCurrentChartData();

      expect(result).toBeNull();
    });

    it('should load from current key index', () => {
      mockSessionStorage['destinyChartDataKey'] = 'destinyChartData_1990-01-15_10:30';
      mockSessionStorage['destinyChartData_1990-01-15_10:30'] = JSON.stringify({
        saju: { indexed: true },
        timestamp: Date.now(),
        birthKey: 'test',
      });

      const result = loadCurrentChartData();

      expect(result?.saju).toEqual({ indexed: true });
    });

    it('should return null for expired current cache', () => {
      mockSessionStorage['destinyChartDataKey'] = 'destinyChartData_1990-01-15_10:30';
      mockSessionStorage['destinyChartData_1990-01-15_10:30'] = JSON.stringify({
        saju: { expired: true },
        timestamp: Date.now() - 4000000,
        birthKey: 'test',
      });

      const result = loadCurrentChartData();

      expect(result).toBeNull();
    });

    it('should fallback to legacy key', () => {
      mockSessionStorage['destinyChartData'] = JSON.stringify({
        saju: { legacyCurrent: true },
        timestamp: Date.now(),
        birthKey: 'test',
      });

      const result = loadCurrentChartData();

      expect(result?.saju).toEqual({ legacyCurrent: true });
    });
  });

  describe('clearChartCache', () => {
    it('should clear all cached data', () => {
      mockSessionStorage['destinyChartDataKeys'] = JSON.stringify([
        'destinyChartData_1990-01-15_10:30',
        'destinyChartData_1995-05-20_14:00',
      ]);
      mockSessionStorage['destinyChartData_1990-01-15_10:30'] = '{}';
      mockSessionStorage['destinyChartData_1995-05-20_14:00'] = '{}';
      mockSessionStorage['destinyChartDataKey'] = 'test';
      mockSessionStorage['destinyChartData'] = '{}';

      clearChartCache();

      expect(sessionStorageMock.removeItem).toHaveBeenCalled();
    });
  });

  describe('hasCachedData', () => {
    it('should return true when valid cache exists', () => {
      const birthKey = '1990-01-15_10:30_37.5665_126.9780';

      mockSessionStorage['destinyChartData_1990-01-15_10:30'] = JSON.stringify({
        saju: { test: true },
        timestamp: Date.now(),
        birthKey,
      });

      const result = hasCachedData('1990-01-15', '10:30', 37.5665, 126.978);

      expect(result).toBe(true);
    });

    it('should return false when no cache exists', () => {
      const result = hasCachedData('1990-01-15', '10:30', 37.5665, 126.978);

      expect(result).toBe(false);
    });

    it('should return false when cache has no saju or astro', () => {
      const birthKey = '1990-01-15_10:30_37.5665_126.9780';

      mockSessionStorage['destinyChartData_1990-01-15_10:30'] = JSON.stringify({
        timestamp: Date.now(),
        birthKey,
      });

      const result = hasCachedData('1990-01-15', '10:30', 37.5665, 126.978);

      expect(result).toBe(false);
    });

    it('should return true when only astro data exists', () => {
      const birthKey = '1990-01-15_10:30_37.5665_126.9780';

      mockSessionStorage['destinyChartData_1990-01-15_10:30'] = JSON.stringify({
        astro: { sun: 'Aries' },
        timestamp: Date.now(),
        birthKey,
      });

      const result = hasCachedData('1990-01-15', '10:30', 37.5665, 126.978);

      expect(result).toBe(true);
    });
  });

  describe('cleanupExpiredCache', () => {
    it('should remove expired entries', () => {
      const expiredTimestamp = Date.now() - 4000000;
      const validTimestamp = Date.now();

      mockSessionStorage['destinyChartDataKeys'] = JSON.stringify([
        'destinyChartData_old',
        'destinyChartData_new',
      ]);
      mockSessionStorage['destinyChartData_old'] = JSON.stringify({
        saju: {},
        timestamp: expiredTimestamp,
      });
      mockSessionStorage['destinyChartData_new'] = JSON.stringify({
        saju: {},
        timestamp: validTimestamp,
      });

      const removed = cleanupExpiredCache();

      expect(removed).toBe(1);
    });

    it('should return 0 when no cache keys exist', () => {
      const removed = cleanupExpiredCache();

      expect(removed).toBe(0);
    });

    it('should remove malformed entries', () => {
      mockSessionStorage['destinyChartDataKeys'] = JSON.stringify([
        'destinyChartData_malformed',
      ]);
      mockSessionStorage['destinyChartData_malformed'] = 'invalid json{';

      const removed = cleanupExpiredCache();

      expect(removed).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle sessionStorage errors gracefully in saveChartData', () => {
      sessionStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });

      // Should not throw
      expect(() => {
        saveChartData('1990-01-15', '10:30', 37.5665, 126.978, { saju: {} });
      }).not.toThrow();
    });

    it('should handle JSON parse errors in loadChartData', () => {
      mockSessionStorage['destinyChartData_1990-01-15_10:30'] = 'invalid json';

      const result = loadChartData('1990-01-15', '10:30', 37.5665, 126.978);

      expect(result).toBeNull();
    });
  });

  describe('LRU cache management', () => {
    it('should limit cache entries to MAX_CACHE_ENTRIES', () => {
      // Save more than 10 entries
      for (let i = 0; i < 15; i++) {
        saveChartData(`1990-01-${String(i + 1).padStart(2, '0')}`, '10:30', 37.5665, 126.978, {
          saju: { index: i },
        });
      }

      // Check that keys list is maintained
      const keysJson = mockSessionStorage['destinyChartDataKeys'];
      if (keysJson) {
        const keys = JSON.parse(keysJson);
        expect(keys.length).toBeLessThanOrEqual(10);
      }
    });
  });
});
