// tests/app/destiny-counselor/frontend-coverage.useCounselorData.test.ts
//
// STEP 5 frontend-coverage: cover the high-risk, recently-changed
// `useCounselorData` hook. Focus areas:
//   1. URL search-param parsing (scalar vs string[] forms, aliases)
//   2. Language resolution — the just-changed `urlLang ?? i18nLocale` seeding:
//        - no ?lang= → answer language mirrors the live i18n locale (NOT forced 'ko')
//        - explicit ?lang= → seeds setLocale() (deep-link intent) and wins for `lang`
//   3. Profile-merge precedence: URL > server profile > localStorage
//
// These are pure-ish derivations exposed via the hook's `parsedParams` return.
// Network (fetch / apiFetch) is mocked; useI18n is mocked so we can drive the
// locale and assert setLocale calls. Patterns mirror existing hook tests
// (tests/hooks/useChatSession.test.ts, useTarotInterpretation.unmount.test.ts).

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// --- Mocks -----------------------------------------------------------------

// i18n: drive the live locale + capture setLocale calls. Reassignable so each
// test can pick the active locale before rendering.
let mockLocale: 'en' | 'ko' = 'ko'
const setLocaleMock = vi.fn()
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale, setLocale: setLocaleMock }),
}))

// apiFetch (chat-history / context loads) — irrelevant to params under test.
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })),
}))

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Chart cache: no cached data so the compute path is inert (birthDate/birthTime
// effects are gated and just call fetch, which we stub to never resolve).
vi.mock('@/lib/cache/chartDataCache', () => ({
  loadChartData: vi.fn(() => null),
  saveChartData: vi.fn(),
}))

// saju compute — never actually invoked in these param-only tests, but mocked
// to avoid pulling in the swisseph chain.
vi.mock('@/lib/saju/saju', () => ({
  calculateSajuData: vi.fn(() => ({})),
}))

// localStorage seed for profile fallback. Default: nothing stored.
let mockStoredBirthInfo: Record<string, unknown> | null = null
vi.mock('@/app/(main)/birthInfoStorage', () => ({
  getStoredBirthInfo: () => mockStoredBirthInfo,
}))

import { useCounselorData } from '@/app/destiny-counselor/useCounselorData'

// --- Helpers ---------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  mockLocale = 'ko'
  mockStoredBirthInfo = null
  // Make every fetch() hang (never resolve) so the chart-loading effects don't
  // mutate state during these synchronous-derivation assertions. The profile
  // fallback effect is separately handled per-test via a pending promise.
  ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
    () => new Promise(() => {})
  )
})

// --- Param parsing ---------------------------------------------------------

describe('useCounselorData — URL param parsing', () => {
  it('reads scalar params straight through', () => {
    const { result } = renderHook(() =>
      useCounselorData({
        name: 'Jin',
        birthDate: '1995-02-09',
        birthTime: '06:40',
        city: 'Seoul',
        gender: 'female',
        q: 'What about my career?',
      })
    )
    const p = result.current.parsedParams
    expect(p.name).toBe('Jin')
    expect(p.birthDate).toBe('1995-02-09')
    expect(p.birthTime).toBe('06:40')
    expect(p.city).toBe('Seoul')
    expect(p.gender).toBe('female')
    expect(p.initialQuestion).toBe('What about my career?')
  })

  it('takes the first element when a param arrives as string[]', () => {
    const { result } = renderHook(() =>
      useCounselorData({
        name: ['First', 'Second'],
        birthDate: ['1990-01-01', '2000-01-01'],
        birthTime: ['12:00'],
      })
    )
    const p = result.current.parsedParams
    expect(p.name).toBe('First')
    expect(p.birthDate).toBe('1990-01-01')
    expect(p.birthTime).toBe('12:00')
  })

  it('accepts `initialQuestion` as an alias for `q`', () => {
    const { result } = renderHook(() =>
      useCounselorData({ initialQuestion: 'deep-link question' })
    )
    expect(result.current.parsedParams.initialQuestion).toBe('deep-link question')
  })

  it('prefers `q` over `initialQuestion` when both present', () => {
    const { result } = renderHook(() =>
      useCounselorData({ q: 'from q', initialQuestion: 'from initialQuestion' })
    )
    expect(result.current.parsedParams.initialQuestion).toBe('from q')
  })

  it('treats birthTimeUnknown="1"/"true" as unknown, else false', () => {
    const r1 = renderHook(() => useCounselorData({ birthTimeUnknown: '1' }))
    expect(r1.result.current.parsedParams.birthTimeUnknown).toBe(true)

    const r2 = renderHook(() => useCounselorData({ birthTimeUnknown: 'true' }))
    expect(r2.result.current.parsedParams.birthTimeUnknown).toBe(true)

    const r3 = renderHook(() => useCounselorData({ birthTimeUnknown: '0' }))
    expect(r3.result.current.parsedParams.birthTimeUnknown).toBe(false)

    const r4 = renderHook(() => useCounselorData({}))
    expect(r4.result.current.parsedParams.birthTimeUnknown).toBe(false)
  })

  it('normalizes gender ("F" / "Female" → female; otherwise male)', () => {
    expect(
      renderHook(() => useCounselorData({ gender: 'F' })).result.current.parsedParams
        .gender
    ).toBe('female')
    expect(
      renderHook(() => useCounselorData({ gender: 'Female' })).result.current.parsedParams
        .gender
    ).toBe('female')
    expect(
      renderHook(() => useCounselorData({ gender: 'M' })).result.current.parsedParams
        .gender
    ).toBe('male')
    // Unrecognized / empty → falls through to 'male' (the hook's binary collapse).
    expect(
      renderHook(() => useCounselorData({ gender: 'banana' })).result.current
        .parsedParams.gender
    ).toBe('male')
    expect(
      renderHook(() => useCounselorData({})).result.current.parsedParams.gender
    ).toBe('male')
  })

  it('resolves coordinates: URL lat/lon win, else Seoul defaults', () => {
    const withCoords = renderHook(() =>
      useCounselorData({ lat: '48.85', lon: '2.35' })
    )
    expect(withCoords.result.current.parsedParams.latitude).toBeCloseTo(48.85)
    expect(withCoords.result.current.parsedParams.longitude).toBeCloseTo(2.35)

    const noCoords = renderHook(() => useCounselorData({}))
    // DEFAULT_LATITUDE / DEFAULT_LONGITUDE (Seoul)
    expect(noCoords.result.current.parsedParams.latitude).toBeCloseTo(37.5665)
    expect(noCoords.result.current.parsedParams.longitude).toBeCloseTo(126.978)
  })

  it('accepts latitude/longitude aliases for lat/lon', () => {
    const { result } = renderHook(() =>
      useCounselorData({ latitude: '35.68', longitude: '139.69' })
    )
    expect(result.current.parsedParams.latitude).toBeCloseTo(35.68)
    expect(result.current.parsedParams.longitude).toBeCloseTo(139.69)
  })

  it('honors an explicit timeZone (and tz alias) param over browser tz', () => {
    const r1 = renderHook(() => useCounselorData({ timeZone: 'America/New_York' }))
    expect(r1.result.current.parsedParams.timeZone).toBe('America/New_York')

    const r2 = renderHook(() => useCounselorData({ tz: 'Asia/Tokyo' }))
    expect(r2.result.current.parsedParams.timeZone).toBe('Asia/Tokyo')
  })
})

// --- Language resolution (the just-changed seeding) -------------------------

describe('useCounselorData — language resolution', () => {
  it('without ?lang=, answer language follows the live i18n locale (en)', () => {
    mockLocale = 'en'
    const { result } = renderHook(() => useCounselorData({}))
    expect(result.current.parsedParams.lang).toBe('en')
  })

  it('without ?lang=, answer language follows the live i18n locale (ko)', () => {
    mockLocale = 'ko'
    const { result } = renderHook(() => useCounselorData({}))
    expect(result.current.parsedParams.lang).toBe('ko')
  })

  it('without ?lang=, does NOT call setLocale (never forces a reset)', () => {
    mockLocale = 'en'
    renderHook(() => useCounselorData({}))
    expect(setLocaleMock).not.toHaveBeenCalled()
  })

  it('an explicit ?lang=en wins for `lang` even when live locale is ko', () => {
    mockLocale = 'ko'
    const { result } = renderHook(() => useCounselorData({ lang: 'en' }))
    expect(result.current.parsedParams.lang).toBe('en')
  })

  it('an explicit ?lang= seeds setLocale (deep-link intent)', () => {
    mockLocale = 'ko'
    renderHook(() => useCounselorData({ lang: 'en' }))
    expect(setLocaleMock).toHaveBeenCalledWith('en', { reload: false })
  })

  it('an unrecognized ?lang= value is ignored (treated as absent)', () => {
    mockLocale = 'ko'
    const { result } = renderHook(() => useCounselorData({ lang: 'fr' }))
    // Falls back to live locale; no seeding.
    expect(result.current.parsedParams.lang).toBe('ko')
    expect(setLocaleMock).not.toHaveBeenCalled()
  })
})

// --- Profile-merge precedence ----------------------------------------------

describe('useCounselorData — profile-fallback merge precedence', () => {
  it('URL birth info wins and skips the profile fetch entirely', () => {
    mockStoredBirthInfo = {
      name: 'Stored',
      birthDate: '1980-08-08',
      birthTime: '03:03',
      gender: 'male',
    }
    const { result } = renderHook(() =>
      useCounselorData({
        name: 'FromUrl',
        birthDate: '1995-02-09',
        birthTime: '06:40',
      })
    )
    const p = result.current.parsedParams
    expect(p.name).toBe('FromUrl')
    expect(p.birthDate).toBe('1995-02-09')
    expect(p.birthTime).toBe('06:40')
    // hasUrlBirthInfo → profileLoading starts false and /api/me/profile not fetched.
    expect(result.current.profileLoading).toBe(false)
    expect(global.fetch).not.toHaveBeenCalledWith('/api/me/profile')
  })

  it('seeds from localStorage synchronously when URL lacks birth info', () => {
    mockStoredBirthInfo = {
      name: 'Stored Name',
      birthDate: '1980-08-08',
      birthTime: '03:03',
      gender: 'male',
      city: 'Busan',
      timeZone: 'Asia/Seoul',
      latitude: 35.1,
      longitude: 129.0,
    }
    const { result } = renderHook(() => useCounselorData({}))
    const p = result.current.parsedParams
    expect(p.name).toBe('Stored Name')
    expect(p.birthDate).toBe('1980-08-08')
    expect(p.birthTime).toBe('03:03')
    expect(p.city).toBe('Busan')
    // localStorage coordinates flow through instead of Seoul defaults.
    expect(p.latitude).toBeCloseTo(35.1)
    expect(p.longitude).toBeCloseTo(129.0)
    // No URL birth info → loading until the profile fetch resolves.
    expect(result.current.profileLoading).toBe(true)
  })

  it('server profile overrides localStorage seed, but preserves seed for fields the server lacks', async () => {
    mockStoredBirthInfo = {
      name: 'Stored Name',
      birthDate: '1980-08-08',
      birthTime: '03:03',
      gender: 'male',
      city: 'Busan',
    }
    // Only the /api/me/profile call resolves; chart fetches keep hanging.
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/me/profile') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            user: {
              name: 'Server Name',
              birthDate: '1999-09-09',
              // birthTime intentionally absent → localStorage seed should remain.
              gender: 'female',
            },
          }),
        })
      }
      return new Promise(() => {})
    })

    const { result } = renderHook(() => useCounselorData({}))

    await waitFor(() => expect(result.current.profileLoading).toBe(false))

    const p = result.current.parsedParams
    // Server values win where present...
    expect(p.name).toBe('Server Name')
    expect(p.birthDate).toBe('1999-09-09')
    expect(p.gender).toBe('female')
    // ...and the localStorage seed is preserved where the server had nothing.
    expect(p.birthTime).toBe('03:03')
    expect(p.city).toBe('Busan')
  })

  it('clears profileLoading even when the profile fetch fails', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/me/profile') return Promise.reject(new Error('network'))
      return new Promise(() => {})
    })
    const { result } = renderHook(() => useCounselorData({}))
    await waitFor(() => expect(result.current.profileLoading).toBe(false))
  })
})

// --- Request cancellation (AbortController on chart-load effect) -------------

describe('useCounselorData — chart-load request cancellation', () => {
  // 고급 점성 9종 fetch 는 진입 속도 개선으로 비활성화됨(#1280, hasAllFields=true).
  // 서버(realtime route)가 사주·점성을 자체 생성하므로 클라가 advanced 를 받을
  // 필요가 없다 → 차트 로드 fetch 는 /api/saju + /api/astrology 두 개만.
  const CHART_FETCH_URLS = ['/api/saju', '/api/astrology']

  it('passes an AbortSignal to every chart-load fetch', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    renderHook(() =>
      useCounselorData({ birthDate: '1995-02-09', birthTime: '06:40' })
    )

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => c[0] === '/api/saju')).toBe(true)
    })

    for (const url of CHART_FETCH_URLS) {
      const call = fetchMock.mock.calls.find((c) => c[0] === url)
      expect(call, `expected a fetch to ${url}`).toBeDefined()
      const init = call?.[1] as RequestInit | undefined
      expect(init?.signal, `expected signal on fetch to ${url}`).toBeInstanceOf(AbortSignal)
      expect(init?.signal?.aborted).toBe(false)
    }
  })

  it('aborts the in-flight chart-load requests on unmount', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    const { unmount } = renderHook(() =>
      useCounselorData({ birthDate: '1995-02-09', birthTime: '06:40' })
    )

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => c[0] === '/api/saju')).toBe(true)
    })

    // Capture the signal handed to /api/saju before tearing the hook down.
    const sajuCall = fetchMock.mock.calls.find((c) => c[0] === '/api/saju')
    const signal = (sajuCall?.[1] as RequestInit | undefined)?.signal
    expect(signal?.aborted).toBe(false)

    unmount()

    // Cleanup must abort the shared controller, flipping every signal.
    expect(signal?.aborted).toBe(true)
  })

  it('aborts and re-fires when a chart dep changes (e.g. timeZone toggle)', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    const { rerender } = renderHook(
      (props: Record<string, string>) => useCounselorData(props),
      {
        initialProps: {
          birthDate: '1995-02-09',
          birthTime: '06:40',
          timeZone: 'Asia/Seoul',
        },
      }
    )

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((c) => c[0] === '/api/saju')).toBe(true)
    })
    const firstSignal = (
      fetchMock.mock.calls.find((c) => c[0] === '/api/saju')?.[1] as RequestInit | undefined
    )?.signal
    expect(firstSignal?.aborted).toBe(false)

    // Changing a dep (timeZone) re-runs the effect: the cleanup aborts the
    // first run's controller, and a fresh batch of fetches fires.
    rerender({ birthDate: '1995-02-09', birthTime: '06:40', timeZone: 'Asia/Tokyo' })

    expect(firstSignal?.aborted).toBe(true)
    await waitFor(() => {
      const sajuCalls = fetchMock.mock.calls.filter((c) => c[0] === '/api/saju')
      expect(sajuCalls.length).toBeGreaterThanOrEqual(2)
    })
  })
})
