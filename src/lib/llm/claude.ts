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
import { sanitizeForXmlTagBoundary } from '@/lib/llm/promptSafety'

// Claude pricing (per 1M tokens, USD) — Haiku 4.5 기준
// Sonnet 4.5: input $3 / output $15 / cache_read $0.30
// Haiku 4.5: input $1 / output $5 / cache_read $0.10
const CLAUDE_PRICING: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-haiku-4-5-20251001': { input: 1, output: 5, cacheRead: 0.1 },
  'claude-sonnet-4-5-20250929': { input: 3, output: 15, cacheRead: 0.3 },
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

export type ClaudeModel = 'claude-haiku-4-5-20251001' | 'claude-sonnet-4-5-20250929'

export const DEFAULT_CLAUDE_MODEL: ClaudeModel = 'claude-haiku-4-5-20251001'
export const PREMIUM_CLAUDE_MODEL: ClaudeModel = 'claude-sonnet-4-5-20250929'

export interface CallClaudeOptions {
  /** 정적인 시스템 프롬프트. 자동으로 cache_control: ephemeral 마킹됨. */
  systemPrompt: string
  /** 동적 사용자 프롬프트. */
  userPrompt: string
  /**
   * 큰 + 거의 정적인 user-side 컨텍스트 (예: 차트 데이터, signals, 대화 히스토리).
   * 별도 user content 블록으로 들어가며 cache_control: ephemeral 마킹.
   * Anthropic은 1024+ 토큰 블록만 캐싱하므로 큰 컨텍스트에만 사용.
   * 같은 유저의 여러 호출에 걸쳐 재사용되면 cache_read 단가 (90% 할인) 적용.
   */
  cachedUserContext?: string
  /**
   * 이전 대화 턴 (user/assistant 번갈아). 제공되면 진짜 multi-turn으로 전송.
   * 첫 user 턴에는 cachedUserContext가 cached block으로 prepend됨.
   * userPrompt는 *마지막* user 턴으로 자동 append.
   * Counselor 같은 대화형 엔드포인트에서 직전 답변을 assistant role로
   * 정확히 인식시키기 위해 사용.
   */
  priorTurns?: Array<{ role: 'user' | 'assistant'; content: string }>
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
  /**
   * Continuation 용 prefill — 지정 시 messages 끝에
   * `{role:'assistant', content: prefillAssistant}` 추가. LLM 이 그 텍스트
   * 부터 *이어서* 작성 (preamble 없이). max_tokens 잘림 → 자동 이어쓰기
   * 패턴에서 사용. streamClaudeWithContinuation 참고.
   */
  prefillAssistant?: string
  /**
   * 스트림 종료 시 stop_reason 등 메타 정보 콜백. continuation 판단용.
   * stopReason 값: 'end_turn' | 'max_tokens' | 'stop_sequence' | null
   */
  onStreamComplete?: (info: { stopReason: string | null }) => void
  /**
   * External AbortSignal — typically `req.signal` from the route handler.
   * When this aborts (client disconnects), we abort the upstream Anthropic
   * fetch and stop reading tokens. Without it the inner reader keeps
   * draining the open connection while Anthropic continues to bill output
   * tokens for a user who's already gone.
   */
  abortSignal?: AbortSignal
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

// Anthropic prompt-cache TTL extension (beta).
// Default ephemeral TTL is 5 minutes — too short for chat sessions where the
// user reads + thinks between turns. The beta header below + `ttl: '1h'` on
// each cache_control block extends the cache lifetime to 1 hour, so a
// typical multi-turn counselor session keeps re-hitting the cache instead
// of paying full input cost on every later turn.
const PROMPT_CACHE_BETA_HEADER = 'extended-cache-ttl-2025-04-11'
const CACHE_CONTROL_1H = { type: 'ephemeral' as const, ttl: '1h' as const }

type UserMessageContent =
  | string
  | Array<
      | { type: 'text'; text: string }
      | { type: 'text'; text: string; cache_control: { type: 'ephemeral'; ttl?: '5m' | '1h' } }
    >

type AnthropicMessage = { role: 'user' | 'assistant'; content: UserMessageContent }

/**
 * userPrompt + 선택적인 cachedUserContext를 Anthropic messages content 형식으로 변환.
 * cachedUserContext가 있으면 두 블록 (cached + dynamic), 없으면 단순 string.
 */
function buildUserMessageContent(
  userPrompt: string,
  cachedUserContext?: string
): UserMessageContent {
  if (!cachedUserContext || !cachedUserContext.trim()) {
    return userPrompt
  }
  return [
    {
      type: 'text',
      text: cachedUserContext,
      cache_control: CACHE_CONTROL_1H,
    },
    { type: 'text', text: userPrompt },
  ]
}

/**
 * priorTurns + userPrompt + cachedUserContext를 Anthropic messages 배열로.
 * - priorTurns가 비어있으면 기존처럼 단일 user 메시지 (snapshot + userPrompt).
 * - priorTurns가 있으면 진짜 multi-turn: 첫 user 턴에 snapshot이 cached
 *   block으로 prepend되고, 그 뒤로 alternation, 마지막에 userPrompt 추가.
 *   (assistant 답변을 LLM이 자기 발화로 정확히 인식하게 됨)
 */
function buildMessages(
  userPrompt: string,
  cachedUserContext?: string,
  priorTurns?: Array<{ role: 'user' | 'assistant'; content: string }>
): AnthropicMessage[] {
  if (!priorTurns || priorTurns.length === 0) {
    return [{ role: 'user', content: buildUserMessageContent(userPrompt, cachedUserContext) }]
  }
  // Defense-in-depth — every entry into this function gets priorTurns
  // content scrubbed of `<`/`>` so a stale route that forgot to call
  // sanitizePriorTurns still can't smuggle a tag-close into the prompt
  // window. Routes should also call sanitizePriorTurns at the boundary
  // (which additionally validates role and caps length). See promptSafety.ts.
  const messages: AnthropicMessage[] = []
  let snapshotAttached = false
  for (const turn of priorTurns) {
    const safeContent = sanitizeForXmlTagBoundary(turn.content)
    if (!snapshotAttached && turn.role === 'user' && cachedUserContext?.trim()) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: cachedUserContext, cache_control: CACHE_CONTROL_1H },
          { type: 'text', text: safeContent },
        ],
      })
      snapshotAttached = true
    } else {
      messages.push({ role: turn.role, content: safeContent })
    }
  }
  // Latest user question
  if (!snapshotAttached && cachedUserContext?.trim()) {
    // priorTurns에 user 턴이 없었으면 (희귀 케이스) 마지막 user에 붙임
    messages.push({
      role: 'user',
      content: buildUserMessageContent(userPrompt, cachedUserContext),
    })
  } else {
    messages.push({ role: 'user', content: userPrompt })
  }
  return messages
}

export async function callClaude(opts: CallClaudeOptions): Promise<CallClaudeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  const {
    systemPrompt,
    userPrompt,
    cachedUserContext,
    priorTurns,
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
        'anthropic-beta': PROMPT_CACHE_BETA_HEADER,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: CACHE_CONTROL_1H,
          },
        ],
        messages: buildMessages(userPrompt, cachedUserContext, priorTurns),
      }),
    },
    {
      maxRetries: 1,
      initialDelayMs: 700,
      maxDelayMs: 4000,
      timeoutMs,
      retryStatusCodes: [408, 409, 425, 429, 500, 502, 503, 504, 529],
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
    // cache hit ratio = cache_read / (cache_read + uncached input). 새 prefix
    // 첫 호출은 write 만 발생하므로 ratio=0; 같은 prefix 재방문이 일어나면
    // ratio 가 올라간다. 엔드포인트별 가시성 확보를 위해 매 호출 로깅.
    const cacheReadTokens = usage.cache_read_input_tokens || 0
    const cacheCreateTokens = usage.cache_creation_input_tokens || 0
    const uncachedInput = usage.input_tokens || 0
    const cacheable = cacheReadTokens + uncachedInput
    const cacheHitRatio = cacheable > 0 ? cacheReadTokens / cacheable : 0
    logger.info(`[${label}] Claude usage`, {
      input: uncachedInput,
      output: usage.output_tokens,
      cacheRead: cacheReadTokens,
      cacheCreate: cacheCreateTokens,
      cacheHitRatio: cacheHitRatio.toFixed(3),
      model,
    })
    recordCounter('claude.cache.hit_ratio_x1000', Math.round(cacheHitRatio * 1000), {
      model,
      label,
    })
    // 캐시될 만한 큰 호출인데 hit ratio 가 0 이면 prefix 가 매번 달라지는
    // (silent invalidator) 신호 — 경고로 surface.
    if (cacheable > 2000 && cacheHitRatio < 0.05 && cacheCreateTokens === 0) {
      logger.warn(`[${label}] Claude cache miss on large prefix`, {
        cacheable,
        cacheReadTokens,
        cacheCreateTokens,
        model,
      })
    }
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
 * Streaming Claude — SSE 형식 token-by-token 출력.
 * 사용처: counselor chat-stream (Python backend `/ask-stream` 대체).
 *
 * @returns ReadableStream<string> — 각 chunk가 token text
 */
export async function callClaudeStream(opts: CallClaudeOptions): Promise<ReadableStream<string>> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  const {
    systemPrompt,
    userPrompt,
    cachedUserContext,
    priorTurns,
    maxTokens = 2000,
    temperature = 0.7,
    timeoutMs = 60000,
    model = DEFAULT_CLAUDE_MODEL,
    label = 'claude-stream',
    prefillAssistant,
    onStreamComplete,
    abortSignal,
  } = opts

  const controller = new AbortController()
  // 옛 코드: setTimeout(..., timeoutMs) 가 stream 전체 시간을 제한 → 긴 답변
  // (Sonnet 4.5 + 2500 토큰 continuation 등) 도중 abort 됨. CHAT timeout 이
  // 처음 응답 헤더 받을 때까지 / 매 chunk 간 idle 만 제한하도록 분리.
  // initial header timeout: timeoutMs (응답 시작 안 하면 abort).
  // chunk-idle timeout: 같은 timeoutMs (마지막 chunk 후 idle 시 abort, chunk 마다 reset).
  let timer: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), timeoutMs)
  const resetIdleTimer = () => {
    clearTimeout(timer)
    timer = setTimeout(() => controller.abort(), timeoutMs)
  }
  // Forward the caller's abort (client disconnect) into the upstream fetch.
  // If the caller already aborted, abort synchronously before fetch starts.
  let onExternalAbort: (() => void) | null = null
  if (abortSignal) {
    if (abortSignal.aborted) {
      controller.abort()
    } else {
      onExternalAbort = () => controller.abort()
      abortSignal.addEventListener('abort', onExternalAbort, { once: true })
    }
  }

  // Build messages — 마지막에 prefillAssistant 가 있으면 assistant 턴 append
  // (Anthropic prefill 패턴 — LLM 이 그 텍스트 부터 이어서 작성).
  const messagesWithMaybePrefill = (() => {
    const ms = buildMessages(userPrompt, cachedUserContext, priorTurns) as Array<{
      role: 'user' | 'assistant'
      content: unknown
    }>
    if (prefillAssistant && prefillAssistant.length > 0) {
      ms.push({ role: 'assistant', content: prefillAssistant })
    }
    return ms
  })()

  let response: Response
  try {
    response = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-beta': PROMPT_CACHE_BETA_HEADER,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        stream: true,
        system: [{ type: 'text', text: systemPrompt, cache_control: CACHE_CONTROL_1H }],
        messages: messagesWithMaybePrefill,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(timer)
    if (onExternalAbort && abortSignal) {
      abortSignal.removeEventListener('abort', onExternalAbort)
    }
    throw err
  }

  if (!response.ok || !response.body) {
    clearTimeout(timer)
    if (onExternalAbort && abortSignal) {
      abortSignal.removeEventListener('abort', onExternalAbort)
    }
    const errText = await response.text().catch(() => '')
    throw new Error(`Claude stream error: ${response.status} ${errText.slice(0, 200)}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  return new ReadableStream<string>({
    async start(streamController) {
      let buffer = ''
      let inputTokens = 0
      let outputTokens = 0
      let cacheReadTokens = 0
      let cacheCreateTokens = 0
      let capturedStopReason: string | null = null
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          // 매 chunk 도착 시 idle timer reset — 긴 답변도 chunk 가 꾸준히 흐르면 abort 안 됨.
          resetIdleTimer()
          buffer += decoder.decode(value, { stream: true })
          // SSE format: each event is "data: {...}\n\n"
          let idx
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, idx)
            buffer = buffer.slice(idx + 2)
            const dataLine = block.split('\n').find((l) => l.startsWith('data: '))
            if (!dataLine) continue
            const json = dataLine.slice(6).trim()
            if (json === '[DONE]') continue
            try {
              type StreamUsage = {
                input_tokens?: number
                output_tokens?: number
                cache_read_input_tokens?: number
                cache_creation_input_tokens?: number
              }
              const event = JSON.parse(json) as {
                type?: string
                delta?: { text?: string; type?: string; stop_reason?: string }
                message?: { usage?: StreamUsage }
                usage?: StreamUsage
              }
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                const text = event.delta.text || ''
                if (text) streamController.enqueue(text)
              } else if (event.type === 'message_start' && event.message?.usage) {
                inputTokens = event.message.usage.input_tokens || 0
                cacheReadTokens = event.message.usage.cache_read_input_tokens || 0
                cacheCreateTokens = event.message.usage.cache_creation_input_tokens || 0
              } else if (event.type === 'message_delta') {
                if (event.usage) outputTokens = event.usage.output_tokens || 0
                // stop_reason 은 message_delta.delta.stop_reason 으로 옴.
                if (event.delta?.stop_reason) capturedStopReason = event.delta.stop_reason
              }
            } catch {
              // partial JSON — skip
            }
          }
        }
        // 비용 + 캐시 모니터링
        if (inputTokens || outputTokens || cacheReadTokens) {
          const cacheable = cacheReadTokens + inputTokens
          const cacheHitRatio = cacheable > 0 ? cacheReadTokens / cacheable : 0
          logger.info(`[${label}] Claude stream usage`, {
            input: inputTokens,
            output: outputTokens,
            cacheRead: cacheReadTokens,
            cacheCreate: cacheCreateTokens,
            cacheHitRatio: cacheHitRatio.toFixed(3),
            model,
          })
          recordCounter('claude.tokens.input', inputTokens, { model, label })
          recordCounter('claude.tokens.output', outputTokens, { model, label })
          recordCounter('claude.tokens.cache_read', cacheReadTokens, { model, label })
          recordCounter('claude.cache.hit_ratio_x1000', Math.round(cacheHitRatio * 1000), {
            model,
            label,
          })
          recordExternalCall('anthropic', model, 'success', 0, {
            input: inputTokens,
            output: outputTokens,
          })
          if (cacheable > 2000 && cacheHitRatio < 0.05 && cacheCreateTokens === 0) {
            logger.warn(`[${label}] Claude stream cache miss on large prefix`, {
              cacheable,
              cacheReadTokens,
              cacheCreateTokens,
              model,
            })
          }
        }
      } catch (err) {
        recordExternalCall('anthropic', model, 'error', 0, {})
        streamController.error(err)
      } finally {
        clearTimeout(timer)
        // Reader cleanup — 옛 코드는 throw 후 reader 가 lock 된 채 남아 HTTP
        // 연결이 풀에 안 돌아가고 Anthropic 빌링도 계속 됐다. cancel 로
        // upstream 끊고 reader 해제.
        try {
          await reader.cancel()
        } catch {
          /* 이미 닫혔거나 abort — 무시 */
        }
        if (onExternalAbort && abortSignal) {
          abortSignal.removeEventListener('abort', onExternalAbort)
        }
        // continuation 판단용 메타 콜백 — close 전에 호출 (consumer 가 다음
        // round 결정 가능). 콜백 에러는 절대 stream 깨지 않도록 swallow.
        try {
          onStreamComplete?.({ stopReason: capturedStopReason })
        } catch {
          /* never break the stream on callback error */
        }
        streamController.close()
      }
    },
  })
}

/**
 * JSON 응답 보장형 호출. 응답에서 첫 번째 JSON 객체만 파싱해 반환.
 */
async function callClaudeJson<T = unknown>(
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
