/**
 * streamClaudeAsSSE — client-disconnect abort propagation.
 *
 * Regression: before this fix, when the client closed the tab mid-stream the
 * outer Response was dropped by the framework but the inner reader kept
 * draining the open Anthropic fetch — every output token until end_turn /
 * max_tokens was still billed for a user who would never see them. The fix
 * wires the route's req.signal + the SSE ReadableStream's cancel() callback
 * into a pipeline AbortController forwarded to callClaudeStream so the
 * upstream fetch dies with the consumer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/llm/claude', () => ({
  callClaudeStream: vi.fn(),
}))

import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { callClaudeStream } from '@/lib/llm/claude'

// Build a ReadableStream that emits one chunk per `tick()` call. Lets the
// test pause the upstream mid-flight without timing races.
function makeControlledUpstream(): {
  stream: ReadableStream<string>
  tick: (value: string) => void
  finish: () => void
  cancelled: () => boolean
} {
  let controllerRef: ReadableStreamDefaultController<string> | null = null
  let cancelled = false
  const stream = new ReadableStream<string>({
    start(controller) {
      controllerRef = controller
    },
    cancel() {
      cancelled = true
    },
  })
  return {
    stream,
    tick: (value: string) => controllerRef?.enqueue(value),
    finish: () => controllerRef?.close(),
    cancelled: () => cancelled,
  }
}

describe('streamClaudeAsSSE — abort propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('forwards a pre-aborted external signal to callClaudeStream', async () => {
    const upstream = makeControlledUpstream()
    vi.mocked(callClaudeStream).mockImplementation(async (opts) => {
      // Mock receives whatever signal claudeSSE passed in. We assert it is
      // already aborted because the external signal was aborted before the
      // pipeline started.
      expect(opts.abortSignal).toBeDefined()
      expect(opts.abortSignal!.aborted).toBe(true)
      upstream.finish()
      return upstream.stream
    })

    const ctrl = new AbortController()
    ctrl.abort()

    const res = await streamClaudeAsSSE({
      systemPrompt: 's',
      userPrompt: 'u',
      abortSignal: ctrl.signal,
    })
    // drain to completion to flush mock assertions
    const reader = res.body!.getReader()
    for (;;) {
      const { done } = await reader.read()
      if (done) break
    }
    expect(callClaudeStream).toHaveBeenCalledOnce()
  })

  it('aborts the pipeline signal when the external signal fires mid-stream', async () => {
    const upstream = makeControlledUpstream()
    let pipelineSignal: AbortSignal | undefined
    vi.mocked(callClaudeStream).mockImplementation(async (opts) => {
      pipelineSignal = opts.abortSignal
      return upstream.stream
    })

    const ctrl = new AbortController()
    const res = await streamClaudeAsSSE({
      systemPrompt: 's',
      userPrompt: 'u',
      abortSignal: ctrl.signal,
    })

    // Begin reading so the SSE start() loop is parked on reader.read().
    const reader = res.body!.getReader()
    const firstRead = reader.read()
    upstream.tick('hello')
    await firstRead

    expect(pipelineSignal).toBeDefined()
    expect(pipelineSignal!.aborted).toBe(false)

    ctrl.abort()
    // Microtask flush — listener bridges external → pipeline synchronously.
    await Promise.resolve()
    expect(pipelineSignal!.aborted).toBe(true)

    // Cleanup — close upstream so the SSE start() loop exits.
    upstream.finish()
    for (;;) {
      const { done } = await reader.read()
      if (done) break
    }
  })

  it('cancels the upstream reader when the outgoing Response is dropped', async () => {
    const upstream = makeControlledUpstream()
    vi.mocked(callClaudeStream).mockResolvedValue(upstream.stream)

    const res = await streamClaudeAsSSE({
      systemPrompt: 's',
      userPrompt: 'u',
    })

    const reader = res.body!.getReader()
    upstream.tick('hi')
    await reader.read()

    // Framework drops the response → our cancel() should call upstream.cancel().
    await reader.cancel()

    // Either the stream's cancel() fired, or the upstream was drained by the
    // pipeline abort. Both prove the leak path is closed.
    expect(upstream.cancelled()).toBe(true)
  })

  it('still calls onFailure (refund) when the abort fires before any content', async () => {
    // Aborted before fetch even starts → mock returns an erroring stream
    // (mirrors what real callClaudeStream does when its fetch throws
    // AbortError before the body is ever read).
    vi.mocked(callClaudeStream).mockImplementation(async () => {
      return new ReadableStream<string>({
        start(controller) {
          controller.error(new Error('AbortError: aborted'))
        },
      })
    })

    const ctrl = new AbortController()
    ctrl.abort()
    const onFailure = vi.fn()
    const res = await streamClaudeAsSSE({
      systemPrompt: 's',
      userPrompt: 'u',
      abortSignal: ctrl.signal,
      onFailure,
    })
    const reader = res.body!.getReader()
    for (;;) {
      const { done } = await reader.read()
      if (done) break
    }
    expect(onFailure).toHaveBeenCalledOnce()
  })

  it('refunds (onFailure) when the Response is dropped mid-stream AFTER partial content', async () => {
    // Mobile "다른 앱 갔다 오면 끊김" case: partial tokens delivered, then the
    // framework drops the outgoing Response (client disconnect) → cancel().
    // The user never got a complete answer, so the charged turn is refunded
    // even though some content already streamed.
    const upstream = makeControlledUpstream()
    vi.mocked(callClaudeStream).mockResolvedValue(upstream.stream)
    const onFailure = vi.fn()

    const res = await streamClaudeAsSSE({
      systemPrompt: 's',
      userPrompt: 'u',
      onFailure,
    })

    const reader = res.body!.getReader()
    upstream.tick('partial answer')
    await reader.read() // consume the partial-content SSE line

    // Client disconnects mid-stream → framework cancels the Response.
    await reader.cancel()
    // Flush the microtasks for the async refund kicked off inside cancel().
    await Promise.resolve()
    await Promise.resolve()

    expect(onFailure).toHaveBeenCalledOnce()
  })
})
