// @deprecated Use useChatSession from @/hooks/useChatSession.unified instead
// This file is kept for backward compatibility only

'use client'

import React from 'react'
import { logger } from '@/lib/logger'
import { emitSessionDeleted } from '@/lib/counselor/sessionEvents'
import type { Message } from '../chat-constants'
import type { SessionItem } from '../modals/HistoryModal'

interface UseChatSessionOptions {
  lang: string
  initialContext?: string
}

interface UseChatSessionReturn {
  sessionIdRef: React.MutableRefObject<string>
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  sessionLoaded: boolean
  sessionHistory: SessionItem[]
  historyLoading: boolean
  deleteConfirmId: string | null
  setDeleteConfirmId: React.Dispatch<React.SetStateAction<string | null>>
  loadSessionHistory: () => Promise<void>
  loadSession: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  renameSession: (sessionId: string, title: string) => Promise<void>
  startNewChat: () => void
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Hook for managing chat session state and persistence
 */
export function useChatSession(options: UseChatSessionOptions): UseChatSessionReturn {
  // lang 은 더 이상 이 hook 에서 안 쓴다(서버 저장이 useChatAutoSave 로 이관됨).
  // 호출부 호환을 위해 options 시그니처엔 남겨 두되 여기선 initialContext 만 사용.
  const { initialContext } = options

  const sessionIdRef = React.useRef<string>(generateSessionId())
  const [messages, setMessages] = React.useState<Message[]>(
    initialContext ? [{ role: 'system', content: initialContext }] : []
  )
  const [sessionLoaded, setSessionLoaded] = React.useState(false)
  const [sessionHistory, setSessionHistory] = React.useState<SessionItem[]>([])
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null)

  // Mark session as loaded on mount
  React.useEffect(() => {
    setSessionLoaded(true)
    logger.debug('[Chat] Session ready (fresh start - history available via button)')
  }, [])

  // 서버 자동 저장(debounce + 언마운트/이탈 flush)은 Chat.tsx 가 마운트하는
  // 공용 useChatAutoSave 단일 출처로 이관했다. 예전엔 이 deprecated hook 도
  // 자체 debounce save + 언마운트 keepalive 를 들고 있어, 같은 /session/save
  // 엔드포인트로 메시지마다 POST 가 두 번씩 나가던 이중 저장 문제가 있었다.
  // 여기서는 아래 낙관적 목록 갱신(클라 상태)만 담당한다.

  // 사이드바 "과거 채팅" 목록 즉시 갱신 (ChatGPT 식) — 기존엔 목록을 마운트 때
  // 1번만 불러와, 새 채팅을 시작하거나 생년월일을 바꿔 새 대화로 넘어가도 직전
  // 대화가 목록에 바로 안 떴다. 서버 새로고침을 기다리지 않고, 현재 세션에 첫
  // 사용자 메시지가 생기는 순간 목록 상단에 낙관적으로 upsert 한다(서버 저장은
  // 위 auto-save 가 별도로 처리). 이미 목록에 있는 세션이면 제자리에서 정보만
  // 갱신해 순서를 흔들지 않는다.
  React.useEffect(() => {
    if (!sessionLoaded) return
    const convo = messages.filter((m) => m.role !== 'system')
    if (convo.length === 0) return
    const firstUser = convo.find((m) => m.role === 'user')
    const title = (firstUser?.content ?? convo[0]?.content ?? '').trim().slice(0, 60)
    if (!title) return
    const id = sessionIdRef.current
    setSessionHistory((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      const base = idx >= 0 ? prev[idx] : undefined
      const entry: SessionItem = {
        id,
        messageCount: convo.length,
        updatedAt: new Date().toISOString(),
        // 사용자가 직접 rename 한 제목이 있으면 보존, 없으면 첫 질문에서 추출.
        title: base?.title?.trim() || title,
        summary: base?.summary,
      }
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = entry
        return copy
      }
      return [entry, ...prev]
    })
  }, [messages, sessionLoaded])

  // Load session history
  const loadSessionHistory = React.useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/counselor/session/list?limit=20`)
      if (res.ok) {
        const data = await res.json()
        setSessionHistory(data.sessions || [])
      }
    } catch (e) {
      logger.warn('[Chat] Failed to load history:', e)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // Load a specific session
  const loadSession = React.useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/counselor/session/load?sessionId=${sessionId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.messages && Array.isArray(data.messages)) {
          setMessages(data.messages)
          sessionIdRef.current = data.sessionId || sessionId
        }
      }
    } catch (e) {
      logger.warn('[Chat] Failed to load session:', e)
    }
  }, [])

  // Delete a session
  const deleteSession = React.useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/counselor/session/list?sessionId=${sessionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSessionHistory((prev) => prev.filter((s) => s.id !== sessionId))
        setDeleteConfirmId(null)
        // 사이드바(CounselorSidebar) 등 다른 목록도 같은 세션을 빼도록 알림.
        emitSessionDeleted(sessionId)
      }
    } catch (e) {
      logger.warn('[Chat] Failed to delete session:', e)
    }
  }, [])

  // Rename a session (PATCH title); optimistic so the rail updates instantly.
  const renameSession = React.useCallback(async (sessionId: string, title: string) => {
    const next = title.trim()
    if (!next) return
    try {
      const res = await fetch('/api/counselor/session/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, title: next }),
      })
      if (res.ok) {
        setSessionHistory((prev) =>
          prev.map((s) => (s.id === sessionId ? { ...s, title: next } : s))
        )
      }
    } catch (e) {
      logger.warn('[Chat] Failed to rename session:', e)
    }
  }, [])

  // Start new chat
  const startNewChat = React.useCallback(() => {
    setMessages(initialContext ? [{ role: 'system', content: initialContext }] : [])
    sessionIdRef.current = generateSessionId()
  }, [initialContext])

  return {
    sessionIdRef,
    messages,
    setMessages,
    sessionLoaded,
    sessionHistory,
    historyLoading,
    deleteConfirmId,
    setDeleteConfirmId,
    loadSessionHistory,
    loadSession,
    deleteSession,
    renameSession,
    startNewChat,
  }
}
