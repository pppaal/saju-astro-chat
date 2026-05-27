// src/components/destiny-map/chat-utils.ts
// Utility functions extracted from Chat component

import type { ConnectionStatus } from './chat-constants'
import { CHAT_LIMITS } from './chat-constants'
import type { LangKey, Copy } from './chat-i18n'

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
  return `${prefix}-${Date.now()}`
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
 * Get localized error message based on error type
 */
export function getErrorMessage(error: Error, lang: LangKey, tr: Copy): string {
  const message = error.message || ''

  if (message.includes('GUEST_LIMIT_REACHED')) {
    return lang === 'ko'
      ? '무료 체험 2회를 모두 사용했어요. 로그인하면 가입 보너스 4 크레딧으로 계속 이용할 수 있어요.'
      : 'You have used both free guest turns. Sign in to claim your 4-credit signup bonus and continue.'
  }

  if (
    message.includes('API_ERROR:401') ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('authentication required')
  ) {
    // "만료" 라고 단정하면 한 번도 로그인 안 한 비회원에게 어색함. 회원가입
    // 인센티브(무료 크레딧)도 같이 안내해서 비회원이 다음 행동을 알게 함.
    return lang === 'ko'
      ? '운명상담사 이용에는 로그인이 필요해요. 회원가입 시 무료 크레딧 2개로 시작할 수 있어요.'
      : 'Sign-in required to use the counselor. New accounts get 2 free credits to start.'
  }

  if (message.includes('API_ERROR:403') || message.toLowerCase().includes('csrf')) {
    return lang === 'ko'
      ? '보안 검증에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
      : 'Security validation failed. Refresh the page and try again.'
  }
  if (message.includes('INSUFFICIENT_CREDITS') || message.includes('API_ERROR:402')) {
    return lang === 'ko'
      ? '크레딧이 부족합니다. 충전 후 다시 시도해 주세요.'
      : 'Insufficient credits. Please recharge and try again.'
  }

  if (message.includes('timeout') || message.includes('connection')) {
    return lang === 'ko'
      ? '연결이 원활하지 않습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.'
      : 'Connection issue detected. Please check your internet and try again.'
  }

  if (message.includes('429') || message.includes('rate limit')) {
    return lang === 'ko'
      ? '요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해 주세요.'
      : 'Please try again in a moment. (Rate limit)'
  }

  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return lang === 'ko'
      ? '상담 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.'
      : 'Temporary server issue. Please try again shortly.'
  }

  if (message.includes('API_ERROR:')) {
    return lang === 'ko'
      ? '상담 서버 응답에 문제가 있습니다. 잠시 후 다시 시도해 주세요.'
      : 'The counselor server returned an error. Please try again shortly.'
  }

  return tr.error
}
