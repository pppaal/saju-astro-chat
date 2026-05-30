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
   * 스트림이 자연 종료(전체 생성 완료)됐을 때 서버측에서 1회 호출 — 클라이언트
   * 연결 여부와 무관. fullText 를 세션/캐시에 영속화해 "사용자가 다른 앱 갔다
   * 와도 완성된 답이 남아 있게" 하는 데 쓴다. 던진 예외는 무시.
   */
  onComplete?: (fullText: string) => void | Promise<void>
  /**
   * true 면 클라이언트 연결이 끊겨도(탭 백그라운드/닫기) 업스트림 생성을
   * 중단하지 않고 끝까지 진행한 뒤 onComplete 로 영속화한다 (ChatGPT 식).
   * 이때 연결 끊김은 "실패"가 아니므로 onFailure(환불)도 부르지 않는다.
   * 기본 false — 기존처럼 끊기면 즉시 중단 + (빈 응답이면) 환불.
   */
  keepGeneratingOnDisconnect?: boolean
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
    onComplete,
    keepGeneratingOnDisconnect,
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
  // keepGeneratingOnDisconnect 모드에선 클라 연결 끊김(req.signal)으로 업스트림을
  // 중단하지 않는다 — 끝까지 생성해 onComplete 로 저장해야 하므로.
  if (abortSignal && !keepGeneratingOnDisconnect) {
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
  // 클라이언트 연결이 끊겼는지 (cancel() 또는 enqueue 실패로 감지). keep 모드면
  // 이게 true 여도 생성은 계속하고, 화면 전송(enqueue)만 건너뛴다.
  let clientGone = false

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

      // 클라가 사라졌을 때(keep 모드) 화면 전송은 건너뛰되 생성은 계속하기 위한
      // 안전 enqueue. enqueue 실패 = 연결 끊김 → clientGone 표시.
      const safeEnqueue = (line: string): void => {
        if (clientGone) return
        try {
          controller.enqueue(encoder.encode(line))
        } catch {
          clientGone = true
          if (!keepGeneratingOnDisconnect) throw new Error('client disconnected')
        }
      }

      startHeartbeat()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = transform ? transform(value) : value
          fullText += chunk
          safeEnqueue(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`)
        }

        // 전체 생성 완료 → 서버측 영속화(클라 연결 여부와 무관). keep 모드에서
        // 사용자가 다른 앱 갔다 와도 완성된 답을 되살릴 수 있게 한다.
        if (fullText.trim() !== '' && onComplete) {
          try {
            await onComplete(fullText)
          } catch {
            /* persist 실패가 스트림을 깨지 않게 */
          }
        }

        // 환불은 "빈 응답"일 때만. keep 모드에선 연결 끊김(clientGone)은 끝까지
        // 생성·저장하므로 환불 사유가 아니다. 비 keep 모드는 기존대로 abort 도 환불.
        const shouldRefund =
          fullText.trim() === '' || (!keepGeneratingOnDisconnect && pipelineAbort.signal.aborted)
        if (shouldRefund) await handleFailure()

        let finalChunk: string | null = null
        if (finalize) {
          try {
            finalChunk = await finalize(fullText)
          } catch {
            finalChunk = null
          }
        }
        safeEnqueue(`data: ${JSON.stringify({ content: finalChunk || '', done: true })}\n\n`)
        stopHeartbeat()
        streamClosed = true
        try {
          controller.close()
        } catch {
          /* cancel() 로 이미 닫혔을 수 있음 */
        }
      } catch (err) {
        // 여기 도달 = 업스트림 에러(또는 비 keep 모드의 연결 끊김). 부분 출력이
        // 전혀 없거나 abort 면 환불, 순수 mid-stream drop(부분 있음)은 청구 유지.
        const shouldRefund =
          fullText.trim() === '' || (!keepGeneratingOnDisconnect && pipelineAbort.signal.aborted)
        if (shouldRefund) await handleFailure()
        // 부분 출력이 있고 환불 안 되는 경우 → 사용자에게 이미 과금된 답변이라
        // disconnect-recovery 캐시에 저장해 result?turnId= 로 받아갈 수 있게 한다.
        // 옛 코드는 natural end 만 onComplete 호출 → mid-stream throw 시 빈 결과
        // 영영 복구 불가 + 사용자 손해.
        if (!shouldRefund && fullText.trim() !== '' && onComplete) {
          try {
            await onComplete(fullText)
          } catch {
            /* persist 실패가 stream 깨지 않게 */
          }
        }
        try {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                content: '',
                done: true,
                error: err instanceof Error ? err.message : String(err),
              })}\n\n`
            )
          )
        } catch {
          /* client gone */
        }
        stopHeartbeat()
        streamClosed = true
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }
    },
    // 프레임워크가 outgoing Response 가 버려질 때(클라 disconnect/abort) 호출.
    cancel() {
      if (keepGeneratingOnDisconnect) {
        // 연결만 끊김 — 생성은 끝까지 계속(onComplete 로 저장)한다. pipeline
        // abort/환불 안 함. start() 루프가 enqueue 실패를 잡고 계속 읽는다.
        clientGone = true
        return
      }
      // 기존: 끊기면 업스트림 중단 + (빈 응답이면) 환불해 출력 토큰 낭비 차단.
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
