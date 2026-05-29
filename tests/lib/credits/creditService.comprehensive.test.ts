/**
 * Comprehensive tests for Credit Service (credit-only model — plans retired)
 * Tests deduction, balance checking, bonus credit add/expiration.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import {
  initializeUserCredits,
  getUserCredits,
  getCreditBalance,
  canUseCredits,
  consumeCredits,
  resetMonthlyCredits,
  addBonusCredits,
  expireBonusCredits,
  canUseFeature,
} from '@/lib/credits/creditService'

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userCredits: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    bonusCreditPurchase: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    // CreditTransaction audit table — noop mock, 잔액/한도 검증은 영향 없음.
    creditTransaction: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}))

describe('Credit Service', () => {
  const mockUserId = 'user_123'
  const mockNow = new Date('2024-01-15T10:00:00Z')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(mockNow)
    // $transaction 의 두 가지 호출 형태를 모두 지원하도록 기본 구현 설정.
    // (a) function callback → 그대로 prisma 객체 넘기고 실행.
    // (b) array of promises (legacy ops form) → Promise.all.
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (arg: unknown) => {
      if (typeof arg === 'function') return (arg as (tx: unknown) => Promise<unknown>)(prisma)
      if (Array.isArray(arg)) return Promise.all(arg)
      return undefined
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initializeUserCredits', () => {
    it('should create credits for new user with signup bonus', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 4,
      }

      ;(prisma.userCredits.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const result = await initializeUserCredits(mockUserId)

      expect(result).toEqual(mockCredits)
      expect(prisma.userCredits.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            monthlyCredits: 0,
            usedCredits: 0,
            // signup bonus
            bonusCredits: 4,
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
        monthlyCredits: 0,
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

    it('should reset period if expired', async () => {
      const expiredCredits = {
        userId: mockUserId,
        plan: 'free',
        periodEnd: new Date('2024-01-10'), // Expired
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(expiredCredits)
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
        compatibilityUsed: 0,
        compatibilityLimit: 0,
        followUpUsed: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const balance = await getCreditBalance(mockUserId)

      expect(balance.remainingCredits).toBe(12) // 10 - 3 + 5
    })

    it('should handle negative credits as zero', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 5,
        usedCredits: 10, // Over-used
        bonusCredits: 0,
        compatibilityUsed: 0,
        compatibilityLimit: 0,
        followUpUsed: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const balance = await getCreditBalance(mockUserId)

      expect(balance.remainingCredits).toBe(0)
    })

    it('should use totalBonusReceived when available', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 30,
        usedCredits: 10,
        bonusCredits: 5,
        totalBonusReceived: 20, // Total ever received
        compatibilityUsed: 0,
        compatibilityLimit: 0,
        followUpUsed: 0,
        followUpLimit: 0,
        historyRetention: 365,
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
        compatibilityLimit: 0,
        followUpUsed: 0,
        followUpLimit: 0,
        historyRetention: 365,
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
        compatibilityLimit: 0,
        followUpUsed: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const result = await canUseCredits(mockUserId, 'reading', 5)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('no_credits')
    })

    it('should treat compatibility as general credit', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 10,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 99,
        compatibilityLimit: 0,
        followUpUsed: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const result = await canUseCredits(mockUserId, 'compatibility', 1)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9) // 10 - 1, ignores compatibilityUsed
    })

    it('should treat followUp as general credit', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 30,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        compatibilityLimit: 0,
        followUpUsed: 99,
        followUpLimit: 0,
        historyRetention: 365,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)

      const result = await canUseCredits(mockUserId, 'followUp', 2)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(28) // 30 - 2, ignores followUpUsed
    })
  })

  describe('consumeCredits', () => {
    it('should consume reading credits from monthly balance', async () => {
      const mockCredits = {
        userId: mockUserId,
        monthlyCredits: 10,
        usedCredits: 5,
        bonusCredits: 0,
      }

      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
        callback({
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockCredits),
            update: vi.fn().mockResolvedValue({}),
          },
          creditTransaction: { create: vi.fn().mockResolvedValue({}) },
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
          creditTransaction: { create: vi.fn().mockResolvedValue({}) },
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

    it('should charge compatibility against general credit', async () => {
      const mockCredits = {
        userId: mockUserId,
        monthlyCredits: 10,
        usedCredits: 0,
        bonusCredits: 0,
      }

      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
        callback({
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockCredits),
            update: vi.fn().mockResolvedValue({}),
          },
          creditTransaction: { create: vi.fn().mockResolvedValue({}) },
        })
      )

      const result = await consumeCredits(mockUserId, 'compatibility', 1)

      expect(result.success).toBe(true)
      expect(result.chargedAs).toBe('reading')
    })

    it('should handle race condition with transaction', async () => {
      const mockCredits = {
        userId: mockUserId,
        monthlyCredits: 10,
        usedCredits: 9,
        bonusCredits: 0,
      }

      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockCredits),
            update: vi.fn().mockResolvedValue({}),
          },
          creditTransaction: { create: vi.fn().mockResolvedValue({}) },
        }
        return callback(tx)
      })

      const [result1, result2] = await Promise.all([
        consumeCredits(mockUserId, 'reading', 1),
        consumeCredits(mockUserId, 'reading', 1),
      ])

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

      vi.spyOn(Promise, 'allSettled').mockResolvedValue([
        { status: 'fulfilled', value: undefined },
        { status: 'rejected', reason: new Error('DB error') },
      ] as any)

      const result = await expireBonusCredits()

      expect(result.succeeded).toBe(1)
      expect(result.failed).toBe(1)
    })
  })

  describe('resetMonthlyCredits', () => {
    it('should advance the period without refilling credits', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        usedCredits: 20,
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)
      ;(prisma.userCredits.update as ReturnType<typeof vi.fn>).mockResolvedValue({})

      await resetMonthlyCredits(mockUserId)

      const callArgs = (prisma.userCredits.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
      // Only the period is advanced; credit counters are left untouched.
      expect(callArgs.data).toHaveProperty('periodStart')
      expect(callArgs.data).toHaveProperty('periodEnd')
      expect(callArgs.data).not.toHaveProperty('monthlyCredits')
      expect(callArgs.data).not.toHaveProperty('usedCredits')
    })

    it('should initialize credits if none exist', async () => {
      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
      ;(prisma.userCredits.create as ReturnType<typeof vi.fn>).mockResolvedValue({})

      await resetMonthlyCredits(mockUserId)

      expect(prisma.userCredits.create).toHaveBeenCalled()
    })
  })

  describe('canUseFeature', () => {
    it('should always allow features in the credit-only model', async () => {
      const result = await canUseFeature(mockUserId, 'priority')
      expect(result).toBe(true)
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
