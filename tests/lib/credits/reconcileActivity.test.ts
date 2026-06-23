/**
 * 과금↔활동 reconciliation — findOrphanedCharges.
 * "차감됐는데 활동 레코드 없음" 을 정확히 잡고, 링크 없는 과금/존재하는 활동은
 * 고아로 오인하지 않는지 검증.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    creditTransaction: { findMany: vi.fn() },
    counselorChatSession: { findMany: vi.fn() },
    tarotReading: { findMany: vi.fn() },
  },
}))

import { prisma } from '@/lib/db/prisma'
import { findOrphanedCharges } from '@/lib/credits/reconcileActivity'

const consume = (
  id: string,
  metadata: Record<string, unknown> | null,
  over: Partial<{ userId: string; amount: number; createdAt: Date }> = {}
) => ({
  id,
  userId: over.userId ?? 'user-1',
  createdAt: over.createdAt ?? new Date('2026-06-19T00:00:00Z'),
  amount: over.amount ?? -1,
  metadata,
})

const mockTxns = (rows: unknown[]) =>
  (prisma.creditTransaction.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(rows)
const mockCounselor = (ids: string[]) =>
  (prisma.counselorChatSession.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
    ids.map((id) => ({ id }))
  )
const mockTarot = (ids: string[]) =>
  (prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
    ids.map((id) => ({ id }))
  )

const since = new Date('2026-06-13T00:00:00Z')

describe('findOrphanedCharges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCounselor([])
    mockTarot([])
  })

  it('활동 레코드가 존재하면 고아 아님', async () => {
    mockTxns([
      consume('t1', {
        activityType: 'counselor_session',
        activityRef: 'chat_1',
        apiRoute: 'counselor/realtime',
      }),
      consume('t2', { activityType: 'tarot_reading', activityRef: 'tr_1' }),
    ])
    mockCounselor(['chat_1'])
    mockTarot(['tr_1'])

    const res = await findOrphanedCharges({ since })
    expect(res.scanned).toBe(2)
    expect(res.linked).toBe(2)
    expect(res.orphaned).toEqual([])
  })

  it('활동 레코드가 없으면 고아 과금으로 보고', async () => {
    mockTxns([
      consume('t1', {
        activityType: 'counselor_session',
        activityRef: 'chat_missing',
        apiRoute: 'counselor/realtime',
      }),
      consume('t2', { activityType: 'tarot_reading', activityRef: 'tr_ok' }),
    ])
    mockCounselor([]) // chat_missing 없음
    mockTarot(['tr_ok'])

    const res = await findOrphanedCharges({ since })
    expect(res.linked).toBe(2)
    expect(res.orphaned).toHaveLength(1)
    expect(res.orphaned[0]).toMatchObject({
      transactionId: 't1',
      activityType: 'counselor_session',
      activityRef: 'chat_missing',
      apiRoute: 'counselor/realtime',
    })
  })

  it('링크 없는 과금(메타 없음/activityRef 없음)은 linked 에서 제외, 고아 아님', async () => {
    mockTxns([
      consume('t1', null), // 레거시 — 메타 없음
      consume('t2', { purchaseId: 'p', drained: 1 }), // 링크 키 없음
      consume('t3', { activityType: 'tarot_reading' }), // activityRef 없음
    ])
    const res = await findOrphanedCharges({ since })
    expect(res.scanned).toBe(3)
    expect(res.linked).toBe(0)
    expect(res.orphaned).toEqual([])
  })

  it('compat_session 은 counselorChatSession, tarot_followup 은 tarotReading 으로 조회', async () => {
    mockTxns([
      consume('t1', { activityType: 'compat_session', activityRef: 'compat_1' }),
      consume('t2', { activityType: 'tarot_followup', activityRef: 'tr_parent' }),
    ])
    mockCounselor(['compat_1']) // 존재
    mockTarot([]) // tr_parent 없음 → 고아

    const res = await findOrphanedCharges({ since })
    // counselor 테이블은 compat_1 로 조회됐어야.
    expect(prisma.counselorChatSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['compat_1'] } } })
    )
    expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['tr_parent'] } } })
    )
    expect(res.orphaned.map((o) => o.activityRef)).toEqual(['tr_parent'])
  })

  it('알 수 없는 activityType 은 무시(향후 오타/오염 방어)', async () => {
    mockTxns([consume('t1', { activityType: 'bogus', activityRef: 'x' })])
    const res = await findOrphanedCharges({ since })
    expect(res.linked).toBe(0)
    expect(res.orphaned).toEqual([])
  })

  it('until 주면 createdAt 범위 필터에 반영', async () => {
    mockTxns([])
    const until = new Date('2026-06-20T00:00:00Z')
    await findOrphanedCharges({ since, until })
    expect(prisma.creditTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'CONSUME',
          createdAt: { gte: since, lte: until },
        }),
      })
    )
  })
})
