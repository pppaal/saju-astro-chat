// src/components/destiny-map/chat-utils.ts
// Utility functions extracted from Chat component

import type { ConnectionStatus } from './chat-constants'
import { CHAT_LIMITS } from './chat-constants'
import type { LangKey, Copy } from './chat-i18n'

// Re-export StreamProcessor for stream handling
export { StreamProcessor, streamProcessor } from '@/lib/streaming'
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
 * Clean follow-up markers from streamed content
 * Handles: ||FOLLOWUP||[...], partial ||FO, ||FOLLOW, ||FOLLOWUP|, etc.
 */
export function cleanFollowupMarkers(text: string): string {
  return text
    .replace(/\|\|FOLLOWUP\|\|.*/s, '') // Full marker with content
    .replace(/\|\|F(?:O(?:L(?:L(?:O(?:W(?:U(?:P(?:\|(?:\|)?)?)?)?)?)?)?)?)?$/s, '') // Any partial state
    .replace(/\|$/s, '') // Single pipe at end
    .trim()
}

/**
 * Parse AI-generated follow-up questions from response
 * Returns [cleanContent, followUpQuestions]
 */
export function parseFollowUpQuestions(accumulated: string): {
  cleanContent: string
  followUps: string[]
} {
  const followUpMatch = accumulated.match(/\|\|FOLLOWUP\|\|\s*\[([^\]]+)\]/s)

  if (!followUpMatch) {
    return {
      cleanContent: cleanFollowupMarkers(accumulated),
      followUps: [],
    }
  }

  try {
    // Fix common AI mistakes: curly quotes -> straight quotes
    let jsonStr = '[' + followUpMatch[1] + ']'
    jsonStr = jsonStr
      .replace(/[""]/g, '"') // Fix curly double quotes
      .replace(/['']/g, "'") // Fix curly single quotes
      .replace(/,\s*]/g, ']') // Fix trailing comma

    const followUps = JSON.parse(jsonStr) as string[]
    const cleanContent = accumulated.replace(/\|\|FOLLOWUP\|\|\s*\[[^\]]+\]/s, '').trim()

    return { cleanContent, followUps }
  } catch {
    // If JSON parsing fails, just remove the marker
    return {
      cleanContent: accumulated.replace(/\|\|FOLLOWUP\|\|.*/s, '').trim(),
      followUps: [],
    }
  }
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

  if (
    message.includes('API_ERROR:401') ||
    message.toLowerCase().includes('unauthorized') ||
    message.toLowerCase().includes('authentication required')
  ) {
    return lang === 'ko'
      ? '로그인 상태가 만료되었거나 인증이 필요합니다. 다시 로그인 후 시도해 주세요.'
      : 'Your session has expired or authentication is required. Please sign in again and try.'
  }

  if (message.includes('API_ERROR:403') || message.toLowerCase().includes('csrf')) {
    return lang === 'ko'
      ? '보안 검증에 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
      : 'Security validation failed. Refresh the page and try again.'
  }
  if (message.includes('INSUFFICIENT_CREDITS') || message.includes('API_ERROR:402')) {
    return lang === 'ko'
      ? 'í¬ë ˆë”§ì´ ë¶€ì¡±í•©ë‹ˆë‹¤. ì¶©ì „ í›„ ë‹¤ì‹œ ì‹œë„í•´ ì£¼ì„¸ìš”.'
      : 'Insufficient credits. Please recharge and try again.'
  }

  if (message.includes('timeout') || message.includes('connection')) {
    return lang === 'ko'
      ? 'ì—°ê²°ì´ ì›í™œí•˜ì§€ ì•ŠìŠµë‹ˆë‹¤. ì¸í„°ë„· ì—°ê²°ì„ í™•ì¸í•˜ê³  ë‹¤ì‹œ ì‹œë„í•´ ì£¼ì„¸ìš”.'
      : 'Connection issue detected. Please check your internet and try again.'
  }

  if (message.includes('429') || message.includes('rate limit')) {
    return lang === 'ko'
      ? 'ìš”ì²­ì´ ë§Žì•„ ìž ì‹œ ì œí•œë˜ì—ˆìŠµë‹ˆë‹¤. ìž ì‹œ í›„ ë‹¤ì‹œ ì‹œë„í•´ ì£¼ì„¸ìš”.'
      : 'Please try again in a moment. (Rate limit)'
  }

  if (message.includes('500') || message.includes('502') || message.includes('503')) {
    return lang === 'ko'
      ? 'ìƒë‹´ ì„œë²„ì— ì¼ì‹œì ì¸ ë¬¸ì œê°€ ìžˆìŠµë‹ˆë‹¤. ìž ì‹œ í›„ ë‹¤ì‹œ ì‹œë„í•´ ì£¼ì„¸ìš”.'
      : 'Temporary server issue. Please try again shortly.'
  }

  if (message.includes('API_ERROR:')) {
    return lang === 'ko'
      ? 'ìƒë‹´ ì„œë²„ ì‘ë‹µì— ë¬¸ì œê°€ ìžˆìŠµë‹ˆë‹¤. ìž ì‹œ í›„ ë‹¤ì‹œ ì‹œë„í•´ ì£¼ì„¸ìš”.'
      : 'The counselor server returned an error. Please try again shortly.'
  }

  return tr.error
}

/**
 * Build returning user context summary
 */
export function buildReturningSummary(
  persona: UserContext['persona'] | undefined,
  lang: LangKey
): string {
  if (!persona) {
    return ''
  }

  const lastTopics = persona.lastTopics?.slice(0, 2)?.join(', ')
  const tone = persona.emotionalTone
  const recurrence = persona.recurringIssues?.slice(0, 2)?.join(', ')

  const parts: string[] = []

  if (lastTopics) {
    parts.push(lang === 'ko' ? `ìµœê·¼ ì£¼ì œ: ${lastTopics}` : `Recent topics: ${lastTopics}`)
  }
  if (tone) {
    parts.push(lang === 'ko' ? `ê°ì • í†¤: ${tone}` : `Tone: ${tone}`)
  }
  if (recurrence) {
    parts.push(lang === 'ko' ? `ë°˜ë³µ ì´ìŠˆ: ${recurrence}` : `Recurring: ${recurrence}`)
  }

  return parts.join(' Â· ')
}

// Import UserContext type for the function above
type UserContext = {
  persona?: {
    sessionCount?: number
    lastTopics?: string[]
    emotionalTone?: string
    recurringIssues?: string[]
  }
}
