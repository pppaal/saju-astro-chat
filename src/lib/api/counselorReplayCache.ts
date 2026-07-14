// 상담사(counselor·compatibility-counselor) SSE 라우트가 공유하는 replay 캐시
// 스캐폴딩. 두 라우트가 각자 복붙해 두던 것을 단일 진실원천으로 모은다 —
// 같은 로직이 여러 곳에 흩어지면 한쪽만 고쳐져 드리프트(재발 버그)가 난다.
//
// replay 캐시란: 새로고침·뒤로가기·다른 탭 등으로 같은 user turn 이 재진입할 때
// 크레딧을 다시 차감하거나 Claude 를 다시 호출하지 않고, 저장해 둔 원본 답변을
// 그대로 단발 재생하는 것. 차감 멱등 claim TTL(6h)과 창을 맞춘다.

/**
 * 완성 답변 텍스트를 counselor SSE 형식(content 청크 1개 + done)으로 단발
 * 재생하는 헬퍼 — replay 캐시 히트 시 Claude 호출 없이 저장본을 그대로
 * 흘려보낸다. streamClaudeAsSSE 가 emit 하는 `{content,done}` 스키마와 동일.
 */
export function streamCachedAnswer(text: string, extraHeaders?: Record<string, string>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ content: text, done: false })}\n\n`)
      )
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: '', done: true })}\n\n`))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      ...(extraHeaders || {}),
    },
  })
}

// replay 캐시 TTL — 차감 멱등 claim TTL(6h)과 맞춰, replay 가 유효한 창 동안은
// 항상 캐시된 원본 답변을 돌려줄 수 있게 한다.
export const REPLAY_RESULT_TTL_SEC = 6 * 60 * 60

/**
 * `<namespace>:turn-result:<userId>:<turnId>` / `<namespace>:replay-result:<scopedIdemKey>`
 * 키 빌더 쌍을 만든다. 라우트별 namespace(`counselor`·`compat`)만 다르고 형식은
 * 동일하다. 키 문자열 포맷은 기존과 바이트 단위로 같게 유지한다(기존 캐시 호환).
 */
export function makeReplayCacheKeys(namespace: string) {
  return {
    turnResultKey: (userId: string, turnId: string) =>
      `${namespace}:turn-result:${userId}:${turnId}`,
    replayResultKey: (scopedIdemKey: string) => `${namespace}:replay-result:${scopedIdemKey}`,
  }
}
