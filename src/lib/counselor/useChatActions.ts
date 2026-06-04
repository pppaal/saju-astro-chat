'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

/**
 * 운명 / 궁합 상담사 헤더 `⋮` 메뉴(이름 변경 / 삭제) 공용 hook.
 *
 * 두 페이지가 거의 동일하게 가지고 있던 패턴 — chatMenuOpen + 외부 클릭 닫기
 * 이펙트, rename/delete PATCH/DELETE, in‑app `PromptModal` 상태 관리를 한 곳에
 * 모은다. compat 상담사는 이전까지 `window.prompt`/`window.confirm` 을 그대로
 * 쓰던 회귀(인앱 웹뷰에서 native dialog 가 막혀 이름 변경/삭제 자체가 안
 * 되던 버그)도 이 추출로 자동 해결된다.
 *
 * 페이지마다 상태 모양이 다르므로(destiny 는 `activeSession.title` 단일 객체,
 * compat 은 flat `chatSessionId`/`chatTitle` 분리) 콜백으로 갈음한다.
 * - onRenamed(newTitle): 서버 PATCH 성공 시 page 가 자기 상태 갱신
 * - onDeleted(): DELETE 성공 시 page 가 메시지 초기화 / 네비게이션 등 정리
 * - onError({ kind, status }): 401 인 경우 "다시 로그인" 힌트 등 page 가 토스트로 안내
 */

export type ChatActionsError = {
  kind: 'rename' | 'delete'
  status?: number
}

export type UseChatActionsProps = {
  /** 현재 활성 세션 id — `null`/`undefined` 면 ⋮ 메뉴 렌더 자체를 막아야 함 */
  sessionId: string | null | undefined
  /** 활성 세션의 현재 제목 — Rename 모달 초기값으로 들어감 */
  title: string | null | undefined
  /** UI 언어 — 모달 라벨 / 에러 토스트 분기에 사용 */
  lang: 'ko' | 'en'
  /** Rename PATCH 성공 시 호출 — page 가 자기 title state 를 갱신 */
  onRenamed?: (title: string) => void
  /** Delete 성공 시 호출 — page 가 메시지/세션/URL 정리 */
  onDeleted?: () => void
  /** 401 등 실패 시 page 의 토스트 헬퍼로 위임 (kind/status 를 그대로 넘김) */
  onError?: (info: ChatActionsError) => void
}

export type UseChatActionsReturn = {
  // === ⋮ 메뉴 ===
  chatMenuOpen: boolean
  chatMenuRef: React.RefObject<HTMLDivElement | null>
  toggleChatMenu: () => void
  closeChatMenu: () => void

  // === Rename 모달 ===
  renameModalOpen: boolean
  openRenameModal: () => void
  closeRenameModal: () => void
  handleRenameConfirm: (nextTitle: string) => Promise<void>

  // === Delete 모달 ===
  deleteModalOpen: boolean
  openDeleteModal: () => void
  closeDeleteModal: () => void
  handleDeleteConfirm: () => Promise<void>
}

export function useChatActions({
  sessionId,
  title,
  lang,
  onRenamed,
  onDeleted,
  onError,
}: UseChatActionsProps): UseChatActionsReturn {
  // ============== ⋮ 메뉴 상태 + 외부 클릭 닫기 ==============
  const [chatMenuOpen, setChatMenuOpen] = useState(false)
  const chatMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!chatMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (chatMenuRef.current && !chatMenuRef.current.contains(e.target as Node)) {
        setChatMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [chatMenuOpen])

  const toggleChatMenu = useCallback(() => setChatMenuOpen((o) => !o), [])
  const closeChatMenu = useCallback(() => setChatMenuOpen(false), [])

  // ============== Rename 모달 ==============
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const openRenameModal = useCallback(() => {
    setChatMenuOpen(false)
    setRenameModalOpen(true)
  }, [])
  const closeRenameModal = useCallback(() => setRenameModalOpen(false), [])

  // 직전 title 캡처해서 PATCH 실패 시 롤백 — useCallback 의 deps 에 sessionId 와
  // 현재 title 을 같이 두지 않으면 stale closure 로 잘못된 prevTitle 복원 가능.
  const handleRenameConfirm = useCallback(
    async (nextTitle: string) => {
      setRenameModalOpen(false)
      const id = sessionId
      const trimmed = nextTitle.trim()
      if (!id || !trimmed) return

      // Optimistic update — page state 가 즉시 보이도록 onRenamed 먼저 호출.
      // PATCH 실패 시 prevTitle 로 복원하기 위해 직전 값을 캡처.
      const prevTitle = title ?? null
      onRenamed?.(trimmed)

      let status: number | undefined
      try {
        const res = await fetch('/api/counselor/session/list', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: id, title: trimmed }),
        })
        status = res.status
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch (err) {
        logger.warn('[useChatActions] rename failed', { id, status, err })
        // Roll back optimistic title — page 가 자신의 state 를 직전 값으로 되돌림.
        // prevTitle 이 null 이면 빈 문자열로 복원(상위가 title|null 둘 다 핸들).
        onRenamed?.(prevTitle ?? '')
        onError?.({ kind: 'rename', status })
      }
    },
    [sessionId, title, onRenamed, onError]
  )

  // ============== Delete 모달 ==============
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const openDeleteModal = useCallback(() => {
    setChatMenuOpen(false)
    setDeleteModalOpen(true)
  }, [])
  const closeDeleteModal = useCallback(() => setDeleteModalOpen(false), [])

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteModalOpen(false)
    const id = sessionId
    if (!id) return

    let status: number | undefined
    let ok = false
    try {
      const res = await fetch(
        `/api/counselor/session/list?sessionId=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      )
      status = res.status
      ok = res.ok
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      logger.warn('[useChatActions] delete failed', { id, status, err })
    }
    if (!ok) {
      onError?.({ kind: 'delete', status })
      return
    }
    // 서버 삭제 확정 후에만 cleanup 호출 — 실패 시엔 그대로 두어 데이터
    // 유실로 보이지 않게.
    onDeleted?.()
    // suppress unused — `lang` 은 이 hook 의 props 시그니처에 의도적으로 포함
    // (모달 라벨은 ChatActionModals 가 담당). future-proof.
  }, [sessionId, onDeleted, onError])

  // lang 은 ChatActionModals 가 사용하지만 hook props 에 함께 두면 호출부가
  // 둘 다 한 줄로 같은 객체에서 꺼내 쓰기 좋다. 미사용 경고 회피.
  void lang

  return {
    chatMenuOpen,
    chatMenuRef,
    toggleChatMenu,
    closeChatMenu,

    renameModalOpen,
    openRenameModal,
    closeRenameModal,
    handleRenameConfirm,

    deleteModalOpen,
    openDeleteModal,
    closeDeleteModal,
    handleDeleteConfirm,
  }
}
