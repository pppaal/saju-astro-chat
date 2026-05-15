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
  const { cachedContext, dynamicTail } = assembleFinalPromptSplit(params)
  // 단일 string 형식: cached + dynamic을 한 번에 이어 붙임 (호환).
  return [cachedContext, dynamicTail].filter(Boolean).join('\n\n')
}

/**
 * Split version — Anthropic prompt caching용 두 블록으로 분할.
 *
 * - `cachedContext`: 멀티턴에 걸쳐 안정적인 부분
 *   (system 프롬프트, base/memory 컨텍스트, sorted sections).
 *   호출처에서 user 메시지 cached block (cache_control: ephemeral)에 넣음.
 *
 * - `dynamicTail`: 매 턴 바뀌는 부분 (대화 히스토리 + 새 질문).
 *
 * 두 string을 그냥 이어붙이면 `assembleFinalPrompt`와 동일한 출력.
 */
export function assembleFinalPromptSplit(params: {
  systemPrompt: string
  baseContext: string
  memoryContext: string
  sections: PromptSection[]
  messages: ChatMessage[]
  userQuestion: string
}): { cachedContext: string; dynamicTail: string } {
  const { systemPrompt, baseContext, memoryContext, sections, messages, userQuestion } = params

  const sortedSections = sections
    .filter((s) => s.content && s.content.trim().length > 0)
    .sort((a, b) => b.priority - a.priority)

  const cachedParts: string[] = []
  if (systemPrompt) cachedParts.push(systemPrompt)
  if (baseContext) cachedParts.push(baseContext)
  if (memoryContext) cachedParts.push(memoryContext)
  for (const section of sortedSections) {
    cachedParts.push(section.content)
  }

  const dynamicParts: string[] = []
  const formattedHistory = formatMessages(messages)
  if (formattedHistory) {
    dynamicParts.push('\n--- Conversation History ---')
    dynamicParts.push(formattedHistory)
  }
  if (userQuestion) {
    // Strict reminder sitting *right against* the user question so it
    // gets max attention from the model. The system prompt bans these
    // patterns but the data block above is full of emoji headers
    // (📌 ⚠️ 📊 🌟 ☀️ 🌙 …) and the LLM tends to mirror that shape
    // into its reply. Repeating the rule here keeps it salient.
    dynamicParts.push(
      '\n--- Output reminder ---\n' +
        'Answer in ONE flowing paragraph. No headings of any kind ' +
        '(##, **bold**, "🎯 X", "💫 X", 【X】, →, ▶, ●). No section labels. ' +
        'No bullet lists. Plain conversational prose, like a text reply.'
    )
    dynamicParts.push('\n--- User Question ---')
    dynamicParts.push(userQuestion)
  }

  return {
    cachedContext: cachedParts.filter(Boolean).join('\n\n'),
    dynamicTail: dynamicParts.filter(Boolean).join('\n\n'),
  }
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
