/**
 * Prompt Assembly
 */

import type { ChatMessage } from '../lib/types'

export interface PromptSection {
  name: string
  content: string
  priority: number
}

function formatMessages(messages: ChatMessage[]): string {
  if (messages.length === 0) {
    return ''
  }
  return messages.map((m) => `${m.role}: ${m.content}`).join('\n')
}

export function assembleFinalPrompt(params: {
  systemPrompt: string
  baseContext: string
  memoryContext: string
  sections: PromptSection[]
  messages: ChatMessage[]
  userQuestion: string
}): string {
  const { systemPrompt, baseContext, memoryContext, sections, messages, userQuestion } = params

  const sortedSections = sections
    .filter((s) => s.content && s.content.trim().length > 0)
    .sort((a, b) => b.priority - a.priority)

  const parts: string[] = []

  if (systemPrompt) parts.push(systemPrompt)
  if (baseContext) parts.push(baseContext)
  if (memoryContext) parts.push(memoryContext)

  for (const section of sortedSections) {
    parts.push(section.content)
  }

  const formattedHistory = formatMessages(messages)
  if (formattedHistory) {
    parts.push('\n--- Conversation History ---')
    parts.push(formattedHistory)
  }

  if (userQuestion) {
    parts.push('\n--- User Question ---')
    parts.push(userQuestion)
  }

  return parts.filter(Boolean).join('\n\n')
}

export const SECTION_PRIORITIES = {
  BASE_DATA: 100,
  TIMING: 90,
  DAILY_PRECISION: 85,
  DAEUN_TRANSIT: 80,
  TIER3_ASTRO: 75,
  TIER4_HARMONICS: 70,
  LIFE_PREDICTION: 65,
  PAST_ANALYSIS: 60,
  DATE_RECOMMENDATION: 55,
  WEEKLY: 50,
} as const
