// tests/hooks/useSessionPersistence.unmount.test.ts
// Regression: hooks/useSessionPersistence used to call setSaveError after
// `await fetch` without a mount guard. If the user navigated away during
// the 2s debounce + slow save, the post-await setSaveError would land on
// a torn-down component (React warning + stale state churn next mount).
// This test pins the fix: unmount + slow-resolving fetch → no setState.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSessionPersistence } from '@/hooks/useSessionPersistence'

describe('useSessionPersistence — unmount safety', () => {
  let resolveFetch: ((value: Response) => void) | null = null
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    vi.useFakeTimers()
    originalFetch = globalThis.fetch
    // Deferred fetch — never resolves on its own. The test resolves it
    // *after* unmount to simulate a slow save that completes too late.
    globalThis.fetch = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal
      return new Promise<Response>((resolve, reject) => {
        resolveFetch = resolve
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('aborted')
            ;(err as Error & { name: string }).name = 'AbortError'
            reject(err)
          })
        }
      })
    }) as unknown as typeof globalThis.fetch
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.fetch = originalFetch
    resolveFetch = null
  })

  it('does not call setSaveError after unmount when fetch resolves late', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { unmount } = renderHook(() =>
      useSessionPersistence({
        messages: [{ role: 'user', content: 'hi' }] as never,
        sessionId: 'sess-1',
        enableDbPersistence: true,
        sessionLoaded: true,
        lang: 'ko',
      })
    )

    // Advance past the 2s debounce so the save kicks off.
    await act(async () => {
      vi.advanceTimersByTime(2100)
    })

    // Save fetch is now in-flight (resolveFetch is registered).
    expect(typeof resolveFetch).toBe('function')

    // Tear down mid-flight.
    unmount()

    // Resolve the fetch *after* unmount — pre-fix this would trigger
    // setSaveError on a torn-down tree (React warning to console.error).
    await act(async () => {
      resolveFetch?.({
        ok: false,
        status: 500,
        statusText: 'Internal',
      } as Response)
      // Let any queued microtasks settle.
      await Promise.resolve()
      await Promise.resolve()
    })

    // The post-unmount setState would surface as a React act() / state-
    // update warning. None means the mounted-ref guard worked.
    const stateUpdateWarnings = errorSpy.mock.calls.filter((call) => {
      const msg = String(call[0] || '')
      return msg.includes("Can't perform a React state update") || msg.includes('unmounted')
    })
    expect(stateUpdateWarnings).toEqual([])

    errorSpy.mockRestore()
  })
})
