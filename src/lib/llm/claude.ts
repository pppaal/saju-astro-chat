/**
 * 공유 Claude (Anthropic) 클라이언트.
 *
 * - 우선순위: Claude → (GPT fallback은 호출처에서 결정)
 * - 프롬프트 캐싱: system 블록에 cache_control 마킹 (90% 입력 토큰 할인)
 * - 모델: 기본 Haiku 4.5 (premium은 호출 시 model 옵션으로 격상)
 */

import { fetchWithRetry } from '@/lib/http'
import { logger } from '@/lib/logger'
import { recordCounter, recordExternalCall } from '@/lib/metrics/index'

// Claude pricing (per 1M tokens, USD) — Haiku 4.5 기준
// Sonnet 4.5: input $3 / output $15 / cache_read $0.30
// Haiku 4.5: input $1 / output $5 / cache_read $0.10
const CLAUDE_PRICING: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-haiku-4-5-20251001': { input: 1, output: 5, cacheRead: 0.1 },
  'claude-sonnet-4-5-20250929': { input: 3, output: 15, cacheRead: 0.3 },
  'claude-opus-4-7': { input: 15, output: 75, cacheRead: 1.5 },
}

function calculateUsdCost(
  model: string,
  input?: number,
  output?: number,
  cacheRead?: number
): number {
  const p = CLAUDE_PRICING[model] || CLAUDE_PRICING['claude-haiku-4-5-20251001']
  const i = (input || 0) * (p.input / 1_000_000)
  const o = (output || 0) * (p.output / 1_000_000)
  const c = (cacheRead || 0) * (p.cacheRead / 1_000_000)
  return i + o + c
}

export type ClaudeModel =
  | 'claude-haiku-4-5-20251001'
  | 'claude-sonnet-4-5-20250929'
  | 'claude-opus-4-7'

export const DEFAULT_CLAUDE_MODEL: ClaudeModel = 'claude-haiku-4-5-20251001'
export const PREMIUM_CLAUDE_MODEL: ClaudeModel = 'claude-sonnet-4-5-20250929'

export interface CallClaudeOptions {
  /** 정적인 시스템 프롬프트. 자동으로 cache_control: ephemeral 마킹됨. */
  systemPrompt: string
  /** 동적 사용자 프롬프트. */
  userPrompt: string
  /** 기본 1500. 큰 출력은 명시적으로 설정. */
  maxTokens?: number
  /** 기본 0.7. 분류 작업은 0.2-0.3, 창작은 0.7-0.8. */
  temperature?: number
  /** 기본 40000ms. */
  timeoutMs?: number
  /** 기본 Haiku 4.5. */
  model?: ClaudeModel
  /** 호출 식별용 (메트릭/로그 태그). */
  label?: string
}

export interface CallClaudeResult {
  text: string
  inputTokens?: number
  cacheReadTokens?: number
  cacheCreateTokens?: number
  outputTokens?: number
}

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

export function isClaudeAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export async function callClaude(opts: CallClaudeOptions): Promise<CallClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  const {
    systemPrompt,
    userPrompt,
    maxTokens = 1500,
    temperature = 0.7,
    timeoutMs = 40000,
    model = DEFAULT_CLAUDE_MODEL,
    label = 'claude',
  } = opts

  const response = await fetchWithRetry(
    ANTHROPIC_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userPrompt }],
      }),
    },
    {
      maxRetries: 1,
      initialDelayMs: 700,
      maxDelayMs: 4000,
      timeoutMs,
      retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504],
      onRetry: (attempt, error, delayMs) => {
        logger.warn(`[${label}] Claude retry scheduled`, {
          attempt,
          delayMs,
          reason: error.message,
        })
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Claude API error: ${response.status} ${errorText.slice(0, 280)}`)
  }

  const rawText = await response.text().catch(() => '')
  let data: {
    content?: Array<{ type: string; text?: string }>
    usage?: {
      input_tokens?: number
      output_tokens?: number
      cache_read_input_tokens?: number
      cache_creation_input_tokens?: number
    }
  } | null = null
  try {
    data = JSON.parse(rawText)
  } catch (err) {
    logger.warn(`[${label}] Claude JSON parse failed`, {
      error: err instanceof Error ? err.message : String(err),
      preview: rawText.slice(0, 280),
    })
    throw new Error('Claude response parse failed')
  }

  const text = data?.content?.find((c) => c.type === 'text')?.text || ''

  if (data?.usage) {
    const usage = data.usage
    logger.info(`[${label}] Claude usage`, {
      input: usage.input_tokens,
      output: usage.output_tokens,
      cacheRead: usage.cache_read_input_tokens,
      cacheCreate: usage.cache_creation_input_tokens,
      model,
    })
    // 비용 모니터링 — metric 카운터로 token + USD 추적.
    // Anthropic dashboard나 외부 모니터링이 polling/scrape 가능.
    const usd = calculateUsdCost(
      model,
      usage.input_tokens,
      usage.output_tokens,
      usage.cache_read_input_tokens
    )
    recordCounter('claude.tokens.input', usage.input_tokens || 0, { model: model, label })
    recordCounter('claude.tokens.output', usage.output_tokens || 0, { model: model, label })
    recordCounter('claude.tokens.cache_read', usage.cache_read_input_tokens || 0, {
      model: model,
      label,
    })
    recordCounter('claude.cost.usd_micro', Math.round(usd * 1_000_000), {
      model: model,
      label,
    })
    recordExternalCall('anthropic', model, 'success', 0, {
      input: usage.input_tokens,
      output: usage.output_tokens,
    })
    // 호출당 임계값 초과 시 alert (1 호출 $0.10 = 100,000 micro)
    if (usd > 0.1) {
      logger.warn(`[${label}] Claude high-cost call`, {
        model: model,
        usd: usd.toFixed(4),
        input: usage.input_tokens,
        output: usage.output_tokens,
      })
    }
  }

  return {
    text,
    inputTokens: data?.usage?.input_tokens,
    outputTokens: data?.usage?.output_tokens,
    cacheReadTokens: data?.usage?.cache_read_input_tokens,
    cacheCreateTokens: data?.usage?.cache_creation_input_tokens,
  }
}

/**
 * JSON 응답 보장형 호출. 응답에서 첫 번째 JSON 객체만 파싱해 반환.
 */
export async function callClaudeJson<T = unknown>(
  opts: CallClaudeOptions
): Promise<{ data: T | null; raw: string; usage: Omit<CallClaudeResult, 'text'> }> {
  const jsonInstruction =
    '\n\n반드시 단일 JSON 객체만 출력하세요. 마크다운 코드 펜스, 주석, 설명 텍스트 절대 금지. 응답은 { 로 시작해 } 로 끝나야 합니다.'
  const result = await callClaude({
    ...opts,
    systemPrompt: opts.systemPrompt + jsonInstruction,
  })

  const text = result.text.trim()
  // 코드 펜스가 들어왔을 경우 추출
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  let parsed: T | null = null
  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]) as T
    } catch {
      parsed = null
    }
  }

  return {
    data: parsed,
    raw: result.text,
    usage: {
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cacheReadTokens: result.cacheReadTokens,
      cacheCreateTokens: result.cacheCreateTokens,
    },
  }
}
