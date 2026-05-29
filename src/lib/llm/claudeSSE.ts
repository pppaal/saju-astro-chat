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
  /**
   * 라우트의 `req.signal` 을 넘기면 클라이언트 연결이 끊겼을 때 (탭 닫기,
   * 컴포넌트 unmount, 사용자 abort) 업스트림 Anthropic fetch 도 같이 abort
   * 해서 출력 토큰 비용이 끝까지 청구되는 걸 막는다. 빠뜨리면 SSE Response
   * 는 framework 가 끊어도 inner reader 는 끝까지 토큰을 읽어들임 (실제로
   * 청구 발생).
   */
  abortSignal?: AbortSignal
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
    abortSignal,
    ...claudeOpts
  } = opts

  // Pipeline controller: aborted by EITHER the route's request signal (client
  // disconnect) OR our own SSE stream cancel() below (framework dropped the
  // outgoing Response). Either source means "user is gone, stop burning
  // Anthropic tokens." Pass this signal down to callClaudeStream so the
  // upstream fetch dies with us.
  const pipelineAbort = new AbortController()
  if (abortSignal) {
    if (abortSignal.aborted) {
      pipelineAbort.abort()
    } else {
      abortSignal.addEventListener('abort', () => pipelineAbort.abort(), { once: true })
    }
  }

  // enableContinuation=true 면 wrapper 경유 — max_tokens 자동 이어쓰기.
  const tokenStream = enableContinuation
    ? await streamClaudeWithContinuation({
        ...claudeOpts,
        maxContinuations,
        maxTotalOutputChars,
        abortSignal: pipelineAbort.signal,
      })
    : await callClaudeStream({ ...claudeOpts, abortSignal: pipelineAbort.signal })
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

  // SSE heartbeat — Claude 가 토큰 사이 수 초씩 멈추거나 thinking 으로 idle
  // 해질 때, 중간 경로(모바일 NAT / Vercel edge / 사용자 ISP) 가 "연결 죽음"으로
  // 판단해 끊는 케이스 차단. 10초마다 SSE comment line(`:`-prefix)을 흘려
  // 보낸다. comment 는 클라이언트의 SSE 파서에서 자동 무시되므로 누적 텍스트에
  // 안 섞임. 실제 chunk 가 오는 동안엔 heartbeat 가 함께 흘러도 무해.
  const HEARTBEAT_INTERVAL_MS = 10_000

  const sseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null
      let streamClosed = false
      const startHeartbeat = () => {
        if (heartbeatTimer) return
        heartbeatTimer = setInterval(() => {
          if (streamClosed) return
          try {
            controller.enqueue(encoder.encode(`: hb ${Date.now()}\n\n`))
          } catch {
            // controller already closed by error path — stop pinging.
            if (heartbeatTimer) {
              clearInterval(heartbeatTimer)
              heartbeatTimer = null
            }
          }
        }, HEARTBEAT_INTERVAL_MS)
      }
      const stopHeartbeat = () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer)
          heartbeatTimer = null
        }
      }

      startHeartbeat()
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
        // 또한 자연 종료처럼 보여도 클라이언트 연결이 끊겨 pipeline 이 abort 된
        // 경우(모바일 백그라운드 전환 등)는 완성된 답이 아니므로 환불.
        if (fullText.trim() === '' || pipelineAbort.signal.aborted) {
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
        stopHeartbeat()
        streamClosed = true
        controller.close()
      } catch (err) {
        // 환불 조건:
        //  (1) 콘텐츠가 전혀 없이 에러난 경우, 또는
        //  (2) 클라이언트 연결이 끊겨(abort) 빠진 경우 — 부분 출력이 있어도
        //      답을 끝까지 못 받았으므로 환불. (모바일에서 다른 앱 갔다 오면
        //      연결이 끊겨 이 경로로 들어옴.)
        // 순수 업스트림 에러(부분 출력 후 mid-stream drop)는 사용자가 부분
        // 답이라도 받았으므로 기존대로 청구 유지.
        if (fullText.trim() === '' || pipelineAbort.signal.aborted) {
          await handleFailure()
        }
        const errLine = `data: ${JSON.stringify({
          content: '',
          done: true,
          error: err instanceof Error ? err.message : String(err),
        })}\n\n`
        controller.enqueue(encoder.encode(errLine))
        stopHeartbeat()
        streamClosed = true
        controller.close()
      }
    },
    // The framework calls cancel() when the outgoing Response is dropped
    // (client disconnect, request abort). Without this hook, the inner
    // reader.read() loop above keeps draining the open Anthropic connection
    // and we keep paying for every output token until end_turn / max_tokens,
    // even though no one will see them. Abort the pipeline → upstream fetch
    // dies → reader.read() throws → catch path refunds when no content
    // was delivered.
    cancel() {
      // 클라이언트 연결 끊김(탭 닫기·백그라운드 전환·unmount) = 답이 끝까지
      // 전달되지 못함 → 차감했던 크레딧 환불. handleFailure 는 멱등이라
      // catch/success 경로와 중복 호출돼도 한 번만 환불된다.
      void handleFailure()
      pipelineAbort.abort()
      try {
        void reader.cancel()
      } catch {
        /* reader may already be done; ignore */
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
