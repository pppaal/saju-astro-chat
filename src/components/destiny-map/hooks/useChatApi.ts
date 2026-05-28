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
import { generateFollowUpQuestions, isGenericFollowUp } from '../chat-followups'
import type { ChatProps, ChatPayload } from '../chat-types'
import { scoreIcpTest } from '@/lib/icpTest/scoring'
import { analyzePersona } from '@/lib/persona/analysis'
import { buildCounselingBrief } from '@/lib/prompts/fortuneWithIcp'
import { normalizeCounselorResponse } from '@/lib/counselor/responseContract'

interface UseChatApiOptions {
  sessionIdRef: React.MutableRefObject<string>
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  profile: ChatProps['profile']
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
  guestMode: boolean
  followUpQuestions: string[]
  setFollowUpQuestions: React.Dispatch<React.SetStateAction<string[]>>
  handleSend: (directText?: string) => Promise<void>
  showCrisisModal: boolean
  setShowCrisisModal: React.Dispatch<React.SetStateAction<boolean>>
}

function buildLocalCounselingBrief(whatUserWants: string, lang: LangKey) {
  try {
    const icpRaw = localStorage.getItem('icpQuizAnswers')
    if (!icpRaw) {
      return null
    }
    const icpAnswers = JSON.parse(icpRaw) as Record<string, string>
    const icpResult = scoreIcpTest(icpAnswers)

    let personaResult = null
    const personaRaw = localStorage.getItem('personaQuizAnswers')
    if (personaRaw) {
      const personaAnswers = JSON.parse(personaRaw) as Record<string, string>
      personaResult = analyzePersona(personaAnswers, lang)
    }

    return buildCounselingBrief({
      icpResult,
      personaResult,
      whatUserWants,
    })
  } catch {
    return null
  }
}

export function useChatApi({
  sessionIdRef,
  messages,
  setMessages,
  profile,
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
  const [guestMode, setGuestMode] = React.useState(false)
  const [followUpQuestions, setFollowUpQuestions] = React.useState<string[]>([])
  const [showCrisisModal, setShowCrisisModal] = React.useState(false)
  const MAX_CHAT_MESSAGE_CHARS = 2000

  // Stream updates are buffered so the UI does not re-layout on every token.
  const pendingContentRef = React.useRef<string | null>(null)
  const updateTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRenderedLengthRef = React.useRef(0)
  const lastRenderTimeRef = React.useRef(0)

  const flushMessageUpdate = React.useCallback(() => {
    if (pendingContentRef.current !== null) {
      const content = pendingContentRef.current
      pendingContentRef.current = null
      setMessages((prev) => {
        const updated = [...prev]
        const lastIdx = updated.length - 1
        if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
          updated[lastIdx] = { ...updated[lastIdx], content, streaming: true }
        }
        return updated
      })
      lastRenderedLengthRef.current = content.length
      lastRenderTimeRef.current = Date.now()
    }
  }, [setMessages])

  // Batched update: hold partial markdown until a natural pause or punctuation.
  const updateLastAssistantMessage = React.useCallback(
    (content: string) => {
      pendingContentRef.current = content
      const now = Date.now()
      const delta = content.length - lastRenderedLengthRef.current
      const hasNaturalPause = /(?:[.!?]\s*$|[다요죠]\.\s*$|\n\s*$)/u.test(content)
      const enoughTimePassed = now - lastRenderTimeRef.current > 220
      const enoughContent = delta >= 18

      if (!updateTimerRef.current && (hasNaturalPause || enoughTimePassed || enoughContent)) {
        updateTimerRef.current = setTimeout(() => {
          updateTimerRef.current = null
          flushMessageUpdate()
        }, 120)
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
          updated[lastIdx] = { ...updated[lastIdx], content, streaming: false }
        }
        return updated
      })
      lastRenderedLengthRef.current = content.length
      lastRenderTimeRef.current = Date.now()
    },
    [setMessages]
  )

  // Make API request with retry logic
  const makeRequest = React.useCallback(
    async (payload: ChatPayload, attempt: number = 0): Promise<Response> => {
      const startTime = performance.now()
      logger.debug(`[Chat] Request started (attempt ${attempt + 1})`)

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-session-id': ragSessionId || sessionIdRef.current,
        }
        if (payload.idempotencyKey) {
          headers['x-idempotency-key'] = payload.idempotencyKey
        }
        const res = await fetch('/api/counselor/realtime', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(CHAT_TIMINGS.REQUEST_TIMEOUT),
        })

        const responseTime = performance.now() - startTime
        logger.debug(`[Chat] Response received: ${responseTime.toFixed(0)}ms`)

        setConnectionStatus(getConnectionStatus(responseTime))
        setGuestMode(res.headers.get('x-guest-mode') === '1')

        if (!res.ok) {
          let detail = ''
          try {
            const contentType = res.headers.get('content-type') || ''
            if (contentType.includes('application/json')) {
              const errJson = (await res.clone().json()) as {
                message?: string
                error?: string
                code?: string
              }
              detail = [errJson.code, errJson.message, errJson.error].filter(Boolean).join(' | ')
            } else {
              detail = (await res.clone().text()).trim()
            }
          } catch {
            detail = ''
          }

          logger.warn('[Chat] API error response', {
            status: res.status,
            detail: detail.slice(0, 240),
          })

          if (res.status === 402) {
            logger.warn('[Chat] Insufficient credits (402)')
            showDepleted()
            throw new Error('INSUFFICIENT_CREDITS')
          }

          if (res.status === 401 && res.headers.get('x-guest-limit-reached') === '1') {
            logger.info('[Chat] Guest counselor limit reached')
            throw new Error('GUEST_LIMIT_REACHED')
          }

          if (res.status >= 500 && attempt < CHAT_LIMITS.MAX_RETRY_ATTEMPTS) {
            logger.warn(`[Chat] Server error ${res.status}, retrying...`)
            setRetryCount(attempt + 1)
            await new Promise((resolve) =>
              setTimeout(resolve, CHAT_TIMINGS.RETRY_BASE_DELAY * (attempt + 1))
            )
            return makeRequest(payload, attempt + 1)
          }
          throw new Error(`API_ERROR:${res.status}${detail ? `:${detail}` : ''}`)
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
        const normalizedContent = normalizeCounselorResponse(
          result.content,
          lang === 'ko' ? 'ko' : 'en'
        )
        flushFinalMessage(normalizedContent)

        // Set follow-up questions — 모델이 가끔 generic 질문("더 알려줘"/
        // "tell me more")을 뱉음. 시스템 프롬프트가 금지하지만 모델이 무시하면
        // 클라이언트에서 결정적으로 필터링 + 부족분은 테마 기반 폴백으로 보충.
        const goodAiFollowUps = result.followUps.filter((q) => !isGenericFollowUp(q, lang))
        const needed = CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT - goodAiFollowUps.length
        const merged =
          needed > 0
            ? [
                ...goodAiFollowUps,
                ...generateFollowUpQuestions(
                  userText,
                  lang,
                  CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT,
                  normalizedContent
                ).filter((q) => !goodAiFollowUps.includes(q)),
              ].slice(0, CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT)
            : goodAiFollowUps.slice(0, CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT)
        setFollowUpQuestions(merged)

        if (onSaveMessage) {
          onSaveMessage(userText, normalizedContent)
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
      lang,
      onSaveMessage,
      setNotice,
    ]
  )

  // Main send handler
  const handleSend = React.useCallback(
    async (directText?: string) => {
      const trimmed = (directText || '').trim()
      const text =
        trimmed.length > MAX_CHAT_MESSAGE_CHARS ? trimmed.slice(0, MAX_CHAT_MESSAGE_CHARS) : trimmed
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

      const normalizedGender =
        typeof profile.gender === 'string'
          ? profile.gender.toLowerCase() === 'female'
            ? 'female'
            : profile.gender.toLowerCase() === 'male'
              ? 'male'
              : undefined
          : undefined
      const normalizedLatitude =
        typeof profile.latitude === 'number' && Number.isFinite(profile.latitude)
          ? profile.latitude
          : undefined
      const normalizedLongitude =
        typeof profile.longitude === 'number' && Number.isFinite(profile.longitude)
          ? profile.longitude
          : undefined

      const payload: ChatPayload = {
        name: profile.name,
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        birthTimeUnknown: profile.birthTimeUnknown,
        latitude: normalizedLatitude,
        longitude: normalizedLongitude,
        gender: normalizedGender,
        city: profile.city,
        // 기기 현재 시간대 — "오늘"/일진을 사용자 로컬 날짜로 계산(새벽 어긋남 방지).
        userTimezone:
          typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined,
        lang,
        // 마지막 20턴만 (10쌍 user/assistant). 이전엔 50턴이었는데 그건
        // 매 message 마다 caching 안 되는 priorTurns 토큰만 ~5K 추가됐고
        // 실제로 LLM 이 10쌍 너머 옛 turn 을 reference 하는 경우가 드물었음.
        // 더 긴 컨텍스트가 필요하면 별도 summary 압축으로.
        messages: nextMessages.slice(-20),
        cvText,
        saju,
        astro,
        advancedAstro,
        predictionContext,
        userContext,
        counselingBrief: buildLocalCounselingBrief(text, lang) ?? undefined,
        // 새로고침/탭 복제로 같은 turn 재진입 시 크레딧 중복 차감 방지.
        // 매 user 메시지마다 새 UUID. 재시도(attempt > 0) 도 같은 payload
        // 라서 같은 키 유지 → 의도된 재시도는 차감 1 회.
        idempotencyKey:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `t${Date.now()}-${Math.random().toString(36).slice(2)}`,
      }

      try {
        const res = await makeRequest(payload)

        if (res.headers.get('x-fallback') === '1') {
          setUsedFallback(true)
          setNotice(tr.fallbackNote)
        }

        const assistantMsgId = generateMessageId('assistant')
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '',
            id: assistantMsgId,
            streaming: true,
          },
        ])
        setLoading(false)

        await processStream(res, assistantMsgId, text)
      } catch (e: unknown) {
        logger.error('[Chat] send error:', e)
        const err = e as Error
        // 진짜 네트워크 끊김(응답 없음)일 때만 "Connection lost" 배너 표시.
        // HTTP 응답을 받은 에러(401/402/403/4xx/5xx, 크레딧/게스트 한도 등)는
        // 인터넷 문제 아님 — 별도 메시지로 노티만 띄움.
        const hadHttpResponse =
          err.message.startsWith('API_ERROR:') ||
          err.message.includes('INSUFFICIENT_CREDITS') ||
          err.message.includes('GUEST_LIMIT_REACHED')
        if (!hadHttpResponse) {
          setConnectionStatus('offline')
        }

        const errorMessage = getErrorMessage(err, lang, tr)
        setNotice(errorMessage)

        // 에러를 assistant 챗 버블로 추가하지 않음 — 위의 notice 배너가
        // 에러 표시의 단일 출처. 챗 버블로 넣으면 일반 응답처럼 렌더되어
        // 👍/👎 피드백 UI 까지 따라붙는데, 에러에 대해 피드백은 의미 없음.
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
      MAX_CHAT_MESSAGE_CHARS,
    ]
  )

  return {
    loading,
    retryCount,
    connectionStatus,
    usedFallback,
    guestMode,
    followUpQuestions,
    setFollowUpQuestions,
    handleSend,
    showCrisisModal,
    setShowCrisisModal,
  }
}
