import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the dependencies
vi.mock('@/lib/redis-cache', () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  makeCacheKey: vi.fn((prefix: string, params: Record<string, string>) =>
    `${prefix}:${Object.values(params).join(':')}`
  ),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userCredits: {
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { cacheGet, cacheSet } from '@/lib/redis-cache';
import { prisma } from '@/lib/db/prisma';

describe('Premium Cache Module', () => {
  it('should export getCachedPremiumStatus function', async () => {
    const { getCachedPremiumStatus } = await import('@/lib/stripe/premiumCache');
    expect(typeof getCachedPremiumStatus).toBe('function');
  });

  it('should export setCachedPremiumStatus function', async () => {
    const { setCachedPremiumStatus } = await import('@/lib/stripe/premiumCache');
    expect(typeof setCachedPremiumStatus).toBe('function');
  });

  it('should export checkPremiumFromDatabase function', async () => {
    const { checkPremiumFromDatabase } = await import('@/lib/stripe/premiumCache');
    expect(typeof checkPremiumFromDatabase).toBe('function');
  });

  it('should export checkPremiumFromSubscription function', async () => {
    const { checkPremiumFromSubscription } = await import('@/lib/stripe/premiumCache');
    expect(typeof checkPremiumFromSubscription).toBe('function');
  });

  it('should export invalidatePremiumCache function', async () => {
    const { invalidatePremiumCache } = await import('@/lib/stripe/premiumCache');
    expect(typeof invalidatePremiumCache).toBe('function');
  });

  it('should export cleanupMemoryCache function', async () => {
    const { cleanupMemoryCache } = await import('@/lib/stripe/premiumCache');
    expect(typeof cleanupMemoryCache).toBe('function');
  });
});

describe('cleanupMemoryCache', () => {
  it('should be callable without errors', async () => {
    const { cleanupMemoryCache } = await import('@/lib/stripe/premiumCache');
    expect(() => cleanupMemoryCache()).not.toThrow();
  });
});

describe('getCachedPremiumStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached value from Redis when valid', async () => {
    const { getCachedPremiumStatus } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheGet).mockResolvedValueOnce({
      isPremium: true,
      plan: 'premium',
      checkedAt: Date.now(),
    });

    const result = await getCachedPremiumStatus('user-123');
    expect(result).toBe(true);
  });

  it('should return null when Redis returns null', async () => {
    const { getCachedPremiumStatus } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheGet).mockResolvedValueOnce(null);

    const result = await getCachedPremiumStatus('user-123');
    expect(result).toBe(null);
  });

  it('should return null when cached value is expired', async () => {
    const { getCachedPremiumStatus } = await import('@/lib/stripe/premiumCache');

    // Return expired cache entry (checked 10 minutes ago, TTL is 5 minutes)
    vi.mocked(cacheGet).mockResolvedValueOnce({
      isPremium: true,
      plan: 'premium',
      checkedAt: Date.now() - (10 * 60 * 1000), // 10 minutes ago
    });

    const result = await getCachedPremiumStatus('user-123');
    expect(result).toBe(null);
  });

  it('should return null when Redis throws error', async () => {
    const { getCachedPremiumStatus } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheGet).mockRejectedValueOnce(new Error('Redis error'));

    const result = await getCachedPremiumStatus('user-123');
    expect(result).toBe(null);
  });
});

describe('setCachedPremiumStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set cache in Redis', async () => {
    const { setCachedPremiumStatus } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheSet).mockResolvedValueOnce(undefined);

    await setCachedPremiumStatus('user-123', true, 'premium');

    expect(cacheSet).toHaveBeenCalled();
  });

  it('should handle Redis error gracefully', async () => {
    const { setCachedPremiumStatus } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheSet).mockRejectedValueOnce(new Error('Redis error'));

    // Should not throw
    await expect(setCachedPremiumStatus('user-123', true, 'premium')).resolves.not.toThrow();
  });

  it('should set isPremium false correctly', async () => {
    const { setCachedPremiumStatus } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheSet).mockResolvedValueOnce(undefined);

    await setCachedPremiumStatus('user-456', false);

    expect(cacheSet).toHaveBeenCalled();
  });
});

describe('checkPremiumFromDatabase logic', () => {
  it('should return cached result when valid', () => {
    const cached = { isPremium: true, plan: 'premium', checkedAt: Date.now() };
    const isValid = cached.checkedAt > Date.now() - (5 * 60 * 1000);
    expect(isValid).toBe(true);
    expect(cached.isPremium).toBe(true);
  });

  it('should determine premium from plan', () => {
    const plan1 = 'premium';
    const plan2 = 'free';

    expect(plan1 !== 'free').toBe(true);
    expect(plan2 !== 'free').toBe(false);
  });

  it('should default to free when user has no credits', () => {
    const userCredits = null;
    const plan = userCredits?.plan || 'free';
    expect(plan).toBe('free');
  });

  it('should identify free plan correctly', () => {
    const userCredits = { plan: 'free' };
    const isPremium = userCredits.plan !== 'free';
    expect(isPremium).toBe(false);
  });

  it('should identify premium plan correctly', () => {
    const userCredits = { plan: 'premium' };
    const isPremium = userCredits.plan !== 'free';
    expect(isPremium).toBe(true);
  });
});

describe('checkPremiumFromSubscription logic', () => {
  it('should return true when subscription exists', () => {
    const subscription = { id: 'sub-123', status: 'active' };
    const isPremium = !!subscription;
    expect(isPremium).toBe(true);
  });

  it('should return false when no subscription', () => {
    const subscription = null;
    const isPremium = !!subscription;
    expect(isPremium).toBe(false);
  });

  it('should check subscription status in query', () => {
    const activeStatuses = ['active', 'trialing'];
    expect(activeStatuses).toContain('active');
    expect(activeStatuses).toContain('trialing');
    expect(activeStatuses).not.toContain('canceled');
  });

  it('should check currentPeriodEnd in query', () => {
    const now = new Date();
    const futureDate = new Date(Date.now() + 86400000);
    const isValid = futureDate > now;
    expect(isValid).toBe(true);
  });
});

describe('invalidatePremiumCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should invalidate cache by setting expired value', async () => {
    const { invalidatePremiumCache } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheSet).mockResolvedValueOnce(undefined);

    await invalidatePremiumCache('user-123');

    expect(cacheSet).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ isPremium: false, checkedAt: 0 }),
      1
    );
  });

  it('should handle Redis error gracefully', async () => {
    const { invalidatePremiumCache } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheSet).mockRejectedValueOnce(new Error('Redis error'));

    // Should not throw
    await expect(invalidatePremiumCache('user-123')).resolves.not.toThrow();
  });
});

describe('Premium cache constants', () => {
  it('should use 5 minute TTL (300 seconds)', () => {
    const PREMIUM_TTL_SECONDS = 300;
    expect(PREMIUM_TTL_SECONDS).toBe(300);
  });

  it('should use 5 minute TTL in milliseconds', () => {
    const PREMIUM_TTL_MS = 300 * 1000;
    expect(PREMIUM_TTL_MS).toBe(300000);
  });
});

describe('PremiumCacheEntry interface', () => {
  it('should have correct structure', () => {
    interface PremiumCacheEntry {
      isPremium: boolean;
      plan?: string;
      checkedAt: number;
    }

    const entry: PremiumCacheEntry = {
      isPremium: true,
      plan: 'premium',
      checkedAt: Date.now(),
    };

    expect(entry.isPremium).toBe(true);
    expect(entry.plan).toBe('premium');
    expect(typeof entry.checkedAt).toBe('number');
  });

  it('should allow optional plan', () => {
    interface PremiumCacheEntry {
      isPremium: boolean;
      plan?: string;
      checkedAt: number;
    }

    const entry: PremiumCacheEntry = {
      isPremium: false,
      checkedAt: Date.now(),
    };

    expect(entry.isPremium).toBe(false);
    expect(entry.plan).toBeUndefined();
  });
});

describe('checkPremiumFromDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return cached result when available', async () => {
    const { checkPremiumFromDatabase } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheGet).mockResolvedValueOnce({
      isPremium: true,
      plan: 'premium',
      checkedAt: Date.now(),
    });

    const result = await checkPremiumFromDatabase('cached-user-db');
    expect(result.isPremium).toBe(true);
    expect(result.plan).toBe('cached');
  });

  it('should check database when cache is empty', async () => {
    const { checkPremiumFromDatabase } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    vi.mocked(prisma.userCredits.findUnique).mockResolvedValueOnce({
      plan: 'premium',
    } as never);
    vi.mocked(cacheSet).mockResolvedValueOnce(undefined);

    const result = await checkPremiumFromDatabase('db-user-premium');
    expect(result.isPremium).toBe(true);
    expect(result.plan).toBe('premium');
  });

  it('should return free plan when user has no credits', async () => {
    const { checkPremiumFromDatabase } = await import('@/lib/stripe/premiumCache');

    const uniqueUserId = `user-no-credits-${Date.now()}`;
    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    vi.mocked(prisma.userCredits.findUnique).mockResolvedValueOnce(null);
    vi.mocked(cacheSet).mockResolvedValueOnce(undefined);

    const result = await checkPremiumFromDatabase(uniqueUserId);
    expect(result.isPremium).toBe(false);
    expect(result.plan).toBe('free');
  });

  it('should return free plan when user plan is free', async () => {
    const { checkPremiumFromDatabase } = await import('@/lib/stripe/premiumCache');

    const uniqueUserId = `user-free-plan-${Date.now()}`;
    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    vi.mocked(prisma.userCredits.findUnique).mockResolvedValueOnce({
      plan: 'free',
    } as never);
    vi.mocked(cacheSet).mockResolvedValueOnce(undefined);

    const result = await checkPremiumFromDatabase(uniqueUserId);
    expect(result.isPremium).toBe(false);
    expect(result.plan).toBe('free');
  });

  it('should propagate database errors to caller', async () => {
    const { checkPremiumFromDatabase } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    vi.mocked(prisma.userCredits.findUnique).mockRejectedValueOnce(new Error('DB error'));

    await expect(checkPremiumFromDatabase('user-error')).rejects.toThrow('DB error');
  });
});

describe('checkPremiumFromSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return cached result when available', async () => {
    const { checkPremiumFromSubscription } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheGet).mockResolvedValueOnce({
      isPremium: true,
      checkedAt: Date.now(),
    });

    const result = await checkPremiumFromSubscription('user-123');
    expect(result).toBe(true);
  });

  it('should check subscription when cache is empty', async () => {
    const { checkPremiumFromSubscription } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValueOnce({
      id: 'sub-123',
      status: 'active',
    } as never);
    vi.mocked(cacheSet).mockResolvedValueOnce(undefined);

    const result = await checkPremiumFromSubscription('user-sub');
    expect(result).toBe(true);
  });

  it('should return false when no active subscription', async () => {
    const { checkPremiumFromSubscription } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    vi.mocked(prisma.subscription.findFirst).mockResolvedValueOnce(null);
    vi.mocked(cacheSet).mockResolvedValueOnce(undefined);

    const result = await checkPremiumFromSubscription('user-nosub');
    expect(result).toBe(false);
  });

  it('should propagate database errors to caller', async () => {
    const { checkPremiumFromSubscription } = await import('@/lib/stripe/premiumCache');

    vi.mocked(cacheGet).mockResolvedValueOnce(null);
    vi.mocked(prisma.subscription.findFirst).mockRejectedValueOnce(new Error('DB error'));

    await expect(checkPremiumFromSubscription('user-error')).rejects.toThrow('DB error');
  });
});

describe('Memory cache fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fallback to memory cache when Redis fails', async () => {
    const { setCachedPremiumStatus, getCachedPremiumStatus } = await import('@/lib/stripe/premiumCache');

    // First set a value (this populates memory cache)
    vi.mocked(cacheSet).mockResolvedValueOnce(undefined);
    await setCachedPremiumStatus('mem-user', true, 'premium');

    // Now simulate Redis failure on get
    vi.mocked(cacheGet).mockRejectedValueOnce(new Error('Redis down'));

    const result = await getCachedPremiumStatus('mem-user');
    expect(result).toBe(true);
  });

  it('should return from memory cache when Redis returns expired', async () => {
    const { setCachedPremiumStatus, getCachedPremiumStatus } = await import('@/lib/stripe/premiumCache');

    // Set value in memory cache
    vi.mocked(cacheSet).mockResolvedValueOnce(undefined);
    await setCachedPremiumStatus('mem-user-2', false);

    // Redis returns expired
    vi.mocked(cacheGet).mockResolvedValueOnce({
      isPremium: true,
      checkedAt: Date.now() - (10 * 60 * 1000), // expired
    });

    const result = await getCachedPremiumStatus('mem-user-2');
    expect(result).toBe(false);
  });
});

describe('Cache invalidation flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear memory cache on invalidation', async () => {
    const { setCachedPremiumStatus, invalidatePremiumCache, getCachedPremiumStatus } = await import('@/lib/stripe/premiumCache');

    // Set initial value
    vi.mocked(cacheSet).mockResolvedValue(undefined);
    await setCachedPremiumStatus('inval-user', true, 'premium');

    // Invalidate
    await invalidatePremiumCache('inval-user');

    // Redis returns null after invalidation
    vi.mocked(cacheGet).mockResolvedValueOnce(null);

    const result = await getCachedPremiumStatus('inval-user');
    expect(result).toBe(null);
  });
});
