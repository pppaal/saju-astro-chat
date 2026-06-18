// src/components/destiny-map/chat-utils.ts
// Utility functions extracted from Chat component

import type { ConnectionStatus } from './chat-constants'
import { CHAT_LIMITS } from './chat-constants'
import type { LangKey, Copy } from './chat-i18n'
import { getErrorMessage as getErrorMessageShared } from '@/lib/counselor/errorMessage'

// Re-export streamProcessor for stream handling
export { streamProcessor } from '@/lib/streaming'
export type { StreamResult, StreamProcessorOptions } from '@/lib/streaming'

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(prefix: 'user' | 'assistant' | 'error'): string {
  // Date.now() 만으로는 같은 ms 안에 만들어진 같은 role 메시지(예: 빠른 연속
  // 전송, 타로 결과 + 후속 assistant 메시지)가 동일 id 로 충돌해 React key
  // 중복 + 복구 로직(useChatApi 가 id 로 assistant 버블을 patch)이 엉뚱한
  // 버블을 건드린다. generateSessionId 처럼 랜덤 suffix 를 붙여 유일성 보장.
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(16).slice(2)
  return `${prefix}-${Date.now()}-${rand}`
}

/**
 * Determine connection status based on response time
 */
export function getConnectionStatus(responseTimeMs: number): ConnectionStatus {
  if (responseTimeMs > CHAT_LIMITS.SLOW_CONNECTION_THRESHOLD) {
    return 'slow'
  }
  return 'online'
}

/**
 * Get localized error message based on error type.
 *
 * Thin adapter around the shared `@/lib/counselor/errorMessage` localizer —
 * lets existing destiny-map call sites keep passing the full `Copy` object
 * (we just pull `tr.error` as the generic fallback). 궁합상담사 imports the
 * shared function directly with its own fallback string.
 */
export function getErrorMessage(error: Error, lang: LangKey, tr: Copy): string {
  return getErrorMessageShared(error, lang, tr.error)
}
