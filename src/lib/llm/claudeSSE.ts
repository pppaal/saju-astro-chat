/**
 * Claude streaming → SSE Response 헬퍼.
 * Python backend `/ask-stream` 대체용.
 *
 * 사용처: counselor chat-stream, 다른 streaming endpoint.
 */

import { callClaudeStream, type CallClaudeOptions } from '@/lib/llm/claude'

export interface ClaudeSSEOptions extends CallClaudeOptions {
  additionalHeaders?: Record<string, string>
  /** 각 토큰을 받기 전 transform (마스킹 등) */
  transform?: (text: string) => string
  /** 전체 텍스트가 끝났을 때 finalize block */
  finalize?: (fullText: string) => string | null | Promise<string | null>
}

/**
 * Claude streaming을 SSE Response로 wrap. Frontend가 fetch로 받아 처리.
 *
 * SSE format: `data: {"content":"...","done":false}\n\n`
 */
export async function streamClaudeAsSSE(opts: ClaudeSSEOptions): Promise<Response> {
  const { additionalHeaders = {}, transform, finalize, ...claudeOpts } = opts

  const tokenStream = await callClaudeStream(claudeOpts)
  const reader = tokenStream.getReader()

  const encoder = new TextEncoder()
  let fullText = ''

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
