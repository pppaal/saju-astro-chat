'use client'

// useChatApi — 운명 상담사 전용 어댑터.
//
// 채팅 오케스트레이션 골격(전송 파이프라인 / idempotency 재사용 / 끊긴 턴
// 복원 / "다시 시도" / 드래프트 보존)은 궁합 상담사와 공유하는
// @/lib/counselor/useCounselorChat 으로 이동했다. 이 파일에는 운명 상담사만의
// 차이 — 컨텍스트 캐시 워밍, 위기 감지, 토큰 버퍼링 렌더, connectionStatus /
// retryCount / x-fallback 안내, normalizeCounselorResponse, onSaveMessage
// 저장 위임 — 만 남아 config 로 주입된다.

import React from 'react'
import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/api'
import { useCreditModal } from '@/contexts/CreditModalContext'
import { CHAT_I18N, detectCrisis, type LangKey } from '../chat-i18n'
import { CHAT_TIMINGS, CHAT_LIMITS, type Message, type ConnectionStatus } from '../chat-constants'
import { generateMessageId, getConnectionStatus, getErrorMessage } from '../chat-utils'
import type { ChatProps, ChatPayload, DestinySources } from '../chat-types'
import { normalizeCounselorResponse } from '@/lib/counselor/responseContract'
import {
  useCounselorChat,
  requestCounselorStream,
  mergeCounselorFollowUps,
  type CounselorSendOptions,
} from '@/lib/counselor/useCounselorChat'

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
  /** 이번 답변에 넣을 데이터 소스(사주만/점성만/둘 다). 기본 둘 다. */
  sources?: DestinySources
  cvText: string
  ragSessionId?: string
  autoScroll: boolean
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onSaveMessage?: (userMsg: string, assistantMsg: string) => void
  setNotice: React.Dispatch<React.SetStateAction<string | null>>
  /**
   * 서버 채팅 세션 id (있으면 서버가 정본) — 게스트 진행 드래프트
   * (pendingChat 'destiny') 의 저장/정리 판단에 사용.
   */
  chatSessionId?: string
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
  /** 잘린 마지막 답변 재요청 — 직전 turn idempotencyKey 재사용 (공용 훅 위임). */
  retryLastAnswer: () => void
  /** 복원 시 떼어둔 '미답변 user 질문' 등록 — 인증 확인되면 1회 자동 재전송. */
  queueResumeText: (text: string) => void
  /** 자동 재전송/재시도가 거칠 바깥 send 래퍼 등록처 (Chat.tsx 의 handleSend). */
  outerSendRef: React.MutableRefObject<
    ((text?: string, options?: CounselorSendOptions<Message>) => void | Promise<void>) | null
  >
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
  sources,
  cvText,
  ragSessionId,
  autoScroll,
  messagesEndRef,
  onSaveMessage,
  setNotice,
  chatSessionId,
}: UseChatApiOptions): UseChatApiReturn {
  // 기본값 — 둘 다(기존 동작). 최소 하나 보장은 토글 UI 쪽 책임. useMemo 로
  // 참조 안정화 — 워밍 effect 의 deps 가 매 렌더 새 객체로 재실행되지 않게.
  const effectiveSources: DestinySources = React.useMemo(
    () => sources ?? { saju: true, astro: true },
    [sources]
  )
  const effectiveLang = lang === 'ko' ? 'ko' : 'en'
  const tr = CHAT_I18N[effectiveLang]
  const { showDepleted } = useCreditModal()

  const [retryCount, setRetryCount] = React.useState(0)
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>('online')
  const [usedFallback, setUsedFallback] = React.useState(false)
  const [showCrisisModal, setShowCrisisModal] = React.useState(false)
  const MAX_CHAT_MESSAGE_CHARS = 8000

  // Stream updates are buffered so the UI does not re-layout on every token.
  const pendingContentRef = React.useRef<string | null>(null)
  const updateTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRenderedLengthRef = React.useRef(0)
  const lastRenderTimeRef = React.useRef(0)
  // 스트리밍 중 자동 스크롤 스로틀 (100ms) — 턴 시작마다 onSendStart 에서 리셋.
  const lastScrollTimeRef = React.useRef(0)
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
  // 캐시를 채워둔다. 워밍 body 는 아래 performRequest 의 payload 와 *동일 필드*로
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
    // sources 도 포함 — 소스 토글이 바뀌면 그 조합으로 다시 워밍해야 답변이 hit.
    const fp = [
      profile.birthDate,
      profile.birthTime ?? '',
      normalizedGender ?? '',
      normalizedLatitude ?? '',
      normalizedLongitude ?? '',
      userTimezone ?? '',
      lang,
      `s${effectiveSources.saju ? 1 : 0}${effectiveSources.astro ? 1 : 0}`,
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
        sources: effectiveSources,
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
    effectiveSources,
  ])

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

  const chat = useCounselorChat<Message>({
    namespace: 'destiny',
    messagesState: [messages, setMessages],
    // 과도하게 긴 입력은 운명 상담사만 클램프 (기존 동작).
    prepareText: (trimmed) =>
      trimmed.length > MAX_CHAT_MESSAGE_CHARS ? trimmed.slice(0, MAX_CHAT_MESSAGE_CHARS) : trimmed,
    // Crisis detection — 차단하지 않고 모달만 띄운다.
    beforeSend: (text) => {
      if (detectCrisis(text, lang)) {
        setShowCrisisModal(true)
      }
    },
    makeUserMessage: (text) => ({ role: 'user', content: text, id: generateMessageId('user') }),
    makeAssistantMessage: () => ({
      role: 'assistant',
      content: '',
      id: generateMessageId('assistant'),
      streaming: true,
    }),
    // 기존 useChatApi 의 value-set(함수형 아님) 유지 — retry 직전 pop 과의
    // 상호작용(직전 렌더 히스토리 기준 덮어쓰기)까지 현행 동작 보존.
    applyUserMessage: ({ setMessages: set, userMessage, baseHistory }) => {
      set([...baseHistory, userMessage])
    },
    onSendStart: () => {
      setNotice(null)
      setUsedFallback(false)
      lastScrollTimeRef.current = 0
    },
    performRequest: async ({ turn, history }) => {
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
        messages: history.slice(-20),
        cvText,
        sources: effectiveSources,
        saju,
        astro,
        advancedAstro,
        predictionContext,
        userContext,
        // 공용 훅이 할당한 idempotency 키 — retry 면 직전 turn 키 재사용됨.
        idempotencyKey: turn.idempotencyKey,
        // 끊겨도 서버가 끝까지 생성해 이 키로 캐시에 저장 → 돌아오면 복원.
        turnId: turn.turnId,
      }

      return requestCounselorStream({
        doFetch: (signal) => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'x-session-id': ragSessionId || sessionIdRef.current,
          }
          if (payload.idempotencyKey) {
            headers['x-idempotency-key'] = payload.idempotencyKey
          }
          return apiFetch('/api/counselor/realtime', {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal,
          })
        },
        headerTimeoutMs: CHAT_TIMINGS.HEADER_TIMEOUT,
        maxRetryAttempts: CHAT_LIMITS.MAX_RETRY_ATTEMPTS,
        retryBaseDelayMs: CHAT_TIMINGS.RETRY_BASE_DELAY,
        onAttemptStart: (attempt) => {
          logger.debug(`[Chat] Request started (attempt ${attempt + 1})`)
        },
        onResponse: (res, elapsedMs) => {
          logger.debug(`[Chat] Response received: ${elapsedMs.toFixed(0)}ms`)
          setConnectionStatus(getConnectionStatus(elapsedMs))
        },
        afterOk: (res) => {
          if (!res.body) {
            throw new Error('No response body')
          }
          setRetryCount(0)
        },
        onNotOk: async (res, _attempt, canRetry): Promise<'retry'> => {
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

          if (canRetry) {
            logger.warn(`[Chat] Server error ${res.status}, retrying...`)
            return 'retry'
          }
          throw new Error(`API_ERROR:${res.status}${detail ? `:${detail}` : ''}`)
        },
        onTimeoutLike: () => setConnectionStatus('slow'),
        onRetryScheduled: (nextAttempt, reason) => {
          if (reason === 'timeout') {
            logger.warn(`[Chat] Request timeout, retrying...`)
          }
          setRetryCount(nextAttempt)
        },
        mapExhaustedTimeout: () => new Error('Request timeout. Please check your connection.'),
      })
    },
    onResponse: (res) => {
      if (res.headers.get('x-fallback') === '1') {
        setUsedFallback(true)
        setNotice(tr.fallbackNote)
      }
    },
    chunkIdleTimeoutMs: CHAT_TIMINGS.CHUNK_IDLE_TIMEOUT,
    // 서버 heartbeat(`: hb`)도 idle 재무장 — Claude 의 긴 thinking pause 가
    // 잘못된 abort 로 잘리지 않게 (운명 상담사 기존 동작).
    rearmIdleOnActivity: true,
    renderChunk: (cleaned) => {
      // Update message in real-time as chunks arrive (buffered/throttled)
      updateLastAssistantMessage(cleaned)
      // Auto-scroll during streaming (throttled to every 100ms)
      const now = Date.now()
      if (autoScroll && now - lastScrollTimeRef.current > 100) {
        lastScrollTimeRef.current = now
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    },
    onStreamError: () => {
      setNotice(tr.error)
    },
    completeTurn: ({ result, turn, assistantMsgId }, helpers) => {
      // Flush final content immediately (bypass throttle)
      if (!result.content) {
        flushFinalMessage(tr.noResponse)
      } else {
        const normalizedContent = normalizeCounselorResponse(result.content, effectiveLang)
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

        // followUp 칩 — generic 필터 + 부족분 폴백 (공용 헬퍼).
        helpers.setFollowUpQuestions(
          mergeCounselorFollowUps({
            aiFollowUps: result.followUps,
            userText: turn.text,
            assistantContent: normalizedContent,
            lang,
            count: CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT,
          })
        )

        if (onSaveMessage) {
          onSaveMessage(turn.text, normalizedContent)
        }
      }

      // 끊김/미완 처리 — 클라가 답을 끝까지 못 받았어도(빈 응답 or
      // ||FOLLOWUP|| 마커 전 truncated) 서버는 keepGeneratingOnDisconnect 로
      // 끝까지 생성해 turnId 캐시에 저장한다. 완성 전이면 복원 대상에 등록하고
      // 즉시(이미 돌아와 있으면) 폴링 시작 — 아니면 visibility 시 재개.
      const completedOk = !!result.content && result.success && !result.truncated
      if (!completedOk) {
        helpers.markRecoverable(assistantMsgId)
        setMessages((prev) => {
          const updated = [...prev]
          const idx = updated.findIndex((m) => m.id === assistantMsgId)
          if (idx >= 0) updated[idx] = { ...updated[idx], incomplete: true }
          return updated
        })
        helpers.kickRecover()
      } else {
        helpers.finishTurnClean()
      }
    },
    onSendFailure: (e) => {
      logger.error('[Chat] send error:', e)
      const err = e as Error
      // 진짜 네트워크 끊김(응답 없음)일 때만 "Connection lost" 배너 표시.
      // HTTP 응답을 받은 에러(401/402/403/4xx/5xx, 크레딧 한도 등)는
      // 인터넷 문제 아님 — 별도 메시지로 노티만 띄움.
      const hadHttpResponse =
        err.message.startsWith('API_ERROR:') || err.message.includes('INSUFFICIENT_CREDITS')
      if (!hadHttpResponse) {
        setConnectionStatus('offline')
      }

      const errorMessage = getErrorMessage(err, lang, tr)
      setNotice(errorMessage)

      // 에러를 assistant 챗 버블로 추가하지 않음 — 위의 notice 배너가
      // 에러 표시의 단일 출처. 챗 버블로 넣으면 일반 응답처럼 렌더되어
      // 👍/👎 피드백 UI 까지 따라붙는데, 에러에 대해 피드백은 의미 없음.
      setRetryCount(0)
    },
    // destiny 는 언마운트 후에도 후처리(부분 저장 / pendingTurn 기록)가 돌던
    // 기존 동작을 유지한다 — setState 는 React 가 no-op 처리.
    haltOnUnmount: false,
    // Unmount cleanup. Navigating away mid-stream used to leave the buffered
    // tail in pendingContentRef and never reach onSaveMessage — persist the
    // buffered partial so the saved record matches what the user saw.
    onUnmountCleanup: ({ inFlightUserText }) => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current)
        updateTimerRef.current = null
      }
      const partial = pendingContentRef.current
      if (inFlightUserText && partial && partial.length > 0 && onSaveMessageRef.current) {
        try {
          onSaveMessageRef.current(inFlightUserText, partial)
        } catch {
          /* onSaveMessage failures shouldn't bubble out of unmount. */
        }
      }
      pendingContentRef.current = null
    },
    resultEndpoint: (turnId) =>
      `/api/counselor/realtime/result?turnId=${encodeURIComponent(turnId)}`,
    applyRecovered: ({ userText, assistantMsgId, cleanContent, followUps }, recoverHelpers) => {
      const normalized = normalizeCounselorResponse(cleanContent, effectiveLang)
      setMessages((prev) => {
        const updated = [...prev]
        // 정상 경로는 assistantMsgId 로 매칭. 새로고침 후 복원이면 그 id 가
        // 이번 마운트의 메시지에 없을 수 있어, 끝에 남은 미완성 assistant
        // 메시지를 폴백 대상으로 잡는다.
        let idx = updated.findIndex((m) => m.id === assistantMsgId)
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
      recoverHelpers.setFollowUpQuestions(
        mergeCounselorFollowUps({
          aiFollowUps: followUps,
          userText,
          assistantContent: normalized,
          lang,
          count: CHAT_LIMITS.FOLLOWUP_DISPLAY_COUNT,
        })
      )
      onSaveMessageRef.current?.(userText, normalized)
      setNotice(null)
    },
    isRecoverableLastMessage: (last) => last.role === 'assistant' && !!last.incomplete,
    retryUsesHistoryOverride: false,
    // 게스트 진행 채팅 드래프트 — 서버 세션(chatSessionId)이 생기면 서버가
    // 정본이므로 정리. user/assistant 메시지만 저장 (system 제외).
    draft: {
      hasServerSession: !!chatSessionId,
      build: (msgs) => {
        const real = msgs.filter((m) => m.role === 'user' || m.role === 'assistant')
        return real.length > 0 ? { messages: real } : null
      },
    },
  })

  return {
    loading: chat.loading,
    retryCount,
    connectionStatus,
    usedFallback,
    followUpQuestions: chat.followUpQuestions,
    setFollowUpQuestions: chat.setFollowUpQuestions,
    handleSend: chat.sendMessage,
    showCrisisModal,
    setShowCrisisModal,
    retryLastAnswer: chat.retryLastAnswer,
    queueResumeText: chat.queueResumeText,
    outerSendRef: chat.outerSendRef,
  }
}
