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

export function useSessionPersistence(options: UseSessionPersistenceOptions): { saveError: string | null } {
  const {
    messages,
    sessionId,
    storageKey,
    enableDbPersistence = false,
    sessionLoaded,
    lang = 'ko',
  } = options

  const [saveError, setSaveError] = useState<string | null>(null)

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
      try {
        const res = await fetch('/api/counselor/session/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionId,
            locale: lang,
            messages: messages.filter((m) => m.role !== 'system').slice(-200),
          }),
        })
        if (res.ok) {
          setSaveError(null)
          logger.debug('[useChatSession] Auto-saved to DB', { messageCount: messages.length })
        } else {
          setSaveError('Failed to save session')
          logger.warn('[useChatSession] Failed to save session: HTTP', res.status)
        }
      } catch (e) {
        logger.warn('[useChatSession] Failed to save session:', e)
        setSaveError('Failed to save session')
      }
    }, 2000) // 2s debounce

    return () => clearTimeout(saveTimer)
  }, [messages, sessionLoaded, lang, enableDbPersistence, sessionId])

  return { saveError }
}
