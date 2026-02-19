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
    parts.push(lang === 'ko' ? `최근 주제: ${lastTopics}` : `Recent topics: ${lastTopics}`)
  }
  if (tone) {
    parts.push(lang === 'ko' ? `감정 톤: ${tone}` : `Tone: ${tone}`)
  }
  if (recurrence) {
    parts.push(lang === 'ko' ? `반복 이슈: ${recurrence}` : `Recurring: ${recurrence}`)
  }

  return parts.join(' · ')
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
