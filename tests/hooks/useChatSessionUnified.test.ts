// tests/hooks/useChatSessionUnified.test.ts
//
// Complements tests/hooks/useChatSession.test.ts (which mostly exercises plain
// state setters). This file targets the *uncovered* branches of the unified
// hook itself: the action callbacks (add/update messages, feedback toggle,
// clearChat/startNewChat, abort controller lifecycle), the sessionStorage
// restore path in the lazy initializer, and the unmount cleanup.
//
// The child hooks (useSessionPersistence, useSessionHistory) are mocked so we
// isolate the wrapper's own logic and don't fire their network/effect chains.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// --- Mocks -----------------------------------------------------------------

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// Stable, predictable IDs so we can assert clearChat rotates the session id.
let idCounter = 0
vi.mock('@/components/destiny-map/chat-utils', () => ({
  generateSessionId: vi.fn(() => `session-${++idCounter}`),
  generateMessageId: vi.fn((prefix: string) => `${prefix}-id`),
}))

// Isolate the wrapper: child hooks become inert no-ops returning stable shapes.
const persistenceSpy = vi.fn()
vi.mock('@/hooks/useSessionPersistence', () => ({
  useSessionPersistence: (opts: unknown) => {
    persistenceSpy(opts)
    return { saveError: null }
  },
}))

const loadSessionHistoryMock = vi.fn()
const loadSessionMock = vi.fn()
const deleteSessionMock = vi.fn()
const setDeleteConfirmIdMock = vi.fn()
vi.mock('@/hooks/useSessionHistory', () => ({
  useSessionHistory: vi.fn(() => ({
    sessionHistory: [],
    historyLoading: false,
    deleteConfirmId: null,
    setDeleteConfirmId: setDeleteConfirmIdMock,
    loadSessionHistory: loadSessionHistoryMock,
    loadSession: loadSessionMock,
    deleteSession: deleteSessionMock,
  })),
}))

// sessionStorage shim (jsdom provides one, but we want spies + a clean store).
const store: Record<string, string> = {}
const mockSessionStorage = {
  getItem: vi.fn((k: string) => store[k] ?? null),
  setItem: vi.fn((k: string, v: string) => {
    store[k] = v
  }),
  removeItem: vi.fn((k: string) => {
    delete store[k]
  }),
  clear: vi.fn(() => {
    for (const k of Object.keys(store)) delete store[k]
  }),
}
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage, configurable: true })

import { useChatSession } from '@/hooks/useChatSession.unified'

beforeEach(() => {
  vi.clearAllMocks()
  idCounter = 0
  mockSessionStorage.clear()
})

// --- sessionStorage restore (lazy initializer) ------------------------------

describe('useChatSession — sessionStorage restore', () => {
  it('restores a non-empty stored array of messages', () => {
    const stored = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ]
    store['chat-key'] = JSON.stringify(stored)

    const { result } = renderHook(() => useChatSession({ storageKey: 'chat-key' }))
    expect(result.current.messages).toEqual(stored)
  })

  it('ignores an empty stored array and falls back to initialContext', () => {
    store['chat-key'] = JSON.stringify([])
    const { result } = renderHook(() =>
      useChatSession({ storageKey: 'chat-key', initialContext: 'sys' })
    )
    expect(result.current.messages).toEqual([{ role: 'system', content: 'sys' }])
  })

  it('ignores a non-array stored value', () => {
    store['chat-key'] = JSON.stringify({ not: 'an array' })
    const { result } = renderHook(() => useChatSession({ storageKey: 'chat-key' }))
    expect(result.current.messages).toEqual([])
  })

  it('swallows malformed JSON in storage and starts empty', () => {
    store['chat-key'] = '{ not valid json'
    const { result } = renderHook(() => useChatSession({ storageKey: 'chat-key' }))
    expect(result.current.messages).toEqual([])
  })

  it('returns empty when no storageKey is provided', () => {
    const { result } = renderHook(() => useChatSession())
    expect(result.current.messages).toEqual([])
  })
})

// --- Message actions --------------------------------------------------------

describe('useChatSession — message actions', () => {
  it('addUserMessage appends a user message and hides suggestions', () => {
    const { result } = renderHook(() => useChatSession())
    expect(result.current.showSuggestions).toBe(true)

    let returned: unknown
    act(() => {
      returned = result.current.addUserMessage('a question')
    })

    expect(result.current.messages).toEqual([{ role: 'user', content: 'a question' }])
    expect(result.current.showSuggestions).toBe(false)
    expect(returned).toEqual({ role: 'user', content: 'a question' })
  })

  it('addAssistantMessage appends an assistant message', () => {
    const { result } = renderHook(() => useChatSession())
    act(() => {
      result.current.addAssistantMessage('an answer')
    })
    expect(result.current.messages).toEqual([{ role: 'assistant', content: 'an answer' }])
  })

  it('updateLastAssistantMessage patches the trailing assistant bubble (streaming)', () => {
    const { result } = renderHook(() => useChatSession())
    act(() => {
      result.current.addUserMessage('q')
      result.current.addAssistantMessage('partial')
    })
    act(() => {
      result.current.updateLastAssistantMessage('partial + more')
    })
    expect(result.current.messages[result.current.messages.length - 1]).toEqual({
      role: 'assistant',
      content: 'partial + more',
    })
  })

  it('updateLastAssistantMessage is a no-op when the last message is not assistant', () => {
    const { result } = renderHook(() => useChatSession())
    act(() => {
      result.current.addUserMessage('q')
    })
    act(() => {
      result.current.updateLastAssistantMessage('should be ignored')
    })
    // Last message stays the user message, untouched.
    expect(result.current.messages).toEqual([{ role: 'user', content: 'q' }])
  })

  it('updateLastAssistantMessage is a no-op on empty message list', () => {
    const { result } = renderHook(() => useChatSession())
    act(() => {
      result.current.updateLastAssistantMessage('nothing to patch')
    })
    expect(result.current.messages).toEqual([])
  })
})

// --- Feedback toggle --------------------------------------------------------

describe('useChatSession — feedback toggle', () => {
  it('sets feedback for a message index', () => {
    const { result } = renderHook(() => useChatSession())
    act(() => {
      result.current.handleFeedback(0, 'up')
    })
    expect(result.current.feedback).toEqual({ 0: 'up' })
  })

  it('toggles the same feedback off (clicking the same value again)', () => {
    const { result } = renderHook(() => useChatSession())
    act(() => {
      result.current.handleFeedback(0, 'up')
    })
    act(() => {
      result.current.handleFeedback(0, 'up')
    })
    expect(result.current.feedback).toEqual({ 0: null })
  })

  it('switches feedback from up to down', () => {
    const { result } = renderHook(() => useChatSession())
    act(() => {
      result.current.handleFeedback(1, 'up')
    })
    act(() => {
      result.current.handleFeedback(1, 'down')
    })
    expect(result.current.feedback).toEqual({ 1: 'down' })
  })
})

// --- clearChat / startNewChat ----------------------------------------------

describe('useChatSession — clearChat / startNewChat', () => {
  it('clearChat resets state and rotates the session id ref', () => {
    const { result } = renderHook(() =>
      useChatSession({ initialFollowUps: ['f1'], storageKey: 'chat-key' })
    )
    act(() => {
      result.current.addUserMessage('q')
      result.current.setInput('typed')
      result.current.handleFeedback(0, 'up')
      result.current.setFollowUpQuestions(['changed'])
    })

    const idBefore = result.current.sessionIdRef.current

    act(() => {
      result.current.clearChat()
    })

    expect(result.current.messages).toEqual([])
    expect(result.current.input).toBe('')
    expect(result.current.feedback).toEqual({})
    expect(result.current.followUpQuestions).toEqual(['f1'])
    expect(result.current.showSuggestions).toBe(true)
    expect(result.current.error).toBeNull()
    // sessionIdRef rotated to a fresh generated id.
    expect(result.current.sessionIdRef.current).not.toBe(idBefore)
    // storageKey present → sessionStorage.removeItem called.
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('chat-key')
  })

  it('clearChat restores initialContext as the first system message', () => {
    const { result } = renderHook(() => useChatSession({ initialContext: 'sys ctx' }))
    act(() => {
      result.current.addUserMessage('q')
    })
    act(() => {
      result.current.clearChat()
    })
    expect(result.current.messages).toEqual([{ role: 'system', content: 'sys ctx' }])
  })

  it('clearChat without a storageKey does not touch sessionStorage', () => {
    const { result } = renderHook(() => useChatSession())
    act(() => {
      result.current.clearChat()
    })
    expect(mockSessionStorage.removeItem).not.toHaveBeenCalled()
  })

  it('startNewChat delegates to clearChat', () => {
    const { result } = renderHook(() => useChatSession())
    act(() => {
      result.current.addUserMessage('q')
    })
    act(() => {
      result.current.startNewChat()
    })
    expect(result.current.messages).toEqual([])
  })
})

// --- Abort controller lifecycle --------------------------------------------

describe('useChatSession — abort controller', () => {
  it('createAbortController returns a fresh, un-aborted controller', () => {
    const { result } = renderHook(() => useChatSession())
    let ctrl: AbortController | undefined
    act(() => {
      ctrl = result.current.createAbortController()
    })
    expect(ctrl).toBeInstanceOf(AbortController)
    expect(ctrl?.signal.aborted).toBe(false)
  })

  it('createAbortController aborts the previous controller before creating a new one', () => {
    const { result } = renderHook(() => useChatSession())
    let first: AbortController | undefined
    let second: AbortController | undefined
    act(() => {
      first = result.current.createAbortController()
    })
    act(() => {
      second = result.current.createAbortController()
    })
    expect(first?.signal.aborted).toBe(true)
    expect(second?.signal.aborted).toBe(false)
  })

  it('abortRequest aborts the active controller', () => {
    const { result } = renderHook(() => useChatSession())
    let ctrl: AbortController | undefined
    act(() => {
      ctrl = result.current.createAbortController()
    })
    act(() => {
      result.current.abortRequest()
    })
    expect(ctrl?.signal.aborted).toBe(true)
  })

  it('abortRequest is safe to call with no active controller', () => {
    const { result } = renderHook(() => useChatSession())
    expect(() => {
      act(() => {
        result.current.abortRequest()
      })
    }).not.toThrow()
  })

  it('aborts the in-flight controller on unmount', () => {
    const { result, unmount } = renderHook(() => useChatSession())
    let ctrl: AbortController | undefined
    act(() => {
      ctrl = result.current.createAbortController()
    })
    expect(ctrl?.signal.aborted).toBe(false)
    unmount()
    expect(ctrl?.signal.aborted).toBe(true)
  })
})

// --- scrollToBottom + misc wiring ------------------------------------------

describe('useChatSession — scroll + persistence wiring', () => {
  it('scrollToBottom invokes scrollIntoView when the ref is attached', () => {
    const { result } = renderHook(() => useChatSession())
    const scrollIntoView = vi.fn()
    // Attach a fake element to the messagesEndRef.
    ;(result.current.messagesEndRef as { current: unknown }).current = { scrollIntoView }
    act(() => {
      result.current.scrollToBottom()
    })
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
  })

  it('forwards lang + persistence options to useSessionPersistence', () => {
    renderHook(() => useChatSession({ enableDbPersistence: true, lang: 'en', storageKey: 'sk' }))
    expect(persistenceSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        enableDbPersistence: true,
        lang: 'en',
        storageKey: 'sk',
      })
    )
  })

  it('marks the session as loaded after mount', () => {
    const { result } = renderHook(() => useChatSession())
    expect(result.current.sessionLoaded).toBe(true)
  })

  it('exposes saveError from the persistence child hook', () => {
    const { result } = renderHook(() => useChatSession())
    expect(result.current.saveError).toBeNull()
  })

  it('exposes session-history actions from the child hook', () => {
    const { result } = renderHook(() => useChatSession())
    expect(result.current.loadSessionHistory).toBe(loadSessionHistoryMock)
    expect(result.current.loadSession).toBe(loadSessionMock)
    expect(result.current.deleteSession).toBe(deleteSessionMock)
  })
})
