// tests/lib/metrics/shareCounts.test.ts
//
// shareCounts — 공유 생성수 Redis 일별 집계. bumpShareCreated(원자 증가)와
// getShareCreatedCounts(최근 N일 종류별·합계)를 redis-cache 를 목킹해 커버.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const cacheIncr = vi.fn<(key: string, ttl: number) => Promise<number>>()
const cacheMGetNumbers = vi.fn<(keys: string[]) => Promise<(number | null)[]>>()

vi.mock('@/lib/cache/redis-cache', () => ({
  cacheIncr: (k: string, ttl: number) => cacheIncr(k, ttl),
  cacheMGetNumbers: (keys: string[]) => cacheMGetNumbers(keys),
}))

import { bumpShareCreated, getShareCreatedCounts, SHARE_KINDS } from '@/lib/metrics/shareCounts'

beforeEach(() => {
  cacheIncr.mockReset()
  cacheMGetNumbers.mockReset()
})

describe('shareCounts', () => {
  it('bumpShareCreated 는 UTC 날짜 키로 원자 증가', async () => {
    cacheIncr.mockResolvedValue(1)
    await bumpShareCreated('compatibility', new Date('2026-07-07T09:00:00Z'))
    expect(cacheIncr).toHaveBeenCalledTimes(1)
    const [key, ttl] = cacheIncr.mock.calls[0]
    expect(key).toBe('funnel:share:compatibility:2026-07-07')
    expect(ttl).toBeGreaterThan(0)
  })

  it('getShareCreatedCounts 는 days × 종류 키를 조회해 종류별·합계 집계', async () => {
    // 2일 × 4종류 = 8키. compatibility 오늘 3 + 어제 2, tarot 오늘 5, 나머지 0/null.
    cacheMGetNumbers.mockImplementation(async (keys: string[]) =>
      keys.map((k) => {
        if (k === 'funnel:share:compatibility:2026-07-07') return 3
        if (k === 'funnel:share:compatibility:2026-07-06') return 2
        if (k === 'funnel:share:tarot:2026-07-07') return 5
        return null
      })
    )
    const res = await getShareCreatedCounts(2, new Date('2026-07-07T00:00:00Z'))
    expect(cacheMGetNumbers).toHaveBeenCalledTimes(1)
    expect(cacheMGetNumbers.mock.calls[0][0]).toHaveLength(2 * SHARE_KINDS.length)
    expect(res.byKind.compatibility).toBe(5)
    expect(res.byKind.tarot).toBe(5)
    expect(res.byKind.report).toBe(0)
    expect(res.byKind.calendar).toBe(0)
    expect(res.total).toBe(10)
  })

  it('전부 0/null 이면 total 0', async () => {
    cacheMGetNumbers.mockResolvedValue([])
    const res = await getShareCreatedCounts(1, new Date('2026-07-07T00:00:00Z'))
    expect(res.total).toBe(0)
    expect(res.byKind.report).toBe(0)
  })

  it('life·day 도 집계 종류에 포함(예전엔 누락돼 인생·하루 공유가 안 세짐)', () => {
    expect(SHARE_KINDS).toContain('life')
    expect(SHARE_KINDS).toContain('day')
  })

  it('life·day 도 종류별 집계에 잡힌다', async () => {
    cacheMGetNumbers.mockImplementation(async (keys: string[]) =>
      keys.map((k) => {
        if (k === 'funnel:share:life:2026-07-07') return 4
        if (k === 'funnel:share:day:2026-07-07') return 7
        return null
      })
    )
    const res = await getShareCreatedCounts(1, new Date('2026-07-07T00:00:00Z'))
    expect(res.byKind.life).toBe(4)
    expect(res.byKind.day).toBe(7)
    expect(res.total).toBe(11)
  })
})
