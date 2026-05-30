/**
 * StreamProcessor 동시 stream 격리 회귀.
 *
 * 옛 버그: streamProcessor 가 단일 인스턴스로 export 되어 sseBuffer (private 인스턴스
 * 필드) 가 두 동시 process() 호출 사이에 공유 → buffer 깨짐. 새 facade 는 매
 * 호출마다 새 StreamProcessor 인스턴스 만들어 격리.
 */
import { describe, it, expect } from 'vitest'
import { StreamProcessor, streamProcessor } from '@/lib/streaming/StreamProcessor'

function makeStreamResp(chunks: string[]): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c))
      controller.close()
    },
  })
  return new Response(stream)
}

describe('streamProcessor facade — 동시 stream 격리', () => {
  it('streamProcessor.process 는 매 호출마다 새 인스턴스를 만든다 (facade 패턴)', () => {
    // facade 는 function 객체, instanceof StreamProcessor 가 아님.
    expect(streamProcessor).not.toBeInstanceOf(StreamProcessor)
    expect(typeof streamProcessor.process).toBe('function')
    expect(typeof streamProcessor.extractFollowUpQuestions).toBe('function')
  })

  it('두 동시 stream 의 sseBuffer 가 서로 격리됨', async () => {
    // 두 stream 동시 호출. 옛 singleton 이면 buffer 충돌로 둘 중 하나 깨짐.
    const respA = makeStreamResp([
      `data: ${JSON.stringify({ content: 'A1', done: false })}\n\n`,
      `data: ${JSON.stringify({ content: 'A2', done: false })}\n\n`,
      `data: ${JSON.stringify({ content: '', done: true })}\n\n`,
    ])
    const respB = makeStreamResp([
      `data: ${JSON.stringify({ content: 'B1', done: false })}\n\n`,
      `data: ${JSON.stringify({ content: 'B2', done: false })}\n\n`,
      `data: ${JSON.stringify({ content: '', done: true })}\n\n`,
    ])
    const [rA, rB] = await Promise.all([
      streamProcessor.process(respA),
      streamProcessor.process(respB),
    ])
    // A 스트림은 A 데이터만, B 스트림은 B 데이터만 받아야 한다.
    expect(rA.content).toContain('A')
    expect(rA.content).not.toContain('B')
    expect(rB.content).toContain('B')
    expect(rB.content).not.toContain('A')
  })
})
