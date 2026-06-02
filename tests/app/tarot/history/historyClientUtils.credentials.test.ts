// Regression: the tarot history flow must send the session cookie.
//
// On mobile in-app browsers (KakaoTalk etc.) native fetch's default
// `credentials: 'same-origin'` can drop the session cookie, so a
// logged-in user's request lands as a guest (401). For the history
// read this meant server-saved readings silently never appeared
// ("저장은 되는데 안 보임"); for the migration POST it meant guest
// readings never moved to the account. The fix routes these through
// apiFetch, which sets `credentials: 'include'` (same fix as #1037 for
// the inline counselor save). This test locks that in.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { migrateLocalReadingsToServer } from '@/app/tarot/history/historyClientUtils'

const STORAGE_KEY = 'tarot_saved_readings'
const MIGRATION_FLAG = 'tarot_local_to_server_migrated_v1'

const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

function seedOneLocalReading() {
  const reading = {
    id: 'local_1',
    timestamp: Date.now(),
    question: '이직해도 될까요?',
    spread: { title: 'Three Card' },
    spreadId: 'three-card',
    cards: [{ name: 'The Fool', isReversed: false, position: '현재' }],
    interpretation: { overallMessage: 'hi', guidance: 'g', cardInsights: [] },
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([reading]))
}

describe('tarot history migration sends credentials via apiFetch', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    window.localStorage.clear()
  })

  it("POSTs /api/tarot/save with credentials:'include' (not same-origin)", async () => {
    seedOneLocalReading()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })

    const result = await migrateLocalReadingsToServer()

    expect(result.migrated).toBe(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('/api/tarot/save')
    expect(init.method).toBe('POST')
    // The whole point of the fix: cookies must ride along.
    expect(init.credentials).toBe('include')
    expect(init.credentials).not.toBe('same-origin')
  })

  it('marks migration done so it does not re-run', async () => {
    seedOneLocalReading()
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })

    await migrateLocalReadingsToServer()
    expect(window.localStorage.getItem(MIGRATION_FLAG)).toBeTruthy()

    // Second call is a no-op (flag set) — no further network calls.
    mockFetch.mockClear()
    const second = await migrateLocalReadingsToServer()
    expect(second).toEqual({ migrated: 0, failed: 0 })
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
