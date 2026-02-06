// src/hooks/useSessionHistory.ts
// Extracted session history CRUD operations from useChatSession.unified.ts

'use client'

import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import type { ChatMessage } from '@/lib/api/validator'
import type { SessionItem } from '@/hooks/useChatSession.unified'

interface UseSessionHistoryOptions {
  theme?: string
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  sessionIdRef: React.MutableRefObject<string>
}

export function useSessionHistory(options: UseSessionHistoryOptions) {
  const { theme = 'chat', setMessages, sessionIdRef } = options

  const [sessionHistory, setSessionHistory] = useState<SessionItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Load session history
  const loadSessionHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/counselor/session/list?theme=${theme}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setSessionHistory(data.sessions || [])
      }
    } catch (e) {
      logger.warn('[useChatSession] Failed to load history:', e)
    } finally {
      setHistoryLoading(false)
    }
  }, [theme])

  // Load a specific session
  const loadSession = useCallback(
    async (sid: string) => {
      try {
        const res = await fetch(`/api/counselor/session/load?theme=${theme}&sessionId=${sid}`)
        if (res.ok) {
          const data = await res.json()
          if (data.messages && Array.isArray(data.messages)) {
            setMessages(data.messages)
            sessionIdRef.current = data.sessionId || sid
          }
        }
      } catch (e) {
        logger.warn('[useChatSession] Failed to load session:', e)
      }
    },
    [theme, setMessages, sessionIdRef]
  )

  // Delete a session
  const deleteSession = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`/api/counselor/session/list?sessionId=${sid}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setSessionHistory((prev) => prev.filter((s) => s.id !== sid))
        setDeleteConfirmId(null)
      }
    } catch (e) {
      logger.warn('[useChatSession] Failed to delete session:', e)
    }
  }, [])

  return {
    sessionHistory,
    historyLoading,
    deleteConfirmId,
    setDeleteConfirmId,
    loadSessionHistory,
    loadSession,
    deleteSession,
  }
}
