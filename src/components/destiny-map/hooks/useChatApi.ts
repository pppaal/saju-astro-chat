'use client'

import React from 'react'
import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/api'
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
import { normalizeCounselorResponse } from '@/lib/counselor/responseContract'
import {
  readPendingTurn as readPendingTurnRaw,
  writePendingTurn as writePendingTurnRaw,
  clearPendingTurn as clearPendingTurnRaw,
  PENDING_TURN_TTL_MS,
  type PendingTurn,
} from '@/lib/chat/pendingTurn'
import { useRecoverOnResume } from '@/hooks/useRecoverOnResume'

const readPendingTurn = (): PendingTurn | null => readPendingTurnRaw('destiny')
const writePendingTurn = (t: PendingTurn): void => writePendingTurnRaw('destiny', t)
const clearPendingTurn = (): void => clearPendingTurnRaw('destiny')

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
  followUpQuestions: string[]
  setFollowUpQuestions: React.Dispatch<React.SetStateAction<string[]>>
  handleSend: (directText?: string, options?: { isRetry?: boolean }) => Promise<void>
  showCrisisModal: boolean
  setShowCrisisModal: React.Dispatch<React.SetStateAction<boolean>>
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
  const [followUpQuestions, setFollowUpQuestions] = React.useState<string[]>([])
  const [showCrisisModal, setShowCrisisModal] = React.useState(false)
  const MAX_CHAT_MESSAGE_CHARS = 8000

  // Stream updates are buffered so the UI does not re-layout on every token.
  const pendingContentRef = React.useRef<string | null>(null)
  const updateTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRenderedLengthRef = React.useRef(0)
  const lastRenderTimeRef = React.useRef(0)
  // 직전 user turn 의 idempotencyKey 보관 — "다시 시도" 시 같은 키 재사용으로
  // 서버가 idempotent replay 분기를 타게 해 credit 추가 차감 방지.
  const lastTurnIdemKeyRef = React.useRef<string | null>(null)
  // Track the in-flight stream's user text so the unmount cleanup below
  // can persist whatever was buffered. Cleared once the stream resolves
  // normally and processStream calls onSaveMessage itself.
  const inFlightStreamRef = React.useRef<{
    userText: string
    controller: AbortController
  } | null>(null)
  // Refs to the latest callback prop values so the unmount cleanup
  // doesn't capture a stale closure when the parent re-renders.
  const onSaveMessageRef = React.useRef(onSaveMessage)
  React.useEffect(() => {
    onSaveMessageRef.current = onSaveMessage
  }, [onSaveMessage])

  // 진입 시 컨텍스트 캐시 워밍 — 첫 답변 속도 개선.
  // realtime 답변 경로는 saju+천체력으로 무거운 컨텍스트를 빌드한다(daily 캐시는
  // 1일이라 "그날 첫 답변"마다 critical path 에서 재빌드 → 느림). 진입하자마자
  // 같은 입력으로 /api/counselor/warm 을 fire-and-forget 호출해 답변 도착 전에
  // 캐시를 채워둔다. 워밍 body 는 아래 handleSend 의 payload 와 *동일 필드*로
  // 구성해야 캐시 키(birthFingerprint)가 일치해 실제 답변이 hit 한다.
  // 비로그인이면 warm 라우트가 401 로 조용히 무시 → 무해.
  const warmedFingerprintRef = React.useRef<string | null>(null)
  React.useEffect(() => {
    if (!profile?.birthDate) return
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
    const userTimezone =
      typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined
    // 같은 입력이면 한 번만 워밍 (locale 토글·리렌더로 중복 호출 방지).
    const fp = [
      profile.birthDate,
      profile.birthTime ?? '',
      normalizedGender ?? '',
      normalizedLatitude ?? '',
      normalizedLongitude ?? '',
      userTimezone ?? '',
      lang,
    ].join('|')
    if (warmedFingerprintRef.current === fp) return
    warmedFingerprintRef.current = fp

    const controller = new AbortController()
    void apiFetch('/api/counselor/warm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        birthDate: profile.birthDate,
        birthTime: profile.birthTime,
        birthTimeUnknown: profile.birthTimeUnknown,
        latitude: normalizedLatitude,
        longitude: normalizedLongitude,
        gender: normalizedGender,
        city: profile.city,
        userTimezone,
        lang,
      }),
      signal: controller.signal,
      // 401(비로그인) 시 전역 로그인 모달을 띄우지 않게 — 워밍은 조용한 부수작업.
      suppressAuthModal: true,
    }).catch(() => {
      // 워밍 실패는 무해 — 답변 경로가 다시 빌드한다.
    })
    return () => controller.abort()
  }, [
    profile?.birthDate,
    profile?.birthTime,
    profile?.birthTimeUnknown,
    profile?.gender,
    profile?.latitude,
    profile?.longitude,
    profile?.city,
    lang,
  ])

  // 끊긴 턴 복원 — 서버는 연결이 끊겨도 끝까지 생성해 turnId 로 캐시에 저장한다
  // (claudeSSE keepGeneratingOnDisconnect). 스트림이 불완전하게 끝났거나
  // 사용자가 다른 앱에서 돌아오면(visibilitychange) 이 정보로 result 를
  // 폴링해 완성 답으로 갈아끼운다.
  const recoverableTurnRef = React.useRef<{
    turnId: string
    assistantMsgId: string
    userText: string
  } | null>(null)
  const recoveringRef = React.useRef(false)

  const attemptRecover = React.useCallback(async () => {
    const info = recoverableTurnRef.current
    if (!info || recoveringRef.current) return
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    recoveringRef.current = true
    try {
      // 서버가 아직 생성 중이면 ready=false → 2초 간격 재시도 (보이는 동안만).
      for (let i = 0; i < 30; i++) {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') break
        if (recoverableTurnRef.current?.turnId !== info.turnId) break // 새 턴이 덮어씀
        try {
          const res = await fetch(
            `/api/counselor/realtime/result?turnId=${encodeURIComponent(info.turnId)}`,
            { credentials: 'include' }
          )
          if (res.ok) {
            const data = (await res.json()) as { ready?: boolean; content?: string }
            if (data.ready && typeof data.content === 'string' && data.content.length > 0) {
              // 복원 답안에도 정상 스트림과 동일한 후처리 — ||FOLLOWUP|| 마커를
              // 떼어내고(안 그러면 본문에 그대로 노출됨) 후속질문 칩으로 변환.
              const { cleanContent, followUps } = streamProcessor.extractFollowUpQuestions(
                data.content
              )
              const normalized = normalizeCounselorResponse(
                cleanContent,
                lang === 'ko' ? 'ko' : 'en'
              )
              setMessages((prev) => {
                const updated = [...prev]
                // 정상 경로는 assistantMsgId 로 매칭. 새로고침 후 복원이면 그 id 가
                // 이번 마운트의 메시지에 없을 수 있어, 끝에 남은 미완성 assistant
                // 메시지를 폴백 대상으로 잡는다.
                let idx = updated.findIndex((m) => m.id === info.assistantMsgId)
                if (idx < 0) {
                  for (let i = updated.length - 1; i >= 0; i--) {
                    if (updated[i].role === 'assistant') {
                      idx = i
                      break
                    }
                  }
                }
                if (idx >= 0) {
                  updated[idx] = {
                    ...updated[idx],
                    content: normalized,
                    incomplete: false,
                    streaming: false,
                  }
                }
                return updated
              })
              // 후속질문 칩 — 정상 경로와 동일하게 generic 필터 + 부족분 폴백.
              const goodAiFollowUps = followUps.filter((q) => !isGenericFollowUp(q, lang))
              const needed = CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT - goodAiFollowUps.length
              const mergedFollowUps =
                needed > 0
                  ? [
                      ...goodAiFollowUps,
                      ...generateFollowUpQuestions(
                        info.userText,
                        lang,
                        CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT,
                        normalized
                      ).filter((q) => !goodAiFollowUps.includes(q)),
                    ].slice(0, CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT)
                  : goodAiFollowUps.slice(0, CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT)
              setFollowUpQuestions(mergedFollowUps)
              onSaveMessageRef.current?.(info.userText, normalized)
              setNotice(null)
              recoverableTurnRef.current = null
              clearPendingTurn()
              return
            }
          }
        } catch {
          /* 네트워크 흔들림 — 다음 루프에서 재시도 */
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
    } finally {
      recoveringRef.current = false
    }
  }, [lang, setMessages, setNotice, setFollowUpQuestions])

  useRecoverOnResume(attemptRecover)

  // 새로고침/앱 재실행 복원 — 탭을 완전히 닫았다 열면 recoverableTurnRef(메모리)는
  // 사라지지만, 잘린 답은 서버 세션/게스트 드래프트로 복원돼 화면 맨 끝에 미완성
  // assistant 로 남는다. localStorage 의 turnId 가 아직 살아 있고(서버 캐시 TTL
  // 내) 마지막 메시지가 그 미완성 답이면, 사용자가 아무것도 안 해도 result 캐시를
  // 폴링해 완성본으로 갈아끼운다. 마운트당 1회, 새 전송이 시작되면 무효화.
  const mountRecoverDoneRef = React.useRef(false)
  React.useEffect(() => {
    if (mountRecoverDoneRef.current) return
    if (loading) return
    const pending = readPendingTurn()
    if (!pending) {
      mountRecoverDoneRef.current = true
      return
    }
    if (Date.now() - pending.ts > PENDING_TURN_TTL_MS) {
      clearPendingTurn()
      mountRecoverDoneRef.current = true
      return
    }
    // 대화가 아직 복원되는 중일 수 있다(드래프트/서버 resume 은 비동기) — 메시지가
    // 채워질 때까지 기다렸다가, 마지막이 미완성 assistant 일 때만 복원한다.
    const last = messages[messages.length - 1]
    if (!last) return
    if (last.role !== 'assistant' || !last.incomplete) {
      // 복원된 대화가 미완성으로 끝나지 않음 → 살릴 게 없음.
      clearPendingTurn()
      mountRecoverDoneRef.current = true
      return
    }
    mountRecoverDoneRef.current = true
    recoverableTurnRef.current = {
      // id 가 없으면 attemptRecover 의 폴백(끝의 미완성 assistant 탐색)이 처리.
      turnId: pending.turnId,
      assistantMsgId: last.id ?? '',
      userText: pending.userText,
    }
    void attemptRecover()
  }, [messages, loading, attemptRecover])

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
    async (
      payload: ChatPayload,
      attempt: number = 0
    ): Promise<{ res: Response; controller: AbortController }> => {
      const startTime = performance.now()
      logger.debug(`[Chat] Request started (attempt ${attempt + 1})`)

      // 응답 헤더까지의 cap 만 절대 시간으로 적용한다. 본문 스트림은 응답 도착
      // 후 chunk idle 기준(processStream) 으로 따로 관리해서, 답변이 길어
      // 도(연속 토큰만 들어오면) 중간에 잘리지 않는다.
      const controller = new AbortController()
      const headerTimer = setTimeout(() => {
        controller.abort()
      }, CHAT_TIMINGS.HEADER_TIMEOUT)

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-session-id': ragSessionId || sessionIdRef.current,
        }
        if (payload.idempotencyKey) {
          headers['x-idempotency-key'] = payload.idempotencyKey
        }
        const res = await apiFetch('/api/counselor/realtime', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
        clearTimeout(headerTimer)

        const responseTime = performance.now() - startTime
        logger.debug(`[Chat] Response received: ${responseTime.toFixed(0)}ms`)

        setConnectionStatus(getConnectionStatus(responseTime))

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

          // 401(비로그인)은 apiFetch 가 전역 로그인 모달을 띄운다 → 여기선 throw 만.

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
        return { res, controller }
      } catch (error: unknown) {
        clearTimeout(headerTimer)
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
    async (
      res: Response,
      controller: AbortController,
      assistantMsgId: string,
      userText: string,
      turnId?: string
    ): Promise<void> => {
      // Register the in-flight stream so the unmount cleanup (below) can
      // persist the buffered partial if the user navigates away mid-
      // stream. Cleared in the finally block once the stream is done.
      inFlightStreamRef.current = { userText, controller }
      try {
        let lastScrollTime = 0

        // Chunk idle timer — chunk 가 들어올 때마다 reset. 일정 시간 동안 한 byte
        // 도 안 오면 응답이 진짜 멈춘 것으로 보고 abort. fetch signal 에 연결되어
        // 있어 controller.abort() 가 reader.read() 도 종료시킨다.
        let idleTimer: ReturnType<typeof setTimeout> | null = null
        const armIdleTimer = () => {
          if (idleTimer) clearTimeout(idleTimer)
          idleTimer = setTimeout(() => {
            controller.abort()
          }, CHAT_TIMINGS.CHUNK_IDLE_TIMEOUT)
        }
        armIdleTimer()

        const result = await streamProcessor.process(res, {
          // 서버 heartbeat(`: hb`)를 포함해 어떤 바이트든 들어오면 idle 타이머
          // 재무장 — Claude 가 토큰 사이 길게 멈춰도(heartbeat 만 흐름) 잘못된
          // abort 로 답이 끊기지 않게 한다.
          onActivity: () => armIdleTimer(),
          onChunk: (_accumulated, cleaned) => {
            armIdleTimer()
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

        if (idleTimer) {
          clearTimeout(idleTimer)
          idleTimer = null
        }

        // Flush final content immediately (bypass throttle)
        if (!result.content) {
          flushFinalMessage(tr.noResponse)
        } else {
          const normalizedContent = normalizeCounselorResponse(
            result.content,
            lang === 'ko' ? 'ko' : 'en'
          )
          flushFinalMessage(normalizedContent)
          // 스트림이 ||FOLLOWUP|| 마커 전에 끊겼다면(모바일 LTE drop / 서버 idle
          // abort) 이 메시지에 incomplete 마킹 — MessageRow 가 "다시 시도" 칩을
          // 노출. truncated 는 finalMessage flush 직후 같은 lastAssistant 에 덧씌움.
          if (!result.success || result.truncated) {
            setMessages((prev) => {
              const updated = [...prev]
              const lastIdx = updated.length - 1
              if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                updated[lastIdx] = { ...updated[lastIdx], incomplete: true }
              }
              return updated
            })
          }

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

        // 끊김/미완 처리 — 클라가 답을 끝까지 못 받았어도(빈 응답 or
        // ||FOLLOWUP|| 마커 전 truncated) 서버는 keepGeneratingOnDisconnect 로
        // 끝까지 생성해 turnId 캐시에 저장한다. 완성 전이면 복원 대상에 등록하고
        // 즉시(이미 돌아와 있으면) 폴링 시작 — 아니면 visibility 시 재개.
        const completedOk = !!result.content && result.success && !result.truncated
        if (turnId && !completedOk) {
          recoverableTurnRef.current = { turnId, assistantMsgId, userText }
          // 새로고침/앱 재실행 후에도 살릴 수 있게 turnId 를 localStorage 에도 남김.
          writePendingTurn({ turnId, userText, ts: Date.now() })
          setMessages((prev) => {
            const updated = [...prev]
            const idx = updated.findIndex((m) => m.id === assistantMsgId)
            if (idx >= 0) updated[idx] = { ...updated[idx], incomplete: true }
            return updated
          })
          void attemptRecover()
        } else {
          recoverableTurnRef.current = null
          clearPendingTurn()
        }
      } finally {
        inFlightStreamRef.current = null
      }
    },
    [
      updateLastAssistantMessage,
      flushFinalMessage,
      autoScroll,
      messagesEndRef,
      setMessages,
      tr.error,
      tr.noResponse,
      lang,
      onSaveMessage,
      setNotice,
      attemptRecover,
    ]
  )

  // Main send handler
  const handleSend = React.useCallback(
    async (directText?: string, options?: { isRetry?: boolean }) => {
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

      // 새 전송 시작 → 마운트 복원 경로 무효화. 직전 미완성 턴의 영속 turnId 가
      // 새 답변에 잘못 덮어쓰이지 않게 하고, 이 턴이 끊기면 아래에서 새로 기록한다.
      mountRecoverDoneRef.current = true
      clearPendingTurn()

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
          typeof Intl !== 'undefined'
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : undefined,
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
        // 새로고침/탭 복제로 같은 turn 재진입 시 크레딧 중복 차감 방지.
        // 매 user 메시지마다 새 UUID. options.isRetry=true ("다시 시도"
        // 클릭) 일 때만 직전 turn 의 키 재사용 — 서버 idempotency store 가
        // replay 로 인식해 추가 credit 차감 없이 Claude 호출만 다시 돌린다.
        // 부분 응답 후 끊긴 케이스도 첫 호출에서 이미 차감됐기 때문에 새
        // 키로 보내면 중복 차감 발생.
        idempotencyKey:
          (options?.isRetry ? lastTurnIdemKeyRef.current : null) ||
          (typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `t${Date.now()}-${Math.random().toString(36).slice(2)}`),
      }
      lastTurnIdemKeyRef.current = payload.idempotencyKey ?? null
      // 끊겨도 서버가 끝까지 생성해 이 키로 캐시에 저장 → 돌아오면 복원.
      // idempotencyKey 와 동일 키 재사용(재시도도 같은 결과 키로 모임).
      payload.turnId = payload.idempotencyKey

      // 전송 시점에 곧바로 pendingTurn 을 영속화한다. 탭이 백그라운드로 가
      // abort/stall 이 truncation 분기(아래 processStream)에 도달하지 못한 채
      // 클로저가 멈추면 그 분기의 writePendingTurn 이 안 돌아 복원 단서가 사라진다.
      // 전송 즉시 남겨두면 어떤 식으로 멈춰도 result 캐시로 복원 가능 (truncation
      // 시점 write 와 같은 shape/TTL — idempotent). 정상 완료 시 clearPendingTurn 으로 지움.
      if (payload.turnId) {
        writePendingTurn({ turnId: payload.turnId, userText: text, ts: Date.now() })
      }

      try {
        const { res, controller } = await makeRequest(payload)

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
        // NOTE: setLoading(false)을 stream 완료 후(finally)로 옮긴다.
        // 이전엔 여기서 false 로 풀어서 스트리밍 중에 사용자가 다음 질문을
        // 보낼 수 있었고, 그러면 1번 스트림의 토큰이 2번 질문 답변 자리에
        // 잘못 누적되어 답변이 섞이는 회귀가 있었다(useChatApi.ts:701).
        await processStream(res, controller, assistantMsgId, text, payload.turnId)
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
        setRetryCount(0)
      } finally {
        // 정상 완료 + 에러 + abort 모두 여기서 loading 해제 — 스트리밍 도중
        // setLoading(false) 가 풀려 동시 send 가 발생하던 회귀(답변 토큰 섞임)
        // 차단. 두 번째 메시지는 위 handleSend 의 `if (loading) return` 가드에
        // 명확하게 막힌다.
        setLoading(false)
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

  // Unmount cleanup. Before this existed, navigating away mid-stream
  // left the buffered tail in pendingContentRef and never reached
  // onSaveMessage — the user's chat history captured only whatever was
  // last flushed to the React state, often a sentence short of the
  // actual response. Clear the pending render timer and, if we still
  // have a live stream, hand the buffered partial to onSaveMessage so
  // the persisted record matches what the user saw on screen.
  React.useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
        updateTimerRef.current = null
      }
      const inflight = inFlightStreamRef.current
      const partial = pendingContentRef.current
      if (inflight) {
        // Abort the fetch first so the stream reader stops chasing
        // bytes for a component nobody's watching anymore.
        try {
          inflight.controller.abort()
        } catch {
          /* AbortController throws if already aborted; ignore. */
        }
        if (partial && partial.length > 0 && onSaveMessageRef.current) {
          try {
            onSaveMessageRef.current(inflight.userText, partial)
          } catch {
            /* onSaveMessage failures shouldn't bubble out of unmount. */
          }
        }
      }
      inFlightStreamRef.current = null
      pendingContentRef.current = null
    }
  }, [])

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
