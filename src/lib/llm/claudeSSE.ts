/**
 * Claude streaming → SSE Response 헬퍼.
 * Python backend `/ask-stream` 대체용.
 *
 * 사용처: counselor chat-stream, 다른 streaming endpoint.
 */

import { callClaudeStream, type CallClaudeOptions } from '@/lib/llm/claude'
import { streamClaudeWithContinuation } from '@/lib/llm/claudeWithContinuation'

export interface ClaudeSSEOptions extends CallClaudeOptions {
  additionalHeaders?: Record<string, string>
  /** 각 토큰을 받기 전 transform (마스킹 등) */
  transform?: (text: string) => string
  /** 전체 텍스트가 끝났을 때 finalize block */
  finalize?: (fullText: string) => string | null | Promise<string | null>
  /**
   * 스트림이 콘텐츠를 전혀 내보내지 못했을 때 (즉시 에러 또는 빈 완료)
   * 정확히 한 번 호출. 스트림 시작 전 차감한 크레딧을 환불하는 데 사용.
   * 여기서 던진 예외는 무시한다 (환불 실패가 스트림을 깨지 않도록).
   */
  onFailure?: () => void | Promise<void>
  /**
   * true 면 max_tokens 도달 시 자동 이어쓰기 (claudeWithContinuation).
   * 궁합·운명·타로 같이 답이 길어질 수 있는 라우트에서 사용.
   * 기본 false — 기존 동작 유지.
   */
  enableContinuation?: boolean
  /** Continuation 최대 횟수 (enableContinuation=true 일 때만 의미). 기본 2. */
  maxContinuations?: number
  /** Continuation 누적 출력 절대 cap (chars). 기본 24000 (~12k tokens). */
  maxTotalOutputChars?: number
}

/**
 * Claude streaming을 SSE Response로 wrap. Frontend가 fetch로 받아 처리.
 *
 * SSE format: `data: {"content":"...","done":false}\n\n`
 */
export async function streamClaudeAsSSE(opts: ClaudeSSEOptions): Promise<Response> {
  const {
    additionalHeaders = {},
    transform,
    finalize,
    onFailure,
    enableContinuation,
    maxContinuations,
    maxTotalOutputChars,
    ...claudeOpts
  } = opts

  // enableContinuation=true 면 wrapper 경유 — max_tokens 자동 이어쓰기.
  const tokenStream = enableContinuation
    ? await streamClaudeWithContinuation({
        ...claudeOpts,
        maxContinuations,
        maxTotalOutputChars,
      })
    : await callClaudeStream(claudeOpts)
  const reader = tokenStream.getReader()

  const encoder = new TextEncoder()
  let fullText = ''

  // Invoke the refund/cleanup hook at most once. A thrown hook must never
  // break the stream, so swallow its errors here.
  let failureHandled = false
  const handleFailure = async () => {
    if (failureHandled || !onFailure) return
    failureHandled = true
    try {
      await onFailure()
    } catch {
      /* never break the stream on refund error */
    }
  }

  const sseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = transform ? transform(value) : value
          fullText += chunk
          const sseLine = `data: ${JSON.stringify({ content: chunk, done: false })}\n\n`
          controller.enqueue(encoder.encode(sseLine))
        }
        // No content delivered at all → treat as a failed turn (refund).
        if (fullText.trim() === '') {
          await handleFailure()
        }
        // finalize
        let finalChunk: string | null = null
        if (finalize) {
          try {
            finalChunk = await finalize(fullText)
          } catch {
            finalChunk = null
          }
        }
        const finalLine = `data: ${JSON.stringify({
          content: finalChunk || '',
          done: true,
        })}\n\n`
        controller.enqueue(encoder.encode(finalLine))
        controller.close()
      } catch (err) {
        // Errored before delivering any content → refund the charged turn.
        if (fullText.trim() === '') {
          await handleFailure()
        }
        const errLine = `data: ${JSON.stringify({
          content: '',
          done: true,
          error: err instanceof Error ? err.message : String(err),
        })}\n\n`
        controller.enqueue(encoder.encode(errLine))
        controller.close()
      }
    },
  })

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...additionalHeaders,
    },
  })
}
