/**
 * Redis Cache Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheOrCalculate,
  cacheGetMany,
  clearCacheByPattern,
  CacheKeys,
  CACHE_TTL,
} from "@/lib/cache/redis-cache";

// Mock redis
vi.mock("redis", () => ({
  createClient: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
    mGet: vi.fn(),
    keys: vi.fn(),
    info: vi.fn(),
  })),
}));

describe("Redis Cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CACHE_TTL", () => {
    it("defines TTL for different data types", () => {
      expect(CACHE_TTL.SAJU_RESULT).toBe(60 * 60 * 24 * 7);
      expect(CACHE_TTL.TAROT_READING).toBe(60 * 60 * 24);
      expect(CACHE_TTL.DESTINY_MAP).toBe(60 * 60 * 24 * 3);
      expect(CACHE_TTL.CALENDAR_DATA).toBe(60 * 60 * 24);
    });
  });

  describe("CacheKeys", () => {
    it("generates saju cache key", () => {
      const key = CacheKeys.saju("1990-01-01", "12:00", "M");
      expect(key).toBe("saju:1990-01-01:12:00:M");
    });

    it("generates tarot cache key", () => {
      const key = CacheKeys.tarot("user123", "question", "celtic");
      expect(key).toContain("tarot:user123");
      expect(key).toContain("celtic");
    });

    it("generates destiny map key", () => {
      const key = CacheKeys.destinyMap("1990-01-01", "12:00");
      expect(key).toBe("destiny:1990-01-01:12:00");
    });

    it("generates calendar key", () => {
      const key = CacheKeys.calendar(2024, 1, "user123");
      expect(key).toBe("cal:2024:1:user123");
    });

    it("generates compatibility key", () => {
      const key = CacheKeys.compatibility("person1", "person2");
      expect(key).toBe("compat:person1:person2");
    });

    it("generates yearly calendar key with category", () => {
      const key = CacheKeys.yearlyCalendar(
        "1990-01-01",
        "12:00",
        "M",
        2024,
        "love"
      );
      expect(key).toBe("yearly:1990-01-01:12:00:M:2024:love");
    });

    it("generates yearly calendar key without category", () => {
      const key = CacheKeys.yearlyCalendar("1990-01-01", "12:00", "M", 2024);
      expect(key).toBe("yearly:1990-01-01:12:00:M:2024");
    });
  });

  describe("cacheGet", () => {
    it("returns null when REDIS_URL not set", async () => {
      const originalEnv = process.env.REDIS_URL;
      delete process.env.REDIS_URL;

      const result = await cacheGet("test-key");

      expect(result).toBeNull();
      process.env.REDIS_URL = originalEnv;
    });
  });

  describe("cacheSet", () => {
    it("returns false when REDIS_URL not set", async () => {
      const originalEnv = process.env.REDIS_URL;
      delete process.env.REDIS_URL;

      const result = await cacheSet("test-key", { data: "test" });

      expect(result).toBe(false);
      process.env.REDIS_URL = originalEnv;
    });
  });

  describe("cacheDel", () => {
    it("returns false when REDIS_URL not set", async () => {
      const originalEnv = process.env.REDIS_URL;
      delete process.env.REDIS_URL;

      const result = await cacheDel("test-key");

      expect(result).toBe(false);
      process.env.REDIS_URL = originalEnv;
    });
  });

  describe("cacheOrCalculate", () => {
    it("calls calculate function when cache misses", async () => {
      const calculate = vi.fn().mockResolvedValue({ data: "calculated" });

      const result = await cacheOrCalculate("test-key", calculate, 3600);

      expect(calculate).toHaveBeenCalled();
      expect(result).toEqual({ data: "calculated" });
    });
  });

  describe("cacheGetMany", () => {
    it("returns array of nulls when REDIS_URL not set", async () => {
      const originalEnv = process.env.REDIS_URL;
      delete process.env.REDIS_URL;

      const result = await cacheGetMany(["key1", "key2", "key3"]);

      expect(result).toEqual([null, null, null]);
      process.env.REDIS_URL = originalEnv;
    });
  });

  describe("clearCacheByPattern", () => {
    it("returns 0 when REDIS_URL not set", async () => {
      const originalEnv = process.env.REDIS_URL;
      delete process.env.REDIS_URL;

      const result = await clearCacheByPattern("test:*");

      expect(result).toBe(0);
      process.env.REDIS_URL = originalEnv;
    });
  });

  describe("CacheKeys edge cases", () => {
    it("generates grading key with truncated hash", () => {
      const key = CacheKeys.grading("2024-01-15", JSON.stringify({ test: "data" }));
      expect(key).toMatch(/^grade:2024-01-15:/);
      // btoa produces base64, sliced to 20 chars
      expect(key.split(":")[2].length).toBeLessThanOrEqual(20);
    });

    it("handles special characters in tarot question", () => {
      const key = CacheKeys.tarot("user1", "What is my love life?", "celtic");
      expect(key).toContain("tarot:user1:");
      // btoa should encode the question
      expect(key).not.toContain("What is my love life?");
    });

    it("generates unique keys for different birth times", () => {
      const key1 = CacheKeys.saju("1990-01-01", "12:00", "M");
      const key2 = CacheKeys.saju("1990-01-01", "12:01", "M");
      const key3 = CacheKeys.saju("1990-01-01", "12:00", "F");

      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
    });

    it("generates consistent keys for same inputs", () => {
      const key1 = CacheKeys.destinyMap("1990-01-01", "12:00");
      const key2 = CacheKeys.destinyMap("1990-01-01", "12:00");

      expect(key1).toBe(key2);
    });
  });

  describe("CACHE_TTL values", () => {
    it("has correct TTL for compatibility", () => {
      expect(CACHE_TTL.COMPATIBILITY).toBe(60 * 60 * 24 * 7);
    });

    it("has correct TTL for grading", () => {
      expect(CACHE_TTL.GRADING_RESULT).toBe(60 * 60 * 24);
    });

    it("all TTL values are positive numbers", () => {
      Object.values(CACHE_TTL).forEach((ttl) => {
        expect(ttl).toBeGreaterThan(0);
        expect(typeof ttl).toBe("number");
      });
    });
  });

  describe("error handling patterns", () => {
    it("cacheOrCalculate returns calculated value on cache miss", async () => {
      const originalEnv = process.env.REDIS_URL;
      delete process.env.REDIS_URL;

      const calculate = vi.fn().mockResolvedValue({ computed: true });
      const result = await cacheOrCalculate("key", calculate);

      expect(result).toEqual({ computed: true });
      expect(calculate).toHaveBeenCalledOnce();

      process.env.REDIS_URL = originalEnv;
    });

    it("cacheGetMany returns correct length array", async () => {
      const originalEnv = process.env.REDIS_URL;
      delete process.env.REDIS_URL;

      const keys = ["key1", "key2", "key3", "key4", "key5"];
      const result = await cacheGetMany(keys);

      expect(result).toHaveLength(5);
      expect(result.every((r) => r === null)).toBe(true);

      process.env.REDIS_URL = originalEnv;
    });
  });
});
