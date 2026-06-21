import React from 'react'
import { render, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useSession } from 'next-auth/react'
import SessionSync from '@/components/auth/SessionSync'

const mockUseSession = useSession as ReturnType<typeof vi.fn>

const STORAGE_KEY = 'auth:refresh'

function setSession(status: 'loading' | 'authenticated' | 'unauthenticated', update = vi.fn()) {
  mockUseSession.mockReturnValue({ status, data: null, update } as any)
  return update
}

describe('SessionSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    localStorage.clear()
    sessionStorage.clear()
    // Reset URL to a clean default for each test.
    window.history.replaceState({}, '', 'http://localhost:3000/')
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('renders nothing (side-effect only component)', () => {
    setSession('unauthenticated')
    const { container } = render(<SessionSync />)
    expect(container.firstChild).toBeNull()
  })

  it('creates and persists a stable tab id in sessionStorage', () => {
    setSession('unauthenticated')
    render(<SessionSync />)
    const tabId = sessionStorage.getItem('__dp_tab_id__')
    expect(tabId).toBeTruthy()
  })

  it('does not call update() on first render without authRefresh param', () => {
    const update = setSession('unauthenticated')
    render(<SessionSync />)
    expect(update).not.toHaveBeenCalled()
  })

  it('calls update() and strips authRefresh=1 from the URL on mount', () => {
    const update = setSession('authenticated')
    update.mockResolvedValue(undefined)
    window.history.replaceState({}, '', 'http://localhost:3000/?authRefresh=1&keep=2')

    render(<SessionSync />)

    expect(update).toHaveBeenCalledTimes(1)
    // authRefresh removed, other params kept
    expect(window.location.href).not.toContain('authRefresh')
    expect(window.location.href).toContain('keep=2')
  })

  it('writes a terminal status broadcast to localStorage on auth state change', () => {
    // Mount as unauthenticated, then rerender authenticated → broadcast.
    const update = setSession('unauthenticated')
    update.mockResolvedValue(undefined)
    const { rerender } = render(<SessionSync />)

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

    setSession('authenticated', update)
    rerender(<SessionSync />)

    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed.status).toBe('authenticated')
    expect(parsed.tabId).toBeTruthy()
    expect(typeof parsed.ts).toBe('number')
  })

  it('does not broadcast on a loading→terminal transition', () => {
    const update = setSession('loading')
    update.mockResolvedValue(undefined)
    const { rerender } = render(<SessionSync />)

    setSession('authenticated', update)
    rerender(<SessionSync />)

    // prevStatus was 'loading' which is non-terminal → no broadcast
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('schedules a refresh when a cross-tab storage event from another tab arrives', () => {
    const update = setSession('authenticated')
    update.mockResolvedValue(undefined)
    render(<SessionSync />)
    update.mockClear()

    const event = new StorageEvent('storage', {
      key: STORAGE_KEY,
      newValue: JSON.stringify({
        tabId: 'a-different-tab',
        ts: Date.now(),
        status: 'authenticated',
      }),
    })
    act(() => {
      window.dispatchEvent(event)
    })

    // Debounced — runs after the timer.
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(update).toHaveBeenCalled()
  })

  it('ignores storage events from its own tab', () => {
    const update = setSession('authenticated')
    update.mockResolvedValue(undefined)
    render(<SessionSync />)
    const ownTabId = sessionStorage.getItem('__dp_tab_id__')
    update.mockClear()

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify({ tabId: ownTabId, ts: Date.now(), status: 'authenticated' }),
        })
      )
      vi.advanceTimersByTime(900)
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('ignores storage events for unrelated keys', () => {
    const update = setSession('authenticated')
    update.mockResolvedValue(undefined)
    render(<SessionSync />)
    update.mockClear()

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'some-other-key', newValue: 'x' }))
      vi.advanceTimersByTime(900)
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('ignores stale storage events (older than max age)', () => {
    const update = setSession('authenticated')
    update.mockResolvedValue(undefined)
    render(<SessionSync />)
    update.mockClear()

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify({
            tabId: 'other',
            ts: Date.now() - 60_000,
            status: 'authenticated',
          }),
        })
      )
      vi.advanceTimersByTime(900)
    })
    expect(update).not.toHaveBeenCalled()
  })

  it('ignores malformed storage payloads without throwing', () => {
    setSession('authenticated')
    render(<SessionSync />)
    expect(() =>
      act(() => {
        window.dispatchEvent(
          new StorageEvent('storage', { key: STORAGE_KEY, newValue: '{not json' })
        )
        vi.advanceTimersByTime(900)
      })
    ).not.toThrow()
  })

  it('removes the storage listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    setSession('authenticated')
    const { unmount } = render(<SessionSync />)
    unmount()
    expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function))
  })
})
