/**
 * dataRetention — 무한 증식 테이블 보존기간 스윕 테스트.
 *
 * 계약: ① 보존기간이 지난 행만 대상으로 삼고(경계 where 검증) ② id 배치로
 * 지우며 배치 캡을 지키고 ③ 테이블별로 fail-soft(한 테이블 실패가 다른
 * 테이블 스윕을 막지 않음) ④ NatalContextCache 는 현행 엔진 버전을 지우지
 * 않는다(옛 버전 고아만).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockFindMany = {
  pageView: vi.fn(),
  calendarBuildCache: vi.fn(),
  natalContextCache: vi.fn(),
  sharedResult: vi.fn(),
  stripeEventLog: vi.fn(),
}
const mockDeleteMany = {
  pageView: vi.fn(),
  calendarBuildCache: vi.fn(),
  natalContextCache: vi.fn(),
  sharedResult: vi.fn(),
  stripeEventLog: vi.fn(),
}
const mockQueryRawUnsafe = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $queryRawUnsafe: (...a: unknown[]) => mockQueryRawUnsafe(...a),
    pageView: {
      findMany: (...a: unknown[]) => mockFindMany.pageView(...a),
      deleteMany: (...a: unknown[]) => mockDeleteMany.pageView(...a),
    },
    calendarBuildCache: {
      findMany: (...a: unknown[]) => mockFindMany.calendarBuildCache(...a),
      deleteMany: (...a: unknown[]) => mockDeleteMany.calendarBuildCache(...a),
    },
    natalContextCache: {
      findMany: (...a: unknown[]) => mockFindMany.natalContextCache(...a),
      deleteMany: (...a: unknown[]) => mockDeleteMany.natalContextCache(...a),
    },
    sharedResult: {
      findMany: (...a: unknown[]) => mockFindMany.sharedResult(...a),
      deleteMany: (...a: unknown[]) => mockDeleteMany.sharedResult(...a),
    },
    stripeEventLog: {
      findMany: (...a: unknown[]) => mockFindMany.stripeEventLog(...a),
      deleteMany: (...a: unknown[]) => mockDeleteMany.stripeEventLog(...a),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { sweepDataRetention, RETENTION } from '@/lib/db/dataRetention'
import { CALENDAR_ENGINE_VERSION } from '@/lib/calendar-engine/persistence'

const NOW = new Date('2026-07-05T00:00:00Z')
const DAY_MS = 86_400_000

function ids(n: number, prefix: string) {
  return Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}` }))
}

beforeEach(() => {
  for (const m of Object.values(mockFindMany)) m.mockReset().mockResolvedValue([])
  for (const m of Object.values(mockDeleteMany)) m.mockReset().mockResolvedValue({ count: 0 })
  mockQueryRawUnsafe.mockReset().mockResolvedValue([])
})

describe('sweepDataRetention', () => {
  it('PageView — 보존기간 경계(cutoff) 이전 행만 지운다', async () => {
    mockFindMany.pageView.mockResolvedValueOnce(ids(3, 'pv')).mockResolvedValue([])
    mockDeleteMany.pageView.mockResolvedValue({ count: 3 })

    const r = await sweepDataRetention(NOW)

    const cutoff = new Date(NOW.getTime() - RETENTION.pageViewDays * DAY_MS)
    expect(mockFindMany.pageView).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdAt: { lt: cutoff } }, select: { id: true } })
    )
    expect(mockDeleteMany.pageView).toHaveBeenCalledWith({
      where: { id: { in: ['pv0', 'pv1', 'pv2'] } },
    })
    expect(r.pageViewsDeleted).toBe(3)
  })

  it('배치 캡 — 가득 찬 배치가 계속 나와도 maxBatches(20)에서 멈춘다', async () => {
    // 매 pick 이 5000개 풀배치 → 캡까지만 돌고 종료(다음 크론이 이어서).
    mockFindMany.pageView.mockResolvedValue(ids(5000, 'pv'))
    mockDeleteMany.pageView.mockResolvedValue({ count: 5000 })

    const r = await sweepDataRetention(NOW)

    expect(mockFindMany.pageView).toHaveBeenCalledTimes(20)
    expect(r.pageViewsDeleted).toBe(100_000)
  })

  it('NatalContextCache — 옛 버전 고아 OR 오래 안 쓰인 현행 버전 행을 지운다', async () => {
    mockFindMany.natalContextCache.mockResolvedValueOnce(ids(2, 'n')).mockResolvedValue([])
    mockDeleteMany.natalContextCache.mockResolvedValue({ count: 2 })

    const r = await sweepDataRetention(NOW)

    const natalCutoff = new Date(NOW.getTime() - RETENTION.natalCacheDays * DAY_MS)
    // 현행 버전이라도 builtAt 이 보존창을 넘긴 익명·일회성 고아는 함께 지운다.
    expect(mockFindMany.natalContextCache).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { engineSignature: { not: CALENDAR_ENGINE_VERSION } },
            { builtAt: { lt: natalCutoff } },
          ],
        },
      })
    )
    expect(r.natalOrphansDeleted).toBe(2)
  })

  it('SharedResult — expiresAt 지난 것만 (null=영구 는 where 에 안 걸림)', async () => {
    mockFindMany.sharedResult.mockResolvedValueOnce(ids(1, 's')).mockResolvedValue([])
    mockDeleteMany.sharedResult.mockResolvedValue({ count: 1 })

    const r = await sweepDataRetention(NOW)

    expect(mockFindMany.sharedResult).toHaveBeenCalledWith(
      expect.objectContaining({ where: { expiresAt: { lt: NOW } } })
    )
    expect(r.expiredSharesDeleted).toBe(1)
  })

  it('연(year) 셀 블롭 — monthKey ~ ^\\d{4}: 인 대형 행을 정리(감사)', async () => {
    mockQueryRawUnsafe.mockResolvedValueOnce(ids(2, 'y')).mockResolvedValue([])
    mockDeleteMany.calendarBuildCache.mockResolvedValue({ count: 2 })

    const r = await sweepDataRetention(NOW)

    // 연 sentinel 정규식으로 골라 지운다(월 `YYYY-MM:`·일 `day:` 는 제외됨).
    expect(mockQueryRawUnsafe).toHaveBeenCalled()
    const sql = String(mockQueryRawUnsafe.mock.calls[0][0])
    expect(sql).toContain('monthKey')
    expect(sql).toContain('^[0-9]{4}:')
    expect(mockDeleteMany.calendarBuildCache).toHaveBeenCalledWith({
      where: { id: { in: ['y0', 'y1'] } },
    })
    expect(r.yearBlobsDeleted).toBe(2)
  })

  it('StripeEventLog — 1년 지난 dedupe 로그만 정리', async () => {
    mockFindMany.stripeEventLog.mockResolvedValueOnce(ids(3, 'se')).mockResolvedValue([])
    mockDeleteMany.stripeEventLog.mockResolvedValue({ count: 3 })

    const r = await sweepDataRetention(NOW)

    const cutoff = new Date(NOW.getTime() - 365 * DAY_MS)
    expect(mockFindMany.stripeEventLog).toHaveBeenCalledWith(
      expect.objectContaining({ where: { processedAt: { lt: cutoff } } })
    )
    expect(r.stripeEventLogsDeleted).toBe(3)
  })

  it('fail-soft — 한 테이블이 throw 해도 나머지 스윕은 계속된다', async () => {
    mockFindMany.pageView.mockRejectedValue(new Error('pg down'))
    mockFindMany.calendarBuildCache.mockResolvedValueOnce(ids(4, 'c')).mockResolvedValue([])
    mockDeleteMany.calendarBuildCache.mockResolvedValue({ count: 4 })

    const r = await sweepDataRetention(NOW)

    expect(r.pageViewsDeleted).toBe(0)
    expect(r.calendarCacheDeleted).toBe(4)
    expect(r.natalOrphansDeleted).toBe(0)
    expect(r.expiredSharesDeleted).toBe(0)
  })

  it('지울 게 없으면 delete 를 아예 호출하지 않는다', async () => {
    await sweepDataRetention(NOW)
    for (const m of Object.values(mockDeleteMany)) expect(m).not.toHaveBeenCalled()
  })
})
