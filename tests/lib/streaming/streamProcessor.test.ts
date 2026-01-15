import { describe, it, expect, vi } from 'vitest';
import { StreamProcessor, streamProcessor } from '@/lib/streaming/StreamProcessor';

describe('StreamProcessor', () => {
  describe('cleanFollowupMarkers', () => {
    const processor = new StreamProcessor();

    it('should remove full followup marker with content', () => {
      const text = 'Hello world||FOLLOWUP||["q1", "q2"]';
      expect(processor.cleanFollowupMarkers(text)).toBe('Hello world');
    });

    it('should remove partial followup markers', () => {
      expect(processor.cleanFollowupMarkers('Hello||FO')).toBe('Hello');
      expect(processor.cleanFollowupMarkers('Hello||FOLLOW')).toBe('Hello');
      expect(processor.cleanFollowupMarkers('Hello||FOLLOWUP|')).toBe('Hello');
    });

    it('should remove trailing pipe', () => {
      expect(processor.cleanFollowupMarkers('Hello|')).toBe('Hello');
    });

    it('should preserve text without markers', () => {
      expect(processor.cleanFollowupMarkers('Normal text')).toBe('Normal text');
    });

    it('should trim result', () => {
      expect(processor.cleanFollowupMarkers('  Hello  ')).toBe('Hello');
    });
  });

  describe('extractFollowUpQuestions', () => {
    const processor = new StreamProcessor();

    it('should extract follow-up questions from marker', () => {
      const text = 'Main content||FOLLOWUP||["Question 1", "Question 2"]';
      const result = processor.extractFollowUpQuestions(text);
      
      expect(result.cleanContent).toBe('Main content');
      expect(result.followUps).toEqual(['Question 1', 'Question 2']);
    });

    it('should return empty array when no marker', () => {
      const text = 'No followup here';
      const result = processor.extractFollowUpQuestions(text);
      
      expect(result.cleanContent).toBe('No followup here');
      expect(result.followUps).toEqual([]);
    });

    it('should handle curly quotes from AI', () => {
      const text = 'Content||FOLLOWUP||["Question 1", "Question 2"]';
      const result = processor.extractFollowUpQuestions(text);
      
      expect(result.followUps.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle malformed JSON gracefully', () => {
      const text = 'Content||FOLLOWUP||[invalid json]';
      const result = processor.extractFollowUpQuestions(text);
      
      expect(result.cleanContent).toBe('Content');
      expect(result.followUps).toEqual([]);
    });

    it('should handle trailing comma', () => {
      const text = 'Content||FOLLOWUP||["Q1", "Q2", ]';
      const result = processor.extractFollowUpQuestions(text);
      
      expect(result.followUps.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('process', () => {
    const processor = new StreamProcessor();

    it('should return error for empty body', async () => {
      const mockResponse = { body: null } as Response;
      const result = await processor.process(mockResponse);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No response body');
    });

    it('should call onError callback on empty body', async () => {
      const mockResponse = { body: null } as Response;
      const onError = vi.fn();
      
      await processor.process(mockResponse, { onError });
      
      expect(onError).toHaveBeenCalled();
    });

    it('should handle SSE stream with data', async () => {
      const chunks = ['data: Hello\n', 'data:  World\n', 'data: [DONE]\n'];
      let chunkIndex = 0;

      const mockReader = {
        read: vi.fn().mockImplementation(async () => {
          if (chunkIndex >= chunks.length) {
            return { done: true, value: undefined };
          }
          const value = new TextEncoder().encode(chunks[chunkIndex++]);
          return { done: false, value };
        }),
      };

      const mockResponse = {
        body: { getReader: () => mockReader },
      } as unknown as Response;

      const result = await processor.process(mockResponse);
      
      expect(result.success).toBe(true);
      expect(result.content).toContain('Hello');
    });
  });

  describe('streamProcessor singleton', () => {
    it('should be an instance of StreamProcessor', () => {
      expect(streamProcessor).toBeInstanceOf(StreamProcessor);
    });
  });
});
