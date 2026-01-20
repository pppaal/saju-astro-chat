/**
 * Calendar Cache Utils Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getCacheKey,
  getCachedData,
  setCachedData,
  clearOldCache,
} from '@/components/calendar/cache-utils';
import type { BirthInfo, CalendarData } from '@/components/calendar/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock Object.keys to work with localStorage
Object.keys = vi.fn((obj) => {
  if (obj === localStorage) {
    const store = (localStorage as any).store || {};
    return Object.keys(store);
  }
  return Object.getOwnPropertyNames(obj);
});

describe('calendar/cache-utils', () => {
  const mockBirthInfo: BirthInfo = {
    birthDate: '1990-01-01',
    birthTime: '12:00',
    birthPlace: 'Seoul',
    gender: 'M',
  };

  const mockCalendarData: CalendarData = {
    dates: [],
    profile: null,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getCacheKey', () => {
    it('should generate consistent cache key', () => {
      const key1 = getCacheKey(mockBirthInfo, 2024, 'all');
      const key2 = getCacheKey(mockBirthInfo, 2024, 'all');

      expect(key1).toBe(key2);
      expect(key1).toContain('calendar_');
      expect(key1).toContain('1990-01-01');
      expect(key1).toContain('12:00');
      expect(key1).toContain('Seoul');
      expect(key1).toContain('2024');
      expect(key1).toContain('all');
    });

    it('should generate different keys for different birth info', () => {
      const key1 = getCacheKey(mockBirthInfo, 2024, 'all');
      const key2 = getCacheKey(
        { ...mockBirthInfo, birthDate: '1991-01-01' },
        2024,
        'all'
      );

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different years', () => {
      const key1 = getCacheKey(mockBirthInfo, 2024, 'all');
      const key2 = getCacheKey(mockBirthInfo, 2025, 'all');

      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different categories', () => {
      const key1 = getCacheKey(mockBirthInfo, 2024, 'all');
      const key2 = getCacheKey(mockBirthInfo, 2024, 'fortune');

      expect(key1).not.toBe(key2);
    });

    it('should handle special characters in birth place', () => {
      const key = getCacheKey(
        { ...mockBirthInfo, birthPlace: 'Seoul, South Korea' },
        2024,
        'all'
      );

      expect(key).toBeTruthy();
      expect(key).toContain('Seoul, South Korea');
    });
  });

  describe('getCachedData', () => {
    it('should return null when no cache exists', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');
      const result = getCachedData(cacheKey);

      expect(result).toBeNull();
    });

    it('should return cached data when valid', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');
      const cachedData = {
        version: 'v2',
        timestamp: Date.now(),
        birthInfo: mockBirthInfo,
        year: 2024,
        category: 'all',
        data: mockCalendarData,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cachedData));

      const result = getCachedData(cacheKey);

      expect(result).toEqual(mockCalendarData);
    });

    it('should return null for expired cache', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');
      const expiredTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000; // 31 days ago
      const cachedData = {
        version: 'v2',
        timestamp: expiredTimestamp,
        birthInfo: mockBirthInfo,
        year: 2024,
        category: 'all',
        data: mockCalendarData,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cachedData));

      const result = getCachedData(cacheKey);

      expect(result).toBeNull();
    });

    it('should return null for wrong version', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');
      const cachedData = {
        version: 'v1', // old version
        timestamp: Date.now(),
        birthInfo: mockBirthInfo,
        year: 2024,
        category: 'all',
        data: mockCalendarData,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cachedData));

      const result = getCachedData(cacheKey);

      expect(result).toBeNull();
    });

    it('should handle invalid JSON gracefully', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');
      localStorage.setItem(cacheKey, 'invalid json');

      const result = getCachedData(cacheKey);

      expect(result).toBeNull();
    });

    it('should remove expired cache', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');
      const expiredTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000;
      const cachedData = {
        version: 'v2',
        timestamp: expiredTimestamp,
        birthInfo: mockBirthInfo,
        year: 2024,
        category: 'all',
        data: mockCalendarData,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      getCachedData(cacheKey);

      expect(localStorage.getItem(cacheKey)).toBeNull();
    });

    it('should remove cache with wrong version', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');
      const cachedData = {
        version: 'v1',
        timestamp: Date.now(),
        birthInfo: mockBirthInfo,
        year: 2024,
        category: 'all',
        data: mockCalendarData,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
      getCachedData(cacheKey);

      expect(localStorage.getItem(cacheKey)).toBeNull();
    });
  });

  describe('setCachedData', () => {
    it('should store data in cache', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');
      setCachedData(cacheKey, mockBirthInfo, 2024, 'all', mockCalendarData);

      const stored = localStorage.getItem(cacheKey);
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.version).toBe('v2');
      expect(parsed.data).toEqual(mockCalendarData);
      expect(parsed.birthInfo).toEqual(mockBirthInfo);
      expect(parsed.year).toBe(2024);
      expect(parsed.category).toBe('all');
    });

    it('should include timestamp in cached data', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');
      const beforeTime = Date.now();

      setCachedData(cacheKey, mockBirthInfo, 2024, 'all', mockCalendarData);

      const afterTime = Date.now();
      const stored = localStorage.getItem(cacheKey);
      const parsed = JSON.parse(stored!);

      expect(parsed.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(parsed.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should handle localStorage quota errors', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');

      // Mock setItem to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      let callCount = 0;
      localStorage.setItem = vi.fn((key, value) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('QuotaExceededError');
        }
        originalSetItem.call(localStorage, key, value);
      });

      // Should not throw
      expect(() => {
        setCachedData(cacheKey, mockBirthInfo, 2024, 'all', mockCalendarData);
      }).not.toThrow();

      localStorage.setItem = originalSetItem;
    });

    it('should overwrite existing cache', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');
      const data1 = { ...mockCalendarData, dates: [{ day: 1 }] as any };
      const data2 = { ...mockCalendarData, dates: [{ day: 2 }] as any };

      setCachedData(cacheKey, mockBirthInfo, 2024, 'all', data1);
      setCachedData(cacheKey, mockBirthInfo, 2024, 'all', data2);

      const result = getCachedData(cacheKey);
      expect(result).toEqual(data2);
    });
  });

  describe('clearOldCache', () => {
    it('should remove expired caches', () => {
      const expiredTimestamp = Date.now() - 31 * 24 * 60 * 60 * 1000;
      const validTimestamp = Date.now();

      const expiredKey = 'calendar_expired_key';
      const validKey = 'calendar_valid_key';

      localStorage.setItem(
        expiredKey,
        JSON.stringify({
          version: 'v2',
          timestamp: expiredTimestamp,
          data: mockCalendarData,
        })
      );

      localStorage.setItem(
        validKey,
        JSON.stringify({
          version: 'v2',
          timestamp: validTimestamp,
          data: mockCalendarData,
        })
      );

      // Mock Object.keys to return our test keys
      const originalKeys = Object.keys;
      Object.keys = vi.fn((obj) => {
        if (obj === localStorage) {
          return [expiredKey, validKey];
        }
        return originalKeys(obj);
      });

      clearOldCache();

      expect(localStorage.getItem(expiredKey)).toBeNull();
      expect(localStorage.getItem(validKey)).toBeTruthy();

      Object.keys = originalKeys;
    });

    it('should remove invalid cached data', () => {
      const invalidKey = 'calendar_invalid';
      localStorage.setItem(invalidKey, 'invalid json');

      const originalKeys = Object.keys;
      Object.keys = vi.fn((obj) => {
        if (obj === localStorage) {
          return [invalidKey];
        }
        return originalKeys(obj);
      });

      clearOldCache();

      expect(localStorage.getItem(invalidKey)).toBeNull();

      Object.keys = originalKeys;
    });

    it('should only affect calendar_ keys', () => {
      const calendarKey = 'calendar_test';
      const otherKey = 'other_data';

      localStorage.setItem(calendarKey, 'test');
      localStorage.setItem(otherKey, 'test');

      const originalKeys = Object.keys;
      Object.keys = vi.fn((obj) => {
        if (obj === localStorage) {
          return [calendarKey, otherKey];
        }
        return originalKeys(obj);
      });

      clearOldCache();

      expect(localStorage.getItem(otherKey)).toBe('test');

      Object.keys = originalKeys;
    });

    it('should handle errors gracefully', () => {
      const originalKeys = Object.keys;
      Object.keys = vi.fn(() => {
        throw new Error('Test error');
      });

      // Should not throw
      expect(() => clearOldCache()).not.toThrow();

      Object.keys = originalKeys;
    });
  });

  describe('integration tests', () => {
    it('should handle full cache lifecycle', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');

      // Initially no cache
      expect(getCachedData(cacheKey)).toBeNull();

      // Set cache
      setCachedData(cacheKey, mockBirthInfo, 2024, 'all', mockCalendarData);

      // Should retrieve cache
      const retrieved = getCachedData(cacheKey);
      expect(retrieved).toEqual(mockCalendarData);

      // Clear old caches (should not affect recent cache)
      clearOldCache();
      expect(getCachedData(cacheKey)).toEqual(mockCalendarData);
    });

    it('should handle multiple cache entries', () => {
      const keys = [
        getCacheKey(mockBirthInfo, 2024, 'all'),
        getCacheKey(mockBirthInfo, 2024, 'fortune'),
        getCacheKey(mockBirthInfo, 2025, 'all'),
      ];

      keys.forEach((key, index) => {
        const data = { ...mockCalendarData, dates: [{ day: index }] as any };
        setCachedData(key, mockBirthInfo, 2024 + (index === 2 ? 1 : 0), index === 1 ? 'fortune' : 'all', data);
      });

      keys.forEach((key, index) => {
        const result = getCachedData(key);
        expect(result?.dates[0]).toEqual({ day: index });
      });
    });

    it('should properly handle cache expiry in real scenario', () => {
      const cacheKey = getCacheKey(mockBirthInfo, 2024, 'all');

      // Simulate cache from 31 days ago
      const expiredData = {
        version: 'v2',
        timestamp: Date.now() - 31 * 24 * 60 * 60 * 1000,
        birthInfo: mockBirthInfo,
        year: 2024,
        category: 'all',
        data: mockCalendarData,
      };

      localStorage.setItem(cacheKey, JSON.stringify(expiredData));

      // Should return null for expired cache
      const result = getCachedData(cacheKey);
      expect(result).toBeNull();

      // Cache should be removed
      expect(localStorage.getItem(cacheKey)).toBeNull();

      // Set new cache
      setCachedData(cacheKey, mockBirthInfo, 2024, 'all', mockCalendarData);

      // Should retrieve new cache
      const newResult = getCachedData(cacheKey);
      expect(newResult).toEqual(mockCalendarData);
    });
  });
});
