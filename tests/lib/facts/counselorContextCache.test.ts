// @vitest-environment node
// tests/lib/destiny/counselorContextCache.test.ts
//
// counselorContextCache 는 운명상담 "첫 답변"의 critical path —
// realtime 답변 경로와 진입 워밍(/api/counselor/warm)이 공유하는 단일 소스다.
// #1289 에서 추가됐지만 유닛 테스트가 없어 캐시 키 드리프트·빌드 실패 처리·
// 병렬 Redis 왕복을 보호하기 위해 추가.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// 무거운 천체력/사주 빌드는 mock — 캐시 로직만 검증.
vi.mock('@/lib/facts/counselorContext', () => ({
  buildDestinyContext: vi.fn(),
}))
// Redis 는 mock 하되 CACHE_TTL 상수는 실제값 유지(TTL 회귀 방지).
vi.mock('@/lib/cache/redis-cache', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/cache/redis-cache')>('@/lib/cache/redis-cache')
  return {
    CACHE_TTL: actual.CACHE_TTL,
    cacheGet: vi.fn(),
    cacheSet: vi.fn(),
  }
})
// 현재 시각을 고정해 dailyDateKey 를 결정적으로.
vi.mock('@/lib/datetime', () => ({
  getNowInTimezone: vi.fn(() => ({ year: 2026, month: 6, day: 7 })),
}))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import {
  ensureCounselorContext,
  birthFingerprint,
  type CounselorBirthInput,
} from '@/lib/facts/counselorContextCache'
import { buildDestinyContext } from '@/lib/facts/counselorContext'
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache/redis-cache'
import { logger } from '@/lib/logger'

const mockBuild = vi.mocked(buildDestinyContext)
const mockGet = vi.mocked(cacheGet)
const mockSet = vi.mocked(cacheSet)

const BIRTH: CounselorBirthInput = {
  birthDate: '1990-05-15',
  birthTime: '14:30',
  gender: 'female',
  latitude: 37.5665,
  longitude: 126.978,
  timezone: 'Asia/Seoul',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue(null)
  mockSet.mockResolvedValue(true)
  mockBuild.mockResolvedValue({ stable: 'STABLE_BODY', daily: 'DAILY_BODY' })
})

describe('birthFingerprint', () => {
  it('is deterministic for identical input', () => {
    expect(birthFingerprint(BIRTH)).toBe(birthFingerprint({ ...BIRTH }))
  })

  it('changes when a birth field changes', () => {
    expect(birthFingerprint(BIRTH)).not.toBe(
      birthFingerprint({ ...BIRTH, birthDate: '1991-05-15' })
    )
    expect(birthFingerprint(BIRTH)).not.toBe(birthFingerprint({ ...BIRTH, gender: 'male' }))
    expect(birthFingerprint(BIRTH)).not.toBe(birthFingerprint({ ...BIRTH, birthTime: '15:30' }))
  })

  it('applies stable defaults for missing fields', () => {
    // birthTime→00:00, gender→male, timezone→Asia/Seoul
    expect(birthFingerprint({ birthDate: '2000-01-01' })).toBe(
      ['2000-01-01', '00:00', 'male', 'Asia/Seoul', '', ''].join('|')
    )
  })
})

describe('ensureCounselorContext', () => {
  it('returns cached values without rebuilding when both keys hit', async () => {
    mockGet.mockImplementation(
      async (key: string) => (key.includes(':stable:') ? 'CACHED_STABLE' : 'CACHED_DAILY') as never
    )

    const out = await ensureCounselorContext(BIRTH, 'user-1', 'ko')

    expect(out).toEqual({ stableContext: 'CACHED_STABLE', dailyContext: 'CACHED_DAILY' })
    expect(mockBuild).not.toHaveBeenCalled()
    expect(mockSet).not.toHaveBeenCalled()
  })

  it('rebuilds and caches both keys on a full miss', async () => {
    const out = await ensureCounselorContext(BIRTH, 'user-1', 'ko')

    expect(mockBuild).toHaveBeenCalledTimes(1)
    expect(out.stableContext).toContain('STABLE_BODY')
    expect(out.stableContext).toContain('<birth_data>')
    expect(out.dailyContext).toBe('DAILY_BODY')
    expect(mockSet).toHaveBeenCalledTimes(2)
  })

  it('rebuilds when only one of the two keys is cached (no partial hit)', async () => {
    mockGet.mockImplementation(
      async (key: string) => (key.includes(':stable:') ? 'CACHED_STABLE' : null) as never
    )
    await ensureCounselorContext(BIRTH, 'user-1', 'ko')
    expect(mockBuild).toHaveBeenCalledTimes(1)
  })

  it('writes stable with 30d TTL and daily with 1d TTL', async () => {
    await ensureCounselorContext(BIRTH, 'user-1', 'ko')

    const stableCall = mockSet.mock.calls.find(([k]) => String(k).includes(':stable:'))
    const dailyCall = mockSet.mock.calls.find(([k]) => String(k).includes(':daily:'))
    expect(stableCall?.[2]).toBe(CACHE_TTL.NATAL_CHART)
    expect(dailyCall?.[2]).toBe(CACHE_TTL.CALENDAR_DATA)
  })

  it('shares the same cache keys between read and write (no key drift)', async () => {
    await ensureCounselorContext(BIRTH, 'user-1', 'ko')

    const readKeys = mockGet.mock.calls.map(([k]) => k)
    const writeKeys = mockSet.mock.calls.map(([k]) => k)
    expect(new Set(writeKeys)).toEqual(new Set(readKeys))
  })

  it('embeds the daily date key so the daily cache rolls over per day', async () => {
    await ensureCounselorContext(BIRTH, 'user-1', 'ko')
    const dailyKey = mockGet.mock.calls.map(([k]) => String(k)).find((k) => k.includes(':daily:'))
    expect(dailyKey).toContain('2026-6-7')
  })

  it('survives a build failure: meta-only stable, empty daily, warns', async () => {
    mockBuild.mockRejectedValueOnce(new Error('ephemeris boom'))

    const out = await ensureCounselorContext(BIRTH, 'user-1', 'ko')

    expect(out.stableContext).toContain('<birth_data>')
    expect(out.stableContext).not.toContain('STABLE_BODY')
    expect(out.dailyContext).toBe('')
    expect(logger.warn).toHaveBeenCalled()
    // 실패해도 캐시는 채워 둔다(빈 daily 포함) → 두 번 쓰기.
    expect(mockSet).toHaveBeenCalledTimes(2)
  })

  it('adds guard lines when birth time is unknown', async () => {
    const out = await ensureCounselorContext({ ...BIRTH, birthTimeUnknown: true }, 'user-1', 'ko')
    expect(out.stableContext).toContain('시간 미상')
    expect(out.stableContext).toContain('birthTimeUnknown: true')
  })

  it('adds guard lines when birth city is unknown', async () => {
    const out = await ensureCounselorContext({ ...BIRTH, birthCityUnknown: true }, 'user-1', 'ko')
    expect(out.stableContext).toContain('출생지 미상')
    expect(out.stableContext).toContain('birthCityUnknown: true')
  })

  it('keys differ by user so contexts never leak across users', async () => {
    await ensureCounselorContext(BIRTH, 'user-A', 'ko')
    const aKeys = mockGet.mock.calls.map(([k]) => String(k))
    vi.clearAllMocks()
    mockGet.mockResolvedValue(null)
    mockSet.mockResolvedValue(true)
    mockBuild.mockResolvedValue({ stable: 'S', daily: 'D' })
    await ensureCounselorContext(BIRTH, 'user-B', 'ko')
    const bKeys = mockGet.mock.calls.map(([k]) => String(k))
    expect(aKeys.some((k) => k.includes('user-A'))).toBe(true)
    expect(bKeys.some((k) => k.includes('user-B'))).toBe(true)
    expect(aKeys).not.toEqual(bKeys)
  })
})
