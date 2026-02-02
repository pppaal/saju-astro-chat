/**
 * Premium Status Cache
 * Uses Redis (Upstash) for distributed caching of premium status
 * Falls back to in-memory cache when Redis is unavailable
 */

import { cacheGet, cacheSet, makeCacheKey } from "@/lib/redis-cache";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

// In-memory fallback cache
const memoryCache = new Map<string, { value: boolean; expires: number }>();
const PREMIUM_TTL_SECONDS = 300; // 5 minutes
const PREMIUM_TTL_MS = PREMIUM_TTL_SECONDS * 1000;

interface PremiumCacheEntry {
  isPremium: boolean;
  plan?: string;
  checkedAt: number;
}

/**
 * Get premium status from cache (Redis first, then memory)
 */
export async function getCachedPremiumStatus(
  userId: string
): Promise<boolean | null> {
  const cacheKey = makeCacheKey("premium", { userId });

  // Try Redis first
  try {
    const cached = await cacheGet<PremiumCacheEntry>(cacheKey);
    if (cached && cached.checkedAt > Date.now() - PREMIUM_TTL_MS) {
      return cached.isPremium;
    }
  } catch (err) {
    logger.warn("[Premium Cache] Redis GET failed:", err);
  }

  // Fallback to memory cache
  const memEntry = memoryCache.get(userId);
  if (memEntry && memEntry.expires > Date.now()) {
    return memEntry.value;
  }

  return null;
}

/**
 * Set premium status in cache (both Redis and memory)
 */
export async function setCachedPremiumStatus(
  userId: string,
  isPremium: boolean,
  plan?: string
): Promise<void> {
  const cacheKey = makeCacheKey("premium", { userId });
  const entry: PremiumCacheEntry = {
    isPremium,
    plan,
    checkedAt: Date.now(),
  };

  // Set in Redis
  try {
    await cacheSet(cacheKey, entry, PREMIUM_TTL_SECONDS);
  } catch (err) {
    logger.warn("[Premium Cache] Redis SET failed:", err);
  }

  // Also set in memory cache as fallback
  memoryCache.set(userId, {
    value: isPremium,
    expires: Date.now() + PREMIUM_TTL_MS,
  });
}

/**
 * Check premium status from database (preferred method)
 * Uses userCredits table which is more reliable than Stripe API
 */
export async function checkPremiumFromDatabase(
  userId: string
): Promise<{ isPremium: boolean; plan: string }> {
  // Check cache first
  const cached = await getCachedPremiumStatus(userId);
  if (cached !== null) {
    return { isPremium: cached, plan: cached ? "cached" : "free" };
  }

  // DB errors propagate to caller (API middleware) instead of silently
  // returning isPremium:false, which would lock premium users out.
  const userCredits = await prisma.userCredits.findUnique({
    where: { userId },
    select: { plan: true },
  });

  const plan = userCredits?.plan || "free";
  const isPremium = plan !== "free";

  // Cache the result (cache failures are non-fatal)
  await setCachedPremiumStatus(userId, isPremium, plan);

  return { isPremium, plan };
}

/**
 * Check premium status from active subscription
 * More reliable than Stripe API, uses local database
 */
export async function checkPremiumFromSubscription(
  userId: string
): Promise<boolean> {
  // Check cache first
  const cached = await getCachedPremiumStatus(userId);
  if (cached !== null) {
    return cached;
  }

  // DB errors propagate to caller instead of returning false.
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "trialing"] },
      currentPeriodEnd: { gt: new Date() },
    },
    select: { id: true, status: true },
  });

  const isPremium = !!subscription;

  // Cache the result (cache failures are non-fatal)
  await setCachedPremiumStatus(userId, isPremium);

  return isPremium;
}

/**
 * Invalidate premium cache for a user
 * Call this when subscription status changes
 */
export async function invalidatePremiumCache(userId: string): Promise<void> {
  const cacheKey = makeCacheKey("premium", { userId });

  // Remove from memory cache
  memoryCache.delete(userId);

  // Invalidate in Redis by setting expired value
  try {
    await cacheSet(cacheKey, { isPremium: false, checkedAt: 0 }, 1);
  } catch (err) {
    logger.warn("[Premium Cache] Redis invalidation failed:", err);
  }
}

/**
 * Clean up expired entries from memory cache
 * Call periodically to prevent memory leaks
 */
export function cleanupMemoryCache(): void {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expires <= now) {
      memoryCache.delete(key);
    }
  }
}

// Run cleanup every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupMemoryCache, 10 * 60 * 1000);
}
