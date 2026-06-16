/**
 * Tests for revokeBonusCreditPurchase in src/lib/credits/creditService.ts
 *
 * 회귀 가드 — PR #573이 도입한 Stripe charge.refunded webhook 처리
 * (사장님 개입 0 셀프 환불). 테스트가 빠져서 src/lib/credits/** 폴더
 * coverage가 84% 임계값 아래로 떨어졌고 unrelated PR들의 CI도 막혔다.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockFindFirst,
  mockUpdatePurchase,
  mockUpdateUserCredits,
  mockTransaction,
  mockCreditTxnCreate,
  mockExecuteRaw,
} = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockUpdatePurchase: vi.fn(),
  mockUpdateUserCredits: vi.fn(),
  mockTransaction: vi.fn(),
  // CreditTransaction (REVOKE/BONUS) 한 줄을 같은 transaction 배열에 추가.
  // 본 테스트는 노출 동작 (반환값 + transaction 호출 횟수) 만 검증한다.
  mockCreditTxnCreate: vi.fn(),
  mockExecuteRaw: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    bonusCreditPurchase: {
      findFirst: mockFindFirst,
      update: mockUpdatePurchase,
    },
    userCredits: {
      update: mockUpdateUserCredits,
    },
    creditTransaction: {
      create: mockCreditTxnCreate,
    },
    $transaction: mockTransaction,
    $executeRaw: mockExecuteRaw,
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

  it('flags DB errors with error:true so the webhook retries (no silent revenue loss)', async () => {
    // not-found/already-revoked 의 정상 {revoked:false} 와 달리, 진짜 DB 오류는
    // error:true 를 달아 webhook 이 "이미 회수됨(멱등)" 으로 오인하지 않고
    // 이벤트를 재시도하게 한다.
    mockFindFirst.mockRejectedValue(new Error('db down'))
    const result = await revokeBonusCreditPurchase('pi_error')
    expect(result).toEqual({ revoked: false, reclaimed: 0, alreadyUsed: 0, error: true })
  })
})
