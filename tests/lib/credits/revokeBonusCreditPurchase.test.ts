/**
 * Tests for revokeBonusCreditPurchase in src/lib/credits/creditService.ts
 *
 * 회귀 가드 — PR #573이 도입한 Stripe charge.refunded webhook 처리
 * (사장님 개입 0 셀프 환불). 테스트가 빠져서 src/lib/credits/** 폴더
 * coverage가 84% 임계값 아래로 떨어졌고 unrelated PR들의 CI도 막혔다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFindFirst, mockUpdatePurchase, mockUpdateUserCredits, mockTransaction } = vi.hoisted(
  () => ({
    mockFindFirst: vi.fn(),
    mockUpdatePurchase: vi.fn(),
    mockUpdateUserCredits: vi.fn(),
    mockTransaction: vi.fn(),
  })
)

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    bonusCreditPurchase: {
      findFirst: mockFindFirst,
      update: mockUpdatePurchase,
    },
    userCredits: {
      update: mockUpdateUserCredits,
    },
    $transaction: mockTransaction,
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

import { revokeBonusCreditPurchase } from '@/lib/credits/creditService'

describe('revokeBonusCreditPurchase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation(async (ops: unknown[]) => ops)
  })

  it('returns no-op for empty stripePaymentId (defensive guard)', async () => {
    const result = await revokeBonusCreditPurchase('')
    expect(result).toEqual({ revoked: false, reclaimed: 0, alreadyUsed: 0 })
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('returns no-op when no purchase found for the payment ID', async () => {
    mockFindFirst.mockResolvedValue(null)
    const result = await revokeBonusCreditPurchase('pi_unknown')
    expect(result).toEqual({ revoked: false, reclaimed: 0, alreadyUsed: 0 })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('is idempotent — already-expired purchase reports alreadyUsed only', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'bp_1',
      userId: 'user_a',
      stripePaymentId: 'pi_dup',
      amount: 10,
      remaining: 0,
      expired: true,
    })
    const result = await revokeBonusCreditPurchase('pi_dup')
    expect(result).toEqual({ revoked: false, reclaimed: 0, alreadyUsed: 10 })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('revokes remaining credits and marks the purchase expired', async () => {
    mockFindFirst.mockResolvedValue({
      id: 'bp_2',
      userId: 'user_b',
      stripePaymentId: 'pi_refund',
      amount: 10,
      remaining: 7,
      expired: false,
    })
    const result = await revokeBonusCreditPurchase('pi_refund')
    expect(result).toEqual({ revoked: true, reclaimed: 7, alreadyUsed: 3 })
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })

  it('swallows DB errors and returns safe no-op (webhook safety)', async () => {
    mockFindFirst.mockRejectedValue(new Error('db down'))
    const result = await revokeBonusCreditPurchase('pi_error')
    expect(result).toEqual({ revoked: false, reclaimed: 0, alreadyUsed: 0 })
  })
})
