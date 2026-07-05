import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockCacheGet = vi.fn()
const mockCacheSet = vi.fn()
const mockBuildDestinyContext = vi.fn()

vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: (...args: unknown[]) => mockCacheGet(...args),
  cacheSet: (...args: unknown[]) => mockCacheSet(...args),
  CACHE_TTL: {
    TAROT_READING: 60 * 60 * 24,
    CALENDAR_DATA: 60 * 60 * 24,
    NATAL_CHART: 60 * 60 * 24 * 30,
  },
}))

vi.mock('@/lib/destiny/counselorContext', () => ({
  buildDestinyContext: (...args: unknown[]) => mockBuildDestinyContext(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { ensureCounselorContext } from '@/lib/destiny/counselorContextCache'

const fullBody = {
  birthDate: '1990-05-15',
  birthTime: '08:30',
  gender: 'female',
  timezone: 'Asia/Seoul',
  latitude: 37.5665,
  longitude: 126.978,
  userTimezone: 'Asia/Seoul',
}

describe('ensureCounselorContext (운명상담사 컨텍스트 캐시)', () => {
  beforeEach(() => {
    mockCacheGet.mockReset()
    mockCacheSet.mockReset()
    mockBuildDestinyContext.mockReset()
    mockCacheSet.mockResolvedValue(true)
  })

  it('캐시 hit(stable+daily) → 빌드 없이 캐시값 반환', async () => {
    mockCacheGet.mockImplementation(async (key: string) =>
      key.includes(':stable:') ? 'STABLE_CACHED' : 'DAILY_CACHED'
    )
    const result = await ensureCounselorContext(fullBody, 'user-1', 'ko')
    expect(result).toEqual({ stableContext: 'STABLE_CACHED', dailyContext: 'DAILY_CACHED' })
    expect(mockBuildDestinyContext).not.toHaveBeenCalled()
    expect(mockCacheSet).not.toHaveBeenCalled()
  })

  it('캐시 miss → 빌드 + 캐시 저장 + 반환', async () => {
    mockCacheGet.mockResolvedValue(null)
    mockBuildDestinyContext.mockResolvedValue({ stable: 'BUILT_STABLE', daily: 'BUILT_DAILY' })

    const result = await ensureCounselorContext(fullBody, 'user-2', 'ko')

    expect(mockBuildDestinyContext).toHaveBeenCalledTimes(1)
    expect(result.dailyContext).toBe('BUILT_DAILY')
    // stableContext 는 <birth_data> 래퍼 + Meta + 빌드 본문.
    expect(result.stableContext).toContain('<birth_data>')
    expect(result.stableContext).toContain('</birth_data>')
    expect(result.stableContext).toContain('BUILT_STABLE')
    expect(result.stableContext).toContain('[Meta]')
    expect(result.stableContext).toContain('birthDate: 1990-05-15')
    expect(result.stableContext).toContain('gender: F')
    // 두 개 캐시 저장 (stable 30d, daily 1d)
    expect(mockCacheSet).toHaveBeenCalledTimes(2)
  })

  it('stable 캐시 키에 lang/userId 포함, daily 키엔 날짜키 추가', async () => {
    mockCacheGet.mockResolvedValue(null)
    mockBuildDestinyContext.mockResolvedValue({ stable: 's', daily: 'd' })
    await ensureCounselorContext(fullBody, 'user-keys', 'en')

    const getKeys = mockCacheGet.mock.calls.map((c) => c[0] as string)
    const stableKey = getKeys.find((k) => k.includes(':stable:'))!
    const dailyKey = getKeys.find((k) => k.includes(':daily:'))!
    expect(stableKey).toContain(':en:')
    expect(stableKey).toContain('user-keys')
    expect(stableKey).toContain('v13')
    expect(dailyKey).toContain(':en:')
    // daily 키는 localDateKey(YYYY-M-D) 가 붙어 stable 보다 segment 가 많다.
    expect(dailyKey.split(':').length).toBeGreaterThan(stableKey.split(':').length)
  })

  it('부분 hit(stable만) → 다시 빌드 (둘 다 있어야 hit)', async () => {
    mockCacheGet.mockImplementation(async (key: string) =>
      key.includes(':stable:') ? 'ONLY_STABLE' : null
    )
    mockBuildDestinyContext.mockResolvedValue({ stable: 'rebuilt', daily: 'rebuilt-daily' })
    const result = await ensureCounselorContext(fullBody, 'user-3', 'ko')
    expect(mockBuildDestinyContext).toHaveBeenCalledTimes(1)
    expect(result.dailyContext).toBe('rebuilt-daily')
  })

  it('birthTimeUnknown → 시간 미상 가드 문구 + tU 키', async () => {
    mockCacheGet.mockResolvedValue(null)
    mockBuildDestinyContext.mockResolvedValue({ stable: 's', daily: 'd' })
    const body = { ...fullBody, birthTimeUnknown: true }
    const result = await ensureCounselorContext(body, 'user-4', 'ko')
    expect(result.stableContext).toContain('시간 미상')
    expect(result.stableContext).toContain('birthTimeUnknown: true')
    const stableKey = mockCacheGet.mock.calls
      .map((c) => c[0] as string)
      .find((k) => k.includes(':stable:'))!
    expect(stableKey).toContain(':tU:')
  })

  it('birthTime 없으면 hourUnknown 취급', async () => {
    mockCacheGet.mockResolvedValue(null)
    mockBuildDestinyContext.mockResolvedValue({ stable: 's', daily: 'd' })
    const { birthTime, ...noTime } = fullBody
    const result = await ensureCounselorContext(noTime, 'user-5', 'ko')
    expect(result.stableContext).toContain('birthTimeUnknown: true')
  })

  it('birthCityUnknown → 출생지 미상 가드 + location 미상 + cU 키', async () => {
    mockCacheGet.mockResolvedValue(null)
    mockBuildDestinyContext.mockResolvedValue({ stable: 's', daily: 'd' })
    const body = { ...fullBody, birthCityUnknown: true }
    const result = await ensureCounselorContext(body, 'user-6', 'ko')
    expect(result.stableContext).toContain('출생지 미상')
    expect(result.stableContext).toContain('location: 미상')
    expect(result.stableContext).toContain('birthCityUnknown: true')
    const stableKey = mockCacheGet.mock.calls
      .map((c) => c[0] as string)
      .find((k) => k.includes(':stable:'))!
    expect(stableKey).toContain(':cU:')
  })

  it('EN 세션 → Meta 가드/미상 태그가 영어, 한국어(Hangul) 누수 없음', async () => {
    mockCacheGet.mockResolvedValue(null)
    mockBuildDestinyContext.mockResolvedValue({ stable: 'BODY', daily: 'd' })
    const body = { ...fullBody, birthTimeUnknown: true, birthCityUnknown: true }
    const result = await ensureCounselorContext(body, 'user-en', 'en')
    // 영어 가드 + unknown 태그
    expect(result.stableContext).toContain(
      'Birth time unknown — do not cite hour pillar / iljin / ASC / MC / houses.'
    )
    expect(result.stableContext).toContain('Birth city unknown')
    expect(result.stableContext).toContain('location: unknown')
    expect(result.stableContext).toContain('birthTime: unknown')
    // 캐시 레이어가 붙이는 Meta/가드 부분(빌드 본문 BODY 제외)에 Hangul 0.
    const metaOnly = result.stableContext.replace('BODY', '')
    expect(/[가-힣]/.test(metaOnly)).toBe(false)
  })

  it('lat/lng/tz 모두 없으면 cityUnknown 추론', async () => {
    mockCacheGet.mockResolvedValue(null)
    mockBuildDestinyContext.mockResolvedValue({ stable: 's', daily: 'd' })
    const body = { birthDate: '2000-01-01', birthTime: '12:00', gender: 'male' }
    const result = await ensureCounselorContext(body, 'user-7', 'ko')
    expect(result.stableContext).toContain('birthCityUnknown: true')
  })

  it('남성 기본/gender 미지정 → genderTag M', async () => {
    mockCacheGet.mockResolvedValue(null)
    mockBuildDestinyContext.mockResolvedValue({ stable: 's', daily: 'd' })
    const { gender, ...noGender } = fullBody
    const result = await ensureCounselorContext(noGender, 'user-8', 'ko')
    expect(result.stableContext).toContain('gender: M')
  })

  it('빌드 throw 시 graceful — 본문 없이 birth_data 만, 캐시는 그대로 저장', async () => {
    mockCacheGet.mockResolvedValue(null)
    mockBuildDestinyContext.mockRejectedValue(new Error('ephemeris boom'))
    const result = await ensureCounselorContext(fullBody, 'user-9', 'ko')
    expect(result.stableContext).toContain('<birth_data>')
    expect(result.stableContext).toContain('[Meta]')
    // 빌드 실패라 daily 본문은 빈 문자열
    expect(result.dailyContext).toBe('')
    // 실패해도 (빈)컨텍스트 캐시 저장은 수행
    expect(mockCacheSet).toHaveBeenCalledTimes(2)
  })

  it('location 태그는 lat/lng 4자리 반올림', async () => {
    mockCacheGet.mockResolvedValue(null)
    mockBuildDestinyContext.mockResolvedValue({ stable: 's', daily: 'd' })
    const result = await ensureCounselorContext(fullBody, 'user-10', 'ko')
    expect(result.stableContext).toContain('37.5665,126.9780')
  })

  it('동시 콜드 miss 2건(warm+realtime) → 빌드는 1회만(single-flight), 같은 결과 공유', async () => {
    mockCacheGet.mockResolvedValue(null)
    // 빌드를 지연시켜 두 호출이 확실히 겹치게 한다.
    let resolveBuild!: (v: { stable: string; daily: string }) => void
    mockBuildDestinyContext.mockImplementation(
      () => new Promise((res) => (resolveBuild = res as typeof resolveBuild))
    )

    const p1 = ensureCounselorContext(fullBody, 'user-sf', 'ko')
    const p2 = ensureCounselorContext(fullBody, 'user-sf', 'ko')
    // 두 번째 호출이 캐시 조회를 끝내고 in-flight 에 합류할 시간을 준다.
    await new Promise((r) => setTimeout(r, 0))
    resolveBuild({ stable: 'ONCE', daily: 'ONCE_DAILY' })

    const [r1, r2] = await Promise.all([p1, p2])
    expect(mockBuildDestinyContext).toHaveBeenCalledTimes(1)
    expect(r1).toEqual(r2)
    expect(r1.dailyContext).toBe('ONCE_DAILY')
    // 캐시 저장도 1회 빌드분(stable+daily 2건)만.
    expect(mockCacheSet).toHaveBeenCalledTimes(2)
  })

  it('single-flight 는 키가 다르면(다른 사용자) 각자 빌드', async () => {
    mockCacheGet.mockResolvedValue(null)
    mockBuildDestinyContext.mockResolvedValue({ stable: 's', daily: 'd' })
    await Promise.all([
      ensureCounselorContext(fullBody, 'user-a', 'ko'),
      ensureCounselorContext(fullBody, 'user-b', 'ko'),
    ])
    expect(mockBuildDestinyContext).toHaveBeenCalledTimes(2)
  })

  it('single-flight 빌드가 끝나면 다음 호출은 새로 진행(맵 정리)', async () => {
    mockCacheGet.mockResolvedValue(null)
    mockBuildDestinyContext.mockResolvedValue({ stable: 's1', daily: 'd1' })
    await ensureCounselorContext(fullBody, 'user-cleanup', 'ko')
    mockBuildDestinyContext.mockResolvedValue({ stable: 's2', daily: 'd2' })
    const second = await ensureCounselorContext(fullBody, 'user-cleanup', 'ko')
    // 두 번째 호출은 캐시 miss 시 새 빌드를 돈다(끝난 promise 재사용 금지).
    expect(mockBuildDestinyContext).toHaveBeenCalledTimes(2)
    expect(second.dailyContext).toBe('d2')
  })
})
