/**
 * Tests for chartDataCache.ts
 * Chart data caching utility for Saju and Astrology calculations
 */

import { vi, beforeEach } from "vitest";

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
  length: 0,
  key: vi.fn(),
};

vi.stubGlobal("sessionStorage", sessionStorageMock);

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("chartDataCache", () => {
  const testBirthDate = "1990-05-15";
  const testBirthTime = "14:30";
  const testLatitude = 37.5665;
  const testLongitude = 126.978;

  const testSajuData = {
    dayMaster: { name: "갑", element: "목" },
    yearPillar: { heavenlyStem: "경", earthlyBranch: "오" },
  };

  const testAstroData = {
    sun: { sign: "Taurus", degree: 24 },
    moon: { sign: "Leo", degree: 15 },
  };

  beforeEach(() => {
    vi.resetModules();
    sessionStorageMock.clear();
    Object.keys(mockSessionStorage).forEach((key) => delete mockSessionStorage[key]);
  });

  describe("saveChartData", () => {
    it("saves saju data to sessionStorage", async () => {
      const { saveChartData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
      });

      expect(sessionStorageMock.setItem).toHaveBeenCalled();

      // Verify data was stored
      const storedKey = Object.keys(mockSessionStorage).find((k) =>
        k.startsWith("destinyChartData_")
      );
      expect(storedKey).toBeDefined();

      const stored = JSON.parse(mockSessionStorage[storedKey!]);
      expect(stored.saju).toEqual(testSajuData);
      expect(stored.timestamp).toBeDefined();
      expect(stored.birthKey).toBeDefined();
    });

    it("saves astro data to sessionStorage", async () => {
      const { saveChartData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        astro: testAstroData,
      });

      const storedKey = Object.keys(mockSessionStorage).find((k) =>
        k.startsWith("destinyChartData_")
      );
      const stored = JSON.parse(mockSessionStorage[storedKey!]);
      expect(stored.astro).toEqual(testAstroData);
    });

    it("saves both saju and astro data together", async () => {
      const { saveChartData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
        astro: testAstroData,
      });

      const storedKey = Object.keys(mockSessionStorage).find((k) =>
        k.startsWith("destinyChartData_")
      );
      const stored = JSON.parse(mockSessionStorage[storedKey!]);
      expect(stored.saju).toEqual(testSajuData);
      expect(stored.astro).toEqual(testAstroData);
    });

    it("stores current cache key index", async () => {
      const { saveChartData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
      });

      expect(mockSessionStorage["destinyChartDataKey"]).toBeDefined();
    });

    it("generates unique birth key based on birth data", async () => {
      const { saveChartData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
      });

      const storedKey = Object.keys(mockSessionStorage).find((k) =>
        k.startsWith("destinyChartData_")
      );
      const stored = JSON.parse(mockSessionStorage[storedKey!]);

      expect(stored.birthKey).toBe(
        `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`
      );
    });

    it("handles sessionStorage errors gracefully", async () => {
      const { logger } = await import("@/lib/logger");
      sessionStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error("Storage full");
      });

      const { saveChartData } = await import("@/lib/chartDataCache");

      // Should not throw
      expect(() =>
        saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
          saju: testSajuData,
        })
      ).not.toThrow();

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to (save cache|manage cache keys)/),
        expect.any(Error)
      );
    });
  });

  describe("loadChartData", () => {
    it("loads cached data for matching birth data", async () => {
      const { saveChartData, loadChartData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
        astro: testAstroData,
      });

      const loaded = loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude);

      expect(loaded).not.toBeNull();
      expect(loaded!.saju).toEqual(testSajuData);
      expect(loaded!.astro).toEqual(testAstroData);
    });

    it("returns null for non-existent cache", async () => {
      const { loadChartData } = await import("@/lib/chartDataCache");

      const loaded = loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude);

      expect(loaded).toBeNull();
    });

    it("returns null for different birth data", async () => {
      const { saveChartData, loadChartData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
      });

      // Try to load with different birth date
      const loaded = loadChartData("1995-01-01", testBirthTime, testLatitude, testLongitude);

      expect(loaded).toBeNull();
    });

    it("returns null for expired cache", async () => {
      const { saveChartData, loadChartData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
      });

      // Manually expire the cache
      const storedKey = Object.keys(mockSessionStorage).find((k) =>
        k.startsWith("destinyChartData_")
      );
      const stored = JSON.parse(mockSessionStorage[storedKey!]);
      stored.timestamp = Date.now() - 3600001; // Just over 1 hour
      mockSessionStorage[storedKey!] = JSON.stringify(stored);

      const loaded = loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude);

      expect(loaded).toBeNull();
    });

    it("loads from legacy cache key as fallback", async () => {
      const { loadChartData } = await import("@/lib/chartDataCache");

      // Store in legacy format
      const legacyData = {
        saju: testSajuData,
        astro: testAstroData,
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      };
      mockSessionStorage["destinyChartData"] = JSON.stringify(legacyData);

      const loaded = loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude);

      expect(loaded).not.toBeNull();
      expect(loaded!.saju).toEqual(testSajuData);
    });

    it("returns null for invalid cache data", async () => {
      const { loadChartData } = await import("@/lib/chartDataCache");

      // Store invalid JSON
      mockSessionStorage[`destinyChartData_${testBirthDate}_${testBirthTime}`] = "invalid json";

      const loaded = loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude);

      expect(loaded).toBeNull();
    });

    it("returns null when cache has no saju or astro data", async () => {
      const { loadChartData } = await import("@/lib/chartDataCache");

      const emptyData = {
        timestamp: Date.now(),
        birthKey: `${testBirthDate}_${testBirthTime}_${testLatitude.toFixed(4)}_${testLongitude.toFixed(4)}`,
      };
      mockSessionStorage[`destinyChartData_${testBirthDate}_${testBirthTime}`] = JSON.stringify(emptyData);

      const loaded = loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude);

      expect(loaded).toBeNull();
    });
  });

  describe("loadCurrentChartData", () => {
    it("loads most recent cached data without validation", async () => {
      const { saveChartData, loadCurrentChartData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
        astro: testAstroData,
      });

      const loaded = loadCurrentChartData();

      expect(loaded).not.toBeNull();
      expect(loaded!.saju).toEqual(testSajuData);
      expect(loaded!.astro).toEqual(testAstroData);
    });

    it("returns null when no cache exists", async () => {
      const { loadCurrentChartData } = await import("@/lib/chartDataCache");

      const loaded = loadCurrentChartData();

      expect(loaded).toBeNull();
    });

    it("returns null for expired cache", async () => {
      const { saveChartData, loadCurrentChartData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
      });

      // Manually expire the cache
      const currentKey = mockSessionStorage["destinyChartDataKey"];
      const stored = JSON.parse(mockSessionStorage[currentKey]);
      stored.timestamp = Date.now() - 3600001;
      mockSessionStorage[currentKey] = JSON.stringify(stored);

      const loaded = loadCurrentChartData();

      expect(loaded).toBeNull();
    });
  });

  describe("clearChartCache", () => {
    it("clears all cache entries", async () => {
      const { saveChartData, clearChartCache, loadChartData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
      });

      clearChartCache();

      const loaded = loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude);
      expect(loaded).toBeNull();
    });

    it("removes cache key index", async () => {
      const { saveChartData, clearChartCache } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
      });

      clearChartCache();

      expect(mockSessionStorage["destinyChartDataKey"]).toBeUndefined();
    });

    it("removes legacy cache key", async () => {
      const { clearChartCache } = await import("@/lib/chartDataCache");

      mockSessionStorage["destinyChartData"] = JSON.stringify({ test: true });

      clearChartCache();

      expect(mockSessionStorage["destinyChartData"]).toBeUndefined();
    });

    it("handles errors gracefully", async () => {
      sessionStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      const { clearChartCache } = await import("@/lib/chartDataCache");

      // Should not throw
      expect(() => clearChartCache()).not.toThrow();
    });
  });

  describe("hasCachedData", () => {
    it("returns true when valid cache exists", async () => {
      const { saveChartData, hasCachedData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
      });

      const exists = hasCachedData(testBirthDate, testBirthTime, testLatitude, testLongitude);

      expect(exists).toBe(true);
    });

    it("returns false when no cache exists", async () => {
      const { hasCachedData } = await import("@/lib/chartDataCache");

      const exists = hasCachedData(testBirthDate, testBirthTime, testLatitude, testLongitude);

      expect(exists).toBe(false);
    });

    it("returns false for different birth data", async () => {
      const { saveChartData, hasCachedData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        saju: testSajuData,
      });

      const exists = hasCachedData("2000-01-01", testBirthTime, testLatitude, testLongitude);

      expect(exists).toBe(false);
    });

    it("returns true when only astro data exists", async () => {
      const { saveChartData, hasCachedData } = await import("@/lib/chartDataCache");

      saveChartData(testBirthDate, testBirthTime, testLatitude, testLongitude, {
        astro: testAstroData,
      });

      const exists = hasCachedData(testBirthDate, testBirthTime, testLatitude, testLongitude);

      expect(exists).toBe(true);
    });
  });
});
