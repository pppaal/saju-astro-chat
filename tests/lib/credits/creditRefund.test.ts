/**
 * Tests for src/lib/credits/creditRefund.ts
 * 크레딧 환불 서비스 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { refundCredits } from '@/lib/credits/creditRefund'

// Use vi.hoisted to avoid hoisting issues with vi.mock factory
const {
  mockFindUnique,
  mockUpdate,
  mockCreate,
  mockFindMany,
  mockBonusFindMany,
  mockBonusUpdateMany,
  mockExecuteRaw,
  mockCreditTxnCreate,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockBonusFindMany: vi.fn(),
  mockBonusUpdateMany: vi.fn(),
  mockExecuteRaw: vi.fn(),
  // CreditTransaction (REFUND/*) 한 줄을 같은 tx 안에서 emit.
  mockCreditTxnCreate: vi.fn(),
}))

const mockTx = {
  userCredits: {
    findUnique: mockFindUnique,
    update: mockUpdate,
  },
  bonusCreditPurchase: {
    findMany: mockBonusFindMany,
    updateMany: mockBonusUpdateMany,
  },
  creditRefundLog: {
    create: mockCreate,
  },
  creditTransaction: {
    create: mockCreditTxnCreate,
  },
  $executeRaw: mockExecuteRaw,
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
    creditRefundLog: {
      findMany: mockFindMany,
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('creditRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 기본: 환불 대상 사용자 row 만 존재, bonus purchase 없음 → reading 환불은
    // usedCredits raw SQL 한 줄로 끝남.
    mockFindUnique.mockResolvedValue({ userId: 'user_123' })
    mockBonusFindMany.mockResolvedValue([])
    mockBonusUpdateMany.mockResolvedValue({ count: 0 })
    mockExecuteRaw.mockResolvedValue(1)
    mockCreate.mockResolvedValue({})
    mockUpdate.mockResolvedValue({})
  })

  describe('refundCredits', () => {
    const baseParams = {
      userId: 'user_123',
      creditType: 'reading' as const,
      amount: 1,
      reason: 'ai_backend_timeout',
    }

    it('should refund reading credits via raw SQL (GREATEST floor 0) when no bonus pool', async () => {
      const result = await refundCredits(baseParams)

      expect(result).toBe(true)
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        select: { userId: true },
      })
      // bonus 풀이 비어 있으면 usedCredits 만 raw SQL 로 차감.
      expect(mockExecuteRaw).toHaveBeenCalled()
      // CreditRefundLog 제거(2026-06-06) 후 환불 기록은 CreditTransaction(REFUND)
      // 한 줄로 같은 tx 안에서 emit.
      expect(mockCreditTxnCreate).toHaveBeenCalled()
    })

    it('should refund compatibility credits via raw SQL', async () => {
      const result = await refundCredits({
        ...baseParams,
        creditType: 'compatibility',
      })

      expect(result).toBe(true)
      // compat 은 update() 대신 GREATEST raw SQL (atomic floor).
      expect(mockUpdate).not.toHaveBeenCalled()
      expect(mockExecuteRaw).toHaveBeenCalled()
    })

    it('should refund followUp credits via raw SQL', async () => {
      const result = await refundCredits({
        ...baseParams,
        creditType: 'followUp',
      })

      expect(result).toBe(true)
      expect(mockUpdate).not.toHaveBeenCalled()
      expect(mockExecuteRaw).toHaveBeenCalled()
    })

    it('should rely on SQL GREATEST to floor at 0 (no client-side clamp)', async () => {
      // amount > 현재 used 라도 client side Math.max 가 아니라 SQL GREATEST 가
      // 직접 처리 — race-safe.
      await refundCredits({ ...baseParams, amount: 5 })

      expect(mockExecuteRaw).toHaveBeenCalled()
    })

    it('should throw if UserCredits not found', async () => {
      mockFindUnique.mockResolvedValue(null)

      await expect(refundCredits(baseParams)).rejects.toThrow(
        'UserCredits not found for user: user_123'
      )
    })

    it('should re-throw errors from transaction', async () => {
      mockFindUnique.mockRejectedValue(new Error('DB connection error'))

      await expect(refundCredits(baseParams)).rejects.toThrow('DB connection error')
    })

    it('should restore bonus pool first when bonus purchase has capacity (B2)', async () => {
      // remaining=4, amount=5 → capacity 1. 1 단위 reading 환불 → 보너스 풀로
      // 복원. usedCredits raw SQL 은 호출되지 않아야 함.
      mockBonusFindMany.mockResolvedValue([{ id: 'purchase_1', amount: 5, remaining: 4 }])
      mockBonusUpdateMany.mockResolvedValue({ count: 1 })

      await refundCredits(baseParams)

      expect(mockBonusFindMany).toHaveBeenCalled()
      expect(mockBonusUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'purchase_1', expired: false }),
          data: { remaining: { increment: 1 } },
        })
      )
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        data: { bonusCredits: { increment: 1 } },
      })
      // 보너스 풀로 다 복원했으면 usedCredits raw SQL 은 호출되지 않음.
      expect(mockExecuteRaw).not.toHaveBeenCalled()
    })
  })
})
