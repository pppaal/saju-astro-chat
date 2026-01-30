/**
 * Credit Service Tests
 *
 * Tests for credit system and plan configuration
 */

import { vi, beforeEach, type Mock } from 'vitest'

// Mock Prisma using hoisted approach
const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    userCredits: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(() => []),
    },
    bonusCreditPurchase: {
      findMany: vi.fn(() => []),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
      // Execute callback with the mocked transaction context
      return callback(mockPrisma)
    }),
  }
  return { mockPrisma }
})

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}))

// Get reference to mocked prisma for test assertions
const getMockPrisma = () => mockPrisma

import { PLAN_CONFIG, type PlanType, type FeatureType } from '@/lib/credits/creditService'

describe('PLAN_CONFIG', () => {
  describe('free plan', () => {
    it('has correct monthly credits', () => {
      expect(PLAN_CONFIG.free.monthlyCredits).toBe(7)
    })

    it('has no compatibility limit', () => {
      expect(PLAN_CONFIG.free.compatibilityLimit).toBe(0)
    })

    it('has no follow-up limit', () => {
      expect(PLAN_CONFIG.free.followUpLimit).toBe(0)
    })

    it('has 7 days history retention', () => {
      expect(PLAN_CONFIG.free.historyRetention).toBe(7)
    })

    it('has limited features', () => {
      const features = PLAN_CONFIG.free.features
      expect(features.basicSaju).toBe(true)
      expect(features.detailedSaju).toBe(false)
      expect(features.fullSaju).toBe(false)
      expect(features.oneCardTarot).toBe(true)
      expect(features.threeCardTarot).toBe(false)
      expect(features.allTarotSpreads).toBe(false)
      expect(features.pdfReport).toBe(false)
      expect(features.adFree).toBe(false)
      expect(features.priority).toBe(false)
    })
  })

  describe('starter plan', () => {
    it('has correct monthly credits', () => {
      expect(PLAN_CONFIG.starter.monthlyCredits).toBe(25)
    })

    it('has compatibility limit of 2', () => {
      expect(PLAN_CONFIG.starter.compatibilityLimit).toBe(2)
    })

    it('has follow-up limit of 2', () => {
      expect(PLAN_CONFIG.starter.followUpLimit).toBe(2)
    })

    it('has 30 days history retention', () => {
      expect(PLAN_CONFIG.starter.historyRetention).toBe(30)
    })

    it('has expanded features', () => {
      const features = PLAN_CONFIG.starter.features
      expect(features.basicSaju).toBe(true)
      expect(features.detailedSaju).toBe(true)
      expect(features.fullSaju).toBe(false)
      expect(features.oneCardTarot).toBe(true)
      expect(features.threeCardTarot).toBe(true)
      expect(features.allTarotSpreads).toBe(false)
      expect(features.adFree).toBe(true)
    })
  })

  describe('pro plan', () => {
    it('has correct monthly credits', () => {
      expect(PLAN_CONFIG.pro.monthlyCredits).toBe(80)
    })

    it('has compatibility limit of 5', () => {
      expect(PLAN_CONFIG.pro.compatibilityLimit).toBe(5)
    })

    it('has follow-up limit of 5', () => {
      expect(PLAN_CONFIG.pro.followUpLimit).toBe(5)
    })

    it('has 90 days history retention', () => {
      expect(PLAN_CONFIG.pro.historyRetention).toBe(90)
    })

    it('has most features except priority', () => {
      const features = PLAN_CONFIG.pro.features
      expect(features.basicSaju).toBe(true)
      expect(features.detailedSaju).toBe(true)
      expect(features.fullSaju).toBe(true)
      expect(features.oneCardTarot).toBe(true)
      expect(features.threeCardTarot).toBe(true)
      expect(features.allTarotSpreads).toBe(true)
      expect(features.pdfReport).toBe(true)
      expect(features.adFree).toBe(true)
      expect(features.priority).toBe(false)
    })
  })

  describe('premium plan', () => {
    it('has correct monthly credits', () => {
      expect(PLAN_CONFIG.premium.monthlyCredits).toBe(200)
    })

    it('has compatibility limit of 10', () => {
      expect(PLAN_CONFIG.premium.compatibilityLimit).toBe(10)
    })

    it('has follow-up limit of 10', () => {
      expect(PLAN_CONFIG.premium.followUpLimit).toBe(10)
    })

    it('has 365 days history retention', () => {
      expect(PLAN_CONFIG.premium.historyRetention).toBe(365)
    })

    it('has all features enabled', () => {
      const features = PLAN_CONFIG.premium.features
      expect(features.basicSaju).toBe(true)
      expect(features.detailedSaju).toBe(true)
      expect(features.fullSaju).toBe(true)
      expect(features.oneCardTarot).toBe(true)
      expect(features.threeCardTarot).toBe(true)
      expect(features.allTarotSpreads).toBe(true)
      expect(features.pdfReport).toBe(true)
      expect(features.adFree).toBe(true)
      expect(features.priority).toBe(true)
    })
  })

  describe('plan comparisons', () => {
    it('credits increase with higher plans', () => {
      expect(PLAN_CONFIG.starter.monthlyCredits).toBeGreaterThan(PLAN_CONFIG.free.monthlyCredits)
      expect(PLAN_CONFIG.pro.monthlyCredits).toBeGreaterThan(PLAN_CONFIG.starter.monthlyCredits)
      expect(PLAN_CONFIG.premium.monthlyCredits).toBeGreaterThan(PLAN_CONFIG.pro.monthlyCredits)
    })

    it('history retention increases with higher plans', () => {
      expect(PLAN_CONFIG.starter.historyRetention).toBeGreaterThan(
        PLAN_CONFIG.free.historyRetention
      )
      expect(PLAN_CONFIG.pro.historyRetention).toBeGreaterThan(PLAN_CONFIG.starter.historyRetention)
      expect(PLAN_CONFIG.premium.historyRetention).toBeGreaterThan(PLAN_CONFIG.pro.historyRetention)
    })

    it('compatibility limits increase with higher plans', () => {
      expect(PLAN_CONFIG.starter.compatibilityLimit).toBeGreaterThan(
        PLAN_CONFIG.free.compatibilityLimit
      )
      expect(PLAN_CONFIG.pro.compatibilityLimit).toBeGreaterThan(
        PLAN_CONFIG.starter.compatibilityLimit
      )
      expect(PLAN_CONFIG.premium.compatibilityLimit).toBeGreaterThan(
        PLAN_CONFIG.pro.compatibilityLimit
      )
    })
  })

  describe('feature availability', () => {
    const plans: PlanType[] = ['free', 'starter', 'pro', 'premium']

    it('basicSaju is available on all plans', () => {
      for (const plan of plans) {
        expect(PLAN_CONFIG[plan].features.basicSaju).toBe(true)
      }
    })

    it('oneCardTarot is available on all plans', () => {
      for (const plan of plans) {
        expect(PLAN_CONFIG[plan].features.oneCardTarot).toBe(true)
      }
    })

    it('fullSaju requires pro or higher', () => {
      expect(PLAN_CONFIG.free.features.fullSaju).toBe(false)
      expect(PLAN_CONFIG.starter.features.fullSaju).toBe(false)
      expect(PLAN_CONFIG.pro.features.fullSaju).toBe(true)
      expect(PLAN_CONFIG.premium.features.fullSaju).toBe(true)
    })

    it('priority is premium only', () => {
      expect(PLAN_CONFIG.free.features.priority).toBe(false)
      expect(PLAN_CONFIG.starter.features.priority).toBe(false)
      expect(PLAN_CONFIG.pro.features.priority).toBe(false)
      expect(PLAN_CONFIG.premium.features.priority).toBe(true)
    })

    it('adFree requires starter or higher', () => {
      expect(PLAN_CONFIG.free.features.adFree).toBe(false)
      expect(PLAN_CONFIG.starter.features.adFree).toBe(true)
      expect(PLAN_CONFIG.pro.features.adFree).toBe(true)
      expect(PLAN_CONFIG.premium.features.adFree).toBe(true)
    })
  })
})

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

  describe('feature availability check', () => {
    it('checks if feature is available for plan', () => {
      const canUseFeature = (plan: PlanType, feature: FeatureType): boolean => {
        return PLAN_CONFIG[plan].features[feature]
      }

      expect(canUseFeature('free', 'basicSaju')).toBe(true)
      expect(canUseFeature('free', 'fullSaju')).toBe(false)
      expect(canUseFeature('premium', 'fullSaju')).toBe(true)
    })
  })

  describe('compatibility limit check', () => {
    it('checks if user can use compatibility', () => {
      const canUseCompatibility = (used: number, limit: number): boolean => {
        return used < limit
      }

      expect(canUseCompatibility(0, 2)).toBe(true)
      expect(canUseCompatibility(1, 2)).toBe(true)
      expect(canUseCompatibility(2, 2)).toBe(false)
      expect(canUseCompatibility(0, 0)).toBe(false) // Free plan
    })
  })

  describe('period calculation', () => {
    it('calculates next period end correctly', () => {
      // Use a fixed date for consistent testing
      const now = new Date(2024, 5, 15) // June 15, 2024
      const nextMonth = new Date(now)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      // Should be July 15, 2024
      expect(nextMonth.getMonth()).toBe(6) // July
      expect(nextMonth.getDate()).toBe(15)

      // Calculate difference
      const diffMs = nextMonth.getTime() - now.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24)

      expect(diffDays).toBeGreaterThanOrEqual(28)
      expect(diffDays).toBeLessThanOrEqual(31)
    })

    it('handles month boundaries correctly', () => {
      // Test that setting month from December goes to next year
      const december = new Date(2024, 11, 15) // December 15, 2024
      const nextMonth = new Date(december)
      nextMonth.setMonth(nextMonth.getMonth() + 1)

      expect(nextMonth.getFullYear()).toBe(2025)
      expect(nextMonth.getMonth()).toBe(0) // January
    })
  })
})

describe('Credit types', () => {
  it('has valid plan types', () => {
    const validPlans: PlanType[] = ['free', 'starter', 'pro', 'premium']

    for (const plan of validPlans) {
      expect(PLAN_CONFIG[plan]).toBeDefined()
    }
  })

  it('has valid feature types', () => {
    const features: FeatureType[] = [
      'basicSaju',
      'detailedSaju',
      'fullSaju',
      'oneCardTarot',
      'threeCardTarot',
      'allTarotSpreads',
      'pdfReport',
      'adFree',
      'priority',
    ]

    for (const feature of features) {
      expect(typeof PLAN_CONFIG.free.features[feature]).toBe('boolean')
    }
  })
})

describe('Plan upgrade paths', () => {
  it('identifies valid upgrade paths', () => {
    const planHierarchy: PlanType[] = ['free', 'starter', 'pro', 'premium']

    const isUpgrade = (from: PlanType, to: PlanType): boolean => {
      return planHierarchy.indexOf(to) > planHierarchy.indexOf(from)
    }

    expect(isUpgrade('free', 'starter')).toBe(true)
    expect(isUpgrade('free', 'pro')).toBe(true)
    expect(isUpgrade('free', 'premium')).toBe(true)
    expect(isUpgrade('starter', 'pro')).toBe(true)
    expect(isUpgrade('pro', 'premium')).toBe(true)

    // Not upgrades
    expect(isUpgrade('premium', 'pro')).toBe(false)
    expect(isUpgrade('starter', 'free')).toBe(false)
    expect(isUpgrade('pro', 'pro')).toBe(false)
  })

  it('calculates credit difference on upgrade', () => {
    const getUpgradeCredits = (from: PlanType, to: PlanType): number => {
      return PLAN_CONFIG[to].monthlyCredits - PLAN_CONFIG[from].monthlyCredits
    }

    expect(getUpgradeCredits('free', 'starter')).toBe(18) // 25 - 7
    expect(getUpgradeCredits('starter', 'pro')).toBe(55) // 80 - 25
    expect(getUpgradeCredits('pro', 'premium')).toBe(120) // 200 - 80
  })
})

describe('Credit Service Functions with Mocked Prisma', () => {
  let mockPrisma: Awaited<ReturnType<typeof getMockPrisma>>

  beforeEach(async () => {
    vi.clearAllMocks()
    mockPrisma = await getMockPrisma()
  })

  describe('initializeUserCredits', () => {
    it('creates user credits with free plan by default', async () => {
      const { initializeUserCredits } = await import('@/lib/credits/creditService')

      const mockCreatedCredits = {
        userId: 'test-user-init',
        plan: 'free',
        monthlyCredits: 7,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 7,
        periodStart: new Date(),
        periodEnd: new Date(),
      }

      mockPrisma.userCredits.create.mockResolvedValue(mockCreatedCredits as never)

      const result = await initializeUserCredits('test-user-init')

      expect(mockPrisma.userCredits.create).toHaveBeenCalled()
      expect(result.plan).toBe('free')
      expect(result.monthlyCredits).toBe(7)
    })

    it('creates user credits with specified plan', async () => {
      const { initializeUserCredits } = await import('@/lib/credits/creditService')

      const mockCreatedCredits = {
        userId: 'test-user-pro',
        plan: 'pro',
        monthlyCredits: 80,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 5,
        followUpLimit: 5,
        historyRetention: 90,
        periodStart: new Date(),
        periodEnd: new Date(),
      }

      mockPrisma.userCredits.create.mockResolvedValue(mockCreatedCredits as never)

      const result = await initializeUserCredits('test-user-pro', 'pro')

      expect(result.plan).toBe('pro')
      expect(result.monthlyCredits).toBe(80)
    })
  })

  describe('getUserCredits', () => {
    it('returns existing credits when found', async () => {
      const { getUserCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'existing-user',
        plan: 'starter',
        monthlyCredits: 25,
        usedCredits: 5,
        bonusCredits: 10,
        compatibilityUsed: 1,
        followUpUsed: 0,
        compatibilityLimit: 2,
        followUpLimit: 2,
        historyRetention: 30,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 30), // 30 days from now
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await getUserCredits('existing-user')

      expect(result.plan).toBe('starter')
      expect(result.usedCredits).toBe(5)
    })

    it('creates new credits when not found', async () => {
      const { getUserCredits } = await import('@/lib/credits/creditService')

      mockPrisma.userCredits.findUnique.mockResolvedValue(null)

      const mockNewCredits = {
        userId: 'new-user',
        plan: 'free',
        monthlyCredits: 7,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 7,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 30),
      }

      mockPrisma.userCredits.create.mockResolvedValue(mockNewCredits as never)

      const result = await getUserCredits('new-user')

      expect(mockPrisma.userCredits.create).toHaveBeenCalled()
      expect(result.plan).toBe('free')
    })
  })

  describe('getCreditBalance', () => {
    it('calculates balance correctly', async () => {
      const { getCreditBalance } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'balance-user',
        plan: 'pro',
        monthlyCredits: 80,
        usedCredits: 30,
        bonusCredits: 20,
        compatibilityUsed: 2,
        followUpUsed: 1,
        compatibilityLimit: 5,
        followUpLimit: 5,
        historyRetention: 90,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const balance = await getCreditBalance('balance-user')

      expect(balance.plan).toBe('pro')
      expect(balance.monthlyCredits).toBe(80)
      expect(balance.usedCredits).toBe(30)
      expect(balance.bonusCredits).toBe(20)
      expect(balance.remainingCredits).toBe(70) // 80 - 30 + 20
      expect(balance.compatibility.used).toBe(2)
      expect(balance.compatibility.remaining).toBe(3)
      expect(balance.followUp.used).toBe(1)
      expect(balance.followUp.remaining).toBe(4)
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
        historyRetention: 7,
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
        plan: 'pro',
        monthlyCredits: 80,
        usedCredits: 10,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 5,
        followUpLimit: 5,
        historyRetention: 90,
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
        historyRetention: 7,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await canUseCredits('no-credits-user', 'reading', 1)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('no_credits')
    })

    it('allows compatibility when within limit', async () => {
      const { canUseCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'compat-user',
        plan: 'pro',
        monthlyCredits: 80,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 2,
        followUpUsed: 0,
        compatibilityLimit: 5,
        followUpLimit: 5,
        historyRetention: 90,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await canUseCredits('compat-user', 'compatibility', 1)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })

    it('denies compatibility when limit reached', async () => {
      const { canUseCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'compat-limit-user',
        plan: 'pro',
        monthlyCredits: 80,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 5,
        followUpUsed: 0,
        compatibilityLimit: 5,
        followUpLimit: 5,
        historyRetention: 90,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await canUseCredits('compat-limit-user', 'compatibility', 1)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('compatibility_limit')
    })

    it('allows followUp when within limit', async () => {
      const { canUseCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'followup-user',
        plan: 'starter',
        monthlyCredits: 25,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 1,
        compatibilityLimit: 2,
        followUpLimit: 2,
        historyRetention: 30,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await canUseCredits('followup-user', 'followUp', 1)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0)
    })

    it('denies followUp when limit reached', async () => {
      const { canUseCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'followup-limit-user',
        plan: 'starter',
        monthlyCredits: 25,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 2,
        compatibilityLimit: 2,
        followUpLimit: 2,
        historyRetention: 30,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await canUseCredits('followup-limit-user', 'followUp', 1)

      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('followup_limit')
    })
  })

  describe('consumeCredits', () => {
    it('successfully consumes reading credits', async () => {
      const { consumeCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'consume-user',
        plan: 'pro',
        monthlyCredits: 80,
        usedCredits: 10,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 5,
        followUpLimit: 5,
        historyRetention: 90,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)
      mockPrisma.userCredits.update.mockResolvedValue({ ...mockCredits, usedCredits: 11 } as never)

      const result = await consumeCredits('consume-user', 'reading', 1)

      expect(result.success).toBe(true)
      expect(mockPrisma.userCredits.update).toHaveBeenCalled()
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
        historyRetention: 7,
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
        plan: 'pro',
        monthlyCredits: 80,
        usedCredits: 0,
        bonusCredits: 10,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 5,
        followUpLimit: 5,
        historyRetention: 90,
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

  describe('upgradePlan', () => {
    it('upgrades existing user to new plan', async () => {
      const { upgradePlan } = await import('@/lib/credits/creditService')

      const existingCredits = {
        userId: 'upgrade-user',
        plan: 'free',
        monthlyCredits: 7,
        usedCredits: 5,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 7,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(existingCredits as never)
      mockPrisma.userCredits.update.mockResolvedValue({
        ...existingCredits,
        plan: 'pro',
        monthlyCredits: 80,
        usedCredits: 0,
        compatibilityLimit: 5,
        followUpLimit: 5,
        historyRetention: 90,
      } as never)

      const result = await upgradePlan('upgrade-user', 'pro')

      expect(result.plan).toBe('pro')
      expect(result.monthlyCredits).toBe(80)
      expect(result.usedCredits).toBe(0) // Reset on upgrade
    })

    it('creates new credits for user without existing credits', async () => {
      const { upgradePlan } = await import('@/lib/credits/creditService')

      mockPrisma.userCredits.findUnique.mockResolvedValue(null)
      mockPrisma.userCredits.create.mockResolvedValue({
        userId: 'new-upgrade-user',
        plan: 'starter',
        monthlyCredits: 25,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 2,
        followUpLimit: 2,
        historyRetention: 30,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 30),
      } as never)

      const result = await upgradePlan('new-upgrade-user', 'starter')

      expect(result.plan).toBe('starter')
      expect(mockPrisma.userCredits.create).toHaveBeenCalled()
    })
  })

  describe('addBonusCredits', () => {
    it('adds bonus credits from purchase', async () => {
      const { addBonusCredits } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'bonus-add-user',
        plan: 'pro',
        monthlyCredits: 80,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 5,
        followUpLimit: 5,
        historyRetention: 90,
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
        monthlyCredits: 7,
        usedCredits: 0,
        bonusCredits: 5,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 7,
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
    it('returns true for available feature', async () => {
      const { canUseFeature } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'feature-user',
        plan: 'pro',
        monthlyCredits: 80,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 5,
        followUpLimit: 5,
        historyRetention: 90,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await canUseFeature('feature-user', 'fullSaju')

      expect(result).toBe(true)
    })

    it('returns false for unavailable feature', async () => {
      const { canUseFeature } = await import('@/lib/credits/creditService')

      const mockCredits = {
        userId: 'free-feature-user',
        plan: 'free',
        monthlyCredits: 7,
        usedCredits: 0,
        bonusCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        compatibilityLimit: 0,
        followUpLimit: 0,
        historyRetention: 7,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 86400000 * 15),
      }

      mockPrisma.userCredits.findUnique.mockResolvedValue(mockCredits as never)

      const result = await canUseFeature('free-feature-user', 'fullSaju')

      expect(result).toBe(false)
    })
  })
})
