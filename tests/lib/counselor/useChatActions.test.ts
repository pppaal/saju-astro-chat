// tests/lib/counselor/useChatActions.test.ts
//
// useChatActions — 상담사 헤더 ⋮ 메뉴(rename/delete) 공용 훅 테스트.
// 외부 클릭 닫기 이펙트, optimistic rename + 롤백, delete cleanup 게이팅,
// sessionEvents 발화까지 분기별로 커버한다.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChatActions } from '@/lib/counselor/useChatActions'

// logger 는 console 회피용 — 호출만 하고 검증은 안 한다.
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// 세션 삭제 이벤트 버스 — emit 호출 검증용으로 mock.
vi.mock('@/lib/counselor/sessionEvents', () => ({
  emitSessionDeleted: vi.fn(),
}))

import { emitSessionDeleted } from '@/lib/counselor/sessionEvents'

const mockFetch = global.fetch as ReturnType<typeof vi.fn>

function makeProps(overrides: Partial<Parameters<typeof useChatActions>[0]> = {}) {
  return {
    sessionId: 'sess-1',
    title: 'Old Title',
    lang: 'en' as const,
    onRenamed: vi.fn(),
    onDeleted: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  }
}

describe('useChatActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('starts with all menus/modals closed', () => {
      const { result } = renderHook(() => useChatActions(makeProps()))
      expect(result.current.chatMenuOpen).toBe(false)
      expect(result.current.renameModalOpen).toBe(false)
      expect(result.current.deleteModalOpen).toBe(false)
      expect(result.current.chatMenuRef).toBeDefined()
    })
  })

  describe('⋮ menu', () => {
    it('toggles the menu open/closed', () => {
      const { result } = renderHook(() => useChatActions(makeProps()))
      act(() => result.current.toggleChatMenu())
      expect(result.current.chatMenuOpen).toBe(true)
      act(() => result.current.toggleChatMenu())
      expect(result.current.chatMenuOpen).toBe(false)
    })

    it('closeChatMenu forces it closed', () => {
      const { result } = renderHook(() => useChatActions(makeProps()))
      act(() => result.current.toggleChatMenu())
      expect(result.current.chatMenuOpen).toBe(true)
      act(() => result.current.closeChatMenu())
      expect(result.current.chatMenuOpen).toBe(false)
    })

    it('closes on outside mousedown when open', () => {
      const { result } = renderHook(() => useChatActions(makeProps()))
      // Attach the ref to a node, then click a sibling (outside the menu).
      const menu = document.createElement('div')
      const outside = document.createElement('div')
      document.body.appendChild(menu)
      document.body.appendChild(outside)
      ;(result.current.chatMenuRef as { current: HTMLDivElement }).current = menu
      act(() => result.current.toggleChatMenu())
      expect(result.current.chatMenuOpen).toBe(true)
      act(() => {
        outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      })
      expect(result.current.chatMenuOpen).toBe(false)
      document.body.removeChild(menu)
      document.body.removeChild(outside)
    })

    it('does not register outside-click handler while closed', () => {
      const addSpy = vi.spyOn(document, 'addEventListener')
      renderHook(() => useChatActions(makeProps()))
      expect(addSpy).not.toHaveBeenCalledWith('mousedown', expect.any(Function))
    })

    it('keeps menu open when mousedown is inside the menu ref', () => {
      const { result } = renderHook(() => useChatActions(makeProps()))
      const div = document.createElement('div')
      document.body.appendChild(div)
      // attach ref to a real node
      ;(result.current.chatMenuRef as { current: HTMLDivElement }).current = div
      act(() => result.current.toggleChatMenu())
      expect(result.current.chatMenuOpen).toBe(true)
      act(() => {
        div.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      })
      expect(result.current.chatMenuOpen).toBe(true)
      document.body.removeChild(div)
    })
  })

  describe('rename modal', () => {
    it('openRenameModal opens modal and closes the menu', () => {
      const { result } = renderHook(() => useChatActions(makeProps()))
      act(() => result.current.toggleChatMenu())
      act(() => result.current.openRenameModal())
      expect(result.current.renameModalOpen).toBe(true)
      expect(result.current.chatMenuOpen).toBe(false)
    })

    it('closeRenameModal closes the modal', () => {
      const { result } = renderHook(() => useChatActions(makeProps()))
      act(() => result.current.openRenameModal())
      act(() => result.current.closeRenameModal())
      expect(result.current.renameModalOpen).toBe(false)
    })
  })

  describe('handleRenameConfirm', () => {
    it('no-ops (no fetch) when sessionId is missing', async () => {
      const props = makeProps({ sessionId: null })
      const { result } = renderHook(() => useChatActions(props))
      await act(async () => {
        await result.current.handleRenameConfirm('New')
      })
      expect(mockFetch).not.toHaveBeenCalled()
      expect(props.onRenamed).not.toHaveBeenCalled()
    })

    it('no-ops when the trimmed title is empty', async () => {
      const props = makeProps()
      const { result } = renderHook(() => useChatActions(props))
      await act(async () => {
        await result.current.handleRenameConfirm('   ')
      })
      expect(mockFetch).not.toHaveBeenCalled()
      expect(props.onRenamed).not.toHaveBeenCalled()
    })

    it('optimistically renames and PATCHes on success', async () => {
      const props = makeProps()
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const { result } = renderHook(() => useChatActions(props))
      await act(async () => {
        await result.current.handleRenameConfirm('  New Title  ')
      })
      // optimistic call with trimmed title
      expect(props.onRenamed).toHaveBeenCalledWith('New Title')
      expect(mockFetch).toHaveBeenCalledWith('/api/counselor/session/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'sess-1', title: 'New Title' }),
      })
      // only the optimistic call; no rollback
      expect(props.onRenamed).toHaveBeenCalledTimes(1)
      expect(props.onError).not.toHaveBeenCalled()
      expect(result.current.renameModalOpen).toBe(false)
    })

    it('rolls back to previous title and reports error on !ok', async () => {
      const props = makeProps({ title: 'Prev' })
      mockFetch.mockResolvedValue({ ok: false, status: 401 })
      const { result } = renderHook(() => useChatActions(props))
      await act(async () => {
        await result.current.handleRenameConfirm('Attempt')
      })
      expect(props.onRenamed).toHaveBeenNthCalledWith(1, 'Attempt')
      expect(props.onRenamed).toHaveBeenNthCalledWith(2, 'Prev') // rollback
      expect(props.onError).toHaveBeenCalledWith({ kind: 'rename', status: 401 })
    })

    it('rolls back to empty string when previous title is null', async () => {
      const props = makeProps({ title: null })
      mockFetch.mockResolvedValue({ ok: false, status: 500 })
      const { result } = renderHook(() => useChatActions(props))
      await act(async () => {
        await result.current.handleRenameConfirm('Attempt')
      })
      expect(props.onRenamed).toHaveBeenNthCalledWith(2, '')
      expect(props.onError).toHaveBeenCalledWith({ kind: 'rename', status: 500 })
    })

    it('rolls back on network rejection (status undefined)', async () => {
      const props = makeProps({ title: 'Prev' })
      mockFetch.mockRejectedValue(new Error('network'))
      const { result } = renderHook(() => useChatActions(props))
      await act(async () => {
        await result.current.handleRenameConfirm('Attempt')
      })
      expect(props.onRenamed).toHaveBeenNthCalledWith(2, 'Prev')
      expect(props.onError).toHaveBeenCalledWith({ kind: 'rename', status: undefined })
    })
  })

  describe('delete modal', () => {
    it('openDeleteModal opens modal and closes menu', () => {
      const { result } = renderHook(() => useChatActions(makeProps()))
      act(() => result.current.toggleChatMenu())
      act(() => result.current.openDeleteModal())
      expect(result.current.deleteModalOpen).toBe(true)
      expect(result.current.chatMenuOpen).toBe(false)
    })

    it('closeDeleteModal closes the modal', () => {
      const { result } = renderHook(() => useChatActions(makeProps()))
      act(() => result.current.openDeleteModal())
      act(() => result.current.closeDeleteModal())
      expect(result.current.deleteModalOpen).toBe(false)
    })
  })

  describe('handleDeleteConfirm', () => {
    it('no-ops (no fetch) when sessionId missing', async () => {
      const props = makeProps({ sessionId: undefined })
      const { result } = renderHook(() => useChatActions(props))
      await act(async () => {
        await result.current.handleDeleteConfirm()
      })
      expect(mockFetch).not.toHaveBeenCalled()
      expect(props.onDeleted).not.toHaveBeenCalled()
    })

    it('DELETEs, emits sessionDeleted and calls onDeleted on success', async () => {
      const props = makeProps()
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const { result } = renderHook(() => useChatActions(props))
      await act(async () => {
        await result.current.handleDeleteConfirm()
      })
      expect(mockFetch).toHaveBeenCalledWith('/api/counselor/session/list?sessionId=sess-1', {
        method: 'DELETE',
      })
      expect(emitSessionDeleted).toHaveBeenCalledWith('sess-1')
      expect(props.onDeleted).toHaveBeenCalledTimes(1)
      expect(props.onError).not.toHaveBeenCalled()
      expect(result.current.deleteModalOpen).toBe(false)
    })

    it('encodes sessionId in the delete URL', async () => {
      const props = makeProps({ sessionId: 'a b/c' })
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      const { result } = renderHook(() => useChatActions(props))
      await act(async () => {
        await result.current.handleDeleteConfirm()
      })
      expect(mockFetch).toHaveBeenCalledWith('/api/counselor/session/list?sessionId=a%20b%2Fc', {
        method: 'DELETE',
      })
    })

    it('reports error and skips cleanup on !ok', async () => {
      const props = makeProps()
      mockFetch.mockResolvedValue({ ok: false, status: 403 })
      const { result } = renderHook(() => useChatActions(props))
      await act(async () => {
        await result.current.handleDeleteConfirm()
      })
      expect(props.onError).toHaveBeenCalledWith({ kind: 'delete', status: 403 })
      expect(emitSessionDeleted).not.toHaveBeenCalled()
      expect(props.onDeleted).not.toHaveBeenCalled()
    })

    it('reports error (status undefined) on network rejection', async () => {
      const props = makeProps()
      mockFetch.mockRejectedValue(new Error('boom'))
      const { result } = renderHook(() => useChatActions(props))
      await act(async () => {
        await result.current.handleDeleteConfirm()
      })
      expect(props.onError).toHaveBeenCalledWith({ kind: 'delete', status: undefined })
      expect(emitSessionDeleted).not.toHaveBeenCalled()
      expect(props.onDeleted).not.toHaveBeenCalled()
    })
  })

  describe('optional callbacks', () => {
    it('does not throw when onRenamed/onError are omitted on rename failure', async () => {
      const { result } = renderHook(() =>
        useChatActions({ sessionId: 'x', title: 't', lang: 'ko' })
      )
      mockFetch.mockResolvedValue({ ok: false, status: 500 })
      await act(async () => {
        await result.current.handleRenameConfirm('New')
      })
      expect(mockFetch).toHaveBeenCalled()
    })

    it('does not throw when onDeleted/onError are omitted on delete', async () => {
      const { result } = renderHook(() =>
        useChatActions({ sessionId: 'x', title: 't', lang: 'ko' })
      )
      mockFetch.mockResolvedValue({ ok: true, status: 200 })
      await act(async () => {
        await result.current.handleDeleteConfirm()
      })
      expect(emitSessionDeleted).toHaveBeenCalledWith('x')
    })
  })
})
