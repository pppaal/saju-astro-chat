// src/hooks/useSessionPersistence.ts
// Extracted persistence effects from useChatSession.unified.ts

'use client'

import { useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'
import type { ChatMessage } from '@/lib/api/validator'

interface UseSessionPersistenceOptions {
  messages: ChatMessage[]
  sessionIdRef: React.MutableRefObject<string>
  storageKey?: string
  enableDbPersistence?: boolean
  enablePersonaMemory?: boolean
  sessionLoaded: boolean
  theme?: string
  lang?: string
  saju?: unknown
  astro?: unknown
}

export function useSessionPersistence(options: UseSessionPersistenceOptions): { saveError: string | null } {
  const {
    messages,
    sessionIdRef,
    storageKey,
    enableDbPersistence = false,
    enablePersonaMemory = false,
    sessionLoaded,
    theme = 'chat',
    lang = 'ko',
    saju,
    astro,
  } = options

  const [saveError, setSaveError] = useState<string | null>(null)
  const lastPersonaUpdateRef = useRef<number>(0)

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
            sessionId: sessionIdRef.current,
            theme,
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
  }, [messages, sessionLoaded, theme, lang, enableDbPersistence, sessionIdRef])

  // Auto-update PersonaMemory
  useEffect(() => {
    if (!enablePersonaMemory || !sessionLoaded) {
      return
    }

    const visibleMsgs = messages.filter((m) => m.role !== 'system')
    if (visibleMsgs.length < 2) {
      return
    }

    const now = Date.now()
    if (now - lastPersonaUpdateRef.current < 30000) {
      return // Throttle to max once per 30s
    }

    const lastMsg = visibleMsgs[visibleMsgs.length - 1]
    if (lastMsg?.role !== 'assistant' || !lastMsg.content || lastMsg.content.length < 50) {
      return
    }

    lastPersonaUpdateRef.current = now

    fetch('/api/persona-memory/update-from-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionIdRef.current,
        theme,
        locale: lang,
        messages: visibleMsgs.slice(-200),
        saju: saju || undefined,
        astro: astro || undefined,
      }),
    })
      .then((res) => {
        if (res.ok) {
          logger.debug('[useChatSession] PersonaMemory updated')
        }
      })
      .catch((e) => {
        logger.warn('[useChatSession] Failed to update PersonaMemory:', e)
      })
  }, [messages, sessionLoaded, theme, lang, saju, astro, enablePersonaMemory, sessionIdRef])

  return { saveError }
}
