/**
 * Shared Chat Utilities
 * Consolidates duplicate chat-related functions across the codebase
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

/**
 * Clamps messages array to a maximum length, keeping the most recent messages
 * Previously duplicated in 4+ chat route files
 */
export function clampMessages<T extends { role: string; content: string }>(
  messages: T[],
  maxMessages = 6
): T[] {
  if (messages.length <= maxMessages) {
    return messages
  }
  return messages.slice(-maxMessages)
}

/**
 * Guards text to a maximum length
 * Previously duplicated in 5+ files
 */
export function guardText(text: string, maxLength: number): string {
  if (!text) return ''
  return text.slice(0, maxLength)
}

/**
 * Masks sensitive fields in a payload for logging
 * Previously duplicated in 3+ API routes
 */
export function maskPayload(body: unknown): unknown {
  if (!body || typeof body !== 'object') {
    return body
  }

  const sensitiveFields = [
    'password',
    'token',
    'apiKey',
    'secret',
    'authorization',
    'credit_card',
    'ssn',
  ]

  const masked = { ...body } as Record<string, unknown>

  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
      masked[key] = '[MASKED]'
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskPayload(masked[key])
    }
  }

  return masked
}

/**
 * Extracts the last user message from a chat history
 */
export function getLastUserMessage(messages: ChatMessage[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i].content
    }
  }
  return undefined
}

/**
 * Filters out system messages from chat history
 */
export function filterSystemMessages<T extends { role: string }>(messages: T[]): T[] {
  return messages.filter((m) => m.role !== 'system')
}

/**
 * Truncates message content for preview/logging
 */
export function truncateForPreview(content: string, maxLength = 100): string {
  if (content.length <= maxLength) {
    return content
  }
  return content.slice(0, maxLength - 3) + '...'
}

/**
 * Builds a formatted chat context string from messages
 */
export function buildChatContext(
  messages: ChatMessage[],
  options: {
    maxMessages?: number
    includeTimestamps?: boolean
  } = {}
): string {
  const { maxMessages = 10, includeTimestamps = false } = options

  const clampedMessages = clampMessages(messages, maxMessages)

  return clampedMessages
    .map((msg) => {
      const prefix = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System'
      const timestamp = includeTimestamps && msg.timestamp ? ` [${new Date(msg.timestamp).toISOString()}]` : ''
      return `${prefix}${timestamp}: ${msg.content}`
    })
    .join('\n\n')
}

/**
 * Validates that a message array is not empty and has valid content
 */
export function validateMessages(messages: unknown): messages is ChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) {
    return false
  }

  return messages.every(
    (msg) =>
      msg &&
      typeof msg === 'object' &&
      'role' in msg &&
      'content' in msg &&
      typeof msg.content === 'string' &&
      msg.content.length > 0 &&
      ['user', 'assistant', 'system'].includes(msg.role)
  )
}
