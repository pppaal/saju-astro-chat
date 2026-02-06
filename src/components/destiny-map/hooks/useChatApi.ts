'use client'

import React from 'react'
import { logger } from '@/lib/logger'
import { useCreditModal } from '@/contexts/CreditModalContext'
import { CHAT_I18N, detectCrisis, type LangKey } from '../chat-i18n'
import { CHAT_TIMINGS, CHAT_LIMITS, type Message, type ConnectionStatus } from '../chat-constants'
import {
  generateMessageId,
  getConnectionStatus,
  getErrorMessage,
  streamProcessor,
} from '../chat-utils'
import { generateFollowUpQuestions } from '../chat-followups'
import type { ChatProps, ChatPayload } from '../chat-types'

interface UseChatApiOptions {
  sessionIdRef: React.MutableRefObject<string>
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  profile: ChatProps['profile']
  theme: string
  lang: LangKey
  saju?: ChatProps['saju']
  astro?: ChatProps['astro']
  advancedAstro?: ChatProps['advancedAstro']
  predictionContext?: ChatProps['predictionContext']
  userContext?: ChatProps['userContext']
  cvText: string
  ragSessionId?: string
  autoScroll: boolean
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onSaveMessage?: (userMsg: string, assistantMsg: string) => void
  setNotice: React.Dispatch<React.SetStateAction<string | null>>
}

interface UseChatApiReturn {
  loading: boolean
  retryCount: number
  connectionStatus: ConnectionStatus
  usedFallback: boolean
  followUpQuestions: string[]
  setFollowUpQuestions: React.Dispatch<React.SetStateAction<string[]>>
  handleSend: (directText?: string) => Promise<void>
  showCrisisModal: boolean
  setShowCrisisModal: React.Dispatch<React.SetStateAction<boolean>>
}

export function useChatApi({
  sessionIdRef,
  messages,
  setMessages,
  profile,
  theme,
  lang,
  saju,
  astro,
  advancedAstro,
  predictionContext,
  userContext,
  cvText,
  ragSessionId,
  autoScroll,
  messagesEndRef,
  onSaveMessage,
  setNotice,
}: UseChatApiOptions): UseChatApiReturn {
  const effectiveLang = lang === 'ko' ? 'ko' : 'en'
  const tr = CHAT_I18N[effectiveLang]
  const { showDepleted } = useCreditModal()

  const [loading, setLoading] = React.useState(false)
  const [retryCount, setRetryCount] = React.useState(0)
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>('online')
  const [usedFallback, setUsedFallback] = React.useState(false)
  const [followUpQuestions, setFollowUpQuestions] = React.useState<string[]>([])
  const [showCrisisModal, setShowCrisisModal] = React.useState(false)

  // Throttled message update to reduce re-renders during streaming
  const pendingContentRef = React.useRef<string | null>(null)
  const updateTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const flushMessageUpdate = React.useCallback(() => {
    if (pendingContentRef.current !== null) {
      const content = pendingContentRef.current
      pendingContentRef.current = null
      setMessages((prev) => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = { ...updated[lastIdx], content }
        }
        return updated
      })
    }
  }, [setMessages])

  // Batched update: accumulates content and flushes every 50ms
  const updateLastAssistantMessage = React.useCallback(
    (content: string) => {
      pendingContentRef.current = content
      if (!updateTimerRef.current) {
        updateTimerRef.current = setTimeout(() => {
          updateTimerRef.current = null
          flushMessageUpdate()
        }, 50)
      }
    },
    [flushMessageUpdate]
  )

  // Immediate flush for final content when streaming ends
  const flushFinalMessage = React.useCallback(
    (content: string) => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
        updateTimerRef.current = null
      }
      pendingContentRef.current = null
      setMessages((prev) => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = { ...updated[lastIdx], content }
        }
        return updated
      })
    },
    [setMessages]
  )

  // Make API request with retry logic
  const makeRequest = React.useCallback(
    async (payload: ChatPayload, attempt: number = 0): Promise<Response> => {
      const startTime = performance.now()
      logger.debug(`[Chat] Request started (attempt ${attempt + 1})`)

      try {
        const res = await fetch('/api/destiny-map/chat-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-id': ragSessionId || sessionIdRef.current,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(CHAT_TIMINGS.REQUEST_TIMEOUT),
        })

        const responseTime = performance.now() - startTime
        logger.debug(`[Chat] Response received: ${responseTime.toFixed(0)}ms`)

        setConnectionStatus(getConnectionStatus(responseTime))

        if (!res.ok) {
          // 402 Payment Required - 크레딧 부족
          if (res.status === 402) {
            logger.warn('[Chat] Insufficient credits (402)')
            showDepleted()
            throw new Error('INSUFFICIENT_CREDITS')
          }

          if (res.status >= 500 && attempt < CHAT_LIMITS.MAX_RETRY_ATTEMPTS) {
            logger.warn(`[Chat] Server error ${res.status}, retrying...`)
            setRetryCount(attempt + 1)
            await new Promise((resolve) =>
              setTimeout(resolve, CHAT_TIMINGS.RETRY_BASE_DELAY * (attempt + 1))
            )
            return makeRequest(payload, attempt + 1)
          }
          throw new Error(await res.text())
        }
        if (!res.body) {
          throw new Error('No response body')
        }

        setRetryCount(0)
        return res
      } catch (error: unknown) {
        const err = error as Error & { name?: string }
        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
          setConnectionStatus('slow')
          if (attempt < CHAT_LIMITS.MAX_RETRY_ATTEMPTS) {
            logger.warn(`[Chat] Request timeout, retrying...`)
            setRetryCount(attempt + 1)
            await new Promise((resolve) =>
              setTimeout(resolve, CHAT_TIMINGS.RETRY_BASE_DELAY * (attempt + 1))
            )
            return makeRequest(payload, attempt + 1)
          }
          throw new Error('Request timeout. Please check your connection.')
        }
        throw error
      }
    },
    [ragSessionId, sessionIdRef, showDepleted]
  )

  // Process SSE stream response using StreamProcessor
  const processStream = React.useCallback(
    async (res: Response, _assistantMsgId: string, userText: string): Promise<void> => {
      let lastScrollTime = 0
      const result = await streamProcessor.process(res, {
        onChunk: (_accumulated, cleaned) => {
          // Update message in real-time as chunks arrive
          updateLastAssistantMessage(cleaned)
          // Auto-scroll during streaming (throttled to every 100ms)
          const now = Date.now()
          if (autoScroll && now - lastScrollTime > 100) {
            lastScrollTime = now
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
          }
        },
        onError: () => {
          setNotice(tr.error)
        },
      })

      // Flush final content immediately (bypass throttle)
      if (!result.content) {
        flushFinalMessage(tr.noResponse)
      } else {
        flushFinalMessage(result.content)

        // Set follow-up questions
        if (result.followUps.length >= CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT) {
          setFollowUpQuestions(result.followUps.slice(0, CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT))
        } else {
          setFollowUpQuestions(
            generateFollowUpQuestions(theme, userText, lang, CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT)
          )
        }

        if (onSaveMessage) {
          onSaveMessage(userText, result.content)
        }
      }
    },
    [
      updateLastAssistantMessage,
      flushFinalMessage,
      autoScroll,
      messagesEndRef,
      tr.error,
      tr.noResponse,
      theme,
      lang,
      onSaveMessage,
      setNotice,
    ]
  )

  // Main send handler
  const handleSend = React.useCallback(
    async (directText?: string) => {
      const text = directText
      if (!text || loading) {
        return
      }

      // Crisis detection
      if (detectCrisis(text, lang)) {
        setShowCrisisModal(true)
      }

      setFollowUpQuestions([])

      const userMsgId = generateMessageId('user')
      const nextMessages: Message[] = [...messages, { role: 'user', content: text, id: userMsgId }]
      setLoading(true)
      setMessages(nextMessages)
      setNotice(null)
      setUsedFallback(false)

      const payload: ChatPayload = {
        name: profile.name,
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        latitude: profile.latitude,
        longitude: profile.longitude,
        gender: profile.gender,
        city: profile.city,
        theme,
        lang,
        messages: nextMessages.slice(-50),
        cvText,
        saju,
        astro,
        advancedAstro,
        predictionContext,
        userContext,
      }

      try {
        const res = await makeRequest(payload)

        if (res.headers.get('x-fallback') === '1') {
          setUsedFallback(true)
        }

        const assistantMsgId = generateMessageId('assistant')
        setMessages((prev) => [...prev, { role: 'assistant', content: '', id: assistantMsgId }])
        setLoading(false)

        await processStream(res, assistantMsgId, text)
      } catch (e: unknown) {
        logger.error('[Chat] send error:', e)
        setConnectionStatus('offline')

        const errorMessage = getErrorMessage(e as Error, lang, tr)

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: errorMessage,
            id: generateMessageId('error'),
          },
        ])
        setLoading(false)
        setRetryCount(0)
      }
    },
    [
      loading,
      messages,
      setMessages,
      setNotice,
      profile,
      theme,
      lang,
      cvText,
      saju,
      astro,
      advancedAstro,
      predictionContext,
      userContext,
      makeRequest,
      processStream,
      tr,
    ]
  )

  return {
    loading,
    retryCount,
    connectionStatus,
    usedFallback,
    followUpQuestions,
    setFollowUpQuestions,
    handleSend,
    showCrisisModal,
    setShowCrisisModal,
  }
}
