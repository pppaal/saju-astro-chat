/**
 * Chart Cache Server Tests (Mocked)
 *
 * These tests mock the Redis client to test the cache logic
 * without requiring a real Redis connection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock redis-cache module
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
const mockCacheDel = vi.fn();

vi.mock("@/lib/cache/redis-cache", () => ({
  cacheGet: (...args: unknown[]) => mockCacheGet(...args),
  cacheSet: (...args: unknown[]) => mockCacheSet(...args),
  cacheDel: (...args: unknown[]) => mockCacheDel(...args),
  CacheKeys: {
    destinyMap: (birthDate: string, birthTime: string) =>
      `destiny:${birthDate}:${birthTime}`,
  },
  CACHE_TTL: {
    DESTINY_MAP: 60 * 60 * 24 * 3,
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import after mocks are set up
import {
  saveChartData,
  loadChartData,
  hasCachedData,
  clearChartCache,
  cacheOrCalculateChart,
} from "@/lib/cache/chart-cache-server";

describe("Chart Cache Server (Mocked)", () => {
  const testBirthDate = "1990-01-15";
  const testBirthTime = "14:30";
  const testLatitude = 37.5665;
  const testLongitude = 126.978;

  const testChartData = {
    saju: {
      year: { heavenly: "庚", earthly: "午" },
      month: { heavenly: "丁", earthly: "丑" },
    },
    astro: {
      sun: { sign: "Capricorn", degree: 24.5 },
      moon: { sign: "Pisces", degree: 12.3 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockResolvedValue(null);
    mockCacheSet.mockResolvedValue(true);
    mockCacheDel.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("saveChartData", () => {
    it("saves chart data to cache", async () => {
      const result = await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        testChartData
      );

      expect(result).toBe(true);
      expect(mockCacheSet).toHaveBeenCalledTimes(1);
    });

    it("generates correct cache key", async () => {
      await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        testChartData
      );

      expect(mockCacheSet).toHaveBeenCalledWith(
        `destiny:${testBirthDate}:${testBirthTime}`,
        expect.any(Object),
        expect.any(Number)
      );
    });

    it("includes birthKey in saved data", async () => {
      await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        testChartData
      );

      const savedData = mockCacheSet.mock.calls[0][1];
      expect(savedData).toHaveProperty("birthKey");
      expect(savedData.birthKey).toContain(testBirthDate);
      expect(savedData.birthKey).toContain(testBirthTime);
      expect(savedData.birthKey).toContain(testLatitude.toFixed(4));
    });

    it("includes timestamp in saved data", async () => {
      const beforeSave = Date.now();
      await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        testChartData
      );
      const afterSave = Date.now();

      const savedData = mockCacheSet.mock.calls[0][1];
      expect(savedData.timestamp).toBeGreaterThanOrEqual(beforeSave);
      expect(savedData.timestamp).toBeLessThanOrEqual(afterSave);
    });

    it("returns false when cache set fails", async () => {
      mockCacheSet.mockResolvedValue(false);

      const result = await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        testChartData
      );

      expect(result).toBe(false);
    });

    it("handles cache errors gracefully", async () => {
      mockCacheSet.mockRejectedValue(new Error("Redis error"));

      const result = await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        testChartData
      );

      expect(result).toBe(false);
    });

    it("saves partial data (saju only)", async () => {
      const sajuOnlyData = { saju: testChartData.saju };

      await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        sajuOnlyData
      );

      const savedData = mockCacheSet.mock.calls[0][1];
      expect(savedData.saju).toEqual(testChartData.saju);
      expect(savedData.astro).toBeUndefined();
    });

    it("saves partial data (astro only)", async () => {
      const astroOnlyData = { astro: testChartData.astro };

      await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        astroOnlyData
      );

      const savedData = mockCacheSet.mock.calls[0][1];
      expect(savedData.astro).toEqual(testChartData.astro);
      expect(savedData.saju).toBeUndefined();
    });

    it("saves advancedAstro data", async () => {
      const advancedData = {
        ...testChartData,
        advancedAstro: { houses: [], aspects: [] },
      };

      await saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        advancedData
      );

      const savedData = mockCacheSet.mock.calls[0][1];
      expect(savedData.advancedAstro).toEqual(advancedData.advancedAstro);
    });
  });

  describe("loadChartData", () => {
    it("returns cached data when available", async () => {
      const cachedData = {
        ...testChartData,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      };
      mockCacheGet.mockResolvedValue(cachedData);

      const result = await loadChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude
      );

      expect(result).not.toBeNull();
      expect(result?.saju).toEqual(testChartData.saju);
      expect(result?.astro).toEqual(testChartData.astro);
    });

    it("returns null when cache is empty", async () => {
      mockCacheGet.mockResolvedValue(null);

      const result = await loadChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude
      );

      expect(result).toBeNull();
    });

    it("returns null when birthKey does not match", async () => {
      const cachedData = {
        ...testChartData,
        timestamp: Date.now(),
        birthKey: "wrong_birthkey",
      };
      mockCacheGet.mockResolvedValue(cachedData);

      const result = await loadChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude
      );

      expect(result).toBeNull();
    });

    it("returns null when data has neither saju nor astro", async () => {
      const cachedData = {
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      };
      mockCacheGet.mockResolvedValue(cachedData);

      const result = await loadChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude
      );

      expect(result).toBeNull();
    });

    it("handles cache errors gracefully", async () => {
      mockCacheGet.mockRejectedValue(new Error("Redis error"));

      const result = await loadChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude
      );

      expect(result).toBeNull();
    });

    it("returns advancedAstro when available", async () => {
      const cachedData = {
        ...testChartData,
        advancedAstro: { houses: [{ sign: "Aries" }] },
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      };
      mockCacheGet.mockResolvedValue(cachedData);

      const result = await loadChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude
      );

      expect(result?.advancedAstro).toEqual(cachedData.advancedAstro);
    });

    it("validates location precision in birthKey", async () => {
      // Different location should not match
      const cachedData = {
        ...testChartData,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_40.7128_-74.0060`, // NYC coordinates
      };
      mockCacheGet.mockResolvedValue(cachedData);

      const result = await loadChartData(
        testBirthDate,
        testBirthTime,
        testLatitude, // Seoul coordinates
        testLongitude
      );

      expect(result).toBeNull();
    });
  });

  describe("hasCachedData", () => {
    it("returns true when saju data exists", async () => {
      const cachedData = {
        saju: testChartData.saju,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      };
      mockCacheGet.mockResolvedValue(cachedData);

      const result = await hasCachedData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude
      );

      expect(result).toBe(true);
    });

    it("returns true when astro data exists", async () => {
      const cachedData = {
        astro: testChartData.astro,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      };
      mockCacheGet.mockResolvedValue(cachedData);

      const result = await hasCachedData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude
      );

      expect(result).toBe(true);
    });

    it("returns false when no data exists", async () => {
      mockCacheGet.mockResolvedValue(null);

      const result = await hasCachedData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude
      );

      expect(result).toBe(false);
    });
  });

  describe("clearChartCache", () => {
    it("deletes cache for specific birth info", async () => {
      const result = await clearChartCache(testBirthDate, testBirthTime);

      expect(result).toBe(true);
      expect(mockCacheDel).toHaveBeenCalledWith(
        `destiny:${testBirthDate}:${testBirthTime}`
      );
    });

    it("returns false when delete fails", async () => {
      mockCacheDel.mockResolvedValue(false);

      const result = await clearChartCache(testBirthDate, testBirthTime);

      expect(result).toBe(false);
    });

    it("handles delete errors gracefully", async () => {
      mockCacheDel.mockRejectedValue(new Error("Redis error"));

      const result = await clearChartCache(testBirthDate, testBirthTime);

      expect(result).toBe(false);
    });
  });

  describe("cacheOrCalculateChart", () => {
    it("returns cached data when available", async () => {
      const cachedData = {
        saju: testChartData.saju,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      };
      mockCacheGet.mockResolvedValue(cachedData);

      const calculate = vi.fn();
      const result = await cacheOrCalculateChart(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        calculate,
        "saju"
      );

      expect(result).toEqual(testChartData.saju);
      expect(calculate).not.toHaveBeenCalled();
    });

    it("calculates and caches when cache misses", async () => {
      mockCacheGet.mockResolvedValue(null);
      const calculateResult = { calculated: true };
      const calculate = vi.fn().mockResolvedValue(calculateResult);

      const result = await cacheOrCalculateChart(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        calculate,
        "saju"
      );

      expect(result).toEqual(calculateResult);
      expect(calculate).toHaveBeenCalledTimes(1);
    });

    it("saves calculated result to cache", async () => {
      mockCacheGet.mockResolvedValue(null);
      const calculateResult = { calculated: true };
      const calculate = vi.fn().mockResolvedValue(calculateResult);

      await cacheOrCalculateChart(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        calculate,
        "saju"
      );

      // Wait for background save
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCacheSet).toHaveBeenCalled();
    });

    it("calculates when cached data lacks requested type", async () => {
      const cachedData = {
        astro: testChartData.astro, // Only astro, no saju
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      };
      mockCacheGet.mockResolvedValue(cachedData);

      const calculateResult = { saju: "calculated" };
      const calculate = vi.fn().mockResolvedValue(calculateResult);

      const result = await cacheOrCalculateChart(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        calculate,
        "saju" // Request saju, but only astro is cached
      );

      expect(result).toEqual(calculateResult);
      expect(calculate).toHaveBeenCalledTimes(1);
    });

    it("handles advancedAstro type", async () => {
      // Need saju or astro for data to be valid
      const cachedData = {
        saju: testChartData.saju,
        advancedAstro: { houses: [] },
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      };
      mockCacheGet.mockResolvedValue(cachedData);

      const calculate = vi.fn();
      const result = await cacheOrCalculateChart(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        calculate,
        "advancedAstro"
      );

      expect(result).toEqual(cachedData.advancedAstro);
      expect(calculate).not.toHaveBeenCalled();
    });

    it("merges new data with existing cache", async () => {
      const existingCache = {
        saju: testChartData.saju,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      };
      mockCacheGet.mockResolvedValue(existingCache);

      const newAstroData = { sun: "Leo" };
      const calculate = vi.fn().mockResolvedValue(newAstroData);

      await cacheOrCalculateChart(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        calculate,
        "astro"
      );

      // Wait for background save
      await new Promise((resolve) => setTimeout(resolve, 10));

      const savedData = mockCacheSet.mock.calls[0][1];
      expect(savedData.saju).toEqual(testChartData.saju); // Preserved
      expect(savedData.astro).toEqual(newAstroData); // Added
    });
  });

  describe("birthKey generation", () => {
    it("uses 4 decimal places for coordinates", async () => {
      await saveChartData(
        testBirthDate,
        testBirthTime,
        37.56654321, // More than 4 decimal places
        126.97812345,
        testChartData
      );

      const savedData = mockCacheSet.mock.calls[0][1];
      expect(savedData.birthKey).toContain("37.5665");
      expect(savedData.birthKey).toContain("126.9781");
    });

    it("handles negative coordinates", async () => {
      await saveChartData(
        testBirthDate,
        testBirthTime,
        -33.8688, // Sydney
        151.2093,
        testChartData
      );

      const savedData = mockCacheSet.mock.calls[0][1];
      expect(savedData.birthKey).toContain("-33.8688");
    });

    it("handles zero coordinates", async () => {
      await saveChartData(
        testBirthDate,
        testBirthTime,
        0, // Equator
        0, // Prime meridian
        testChartData
      );

      const savedData = mockCacheSet.mock.calls[0][1];
      expect(savedData.birthKey).toContain("0.0000");
    });
  });
});
