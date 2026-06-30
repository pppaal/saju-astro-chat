/**
 * streamClaudeAsSSE — onFailure(크레딧 환불 훅) 동작 보호.
 *
 * 스트림이 콘텐츠를 전혀 못 내보내면(즉시 에러 / 빈 완료) 정확히 한 번
 * onFailure 가 호출돼야 결제 후 빈 응답에 대한 자동 환불이 동작한다.
 * 콘텐츠가 하나라도 나오면 호출되면 안 된다.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/llm/claude', () => ({
  callClaudeStream: vi.fn(),
}))

import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { callClaudeStream } from '@/lib/llm/claude'

function streamFrom(tokens: string[]): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      for (const t of tokens) controller.enqueue(t)
      controller.close()
    },
  })
}

function erroringStream(): ReadableStream<string> {
  return new ReadableStream<string>({
    start(controller) {
      controller.error(new Error('backend boom'))
    },
  })
}

async function drain(res: Response): Promise<void> {
  const reader = res.body!.getReader()
  for (;;) {
    const { done } = await reader.read()
    if (done) break
  }
}

describe('streamClaudeAsSSE onFailure (credit refund hook)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does NOT call onFailure when content is delivered', async () => {
    vi.mocked(callClaudeStream).mockResolvedValue(streamFrom(['hello', ' world']))
    const onFailure = vi.fn()

    const res = await streamClaudeAsSSE({ systemPrompt: 's', userPrompt: 'u', onFailure })
    await drain(res)

    expect(onFailure).not.toHaveBeenCalled()
  })

  it('calls onFailure exactly once when the stream completes empty', async () => {
    vi.mocked(callClaudeStream).mockResolvedValue(streamFrom([]))
    const onFailure = vi.fn()

    const res = await streamClaudeAsSSE({ systemPrompt: 's', userPrompt: 'u', onFailure })
    await drain(res)

    expect(onFailure).toHaveBeenCalledTimes(1)
  })

  it('calls onFailure exactly once when the stream errors before any content', async () => {
    vi.mocked(callClaudeStream).mockResolvedValue(erroringStream())
    const onFailure = vi.fn()

    const res = await streamClaudeAsSSE({ systemPrompt: 's', userPrompt: 'u', onFailure })
    await drain(res)

    expect(onFailure).toHaveBeenCalledTimes(1)
  })

  it('does NOT call onFailure when real tokens were delivered before a mid-stream error', async () => {
    // pull-based: first read delivers a token, second read errors. fullText is
    // non-empty by the time it throws → no refund (user got partial content).
    let pulls = 0
    vi.mocked(callClaudeStream).mockResolvedValue(
      new ReadableStream<string>({
        pull(controller) {
          pulls += 1
          if (pulls === 1) controller.enqueue('partial answer')
          else controller.error(new Error('mid-stream drop'))
        },
      })
    )
    const onFailure = vi.fn()

    const res = await streamClaudeAsSSE({ systemPrompt: 's', userPrompt: 'u', onFailure })
    await drain(res)

    expect(onFailure).not.toHaveBeenCalled()
  })

  it('a throwing onFailure never breaks the stream', async () => {
    vi.mocked(callClaudeStream).mockResolvedValue(streamFrom([]))
    const onFailure = vi.fn().mockRejectedValue(new Error('refund failed'))

    const res = await streamClaudeAsSSE({ systemPrompt: 's', userPrompt: 'u', onFailure })

    await expect(drain(res)).resolves.toBeUndefined()
    expect(onFailure).toHaveBeenCalledTimes(1)
  })
})

describe('streamClaudeAsSSE truncation (incomplete marking)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 한 라운드를 흘리고 stop_reason 을 fire 하는 mock round (continuation wrapper 용).
  function roundWithStop(tokens: string[], stopReason: 'end_turn' | 'max_tokens') {
    return (opts: { onStreamComplete?: (i: { stopReason: string }) => void }) =>
      Promise.resolve(
        new ReadableStream<string>({
          start(controller) {
            for (const t of tokens) controller.enqueue(t)
            opts.onStreamComplete?.({ stopReason })
            controller.close()
          },
        })
      )
  }

  async function readBody(res: Response): Promise<string> {
    const reader = res.body!.getReader()
    const dec = new TextDecoder()
    let out = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      out += dec.decode(value)
    }
    return out
  }

  it('marks onComplete incomplete + emits done.incomplete when continuation is exhausted on max_tokens', async () => {
    vi.mocked(callClaudeStream).mockImplementation(
      roundWithStop(['cut-off mid'], 'max_tokens') as unknown as typeof callClaudeStream
    )
    const onComplete = vi.fn()

    const res = await streamClaudeAsSSE({
      systemPrompt: 's',
      userPrompt: 'u',
      enableContinuation: true,
      maxContinuations: 0, // 이어쓰기 불가 → 즉시 잘린 종료
      onComplete,
    })
    const body = await readBody(res)

    // 영속화 훅이 incomplete 마커와 함께 호출돼야 한다.
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0]).toBe('cut-off mid')
    expect(onComplete.mock.calls[0][1]).toEqual({ incomplete: true })
    // 클라이언트 done 프레임에도 incomplete 신호.
    expect(body).toContain('"done":true')
    expect(body).toContain('"incomplete":true')
  })

  it('natural end_turn → onComplete without incomplete, no done.incomplete', async () => {
    vi.mocked(callClaudeStream).mockImplementation(
      roundWithStop(['all done'], 'end_turn') as unknown as typeof callClaudeStream
    )
    const onComplete = vi.fn()

    const res = await streamClaudeAsSSE({
      systemPrompt: 's',
      userPrompt: 'u',
      enableContinuation: true,
      onComplete,
    })
    const body = await readBody(res)

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][1]).toBeUndefined()
    expect(body).not.toContain('"incomplete":true')
  })
})
