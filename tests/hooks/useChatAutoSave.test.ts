import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { useChatAutoSave, type UseChatAutoSaveOptions } from '@/hooks/useChatAutoSave'
import type { ChatTurn } from '@/types/chat'

const mockedFetch = global.fetch as ReturnType<typeof vi.fn>

const DEFAULT_DEBOUNCE = 2000

const userTurn = (content = 'hi'): ChatTurn => ({ role: 'user', content })
const assistantTurn = (content = 'hello'): ChatTurn => ({ role: 'assistant', content })
const systemTurn = (content = 'sys'): ChatTurn => ({ role: 'system', content })

const baseOptions = (overrides: Partial<UseChatAutoSaveOptions> = {}): UseChatAutoSaveOptions => ({
  enabled: true,
  sessionId: 'session-1',
  locale: 'ko',
  messages: [userTurn()],
  endpoint: '/api/test/save',
  ...overrides,
})

function parseBody(callIndex = 0) {
  const call = mockedFetch.mock.calls[callIndex]
  return JSON.parse(call[1].body)
}

describe('useChatAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockedFetch.mockResolvedValue({ ok: true, json: async () => ({}), text: async () => '{}' })
    // sendBeacon is used by the beforeunload handler.
    Object.defineProperty(navigator, 'sendBeacon', {
      value: vi.fn(() => true),
      configurable: true,
      writable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not save when disabled', () => {
    renderHook(() => useChatAutoSave(baseOptions({ enabled: false })))
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE + 100)
    })
    expect(mockedFetch).not.toHaveBeenCalled()
  })

  it('does not save when there are no messages', () => {
    renderHook(() => useChatAutoSave(baseOptions({ messages: [] })))
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE + 100)
    })
    expect(mockedFetch).not.toHaveBeenCalled()
  })

  it('does not save when only system messages are present', () => {
    renderHook(() => useChatAutoSave(baseOptions({ messages: [systemTurn()] })))
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE + 100)
    })
    expect(mockedFetch).not.toHaveBeenCalled()
  })

  it('saves after the debounce window with the expected payload', () => {
    renderHook(() =>
      useChatAutoSave(baseOptions({ messages: [userTurn('q'), assistantTurn('a')] }))
    )

    expect(mockedFetch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE)
    })

    expect(mockedFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockedFetch.mock.calls[0]
    expect(url).toBe('/api/test/save')
    expect(init.method).toBe('POST')
    const body = parseBody()
    expect(body.sessionId).toBe('session-1')
    expect(body.locale).toBe('ko')
    expect(body.messages).toEqual([userTurn('q'), assistantTurn('a')])
  })

  it('strips system messages from the saved payload', () => {
    renderHook(() =>
      useChatAutoSave(baseOptions({ messages: [systemTurn(), userTurn('q'), assistantTurn('a')] }))
    )
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE)
    })
    const body = parseBody()
    expect(body.messages).toEqual([userTurn('q'), assistantTurn('a')])
  })

  it('includes extra payload fields', () => {
    renderHook(() => useChatAutoSave(baseOptions({ extra: { coupleId: 'c-9' } })))
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE)
    })
    const body = parseBody()
    expect(body.coupleId).toBe('c-9')
  })

  it('defaults missing locale to ko', () => {
    renderHook(() => useChatAutoSave(baseOptions({ locale: '' })))
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE)
    })
    expect(parseBody().locale).toBe('ko')
  })

  it('resolves sessionId from a RefObject', () => {
    const ref = { current: 'ref-session' }
    renderHook(() => useChatAutoSave(baseOptions({ sessionId: ref })))
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE)
    })
    expect(parseBody().sessionId).toBe('ref-session')
  })

  it('honors a custom debounce interval', () => {
    renderHook(() => useChatAutoSave(baseOptions({ debounceMs: 500 })))

    act(() => {
      vi.advanceTimersByTime(499)
    })
    expect(mockedFetch).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(mockedFetch).toHaveBeenCalledTimes(1)
  })

  it('debounces rapid message changes into a single save', () => {
    const { rerender } = renderHook((props: UseChatAutoSaveOptions) => useChatAutoSave(props), {
      initialProps: baseOptions({ messages: [userTurn('a')] }),
    })

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    rerender(baseOptions({ messages: [userTurn('a'), assistantTurn('b')] }))
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    rerender(baseOptions({ messages: [userTurn('a'), assistantTurn('b'), userTurn('c')] }))

    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE)
    })

    expect(mockedFetch).toHaveBeenCalledTimes(1)
    expect(parseBody().messages).toHaveLength(3)
  })

  it('swallows save failures without throwing', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('network down'))
    renderHook(() => useChatAutoSave(baseOptions()))

    await act(async () => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE)
      await Promise.resolve()
    })

    expect(mockedFetch).toHaveBeenCalledTimes(1)
  })

  it('flushes the pending payload via keepalive on unmount', () => {
    const { unmount } = renderHook(() => useChatAutoSave(baseOptions()))

    // Mount fires the debounce effect and sets latestPayloadRef but the timer
    // has not elapsed yet, so the unmount flush should send it.
    unmount()

    // Two calls are possible: the debounced timer is cleared on unmount, then
    // the unmount-flush effect sends a keepalive fetch.
    const keepaliveCall = mockedFetch.mock.calls.find((c) => c[1]?.keepalive === true)
    expect(keepaliveCall).toBeDefined()
    expect(keepaliveCall?.[0]).toBe('/api/test/save')
  })

  it('does not flush on unmount once the payload has already been saved', () => {
    const { unmount } = renderHook(() => useChatAutoSave(baseOptions()))

    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE)
    })
    // After save, latestPayloadRef is cleared.
    mockedFetch.mockClear()

    unmount()
    const keepaliveCall = mockedFetch.mock.calls.find((c) => c[1]?.keepalive === true)
    expect(keepaliveCall).toBeUndefined()
  })

  it('flushes the latest payload via sendBeacon on beforeunload', () => {
    renderHook(() => useChatAutoSave(baseOptions()))

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1)
    const [url, payload] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toBe('/api/test/save')
    expect(JSON.parse(payload).sessionId).toBe('session-1')
  })

  it('does not register beforeunload flush when disabled', () => {
    renderHook(() => useChatAutoSave(baseOptions({ enabled: false })))
    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
  })

  it('does not call sendBeacon when there is no pending payload', () => {
    renderHook(() => useChatAutoSave(baseOptions()))

    // Flush via the debounce save so latestPayloadRef is cleared.
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE)
    })

    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
  })

  it('uses the default endpoint when none is provided', () => {
    const opts = baseOptions()
    delete (opts as Partial<UseChatAutoSaveOptions>).endpoint
    renderHook(() => useChatAutoSave(opts))
    act(() => {
      vi.advanceTimersByTime(DEFAULT_DEBOUNCE)
    })
    expect(mockedFetch.mock.calls[0][0]).toBe('/api/counselor/session/save')
  })

  it('clears stale payload when messages become empty so unmount does not resend', () => {
    const { rerender, unmount } = renderHook(
      (props: UseChatAutoSaveOptions) => useChatAutoSave(props),
      { initialProps: baseOptions({ messages: [userTurn('a')] }) }
    )

    // Now empty the messages — latestPayloadRef should be nulled.
    rerender(baseOptions({ messages: [] }))
    mockedFetch.mockClear()

    unmount()
    const keepaliveCall = mockedFetch.mock.calls.find((c) => c[1]?.keepalive === true)
    expect(keepaliveCall).toBeUndefined()
  })
})
