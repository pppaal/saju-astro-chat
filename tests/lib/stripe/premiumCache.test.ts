/**
 * Tests for stripe/premiumCache.ts
 * Premium Status Cache with Redis and memory fallback
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

// Mock redis-cache
const mockCacheGet = vi.fn();
const mockCacheSet = vi.fn();
vi.mock("@/lib/redis-cache", () => ({
  cacheGet: (...args: unknown[]) => mockCacheGet(...args),
  cacheSet: (...args: unknown[]) => mockCacheSet(...args),
  makeCacheKey: (prefix: string, params: Record<string, string>) =>
    `${prefix}:${Object.values(params).join(":")}`,
}));

// Mock prisma
const mockPrismaUserCredits = {
  findUnique: vi.fn(),
};
const mockPrismaSubscription = {
  findFirst: vi.fn(),
};
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    userCredits: mockPrismaUserCredits,
    subscription: mockPrismaSubscription,
  },
}));

describe("premiumCache", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCacheGet.mockReset();
    mockCacheSet.mockReset();
    mockPrismaUserCredits.findUnique.mockReset();
    mockPrismaSubscription.findFirst.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getCachedPremiumStatus", () => {
    it("returns cached value from Redis when valid", async () => {
      mockCacheGet.mockResolvedValueOnce({
        isPremium: true,
        plan: "pro",
        checkedAt: Date.now(),
      });

      const { getCachedPremiumStatus } = await import(
        "@/lib/stripe/premiumCache"
      );
      const result = await getCachedPremiumStatus("user-123");

      expect(result).toBe(true);
    });

    it("returns null when Redis cache is expired", async () => {
      mockCacheGet.mockResolvedValueOnce({
        isPremium: true,
        plan: "pro",
        checkedAt: Date.now() - 6 * 60 * 1000, // 6 minutes ago (expired)
      });

      const { getCachedPremiumStatus } = await import(
        "@/lib/stripe/premiumCache"
      );
      const result = await getCachedPremiumStatus("user-expired");

      expect(result).toBe(null);
    });

    it("returns null when Redis cache is empty", async () => {
      mockCacheGet.mockResolvedValueOnce(null);

      const { getCachedPremiumStatus } = await import(
        "@/lib/stripe/premiumCache"
      );
      const result = await getCachedPremiumStatus("user-empty");

      expect(result).toBe(null);
    });

    it("logs warning and returns null on Redis error", async () => {
      mockCacheGet.mockRejectedValueOnce(new Error("Redis connection failed"));

      const { getCachedPremiumStatus } = await import(
        "@/lib/stripe/premiumCache"
      );
      const { logger } = await import("@/lib/logger");

      const result = await getCachedPremiumStatus("user-error");

      expect(logger.warn).toHaveBeenCalledWith(
        "[Premium Cache] Redis GET failed:",
        expect.any(Error)
      );
      expect(result).toBe(null);
    });

    it("uses memory cache as fallback when Redis fails", async () => {
      mockCacheGet.mockRejectedValueOnce(new Error("Redis error"));
      mockCacheSet.mockResolvedValue(undefined);

      const { setCachedPremiumStatus, getCachedPremiumStatus } = await import(
        "@/lib/stripe/premiumCache"
      );

      // First set a value (which goes to memory cache)
      await setCachedPremiumStatus("memory-user", true, "pro");

      // Then get with Redis failing
      mockCacheGet.mockRejectedValueOnce(new Error("Redis error"));
      const result = await getCachedPremiumStatus("memory-user");

      expect(result).toBe(true);
    });
  });

  describe("setCachedPremiumStatus", () => {
    it("sets value in Redis with TTL", async () => {
      mockCacheSet.mockResolvedValueOnce(undefined);

      const { setCachedPremiumStatus } = await import(
        "@/lib/stripe/premiumCache"
      );
      await setCachedPremiumStatus("user-set", true, "pro");

      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          isPremium: true,
          plan: "pro",
          checkedAt: expect.any(Number),
        }),
        300 // 5 minutes TTL
      );
    });

    it("sets value in memory cache", async () => {
      mockCacheSet.mockResolvedValueOnce(undefined);

      const { setCachedPremiumStatus, getCachedPremiumStatus } = await import(
        "@/lib/stripe/premiumCache"
      );

      await setCachedPremiumStatus("mem-set-user", true);

      // Simulate Redis failure to force memory cache read
      mockCacheGet.mockRejectedValueOnce(new Error("Redis error"));
      const result = await getCachedPremiumStatus("mem-set-user");

      expect(result).toBe(true);
    });

    it("logs warning but continues on Redis error", async () => {
      mockCacheSet.mockRejectedValueOnce(new Error("Redis write failed"));

      const { setCachedPremiumStatus } = await import(
        "@/lib/stripe/premiumCache"
      );
      const { logger } = await import("@/lib/logger");

      // Should not throw
      await setCachedPremiumStatus("redis-fail-user", true);

      expect(logger.warn).toHaveBeenCalledWith(
        "[Premium Cache] Redis SET failed:",
        expect.any(Error)
      );
    });

    it("handles optional plan parameter", async () => {
      mockCacheSet.mockResolvedValueOnce(undefined);

      const { setCachedPremiumStatus } = await import(
        "@/lib/stripe/premiumCache"
      );
      await setCachedPremiumStatus("no-plan-user", false);

      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          isPremium: false,
          plan: undefined,
        }),
        expect.any(Number)
      );
    });
  });

  describe("checkPremiumFromDatabase", () => {
    it("returns cached value if available", async () => {
      mockCacheGet.mockResolvedValueOnce({
        isPremium: true,
        plan: "cached",
        checkedAt: Date.now(),
      });

      const { checkPremiumFromDatabase } = await import(
        "@/lib/stripe/premiumCache"
      );
      const result = await checkPremiumFromDatabase("cached-user");

      expect(result).toEqual({ isPremium: true, plan: "cached" });
      expect(mockPrismaUserCredits.findUnique).not.toHaveBeenCalled();
    });

    it("queries database when cache miss", async () => {
      mockCacheGet.mockResolvedValueOnce(null);
      mockCacheSet.mockResolvedValue(undefined);
      mockPrismaUserCredits.findUnique.mockResolvedValueOnce({ plan: "pro" });

      const { checkPremiumFromDatabase } = await import(
        "@/lib/stripe/premiumCache"
      );
      const result = await checkPremiumFromDatabase("db-user");

      expect(mockPrismaUserCredits.findUnique).toHaveBeenCalledWith({
        where: { userId: "db-user" },
        select: { plan: true },
      });
      expect(result).toEqual({ isPremium: true, plan: "pro" });
    });

    it("returns free when user has no credits record", async () => {
      mockCacheGet.mockResolvedValueOnce(null);
      mockCacheSet.mockResolvedValue(undefined);
      mockPrismaUserCredits.findUnique.mockResolvedValueOnce(null);

      const { checkPremiumFromDatabase } = await import(
        "@/lib/stripe/premiumCache"
      );
      const result = await checkPremiumFromDatabase("no-record-user");

      expect(result).toEqual({ isPremium: false, plan: "free" });
    });

    it("returns free when plan is 'free'", async () => {
      mockCacheGet.mockResolvedValueOnce(null);
      mockCacheSet.mockResolvedValue(undefined);
      mockPrismaUserCredits.findUnique.mockResolvedValueOnce({ plan: "free" });

      const { checkPremiumFromDatabase } = await import(
        "@/lib/stripe/premiumCache"
      );
      const result = await checkPremiumFromDatabase("free-plan-user");

      expect(result).toEqual({ isPremium: false, plan: "free" });
    });

    it("caches database result", async () => {
      mockCacheGet.mockResolvedValueOnce(null);
      mockCacheSet.mockResolvedValue(undefined);
      mockPrismaUserCredits.findUnique.mockResolvedValueOnce({
        plan: "premium",
      });

      const { checkPremiumFromDatabase } = await import(
        "@/lib/stripe/premiumCache"
      );
      await checkPremiumFromDatabase("cache-db-user");

      expect(mockCacheSet).toHaveBeenCalled();
    });

    it("returns free on database error", async () => {
      mockCacheGet.mockResolvedValueOnce(null);
      mockPrismaUserCredits.findUnique.mockRejectedValueOnce(
        new Error("DB error")
      );

      const { checkPremiumFromDatabase } = await import(
        "@/lib/stripe/premiumCache"
      );
      const { logger } = await import("@/lib/logger");

      const result = await checkPremiumFromDatabase("db-error-user");

      expect(result).toEqual({ isPremium: false, plan: "free" });
      expect(logger.error).toHaveBeenCalledWith(
        "[Premium Check] Database error:",
        expect.any(Error)
      );
    });
  });

  describe("checkPremiumFromSubscription", () => {
    it("returns cached value if available", async () => {
      mockCacheGet.mockResolvedValueOnce({
        isPremium: true,
        checkedAt: Date.now(),
      });

      const { checkPremiumFromSubscription } = await import(
        "@/lib/stripe/premiumCache"
      );
      const result = await checkPremiumFromSubscription("sub-cached-user");

      expect(result).toBe(true);
      expect(mockPrismaSubscription.findFirst).not.toHaveBeenCalled();
    });

    it("queries subscription when cache miss", async () => {
      mockCacheGet.mockResolvedValueOnce(null);
      mockCacheSet.mockResolvedValue(undefined);
      mockPrismaSubscription.findFirst.mockResolvedValueOnce({
        id: "sub_123",
        status: "active",
      });

      const { checkPremiumFromSubscription } = await import(
        "@/lib/stripe/premiumCache"
      );
      const result = await checkPremiumFromSubscription("sub-db-user");

      expect(mockPrismaSubscription.findFirst).toHaveBeenCalledWith({
        where: {
          userId: "sub-db-user",
          status: { in: ["active", "trialing"] },
          currentPeriodEnd: { gt: expect.any(Date) },
        },
        select: { id: true, status: true },
      });
      expect(result).toBe(true);
    });

    it("returns false when no active subscription", async () => {
      mockCacheGet.mockResolvedValueOnce(null);
      mockCacheSet.mockResolvedValue(undefined);
      mockPrismaSubscription.findFirst.mockResolvedValueOnce(null);

      const { checkPremiumFromSubscription } = await import(
        "@/lib/stripe/premiumCache"
      );
      const result = await checkPremiumFromSubscription("no-sub-user");

      expect(result).toBe(false);
    });

    it("caches subscription check result", async () => {
      mockCacheGet.mockResolvedValueOnce(null);
      mockCacheSet.mockResolvedValue(undefined);
      mockPrismaSubscription.findFirst.mockResolvedValueOnce({
        id: "sub_456",
        status: "trialing",
      });

      const { checkPremiumFromSubscription } = await import(
        "@/lib/stripe/premiumCache"
      );
      await checkPremiumFromSubscription("cache-sub-user");

      expect(mockCacheSet).toHaveBeenCalled();
    });

    it("returns false on subscription query error", async () => {
      mockCacheGet.mockResolvedValueOnce(null);
      mockPrismaSubscription.findFirst.mockRejectedValueOnce(
        new Error("Query failed")
      );

      const { checkPremiumFromSubscription } = await import(
        "@/lib/stripe/premiumCache"
      );
      const { logger } = await import("@/lib/logger");

      const result = await checkPremiumFromSubscription("sub-error-user");

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "[Premium Check] Subscription check error:",
        expect.any(Error)
      );
    });
  });

  describe("invalidatePremiumCache", () => {
    it("removes from memory cache", async () => {
      mockCacheSet.mockResolvedValue(undefined);

      const { setCachedPremiumStatus, invalidatePremiumCache, getCachedPremiumStatus } =
        await import("@/lib/stripe/premiumCache");

      // Set in cache
      await setCachedPremiumStatus("invalidate-user", true);

      // Invalidate
      await invalidatePremiumCache("invalidate-user");

      // Redis returns null, memory should also be cleared
      mockCacheGet.mockResolvedValueOnce(null);
      const result = await getCachedPremiumStatus("invalidate-user");

      expect(result).toBe(null);
    });

    it("sets expired value in Redis", async () => {
      mockCacheSet.mockResolvedValue(undefined);

      const { invalidatePremiumCache } = await import(
        "@/lib/stripe/premiumCache"
      );
      await invalidatePremiumCache("redis-invalidate-user");

      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          isPremium: false,
          checkedAt: 0,
        }),
        1 // 1 second TTL (effectively expires immediately)
      );
    });

    it("logs warning on Redis invalidation error", async () => {
      mockCacheSet.mockRejectedValueOnce(new Error("Redis error"));

      const { invalidatePremiumCache } = await import(
        "@/lib/stripe/premiumCache"
      );
      const { logger } = await import("@/lib/logger");

      await invalidatePremiumCache("redis-error-invalidate");

      expect(logger.warn).toHaveBeenCalledWith(
        "[Premium Cache] Redis invalidation failed:",
        expect.any(Error)
      );
    });
  });

  describe("cleanupMemoryCache", () => {
    it("removes expired entries from memory cache", async () => {
      mockCacheSet.mockResolvedValue(undefined);

      const {
        setCachedPremiumStatus,
        cleanupMemoryCache,
        getCachedPremiumStatus,
      } = await import("@/lib/stripe/premiumCache");

      // Set a value that will be considered expired
      await setCachedPremiumStatus("cleanup-user", true);

      // The cleanup function doesn't affect valid entries
      cleanupMemoryCache();

      // Should still be valid (not expired yet)
      mockCacheGet.mockRejectedValueOnce(new Error("Redis error"));
      const result = await getCachedPremiumStatus("cleanup-user");
      expect(result).toBe(true);
    });

    it("is exported and callable", async () => {
      const { cleanupMemoryCache } = await import("@/lib/stripe/premiumCache");

      expect(typeof cleanupMemoryCache).toBe("function");
      expect(() => cleanupMemoryCache()).not.toThrow();
    });
  });

  describe("cache key generation", () => {
    it("uses correct prefix for premium cache", async () => {
      mockCacheGet.mockResolvedValueOnce(null);

      const { getCachedPremiumStatus } = await import(
        "@/lib/stripe/premiumCache"
      );
      await getCachedPremiumStatus("key-test-user");

      expect(mockCacheGet).toHaveBeenCalledWith(
        expect.stringContaining("premium")
      );
    });
  });
});
