/**
 * Charge↔activity link — consumeBonusCreditsFromPurchasesInTx 가 CONSUME 감사행에
 * 활동 링크(apiRoute/activityType/activityRef)를 박는지 검증.
 *
 * 목적: 사후 reconciliation 이 "크레딧은 차감됐는데 그 활동 레코드(세션/리딩)가
 * 없음" 을 정확히 잡으려면, 과금 시점에 이미 아는 활동 id 를 감사행에 남겨야 한다.
 * 링크가 없으면(종전 호출부) 메타는 종전과 동일해야 한다(하위호환).
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { consumeBonusCreditsFromPurchasesInTx } from '@/lib/credits/creditService'

type TxMock = {
  bonusCreditPurchase: { findMany: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn> }
  creditTransaction: { create: ReturnType<typeof vi.fn> }
}

let txMock: TxMock

function setupTx() {
  txMock = {
    bonusCreditPurchase: {
      findMany: vi.fn().mockResolvedValue([{ id: 'pur-1', remaining: 5 }]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    creditTransaction: { create: vi.fn().mockResolvedValue({}) },
  }
}

describe('consumeBonusCreditsFromPurchasesInTx — charge↔activity link', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupTx()
  })

  it('activity 링크를 CONSUME 감사행 metadata 에 박는다', async () => {
    const consumed = await consumeBonusCreditsFromPurchasesInTx(
      // @ts-expect-error — 테스트용 부분 TransactionClient mock.
      txMock,
      'user-1',
      1,
      {
        emitAudit: true,
        reason: 'consume_reading',
        activity: {
          apiRoute: 'counselor/realtime',
          activityType: 'counselor_session',
          activityRef: 'chat_abc',
        },
      }
    )

    expect(consumed).toBe(1)
    const data = txMock.creditTransaction.create.mock.calls[0][0].data
    expect(data.type).toBe('CONSUME')
    expect(data.metadata).toMatchObject({
      purchaseId: 'pur-1',
      drained: 1,
      apiRoute: 'counselor/realtime',
      activityType: 'counselor_session',
      activityRef: 'chat_abc',
    })
  })

  it('activity 없으면 종전 metadata 그대로(하위호환) — 링크 키 미포함', async () => {
    await consumeBonusCreditsFromPurchasesInTx(
      // @ts-expect-error — 테스트용 부분 TransactionClient mock.
      txMock,
      'user-1',
      1,
      { emitAudit: true, reason: 'consume_reading' }
    )
    const data = txMock.creditTransaction.create.mock.calls[0][0].data
    expect(data.metadata).toEqual({ purchaseId: 'pur-1', drained: 1 })
    expect(data.metadata).not.toHaveProperty('activityRef')
  })

  it('부분 링크(activityRef 만 비어있음)면 빈 키는 생략', async () => {
    await consumeBonusCreditsFromPurchasesInTx(
      // @ts-expect-error — 테스트용 부분 TransactionClient mock.
      txMock,
      'user-1',
      1,
      {
        emitAudit: true,
        activity: { apiRoute: 'tarot/interpret-stream', activityType: 'tarot_reading' },
      }
    )
    const data = txMock.creditTransaction.create.mock.calls[0][0].data
    expect(data.metadata).toMatchObject({
      apiRoute: 'tarot/interpret-stream',
      activityType: 'tarot_reading',
    })
    expect(data.metadata).not.toHaveProperty('activityRef')
  })
})
