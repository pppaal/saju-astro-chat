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

  it('keepGeneratingOnDisconnect: keeps generating + onComplete + NO refund after client drops', async () => {
    // ChatGPT 식: 클라가 끊겨도 서버는 끝까지 생성하고 onComplete 로 저장,
    // 환불(onFailure)은 하지 않는다.
    const upstream = makeControlledUpstream()
    vi.mocked(callClaudeStream).mockResolvedValue(upstream.stream)
    const onFailure = vi.fn()
    const onComplete = vi.fn()

    const res = await streamClaudeAsSSE({
      systemPrompt: 's',
      userPrompt: 'u',
      onFailure,
      onComplete,
      keepGeneratingOnDisconnect: true,
    })

    const reader = res.body!.getReader()
    upstream.tick('part1 ')
    await reader.read()

    // Client leaves mid-stream.
    await reader.cancel()

    // Server keeps generating to completion.
    upstream.tick('part2 end')
    upstream.finish()
    // Let the start() loop drain the rest + fire onComplete.
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))

    expect(onFailure).not.toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete.mock.calls[0][0]).toContain('part2 end')
  })

  it('non-keep + external abort racing a clean close: refunds XOR persists, never both', async () => {
    // 회귀: 비 keep 모드에서 클라 disconnect(외부 signal)로 pipeline 이 abort 된
    // 상태로 upstream 이 *깨끗이* close 되면 자연 종료 블록으로 들어온다. 이전엔
    // 이 블록이 persist(onComplete)와 refund(onFailure)를 둘 다 실행해, 환불했는데
    // replay 캐시·세션 기록이 남아 다음 동일 요청이 공짜로 재생됐다. 이제 둘은
    // 상호배타 — shouldRefund 이면 onComplete 는 절대 실행되지 않는다.
    const upstream = makeControlledUpstream()
    vi.mocked(callClaudeStream).mockResolvedValue(upstream.stream)
    const onFailure = vi.fn()
    const onComplete = vi.fn()
    const ctrl = new AbortController()

    const res = await streamClaudeAsSSE({
      systemPrompt: 's',
      userPrompt: 'u',
      abortSignal: ctrl.signal,
      onFailure,
      onComplete,
      // keepGeneratingOnDisconnect 미지정 → 비 keep 경로.
    })

    const reader = res.body!.getReader()
    upstream.tick('usable partial answer')
    await reader.read() // fullText 가 비어있지 않게 한 청크 소비

    // 클라 disconnect: 외부 signal 이 pipelineAbort 를 abort 시킨다.
    ctrl.abort()
    // 그럼에도 upstream 은 (continuation 이 abort 시 clean close 하듯) 깨끗이 종료.
    upstream.finish()
    await new Promise((r) => setTimeout(r, 0))
    await new Promise((r) => setTimeout(r, 0))

    // 정확히 하나만 — 비 keep + abort 이므로 환불(onFailure)이고 persist 는 없다.
    expect(onFailure).toHaveBeenCalledOnce()
    expect(onComplete).not.toHaveBeenCalled()
  })
})
