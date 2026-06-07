/**
 * B2 회귀 테스트 — 'reading' refund 가 보너스 풀로 결제됐던 건도 복원하는지
 * 확인.
 *
 * 이전 버그: refundCredits 가 creditType='reading' 일 때 무조건 usedCredits 만
 * 감소. 보너스로 결제된 리딩의 환불은 BonusCreditPurchase.remaining 복원이
 * 안 돼서 사용자 환불은 logged 되지만 실제 보너스 풀은 영원히 비어 있는
 * silent loss 발생.
 *
 * fix: refundCredits('reading') 가 reverse-FIFO 로 보너스 풀에 복원 가능한
 * capacity 만큼 우선 복원 → 남은 분만 usedCredits 감소. cap: 각 purchase 의
 * `amount` 를 절대 초과하지 않도록 조건부 update.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { refundCredits } from '@/lib/credits/creditRefund'

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
  // CreditTransaction (REFUND/BONUS|MONTHLY) audit row — 본 테스트는 보너스
  // 복원/usedCredits fallback 동작만 검증, noop 으로 충분.
  mockCreditTxnCreate: vi.fn(),
}))

const mockTx = {
  userCredits: { findUnique: mockFindUnique, update: mockUpdate },
  bonusCreditPurchase: { findMany: mockBonusFindMany, updateMany: mockBonusUpdateMany },
  creditTransaction: { create: mockCreditTxnCreate },
  $executeRaw: mockExecuteRaw,
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<void>) => fn(mockTx)),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

describe('creditRefund — bonus pool restoration (B2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue({ userId: 'user_1' })
    mockBonusUpdateMany.mockResolvedValue({ count: 1 })
    mockUpdate.mockResolvedValue({})
    mockExecuteRaw.mockResolvedValue(1)
  })

  it('restores bonus pool when purchase has spare capacity (remaining = amount - 1)', async () => {
    // 핵심 시나리오: amount=10, remaining=9 (1 사용된 상태).
    // reading 1 단위 환불 → BonusCreditPurchase.remaining 이 10 으로 복원,
    // UserCredits.bonusCredits 도 1 증가. usedCredits 는 변경 없음.
    mockBonusFindMany.mockResolvedValue([
      { id: 'purchase_1', amount: 10, remaining: 9 },
    ])

    await refundCredits({
      userId: 'user_1',
      creditType: 'reading',
      amount: 1,
      reason: 'ai_backend_timeout',
    })

    // BonusCreditPurchase.remaining +1, amount 를 초과하지 않도록 조건부.
    expect(mockBonusUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'purchase_1',
          // 절대값 가드: remaining <= amount - restore (즉 9 이하).
          remaining: { lte: 9 },
          expired: false,
        }),
        data: { remaining: { increment: 1 } },
      })
    )
    // UserCredits.bonusCredits +1 (invariant 유지).
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      data: { bonusCredits: { increment: 1 } },
    })
    // 모든 amount 가 보너스로 복원됐으므로 usedCredits raw SQL 은 호출 X.
    expect(mockExecuteRaw).not.toHaveBeenCalled()
  })

  it('orders candidates by expiresAt DESC (reverse-FIFO — restore most-recently-consumed first)', async () => {
    mockBonusFindMany.mockResolvedValue([])

    await refundCredits({
      userId: 'user_1',
      creditType: 'reading',
      amount: 1,
      reason: 'test',
    })

    expect(mockBonusFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { expiresAt: 'desc' },
      })
    )
  })

  it('falls through to usedCredits decrement when no bonus purchase has spare capacity', async () => {
    // 모든 purchase 가 remaining == amount (사용된 적 없음) → capacity 0 → skip.
    mockBonusFindMany.mockResolvedValue([
      { id: 'purchase_full', amount: 5, remaining: 5 },
    ])

    await refundCredits({
      userId: 'user_1',
      creditType: 'reading',
      amount: 1,
      reason: 'test',
    })

    expect(mockBonusUpdateMany).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockExecuteRaw).toHaveBeenCalled()
  })

  it('falls through to usedCredits when no bonus purchase rows exist', async () => {
    mockBonusFindMany.mockResolvedValue([])

    await refundCredits({
      userId: 'user_1',
      creditType: 'reading',
      amount: 2,
      reason: 'test',
    })

    expect(mockBonusUpdateMany).not.toHaveBeenCalled()
    expect(mockExecuteRaw).toHaveBeenCalled()
  })

  it('splits across bonus restore + usedCredits when bonus capacity is partial', async () => {
    // amount=5 환불, 보너스 capacity 는 2 만 있음. 2 는 보너스, 3 은 usedCredits.
    mockBonusFindMany.mockResolvedValue([
      { id: 'purchase_a', amount: 10, remaining: 8 }, // capacity 2
    ])

    await refundCredits({
      userId: 'user_1',
      creditType: 'reading',
      amount: 5,
      reason: 'test',
    })

    // 보너스 2 복원
    expect(mockBonusUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { remaining: { increment: 2 } },
      })
    )
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      data: { bonusCredits: { increment: 2 } },
    })
    // 나머지 3 은 usedCredits 로
    expect(mockExecuteRaw).toHaveBeenCalled()
  })

  it('writes the REFUND audit row (pool=BONUS) when fully restored to bonus pool', async () => {
    // CreditRefundLog 제거(2026-06-06) — 감사는 CreditTransaction(type=REFUND).
    // 보너스 풀 복원 시 pool=BONUS, sourceRef=purchase.id.
    mockBonusFindMany.mockResolvedValue([
      { id: 'p1', amount: 5, remaining: 4 },
    ])

    await refundCredits({
      userId: 'user_1',
      creditType: 'reading',
      amount: 1,
      reason: 'ai_backend_timeout',
      apiRoute: '/api/tarot/chat',
    })

    expect(mockCreditTxnCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user_1',
        type: 'REFUND',
        pool: 'BONUS',
        amount: 1,
        reason: 'ai_backend_timeout',
        sourceRef: 'p1',
      }),
    })
  })

  it('does not restore to expired purchases (filtered by where)', async () => {
    mockBonusFindMany.mockResolvedValue([])

    await refundCredits({
      userId: 'user_1',
      creditType: 'reading',
      amount: 1,
      reason: 'test',
    })

    // findMany where: expired=false + expiresAt > now
    const call = mockBonusFindMany.mock.calls[0][0]
    expect(call.where.expired).toBe(false)
    expect(call.where.expiresAt).toEqual({ gt: expect.any(Date) })
  })
})
