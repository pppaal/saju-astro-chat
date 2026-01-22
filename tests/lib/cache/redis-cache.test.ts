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

// Mock redis client
const mockRedisClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  get: vi.fn(),
  setEx: vi.fn(),
  del: vi.fn(),
  mGet: vi.fn(),
  keys: vi.fn(),
  info: vi.fn(),
};

vi.mock("redis", () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

describe("Redis Cache", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
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
      expect(key).toBe("yearly:v2:1990-01-01:12:00:M:2024:love");
    });

    it("generates yearly calendar key without category", () => {
      const key = CacheKeys.yearlyCalendar("1990-01-01", "12:00", "M", 2024);
      expect(key).toBe("yearly:v2:1990-01-01:12:00:M:2024");
    });
  });

  describe("cacheGet", () => {
    it("returns null when REDIS_URL not set", async () => {
      delete process.env.REDIS_URL;

      const result = await cacheGet("test-key");

      expect(result).toBeNull();
    });
  });

  describe("cacheSet", () => {
    it("returns false when REDIS_URL not set", async () => {
      delete process.env.REDIS_URL;

      const result = await cacheSet("test-key", { data: "test" });

      expect(result).toBe(false);
    });
  });

  describe("cacheDel", () => {
    it("returns false when REDIS_URL not set", async () => {
      delete process.env.REDIS_URL;

      const result = await cacheDel("test-key");

      expect(result).toBe(false);
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
      delete process.env.REDIS_URL;

      const result = await clearCacheByPattern("test:*");

      expect(result).toBe(0);
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
      delete process.env.REDIS_URL;

      const calculate = vi.fn().mockResolvedValue({ computed: true });
      const result = await cacheOrCalculate("key", calculate);

      expect(result).toEqual({ computed: true });
      expect(calculate).toHaveBeenCalledOnce();
    });

    it("cacheGetMany returns correct length array", async () => {
      delete process.env.REDIS_URL;

      const keys = ["key1", "key2", "key3", "key4", "key5"];
      const result = await cacheGetMany(keys);

      expect(result).toHaveLength(5);
      expect(result.every((r) => r === null)).toBe(true);
    });
  });

  describe("Redis operations with mocked client", () => {
    beforeEach(() => {
      process.env.REDIS_URL = "redis://localhost:6379";
      mockRedisClient.connect.mockResolvedValue(undefined);
      mockRedisClient.on.mockImplementation(() => mockRedisClient);
    });

    it("cacheGet retrieves and parses data from Redis", async () => {
      const testData = { test: "data", value: 123 };
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(testData));

      const result = await cacheGet("test-key");

      expect(mockRedisClient.get).toHaveBeenCalledWith("test-key");
      expect(result).toEqual(testData);
    });

    it("cacheGet returns null for non-existent key", async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);

      const result = await cacheGet("non-existent");

      expect(result).toBeNull();
    });

    it("cacheGet handles JSON parse errors", async () => {
      mockRedisClient.get.mockResolvedValueOnce("invalid json");

      const result = await cacheGet("bad-json");

      expect(result).toBeNull();
    });

    it("cacheGet handles Redis errors", async () => {
      mockRedisClient.get.mockRejectedValueOnce(new Error("Redis error"));

      const result = await cacheGet("error-key");

      expect(result).toBeNull();
    });

    it("cacheSet stores data with TTL", async () => {
      mockRedisClient.setEx.mockResolvedValueOnce("OK");

      const data = { test: "value" };
      const result = await cacheSet("test-key", data, 3600);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        "test-key",
        3600,
        JSON.stringify(data)
      );
      expect(result).toBe(true);
    });

    it("cacheSet uses default TTL when not specified", async () => {
      mockRedisClient.setEx.mockResolvedValueOnce("OK");

      await cacheSet("test-key", { data: "test" });

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        "test-key",
        3600,
        expect.any(String)
      );
    });

    it("cacheSet handles Redis errors", async () => {
      mockRedisClient.setEx.mockRejectedValueOnce(new Error("Set error"));

      const result = await cacheSet("error-key", { data: "test" });

      expect(result).toBe(false);
    });

    it("cacheDel removes key from Redis", async () => {
      mockRedisClient.del.mockResolvedValueOnce(1);

      const result = await cacheDel("test-key");

      expect(mockRedisClient.del).toHaveBeenCalledWith("test-key");
      expect(result).toBe(true);
    });

    it("cacheDel handles Redis errors", async () => {
      mockRedisClient.del.mockRejectedValueOnce(new Error("Delete error"));

      const result = await cacheDel("error-key");

      expect(result).toBe(false);
    });

    it("cacheOrCalculate uses cached value when available", async () => {
      const cachedData = { cached: true };
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(cachedData));

      const calculate = vi.fn();
      const result = await cacheOrCalculate("cached-key", calculate, 3600);

      expect(result).toEqual(cachedData);
      expect(calculate).not.toHaveBeenCalled();
    });

    it("cacheOrCalculate calculates and caches on miss", async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);
      mockRedisClient.setEx.mockResolvedValueOnce("OK");

      const calculatedData = { calculated: true };
      const calculate = vi.fn().mockResolvedValue(calculatedData);

      const result = await cacheOrCalculate("miss-key", calculate, 7200);

      expect(calculate).toHaveBeenCalled();
      expect(result).toEqual(calculatedData);

      // Wait a bit for fire-and-forget cache set
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        "miss-key",
        7200,
        JSON.stringify(calculatedData)
      );
    });

    it("cacheOrCalculate handles cache set failure gracefully", async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);
      mockRedisClient.setEx.mockRejectedValueOnce(new Error("Set failed"));

      const calculatedData = { data: "test" };
      const calculate = vi.fn().mockResolvedValue(calculatedData);

      const result = await cacheOrCalculate("key", calculate);

      expect(result).toEqual(calculatedData);
    });

    it("cacheGetMany retrieves multiple keys", async () => {
      const data1 = { value: 1 };
      const data2 = { value: 2 };
      mockRedisClient.mGet.mockResolvedValueOnce([
        JSON.stringify(data1),
        JSON.stringify(data2),
        null,
      ]);

      const result = await cacheGetMany(["key1", "key2", "key3"]);

      expect(mockRedisClient.mGet).toHaveBeenCalledWith(["key1", "key2", "key3"]);
      expect(result).toEqual([data1, data2, null]);
    });

    it("cacheGetMany handles Redis errors", async () => {
      mockRedisClient.mGet.mockRejectedValueOnce(new Error("mGet error"));

      const result = await cacheGetMany(["key1", "key2"]);

      expect(result).toEqual([null, null]);
    });

    it("cacheGetMany handles parse errors in results", async () => {
      mockRedisClient.mGet.mockResolvedValueOnce([
        JSON.stringify({ valid: true }),
        "invalid json",
        null,
      ]);

      const result = await cacheGetMany(["key1", "key2", "key3"]);

      // Individual parse errors cause the whole operation to fail and return all nulls
      expect(result.every(r => r === null)).toBe(true);
    });

    it("clearCacheByPattern clears matching keys", async () => {
      mockRedisClient.keys.mockResolvedValueOnce(["saju:key1", "saju:key2", "saju:key3"]);
      mockRedisClient.del.mockResolvedValueOnce(3);

      const result = await clearCacheByPattern("saju:*");

      expect(mockRedisClient.keys).toHaveBeenCalledWith("saju:*");
      expect(mockRedisClient.del).toHaveBeenCalledWith([
        "saju:key1",
        "saju:key2",
        "saju:key3",
      ]);
      expect(result).toBe(3);
    });

    it("clearCacheByPattern returns 0 when no keys match", async () => {
      mockRedisClient.keys.mockResolvedValueOnce([]);

      const result = await clearCacheByPattern("nonexistent:*");

      expect(mockRedisClient.del).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it("clearCacheByPattern handles Redis errors", async () => {
      mockRedisClient.keys.mockRejectedValueOnce(new Error("Keys error"));

      const result = await clearCacheByPattern("pattern:*");

      expect(result).toBe(0);
    });

    it("getCacheInfo retrieves Redis stats", async () => {
      const infoData = "total_connections_received:10\ntotal_commands_processed:100";
      mockRedisClient.info.mockResolvedValueOnce(infoData);

      const result = await import("@/lib/cache/redis-cache").then((mod) =>
        mod.getCacheInfo()
      );

      expect(mockRedisClient.info).toHaveBeenCalledWith("stats");
      expect(result).toBe(infoData);
    });

    it("getCacheInfo handles Redis errors", async () => {
      mockRedisClient.info.mockRejectedValueOnce(new Error("Info error"));

      const result = await import("@/lib/cache/redis-cache").then((mod) =>
        mod.getCacheInfo()
      );

      expect(result).toBeNull();
    });

    it("getCacheInfo returns null when Redis not configured", async () => {
      delete process.env.REDIS_URL;
      vi.resetModules();

      const result = await import("@/lib/cache/redis-cache").then((mod) =>
        mod.getCacheInfo()
      );

      expect(result).toBeNull();
    });
  });

  describe("Redis client initialization", () => {
    it("creates Redis client on first use", async () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      vi.resetModules();

      const redis = await import("redis");
      mockRedisClient.get.mockResolvedValueOnce(null);

      const { cacheGet } = await import("@/lib/cache/redis-cache");
      await cacheGet("test");

      expect(redis.createClient).toHaveBeenCalled();
      expect(mockRedisClient.connect).toHaveBeenCalled();
      expect(mockRedisClient.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("reuses existing Redis client", async () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      vi.resetModules();

      const redis = await import("redis");
      mockRedisClient.get.mockResolvedValue(null);

      const { cacheGet } = await import("@/lib/cache/redis-cache");
      await cacheGet("test1");
      await cacheGet("test2");

      // createClient should only be called once
      expect(redis.createClient).toHaveBeenCalledTimes(1);
    });

    it("handles connection errors gracefully", async () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      vi.resetModules();

      mockRedisClient.connect.mockRejectedValueOnce(new Error("Connection failed"));

      const { cacheGet } = await import("@/lib/cache/redis-cache");
      const result = await cacheGet("test");

      expect(result).toBeNull();
    });

    it("registers error handler on client", async () => {
      process.env.REDIS_URL = "redis://localhost:6379";
      vi.resetModules();

      mockRedisClient.get.mockResolvedValueOnce(null);

      const { cacheGet } = await import("@/lib/cache/redis-cache");
      await cacheGet("test");

      expect(mockRedisClient.on).toHaveBeenCalledWith("error", expect.any(Function));
    });
  });

  describe("Complex data type handling", () => {
    beforeEach(() => {
      process.env.REDIS_URL = "redis://localhost:6379";
    });

    it("handles nested objects", async () => {
      const complexData = {
        user: {
          name: "Test",
          profile: {
            age: 25,
            tags: ["admin", "user"],
          },
        },
      };

      mockRedisClient.setEx.mockResolvedValueOnce("OK");

      await cacheSet("complex", complexData);

      const serialized = (mockRedisClient.setEx as any).mock.calls[0][2];
      expect(JSON.parse(serialized)).toEqual(complexData);
    });

    it("handles arrays", async () => {
      const arrayData = [1, 2, 3, { nested: true }];
      mockRedisClient.setEx.mockResolvedValueOnce("OK");

      await cacheSet("array", arrayData);

      const serialized = (mockRedisClient.setEx as any).mock.calls[0][2];
      expect(JSON.parse(serialized)).toEqual(arrayData);
    });

    it("handles special values", async () => {
      const specialData = {
        nullValue: null,
        boolTrue: true,
        boolFalse: false,
        number: 123,
        float: 123.456,
      };

      mockRedisClient.setEx.mockResolvedValueOnce("OK");
      await cacheSet("special", specialData);

      const serialized = (mockRedisClient.setEx as any).mock.calls[0][2];
      const parsed = JSON.parse(serialized);

      expect(parsed.nullValue).toBeNull();
      expect(parsed.boolTrue).toBe(true);
      expect(parsed.boolFalse).toBe(false);
      expect(parsed.number).toBe(123);
      expect(parsed.float).toBe(123.456);
    });
  });
});
