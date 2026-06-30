/**
 * expireBonusCredits — 동시 cron 이중차감 레이스 방지(B-race) + B1 over-marking 회귀.
 *
 * 과거 구현은 상단 findMany 의 stale 값으로 차감액을 계산하고 무조건
 * `bonusCredits = GREATEST(0, bonusCredits - expiredAmount)` 를 실행해, 두 cron
 * 실행이 같은 stale 값을 둘 다 빼는 이중차감 + 중복 EXPIRE 감사행이 가능했다.
 *
 * 새 구현은 유저별 인터랙티브 트랜잭션에서 만료 대상 행을 FOR UPDATE 로 잠그고
 * 그 잠근 집합에서만 차감액·감사행을 만든다. 동시 실행은 잠금에서 직렬화되어
 * 두 번째 실행의 SELECT 는 빈 결과(이미 expired=true) → no-op.
 *
 * 잠근 집합은 SELECT 의 `remaining > 0` 필터로 0-remaining(소진/환불) 행을
 * 애초에 배제하므로 B1 over-marking 도 구조적으로 불가능하다.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { expireBonusCredits } from '@/lib/credits/creditService'

vi.mock('@/lib/db/prisma', () => {
  const tx = {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(() => Promise.resolve(1)),
    bonusCreditPurchase: { updateMany: vi.fn(() => Promise.resolve({ count: 0 })) },
    creditTransaction: { createMany: vi.fn(() => Promise.resolve({ count: 0 })) },
  }
  return {
    prisma: {
      bonusCreditPurchase: { findMany: vi.fn() },
      // 인터랙티브 트랜잭션 — 콜백에 tx 를 그대로 넘긴다.
      $transaction: vi.fn(async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx)),
      __tx: tx,
    },
  }
})

// 테스트에서 tx mock 에 접근하기 위한 핸들.
const tx = (
  prisma as unknown as {
    __tx: {
      $queryRaw: ReturnType<typeof vi.fn>
      $executeRaw: ReturnType<typeof vi.fn>
      bonusCreditPurchase: { updateMany: ReturnType<typeof vi.fn> }
      creditTransaction: { createMany: ReturnType<typeof vi.fn> }
    }
  }
).__tx

describe('expireBonusCredits — 이중차감 레이스 방지', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tx.$executeRaw.mockResolvedValue(1)
    tx.bonusCreditPurchase.updateMany.mockResolvedValue({ count: 0 })
    tx.creditTransaction.createMany.mockResolvedValue({ count: 0 })
  })

  it('잠근 집합으로만 차감/플립/감사하고, 차감액은 잠근 remaining 합계', async () => {
    ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { userId: 'user1' },
    ])
    // FOR UPDATE 가 잠근 현재값(2건, 합 8).
    tx.$queryRaw.mockResolvedValue([
      { id: 'p-a', remaining: 5 },
      { id: 'p-b', remaining: 3 },
    ])

    const result = await expireBonusCredits()

    // 플립은 잠근 id 들만 대상으로.
    expect(tx.bonusCreditPurchase.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['p-a', 'p-b'] } },
      data: { expired: true },
    })
    // 차감(executeRaw)·감사(createMany) 각각 1회, 감사행은 purchase 당 1행.
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1)
    expect(tx.creditTransaction.createMany).toHaveBeenCalledTimes(1)
    const auditData = (tx.creditTransaction.createMany.mock.calls[0][0] as { data: unknown[] }).data
    expect(auditData).toHaveLength(2)
    // 반환 totalCreditsExpired = 잠근 합계.
    expect(result.totalCreditsExpired).toBe(8)
    expect(result.totalUsers).toBe(1)
    expect(result.succeeded).toBe(1)
  })

  it('동시 실행으로 이미 처리돼 잠근 집합이 비면 no-op (이중차감/중복감사 없음)', async () => {
    ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { userId: 'user1' },
    ])
    // 다른 실행이 먼저 flip → 이 실행의 FOR UPDATE 는 빈 결과.
    tx.$queryRaw.mockResolvedValue([])

    const result = await expireBonusCredits()

    // 빈 집합 → 차감·플립·감사 전부 미실행.
    expect(tx.bonusCreditPurchase.updateMany).not.toHaveBeenCalled()
    expect(tx.$executeRaw).not.toHaveBeenCalled()
    expect(tx.creditTransaction.createMany).not.toHaveBeenCalled()
    expect(result.totalCreditsExpired).toBe(0)
  })

  it('worklist 는 distinct userId 로 뽑는다(유저당 1 트랜잭션)', async () => {
    ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { userId: 'u1' },
      { userId: 'u2' },
    ])
    tx.$queryRaw.mockResolvedValue([{ id: 'x', remaining: 1 }])

    await expireBonusCredits()

    // findMany 가 distinct:['userId'] 로 호출됐는지 확인.
    const findArgs = (prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as { distinct?: unknown }
    expect(findArgs.distinct).toEqual(['userId'])
    // 유저 2명 → 트랜잭션 2회.
    expect(prisma.$transaction as ReturnType<typeof vi.fn>).toHaveBeenCalledTimes(2)
  })
})
