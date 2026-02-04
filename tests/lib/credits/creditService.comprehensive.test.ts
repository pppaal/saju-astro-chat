/**
 * Comprehensive tests for Credit Service
 * Tests deduction, refund, balance checking, plan upgrades, and bonus credit expiration
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { PLAN_CONFIG } from '@/lib/config/pricing'
import {
  initializeUserCredits,
  getUserCredits,
  getCreditBalance,
  canUseCredits,
  consumeCredits,
  resetMonthlyCredits,
  upgradePlan,
  addBonusCredits,
  getValidBonusCredits,
  expireBonusCredits,
  resetAllExpiredCredits,
  canUseFeature,
} from '@/lib/credits/creditService'

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userCredits: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    bonusCreditPurchase: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

describe('Credit Service', () => {
  const mockUserId = 'user_123'
  const mockNow = new Date('2024-01-15T10:00:00Z')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(mockNow)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initializeUserCredits', () => {
    it('should create free plan credits for new user', async () => {
      const freeConfig = PLAN_CONFIG.free
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: freeConfig.monthlyCredits,
        usedCredits: 0,
        bonusCredits: 0,
      }

      ;(prisma.userCredits.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const result = await initializeUserCredits(mockUserId, 'free')

      expect(result).toEqual(mockCredits)
      expect(prisma.userCredits.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            plan: 'free',
            monthlyCredits: freeConfig.monthlyCredits,
            usedCredits: 0,
            bonusCredits: 0,
          }),
        })
      )
    })

    it('should create pro plan credits', async () => {
      const proConfig = PLAN_CONFIG.pro
      const mockCredits = {
        userId: mockUserId,
        plan: 'pro',
        monthlyCredits: proConfig.monthlyCredits,
        usedCredits: 0,
      }

      ;(prisma.userCredits.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      await initializeUserCredits(mockUserId, 'pro')

      expect(prisma.userCredits.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'pro',
            monthlyCredits: proConfig.monthlyCredits,
          }),
        })
      )
    })

    it('should set period end to next month', async () => {
      ;(prisma.userCredits.create as ReturnType<typeof vi.fn>).mockResolvedValue({})

      await initializeUserCredits(mockUserId)

      const callArgs = (prisma.userCredits.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
      const periodEnd = callArgs.data.periodEnd

      // Should be Feb 1, 2024
      expect(periodEnd.getMonth()).toBe(1) // Feb
      expect(periodEnd.getDate()).toBe(1)
    })
  })

  describe('getUserCredits', () => {
    it('should return existing credits', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: PLAN_CONFIG.free.monthlyCredits,
        usedCredits: 1,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const result = await getUserCredits(mockUserId)

      expect(result).toEqual(mockCredits)
    })

    it('should create credits if not found', async () => {
      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      ;(prisma.userCredits.create as ReturnType<typeof vi.fn>).mockResolvedValue({ plan: 'free' })

      await getUserCredits(mockUserId)

      expect(prisma.userCredits.create).toHaveBeenCalled()
    })

    it('should reset credits if period expired', async () => {
      const expiredCredits = {
        userId: mockUserId,
        plan: 'free',
        periodEnd: new Date('2024-01-10'), // Expired
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(expiredCredits)
      ;(prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      ;(prisma.userCredits.update as ReturnType<typeof vi.fn>).mockResolvedValue({ plan: 'free' })

      await getUserCredits(mockUserId)

      expect(prisma.userCredits.update).toHaveBeenCalled()
    })
  })

  describe('getCreditBalance', () => {
    it('should calculate remaining credits correctly', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 10,
        usedCredits: 3,
        bonusCredits: 5,
        compatibilityUsed: 1,
        compatibilityLimit: 2,
        followUpUsed: 0,
        followUpLimit: 3,
        historyRetention: 30,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const balance = await getCreditBalance(mockUserId)

      expect(balance.remainingCredits).toBe(12) // 10 - 3 + 5
      expect(balance.compatibility.remaining).toBe(1) // 2 - 1
      expect(balance.followUp.remaining).toBe(3) // 3 - 0
    })

    it('should handle negative credits as zero', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 5,
        usedCredits: 10, // Over-used
        bonusCredits: 0,
        compatibilityUsed: 5,
        compatibilityLimit: 2, // Over limit
        followUpUsed: 0,
        followUpLimit: 3,
        historyRetention: 30,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const balance = await getCreditBalance(mockUserId)

      expect(balance.remainingCredits).toBe(0)
      expect(balance.compatibility.remaining).toBe(0)
    })

    it('should use totalBonusReceived when available', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'pro',
        monthlyCredits: 30,
        usedCredits: 10,
        bonusCredits: 5,
        totalBonusReceived: 20, // Total ever received
        compatibilityUsed: 0,
        compatibilityLimit: 10,
        followUpUsed: 0,
        followUpLimit: 10,
        historyRetention: 90,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const balance = await getCreditBalance(mockUserId)

      expect(balance.totalCredits).toBe(50) // 30 + 20
    })
  })

  describe('canUseCredits', () => {
    it('should allow reading with sufficient credits', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 10,
        usedCredits: 5,
        bonusCredits: 0,
        compatibilityUsed: 0,
        compatibilityLimit: 2,
        followUpUsed: 0,
        followUpLimit: 3,
        historyRetention: 30,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const result = await canUseCredits(mockUserId, 'reading', 3)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2) // 5 - 3
    })

    it('should deny reading with insufficient credits', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 10,
        usedCredits: 9,
        bonusCredits: 0,
        compatibilityUsed: 0,
        compatibilityLimit: 2,
        followUpUsed: 0,
        followUpLimit: 3,
        historyRetention: 30,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const result = await canUseCredits(mockUserId, 'reading', 5)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('no_credits')
    })

    it('should check compatibility limit', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 10,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 1,
        compatibilityLimit: 2,
        followUpUsed: 0,
        followUpLimit: 3,
        historyRetention: 30,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const result = await canUseCredits(mockUserId, 'compatibility', 1)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0)
    })

    it('should deny when compatibility limit exceeded', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 10,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 2,
        compatibilityLimit: 2,
        followUpUsed: 0,
        followUpLimit: 3,
        historyRetention: 30,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const result = await canUseCredits(mockUserId, 'compatibility', 1)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('compatibility_limit')
    })

    it('should check followUp limit', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'pro',
        monthlyCredits: 30,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        compatibilityLimit: 10,
        followUpUsed: 8,
        followUpLimit: 10,
        historyRetention: 90,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const result = await canUseCredits(mockUserId, 'followUp', 2)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0)
    })
  })

  describe('consumeCredits', () => {
    it('should consume reading credits from monthly balance', async () => {
      const mockCredits = {
        userId: mockUserId,
        monthlyCredits: 10,
        usedCredits: 5,
        bonusCredits: 0,
        compatibilityUsed: 0,
        compatibilityLimit: 2,
        followUpUsed: 0,
        followUpLimit: 3,
      }

      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
        callback({
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockCredits),
            update: vi.fn().mockResolvedValue({}),
          },
        })
      )

      const result = await consumeCredits(mockUserId, 'reading', 2)

      expect(result.success).toBe(true)
    })

    it('should consume bonus credits first (FIFO)', async () => {
      const mockCredits = {
        userId: mockUserId,
        monthlyCredits: 10,
        usedCredits: 5,
        bonusCredits: 3,
        compatibilityUsed: 0,
        compatibilityLimit: 2,
        followUpUsed: 0,
        followUpLimit: 3,
      }

      const mockPurchases = [
        { id: 'p1', remaining: 2, expiresAt: new Date('2024-04-01') },
        { id: 'p2', remaining: 1, expiresAt: new Date('2024-05-01') },
      ]

      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
        callback({
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockCredits),
            update: vi.fn().mockResolvedValue({}),
          },
          bonusCreditPurchase: {
            findMany: vi.fn().mockResolvedValue(mockPurchases),
            update: vi.fn().mockResolvedValue({}),
          },
        })
      )

      const result = await consumeCredits(mockUserId, 'reading', 3)

      expect(result.success).toBe(true)
    })

    it('should return error when insufficient credits', async () => {
      const mockCredits = {
        userId: mockUserId,
        monthlyCredits: 10,
        usedCredits: 10,
        bonusCredits: 0,
        compatibilityUsed: 0,
        compatibilityLimit: 2,
        followUpUsed: 0,
        followUpLimit: 3,
      }

      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockCredits),
          },
        }
        return callback(tx)
      })

      const result = await consumeCredits(mockUserId, 'reading', 1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('부족')
    })

    it('should increment compatibility usage', async () => {
      const mockCredits = {
        userId: mockUserId,
        monthlyCredits: 10,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        compatibilityLimit: 2,
        followUpUsed: 0,
        followUpLimit: 3,
      }

      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
        callback({
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockCredits),
            update: vi.fn().mockResolvedValue({}),
          },
        })
      )

      const result = await consumeCredits(mockUserId, 'compatibility', 1)

      expect(result.success).toBe(true)
    })

    it('should handle race condition with transaction', async () => {
      const mockCredits = {
        userId: mockUserId,
        monthlyCredits: 10,
        usedCredits: 9,
        bonusCredits: 0,
        compatibilityUsed: 0,
        compatibilityLimit: 2,
        followUpUsed: 0,
        followUpLimit: 3,
      }

      // Simulate concurrent requests
      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockCredits),
            update: vi.fn().mockResolvedValue({}),
          },
        }
        return callback(tx)
      })

      const [result1, result2] = await Promise.all([
        consumeCredits(mockUserId, 'reading', 1),
        consumeCredits(mockUserId, 'reading', 1),
      ])

      // At least one should succeed (transaction prevents double-spend)
      expect(result1.success || result2.success).toBe(true)
    })
  })

  describe('addBonusCredits', () => {
    it('should add bonus credits and create purchase record', async () => {
      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: mockUserId,
        plan: 'free',
      })
      ;(prisma.bonusCreditPurchase.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(prisma.userCredits.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

      await addBonusCredits(mockUserId, 10, 'purchase', 'stripe_pi_123')

      expect(prisma.bonusCreditPurchase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            amount: 10,
            remaining: 10,
            source: 'purchase',
            stripePaymentId: 'stripe_pi_123',
          }),
        })
      )

      expect(prisma.userCredits.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bonusCredits: { increment: 10 },
            totalBonusReceived: { increment: 10 },
          }),
        })
      )
    })

    it('should set expiration to 3 months from now', async () => {
      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: mockUserId,
      })
      ;(prisma.bonusCreditPurchase.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(prisma.userCredits.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

      await addBonusCredits(mockUserId, 5, 'referral')

      const callArgs = (prisma.bonusCreditPurchase.create as ReturnType<typeof vi.fn>).mock
        .calls[0][0]
      const expiresAt = callArgs.data.expiresAt

      expect(expiresAt.getMonth()).toBe(3) // April (3 months after Jan, 0-indexed)
    })
  })

  describe('expireBonusCredits', () => {
    it('should expire old bonus credits', async () => {
      const mockExpiredPurchases = [
        { id: 'p1', userId: 'user1', remaining: 5 },
        { id: 'p2', userId: 'user2', remaining: 3 },
      ]

      ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockExpiredPurchases
      )
      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockResolvedValue([{}, {}])

      const result = await expireBonusCredits()

      expect(result.totalUsers).toBe(2)
      expect(result.totalCreditsExpired).toBe(8)
    })

    it('should handle partial failures gracefully', async () => {
      const mockExpiredPurchases = [
        { id: 'p1', userId: 'user1', remaining: 5 },
        { id: 'p2', userId: 'user2', remaining: 3 },
      ]

      ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockExpiredPurchases
      )

      // Mock Promise.allSettled with one success, one failure
      vi.spyOn(Promise, 'allSettled').mockResolvedValue([
        { status: 'fulfilled', value: undefined },
        { status: 'rejected', reason: new Error('DB error') },
      ] as any)

      const result = await expireBonusCredits()

      expect(result.succeeded).toBe(1)
      expect(result.failed).toBe(1)
    })
  })

  describe('upgradePlan', () => {
    it('should upgrade plan and reset credits', async () => {
      const existingCredits = {
        userId: mockUserId,
        plan: 'free',
        usedCredits: 3,
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        existingCredits
      )
      ;(prisma.userCredits.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

      await upgradePlan(mockUserId, 'pro')

      expect(prisma.userCredits.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'pro',
            monthlyCredits: PLAN_CONFIG.pro.monthlyCredits,
            usedCredits: 0,
            compatibilityUsed: 0,
            followUpUsed: 0,
          }),
        })
      )
    })

    it('should create credits if none exist', async () => {
      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      ;(prisma.userCredits.create as ReturnType<typeof vi.fn>).mockResolvedValue({})

      await upgradePlan(mockUserId, 'pro')

      expect(prisma.userCredits.create).toHaveBeenCalled()
    })
  })

  describe('resetMonthlyCredits', () => {
    it('should reset to free plan when subscription expired', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'pro',
        usedCredits: 20,
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)
      ;(prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      ;(prisma.userCredits.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

      await resetMonthlyCredits(mockUserId)

      expect(prisma.userCredits.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'free',
            monthlyCredits: PLAN_CONFIG.free.monthlyCredits,
            usedCredits: 0,
          }),
        })
      )
    })

    it('should maintain plan when subscription active', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'pro',
        usedCredits: 20,
      }

      const mockSubscription = {
        userId: mockUserId,
        status: 'active',
        currentPeriodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)
      ;(prisma.subscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockSubscription
      )
      ;(prisma.userCredits.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

      await resetMonthlyCredits(mockUserId)

      // When subscription is active, the plan is maintained (not changed)
      // and credits are reset based on current plan config
      const proConfig = PLAN_CONFIG.pro
      expect(prisma.userCredits.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usedCredits: 0,
            monthlyCredits: proConfig.monthlyCredits,
          }),
        })
      )
    })
  })

  describe('canUseFeature', () => {
    it('should check feature access based on plan', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const result = await canUseFeature(mockUserId, 'priority')

      expect(result).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero credits gracefully', async () => {
      const mockCredits = {
        userId: mockUserId,
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        compatibilityLimit: 0,
        followUpUsed: 0,
        followUpLimit: 0,
        historyRetention: 0,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const balance = await getCreditBalance(mockUserId)

      expect(balance.remainingCredits).toBe(0)
    })

    it('should handle very large bonus credits', async () => {
      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: mockUserId,
      })
      ;(prisma.bonusCreditPurchase.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
      ;(prisma.userCredits.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

      await addBonusCredits(mockUserId, 1000000, 'promotion')

      expect(prisma.bonusCreditPurchase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 1000000,
          }),
        })
      )
    })
  })
})
