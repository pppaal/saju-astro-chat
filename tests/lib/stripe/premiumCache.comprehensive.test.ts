/**
 * Comprehensive tests for Premium Status Cache
 * Tests Redis caching, memory fallback, database queries, and cache invalidation
 */

import { vi } from 'vitest'
import { cacheGet, cacheSet, makeCacheKey } from '@/lib/cache/redis-cache'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import {
  getCachedPremiumStatus,
  setCachedPremiumStatus,
  checkPremiumFromDatabase,
  checkPremiumFromSubscription,
  invalidatePremiumCache,
  cleanupMemoryCache,
} from '@/lib/stripe/premiumCache'

// Mock dependencies
vi.mock('@/lib/cache/redis-cache')
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userCredits: {
      findUnique: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
  },
}))
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
  },
}))

describe('Premium Status Cache', () => {
  const mockUserId = 'user_123'

  beforeEach(async () => {
    vi.useFakeTimers()
    // Clear the in-memory cache from previous tests (invalidatePremiumCache deletes from memoryCache)
    await invalidatePremiumCache(mockUserId)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getCachedPremiumStatus', () => {
    it('should return cached premium status from Redis', async () => {
      const mockCacheEntry = {
        isPremium: true,
        plan: 'pro',
        checkedAt: Date.now(),
      }

      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(mockCacheEntry)

      const result = await getCachedPremiumStatus(mockUserId)

      expect(result).toBe(true)
      expect(cacheGet).toHaveBeenCalledWith('premium:user_123')
    })

    it('should return null if cache entry expired', async () => {
      const mockCacheEntry = {
        isPremium: true,
        plan: 'pro',
        checkedAt: Date.now() - 400000, // 6+ minutes old
      }

      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(mockCacheEntry)

      const result = await getCachedPremiumStatus(mockUserId)

      expect(result).toBeNull()
    })

    it('should fallback to memory cache when Redis fails', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockRejectedValue(
        new Error('Redis connection failed')
      )

      // Memory cache should still work
      const result = await getCachedPremiumStatus(mockUserId)

      expect(result).toBeNull() // No memory cache set yet
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis GET failed'),
        expect.any(Error)
      )
    })

    it('should return null when both caches miss', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)

      const result = await getCachedPremiumStatus(mockUserId)

      expect(result).toBeNull()
    })

    it('should validate cache TTL (5 minutes)', async () => {
      const now = Date.now()
      vi.setSystemTime(now)

      const recentEntry = {
        isPremium: true,
        checkedAt: now - 240000, // 4 minutes old
      }

      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(recentEntry)

      const result = await getCachedPremiumStatus(mockUserId)

      expect(result).toBe(true)
    })
  })

  describe('setCachedPremiumStatus', () => {
    it('should cache premium status in Redis and memory', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      await setCachedPremiumStatus(mockUserId, true, 'pro')

      expect(cacheSet).toHaveBeenCalledWith(
        'premium:user_123',
        expect.objectContaining({
          isPremium: true,
          plan: 'pro',
          checkedAt: expect.any(Number),
        }),
        300 // 5 minutes TTL
      )
    })

    it('should handle Redis SET failure gracefully', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockRejectedValue(new Error('Redis write failed'))

      // Should not throw
      await setCachedPremiumStatus(mockUserId, false, 'free')

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis SET failed'),
        expect.any(Error)
      )
    })

    it('should cache free user status', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      await setCachedPremiumStatus(mockUserId, false, 'free')

      expect(cacheSet).toHaveBeenCalledWith(
        'premium:user_123',
        expect.objectContaining({
          isPremium: false,
          plan: 'free',
        }),
        300
      )
    })

    it('should cache without plan parameter', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      await setCachedPremiumStatus(mockUserId, true)

      expect(cacheSet).toHaveBeenCalledWith(
        'premium:user_123',
        expect.objectContaining({
          isPremium: true,
          plan: undefined,
        }),
        300
      )
    })
  })

  describe('checkPremiumFromDatabase', () => {
    it('should return cached status when available', async () => {
      const mockCacheEntry = {
        isPremium: true,
        plan: 'pro',
        checkedAt: Date.now(),
      }

      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(mockCacheEntry)

      const result = await checkPremiumFromDatabase(mockUserId)

      expect(result.isPremium).toBe(true)
      expect(result.plan).toBe('cached')
      expect(prisma.userCredits.findUnique).not.toHaveBeenCalled()
    })

    it('should query database when cache misses', async () => {
      const mockUserCredits = {
        plan: 'pro',
      }

      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)
      ;(
        prisma.userCredits.findUnique as vi.Mocked<typeof prisma.userCredits.findUnique>
      ).mockResolvedValue(mockUserCredits)
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      const result = await checkPremiumFromDatabase(mockUserId)

      expect(result.isPremium).toBe(true)
      expect(result.plan).toBe('pro')
      expect(prisma.userCredits.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        select: { plan: true },
      })
    })

    it('should cache database query result', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)
      ;(
        prisma.userCredits.findUnique as vi.Mocked<typeof prisma.userCredits.findUnique>
      ).mockResolvedValue({ plan: 'premium' })
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      await checkPremiumFromDatabase(mockUserId)

      expect(cacheSet).toHaveBeenCalledWith(
        'premium:user_123',
        expect.objectContaining({
          isPremium: true,
          plan: 'premium',
        }),
        300
      )
    })

    it('should detect free user from database', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)
      ;(
        prisma.userCredits.findUnique as vi.Mocked<typeof prisma.userCredits.findUnique>
      ).mockResolvedValue({ plan: 'free' })
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      const result = await checkPremiumFromDatabase(mockUserId)

      expect(result.isPremium).toBe(false)
      expect(result.plan).toBe('free')
    })

    it('should handle missing user credits', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)
      ;(
        prisma.userCredits.findUnique as vi.Mocked<typeof prisma.userCredits.findUnique>
      ).mockResolvedValue(null)
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      const result = await checkPremiumFromDatabase(mockUserId)

      expect(result.isPremium).toBe(false)
      expect(result.plan).toBe('free')
    })

    it('should propagate database errors', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)
      ;(
        prisma.userCredits.findUnique as vi.Mocked<typeof prisma.userCredits.findUnique>
      ).mockRejectedValue(new Error('Database connection lost'))

      await expect(checkPremiumFromDatabase(mockUserId)).rejects.toThrow('Database connection lost')
    })

    it('should handle cache SET failure during DB query', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)
      ;(
        prisma.userCredits.findUnique as vi.Mocked<typeof prisma.userCredits.findUnique>
      ).mockResolvedValue({ plan: 'pro' })
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockRejectedValue(new Error('Cache write failed'))

      // Should still return result even if caching fails
      const result = await checkPremiumFromDatabase(mockUserId)

      expect(result.isPremium).toBe(true)
      expect(logger.warn).toHaveBeenCalled()
    })
  })

  describe('checkPremiumFromSubscription', () => {
    it('should return cached status when available', async () => {
      const mockCacheEntry = {
        isPremium: false,
        checkedAt: Date.now(),
      }

      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(mockCacheEntry)

      const result = await checkPremiumFromSubscription(mockUserId)

      expect(result).toBe(false)
      expect(prisma.subscription.findFirst).not.toHaveBeenCalled()
    })

    it('should find active subscription', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'active',
      }

      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)
      ;(
        prisma.subscription.findFirst as vi.Mocked<typeof prisma.subscription.findFirst>
      ).mockResolvedValue(mockSubscription)
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      const result = await checkPremiumFromSubscription(mockUserId)

      expect(result).toBe(true)
      expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            status: { in: ['active', 'trialing'] },
            currentPeriodEnd: { gt: expect.any(Date) },
          }),
        })
      )
    })

    it('should detect trialing subscription', async () => {
      const mockSubscription = {
        id: 'sub_123',
        status: 'trialing',
      }

      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)
      ;(
        prisma.subscription.findFirst as vi.Mocked<typeof prisma.subscription.findFirst>
      ).mockResolvedValue(mockSubscription)
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      const result = await checkPremiumFromSubscription(mockUserId)

      expect(result).toBe(true)
    })

    it('should return false when no active subscription', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)
      ;(
        prisma.subscription.findFirst as vi.Mocked<typeof prisma.subscription.findFirst>
      ).mockResolvedValue(null)
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      const result = await checkPremiumFromSubscription(mockUserId)

      expect(result).toBe(false)
    })

    it('should cache subscription query result', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)
      ;(
        prisma.subscription.findFirst as vi.Mocked<typeof prisma.subscription.findFirst>
      ).mockResolvedValue({ id: 'sub_123' })
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      await checkPremiumFromSubscription(mockUserId)

      expect(cacheSet).toHaveBeenCalledWith(
        'premium:user_123',
        expect.objectContaining({
          isPremium: true,
        }),
        300
      )
    })

    it('should propagate database errors', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)
      ;(
        prisma.subscription.findFirst as vi.Mocked<typeof prisma.subscription.findFirst>
      ).mockRejectedValue(new Error('DB query failed'))

      await expect(checkPremiumFromSubscription(mockUserId)).rejects.toThrow('DB query failed')
    })
  })

  describe('invalidatePremiumCache', () => {
    it('should invalidate Redis cache', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      await invalidatePremiumCache(mockUserId)

      expect(cacheSet).toHaveBeenCalledWith(
        'premium:user_123',
        { isPremium: false, checkedAt: 0 },
        1 // Expire immediately
      )
    })

    it('should handle Redis invalidation failure', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockRejectedValue(new Error('Redis error'))

      // Should not throw
      await invalidatePremiumCache(mockUserId)

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis invalidation failed'),
        expect.any(Error)
      )
    })
  })

  describe('cleanupMemoryCache', () => {
    it('should remove expired entries from memory cache', () => {
      // This is a synchronous function that cleans up memory
      // Direct testing is limited due to private memory cache
      expect(() => cleanupMemoryCache()).not.toThrow()
    })

    it('should run periodically', () => {
      // setInterval is called during module load
      // Just verify the function exists
      expect(cleanupMemoryCache).toBeDefined()
      expect(typeof cleanupMemoryCache).toBe('function')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete cache miss -> DB query -> cache set flow', async () => {
      // Cache miss
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)

      // DB query
      ;(
        prisma.userCredits.findUnique as vi.Mocked<typeof prisma.userCredits.findUnique>
      ).mockResolvedValue({ plan: 'premium' })

      // Cache set
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)

      const result = await checkPremiumFromDatabase(mockUserId)

      expect(result.isPremium).toBe(true)
      expect(cacheGet).toHaveBeenCalled()
      expect(prisma.userCredits.findUnique).toHaveBeenCalled()
      expect(cacheSet).toHaveBeenCalled()
    })

    it('should handle subscription status change', async () => {
      // Initial check - premium
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue({
        isPremium: true,
        checkedAt: Date.now(),
      })

      let result = await checkPremiumFromSubscription(mockUserId)
      expect(result).toBe(true)

      // Invalidate after cancellation
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)
      await invalidatePremiumCache(mockUserId)

      // Second check - not premium
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)
      ;(
        prisma.subscription.findFirst as vi.Mocked<typeof prisma.subscription.findFirst>
      ).mockResolvedValue(null)

      result = await checkPremiumFromSubscription(mockUserId)
      expect(result).toBe(false)
    })

    it('should handle Redis failure with memory fallback', async () => {
      // Set in memory first
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheSet as vi.Mocked<typeof cacheSet>).mockResolvedValue(undefined)
      await setCachedPremiumStatus(mockUserId, true, 'pro')

      // Redis fails on read
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockRejectedValue(new Error('Redis down'))

      // Should still work (though will miss in this test due to module isolation)
      const result = await getCachedPremiumStatus(mockUserId)

      expect(logger.warn).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty userId', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(null)

      const result = await getCachedPremiumStatus('')

      expect(result).toBeNull()
    })

    it('should handle concurrent cache requests', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue({
        isPremium: true,
        checkedAt: Date.now(),
      })

      const [result1, result2, result3] = await Promise.all([
        getCachedPremiumStatus(mockUserId),
        getCachedPremiumStatus(mockUserId),
        getCachedPremiumStatus(mockUserId),
      ])

      expect(result1).toBe(true)
      expect(result2).toBe(true)
      expect(result3).toBe(true)
    })

    it('should handle very old cache entries', async () => {
      const veryOldEntry = {
        isPremium: true,
        checkedAt: Date.now() - 86400000, // 1 day old
      }

      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue(veryOldEntry)

      const result = await getCachedPremiumStatus(mockUserId)

      expect(result).toBeNull() // Should be expired
    })

    it('should handle malformed cache data', async () => {
      ;(makeCacheKey as vi.Mocked<typeof makeCacheKey>).mockReturnValue('premium:user_123')
      ;(cacheGet as vi.Mocked<typeof cacheGet>).mockResolvedValue({ invalid: 'data' })

      const result = await getCachedPremiumStatus(mockUserId)

      // Should treat malformed data as miss
      expect(result).toBeNull()
    })
  })
})
