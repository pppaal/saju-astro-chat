/**
 * Python backend `/ask` 대체 — Claude 직접 호출.
 *
 * 옛 backend 응답 shape ({ data: { report, model, fusion_layer } })을 mimic해서
 * 기존 호출처가 최소한의 변경으로 작동하게.
 */

import { callClaude, isClaudeAvailable, DEFAULT_CLAUDE_MODEL } from '@/lib/llm/claude'
import { logger } from '@/lib/logger'

export interface AskClaudeOptions {
  theme?: string
  systemHint?: string
  maxTokens?: number
  timeoutMs?: number
  label?: string
}

export interface AskClaudeResponse {
  ok: boolean
  status: number
  data?: {
    data?: {
      report: string
      fusion_layer?: string
      model: string
    }
  }
  error?: string
}

/**
 * Python backend `/ask` 호출 시그니처를 mimic.
 *
 * Before:
 *   const response = await apiClient.post('/ask', { theme, prompt, saju, ... })
 *   if (response.ok && response.data) { ... }
 *
 * After:
 *   const response = await askClaude(prompt, { theme: 'saju' })
 *   if (response.ok && response.data) { ... }
 */
export async function askClaude(
  prompt: string,
  options: AskClaudeOptions = {}
): Promise<AskClaudeResponse> {
  if (!isClaudeAvailable()) {
    logger.warn('[askClaude] ANTHROPIC_API_KEY not set')
    return {
      ok: false,
      status: 503,
      error: 'AI service unavailable (no API key)',
    }
  }

  const {
    theme = 'general',
    systemHint,
    maxTokens = 3000,
    timeoutMs = 60000,
    label = `ask-${theme}`,
  } = options

  const systemPrompt =
    systemHint ||
    `당신은 사주명리·점성술 통합 분석 전문가입니다. 두 시스템의 cross 신호를 자연스럽게 묶어 깊이 있는 풀이를 제공하세요. 사주만 단독으로, 점성만 단독으로 풀지 마세요.`

  try {
    const result = await callClaude({
      systemPrompt,
      userPrompt: prompt,
      maxTokens,
      temperature: 0.7,
      timeoutMs,
      model: DEFAULT_CLAUDE_MODEL,
      label,
    })

    return {
      ok: true,
      status: 200,
      data: {
        data: {
          report: result.text,
          fusion_layer: 'claude_direct',
          model: DEFAULT_CLAUDE_MODEL,
        },
      },
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    logger.error('[askClaude] failed', { theme, error: errMsg })
    return {
      ok: false,
      status: 500,
      error: errMsg,
    }
  }
}
