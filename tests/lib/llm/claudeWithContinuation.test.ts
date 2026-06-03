/**
 * streamClaudeWithContinuation — auto-continuation (prefill) loop.
 *
 * This wrapper is the most billing-sensitive LLM path: counselors rely on it to
 * stitch a single user-visible answer across multiple Anthropic rounds whenever
 * a round ends on stop_reason='max_tokens'. The tests below mock the underlying
 * callClaudeStream (same vi.mock style as claudeSSE.abort.test.ts) and assert:
 *   (a) single round under max_tokens → no continuation
 *   (b) max_tokens → prefill continuation loop stitches output
 *   (c) trailing-whitespace is trimmed before becoming the prefill
 *   (d) maxTotalOutputChars cap stops the loop
 *   (e) abort between rounds halts before burning more output tokens
 *   (f) partial-on-error degradation (keep what we have, don't reject)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CallClaudeOptions } from '@/lib/llm/claude'

vi.mock('@/lib/llm/claude', () => ({
  callClaudeStream: vi.fn(),
}))

import { streamClaudeWithContinuation } from '@/lib/llm/claudeWithContinuation'
import { callClaudeStream } from '@/lib/llm/claude'

/**
 * Build a mock callClaudeStream round result: enqueues each chunk, fires
 * onStreamComplete with the given stopReason (mirroring real claude.ts which
 * fires it as the stream finishes), then closes.
 */
function makeRound(
  chunks: string[],
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null
) {
  return (opts: CallClaudeOptions): Promise<ReadableStream<string>> => {
    return Promise.resolve(
      new ReadableStream<string>({
        start(controller) {
          for (const c of chunks) controller.enqueue(c)
          opts.onStreamComplete?.({ stopReason })
          controller.close()
        },
      })
    )
  }
}

/** Drain a ReadableStream<string> into the concatenated text + chunk array. */
async function drain(stream: ReadableStream<string>): Promise<{ text: string; chunks: string[] }> {
  const reader = stream.getReader()
  const chunks: string[] = []
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  return { text: chunks.join(''), chunks }
}

const baseOpts = { systemPrompt: 's', userPrompt: 'u' } as const

describe('streamClaudeWithContinuation', () => {
  beforeEach(() => {
    // mockReset (not clearAllMocks) so any unconsumed mockImplementationOnce
    // queue from a prior test cannot bleed into the next one.
    vi.mocked(callClaudeStream).mockReset()
  })

  it('(a) completes in a single round when stop_reason is not max_tokens', async () => {
    vi.mocked(callClaudeStream).mockImplementationOnce(makeRound(['hello ', 'world'], 'end_turn'))

    const stream = await streamClaudeWithContinuation({ ...baseOpts })
    const { text } = await drain(stream)

    expect(text).toBe('hello world')
    // No continuation → exactly one upstream call.
    expect(callClaudeStream).toHaveBeenCalledTimes(1)
    // First round must NOT carry a prefill.
    expect(vi.mocked(callClaudeStream).mock.calls[0][0].prefillAssistant).toBeUndefined()
  })

  it('(b) loops on max_tokens and stitches output across rounds with prefill', async () => {
    vi.mocked(callClaudeStream)
      .mockImplementationOnce(makeRound(['part-one'], 'max_tokens'))
      .mockImplementationOnce(makeRound(['-part-two'], 'max_tokens'))
      .mockImplementationOnce(makeRound(['-part-three'], 'end_turn'))

    const stream = await streamClaudeWithContinuation({ ...baseOpts })
    const { text } = await drain(stream)

    expect(text).toBe('part-one-part-two-part-three')
    expect(callClaudeStream).toHaveBeenCalledTimes(3)

    const calls = vi.mocked(callClaudeStream).mock.calls
    // Round 1: no prefill, base label.
    expect(calls[0][0].prefillAssistant).toBeUndefined()
    expect(calls[0][0].label).toBe('claude-stream')
    // Round 2: prefill = everything accumulated so far, continuation label.
    expect(calls[1][0].prefillAssistant).toBe('part-one')
    expect(calls[1][0].label).toBe('claude-stream:cont1')
    // Round 3: prefill = round1 + round2 accumulation.
    expect(calls[2][0].prefillAssistant).toBe('part-one-part-two')
    expect(calls[2][0].label).toBe('claude-stream:cont2')
  })

  it('(b2) stops continuing after maxContinuations even if still max_tokens', async () => {
    vi.mocked(callClaudeStream)
      .mockImplementationOnce(makeRound(['a'], 'max_tokens'))
      .mockImplementationOnce(makeRound(['b'], 'max_tokens'))

    // maxContinuations: 1 → at most 2 rounds total.
    const stream = await streamClaudeWithContinuation({ ...baseOpts, maxContinuations: 1 })
    const { text } = await drain(stream)

    expect(text).toBe('ab')
    expect(callClaudeStream).toHaveBeenCalledTimes(2)
  })

  it('(c) trims trailing whitespace before using accumulated text as prefill', async () => {
    // max_tokens truncation often lands on a token boundary ending in \n/space.
    // Anthropic rejects assistant content with trailing whitespace, so the
    // wrapper must trim before prefilling — but the user-facing output keeps it.
    vi.mocked(callClaudeStream)
      .mockImplementationOnce(makeRound(['line one\n\n  '], 'max_tokens'))
      .mockImplementationOnce(makeRound(['line two'], 'end_turn'))

    const stream = await streamClaudeWithContinuation({ ...baseOpts })
    const { text } = await drain(stream)

    // User still sees the original whitespace in the stitched output.
    expect(text).toBe('line one\n\n  line two')
    // But the prefill sent upstream is trimmed of trailing whitespace.
    expect(vi.mocked(callClaudeStream).mock.calls[1][0].prefillAssistant).toBe('line one')
  })

  it('(c2) sends undefined prefill when accumulated text is all whitespace', async () => {
    vi.mocked(callClaudeStream)
      .mockImplementationOnce(makeRound(['   \n '], 'max_tokens'))
      .mockImplementationOnce(makeRound(['real content'], 'end_turn'))

    const stream = await streamClaudeWithContinuation({ ...baseOpts })
    await drain(stream)

    // trim → empty → prefill must be undefined (prefilling empty is meaningless
    // and would still trip the Anthropic constraint).
    expect(vi.mocked(callClaudeStream).mock.calls[1][0].prefillAssistant).toBeUndefined()
  })

  it('(d) stops the loop when maxTotalOutputChars cap is reached', async () => {
    // Round 1 alone exceeds the cap → loop must terminate without a 2nd call.
    vi.mocked(callClaudeStream).mockImplementationOnce(makeRound(['xxxxxxxxxx'], 'max_tokens'))

    const stream = await streamClaudeWithContinuation({
      ...baseOpts,
      maxTotalOutputChars: 5,
    })
    const { text } = await drain(stream)

    // Cap is enforced mid-drain; the chunk that crosses the cap is still
    // delivered before close (the wrapper enqueues then checks).
    expect(text).toBe('xxxxxxxxxx')
    expect(callClaudeStream).toHaveBeenCalledTimes(1)
  })

  it('(d2) does not continue when accumulated length already meets the cap', async () => {
    // Exactly at cap after round 1 → even though stop_reason is max_tokens,
    // the accumulated.length < maxTotalOutputChars guard blocks continuation.
    vi.mocked(callClaudeStream)
      .mockImplementationOnce(makeRound(['12345'], 'max_tokens'))
      .mockImplementationOnce(makeRound(['SHOULD-NOT-APPEAR'], 'end_turn'))

    const stream = await streamClaudeWithContinuation({
      ...baseOpts,
      maxTotalOutputChars: 5,
    })
    const { text } = await drain(stream)

    expect(text).toBe('12345')
    expect(callClaudeStream).toHaveBeenCalledTimes(1)
  })

  it('(e) aborts between rounds without starting the next upstream call', async () => {
    const ctrl = new AbortController()

    vi.mocked(callClaudeStream)
      .mockImplementationOnce((opts) =>
        Promise.resolve(
          new ReadableStream<string>({
            start(controller) {
              controller.enqueue('round-one')
              // Simulate the client giving up right as round 1 finishes — abort
              // lands between rounds.
              ctrl.abort()
              opts.onStreamComplete?.({ stopReason: 'max_tokens' })
              controller.close()
            },
          })
        )
      )
      .mockImplementationOnce(makeRound(['round-two'], 'end_turn'))

    const stream = await streamClaudeWithContinuation({ ...baseOpts, abortSignal: ctrl.signal })
    const { text } = await drain(stream)

    // Round 1 content is delivered; round 2 is never started.
    expect(text).toBe('round-one')
    expect(callClaudeStream).toHaveBeenCalledTimes(1)
  })

  it('(e2) propagates the abortSignal into every upstream call', async () => {
    const ctrl = new AbortController()
    vi.mocked(callClaudeStream)
      .mockImplementationOnce(makeRound(['a'], 'max_tokens'))
      .mockImplementationOnce(makeRound(['b'], 'end_turn'))

    const stream = await streamClaudeWithContinuation({ ...baseOpts, abortSignal: ctrl.signal })
    await drain(stream)

    const calls = vi.mocked(callClaudeStream).mock.calls
    expect(calls[0][0].abortSignal).toBe(ctrl.signal)
    expect(calls[1][0].abortSignal).toBe(ctrl.signal)
  })

  it('(f) keeps partial output when a continuation round call throws', async () => {
    vi.mocked(callClaudeStream)
      .mockImplementationOnce(makeRound(['kept-partial'], 'max_tokens'))
      .mockRejectedValueOnce(new Error('upstream 500 on continuation'))

    const stream = await streamClaudeWithContinuation({ ...baseOpts })
    // Must NOT reject — degrade to partial.
    const { text } = await drain(stream)

    expect(text).toBe('kept-partial')
    expect(callClaudeStream).toHaveBeenCalledTimes(2)
  })

  it('(f2) keeps partial output when a continuation stream errors mid-read', async () => {
    vi.mocked(callClaudeStream)
      .mockImplementationOnce(makeRound(['first-round'], 'max_tokens'))
      .mockImplementationOnce(() => {
        // Deliver one partial chunk on the first pull, then error on the next —
        // models a stream that breaks AFTER some content already reached the
        // consumer (enqueue+error in the same start() would let the error
        // supersede the queued chunk before it's ever read).
        let pulls = 0
        return Promise.resolve(
          new ReadableStream<string>({
            pull(controller) {
              pulls += 1
              if (pulls === 1) {
                controller.enqueue('-second-partial')
              } else {
                controller.error(new Error('stream blew up mid-continuation'))
              }
            },
          })
        )
      })

    const stream = await streamClaudeWithContinuation({ ...baseOpts })
    const { text } = await drain(stream)

    // Partial from the failed continuation is preserved; no rejection.
    expect(text).toBe('first-round-second-partial')
  })

  it('(f3) rejects when the very first round call throws (nothing to degrade to)', async () => {
    vi.mocked(callClaudeStream).mockRejectedValueOnce(new Error('first round failed'))

    const stream = await streamClaudeWithContinuation({ ...baseOpts })
    await expect(drain(stream)).rejects.toThrow('first round failed')
  })

  it('(f4) rejects when the first round stream errors before any content', async () => {
    vi.mocked(callClaudeStream).mockImplementationOnce(() =>
      Promise.resolve(
        new ReadableStream<string>({
          start(controller) {
            controller.error(new Error('first stream errored empty'))
          },
        })
      )
    )

    const stream = await streamClaudeWithContinuation({ ...baseOpts })
    await expect(drain(stream)).rejects.toThrow('first stream errored empty')
  })
})
