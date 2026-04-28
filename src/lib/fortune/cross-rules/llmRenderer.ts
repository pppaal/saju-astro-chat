// LLM renderer: turns FortuneReport into a polished Korean prose reading.
//
// Design:
// - System prompt is the same on every call → prompt-cached.
// - User message contains only the per-call structured data (the report).
// - Renderer is constrained: no new facts, must cite evidence, must not
//   invent rule outcomes. We pass narratives in so it just rephrases.
// - Falls back to the deterministic renderer when no API key.

import type { FortuneReport } from './types'
import { renderToText } from './renderer'

const SYSTEM_PROMPT = `당신은 사주·점성을 함께 보는 운세 해석가입니다.
입력으로 받은 운세 리포트는 결정론적 룰 엔진의 출력입니다.
당신의 역할은 그 결과를 자연스러운 한국어 문단으로 다듬는 것입니다.

규칙:
1. 리포트에 적힌 룰 결과·증거 외의 새로운 사실을 만들지 마세요.
2. 각 룰의 narrative 문장을 베이스로 풀어 쓰되, 반복·나열을 피해 자연스러운 흐름으로.
3. 양면성(conflict)은 절대 누락하지 말고 명시적으로 양쪽 측면을 함께 언급.
4. 도메인별 한 문단(3~5문장). 그 외 통합 테마는 별도 문단.
5. 단정·과장 금지. "할 수 있다", "주의가 필요하다" 같은 톤.
6. evidence는 인라인으로 짧게만 인용 (예: "세운 정재와 Solar Return 2궁 Jupiter").

출력 형식 (정확히 따르세요):
## 통합 테마
(통합 테마 문단. 없으면 "특별한 통합 테마는 없습니다." 한 줄.)

## 자아
(문단)

## 사랑
(문단)

## 재물
(문단)

## 직업
(문단)

## 건강
(문단)

## 가정
(문단)`.trim()

export interface LlmRenderOptions {
  apiKey?: string // overrides env
  model?: string // default from env or claude-sonnet-4-6
  maxTokens?: number
  timeoutMs?: number
}

const DEFAULT_MODEL = 'claude-sonnet-4-6'
const DEFAULT_TIMEOUT_MS = 60_000
const DEFAULT_MAX_TOKENS = 1500

interface AnthropicTextBlock {
  type: 'text'
  text: string
}

interface AnthropicResponse {
  content: Array<AnthropicTextBlock | { type: string }>
  model: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_creation_input_tokens?: number
    cache_read_input_tokens?: number
  }
}

export async function renderWithLlm(
  report: FortuneReport,
  options: LlmRenderOptions = {},
): Promise<{ text: string; usedLlm: boolean; model?: string; usage?: AnthropicResponse['usage'] }> {
  const apiKey =
    options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY

  // No key → deterministic fallback so the pipeline always returns text.
  if (!apiKey) {
    return { text: renderToText(report), usedLlm: false }
  }

  const model = options.model ?? process.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  // The user message carries the per-call structured data only — the system
  // prompt is identical across calls so it can be cached server-side.
  const userPayload = {
    themes: report.themes.map((t) => ({
      meaning: t.rule.meaning,
      narrative: t.rule.narrative,
    })),
    domains: Object.values(report.byDomain).map((agg) => ({
      domain: agg.domain,
      tone: agg.tone,
      confirms: agg.confirms.map((m) => ({
        meaning: m.rule.meaning,
        intensity: m.intensity,
        narrative: m.rule.narrative.confirm,
        evidence: { saju: m.saju.evidence, astro: m.astro.evidence },
      })),
      conflicts: agg.conflicts.map((m) => ({
        meaning: m.rule.meaning,
        intensity: m.intensity,
        narrative: m.rule.narrative.conflict ?? m.rule.narrative.confirm,
        evidence: { saju: m.saju.evidence, astro: m.astro.evidence },
      })),
    })),
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        // Prompt caching: identical system prompt across calls is cached.
        system: [
          {
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `리포트 (JSON):\n${JSON.stringify(userPayload, null, 2)}`,
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      throw new Error(`Anthropic API ${res.status}: ${await res.text()}`)
    }

    const data = (await res.json()) as AnthropicResponse
    const text = data.content
      .filter((b): b is AnthropicTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim()

    if (!text) {
      return { text: renderToText(report), usedLlm: false, model }
    }
    return { text, usedLlm: true, model: data.model, usage: data.usage }
  } catch {
    // Any failure falls back deterministically — never fail the pipeline.
    return { text: renderToText(report), usedLlm: false }
  } finally {
    clearTimeout(timeout)
  }
}
