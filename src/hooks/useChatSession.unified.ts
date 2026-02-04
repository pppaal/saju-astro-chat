// src/hooks/useChatSession.unified.ts
// Unified chat session management hook combining features from both implementations

'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { logger } from '@/lib/logger'
import {
  generateSessionId,
  generateMessageId as generateMessageIdFromUtils,
} from '@/components/destiny-map/chat-utils'
import type { ChatMessage } from '@/lib/api/validator'

/**
 * Feedback type for messages
 */
export type FeedbackType = 'up' | 'down' | null

/**
 * Session history item
 */
export interface SessionItem {
  id: string
  theme?: string
  summary?: string
  lastMessageAt?: string
  createdAt?: string
}

/**
 * Options for useChatSession hook
 */
export interface UseChatSessionOptions {
  /** Initial system context message */
  initialContext?: string
  /** Initial follow-up questions */
  initialFollowUps?: string[]
  /** Storage key for session persistence (sessionStorage) */
  storageKey?: string
  /** Enable database persistence (auto-save) */
  enableDbPersistence?: boolean
  /** Enable persona memory updates */
  enablePersonaMemory?: boolean
  /** Theme for DB persistence */
  theme?: string
  /** Language for DB persistence */
  lang?: string
  /** Saju data for persona memory */
  saju?: unknown
  /** Astro data for persona memory */
  astro?: unknown
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return generateMessageIdFromUtils('user')
}

/**
 * Unified chat session management hook
 *
 * Features:
 * - Message state management
 * - SessionStorage persistence (optional)
 * - Database persistence with auto-save (optional)
 * - PersonaMemory auto-update (optional)
 * - Session history loading
 * - Feedback management
 * - Follow-up questions
 * - Abort controller for streaming
 */
export function useChatSession(options: UseChatSessionOptions = {}) {
  const {
    initialContext,
    initialFollowUps = [],
    storageKey,
    enableDbPersistence = false,
    enablePersonaMemory = false,
    theme = 'chat',
    lang = 'ko',
    saju,
    astro,
  } = options

  // Session ID (stable across renders)
  const sessionIdRef = useRef<string>(generateSessionId())
  const [sessionId] = useState<string>(() => sessionIdRef.current)

  // Core state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Try to restore from storage if key provided
    if (storageKey && typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(storageKey)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
          }
        }
      } catch {
        // Ignore storage errors
      }
    }
    // Default: start with system context if provided
    return initialContext ? [{ role: 'system' as const, content: initialContext }] : []
  })

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Record<string, FeedbackType>>({})
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>(initialFollowUps)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Session history state
  const [sessionLoaded, setSessionLoaded] = useState(false)
  const [sessionHistory, setSessionHistory] = useState<SessionItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastPersonaUpdateRef = useRef<number>(0)

  // Mark session as loaded on mount
  useEffect(() => {
    setSessionLoaded(true)
    logger.debug('[useChatSession] Session ready', {
      sessionId,
      enableDbPersistence,
      enablePersonaMemory,
    })
  }, [sessionId, enableDbPersistence, enablePersonaMemory])

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
            messages: messages.filter((m) => m.role !== 'system'),
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
  }, [messages, sessionLoaded, theme, lang, enableDbPersistence])

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
        messages: visibleMsgs,
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
  }, [messages, sessionLoaded, theme, lang, saju, astro, enablePersonaMemory])

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Add a user message
  const addUserMessage = useCallback((content: string) => {
    const message: ChatMessage = {
      role: 'user',
      content,
    }
    setMessages((prev) => [...prev, message])
    setShowSuggestions(false)
    return message
  }, [])

  // Add an assistant message
  const addAssistantMessage = useCallback((content: string) => {
    const message: ChatMessage = {
      role: 'assistant',
      content,
    }
    setMessages((prev) => [...prev, message])
    return message
  }, [])

  // Update the last assistant message (for streaming)
  const updateLastAssistantMessage = useCallback((content: string) => {
    setMessages((prev) => {
      const lastIdx = prev.length - 1
      if (lastIdx >= 0 && prev[lastIdx].role === 'assistant') {
        const updated = [...prev]
        updated[lastIdx] = { ...updated[lastIdx], content }
        return updated
      }
      return prev
    })
  }, [])

  // Handle feedback on a message
  const handleFeedback = useCallback((messageIndex: number, type: FeedbackType) => {
    setFeedback((prev) => ({
      ...prev,
      [messageIndex]: prev[messageIndex] === type ? null : type,
    }))
  }, [])

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
    [theme]
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

  // Clear the chat
  const clearChat = useCallback(() => {
    setMessages(initialContext ? [{ role: 'system', content: initialContext }] : [])
    setInput('')
    setFeedback({})
    setFollowUpQuestions(initialFollowUps)
    setShowSuggestions(true)
    setError(null)
    sessionIdRef.current = generateSessionId()
    if (storageKey && typeof window !== 'undefined') {
      sessionStorage.removeItem(storageKey)
    }
  }, [initialContext, initialFollowUps, storageKey])

  // Start new chat (alias for clearChat)
  const startNewChat = useCallback(() => {
    clearChat()
  }, [clearChat])

  // Abort any ongoing request
  const abortRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Create a new abort controller for a request
  const createAbortController = useCallback(() => {
    abortRequest()
    abortControllerRef.current = new AbortController()
    return abortControllerRef.current
  }, [abortRequest])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRequest()
    }
  }, [abortRequest])

  return {
    // State
    messages,
    setMessages,
    input,
    setInput,
    loading,
    setLoading,
    feedback,
    setFeedback,
    followUpQuestions,
    setFollowUpQuestions,
    showSuggestions,
    setShowSuggestions,
    error,
    setError,
    saveError,

    // Session
    sessionId,
    sessionIdRef,
    messagesEndRef,
    sessionLoaded,

    // Session history
    sessionHistory,
    historyLoading,
    deleteConfirmId,
    setDeleteConfirmId,

    // Actions
    addUserMessage,
    addAssistantMessage,
    updateLastAssistantMessage,
    handleFeedback,
    clearChat,
    startNewChat,
    scrollToBottom,
    createAbortController,
    abortRequest,
    loadSessionHistory,
    loadSession,
    deleteSession,
  }
}

export default useChatSession
