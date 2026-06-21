// tests/app/destinyCounselor/useCounselorData.test.ts
//
// Complements tests/app/destiny-counselor/frontend-coverage.useCounselorData.test.ts
// (which covers param parsing, language seeding, profile-merge precedence, and
// chart-load abort). This file targets the *uncovered* async effect bodies:
//
//   1. Session-subject resume (/api/counselor/session/load) — success with a
//      subject, success without a subject, error, and the "don't load" guard.
//   2. Chart-load success paths — /api/saju + /api/astrology responses applied
//      to chartData and written to the cache (saveChartData), plus the
//      cached-rich short-circuit that skips the saju fetch.
//   3. User-context load (/api/counselor/chat-history) — personaResult from
//      localStorage, recent-session mapping, resume of most recent session id.
//   4. handleSaveMessage — new-session creation (sets chatSessionId, sends
//      meta.profile.name), existing-session update, and error swallow.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// --- Mocks -----------------------------------------------------------------

let mockLocale: 'en' | 'ko' = 'ko'
const setLocaleMock = vi.fn()
vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: mockLocale, setLocale: setLocaleMock }),
}))

// apiFetch is used for session/load, chat-history, and handleSaveMessage POST.
// Default: reject-ish (401, not ok) so guest paths stay quiet. Per-test we
// override with a routing implementation.
const apiFetchMock = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }))
vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...(args as [])),
}))

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const loadChartDataMock = vi.fn(() => null as unknown)
const saveChartDataMock = vi.fn()
vi.mock('@/lib/cache/chartDataCache', () => ({
  loadChartData: (...a: unknown[]) => loadChartDataMock(...(a as [])),
  saveChartData: (...a: unknown[]) => saveChartDataMock(...(a as [])),
}))

vi.mock('@/lib/saju/saju', () => ({ calculateSajuData: vi.fn(() => ({})) }))

let mockStoredBirthInfo: Record<string, unknown> | null = null
vi.mock('@/app/(main)/birthInfoStorage', () => ({
  getStoredBirthInfo: () => mockStoredBirthInfo,
}))

import { useCounselorData } from '@/app/destiny-counselor/useCounselorData'

// --- Helpers ---------------------------------------------------------------

// A fetch impl that resolves /api/saju and /api/astrology with given payloads,
// resolves /api/me/profile to an empty (guest) result so profileLoading can
// clear, and hangs everything else.
function routeFetch(map: Record<string, unknown>) {
  return (url: string) => {
    for (const key of Object.keys(map)) {
      if (url === key || url.startsWith(key)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => map[key],
        })
      }
    }
    if (url === '/api/me/profile') {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ user: null }) })
    }
    return new Promise(() => {})
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLocale = 'ko'
  mockStoredBirthInfo = null
  loadChartDataMock.mockReturnValue(null)
  apiFetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })
  // Default: resolve the profile fallback (guest) so profileLoading can clear;
  // hang chart fetches. Tests that need chart data override with routeFetch.
  ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
    if (url === '/api/me/profile') {
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ user: null }) })
    }
    return new Promise(() => {})
  })
  try {
    window.localStorage.clear()
  } catch {
    /* ignore */
  }
})

// --- Session-subject resume -------------------------------------------------

describe('useCounselorData — session subject resume', () => {
  it('loads the saved subject and applies it over the own profile', async () => {
    apiFetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/counselor/session/load')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            session: {
              meta: {
                subject: {
                  name: 'Resumed Person',
                  birthDate: '1988-03-03',
                  birthTime: '09:09',
                  gender: 'female',
                  city: 'Daegu',
                  timeZone: 'Asia/Seoul',
                  latitude: 35.87,
                  longitude: 128.6,
                },
              },
            },
          }),
        })
      }
      return Promise.resolve({ ok: false, status: 401, json: async () => ({}) })
    })

    const { result } = renderHook(() => useCounselorData({ session: 'sess-123' }))

    await waitFor(() => {
      expect(result.current.parsedParams.name).toBe('Resumed Person')
    })
    const p = result.current.parsedParams
    expect(p.birthDate).toBe('1988-03-03')
    expect(p.birthTime).toBe('09:09')
    expect(p.gender).toBe('female')
    expect(p.city).toBe('Daegu')
    expect(p.latitude).toBeCloseTo(35.87)
    expect(p.longitude).toBeCloseTo(128.6)
    expect(p.timeZone).toBe('Asia/Seoul')
    // The session/load call carried the encoded sessionId.
    expect(apiFetchMock).toHaveBeenCalledWith(expect.stringContaining('sessionId=sess-123'))
  })

  it('falls back to own profile when the session has no usable subject', async () => {
    mockStoredBirthInfo = {
      name: 'Own Profile',
      birthDate: '1990-01-01',
      birthTime: '01:01',
      gender: 'male',
    }
    apiFetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/counselor/session/load')) {
        // Subject present but lacks birthDate AND name → treated as unusable.
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ session: { meta: { subject: { gender: 'female' } } } }),
        })
      }
      return Promise.resolve({ ok: false, status: 401, json: async () => ({}) })
    })

    const { result } = renderHook(() => useCounselorData({ session: 'sess-x' }))

    await waitFor(() => {
      expect(result.current.profileLoading).toBe(false)
    })
    // No subject → falls through to the localStorage-seeded own profile.
    expect(result.current.parsedParams.name).toBe('Own Profile')
  })

  it('handles a session-load network error without throwing', async () => {
    apiFetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/counselor/session/load')) {
        return Promise.reject(new Error('boom'))
      }
      return Promise.resolve({ ok: false, status: 401, json: async () => ({}) })
    })
    const { result } = renderHook(() => useCounselorData({ session: 'sess-err' }))
    await waitFor(() => {
      expect(result.current.profileLoading).toBe(false)
    })
  })

  it('does not call session/load when URL already carries birth info', () => {
    renderHook(() =>
      useCounselorData({ session: 'sess-1', birthDate: '1995-02-09', birthTime: '06:40' })
    )
    expect(
      apiFetchMock.mock.calls.some(
        (c) => typeof c[0] === 'string' && (c[0] as string).includes('session/load')
      )
    ).toBe(false)
  })

  it('does not call session/load when no session param is present', () => {
    renderHook(() => useCounselorData({}))
    expect(
      apiFetchMock.mock.calls.some(
        (c) => typeof c[0] === 'string' && (c[0] as string).includes('session/load')
      )
    ).toBe(false)
  })
})

// --- Chart-load success paths ----------------------------------------------

describe('useCounselorData — chart-load success', () => {
  it('applies /api/saju + /api/astrology data to chartData and writes the cache', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      routeFetch({
        '/api/saju': { data: { dayMaster: '갑', analyses: { foo: 1 } } },
        '/api/astrology': {
          data: { chartData: { planets: [{ name: 'Sun' }] }, aspects: [{ a: 'b' }] },
        },
      })
    )

    const { result } = renderHook(() =>
      useCounselorData({ birthDate: '1995-02-09', birthTime: '06:40' })
    )

    await waitFor(() => {
      expect(result.current.chartData?.saju).toBeTruthy()
    })
    expect((result.current.chartData?.saju as Record<string, unknown>).dayMaster).toBe('갑')

    await waitFor(() => {
      const astro = result.current.chartData?.astro as Record<string, unknown> | undefined
      expect(astro?.planets).toBeTruthy()
    })
    const astro = result.current.chartData?.astro as Record<string, unknown>
    // aspects are merged into the astro object.
    expect(astro.aspects).toEqual([{ a: 'b' }])

    // Both success paths persisted to the chart cache.
    await waitFor(() => {
      expect(saveChartDataMock).toHaveBeenCalled()
    })
  })

  it('skips the saju fetch when the cache already holds a rich saju shape', async () => {
    loadChartDataMock.mockReturnValue({
      saju: { dayMaster: '갑', analyses: { rich: true } },
      astro: { planets: [{ name: 'Sun' }] },
      advancedAstro: null,
    })
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockImplementation(routeFetch({}))

    renderHook(() => useCounselorData({ birthDate: '1995-02-09', birthTime: '06:40' }))

    // Give effects a tick to settle.
    await act(async () => {
      await Promise.resolve()
    })

    // cachedRich → no /api/saju fetch; astro present → no /api/astrology fetch.
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/saju')).toBe(false)
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/astrology')).toBe(false)
  })

  it('does not fetch charts when birthDate/birthTime are missing', async () => {
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>
    fetchMock.mockImplementation(routeFetch({}))
    renderHook(() => useCounselorData({}))
    await act(async () => {
      await Promise.resolve()
    })
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/saju')).toBe(false)
    expect(fetchMock.mock.calls.some((c) => c[0] === '/api/astrology')).toBe(false)
  })

  it('tolerates a non-ok /api/saju response (leaves saju empty)', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/saju') {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({}) })
      }
      if (url === '/api/astrology') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ data: { chartData: { planets: [] } } }),
        })
      }
      return new Promise(() => {})
    })

    const { result } = renderHook(() =>
      useCounselorData({ birthDate: '1995-02-09', birthTime: '06:40' })
    )
    await waitFor(() => {
      const astro = result.current.chartData?.astro as Record<string, unknown> | undefined
      expect(astro?.planets).toBeTruthy()
    })
    expect(result.current.chartData?.saju).toBeUndefined()
  })
})

// --- User-context load ------------------------------------------------------

describe('useCounselorData — user context load', () => {
  it('loads persona type from localStorage and recent sessions, resuming the latest', async () => {
    window.localStorage.setItem(
      'personaResult',
      JSON.stringify({ typeCode: 'INFJ', personaName: 'The Sage' })
    )
    apiFetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/counselor/chat-history')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            sessions: [
              { id: 'recent-1', summary: 's1', keyTopics: ['a'], lastMessageAt: 't1' },
              { id: 'older-2', summary: 's2', keyTopics: ['b'], lastMessageAt: 't2' },
            ],
          }),
        })
      }
      return Promise.resolve({ ok: false, status: 401, json: async () => ({}) })
    })

    const { result } = renderHook(() => useCounselorData({}))

    await waitFor(() => {
      expect(result.current.userContext?.recentSessions?.length).toBe(2)
    })
    expect(result.current.userContext?.personalityType).toEqual({
      typeCode: 'INFJ',
      personaName: 'The Sage',
    })
    // Most-recent session id is resumed.
    await waitFor(() => {
      expect(result.current.chatSessionId).toBe('recent-1')
    })
  })

  it('handles an empty session list (no resume, context still set)', async () => {
    apiFetchMock.mockImplementation((url: string) => {
      if (url.startsWith('/api/counselor/chat-history')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, sessions: [] }),
        })
      }
      return Promise.resolve({ ok: false, status: 401, json: async () => ({}) })
    })

    const { result } = renderHook(() => useCounselorData({}))
    await waitFor(() => {
      expect(result.current.userContext).toBeDefined()
    })
    expect(result.current.chatSessionId).toBeUndefined()
    expect(result.current.userContext?.recentSessions).toBeUndefined()
  })

  it('stays a guest (no userContext) when chat-history is unauthorized', async () => {
    // apiFetch default returns not-ok 401 for everything.
    const { result } = renderHook(() => useCounselorData({}))
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current.userContext).toBeUndefined()
    expect(result.current.chatSessionId).toBeUndefined()
  })
})

// --- handleSaveMessage ------------------------------------------------------

describe('useCounselorData — handleSaveMessage', () => {
  it('creates a new session, sets chatSessionId, and sends meta.profile.name', async () => {
    apiFetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/counselor/chat-history' && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, session: { id: 'new-session-9' } }),
        })
      }
      // The context-load GET stays unauthorized so chatSessionId starts undefined.
      return Promise.resolve({ ok: false, status: 401, json: async () => ({}) })
    })

    const { result } = renderHook(() =>
      useCounselorData({ name: 'Jin', birthDate: '1995-02-09', birthTime: '06:40' })
    )

    await act(async () => {
      await result.current.handleSaveMessage('hi', 'hello')
    })

    await waitFor(() => {
      expect(result.current.chatSessionId).toBe('new-session-9')
    })

    const postCall = apiFetchMock.mock.calls.find(
      (c) => c[0] === '/api/counselor/chat-history' && (c[1] as RequestInit)?.method === 'POST'
    )
    expect(postCall).toBeDefined()
    const body = JSON.parse((postCall?.[1] as RequestInit).body as string)
    expect(body.userMessage).toBe('hi')
    expect(body.assistantMessage).toBe('hello')
    // New session (no prior id) + a name → meta.profile.name attached.
    expect(body.meta).toEqual({ profile: { name: 'Jin' } })
    expect(body.sessionId).toBeUndefined()
  })

  it('omits meta when there is no name to attach', async () => {
    apiFetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/counselor/chat-history' && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true, session: { id: 's1' } }),
        })
      }
      return Promise.resolve({ ok: false, status: 401, json: async () => ({}) })
    })

    const { result } = renderHook(() =>
      useCounselorData({ birthDate: '1995-02-09', birthTime: '06:40' })
    )

    await act(async () => {
      await result.current.handleSaveMessage('hi', 'hello')
    })

    const postCall = apiFetchMock.mock.calls.find(
      (c) => c[0] === '/api/counselor/chat-history' && (c[1] as RequestInit)?.method === 'POST'
    )
    const body = JSON.parse((postCall?.[1] as RequestInit).body as string)
    expect(body.meta).toBeUndefined()
  })

  it('swallows a save error without throwing', async () => {
    apiFetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/counselor/chat-history' && init?.method === 'POST') {
        return Promise.reject(new Error('save failed'))
      }
      return Promise.resolve({ ok: false, status: 401, json: async () => ({}) })
    })

    const { result } = renderHook(() =>
      useCounselorData({ name: 'Jin', birthDate: '1995-02-09', birthTime: '06:40' })
    )

    await expect(
      act(async () => {
        await result.current.handleSaveMessage('hi', 'hello')
      })
    ).resolves.not.toThrow()
    expect(result.current.chatSessionId).toBeUndefined()
  })
})
