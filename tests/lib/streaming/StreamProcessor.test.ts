/**
 * StreamProcessor Tests
 */
import { describe, it, expect, vi } from 'vitest'
import { StreamProcessor, streamProcessor } from '@/lib/streaming/StreamProcessor'

describe('StreamProcessor', () => {
  describe('cleanFollowupMarkers', () => {
    it('should remove complete followup marker with content', () => {
      const processor = new StreamProcessor()
      const text = 'Hello world||FOLLOWUP||["Question 1", "Question 2"]'

      const result = processor.cleanFollowupMarkers(text)
      expect(result).toBe('Hello world')
    })

    it('should remove partial followup markers at end', () => {
      const processor = new StreamProcessor()

      expect(processor.cleanFollowupMarkers('Hello||F')).toBe('Hello')
      expect(processor.cleanFollowupMarkers('Hello||FO')).toBe('Hello')
      expect(processor.cleanFollowupMarkers('Hello||FOL')).toBe('Hello')
      expect(processor.cleanFollowupMarkers('Hello||FOLL')).toBe('Hello')
      expect(processor.cleanFollowupMarkers('Hello||FOLLO')).toBe('Hello')
      expect(processor.cleanFollowupMarkers('Hello||FOLLOW')).toBe('Hello')
      expect(processor.cleanFollowupMarkers('Hello||FOLLOWU')).toBe('Hello')
      expect(processor.cleanFollowupMarkers('Hello||FOLLOWUP')).toBe('Hello')
      expect(processor.cleanFollowupMarkers('Hello||FOLLOWUP|')).toBe('Hello')
      expect(processor.cleanFollowupMarkers('Hello||FOLLOWUP||')).toBe('Hello')
    })

    it('should remove single pipe at end', () => {
      const processor = new StreamProcessor()
      const text = 'Hello world|'

      const result = processor.cleanFollowupMarkers(text)
      expect(result).toBe('Hello world')
    })

    it('should trim whitespace', () => {
      const processor = new StreamProcessor()
      const text = '  Hello world  ||FOLLOWUP||["Q"]'

      const result = processor.cleanFollowupMarkers(text)
      expect(result).toBe('Hello world')
    })

    it('should return clean text when no markers present', () => {
      const processor = new StreamProcessor()
      const text = 'Hello world with no markers'

      const result = processor.cleanFollowupMarkers(text)
      expect(result).toBe('Hello world with no markers')
    })
  })

  describe('extractFollowUpQuestions', () => {
    it('should extract follow-up questions from valid format', () => {
      const processor = new StreamProcessor()
      const text = 'Content here||FOLLOWUP||["Question 1", "Question 2", "Question 3"]'

      const result = processor.extractFollowUpQuestions(text)
      expect(result.cleanContent).toBe('Content here')
      expect(result.followUps).toEqual(['Question 1', 'Question 2', 'Question 3'])
    })

    it('should handle curly quotes from AI', () => {
      const processor = new StreamProcessor()
      const text = 'Content||FOLLOWUP||["Question 1", "Question 2"]'

      const result = processor.extractFollowUpQuestions(text)
      expect(result.followUps).toEqual(['Question 1', 'Question 2'])
    })

    it('should handle trailing commas', () => {
      const processor = new StreamProcessor()
      const text = 'Content||FOLLOWUP||["Question 1", "Question 2", ]'

      const result = processor.extractFollowUpQuestions(text)
      expect(result.followUps).toEqual(['Question 1', 'Question 2'])
    })

    it('should return empty followUps when no marker present', () => {
      const processor = new StreamProcessor()
      const text = 'Just regular content without markers'

      const result = processor.extractFollowUpQuestions(text)
      expect(result.cleanContent).toBe('Just regular content without markers')
      expect(result.followUps).toHaveLength(0)
    })

    it('should handle malformed JSON gracefully', () => {
      const processor = new StreamProcessor()
      const text = 'Content||FOLLOWUP||[not valid json]'

      const result = processor.extractFollowUpQuestions(text)
      expect(result.cleanContent).toBe('Content')
      expect(result.followUps).toHaveLength(0)
    })

    it('should handle multiline content', () => {
      const processor = new StreamProcessor()
      const text = 'Line 1\nLine 2\nLine 3||FOLLOWUP||["Q1"]'

      const result = processor.extractFollowUpQuestions(text)
      expect(result.cleanContent).toBe('Line 1\nLine 2\nLine 3')
      expect(result.followUps).toEqual(['Q1'])
    })
  })

  describe('process', () => {
    function createMockResponse(chunks: string[], hasBody = true): Response {
      if (!hasBody) {
        return new Response(null)
      }

      const stream = new ReadableStream({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(new TextEncoder().encode(chunk))
          }
          controller.close()
        },
      })

      return new Response(stream)
    }

    it('should process SSE stream successfully', async () => {
      const processor = new StreamProcessor()
      const response = createMockResponse(['data: Hello \n', 'data: World\n', 'data: [DONE]\n'])

      const result = await processor.process(response)
      expect(result.success).toBe(true)
      expect(result.content).toBe('Hello World')
    })

    it('cancels the reader on the error path (no reader/body leak)', async () => {
      // 회귀: 에러 경로에서 reader 를 cancel/releaseLock 하지 않아 body 스트림이
      // 잠긴 채(미취소) 남았다. finally 에서 reader.cancel() 하는지 검증한다.
      const cancelSpy = vi.fn()
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          // [ERROR] 토큰을 흘리고 스트림을 닫지 않는다 — 업스트림 mid-stream 오류 모사.
          controller.enqueue(new TextEncoder().encode('data: [ERROR] boom\n\n'))
        },
        cancel: cancelSpy,
      })
      const response = new Response(body)

      const result = await new StreamProcessor().process(response)

      expect(result.success).toBe(false)
      expect(result.error).toContain('boom')
      // 미닫힌 스트림이므로 cancel 이 underlying source.cancel 을 호출해야 한다.
      expect(cancelSpy).toHaveBeenCalledTimes(1)
    })

    it('should call onChunk callback for each chunk', async () => {
      const processor = new StreamProcessor()
      const onChunk = vi.fn()
      const response = createMockResponse(['data: Hello \n', 'data: World\n'])

      await processor.process(response, { onChunk })
      expect(onChunk).toHaveBeenCalled()
    })

    it('should call onDone callback when complete', async () => {
      const processor = new StreamProcessor()
      const onDone = vi.fn()
      const response = createMockResponse(['data: Hello\n', 'data: [DONE]\n'])

      await processor.process(response, { onDone })
      expect(onDone).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          content: 'Hello',
        })
      )
    })

    it('should handle error in stream', async () => {
      const processor = new StreamProcessor()
      const onError = vi.fn()
      const response = createMockResponse(['data: Hello\n', 'data: [ERROR] Something went wrong\n'])

      const result = await processor.process(response, { onError })
      expect(result.success).toBe(false)
      expect(result.error).toContain('Something went wrong')
      expect(onError).toHaveBeenCalled()
    })

    it('should handle response without body', async () => {
      const processor = new StreamProcessor()
      const onError = vi.fn()
      const response = createMockResponse([], false)

      const result = await processor.process(response, { onError })
      expect(result.success).toBe(false)
      expect(result.error).toBe('No response body')
      expect(onError).toHaveBeenCalled()
    })

    it('should extract followups from streamed content', async () => {
      const processor = new StreamProcessor()
      const response = createMockResponse([
        'data: Content here\n',
        'data: ||FOLLOWUP||["Q1", "Q2"]\n',
      ])

      const result = await processor.process(response)
      expect(result.success).toBe(true)
      expect(result.content).toBe('Content here')
      expect(result.followUps).toEqual(['Q1', 'Q2'])
    })

    it('should handle empty stream', async () => {
      const processor = new StreamProcessor()
      const response = createMockResponse([])

      const result = await processor.process(response)
      expect(result.success).toBe(true)
      expect(result.content).toBe('')
      expect(result.followUps).toHaveLength(0)
    })

    it('should ignore non-data lines', async () => {
      const processor = new StreamProcessor()
      const response = createMockResponse([
        'event: message\n',
        'data: Hello\n',
        'id: 123\n',
        'data: World\n',
      ])

      const result = await processor.process(response)
      expect(result.content).toBe('Hello\nWorld')
    })
  })

  describe('singleton instance', () => {
    it('should export streamProcessor facade with process + extractFollowUpQuestions', () => {
      // 옛: streamProcessor 는 단일 StreamProcessor 인스턴스 (sseBuffer 공유).
      // 새: 매 호출마다 새 인스턴스를 만드는 facade — 동시 stream 격리.
      expect(typeof streamProcessor.process).toBe('function')
      expect(typeof streamProcessor.extractFollowUpQuestions).toBe('function')
    })
  })
})
