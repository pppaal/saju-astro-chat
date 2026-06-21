/**
 * useChatSession Hook Tests
 * 채팅 세션 상태/지속성(목록 로드, 로드/삭제/리네임, 새 채팅) 훅 테스트
 *
 * NOTE: useChatSession is @deprecated in favor of useChatSession.unified, but
 * still exercised here for coverage of the remaining behaviour.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useChatSession } from '@/components/destiny-map/hooks/useChatSession'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock session-deleted broadcast so we can assert it fires on delete.
const mockEmitSessionDeleted = vi.fn()
vi.mock('@/lib/counselor/sessionEvents', () => ({
  emitSessionDeleted: (id: string) => mockEmitSessionDeleted(id),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('useChatSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  describe('initialization', () => {
    it('should start empty with no initial context', () => {
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))

      expect(result.current.messages).toEqual([])
      expect(result.current.sessionHistory).toEqual([])
      expect(result.current.historyLoading).toBe(false)
      expect(result.current.deleteConfirmId).toBeNull()
      expect(result.current.sessionIdRef.current).toMatch(/^chat_/)
    })

    it('should seed a system message when initialContext is provided', () => {
      const { result } = renderHook(() =>
        useChatSession({ lang: 'en', initialContext: 'You are a counselor.' })
      )

      expect(result.current.messages).toEqual([{ role: 'system', content: 'You are a counselor.' }])
    })

    it('should mark the session as loaded on mount', async () => {
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))

      await waitFor(() => {
        expect(result.current.sessionLoaded).toBe(true)
      })
    })

    it('should generate distinct session ids across mounts', () => {
      const a = renderHook(() => useChatSession({ lang: 'en' }))
      const b = renderHook(() => useChatSession({ lang: 'en' }))
      expect(a.result.current.sessionIdRef.current).not.toBe(b.result.current.sessionIdRef.current)
    })
  })

  describe('optimistic history upsert on first user message', () => {
    it('should add an entry when a user message appears', async () => {
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))

      await waitFor(() => expect(result.current.sessionLoaded).toBe(true))

      act(() => {
        result.current.setMessages([{ role: 'user', content: 'Hello there counselor' }])
      })

      await waitFor(() => {
        expect(result.current.sessionHistory.length).toBe(1)
      })
      const entry = result.current.sessionHistory[0]
      expect(entry.id).toBe(result.current.sessionIdRef.current)
      expect(entry.title).toBe('Hello there counselor')
      expect(entry.messageCount).toBe(1)
    })

    it('should not add an entry when only system messages exist', async () => {
      const { result } = renderHook(() =>
        useChatSession({ lang: 'en', initialContext: 'system ctx' })
      )

      await waitFor(() => expect(result.current.sessionLoaded).toBe(true))

      expect(result.current.sessionHistory).toEqual([])
    })

    it('should truncate the derived title to 60 chars', async () => {
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))
      await waitFor(() => expect(result.current.sessionLoaded).toBe(true))

      const long = 'q'.repeat(100)
      act(() => {
        result.current.setMessages([{ role: 'user', content: long }])
      })

      await waitFor(() => expect(result.current.sessionHistory.length).toBe(1))
      expect(result.current.sessionHistory[0].title.length).toBe(60)
    })

    it('should update an existing entry in place (not duplicate) and bump count', async () => {
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))
      await waitFor(() => expect(result.current.sessionLoaded).toBe(true))

      act(() => {
        result.current.setMessages([{ role: 'user', content: 'First question here' }])
      })
      await waitFor(() => expect(result.current.sessionHistory.length).toBe(1))

      act(() => {
        result.current.setMessages([
          { role: 'user', content: 'First question here' },
          { role: 'assistant', content: 'Answer' },
        ])
      })

      await waitFor(() => expect(result.current.sessionHistory[0].messageCount).toBe(2))
      expect(result.current.sessionHistory.length).toBe(1)
      // first user message is preserved as the title
      expect(result.current.sessionHistory[0].title).toBe('First question here')
    })
  })

  describe('loadSessionHistory', () => {
    it('should populate history from the list endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          sessions: [{ id: 's1', messageCount: 3, updatedAt: 'now', title: 'Past chat' }],
        }),
      })

      const { result } = renderHook(() => useChatSession({ lang: 'en' }))

      await act(async () => {
        await result.current.loadSessionHistory()
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/counselor/session/list?limit=20')
      expect(result.current.sessionHistory).toEqual([
        { id: 's1', messageCount: 3, updatedAt: 'now', title: 'Past chat' },
      ])
      expect(result.current.historyLoading).toBe(false)
    })

    it('should default to an empty list when the response omits sessions', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({}) })

      const { result } = renderHook(() => useChatSession({ lang: 'en' }))
      await act(async () => {
        await result.current.loadSessionHistory()
      })

      expect(result.current.sessionHistory).toEqual([])
    })

    it('should leave history untouched on a non-ok response', async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({}) })

      const { result } = renderHook(() => useChatSession({ lang: 'en' }))
      await act(async () => {
        await result.current.loadSessionHistory()
      })

      expect(result.current.sessionHistory).toEqual([])
      expect(result.current.historyLoading).toBe(false)
    })

    it('should swallow fetch errors and reset loading', async () => {
      mockFetch.mockRejectedValue(new Error('network'))

      const { result } = renderHook(() => useChatSession({ lang: 'en' }))
      await act(async () => {
        await result.current.loadSessionHistory()
      })

      expect(result.current.historyLoading).toBe(false)
      expect(result.current.sessionHistory).toEqual([])
    })
  })

  describe('loadSession', () => {
    it('should load messages and adopt the server session id', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          sessionId: 'server-sid',
          messages: [{ role: 'user', content: 'restored' }],
        }),
      })

      const { result } = renderHook(() => useChatSession({ lang: 'en' }))

      await act(async () => {
        await result.current.loadSession('s1')
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/counselor/session/load?sessionId=s1')
      expect(result.current.messages).toEqual([{ role: 'user', content: 'restored' }])
      expect(result.current.sessionIdRef.current).toBe('server-sid')
    })

    it('should fall back to the requested id when the server omits sessionId', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [{ role: 'user', content: 'x' }] }),
      })

      const { result } = renderHook(() => useChatSession({ lang: 'en' }))
      await act(async () => {
        await result.current.loadSession('req-id')
      })

      expect(result.current.sessionIdRef.current).toBe('req-id')
    })

    it('should ignore a response without a messages array', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ messages: 'nope' }) })

      const { result } = renderHook(() => useChatSession({ lang: 'en' }))
      const before = result.current.sessionIdRef.current

      await act(async () => {
        await result.current.loadSession('s1')
      })

      expect(result.current.messages).toEqual([])
      expect(result.current.sessionIdRef.current).toBe(before)
    })

    it('should swallow fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('boom'))
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))

      await act(async () => {
        await result.current.loadSession('s1')
      })

      expect(result.current.messages).toEqual([])
    })
  })

  describe('deleteSession', () => {
    it('should remove the session, clear confirm, and broadcast deletion', async () => {
      // First populate the list.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessions: [
            { id: 's1', messageCount: 1, updatedAt: 'now' },
            { id: 's2', messageCount: 2, updatedAt: 'now' },
          ],
        }),
      })

      const { result } = renderHook(() => useChatSession({ lang: 'en' }))
      await act(async () => {
        await result.current.loadSessionHistory()
      })

      act(() => result.current.setDeleteConfirmId('s1'))

      mockFetch.mockResolvedValueOnce({ ok: true })
      await act(async () => {
        await result.current.deleteSession('s1')
      })

      expect(mockFetch).toHaveBeenLastCalledWith('/api/counselor/session/list?sessionId=s1', {
        method: 'DELETE',
      })
      expect(result.current.sessionHistory.map((s) => s.id)).toEqual(['s2'])
      expect(result.current.deleteConfirmId).toBeNull()
      expect(mockEmitSessionDeleted).toHaveBeenCalledWith('s1')
    })

    it('should not mutate state when the delete fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sessions: [{ id: 's1', messageCount: 1, updatedAt: 'now' }] }),
      })
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))
      await act(async () => {
        await result.current.loadSessionHistory()
      })

      mockFetch.mockResolvedValueOnce({ ok: false })
      await act(async () => {
        await result.current.deleteSession('s1')
      })

      expect(result.current.sessionHistory.map((s) => s.id)).toEqual(['s1'])
      expect(mockEmitSessionDeleted).not.toHaveBeenCalled()
    })

    it('should swallow fetch errors during delete', async () => {
      mockFetch.mockRejectedValue(new Error('net'))
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))

      await act(async () => {
        await result.current.deleteSession('s1')
      })

      expect(mockEmitSessionDeleted).not.toHaveBeenCalled()
    })
  })

  describe('renameSession', () => {
    it('should optimistically rename on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessions: [{ id: 's1', messageCount: 1, updatedAt: 'now', title: 'Old' }],
        }),
      })
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))
      await act(async () => {
        await result.current.loadSessionHistory()
      })

      mockFetch.mockResolvedValueOnce({ ok: true })
      await act(async () => {
        await result.current.renameSession('s1', '  New Title  ')
      })

      expect(mockFetch).toHaveBeenLastCalledWith('/api/counselor/session/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 's1', title: 'New Title' }),
      })
      expect(result.current.sessionHistory[0].title).toBe('New Title')
    })

    it('should no-op when the trimmed title is empty', async () => {
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))

      await act(async () => {
        await result.current.renameSession('s1', '   ')
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should not change the title when the request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sessions: [{ id: 's1', messageCount: 1, updatedAt: 'now', title: 'Old' }],
        }),
      })
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))
      await act(async () => {
        await result.current.loadSessionHistory()
      })

      mockFetch.mockResolvedValueOnce({ ok: false })
      await act(async () => {
        await result.current.renameSession('s1', 'New')
      })

      expect(result.current.sessionHistory[0].title).toBe('Old')
    })

    it('should swallow fetch errors during rename', async () => {
      mockFetch.mockRejectedValue(new Error('net'))
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))

      await act(async () => {
        await result.current.renameSession('s1', 'New')
      })
      // no throw
      expect(result.current.sessionHistory).toEqual([])
    })
  })

  describe('startNewChat', () => {
    it('should reset to empty messages and mint a new session id', async () => {
      const { result } = renderHook(() => useChatSession({ lang: 'en' }))
      await waitFor(() => expect(result.current.sessionLoaded).toBe(true))

      const firstId = result.current.sessionIdRef.current
      act(() => {
        result.current.setMessages([{ role: 'user', content: 'hi' }])
      })

      act(() => {
        result.current.startNewChat()
      })

      expect(result.current.messages).toEqual([])
      expect(result.current.sessionIdRef.current).not.toBe(firstId)
    })

    it('should restore the system context message on a new chat', () => {
      const { result } = renderHook(() => useChatSession({ lang: 'en', initialContext: 'ctx' }))

      act(() => {
        result.current.setMessages([{ role: 'user', content: 'hi' }])
      })
      act(() => {
        result.current.startNewChat()
      })

      expect(result.current.messages).toEqual([{ role: 'system', content: 'ctx' }])
    })
  })
})
