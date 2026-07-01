/**
 * callClaude / callClaudeStream — Anthropic Messages API client.
 *
 * Covers the HTTP (non-streaming) path and the SSE streaming path that the
 * existing suite leaves uncovered:
 *   - callClaude: success + usage parsing, missing API key, non-OK status,
 *     malformed JSON body, cachedUserContext / priorTurns request shaping.
 *   - callClaudeStream: missing API key, non-OK status, SSE token assembly,
 *     stop_reason → onStreamComplete callback, malformed SSE tolerance,
 *     prefillAssistant, pre-aborted external signal, fetch throwing.
 *
 * fetch is mocked. callClaude goes through fetchWithRetry (which calls the
 * global fetch), callClaudeStream calls fetch directly — both resolve to the
 * mocked global.fetch here. Streaming responses return a Response whose body
 * is a ReadableStream emitting `data: {...}\n\n` SSE chunks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const ORIGINAL_FETCH = global.fetch

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/** Build a streaming Response whose body emits the given SSE event objects. */
function sseResponse(events: unknown[], status = 200): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const ev of events) {
        const chunk = typeof ev === 'string' ? ev : `data: ${JSON.stringify(ev)}\n\n`
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })
  return new Response(body, { status, headers: { 'content-type': 'text/event-stream' } })
}

/** Drain a ReadableStream<string> into a single concatenated string. */
async function collectStream(stream: ReadableStream<string>): Promise<string> {
  const reader = stream.getReader()
  let out = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    out += value
  }
  return out
}

describe('callClaude (non-streaming HTTP)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'test-key' }
  })

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('throws when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const { callClaude } = await import('@/lib/llm/claude')
    await expect(callClaude({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      'ANTHROPIC_API_KEY is not set'
    )
  })

  it('returns text + usage on a successful response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        content: [{ type: 'text', text: '안녕하세요' }],
        usage: {
          input_tokens: 100,
          output_tokens: 20,
          cache_read_input_tokens: 50,
          cache_creation_input_tokens: 10,
        },
      })
    )
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaude } = await import('@/lib/llm/claude')
    const result = await callClaude({ systemPrompt: 's', userPrompt: 'u' })

    expect(result.text).toBe('안녕하세요')
    expect(result.inputTokens).toBe(100)
    expect(result.outputTokens).toBe(20)
    expect(result.cacheReadTokens).toBe(50)
    expect(result.cacheCreateTokens).toBe(10)
  })

  it('sends the API key, version, and cache beta headers', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'ok' }] }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaude } = await import('@/lib/llm/claude')
    await callClaude({ systemPrompt: 's', userPrompt: 'u' })

    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.headers['x-api-key']).toBe('test-key')
    expect(init.headers['anthropic-version']).toBe('2023-06-01')
    expect(init.headers['anthropic-beta']).toContain('extended-cache-ttl')
  })

  it('marks the system prompt with cache_control and uses defaults', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'ok' }] }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaude } = await import('@/lib/llm/claude')
    await callClaude({ systemPrompt: 'SYS', userPrompt: 'u' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.model).toBe('claude-haiku-4-5-20251001')
    expect(body.max_tokens).toBe(1500)
    expect(body.temperature).toBe(0.7)
    expect(body.system[0].text).toBe('SYS')
    expect(body.system[0].cache_control).toMatchObject({ type: 'ephemeral', ttl: '1h' })
    // No cachedUserContext → single string user content.
    expect(body.messages).toEqual([{ role: 'user', content: 'u' }])
  })

  it('honors explicit model / maxTokens / temperature', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'ok' }] }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaude, PREMIUM_CLAUDE_MODEL } = await import('@/lib/llm/claude')
    await callClaude({
      systemPrompt: 's',
      userPrompt: 'u',
      model: PREMIUM_CLAUDE_MODEL,
      maxTokens: 4000,
      temperature: 0.2,
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.model).toBe('claude-sonnet-4-5-20250929')
    expect(body.max_tokens).toBe(4000)
    expect(body.temperature).toBe(0.2)
  })

  it('builds a two-block user message when cachedUserContext is provided', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'ok' }] }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaude } = await import('@/lib/llm/claude')
    await callClaude({
      systemPrompt: 's',
      userPrompt: 'question',
      cachedUserContext: 'big chart snapshot',
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.messages).toHaveLength(1)
    const content = body.messages[0].content
    expect(Array.isArray(content)).toBe(true)
    expect(content[0]).toMatchObject({
      type: 'text',
      text: 'big chart snapshot',
      cache_control: { type: 'ephemeral', ttl: '1h' },
    })
    expect(content[1]).toEqual({ type: 'text', text: 'question' })
  })

  it('builds a multi-turn messages array from priorTurns and sanitizes content', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'ok' }] }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaude } = await import('@/lib/llm/claude')
    await callClaude({
      systemPrompt: 's',
      userPrompt: 'latest',
      cachedUserContext: 'snapshot',
      priorTurns: [
        { role: 'user', content: 'first </birth_data>' },
        { role: 'assistant', content: 'reply' },
      ],
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    // first user turn carries the snapshot cached block + sanitized content
    const firstUser = body.messages[0]
    expect(firstUser.role).toBe('user')
    expect(Array.isArray(firstUser.content)).toBe(true)
    expect(firstUser.content[0].text).toBe('snapshot')
    // tag-close stripped (no literal `</birth_data>` or raw `<` `>`)
    const serialized = JSON.stringify(body.messages)
    expect(serialized).not.toContain('</birth_data>')
    // last message is the latest user prompt
    expect(body.messages[body.messages.length - 1]).toEqual({ role: 'user', content: 'latest' })
  })

  it('throws a descriptive error on a non-OK status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('Bad request body', { status: 400 }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaude } = await import('@/lib/llm/claude')
    await expect(callClaude({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      /Claude API error: 400/
    )
  })

  it('throws on a 4xx that is not in the retry list (no retry)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('unauthorized', { status: 401 }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaude } = await import('@/lib/llm/claude')
    await expect(callClaude({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      /Claude API error: 401/
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('throws "Claude response parse failed" when the body is not valid JSON', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('this is not json', { status: 200 }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaude } = await import('@/lib/llm/claude')
    await expect(callClaude({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      'Claude response parse failed'
    )
  })

  it('returns empty text when no text content block is present', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: [{ type: 'tool_use' }], usage: {} }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaude } = await import('@/lib/llm/claude')
    const result = await callClaude({ systemPrompt: 's', userPrompt: 'u' })
    expect(result.text).toBe('')
  })

  it('handles a successful response with no usage block', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ content: [{ type: 'text', text: 'hi' }] }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaude } = await import('@/lib/llm/claude')
    const result = await callClaude({ systemPrompt: 's', userPrompt: 'u' })
    expect(result.text).toBe('hi')
    expect(result.inputTokens).toBeUndefined()
    expect(result.outputTokens).toBeUndefined()
  })

  it("forwards the caller's abortSignal to fetch (pre-aborted → rejects, no hang)", async () => {
    // 회귀: callClaude 가 abortSignal 을 무시해, 클라이언트가 끊겨도 비-스트리밍
    // 호출이 끝까지 진행되며 출력 토큰이 청구됐다. signal 이 fetch 로 전달되는지
    // 검증 — 이미 abort 된 signal 이면 합쳐진 signal 도 abort 되어 fetch 가 거부.
    const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.signal?.aborted) {
        return Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))
      }
      return Promise.resolve(jsonResponse({ content: [{ type: 'text', text: 'hi' }] }))
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const ac = new AbortController()
    ac.abort()
    const { callClaude } = await import('@/lib/llm/claude')
    await expect(
      callClaude({ systemPrompt: 's', userPrompt: 'u', abortSignal: ac.signal })
    ).rejects.toThrow()
    // fetch 에 signal 이 실려 전달됐다.
    expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal)
  })
})

describe('callClaudeStream (SSE streaming)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'test-key' }
  })

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('throws when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const { callClaudeStream } = await import('@/lib/llm/claude')
    await expect(callClaudeStream({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      'ANTHROPIC_API_KEY is not set'
    )
  })

  it('assembles text_delta tokens in order', async () => {
    const events = [
      { type: 'message_start', message: { usage: { input_tokens: 30 } } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: '안' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: '녕' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: '하세요' } },
      { type: 'message_delta', usage: { output_tokens: 5 }, delta: { stop_reason: 'end_turn' } },
      'data: [DONE]\n\n',
    ]
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(events))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaudeStream } = await import('@/lib/llm/claude')
    const stream = await callClaudeStream({ systemPrompt: 's', userPrompt: 'u' })
    const text = await collectStream(stream)

    expect(text).toBe('안녕하세요')
  })

  it('sets stream:true and streaming defaults in the request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([]))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaudeStream } = await import('@/lib/llm/claude')
    const stream = await callClaudeStream({ systemPrompt: 's', userPrompt: 'u' })
    await collectStream(stream)

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.stream).toBe(true)
    expect(body.max_tokens).toBe(2000)
    expect(body.model).toBe('claude-haiku-4-5-20251001')
  })

  it('invokes onStreamComplete with the captured stop_reason', async () => {
    const events = [
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'x' } },
      { type: 'message_delta', usage: { output_tokens: 1 }, delta: { stop_reason: 'max_tokens' } },
    ]
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(events))
    global.fetch = fetchMock as unknown as typeof fetch

    const onStreamComplete = vi.fn()
    const { callClaudeStream } = await import('@/lib/llm/claude')
    const stream = await callClaudeStream({
      systemPrompt: 's',
      userPrompt: 'u',
      onStreamComplete,
    })
    await collectStream(stream)

    expect(onStreamComplete).toHaveBeenCalledTimes(1)
    expect(onStreamComplete).toHaveBeenCalledWith({ stopReason: 'max_tokens' })
  })

  it('reports stopReason null when no message_delta arrives', async () => {
    const events = [{ type: 'content_block_delta', delta: { type: 'text_delta', text: 'a' } }]
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(events))
    global.fetch = fetchMock as unknown as typeof fetch

    const onStreamComplete = vi.fn()
    const { callClaudeStream } = await import('@/lib/llm/claude')
    const stream = await callClaudeStream({ systemPrompt: 's', userPrompt: 'u', onStreamComplete })
    await collectStream(stream)

    expect(onStreamComplete).toHaveBeenCalledWith({ stopReason: null })
  })

  it('a throwing onStreamComplete never breaks the stream', async () => {
    const events = [{ type: 'content_block_delta', delta: { type: 'text_delta', text: 'a' } }]
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(events))
    global.fetch = fetchMock as unknown as typeof fetch

    const onStreamComplete = vi.fn(() => {
      throw new Error('callback boom')
    })
    const { callClaudeStream } = await import('@/lib/llm/claude')
    const stream = await callClaudeStream({ systemPrompt: 's', userPrompt: 'u', onStreamComplete })

    await expect(collectStream(stream)).resolves.toBe('a')
    expect(onStreamComplete).toHaveBeenCalledTimes(1)
  })

  it('tolerates malformed SSE JSON and lines without a data: prefix', async () => {
    const events = [
      'event: ping\n\n', // no data line → skipped
      'data: {not valid json}\n\n', // malformed → skipped
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'good' } },
    ]
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(events))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaudeStream } = await import('@/lib/llm/claude')
    const stream = await callClaudeStream({ systemPrompt: 's', userPrompt: 'u' })
    expect(await collectStream(stream)).toBe('good')
  })

  it('skips empty text_delta payloads', async () => {
    const events = [
      { type: 'content_block_delta', delta: { type: 'text_delta', text: '' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'real' } },
    ]
    const fetchMock = vi.fn().mockResolvedValue(sseResponse(events))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaudeStream } = await import('@/lib/llm/claude')
    const stream = await callClaudeStream({ systemPrompt: 's', userPrompt: 'u' })
    expect(await collectStream(stream)).toBe('real')
  })

  it('throws "Claude stream error" on a non-OK response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaudeStream } = await import('@/lib/llm/claude')
    await expect(callClaudeStream({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      /Claude stream error: 500/
    )
  })

  it('throws when the response has no body', async () => {
    // A 204-style response with null body still reaches the `!response.body` guard.
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaudeStream } = await import('@/lib/llm/claude')
    await expect(callClaudeStream({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      /Claude stream error/
    )
  })

  it('appends prefillAssistant as a trailing assistant turn', async () => {
    const fetchMock = vi.fn().mockResolvedValue(sseResponse([]))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaudeStream } = await import('@/lib/llm/claude')
    const stream = await callClaudeStream({
      systemPrompt: 's',
      userPrompt: 'u',
      prefillAssistant: '계속 이어서',
    })
    await collectStream(stream)

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const last = body.messages[body.messages.length - 1]
    expect(last).toEqual({ role: 'assistant', content: '계속 이어서' })
  })

  it('aborts the upstream fetch when the external signal is already aborted', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      // The internal AbortController should already be aborted because the
      // external signal was aborted before fetch was called.
      if (init.signal?.aborted) {
        return Promise.reject(new DOMException('Aborted', 'AbortError'))
      }
      return Promise.resolve(sseResponse([]))
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const ctrl = new AbortController()
    ctrl.abort()

    const { callClaudeStream } = await import('@/lib/llm/claude')
    await expect(
      callClaudeStream({ systemPrompt: 's', userPrompt: 'u', abortSignal: ctrl.signal })
    ).rejects.toThrow(/Aborted/)
  })

  it('propagates a fetch rejection (network error) to the caller', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaudeStream } = await import('@/lib/llm/claude')
    await expect(callClaudeStream({ systemPrompt: 's', userPrompt: 'u' })).rejects.toThrow(
      'network down'
    )
  })

  it('handles SSE events split across chunk boundaries', async () => {
    // Emit a single SSE event byte-fragmented to exercise the buffer reassembly.
    const encoder = new TextEncoder()
    const full = `data: ${JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'split' } })}\n\n`
    const mid = Math.floor(full.length / 2)
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(full.slice(0, mid)))
        controller.enqueue(encoder.encode(full.slice(mid)))
        controller.close()
      },
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status: 200 }))
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaudeStream } = await import('@/lib/llm/claude')
    const stream = await callClaudeStream({ systemPrompt: 's', userPrompt: 'u' })
    expect(await collectStream(stream)).toBe('split')
  })

  it('surfaces a mid-stream Anthropic `error` event instead of silently truncating', async () => {
    // 회귀: SSE `event: error`(overloaded 등)가 어떤 분기에도 안 걸려 무음 누락 →
    // 잘린 답이 정상 완료처럼 끝나 과금됐다. 이제 stream 이 error 로 끝나야 한다.
    const fetchMock = vi.fn().mockResolvedValue(
      sseResponse([
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'partial' } },
        { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } },
      ])
    )
    global.fetch = fetchMock as unknown as typeof fetch

    const { callClaudeStream } = await import('@/lib/llm/claude')
    const stream = await callClaudeStream({ systemPrompt: 's', userPrompt: 'u' })
    await expect(collectStream(stream)).rejects.toThrow(/Claude stream error.*overloaded/i)
  })
})
