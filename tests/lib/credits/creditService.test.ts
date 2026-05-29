/**
 * Credit Service Tests (credit-only model — subscription plans retired)
 */

import { vi, beforeEach } from 'vitest'

// Mock Prisma using hoisted approach
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    userCredits: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(() => []),
    },
    bonusCreditPurchase: {
      findMany: vi.fn(() => []),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findFirst: vi.fn(),
    },
    // CreditTransaction audit table — 모든 mutation 사이트가 행 하나 emit.
    // 기존 테스트는 잔액·소비량만 검증하므로 mock 은 noop 으로 충분.
    creditTransaction: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
      if (typeof callback === 'function') {
        return callback(mockPrisma)
      }
      // array form (used by expireBonusCredits / revokeBonusCreditPurchase).
      return Promise.all(callback as unknown as Promise<unknown>[])
    }),
    $executeRaw: vi.fn(),
  }
  return { mockPrisma }
})

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}))

const getMockPrisma = () => mockPrisma

describe('Credit calculation utilities', () => {
  describe('remaining credits calculation', () => {
    it('calculates remaining correctly', () => {
      const calculateRemaining = (monthly: number, used: number, bonus: number) => {
        return Math.max(0, monthly - used + bonus)
      }

      expect(calculateRemaining(7, 0, 0)).toBe(7)
      expect(calculateRemaining(7, 5, 0)).toBe(2)
      expect(calculateRemaining(7, 7, 0)).toBe(0)
      expect(calculateRemaining(7, 10, 0)).toBe(0) // Can't go negative
      expect(calculateRemaining(7, 5, 3)).toBe(5) // Bonus adds to remaining
    })
  })

  describe('period calculation', () => {
    it('calculates next period end correctly', () => {
      const now = new Date(2024, 5, 15) // June 15, 2024
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      expect(nextMonth.getMonth()).toBe(6) // July
      expect(nextMonth.getDate()).toBe(15)

      const diffMs = nextMonth.getTime() - now.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      expect(diffDays).toBeGreaterThanOrEqual(28)
      expect(diffDays).toBeLessThanOrEqual(31)
    })

    it('handles month boundaries correctly', () => {
      const december = new Date(2024, 11, 15) // December 15, 2024
      const nextMonth = new Date(december)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      expect(nextMonth.getFullYear()).toBe(2025)
      expect(nextMonth.getMonth()).toBe(0) // January
    })
  })
})

describe('Credit Service Functions with Mocked Prisma', () => {
  let mockPrisma: Awaited<ReturnType<typeof getMockPrisma>>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPrisma = await getMockPrisma()
  })

  describe('initializeUserCredits', () => {
    it('creates user credits for new user', async () => {
      const { initializeUserCredits } = await import('@/lib/credits/creditService')

      const mockCreatedCredits = {
        userId: 'test-user-init',
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 2,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(),
      }

      mockPrisma.userCredits.create.mockResolvedValue(mockCreatedCredits as never)

      const result = await initializeUserCredits('test-user-init')

      expect(mockPrisma.userCredits.create).toHaveBeenCalled()
      expect(result.bonusCredits).toBe(2)
    })
  })

  describe('getUserCredits', () => {
    it('returns existing credits when found', async () => {
      const { getUserCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'existing-user',
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 5,
        bonusCredits: 10,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 30),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await getUserCredits('existing-user')

      expect(result.usedCredits).toBe(5)
      expect(result.bonusCredits).toBe(10)
    })

    it('creates new credits when not found', async () => {
      const { getUserCredits } = await import('@/lib/credits/creditService')

      mockPrisma.userCredits.findUnique.mockResolvedValue(null)

      const mockNewCredits = {
        userId: 'new-user',
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 2,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 30),
      }

      mockPrisma.userCredits.create.mockResolvedValue(mockNewCredits as never)

      const result = await getUserCredits('new-user')

      expect(mockPrisma.userCredits.create).toHaveBeenCalled()
      expect(result.bonusCredits).toBe(2)
    })
  })

  describe('getCreditBalance', () => {
    it('calculates balance correctly', async () => {
      const { getCreditBalance } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'balance-user',
        plan: 'free',
        monthlyCredits: 80,
        usedCredits: 30,
        bonusCredits: 20,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const balance = await getCreditBalance('balance-user')

      expect(balance.monthlyCredits).toBe(80)
      expect(balance.usedCredits).toBe(30)
      expect(balance.bonusCredits).toBe(20)
      expect(balance.remainingCredits).toBe(70) // 80 - 30 + 20
    })

    it('returns 0 when credits are exhausted', async () => {
      const { getCreditBalance } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'empty-user',
        plan: 'free',
        monthlyCredits: 7,
        usedCredits: 10, // Over used
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const balance = await getCreditBalance('empty-user')

      expect(balance.remainingCredits).toBe(0)
    })
  })

  describe('canUseCredits', () => {
    it('allows reading when credits available', async () => {
      const { canUseCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'can-use-user',
        plan: 'free',
        monthlyCredits: 80,
        usedCredits: 10,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await canUseCredits('can-use-user', 'reading', 1)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(69)
    })

    it('denies reading when credits exhausted', async () => {
      const { canUseCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'no-credits-user',
        plan: 'free',
        monthlyCredits: 7,
        usedCredits: 7,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await canUseCredits('no-credits-user', 'reading', 1)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('no_credits')
    })

    it('treats compatibility as general credit (no separate limit)', async () => {
      const { canUseCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'compat-user',
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 3,
        compatibilityUsed: 99,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await canUseCredits('compat-user', 'compatibility', 1)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })

    it('treats followUp as general credit (no separate limit)', async () => {
      const { canUseCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'followup-user',
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 99,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await canUseCredits('followup-user', 'followUp', 1)

      // No general credit available → denied as a plain credit shortage.
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('no_credits')
    })
  })

  describe('consumeCredits', () => {
    it('successfully consumes reading credits', async () => {
      const { consumeCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'consume-user',
        plan: 'free',
        monthlyCredits: 80,
        usedCredits: 10,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)
      mockPrisma.userCredits.update.mockResolvedValue({ ...mockCredits, usedCredits: 11 } as never)

      const result = await consumeCredits('consume-user', 'reading', 1)

      expect(result.success).toBe(true)
      expect(result.chargedAs).toBe('reading')
      expect(mockPrisma.userCredits.update).toHaveBeenCalled()
    })

    it('charges compatibility against general credit', async () => {
      const { consumeCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'consume-compat-user',
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 5,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)
      mockPrisma.bonusCreditPurchase.findMany.mockResolvedValue([
        {
          id: 'p1',
          userId: 'consume-compat-user',
          amount: 5,
          remaining: 5,
          expiresAt: new Date(Date.now() + 86400000 * 30),
          expired: false,
          source: 'purchase',
          stripePaymentId: null,
          createdAt: new Date(),
        },
      ] as never)
      mockPrisma.userCredits.update.mockResolvedValue({ ...mockCredits, bonusCredits: 4 } as never)

      const result = await consumeCredits('consume-compat-user', 'compatibility', 1)

      expect(result.success).toBe(true)
      expect(result.chargedAs).toBe('reading')
    })

    it('fails when no credits available', async () => {
      const { consumeCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'no-credits',
        plan: 'free',
        monthlyCredits: 7,
        usedCredits: 7,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await consumeCredits('no-credits', 'reading', 1)

      expect(result.success).toBe(false)
      expect(result.error).toBe('크레딧이 부족합니다')
    })

    it('uses bonus credits first when available', async () => {
      const { consumeCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'bonus-user',
        plan: 'free',
        monthlyCredits: 80,
        usedCredits: 0,
        bonusCredits: 10,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)
      mockPrisma.bonusCreditPurchase.findMany.mockResolvedValue([
        {
          id: 'purchase-1',
          userId: 'bonus-user',
          amount: 10,
          remaining: 10,
          expiresAt: new Date(Date.now() + 86400000 * 30),
          expired: false,
          source: 'purchase',
          stripePaymentId: null,
          createdAt: new Date(),
        },
      ] as never)
      mockPrisma.userCredits.update.mockResolvedValue({ ...mockCredits, bonusCredits: 9 } as never)

      const result = await consumeCredits('bonus-user', 'reading', 1)

      expect(result.success).toBe(true)
    })
  })

  describe('addBonusCredits', () => {
    it('adds bonus credits from purchase', async () => {
      const { addBonusCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'bonus-add-user',
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)
      mockPrisma.bonusCreditPurchase.create.mockResolvedValue({
        id: 'new-purchase',
        userId: 'bonus-add-user',
        amount: 50,
        remaining: 50,
        expiresAt: new Date(Date.now() + 86400000 * 90),
        expired: false,
        source: 'purchase',
        stripePaymentId: 'pi_test123',
        createdAt: new Date(),
      } as never)
      mockPrisma.userCredits.update.mockResolvedValue({ ...mockCredits, bonusCredits: 50 } as never)

      const result = await addBonusCredits('bonus-add-user', 50, 'purchase', 'pi_test123')

      expect(result.bonusCredits).toBe(50)
      expect(mockPrisma.bonusCreditPurchase.create).toHaveBeenCalled()
    })

    it('adds bonus credits from referral', async () => {
      const { addBonusCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'referral-bonus-user',
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 5,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)
      mockPrisma.bonusCreditPurchase.create.mockResolvedValue({
        id: 'referral-purchase',
        userId: 'referral-bonus-user',
        amount: 10,
        remaining: 10,
        expiresAt: new Date(Date.now() + 86400000 * 90),
        expired: false,
        source: 'referral',
        stripePaymentId: null,
        createdAt: new Date(),
      } as never)
      mockPrisma.userCredits.update.mockResolvedValue({ ...mockCredits, bonusCredits: 15 } as never)

      const result = await addBonusCredits('referral-bonus-user', 10, 'referral')

      expect(result.bonusCredits).toBe(15)
    })
  })

  describe('getValidBonusCredits', () => {
    it('returns sum of valid bonus credits', async () => {
      const { getValidBonusCredits } = await import('@/lib/credits/creditService')

      mockPrisma.bonusCreditPurchase.findMany.mockResolvedValue([
        { remaining: 10 },
        { remaining: 20 },
        { remaining: 5 },
      ] as never)

      const result = await getValidBonusCredits('test-user')

      expect(result).toBe(35)
    })

    it('returns 0 when no valid bonus credits', async () => {
      const { getValidBonusCredits } = await import('@/lib/credits/creditService')

      mockPrisma.bonusCreditPurchase.findMany.mockResolvedValue([] as never)

      const result = await getValidBonusCredits('test-user')

      expect(result).toBe(0)
    })
  })

  describe('canUseFeature', () => {
    it('always allows features in the credit-only model', async () => {
      const { canUseFeature } = await import('@/lib/credits/creditService')

      expect(await canUseFeature('any-user', 'fullSaju')).toBe(true)
      expect(await canUseFeature('any-user', 'anythingElse')).toBe(true)
    })
  })
})
