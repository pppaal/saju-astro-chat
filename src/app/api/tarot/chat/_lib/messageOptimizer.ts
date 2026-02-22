import type { ChatMessage } from '@/lib/api'

const DEFAULT_MAX_MESSAGES = 8
const DEFAULT_MAX_USER_LENGTH = 1400
const DEFAULT_MAX_ASSISTANT_LENGTH = 700

function truncateWithHeadTail(text: string, maxLength: number, head = 0.7): string {
  if (text.length <= maxLength) return text
  const headLength = Math.max(120, Math.floor(maxLength * head))
  const tailLength = Math.max(80, maxLength - headLength - 5)
  const first = text.slice(0, headLength).trim()
  const last = text.slice(-tailLength).trim()
  return `${first} ... ${last}`.slice(0, maxLength)
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？\n])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function summarizeLongUserQuestion(
  content: string,
  language: 'ko' | 'en',
  maxLength = DEFAULT_MAX_USER_LENGTH
): string {
  if (!content || content.length <= maxLength) {
    return content
  }

  const sentences = splitSentences(content)
  if (sentences.length < 4) {
    return truncateWithHeadTail(content, maxLength, 0.72)
  }

  const firstPart = sentences.slice(0, 3)
  const lastPart = sentences.slice(-3)
  const merged = [...firstPart, ...lastPart].join(' ')
  const prefix =
    language === 'ko'
      ? '긴 질문 요약(핵심 앞/뒤 문장 유지): '
      : 'Long question summary (key start/end points): '

  return truncateWithHeadTail(`${prefix}${merged}`, maxLength, 0.8)
}

function compressAssistantMessage(content: string, maxLength = DEFAULT_MAX_ASSISTANT_LENGTH): string {
  return truncateWithHeadTail(content, maxLength, 0.68)
}

export function optimizeTarotMessagesForBackend(
  messages: ChatMessage[],
  language: 'ko' | 'en',
  options?: {
    maxMessages?: number
    maxUserLength?: number
    maxAssistantLength?: number
  }
): ChatMessage[] {
  const maxMessages = options?.maxMessages ?? DEFAULT_MAX_MESSAGES
  const maxUserLength = options?.maxUserLength ?? DEFAULT_MAX_USER_LENGTH
  const maxAssistantLength = options?.maxAssistantLength ?? DEFAULT_MAX_ASSISTANT_LENGTH

  if (!Array.isArray(messages) || messages.length === 0) {
    return []
  }

  const recent = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-maxMessages)

  const optimized: ChatMessage[] = []
  for (const m of recent) {
    const content = (m.content || '').trim()
    if (!content) continue

    if (m.role === 'user') {
      optimized.push({
        role: 'user',
        content: summarizeLongUserQuestion(content, language, maxUserLength),
      })
      continue
    }

    optimized.push({
      role: 'assistant',
      content: compressAssistantMessage(content, maxAssistantLength),
    })
  }

  return optimized
}
