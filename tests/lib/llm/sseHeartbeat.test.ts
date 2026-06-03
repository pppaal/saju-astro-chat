/**
 * SSE heartbeat tests for streamClaudeAsSSE (counselor / shared streaming path).
 *
 * Background: a periodic SSE comment line (`: hb …`) was added to the counselor
 * streaming helper (src/lib/llm/claudeSSE.ts) and the tarot interpret-stream
 * route so idle NAT/edge proxies don't kill a long, slow Claude generation.
 *
 * These tests pin the two invariants that make the heartbeat safe:
 *   (a) heartbeat comment lines are NOT parsed as data — they never pollute the
 *       accumulated text emitted to the client nor onComplete(fullText).
 *   (b) the heartbeat interval is cleared on stream completion (no leaked timer
 *       keeps firing after the stream closes).
 *
 * We unit-test claudeSSE.ts because streamClaudeAsSSE is a directly-importable
 * function whose only meaningful dependency (callClaudeStream) is a single mock
 * point. The tarot interpret-stream route's heartbeat lives inline inside a full
 * POST handler wrapped in auth/credit/idempotency middleware, so it can't be
 * exercised without heavy mocking — its heartbeat shares the same `: hb` comment
 * contract validated here. (Noted per task: that path is covered indirectly.)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// --- Mock the upstream Claude token stream --------------------------------
// streamClaudeAsSSE pulls tokens from callClaudeStream (non-continuation path).
// We hand it a ReadableStream<string> we fully control so we can interleave
// "slow" gaps (advancing fake timers to fire heartbeats) with real tokens.
const callClaudeStreamMock = vi.fn()

vi.mock('@/lib/llm/claude', () => ({
  callClaudeStream: (opts: unknown) => callClaudeStreamMock(opts),
}))

// streamClaudeWithContinuation is only used when enableContinuation=true; we
// never set that, but mock it so the module import graph stays self-contained.
vi.mock('@/lib/llm/claudeWithContinuation', () => ({
  streamClaudeWithContinuation: vi.fn(),
}))

import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'

/** Build a ReadableStream<string> from a fixed list of token chunks. */
function streamFromChunks(chunks: string[]): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      for (const c of chunks) controller.enqueue(c)
      controller.close()
    },
  })
}

/**
 * A ReadableStream<string> whose reads resolve only when the test releases
 * them. Lets us hold the stream "open and idle" so fake-timer heartbeats fire
 * between tokens, exactly like a slow Claude generation.
 */
function gatedStream(tokens: string[]) {
  const gates: Array<() => void> = []
  let resolveNext: (() => void) | null = null
  // queue of "release" promises, one per token plus a final close
  const releases = tokens.map(() => {
    let r!: () => void
    const p = new Promise<void>((res) => {
      r = res
    })
    gates.push(r)
    return p
  })
  let closeRelease!: () => void
  const closeP = new Promise<void>((res) => {
    closeRelease = res
  })
  gates.push(closeRelease)
  void resolveNext

  let i = 0
  const stream = new ReadableStream<string>({
    async pull(controller) {
      if (i < tokens.length) {
        await releases[i]
        controller.enqueue(tokens[i])
        i++
      } else {
        await closeP
        controller.close()
      }
    },
  })
  return { stream, gates }
}

/** Decode the full SSE Response body into a single string. */
async function readBody(res: Response): Promise<string> {
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let out = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    out += decoder.decode(value, { stream: true })
  }
  out += decoder.decode()
  return out
}

/**
 * Reconstruct the client-visible content the way a spec-compliant SSE parser
 * would: only `data:` lines carry payload; comment lines (`:`-prefixed) are
 * ignored entirely. Returns the concatenation of every non-done `content`.
 */
function parseSSEContent(raw: string): string {
  let content = ''
  for (const block of raw.split('\n\n')) {
    const line = block.trim()
    if (!line.startsWith('data:')) continue // comments (`: hb`) skipped here
    const json = line.slice('data:'.length).trim()
    if (!json) continue
    try {
      const parsed = JSON.parse(json) as { content?: string; done?: boolean }
      if (parsed.content) content += parsed.content
    } catch {
      /* ignore non-JSON */
    }
  }
  return content
}

describe('streamClaudeAsSSE — SSE heartbeat', () => {
  beforeEach(() => {
    callClaudeStreamMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not let heartbeat comment lines pollute onComplete(fullText)', async () => {
    const tokens = ['Hello', ' world', '!']
    callClaudeStreamMock.mockResolvedValue(streamFromChunks(tokens))

    const onComplete = vi.fn()
    const res = await streamClaudeAsSSE({
      systemPrompt: 's',
      userPrompt: 'u',
      onComplete,
    })

    const raw = await readBody(res)

    // onComplete must receive ONLY the real tokens — no `: hb`, no `data:`.
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith('Hello world!')
    const persisted = onComplete.mock.calls[0][0] as string
    expect(persisted).not.toContain('hb')
    expect(persisted).not.toContain('data:')
    expect(persisted).not.toContain(':')

    // And a real SSE parser reconstructs exactly the same text from the wire.
    expect(parseSSEContent(raw)).toBe('Hello world!')
  })

  it('emits heartbeat comment lines during idle gaps but keeps them out of accumulated content', async () => {
    vi.useFakeTimers()

    const { stream, gates } = gatedStream(['part-A', 'part-B'])
    callClaudeStreamMock.mockResolvedValue(stream)

    const onComplete = vi.fn()
    const res = await streamClaudeAsSSE({
      systemPrompt: 's',
      userPrompt: 'u',
      onComplete,
    })

    // Drain the body concurrently while we drive the gates + fake timers.
    const bodyPromise = readBody(res)

    // Idle BEFORE any token: heartbeat interval is 10s → advance past it twice.
    await vi.advanceTimersByTimeAsync(25_000)

    // Release first token, idle again to fire more heartbeats, then second.
    gates[0]() // emit 'part-A'
    await vi.advanceTimersByTimeAsync(11_000)
    gates[1]() // emit 'part-B'
    await vi.advanceTimersByTimeAsync(1)
    gates[2]() // close upstream
    // Let the close + finalize + controller.close() settle.
    await vi.advanceTimersByTimeAsync(1)

    const raw = await bodyPromise

    // Sanity: heartbeats actually fired (otherwise the test proves nothing).
    expect(raw).toContain(': hb')

    // The reconstructed client content contains ONLY real tokens.
    expect(parseSSEContent(raw)).toBe('part-Apart-B')

    // Server-side persisted fullText is likewise heartbeat-free.
    expect(onComplete).toHaveBeenCalledWith('part-Apart-B')
  })

  it('clears the heartbeat interval on completion (no leaked timer)', async () => {
    vi.useFakeTimers()
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    callClaudeStreamMock.mockResolvedValue(streamFromChunks(['done']))

    const res = await streamClaudeAsSSE({ systemPrompt: 's', userPrompt: 'u' })
    await readBody(res)

    // The interval registered for the heartbeat must have been cleared.
    expect(clearIntervalSpy).toHaveBeenCalled()

    // After completion there must be no pending timers still scheduled.
    expect(vi.getTimerCount()).toBe(0)

    clearIntervalSpy.mockRestore()
  })
})
