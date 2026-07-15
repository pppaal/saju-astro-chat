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
      // 월간 풀 차감은 이제 조건부 updateMany — 기본은 1행 갱신(가드 통과).
      updateMany: vi.fn(async () => ({ count: 1 })),
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
    $queryRaw: vi.fn(),
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
    // expireBonusCredits 의 FOR UPDATE select 기본값 — 빈 집합(no-op). 개별
    // 테스트가 override. 기본을 안 두면 locked.reduce 가 undefined 에서 터진다.
    ;(prisma.$queryRaw as ReturnType<typeof vi.fn>).mockResolvedValue([])
    // getCreditBalance 가 getValidBonusCredits(유효 purchase 합)도 조회한다 —
    // 기본은 빈 집합(유효 크레딧 0). 잔액>0 을 기대하는 테스트는 counter 와
    // 일치하는 purchase 행을 직접 mock 한다.
    ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
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
        bonusCredits: 5,
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
            bonusCredits: 5,
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

    // (옛 "should reset period if expired" 제거 — 월간 충전 모델 폐지로
    //  getUserCredits 의 기간 만료 리셋 로직이 제거됨.)
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
      ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { remaining: 5 },
      ])

      const balance = await getCreditBalance(mockUserId)

      // bonus-only — frozen monthly/used(10/3)는 무시, bonusCredits(5)만 잔액.
      expect(balance.remainingCredits).toBe(5)
    })

    it('만료됐지만 cron 이 아직 안 돈 크레딧은 잔액에서 제외한다 (유령 크레딧 차단)', async () => {
      // 카운터(bonusCredits=5)는 아직 만료 미반영, 유효 purchase 는 0 —
      // 차감(consume)이 불가능한 상태이므로 표시/게이트도 0 이어야 한다.
      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 5,
        compatibilityUsed: 0,
        compatibilityLimit: 0,
        followUpUsed: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodEnd: new Date('2024-02-01'),
      })
      ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const balance = await getCreditBalance(mockUserId)
      expect(balance.remainingCredits).toBe(0)

      const gate = await canUseCredits(mockUserId, 'reading', 1)
      expect(gate.allowed).toBe(false)
      expect(gate.reason).toBe('no_credits')
    })

    it('잔액은 bonus-only — frozen monthly/used 를 무시한다 (canUseCredits 정합)', () => {
      return (async () => {
        ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
          userId: mockUserId,
          plan: 'free',
          monthlyCredits: 99, // frozen — 잔액에 안 더해짐
          usedCredits: 0,
          bonusCredits: 7,
          totalBonusReceived: 7,
          compatibilityUsed: 0,
          compatibilityLimit: 0,
          followUpUsed: 0,
          followUpLimit: 0,
          historyRetention: 365,
          periodEnd: new Date('2024-02-01'),
        })
        ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
          { remaining: 7 },
        ])
        const balance = await getCreditBalance(mockUserId)
        expect(balance.remainingCredits).toBe(7)
        expect(balance.totalCredits).toBe(7)
      })()
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

      // bonus-only — totalBonusReceived(20)만, frozen monthly(30)는 제외.
      expect(balance.totalCredits).toBe(20)
    })
  })

  describe('canUseCredits', () => {
    it('should allow reading with sufficient credits', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 5,
        compatibilityUsed: 0,
        compatibilityLimit: 0,
        followUpUsed: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)
      ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { remaining: 5 },
      ])

      const result = await canUseCredits(mockUserId, 'reading', 3)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2) // bonus 5 - 3
    })

    it('should deny reading with insufficient credits', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 1,
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
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 10,
        compatibilityUsed: 99,
        compatibilityLimit: 0,
        followUpUsed: 0,
        followUpLimit: 0,
        historyRetention: 365,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)
      ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { remaining: 10 },
      ])

      const result = await canUseCredits(mockUserId, 'compatibility', 1)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9) // 10 - 1, ignores compatibilityUsed
    })

    it('should treat followUp as general credit', async () => {
      const mockCredits = {
        userId: mockUserId,
        plan: 'free',
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 30,
        compatibilityUsed: 0,
        compatibilityLimit: 0,
        followUpUsed: 99,
        followUpLimit: 0,
        historyRetention: 365,
        periodEnd: new Date('2024-02-01'),
      }

      ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCredits)
      ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { remaining: 30 },
      ])

      const result = await canUseCredits(mockUserId, 'followUp', 2)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(28) // 30 - 2, ignores followUpUsed
    })
  })

  describe('consumeCredits', () => {
    it('should consume reading credits from purchased balance', async () => {
      const mockCredits = {
        userId: mockUserId,
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 5,
      }

      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
        callback({
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockCredits),
            update: vi.fn().mockResolvedValue({}),
          },
          bonusCreditPurchase: {
            findMany: vi
              .fn()
              .mockResolvedValue([{ id: 'p1', remaining: 5, expiresAt: new Date('2099-01-01') }]),
            update: vi.fn().mockResolvedValue({}),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 10,
      }

      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) =>
        callback({
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockCredits),
            update: vi.fn().mockResolvedValue({}),
          },
          bonusCreditPurchase: {
            findMany: vi
              .fn()
              .mockResolvedValue([{ id: 'p1', remaining: 10, expiresAt: new Date('2099-01-01') }]),
            update: vi.fn().mockResolvedValue({}),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
        monthlyCredits: 0,
        usedCredits: 0,
        bonusCredits: 1,
      }

      ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback) => {
        const tx = {
          userCredits: {
            findUnique: vi.fn().mockResolvedValue(mockCredits),
            update: vi.fn().mockResolvedValue({}),
          },
          bonusCreditPurchase: {
            findMany: vi
              .fn()
              .mockResolvedValue([{ id: 'p1', remaining: 1, expiresAt: new Date('2099-01-01') }]),
            update: vi.fn().mockResolvedValue({}),
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
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
      // worklist: 두 유저(findMany 는 distinct userId 행을 돌려준다).
      ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { userId: 'user1' },
        { userId: 'user2' },
      ])
      // 각 유저의 FOR UPDATE select 가 잠근 현재값 — user1:5, user2:3 (합 8).
      ;(prisma.$queryRaw as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ id: 'p1', remaining: 5 }])
        .mockResolvedValueOnce([{ id: 'p2', remaining: 3 }])

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

      // expireBonusCredits fan-outs per-user transactions with a bounded
      // concurrency pool and retries each rejected user once. Drive it at the
      // $transaction level: user1's tx resolves; user2's tx rejects on both the
      // initial pass and the single retry. Call order is deterministic — user1
      // (idx 0) is invoked before user2 (idx 1), then the retry re-runs user2.
      ;(prisma.$transaction as ReturnType<typeof vi.fn>)
        .mockReset()
        .mockResolvedValueOnce(5) // user1 — ok
        .mockRejectedValueOnce(new Error('DB error')) // user2 — initial fail
        .mockRejectedValueOnce(new Error('DB error')) // user2 — retry fail

      // retryBackoffMs=0 — 테스트에서 실제 타이머 없이 즉시 재시도(가짜 타이머 회피).
      const result = await expireBonusCredits(0)

      expect(result.succeeded).toBe(1)
      expect(result.failed).toBe(1)
    })
  })

  // (옛 resetMonthlyCredits describe 블록 제거 — 월간 충전 모델 폐지로 함수 삭제됨.)

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
