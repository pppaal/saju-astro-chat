/**
 * sweepExpiredIdempotency — 만료된 멱등/취소-큐 행 batch 삭제 회귀.
 *
 * 스키마 주석은 "cron 으로 정리"라 약속했지만 실제 sweep 이 없어 RequestIdempotencyLog
 * 가 유료 turn 마다 영구 누적됐다. 만료(expiresAt<now)분만 지우고, 크레딧 풀
 * (BonusCreditPurchase)은 절대 건드리지 않음을 잠근다.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockIdemDelete = vi.fn()
const mockRevocationDelete = vi.fn()
const mockBonusDelete = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    requestIdempotencyLog: { deleteMany: (...a: unknown[]) => mockIdemDelete(...a) },
    pendingCreditRevocation: { deleteMany: (...a: unknown[]) => mockRevocationDelete(...a) },
    bonusCreditPurchase: { deleteMany: (...a: unknown[]) => mockBonusDelete(...a) },
  },
}))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { sweepExpiredIdempotency } from '@/lib/credits/sweepExpiredIdempotency'

beforeEach(() => {
  vi.clearAllMocks()
  mockIdemDelete.mockResolvedValue({ count: 7 })
  mockRevocationDelete.mockResolvedValue({ count: 2 })
})

describe('sweepExpiredIdempotency', () => {
  it('만료분(expiresAt < now)만 두 테이블에서 지운다', async () => {
    const now = new Date('2026-06-21T00:00:00Z')
    const res = await sweepExpiredIdempotency(now)
    expect(res).toEqual({ idempotencyDeleted: 7, revocationDeleted: 2 })
    expect(mockIdemDelete).toHaveBeenCalledWith({ where: { expiresAt: { lt: now } } })
    expect(mockRevocationDelete).toHaveBeenCalledWith({ where: { expiresAt: { lt: now } } })
  })

  it('크레딧 풀(BonusCreditPurchase)은 절대 삭제하지 않는다', async () => {
    await sweepExpiredIdempotency(new Date())
    expect(mockBonusDelete).not.toHaveBeenCalled()
  })

  it('한 테이블 삭제 실패해도 다른 테이블은 진행(에러 삼킴, count 0)', async () => {
    mockIdemDelete.mockRejectedValueOnce(new Error('db blip'))
    const res = await sweepExpiredIdempotency(new Date())
    expect(res.idempotencyDeleted).toBe(0)
    expect(res.revocationDeleted).toBe(2)
  })
})
