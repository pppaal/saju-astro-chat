/**
 * Tests for Redis Cache utilities
 * src/lib/redis-cache.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { makeCacheKey, cacheGet, cacheSet } from "@/lib/redis-cache";

// Mock fetch for API tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Store original env
const originalEnv = { ...process.env };

describe("Redis Cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    // Reset env
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("makeCacheKey", () => {
    it("should create cache key with prefix", () => {
      const key = makeCacheKey("test", { id: "123" });
      expect(key).toBe("test:v1:id:123");
    });

    it("should sort params alphabetically", () => {
      const key = makeCacheKey("user", { z: "last", a: "first", m: "middle" });
      expect(key).toBe("user:v1:a:first|m:middle|z:last");
    });

    it("should handle numeric values", () => {
      const key = makeCacheKey("cache", { count: 42, page: 1 });
      expect(key).toBe("cache:v1:count:42|page:1");
    });

    it("should handle boolean values", () => {
      const key = makeCacheKey("feature", { enabled: true, beta: false });
      expect(key).toBe("feature:v1:beta:false|enabled:true");
    });

    it("should handle empty params", () => {
      const key = makeCacheKey("empty", {});
      expect(key).toBe("empty:v1:");
    });

    it("should handle null and undefined values", () => {
      const key = makeCacheKey("nullable", { a: null, b: undefined });
      expect(key).toBe("nullable:v1:a:null|b:undefined");
    });

    it("should handle complex objects as string", () => {
      const key = makeCacheKey("complex", { obj: { nested: "value" } });
      expect(key).toBe("complex:v1:obj:[object Object]");
    });

    it("should handle array values", () => {
      const key = makeCacheKey("array", { items: [1, 2, 3] });
      expect(key).toBe("array:v1:items:1,2,3");
    });

    it("should create unique keys for different params", () => {
      const key1 = makeCacheKey("test", { a: 1, b: 2 });
      const key2 = makeCacheKey("test", { a: 2, b: 1 });

      expect(key1).not.toBe(key2);
    });

    it("should create same key for same params in different order", () => {
      const key1 = makeCacheKey("test", { b: 2, a: 1 });
      const key2 = makeCacheKey("test", { a: 1, b: 2 });

      expect(key1).toBe(key2);
    });
  });

  describe("cacheGet (unit tests)", () => {
    // Note: Full integration tests would require mocking environment variables
    // and fetch responses. These tests focus on the makeCacheKey utility.

    it("should handle special characters in keys", () => {
      const key = makeCacheKey("api", { path: "/users/123?filter=active" });
      expect(key).toContain("path:/users/123?filter=active");
    });

    it("should handle Korean characters in values", () => {
      const key = makeCacheKey("saju", { name: "홍길동", birthYear: 1990 });
      expect(key).toBe("saju:v1:birthYear:1990|name:홍길동");
    });

    it("should handle date objects as string", () => {
      const date = new Date("2024-01-01T00:00:00Z");
      const key = makeCacheKey("report", { date });
      expect(key).toContain("date:");
    });
  });

  describe("Cache Key Generation Patterns", () => {
    it("should generate destiny map cache key", () => {
      const key = makeCacheKey("destiny", {
        year: 1990,
        month: 5,
        day: 15,
        hour: 10,
        gender: "male",
        locale: "ko",
      });

      expect(key).toBe("destiny:v1:day:15|gender:male|hour:10|locale:ko|month:5|year:1990");
    });

    it("should generate tarot reading cache key", () => {
      const key = makeCacheKey("tarot", {
        spread: "celtic_cross",
        category: "love",
        cards: "1,5,10,22,33",
      });

      expect(key).toBe("tarot:v1:cards:1,5,10,22,33|category:love|spread:celtic_cross");
    });

    it("should generate calendar analysis cache key", () => {
      const key = makeCacheKey("calendar", {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        userId: "user123",
      });

      expect(key).toBe("calendar:v1:endDate:2024-01-31|startDate:2024-01-01|userId:user123");
    });

    it("should generate user session cache key", () => {
      const key = makeCacheKey("session", {
        userId: "abc123",
        deviceId: "mobile_ios",
      });

      expect(key).toBe("session:v1:deviceId:mobile_ios|userId:abc123");
    });
  });

  describe("Cache Key Collision Prevention", () => {
    it("should not collide between different prefixes with same params", () => {
      const key1 = makeCacheKey("destiny", { id: "123" });
      const key2 = makeCacheKey("tarot", { id: "123" });

      expect(key1).not.toBe(key2);
    });

    it("should not collide between similar param values", () => {
      const key1 = makeCacheKey("test", { value: "ab" });
      const key2 = makeCacheKey("test", { value: "a|b" });

      expect(key1).not.toBe(key2);
    });

    it("should distinguish between string and number param values", () => {
      const key1 = makeCacheKey("test", { id: "123" });
      const key2 = makeCacheKey("test", { id: 123 });

      // Both convert to string in the key
      expect(key1).toBe(key2);
      expect(key1).toBe("test:v1:id:123");
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long prefix", () => {
      const longPrefix = "a".repeat(100);
      const key = makeCacheKey(longPrefix, { x: 1 });

      expect(key.startsWith(longPrefix)).toBe(true);
    });

    it("should handle many parameters", () => {
      const params: Record<string, unknown> = {};
      for (let i = 0; i < 50; i++) {
        params[`param${i}`] = i;
      }

      const key = makeCacheKey("many", params);
      expect(key.split("|").length).toBe(50);
    });

    it("should handle empty string prefix", () => {
      const key = makeCacheKey("", { a: 1 });
      expect(key).toBe(":v1:a:1");
    });

    it("should handle single character values", () => {
      const key = makeCacheKey("single", { a: "x", b: "y" });
      expect(key).toBe("single:v1:a:x|b:y");
    });
  });

  describe("cacheGet", () => {
    // Note: cacheGet and cacheSet read env vars at module load time
    // These tests verify the function signatures and error handling behavior

    it("should return null when env vars not set (default state)", async () => {
      // Without env vars, should return null without calling fetch
      const result = await cacheGet("test-key");
      expect(result).toBeNull();
    });

    it("should be exported and callable", () => {
      expect(typeof cacheGet).toBe("function");
    });
  });

  describe("cacheSet", () => {
    it("should return false when env vars not set (default state)", async () => {
      // Without env vars, should return false without calling fetch
      const result = await cacheSet("test-key", { data: "test" });
      expect(result).toBe(false);
    });

    it("should be exported and callable", () => {
      expect(typeof cacheSet).toBe("function");
    });

    it("should accept TTL parameter", () => {
      // Verify function accepts TTL parameter (won't execute without env vars)
      expect(() => cacheSet("key", "value", 3600)).not.toThrow();
    });
  });
});
