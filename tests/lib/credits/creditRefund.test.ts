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
  mockBonusFindMany,
  mockBonusUpdateMany,
  mockExecuteRaw,
  mockCreditTxnCreate,
} = vi.hoisted(() => ({
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockBonusFindMany: vi.fn(),
  mockBonusUpdateMany: vi.fn(),
  mockExecuteRaw: vi.fn(),
  // CreditTransaction (REFUND/*) 한 줄을 같은 tx 안에서 emit.
  // CreditRefundLog 제거(2026-06-06) — 환불 감사는 이 row 가 SSOT.
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
  creditTransaction: {
    create: mockCreditTxnCreate,
  },
  $executeRaw: mockExecuteRaw,
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
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
    mockCreditTxnCreate.mockResolvedValue({})
    mockUpdate.mockResolvedValue({})
  })

  describe('refundCredits', () => {
    const baseParams = {
      userId: 'user_123',
      creditType: 'reading' as const,
      amount: 1,
      reason: 'ai_backend_timeout',
    }

    it('reading refund with no restorable bonus pool restores nothing (no monthly fallback)', async () => {
      const result = await refundCredits(baseParams)

      expect(result).toBe(true)
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        select: { userId: true },
      })
      // 월간 충전 모델 폐지 → usedCredits raw SQL fallback 도, MONTHLY 감사 row 도
      // 없다. 복원할 보너스 lot 이 없으면 (drone: 만료 등) 아무것도 되돌리지 않고
      // 경고 로그만 남긴다.
      expect(mockExecuteRaw).not.toHaveBeenCalled()
      expect(mockCreditTxnCreate).not.toHaveBeenCalled()
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

    // (옛 "should rely on SQL GREATEST to floor at 0" 제거 — reading 환불의
    //  usedCredits raw SQL 경로가 월간 모델 폐지로 사라짐.)

    it('should throw if UserCredits not found', async () => {
      mockFindUnique.mockResolvedValue(null)

      await expect(refundCredits(baseParams)).rejects.toThrow(
        'UserCredits not found for user: user_123'
      )
    })

    it('should record apiRoute + transactionId in the REFUND audit row', async () => {
      // 보너스 풀로 복원될 때 REFUND/BONUS 감사 row 가 생성되고, sourceRef 는
      // purchase.id, metadata 에 apiRoute·transactionId 가 들어간다.
      mockBonusFindMany.mockResolvedValue([{ id: 'p1', amount: 5, remaining: 4 }])
      mockBonusUpdateMany.mockResolvedValue({ count: 1 })

      await refundCredits({
        ...baseParams,
        apiRoute: '/api/tarot/chat',
        transactionId: 'tx_abc',
      })

      const createCallData = mockCreditTxnCreate.mock.calls[0][0].data
      expect(createCallData.type).toBe('REFUND')
      expect(createCallData.pool).toBe('BONUS')
      expect(createCallData.sourceRef).toBe('p1')
      expect(createCallData.metadata).toEqual(
        expect.objectContaining({ apiRoute: '/api/tarot/chat', transactionId: 'tx_abc' })
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
