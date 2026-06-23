/**
 * Shared refund primitive — claimBonusPurchaseForRefund / rollbackBonusPurchaseRefundClaim.
 *
 * me/refund-credit-pack 과 admin/refund-credit-pack 이 복붙해 갖고 있던 "현금 환불
 * 전 원자적 크레딧 회수 + 실패 시 롤백" 로직을 단일 출처로 흡수한 것. 한 군데만
 * 고치면 나머지에 같은 TOCTOU 가 남던 두더지잡기를 끝낸다. 불변식을 직접 단언.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

let txMock: {
  bonusCreditPurchase: { updateMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  $executeRaw: ReturnType<typeof vi.fn>
  creditTransaction: { create: ReturnType<typeof vi.fn> }
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    // 인터랙티브 트랜잭션 — 콜백을 txMock 으로 실행.
    $transaction: vi.fn(async (cb: (tx: typeof txMock) => unknown) => cb(txMock)),
  },
}))

import {
  claimBonusPurchaseForRefund,
  rollbackBonusPurchaseRefundClaim,
} from '@/lib/credits/creditService'

function setupTx(claimCount = 1) {
  txMock = {
    bonusCreditPurchase: {
      updateMany: vi.fn().mockResolvedValue({ count: claimCount }),
      update: vi.fn().mockResolvedValue({}),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
    creditTransaction: { create: vi.fn().mockResolvedValue({}) },
  }
}

const baseClaim = {
  purchaseId: 'p1',
  ownerUserId: 'user-1',
  amount: 100,
  expectedRemaining: 100,
  reason: 'self_refund',
  initiatedBy: 'self' as const,
  sourceRef: 'pi_1',
}

describe('claimBonusPurchaseForRefund', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupTx(1)
  })

  it('원자적 claim 성공 — 조건부 updateMany(remaining===expected && !expired) + 회수 + REVOKE', async () => {
    const res = await claimBonusPurchaseForRefund(baseClaim)

    expect(res).toEqual({ claimed: true, reclaimed: 100, alreadyUsed: 0 })
    expect(txMock.bonusCreditPurchase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'p1',
          userId: 'user-1',
          expired: false,
          remaining: 100,
        }),
        data: expect.objectContaining({ remaining: 0, expired: true }),
      })
    )
    // 잔액 회수(raw UPDATE) + REVOKE 원장.
    expect(txMock.$executeRaw).toHaveBeenCalledTimes(1)
    expect(txMock.creditTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'REVOKE', pool: 'BONUS', amount: -100 }),
      })
    )
  })

  it('TOCTOU — 그 사이 remaining 변동/이미 만료(count 0) 면 claimed:false, 회수 안 함', async () => {
    setupTx(0)
    const res = await claimBonusPurchaseForRefund(baseClaim)
    expect(res.claimed).toBe(false)
    expect(txMock.$executeRaw).not.toHaveBeenCalled()
    expect(txMock.creditTransaction.create).not.toHaveBeenCalled()
  })

  it('requireSourcePurchase=true 면 where 에 source:purchase 가드 추가(me/)', async () => {
    await claimBonusPurchaseForRefund({ ...baseClaim, requireSourcePurchase: true })
    expect(txMock.bonusCreditPurchase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ source: 'purchase' }) })
    )
  })

  it('미지정(admin) 이면 where 에 source 가드 없음', async () => {
    await claimBonusPurchaseForRefund(baseClaim)
    const where = txMock.bonusCreditPurchase.updateMany.mock.calls[0][0].where
    expect(where).not.toHaveProperty('source')
  })

  it('force 로 부분 사용 pack(expectedRemaining<amount) — reclaim/alreadyUsed 분리', async () => {
    const res = await claimBonusPurchaseForRefund({
      ...baseClaim,
      expectedRemaining: 70,
      reason: 'admin_refund',
      initiatedBy: 'admin',
      actorUserId: 'admin-1',
    })
    expect(res).toEqual({ claimed: true, reclaimed: 70, alreadyUsed: 30 })
    expect(txMock.bonusCreditPurchase.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ remaining: 70 }) })
    )
    // admin 메타에 adminUserId.
    const txData = txMock.creditTransaction.create.mock.calls[0][0].data
    expect(txData.metadata).toMatchObject({
      adminUserId: 'admin-1',
      reclaimed: 70,
      alreadyUsed: 30,
    })
  })

  it('expectedRemaining=0(이미 다 쓴 pack force 환불) — pack 만 만료, 잔액/원장 미변경', async () => {
    const res = await claimBonusPurchaseForRefund({ ...baseClaim, expectedRemaining: 0 })
    expect(res).toEqual({ claimed: true, reclaimed: 0, alreadyUsed: 100 })
    expect(txMock.bonusCreditPurchase.updateMany).toHaveBeenCalledTimes(1)
    expect(txMock.$executeRaw).not.toHaveBeenCalled()
    expect(txMock.creditTransaction.create).not.toHaveBeenCalled()
  })
})

describe('rollbackBonusPurchaseRefundClaim', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupTx(1)
  })

  it('pack 복원(remaining/expired/expiresAt) + 잔액 재지급 + GRANT 원장', async () => {
    const expiresAt = new Date('2026-09-01T00:00:00Z')
    await rollbackBonusPurchaseRefundClaim({
      purchaseId: 'p1',
      ownerUserId: 'user-1',
      reclaimed: 100,
      restoreRemaining: 100,
      restoreExpiresAt: expiresAt,
      reason: 'self_refund_rollback',
      initiatedBy: 'self',
      sourceRef: 'pi_1',
    })
    expect(txMock.bonusCreditPurchase.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { remaining: 100, expired: false, expiresAt },
    })
    expect(txMock.$executeRaw).toHaveBeenCalledTimes(1)
    expect(txMock.creditTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'GRANT', pool: 'BONUS', amount: 100 }),
      })
    )
  })

  it('reclaimed=0 이면 pack 만 복원하고 잔액/원장은 안 건드린다', async () => {
    await rollbackBonusPurchaseRefundClaim({
      purchaseId: 'p1',
      ownerUserId: 'user-1',
      reclaimed: 0,
      restoreRemaining: 0,
      restoreExpiresAt: new Date(),
      reason: 'admin_refund_rollback',
      initiatedBy: 'admin',
      sourceRef: 'pi_1',
    })
    expect(txMock.bonusCreditPurchase.update).toHaveBeenCalledTimes(1)
    expect(txMock.$executeRaw).not.toHaveBeenCalled()
    expect(txMock.creditTransaction.create).not.toHaveBeenCalled()
  })
})
