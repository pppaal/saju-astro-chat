/**
 * Tests for redis-cache.ts
 * Simple Redis cache using Upstash REST API
 */

import { vi, beforeEach, afterEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("redis-cache", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("cacheGet", () => {
    it("returns null when UPSTASH_URL is not set", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      const { cacheGet } = await import("@/lib/redis-cache");

      const result = await cacheGet("test-key");
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns null when UPSTASH_TOKEN is not set", async () => {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      const { cacheGet } = await import("@/lib/redis-cache");

      const result = await cacheGet("test-key");
      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("calls Upstash REST API with correct URL and headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: JSON.stringify({ data: "test" }) }),
      });

      const { cacheGet } = await import("@/lib/redis-cache");
      await cacheGet("my-key");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://redis.upstash.io/get/my-key",
        expect.objectContaining({
          headers: { Authorization: "Bearer test-token" },
          cache: "no-store",
        })
      );
    });

    it("URL encodes the key", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: JSON.stringify({ data: "test" }) }),
      });

      const { cacheGet } = await import("@/lib/redis-cache");
      await cacheGet("key with spaces");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("key%20with%20spaces"),
        expect.any(Object)
      );
    });

    it("returns null when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { cacheGet } = await import("@/lib/redis-cache");
      const result = await cacheGet("test-key");

      expect(result).toBeNull();
    });

    it("returns null when result is empty", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: null }),
      });

      const { cacheGet } = await import("@/lib/redis-cache");
      const result = await cacheGet("test-key");

      expect(result).toBeNull();
    });

    it("parses and returns JSON data", async () => {
      const cachedData = { name: "John", age: 30 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: JSON.stringify(cachedData) }),
      });

      const { cacheGet } = await import("@/lib/redis-cache");
      const result = await cacheGet<typeof cachedData>("test-key");

      expect(result).toEqual(cachedData);
    });

    it("handles legacy format with value and ex fields", async () => {
      const actualData = { name: "John" };
      const legacyFormat = { value: JSON.stringify(actualData), ex: 3600 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: JSON.stringify(legacyFormat) }),
      });

      const { cacheGet } = await import("@/lib/redis-cache");
      const { logger } = await import("@/lib/logger");
      const result = await cacheGet("test-key");

      expect(result).toEqual(actualData);
      expect(logger.debug).toHaveBeenCalledWith("[Redis Cache] Converting legacy cache format");
    });

    it("handles legacy format with non-string value", async () => {
      const actualData = { name: "John" };
      const legacyFormat = { value: actualData, ex: 3600 };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: JSON.stringify(legacyFormat) }),
      });

      const { cacheGet } = await import("@/lib/redis-cache");
      const result = await cacheGet("test-key");

      expect(result).toEqual(actualData);
    });

    it("returns null and logs error on fetch failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { cacheGet } = await import("@/lib/redis-cache");
      const { logger } = await import("@/lib/logger");
      const result = await cacheGet("test-key");

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "[Redis Cache] GET error:",
        expect.any(Error)
      );
    });

    it("returns null on JSON parse error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: "invalid json {" }),
      });

      const { cacheGet } = await import("@/lib/redis-cache");
      const { logger } = await import("@/lib/logger");
      const result = await cacheGet("test-key");

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("cacheSet", () => {
    it("returns false when UPSTASH_URL is not set", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      const { cacheSet } = await import("@/lib/redis-cache");

      const result = await cacheSet("test-key", { data: "test" });
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns false when UPSTASH_TOKEN is not set", async () => {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      const { cacheSet } = await import("@/lib/redis-cache");

      const result = await cacheSet("test-key", { data: "test" });
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("calls Upstash pipeline API with correct format", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { cacheSet } = await import("@/lib/redis-cache");
      await cacheSet("my-key", { name: "test" }, 3600);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://redis.upstash.io/pipeline",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          },
          cache: "no-store",
        })
      );
    });

    it("uses SET command with EX (expiry) option", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { cacheSet } = await import("@/lib/redis-cache");
      const data = { name: "test" };
      await cacheSet("my-key", data, 3600);

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body).toEqual([
        ["SET", "my-key", JSON.stringify(data), "EX", 3600],
      ]);
    });

    it("uses default TTL of 86400 seconds (24 hours)", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { cacheSet } = await import("@/lib/redis-cache");
      await cacheSet("my-key", { data: "test" });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body[0][4]).toBe(86400);
    });

    it("returns true on successful set", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { cacheSet } = await import("@/lib/redis-cache");
      const result = await cacheSet("my-key", { data: "test" });

      expect(result).toBe(true);
    });

    it("returns false when response is not ok", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const { cacheSet } = await import("@/lib/redis-cache");
      const result = await cacheSet("my-key", { data: "test" });

      expect(result).toBe(false);
    });

    it("returns false and logs error on fetch failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { cacheSet } = await import("@/lib/redis-cache");
      const { logger } = await import("@/lib/logger");
      const result = await cacheSet("my-key", { data: "test" });

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "[Redis Cache] SET error:",
        expect.any(Error)
      );
    });

    it("serializes complex objects correctly", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { cacheSet } = await import("@/lib/redis-cache");
      const complexData = {
        nested: { deep: { value: [1, 2, 3] } },
        date: "2024-01-01",
        nullValue: null,
      };
      await cacheSet("my-key", complexData);

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);
      const serializedValue = body[0][2];

      expect(JSON.parse(serializedValue)).toEqual(complexData);
    });
  });

  describe("makeCacheKey", () => {
    it("creates key with prefix and sorted params", async () => {
      const { makeCacheKey } = await import("@/lib/redis-cache");

      const key = makeCacheKey("user", { id: 123, name: "John" });

      expect(key).toBe("user:id:123|name:John");
    });

    it("sorts params alphabetically", async () => {
      const { makeCacheKey } = await import("@/lib/redis-cache");

      const key = makeCacheKey("cache", { z: 1, a: 2, m: 3 });

      expect(key).toBe("cache:a:2|m:3|z:1");
    });

    it("handles empty params", async () => {
      const { makeCacheKey } = await import("@/lib/redis-cache");

      const key = makeCacheKey("prefix", {});

      expect(key).toBe("prefix:");
    });

    it("handles single param", async () => {
      const { makeCacheKey } = await import("@/lib/redis-cache");

      const key = makeCacheKey("single", { only: "one" });

      expect(key).toBe("single:only:one");
    });

    it("handles various value types", async () => {
      const { makeCacheKey } = await import("@/lib/redis-cache");

      const key = makeCacheKey("mixed", {
        str: "hello",
        num: 42,
        bool: true,
        nil: null,
      });

      expect(key).toBe("mixed:bool:true|nil:null|num:42|str:hello");
    });

    it("handles special characters in values", async () => {
      const { makeCacheKey } = await import("@/lib/redis-cache");

      const key = makeCacheKey("special", {
        path: "/api/test",
        query: "a=1&b=2",
      });

      expect(key).toBe("special:path:/api/test|query:a=1&b=2");
    });
  });
});
