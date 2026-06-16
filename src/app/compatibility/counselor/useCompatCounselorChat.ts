'use client'

// 궁합 상담사 어댑터 훅 — 공용 채팅 오케스트레이션(@/lib/counselor/useCounselorChat)
// 에 궁합 전용 동작만 주입한다: 엔드포인트/요청 body(두 사람 + 사주·점성 스냅샷),
// 로그인 게이트(유료), x-counselor-fallback 헤더 기반 잘림 판정, 인라인
// chat-history 저장(첫 저장에 meta 스냅샷 첨부), 에러 카피.
//
// 전송 파이프라인 / idempotency 키 재사용 / 끊긴 턴 복원(pendingTurn TTL +
// result 폴링) / "다시 시도" / 게스트 드래프트 저장은 전부 공용 훅이 소유 —
// 운명 상담사(useChatApi)와 단일 출처.

import { useState } from 'react'
import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/api'
import { getErrorMessage as getCounselorErrorMessage } from '@/lib/counselor/errorMessage'
import { savePendingChat } from '@/lib/chat/pendingChat'
import { useCreditModal } from '@/contexts/CreditModalContext'
import { useRequireLogin } from '@/contexts/LoginModalContext'
import {
  useCounselorChat,
  requestCounselorStream,
  mergeCounselorFollowUps,
  type UseCounselorChatReturn,
} from '@/lib/counselor/useCounselorChat'
import type { ChatMessage, PersonData } from './types'

// 운명 상담사의 useChatApi 패턴과 동일 — 헤더 도착까지의 절대 시간 cap 과
// chunk 사이 idle cap 을 분리해서 관리한다. 헤더가 30s 안에 안 오면 abort,
// 헤더 받은 뒤엔 chunk idle 45s 기준으로 따로 관리.
const HEADER_TIMEOUT_MS = 30_000
const CHUNK_IDLE_TIMEOUT_MS = 45_000
const MAX_RETRY_ATTEMPTS = 2
const RETRY_BASE_DELAY_MS = 1_000

export interface UseCompatCounselorChatArgs {
  locale: 'ko' | 'en'
  isKo: boolean
  persons: PersonData[]
  person1Saju: Record<string, unknown> | null
  person2Saju: Record<string, unknown> | null
  person1Astro: Record<string, unknown> | null
  person2Astro: Record<string, unknown> | null
  chatSessionId: string | undefined
  setChatSessionId: React.Dispatch<React.SetStateAction<string | undefined>>
  chatTitle: string | null
  cvText: string
  /** 초기 URL 파싱/복원 중에는 드래프트 저장 보류. */
  isInitializing: boolean
  /** 페이지 마운트 라이프사이클 — 언마운트 후 setState/저장 bail-out 용. */
  mountedRef: React.MutableRefObject<boolean>
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

export function useCompatCounselorChat(
  args: UseCompatCounselorChatArgs
): UseCounselorChatReturn<ChatMessage> {
  const {
    locale,
    isKo,
    persons,
    person1Saju,
    person2Saju,
    person1Astro,
    person2Astro,
    chatSessionId,
    setChatSessionId,
    chatTitle,
    cvText,
    isInitializing,
    mountedRef,
    setError,
  } = args
  const { showDepleted } = useCreditModal()
  const requireLogin = useRequireLogin()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const lang = locale === 'ko' ? 'ko' : 'en'

  return useCounselorChat<ChatMessage>({
    namespace: 'compat',
    messagesState: [messages, setMessages],
    // 궁합 상담은 유료 서비스 — 비로그인이면 전송 대신 로그인 모달.
    // (게스트 무료 체험 제거: 로그인해야만 사용 가능.)
    beforeSend: (text) => {
      if (!requireLogin()) {
        // 막힌 질문을 인물 스냅샷과 함께 draft 에 저장 → 로그인(풀 리로드) 후
        // 복원 effect 가 persons 와 함께 살리고, 마지막 미답변 질문을 자동
        // 재전송한다. 이게 없으면 질문이 messages 에 안 들어가 통째로 사라진다.
        if (persons.length >= 2) {
          savePendingChat('compat', {
            persons,
            person1Saju,
            person2Saju,
            person1Astro,
            person2Astro,
            messages: [...messages, { role: 'user', content: text }],
            chatTitle,
          })
        }
        return false
      }
    },
    makeUserMessage: (text) => ({ role: 'user', content: text }),
    makeAssistantMessage: () => ({ role: 'assistant', content: '' }),
    applyUserMessage: ({ setMessages: set, userMessage }) => {
      set((prev) => [...prev, userMessage])
    },
    onSendStart: () => setError(null),
    performRequest: ({ turn, history, registerController }) => {
      // Send only the most recent turns. The server already clamps to
      // 8 via `clampMessages`, but uploading the full history every
      // turn wastes the user's mobile data + adds round-trip latency
      // for long conversations.
      const recentHistory = history.slice(-10)
      const requestBody = JSON.stringify({
        persons,
        person1Saju,
        person2Saju,
        person1Astro,
        person2Astro,
        lang: locale,
        messages: recentHistory,
        useRag: true,
        // 끊김 복구용 턴 식별자 — idempotencyKey 와 동일 값. 서버는 연결이
        // 끊겨도 끝까지 생성한 답을 이 키로 캐시하고, 사용자가 돌아오면
        // /api/compatibility/counselor/result?turnId=… 로 복원한다.
        turnId: turn.turnId,
        ...(cvText ? { cvText } : {}),
      })
      return requestCounselorStream({
        doFetch: (signal) =>
          apiFetch('/api/compatibility/counselor', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-idempotency-key': turn.idempotencyKey,
            },
            body: requestBody,
            signal,
          }),
        headerTimeoutMs: HEADER_TIMEOUT_MS,
        maxRetryAttempts: MAX_RETRY_ATTEMPTS,
        retryBaseDelayMs: RETRY_BASE_DELAY_MS,
        // 언마운트 시 진행 중 attempt 를 abort 할 수 있게 등록.
        registerController,
        onNotOk: async (res, _attempt, canRetry): Promise<'retry'> => {
          // 5xx 는 같은 idempotencyKey 로 자동 재시도(exponential backoff) —
          // credit 중복 차감 없음(서버 idemStore.claim 원자적 선점).
          if (canRetry) return 'retry'
          if (res.status === 401) {
            // 비로그인 — apiFetch 가 전역 로그인 모달도 띄운다.
            throw new Error('login_required')
          }
          // 402 Payment Required — credit exhausted. 잡아서 전역 크레딧
          // 안내 모달(showDepleted)로 처리한다(onSendFailure 참고).
          if (res.status === 402) {
            throw new Error('payment_required')
          }
          // Pull the route's short errorTag so the chat bubble shows
          // *why* the request failed instead of a generic "오류 발생".
          // The route returns { error, errorTag } as JSON for non-2xx.
          let detail = ''
          try {
            const body = (await res.clone().json()) as { errorTag?: string; error?: string }
            detail = body.errorTag || body.error || ''
          } catch {
            /* response wasn't JSON — fall through to plain status */
          }
          throw new Error(detail ? `Failed (${res.status}): ${detail}` : `Failed (${res.status})`)
        },
      })
    },
    chunkIdleTimeoutMs: CHUNK_IDLE_TIMEOUT_MS,
    // compat 기존 동작 유지 — content chunk 에만 idle 타이머 재무장 (heartbeat
    // 만 흐르는 동안엔 재무장하지 않음).
    rearmIdleOnActivity: false,
    renderChunk: (cleaned) => {
      if (!mountedRef.current) return
      setMessages((prev) => {
        const updated = [...prev]
        if (updated.length > 0 && updated[updated.length - 1].role === 'assistant') {
          updated[updated.length - 1] = {
            role: 'assistant',
            content: cleaned,
          }
        }
        return updated
      })
    },
    onStreamError: (err) => {
      logger.warn('[CompatCounselor] stream error', { error: err })
    },
    completeTurn: ({ result, finalContent, response, turn }, helpers) => {
      // 스트림이 ||FOLLOWUP|| 마커 전에 끊겼다면(모바일 LTE drop / 서버 idle
      // abort / Claude disconnect) 메시지를 "다시 시도" 버튼이 붙는 incomplete
      // 상태로 마킹. 단, 서버가 X-Counselor-Fallback: 1 을 달아 보낸 응답
      // (안전 차단 / 완결성 부족 / Claude 에러 시 generic 안내문) 은 *완결된*
      // 메시지지만 마커가 없을 뿐이라 truncated 로 보면 안 됨 → 헤더로 분기.
      const isServerFallback = response.headers.get('x-counselor-fallback') === '1'
      const wasTruncated = !isServerFallback && (!result.success || result.truncated)
      if (wasTruncated && finalContent) {
        setMessages((prev) => {
          const updated = [...prev]
          const lastIdx = updated.length - 1
          if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
            updated[lastIdx] = { ...updated[lastIdx], incomplete: true }
          }
          return updated
        })
        // 끊김/미완 — 서버는 keepGeneratingOnDisconnect 로 끝까지 생성해 turnId
        // 캐시에 저장한다. 복원 대상에 등록하고 즉시(이미 돌아와 있으면) 폴링
        // 시작 — 아니면 visibility 시 재개. 게스트는 turnId 캐시가 없어 result
        // 가 항상 ready=false → 폴링이 자연히 만료되므로 별도 가드 불필요.
        helpers.markRecoverable()
        helpers.kickRecover()
      } else if (finalContent) {
        // 정상 완료 — 더 이상 복원할 게 없으니 영속 단서 정리. (truncate/에러
        // 가 아닌, 실제 완결 답이 도착한 경우만.)
        helpers.finishTurnClean()
      }
      // 운명 상담사와 동일 패턴 — LLM generic followup 필터 + 부족분 폴백
      // (공용 mergeCounselorFollowUps 헬퍼).
      helpers.setFollowUpQuestions(
        mergeCounselorFollowUps({
          aiFollowUps: result.followUps,
          userText: turn.text,
          assistantContent: finalContent,
          lang,
        })
      )

      // Persist the exchange so it shows up in the past-chats sidebar
      // next visit. Fire-and-forget; save failure must not block UX.
      if (finalContent) {
        const isFirstSave = !chatSessionId
        const body: Record<string, unknown> = {
          sessionId: chatSessionId,
          locale: lang,
          userMessage: turn.text,
          assistantMessage: finalContent,
          type: 'compat',
        }
        // On the *first* save attach the couple snapshot so a future
        // re-open can restore the chart without recomputing.
        if (isFirstSave) {
          body.meta = {
            persons,
            person1Saju,
            person2Saju,
            person1Astro,
            person2Astro,
          }
        }
        // apiFetch — 세션 쿠키를 항상 실어 모바일 인앱 브라우저에서도 저장이
        // 성공하도록. 저장이 실패하면 이어 띄울 "최신 채팅"이 없어 매번 폼이
        // 떴다(#1037 와 동일한 native-fetch 쿠키 누락 이슈).
        apiFetch('/api/counselor/chat-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data: { success?: boolean; session?: { id: string } } | null) => {
            if (!mountedRef.current) return
            if (data?.success && data.session?.id && !chatSessionId) {
              setChatSessionId(data.session.id)
            }
          })
          .catch((err) => logger.warn('[CompatCounselor] chat-history save failed', { error: err }))
      }
    },
    onSendFailure: (e) => {
      // Aborted via unmount — silent bail; nothing to setState into.
      const errName = (e as Error & { name?: string })?.name
      if (errName === 'AbortError' || !mountedRef.current) {
        return
      }
      logger.error('Chat error:', { error: e })
      const errMsg = (e as Error).message || ''
      if (errMsg === 'login_required') {
        setError(
          isKo ? '로그인이 필요한 프리미엄 기능입니다.' : 'Login required for this premium feature.'
        )
      } else if (errMsg === 'payment_required') {
        // 크레딧 소진 → 인라인 에러 대신 전역 크레딧 안내 모달을 띄운다
        // (운명 상담사·타로와 동일한 UX).
        showDepleted()
      } else {
        // Use the shared counselor localizer — same 429/5xx/timeout
        // branches as 운명상담사. raw `[Failed (500): …]` 태그는 사용자에게
        // 노출하지 않는다 (위에서 디버깅용으로만 로깅).
        const fallback = isKo
          ? '오류가 발생했습니다. 다시 시도해 주세요.'
          : 'An error occurred. Please try again.'
        setError(getCounselorErrorMessage(e, isKo ? 'ko' : 'en', fallback))
      }
    },
    haltOnUnmount: true,
    resultEndpoint: (turnId) =>
      `/api/compatibility/counselor/result?turnId=${encodeURIComponent(turnId)}`,
    applyRecovered: ({ userText, cleanContent, followUps }, recoverHelpers) => {
      if (!mountedRef.current) return false
      setMessages((prev) => {
        const updated = [...prev]
        // 마지막 assistant 메시지를 완성본으로 교체 + incomplete 해제.
        for (let idx = updated.length - 1; idx >= 0; idx--) {
          if (updated[idx].role === 'assistant') {
            updated[idx] = { ...updated[idx], content: cleanContent, incomplete: false }
            break
          }
        }
        return updated
      })
      // 후속질문 칩 — 정상 경로와 동일하게 generic 필터 + 부족분 폴백.
      recoverHelpers.setFollowUpQuestions(
        mergeCounselorFollowUps({
          aiFollowUps: followUps,
          userText,
          assistantContent: cleanContent,
          lang,
        })
      )
      // 복원 답안도 정상 경로와 동일하게 past-chats 사이드바에 저장.
      const body: Record<string, unknown> = {
        sessionId: chatSessionId,
        locale: lang,
        userMessage: userText,
        assistantMessage: cleanContent,
        type: 'compat',
      }
      apiFetch('/api/counselor/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { success?: boolean; session?: { id: string } } | null) => {
          if (!mountedRef.current) return
          if (d?.success && d.session?.id && !chatSessionId) {
            setChatSessionId(d.session.id)
          }
        })
        .catch((err) =>
          logger.warn('[CompatCounselor] recover chat-history save failed', { error: err })
        )
      setError(null)
    },
    // 마운트 복원 — 마지막이 미완성(또는 빈) assistant 일 때만 살린다.
    isRecoverableLastMessage: (last) =>
      last.role === 'assistant' && (!!last.incomplete || !last.content),
    // "다시 시도"는 잘린 쌍을 pop 한 정리된 히스토리를 historyOverride 로 명시.
    retryUsesHistoryOverride: true,
    // 게스트(서버 저장 전) 진행 채팅을 localStorage 드래프트로 보존 — 한도→
    // 로그인/구매 왕복 후 마운트에서 복원하기 위함. 서버 세션이 생기면
    // (chatSessionId) 서버가 정본이므로 드래프트를 지운다.
    draft: {
      suspended: isInitializing,
      hasServerSession: !!chatSessionId,
      build: (msgs) =>
        persons.length >= 2 && msgs.length > 0
          ? {
              persons,
              person1Saju,
              person2Saju,
              person1Astro,
              person2Astro,
              messages: msgs,
              chatTitle,
            }
          : null,
      deps: [persons, person1Saju, person2Saju, person1Astro, person2Astro, chatTitle],
    },
  })
}
