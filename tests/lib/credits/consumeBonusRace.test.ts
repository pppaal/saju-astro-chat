/**
 * consumeBonusCreditsFromPurchasesInTx race-safety + over-consumption 회귀.
 *
 * 옛 버그 1 (race): `update` 절대값 write 가 두 동시 트랜잭션에서 같은
 *   `remaining=5` 읽고 둘 다 `remaining=4` write → 차감 1번 누락.
 *   수정: `updateMany` + relative decrement + `remaining >= toConsume` guard.
 *
 * 옛 버그 2 (over-consumption): `consumeCredits` 가 stale `bonusCredits`
 *   캐시를 사용해 부족분을 silent 하게 monthly 로 넘김 → monthly 가 음수로
 *   침범 가능. 수정: 실제 monthly 잔액 검증 후 부족하면 throw.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockUpdateMany = vi.fn()
const mockFindMany = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    bonusCreditPurchase: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
    creditTransaction: { create: (...args: unknown[]) => mockCreate(...args) },
    $transaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        bonusCreditPurchase: {
          findMany: (...args: unknown[]) => mockFindMany(...args),
          updateMany: (...args: unknown[]) => mockUpdateMany(...args),
        },
        creditTransaction: { create: (...args: unknown[]) => mockCreate(...args) },
      }),
  },
}))

vi.mock('@/lib/cache/redis-cache', () => ({ invalidateCachePattern: vi.fn() }))

describe('consumeBonusCreditsFromPurchasesInTx race-safety', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updateMany 가 race-safe relative decrement + remaining guard 사용', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'p1', remaining: 5, expired: false, expiresAt: new Date(Date.now() + 86400000) },
    ])
    mockUpdateMany.mockResolvedValue({ count: 1 })

    const { consumeBonusCreditsFromPurchasesInTx } = await import('@/lib/credits/creditService')
    const fakeTx = {
      bonusCreditPurchase: { findMany: mockFindMany, updateMany: mockUpdateMany },
      creditTransaction: { create: mockCreate },
    } as never

    const consumed = await consumeBonusCreditsFromPurchasesInTx(fakeTx, 'u1', 3)
    expect(consumed).toBe(3)

    // race-safe pattern 확인: updateMany + remaining gte guard + decrement.
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'p1',
          remaining: { gte: 3 },
        }),
        data: expect.objectContaining({
          remaining: { decrement: 3 },
        }),
      })
    )
  })

  it('race 발생 (updateMany count=0) → 그 purchase skip + totalConsumed 미증가', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'p1', remaining: 5, expired: false, expiresAt: new Date(Date.now() + 86400000) },
      { id: 'p2', remaining: 10, expired: false, expiresAt: new Date(Date.now() + 86400000) },
    ])
    // p1 은 race (다른 tx 가 이미 차감) → count 0. p2 정상.
    mockUpdateMany
      .mockResolvedValueOnce({ count: 0 }) // p1 race
      .mockResolvedValueOnce({ count: 1 }) // p2 OK

    const { consumeBonusCreditsFromPurchasesInTx } = await import('@/lib/credits/creditService')
    const fakeTx = {
      bonusCreditPurchase: { findMany: mockFindMany, updateMany: mockUpdateMany },
      creditTransaction: { create: mockCreate },
    } as never

    // amount 5 요청. p1 race → skip. p2 에서 5 차감.
    const consumed = await consumeBonusCreditsFromPurchasesInTx(fakeTx, 'u1', 5)
    expect(consumed).toBe(5)
    expect(mockUpdateMany).toHaveBeenCalledTimes(2)
  })
})
