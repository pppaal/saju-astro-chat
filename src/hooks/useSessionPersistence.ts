// src/hooks/useSessionPersistence.ts
// Extracted persistence effects from useChatSession.unified.ts

'use client'

import { useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'
import type { ChatMessage } from '@/lib/api/validator'

interface UseSessionPersistenceOptions {
  messages: ChatMessage[]
  sessionId: string
  storageKey?: string
  enableDbPersistence?: boolean
  sessionLoaded: boolean
  lang?: string
}

export function useSessionPersistence(options: UseSessionPersistenceOptions): {
  saveError: string | null
} {
  const {
    messages,
    sessionId,
    storageKey,
    enableDbPersistence = false,
    sessionLoaded,
    lang = 'ko',
  } = options

  const [saveError, setSaveError] = useState<string | null>(null)

  // Mount lifecycle ref so the async save handler can bail before
  // calling setSaveError on a torn-down tree. Without this, a slow save
  // that resolves after navigation/unmount fires setState into a dead
  // component (React warning + stale state churn on next mount).
  const mountedRef = useRef(true)
  // In-flight save AbortController so unmount or a fresh debounce window
  // can cancel a prior save that's still waiting on the server.
  const saveAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (saveAbortRef.current) {
        try {
          saveAbortRef.current.abort()
        } catch {
          // AbortController throws if already aborted; ignore.
        }
        saveAbortRef.current = null
      }
    }
  }, [])

  // Persist messages to sessionStorage (debounced to avoid blocking main thread)
  const sessionSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined' && messages.length > 0) {
      if (sessionSaveTimerRef.current) {
        clearTimeout(sessionSaveTimerRef.current)
      }
      sessionSaveTimerRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem(storageKey, JSON.stringify(messages))
        } catch {
          // Ignore storage errors
        }
      }, 500)
    }
    return () => {
      if (sessionSaveTimerRef.current) {
        clearTimeout(sessionSaveTimerRef.current)
      }
    }
  }, [messages, storageKey])

  // Auto-save messages to database
  useEffect(() => {
    if (!enableDbPersistence || !sessionLoaded || messages.length === 0) {
      return
    }

    const saveTimer = setTimeout(async () => {
      // Cancel any previous in-flight save before starting a new one.
      // Without this, two debounce windows can race and the older,
      // slower save can overwrite the newer one's saveError state.
      if (saveAbortRef.current) {
        try {
          saveAbortRef.current.abort()
        } catch {
          /* already aborted — ignore */
        }
      }
      const controller = new AbortController()
      saveAbortRef.current = controller
      try {
        const res = await fetch('/api/counselor/session/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            locale: lang,
            messages: messages.filter((m) => m.role !== 'system').slice(-200),
          }),
          signal: controller.signal,
        })
        if (!mountedRef.current) return
        if (res.ok) {
          setSaveError(null)
          logger.debug('[useChatSession] Auto-saved to DB', { messageCount: messages.length })
        } else {
          setSaveError('Failed to save session')
          logger.warn('[useChatSession] Failed to save session: HTTP', res.status)
        }
      } catch (e) {
        // Aborted requests are the cooperative cancel path (new save
        // cycle or unmount) — not a real failure to surface.
        const name = (e as Error & { name?: string })?.name
        if (name === 'AbortError') return
        if (!mountedRef.current) return
        logger.warn('[useChatSession] Failed to save session:', e)
        setSaveError('Failed to save session')
      } finally {
        if (saveAbortRef.current === controller) {
          saveAbortRef.current = null
        }
      }
    }, 2000) // 2s debounce

    return () => clearTimeout(saveTimer)
  }, [messages, sessionLoaded, lang, enableDbPersistence, sessionId])

  return { saveError }
}
