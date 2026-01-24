/**
 * Chart Data Cache 테스트
 * - 캐시 저장/로드
 * - 캐시 만료
 * - birthKey 검증
 * - 레거시 호환
 */

import { vi, beforeEach, afterEach } from "vitest";

// SessionStorage mock
let storageData: Record<string, string> = {};

const sessionStorageMock = {
  getItem: vi.fn((key: string) => storageData[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    storageData[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storageData[key];
  }),
  clear: vi.fn(() => {
    storageData = {};
  }),
  get length() {
    return Object.keys(storageData).length;
  },
  key: vi.fn((index: number) => Object.keys(storageData)[index] || null),
};

// Mock sessionStorage globally
Object.defineProperty(global, "sessionStorage", {
  value: sessionStorageMock,
  writable: true,
});

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import after mocking
import {
  saveChartData,
  loadChartData,
  loadCurrentChartData,
  clearChartCache,
  hasCachedData,
} from "@/lib/chartDataCache";

describe("chartDataCache", () => {
  beforeEach(() => {
    sessionStorageMock.clear();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("saveChartData", () => {
    it("saves data to sessionStorage", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { pillars: {} },
      });

      expect(sessionStorageMock.setItem).toHaveBeenCalled();
    });

    it("saves with correct key format", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { pillars: {} },
      });

      const calls = sessionStorageMock.setItem.mock.calls;
      const cacheKey = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      expect(cacheKey).toBeTruthy();
      expect(cacheKey?.[0]).toContain("1990-01-15");
      expect(cacheKey?.[0]).toContain("14:30");
    });

    it("includes timestamp in saved data", () => {
      const now = new Date("2024-01-15T12:00:00Z").getTime();
      vi.setSystemTime(now);

      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      const calls = sessionStorageMock.setItem.mock.calls;
      const dataCall = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      const savedData = JSON.parse(dataCall?.[1] || "{}");

      expect(savedData.timestamp).toBe(now);
    });

    it("includes birthKey in saved data", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      const calls = sessionStorageMock.setItem.mock.calls;
      const dataCall = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      const savedData = JSON.parse(dataCall?.[1] || "{}");

      expect(savedData.birthKey).toContain("1990-01-15");
      expect(savedData.birthKey).toContain("14:30");
      expect(savedData.birthKey).toContain("37.5665");
      expect(savedData.birthKey).toContain("126.9780");
    });

    it("saves saju data", () => {
      const sajuData = { pillars: { year: "甲子" } };
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: sajuData,
      });

      const calls = sessionStorageMock.setItem.mock.calls;
      const dataCall = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      const savedData = JSON.parse(dataCall?.[1] || "{}");

      expect(savedData.saju).toEqual(sajuData);
    });

    it("saves astro data", () => {
      const astroData = { planets: { sun: 280 } };
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        astro: astroData,
      });

      const calls = sessionStorageMock.setItem.mock.calls;
      const dataCall = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      const savedData = JSON.parse(dataCall?.[1] || "{}");

      expect(savedData.astro).toEqual(astroData);
    });

    it("saves advancedAstro data", () => {
      const advancedData = { aspects: [] };
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        advancedAstro: advancedData,
      });

      const calls = sessionStorageMock.setItem.mock.calls;
      const dataCall = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      const savedData = JSON.parse(dataCall?.[1] || "{}");

      expect(savedData.advancedAstro).toEqual(advancedData);
    });

    it("updates cache key index", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      const indexCall = sessionStorageMock.setItem.mock.calls.find(
        (c: string[]) => c[0] === "destinyChartDataKey"
      );
      expect(indexCall).toBeTruthy();
    });
  });

  describe("loadChartData", () => {
    it("returns null when no cache exists", () => {
      const result = loadChartData("1990-01-15", "14:30", 37.5665, 126.978);
      expect(result).toBeNull();
    });

    it("returns cached data when valid", () => {
      // Save first
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { pillars: {} },
        astro: { planets: {} },
      });

      const result = loadChartData("1990-01-15", "14:30", 37.5665, 126.978);

      expect(result).not.toBeNull();
      expect(result?.saju).toBeDefined();
      expect(result?.astro).toBeDefined();
    });

    it("returns null for expired cache", () => {
      const now = new Date("2024-01-15T12:00:00Z").getTime();
      vi.setSystemTime(now);

      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      // Advance time by more than 1 hour (cache duration)
      vi.advanceTimersByTime(3600001); // 1 hour + 1ms

      const result = loadChartData("1990-01-15", "14:30", 37.5665, 126.978);

      expect(result).toBeNull();
    });

    it("returns null when birthKey does not match", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      // Try to load with different coordinates
      const result = loadChartData("1990-01-15", "14:30", 35.0, 127.0);

      expect(result).toBeNull();
    });

    it("returns null when birthDate does not match", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      const result = loadChartData("1990-01-16", "14:30", 37.5665, 126.978);

      expect(result).toBeNull();
    });

    it("returns null when birthTime does not match", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      const result = loadChartData("1990-01-15", "15:00", 37.5665, 126.978);

      expect(result).toBeNull();
    });

    it("returns null when neither saju nor astro data exists", () => {
      // Manually set invalid cache
      const cacheKey = "destinyChartData_1990-01-15_14:30";
      sessionStorageMock.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          birthKey: "1990-01-15_14:30_37.5665_126.9780",
        })
      );

      const result = loadChartData("1990-01-15", "14:30", 37.5665, 126.978);

      expect(result).toBeNull();
    });
  });

  describe("loadCurrentChartData", () => {
    it("returns null when no cache exists", () => {
      const result = loadCurrentChartData();
      expect(result).toBeNull();
    });

    it("returns current cached data without birthKey validation", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { pillars: {} },
      });

      const result = loadCurrentChartData();

      expect(result).not.toBeNull();
      expect(result?.saju).toBeDefined();
    });

    it("returns null for expired cache", () => {
      const now = new Date("2024-01-15T12:00:00Z").getTime();
      vi.setSystemTime(now);

      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      vi.advanceTimersByTime(3600001);

      const result = loadCurrentChartData();

      expect(result).toBeNull();
    });
  });

  describe("clearChartCache", () => {
    it("removes cache data", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      clearChartCache();

      expect(sessionStorageMock.removeItem).toHaveBeenCalled();
    });

    it("removes cache key index", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      clearChartCache();

      const indexRemoveCall = sessionStorageMock.removeItem.mock.calls.find(
        (c: string[]) => c[0] === "destinyChartDataKey"
      );
      expect(indexRemoveCall).toBeTruthy();
    });

    it("removes legacy cache key", () => {
      sessionStorageMock.setItem("destinyChartData", JSON.stringify({ test: true }));

      clearChartCache();

      const legacyRemoveCall = sessionStorageMock.removeItem.mock.calls.find(
        (c: string[]) => c[0] === "destinyChartData"
      );
      expect(legacyRemoveCall).toBeTruthy();
    });
  });

  describe("hasCachedData", () => {
    it("returns false when no cache exists", () => {
      const result = hasCachedData("1990-01-15", "14:30", 37.5665, 126.978);
      expect(result).toBe(false);
    });

    it("returns true when valid saju cache exists", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { pillars: {} },
      });

      const result = hasCachedData("1990-01-15", "14:30", 37.5665, 126.978);

      expect(result).toBe(true);
    });

    it("returns true when valid astro cache exists", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        astro: { planets: {} },
      });

      const result = hasCachedData("1990-01-15", "14:30", 37.5665, 126.978);

      expect(result).toBe(true);
    });

    it("returns false when cache is expired", () => {
      const now = new Date("2024-01-15T12:00:00Z").getTime();
      vi.setSystemTime(now);

      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      vi.advanceTimersByTime(3600001);

      const result = hasCachedData("1990-01-15", "14:30", 37.5665, 126.978);

      expect(result).toBe(false);
    });

    it("returns false when birthKey does not match", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      const result = hasCachedData("1990-01-15", "14:30", 35.0, 127.0);

      expect(result).toBe(false);
    });
  });

  describe("birthKey generation", () => {
    it("generates consistent birthKey for same input", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      // Load with same coordinates
      const result = loadChartData("1990-01-15", "14:30", 37.5665, 126.978);

      expect(result).not.toBeNull();
    });

    it("truncates coordinates to 4 decimal places", () => {
      // Save with high precision
      saveChartData("1990-01-15", "14:30", 37.56654321, 126.97876543, {
        saju: { test: true },
      });

      // Load with same truncated precision
      const result = loadChartData("1990-01-15", "14:30", 37.5665, 126.9788);

      expect(result).not.toBeNull();
    });
  });

  describe("legacy cache compatibility", () => {
    it("falls back to legacy cache key when new key not found", () => {
      // Set legacy cache
      const legacyData = {
        saju: { pillars: {} },
        timestamp: Date.now(),
        birthKey: "1990-01-15_14:30_37.5665_126.9780",
      };
      sessionStorageMock.setItem("destinyChartData", JSON.stringify(legacyData));

      const result = loadChartData("1990-01-15", "14:30", 37.5665, 126.978);

      expect(result).not.toBeNull();
      expect(result?.saju).toBeDefined();
    });
  });

  describe("cache performance and edge cases", () => {
    beforeEach(() => {
      storageData = {};
      vi.clearAllMocks();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("handles rapid save/load cycles", () => {
      // Rapidly save and load
      for (let i = 0; i < 10; i++) {
        saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
          saju: { iteration: i },
        });

        const loaded = loadChartData("1990-01-15", "14:30", 37.5665, 126.978);
        expect(loaded).not.toBeNull();
      }
    });

    it("handles large data objects", () => {
      const largeData = {
        saju: { data: "x".repeat(10000) },
        astro: { data: "y".repeat(10000) },
      };

      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, largeData);
      const loaded = loadChartData("1990-01-15", "14:30", 37.5665, 126.978);

      expect(loaded?.saju).toEqual(largeData.saju);
      expect(loaded?.astro).toEqual(largeData.astro);
    });

    it("handles cache at exact expiry time", () => {
      const now = Date.now();
      vi.setSystemTime(now);

      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      // Exactly 1 hour later
      vi.setSystemTime(now + 3600000);
      const atExpiry = loadChartData("1990-01-15", "14:30", 37.5665, 126.978);
      expect(atExpiry).not.toBeNull();

      // 1ms after expiry
      vi.setSystemTime(now + 3600001);
      const afterExpiry = loadChartData("1990-01-15", "14:30", 37.5665, 126.978);
      expect(afterExpiry).toBeNull();
    });

    it("handles missing advancedAstro gracefully", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { test: true },
      });

      const loaded = loadChartData("1990-01-15", "14:30", 37.5665, 126.978);
      expect(loaded?.saju).toBeDefined();
      expect(loaded?.advancedAstro).toBeUndefined();
    });

    it("handles coordinate precision differences", () => {
      // Save with high precision
      saveChartData("1990-01-15", "14:30", 37.566543210, 126.978987654, {
        saju: { test: true },
      });

      // Load with lower precision (should match after truncation)
      const result = loadChartData("1990-01-15", "14:30", 37.5665, 126.9790);
      expect(result).not.toBeNull();
    });

    it("handles different time formats", () => {
      saveChartData("1990-01-15", "09:00", 37.5665, 126.978, {
        saju: { morning: true },
      });

      const result = loadChartData("1990-01-15", "09:00", 37.5665, 126.978);
      expect(result?.saju).toBeDefined();
    });

    it("returns null for corrupted cache data", () => {
      const cacheKey = "destinyChartData_1990-01-15_14:30";
      sessionStorageMock.setItem(cacheKey, "not valid json{");

      const result = loadChartData("1990-01-15", "14:30", 37.5665, 126.978);
      expect(result).toBeNull();
    });

    it("handles sessionStorage quota exceeded", () => {
      sessionStorageMock.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      // Should not throw
      expect(() =>
        saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
          saju: { test: true },
        })
      ).not.toThrow();
    });

    it("handles multiple cached charts", () => {
      // Cache different birth data
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: { person: "A" },
      });

      saveChartData("1995-06-20", "09:00", 35.0, 127.0, {
        saju: { person: "B" },
      });

      // Verify both were saved with different keys
      const calls = sessionStorageMock.setItem.mock.calls;
      const keys = calls.filter((c: string[]) => c[0].startsWith("destinyChartData_")).map((c: string[]) => c[0]);

      // Should have saved with different cache keys
      expect(keys.length).toBeGreaterThanOrEqual(2);
      expect(keys).toContain("destinyChartData_1990-01-15_14:30");
      expect(keys).toContain("destinyChartData_1995-06-20_09:00");
    });
  });

  describe("birthKey generation edge cases", () => {
    beforeEach(() => {
      storageData = {};
      vi.clearAllMocks();
    });

    it("generates unique birthKeys based on all parameters", () => {
      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, { saju: { test: 1 } });

      const calls = sessionStorageMock.setItem.mock.calls;
      const dataCall = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      const savedData = JSON.parse(dataCall?.[1] || "{}");

      // BirthKey should include date, time, and coordinates
      expect(savedData.birthKey).toContain("1990-01-15");
      expect(savedData.birthKey).toContain("14:30");
      expect(savedData.birthKey).toContain("37.5665");
      expect(savedData.birthKey).toContain("126.9780");
    });

    it("uses 4 decimal places for coordinates in birthKey", () => {
      saveChartData("1990-01-15", "14:30", 37.566543210, 126.978987654, { saju: { test: true } });

      const calls = sessionStorageMock.setItem.mock.calls;
      const dataCall = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      const savedData = JSON.parse(dataCall?.[1] || "{}");

      // Should be truncated to 4 decimal places
      expect(savedData.birthKey).toContain("37.5665");
      expect(savedData.birthKey).toContain("126.9790");
    });

    it("handles zero coordinates in birthKey", () => {
      saveChartData("1990-01-15", "14:30", 0, 0, { saju: { equator: true } });

      const calls = sessionStorageMock.setItem.mock.calls;
      const dataCall = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      const savedData = JSON.parse(dataCall?.[1] || "{}");

      expect(savedData.birthKey).toContain("0.0000");
    });

    it("handles extreme coordinates in birthKey", () => {
      saveChartData("1990-01-15", "14:30", 89.9999, -179.9999, { saju: { extreme: true } });

      const calls = sessionStorageMock.setItem.mock.calls;
      const dataCall = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      const savedData = JSON.parse(dataCall?.[1] || "{}");

      expect(savedData.birthKey).toBeDefined();
      expect(typeof savedData.birthKey).toBe("string");
    });
  });

  describe("data integrity checks", () => {
    beforeEach(() => {
      storageData = {};
      vi.clearAllMocks();
    });

    it("saves complex nested structures correctly", () => {
      const complexData = {
        pillars: {
          year: { stem: "甲", branch: "子" },
          month: { stem: "乙", branch: "丑" },
        },
        elements: ["木", "土"],
      };

      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: complexData,
      });

      const calls = sessionStorageMock.setItem.mock.calls;
      const dataCall = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      const savedData = JSON.parse(dataCall?.[1] || "{}");

      expect(savedData.saju).toEqual(complexData);
    });

    it("saves array data correctly", () => {
      const arrayData = {
        elements: ["Metal", "Water", "Wood"],
        scores: [10, 20, 30, 40, 50],
      };

      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: arrayData,
      });

      const calls = sessionStorageMock.setItem.mock.calls;
      const dataCall = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      const savedData = JSON.parse(dataCall?.[1] || "{}");

      expect(Array.isArray(savedData.saju.elements)).toBe(true);
      expect(savedData.saju.elements).toEqual(["Metal", "Water", "Wood"]);
    });

    it("handles various data types", () => {
      const mixedData = {
        string: "test",
        number: 42,
        float: 3.14159,
        negative: -100,
        boolean: true,
        nullValue: null,
      };

      saveChartData("1990-01-15", "14:30", 37.5665, 126.978, {
        saju: mixedData,
      });

      const calls = sessionStorageMock.setItem.mock.calls;
      const dataCall = calls.find((c: string[]) => c[0].startsWith("destinyChartData_"));
      const savedData = JSON.parse(dataCall?.[1] || "{}");

      expect(savedData.saju.number).toBe(42);
      expect(savedData.saju.float).toBe(3.14159);
      expect(savedData.saju.boolean).toBe(true);
      expect(savedData.saju.nullValue).toBeNull();
    });
  });
});
