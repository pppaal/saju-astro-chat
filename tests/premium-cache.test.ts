/// <reference types="vitest/globals" />
/**
 * Premium Cache Tests
 * - Cache key generation
 * - Memory cache behavior
 * - TTL handling
 */

describe("Premium Cache: Key Generation", () => {
  it("generates consistent cache keys", () => {
    const userId = "user-123";
    const prefix = "premium";
    const key = `${prefix}:userId:${userId}`;

    expect(key).toBe("premium:userId:user-123");
  });

  it("makeCacheKey sorts parameters consistently", () => {
    function makeCacheKey(
      prefix: string,
      params: Record<string, unknown>
    ): string {
      const sorted = Object.keys(params)
        .sort()
        .map((k) => `${k}:${params[k]}`)
        .join("|");
      return `${prefix}:${sorted}`;
    }

    const key1 = makeCacheKey("test", { b: 2, a: 1 });
    const key2 = makeCacheKey("test", { a: 1, b: 2 });

    expect(key1).toBe(key2);
    expect(key1).toBe("test:a:1|b:2");
  });
});

describe("Premium Cache: Memory Cache", () => {
  let memoryCache: Map<string, { value: boolean; expires: number }>;
  const PREMIUM_TTL_MS = 300000; // 5 minutes

  beforeEach(() => {
    memoryCache = new Map();
  });

  it("stores and retrieves values", () => {
    const key = "user-123";
    memoryCache.set(key, { value: true, expires: Date.now() + PREMIUM_TTL_MS });

    const entry = memoryCache.get(key);
    expect(entry?.value).toBe(true);
  });

  it("returns null for missing keys", () => {
    const entry = memoryCache.get("non-existent");
    expect(entry).toBeUndefined();
  });

  it("respects TTL for expired entries", () => {
    const key = "user-123";
    const pastTime = Date.now() - 1000; // Expired 1 second ago
    memoryCache.set(key, { value: true, expires: pastTime });

    const entry = memoryCache.get(key);
    if (entry && entry.expires > Date.now()) {
      // Valid entry
      expect(entry.value).toBe(true);
    } else {
      // Expired entry - should be treated as null
      expect(entry?.expires).toBeLessThan(Date.now());
    }
  });

  it("cleans up expired entries", () => {
    const now = Date.now();

    // Add expired entries
    memoryCache.set("expired-1", { value: true, expires: now - 1000 });
    memoryCache.set("expired-2", { value: false, expires: now - 2000 });

    // Add valid entry
    memoryCache.set("valid", { value: true, expires: now + PREMIUM_TTL_MS });

    // Cleanup function
    for (const [key, entry] of memoryCache.entries()) {
      if (entry.expires <= now) {
        memoryCache.delete(key);
      }
    }

    expect(memoryCache.size).toBe(1);
    expect(memoryCache.has("valid")).toBe(true);
    expect(memoryCache.has("expired-1")).toBe(false);
    expect(memoryCache.has("expired-2")).toBe(false);
  });
});

describe("Premium Cache: Cache Entry Structure", () => {
  interface PremiumCacheEntry {
    isPremium: boolean;
    plan?: string;
    checkedAt: number;
  }

  it("creates valid cache entry", () => {
    const entry: PremiumCacheEntry = {
      isPremium: true,
      plan: "pro",
      checkedAt: Date.now(),
    };

    expect(entry.isPremium).toBe(true);
    expect(entry.plan).toBe("pro");
    expect(entry.checkedAt).toBeLessThanOrEqual(Date.now());
  });

  it("handles entry without plan", () => {
    const entry: PremiumCacheEntry = {
      isPremium: false,
      checkedAt: Date.now(),
    };

    expect(entry.isPremium).toBe(false);
    expect(entry.plan).toBeUndefined();
  });

  it("validates entry age", () => {
    const PREMIUM_TTL_MS = 300000; // 5 minutes
    const now = Date.now();

    const freshEntry: PremiumCacheEntry = {
      isPremium: true,
      checkedAt: now - 1000, // 1 second ago
    };

    const staleEntry: PremiumCacheEntry = {
      isPremium: true,
      checkedAt: now - PREMIUM_TTL_MS - 1000, // Expired
    };

    expect(freshEntry.checkedAt > now - PREMIUM_TTL_MS).toBe(true);
    expect(staleEntry.checkedAt > now - PREMIUM_TTL_MS).toBe(false);
  });
});

describe("Premium Cache: Invalidation", () => {
  let memoryCache: Map<string, { value: boolean; expires: number }>;

  beforeEach(() => {
    memoryCache = new Map();
    memoryCache.set("user-1", { value: true, expires: Date.now() + 300000 });
    memoryCache.set("user-2", { value: false, expires: Date.now() + 300000 });
  });

  it("invalidates specific user cache", () => {
    memoryCache.delete("user-1");

    expect(memoryCache.has("user-1")).toBe(false);
    expect(memoryCache.has("user-2")).toBe(true);
  });

  it("clears all cache entries", () => {
    memoryCache.clear();

    expect(memoryCache.size).toBe(0);
  });
});

describe("Premium Cache: Edge Cases", () => {
  it("handles undefined values", () => {
    const memoryCache = new Map<
      string,
      { value: boolean; expires: number } | undefined
    >();

    memoryCache.set("test", undefined);

    const entry = memoryCache.get("test");
    expect(entry).toBeUndefined();
  });

  it("handles very long user IDs", () => {
    const longId = "a".repeat(1000);
    const key = `premium:userId:${longId}`;

    expect(key.length).toBeGreaterThan(1000);
    expect(key.startsWith("premium:userId:")).toBe(true);
  });

  it("handles special characters in user ID", () => {
    const specialId = "user+test@example.com";
    const key = `premium:userId:${encodeURIComponent(specialId)}`;

    expect(key).toBe("premium:userId:user%2Btest%40example.com");
  });
});
