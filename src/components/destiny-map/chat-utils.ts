// src/components/destiny-map/chat-utils.ts
// Utility functions extracted from Chat component

import type { ConnectionStatus } from './chat-constants'
import { CHAT_LIMITS } from './chat-constants'
import type { LangKey, Copy } from './chat-i18n'
import { getErrorMessage as getErrorMessageShared } from '@/lib/counselor/errorMessage'

// Re-export streamProcessor for stream handling

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
