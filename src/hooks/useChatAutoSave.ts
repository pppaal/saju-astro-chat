'use client'

/**
 * useChatAutoSave — 채팅 세션 자동 저장 단일 출처.
 *
 * 이전 회귀: destiny Chat 에만 debounce + beforeunload sendBeacon 보유.
 * compat/followup 은 send 직후 한 번만 POST 라 답변 직후 페이지 닫으면
 * 마지막 메시지 손실 가능.
 *
 * 통합 정책:
 *  - messages 변화 → debounce 후 fetch save.
 *  - beforeunload 시 sendBeacon 으로 마지막 미저장 payload flush.
 *  - 빈 messages 또는 sessionLoaded=false 면 no-op.
 *  - role='system' 메시지는 저장 페이로드에서 자동 제외 (LLM 컨텍스트
 *    용이지 영구 보관 대상 X).
 *
 * 사용 예 (destiny):
 *   useChatAutoSave({
 *     enabled: sessionLoaded,
 *     sessionId,
 *     locale: lang,
 *     messages,
 *     endpoint: '/api/counselor/session/save',
 *   })
 */

import { useEffect, useRef, type RefObject } from 'react'
import { logger } from '@/lib/logger'
import type { ChatTurn } from '@/types/chat'

const DEFAULT_DEBOUNCE_MS = 2000

export interface UseChatAutoSaveOptions {
  /** 저장 활성화 (sessionLoaded 등 조건). false 면 no-op. */
  enabled: boolean
  /** 서버에서 부여한 세션 id — string 또는 RefObject<string>. ref 로 주면
   *  새 세션 시작 시 동기적으로 반영됨 (destiny 패턴). */
  sessionId: string | RefObject<string>
  /** 로케일 (보통 'ko' | 'en'). */
  locale: string
  /** 저장할 메시지 배열. role='system' 은 자동 제외. */
  messages: ChatTurn[]
  /** 저장 endpoint. 기본 destiny/compat counselor 라우트. */
  endpoint?: string
  /** debounce 지연 (기본 2000ms). */
  debounceMs?: number
  /** 추가 payload (커플 컨텍스트 등) — JSON 에 같이 직렬화. */
  extra?: Record<string, unknown>
}

function resolveSessionId(s: string | RefObject<string>): string {
  return typeof s === 'string' ? s : s.current
}

export function useChatAutoSave(options: UseChatAutoSaveOptions): void {
  const {
    enabled,
    sessionId,
    locale,
    messages,
    endpoint = '/api/counselor/session/save',
    debounceMs = DEFAULT_DEBOUNCE_MS,
    extra,
  } = options

  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestPayloadRef = useRef<string | null>(null)

  // debounce 저장
  useEffect(() => {
    if (!enabled || messages.length === 0) return

    const visibleMessages = messages.filter((m) => m.role !== 'system')
    if (visibleMessages.length === 0) return

    const payload = JSON.stringify({
      sessionId: resolveSessionId(sessionId),
      locale: locale || 'ko',
      messages: visibleMessages,
      ...(extra || {}),
    })
    latestPayloadRef.current = payload

    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)

    pendingTimerRef.current = setTimeout(async () => {
      pendingTimerRef.current = null
      latestPayloadRef.current = null
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        })
        logger.debug('[useChatAutoSave] saved', { count: visibleMessages.length })
      } catch (err) {
        logger.warn('[useChatAutoSave] save failed', { err })
      }
    }, debounceMs)

    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    }
  }, [enabled, messages, sessionId, locale, endpoint, debounceMs, extra])

  // beforeunload: 마지막 미저장 payload 를 sendBeacon 으로 flush — 사용자가
  // 답변 직후 탭 닫아도 마지막 메시지 보존.
  useEffect(() => {
    if (!enabled) return
    const handler = () => {
      const payload = latestPayloadRef.current
      if (payload && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, payload)
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [enabled, endpoint])
}
