/**
 * Server Stream Proxy Tests
 * Comprehensive tests for SSE (Server-Sent Events) stream proxy utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createSSEStreamProxy,
  isSSEResponse,
  createSSEEvent,
  createSSEDoneEvent,
  createSSEErrorEvent,
  createFallbackSSEStream,
  createTransformedSSEStream,
} from '@/lib/streaming/serverStreamProxy';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Server Stream Proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSSEEvent', () => {
    it('should create a valid SSE event string', () => {
      const data = { content: 'hello' };
      const event = createSSEEvent(data);

      expect(event).toBe('data: {"content":"hello"}\n\n');
    });

    it('should handle complex objects', () => {
      const data = {
        message: 'test',
        count: 42,
        nested: { value: true },
      };
      const event = createSSEEvent(data);

      expect(event).toContain('data: ');
      expect(event).toContain('"message":"test"');
      expect(event).toContain('"count":42');
      expect(event).toContain('"nested":{"value":true}');
      expect(event.endsWith('\n\n')).toBe(true);
    });

    it('should handle arrays', () => {
      const data = [1, 2, 3];
      const event = createSSEEvent(data);

      expect(event).toBe('data: [1,2,3]\n\n');
    });

    it('should handle strings', () => {
      const data = 'simple string';
      const event = createSSEEvent(data);

      expect(event).toBe('data: "simple string"\n\n');
    });

    it('should handle null', () => {
      const event = createSSEEvent(null);

      expect(event).toBe('data: null\n\n');
    });
  });

  describe('createSSEDoneEvent', () => {
    it('should create a DONE event', () => {
      const event = createSSEDoneEvent();

      expect(event).toBe('data: [DONE]\n\n');
    });
  });

  describe('createSSEErrorEvent', () => {
    it('should create an error event', () => {
      const error = 'Something went wrong';
      const event = createSSEErrorEvent(error);

      expect(event).toBe('data: [ERROR] Something went wrong\n\n');
    });

    it('should handle empty error message', () => {
      const event = createSSEErrorEvent('');

      expect(event).toBe('data: [ERROR] \n\n');
    });
  });

  describe('isSSEResponse', () => {
    it('should return true for SSE response', () => {
      const response = new Response(null, {
        headers: { 'content-type': 'text/event-stream' },
      });

      expect(isSSEResponse(response)).toBe(true);
    });

    it('should return true for SSE response with charset', () => {
      const response = new Response(null, {
        headers: { 'content-type': 'text/event-stream; charset=utf-8' },
      });

      expect(isSSEResponse(response)).toBe(true);
    });

    it('should return false for JSON response', () => {
      const response = new Response(null, {
        headers: { 'content-type': 'application/json' },
      });

      expect(isSSEResponse(response)).toBe(false);
    });

    it('should return false for HTML response', () => {
      const response = new Response(null, {
        headers: { 'content-type': 'text/html' },
      });

      expect(isSSEResponse(response)).toBe(false);
    });

    it('should return false when no content-type header', () => {
      const response = new Response(null);

      expect(isSSEResponse(response)).toBe(false);
    });
  });

  describe('createSSEStreamProxy', () => {
    it('should create a valid SSE stream response', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: test\n\n'));
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createSSEStreamProxy({ source: sourceResponse });

      expect(response.headers.get('content-type')).toBe('text/event-stream');
      expect(response.headers.get('cache-control')).toBe('no-cache');
      expect(response.headers.get('connection')).toBe('keep-alive');
    });

    it('should proxy stream data correctly', async () => {
      const testData = 'data: hello\n\ndata: world\n\n';
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(testData));
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createSSEStreamProxy({ source: sourceResponse });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      expect(result).toBe(testData);
    });

    it('should handle additional headers', () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createSSEStreamProxy({
        source: sourceResponse,
        additionalHeaders: {
          'X-Custom-Header': 'test-value',
        },
      });

      expect(response.headers.get('x-custom-header')).toBe('test-value');
      expect(response.headers.get('content-type')).toBe('text/event-stream');
    });

    it('should handle missing reader gracefully', async () => {
      const { logger } = await import('@/lib/logger');
      const sourceResponse = new Response(null);

      const response = createSSEStreamProxy({
        source: sourceResponse,
        route: 'test-route',
      });

      const reader = response.body?.getReader();
      if (reader) {
        const { done } = await reader.read();
        expect(done).toBe(true);
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[test-route] No reader available')
      );
    });

    it('should use default route name when not provided', async () => {
      const { logger } = await import('@/lib/logger');
      const sourceResponse = new Response(null);

      createSSEStreamProxy({ source: sourceResponse });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[stream] No reader available')
      );
    });

    it('should handle stream read errors', async () => {
      const { logger } = await import('@/lib/logger');

      const mockStream = new ReadableStream({
        async start(controller) {
          throw new Error('Stream read error');
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createSSEStreamProxy({
        source: sourceResponse,
        route: 'error-route',
      });

      const reader = response.body?.getReader();
      if (reader) {
        try {
          await reader.read();
        } catch {
          // Expected to fail
        }
      }

      // Give time for async error handling
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[error-route] Stream error:'),
        expect.any(Error)
      );
    });

    it('should handle multiple chunks', async () => {
      const chunks = ['chunk1\n', 'chunk2\n', 'chunk3\n'];
      let chunkIndex = 0;

      const mockStream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          chunks.forEach((chunk) => {
            controller.enqueue(encoder.encode(chunk));
          });
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createSSEStreamProxy({ source: sourceResponse });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      expect(result).toBe('chunk1\nchunk2\nchunk3\n');
    });
  });

  describe('createFallbackSSEStream', () => {
    it('should create a fallback SSE stream with data and DONE event', async () => {
      const data = { content: 'fallback message' };
      const response = createFallbackSSEStream(data);

      expect(response.headers.get('content-type')).toBe('text/event-stream');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      expect(result).toContain('data: {"content":"fallback message"}');
      expect(result).toContain('data: [DONE]');
    });

    it('should include additional headers', () => {
      const data = { message: 'test' };
      const response = createFallbackSSEStream(data, {
        'X-Custom': 'value',
      });

      expect(response.headers.get('x-custom')).toBe('value');
    });

    it('should handle stream creation errors', async () => {
      const { logger } = await import('@/lib/logger');

      // Create data that will cause JSON.stringify to throw
      const circularData: any = {};
      circularData.self = circularData;

      const response = createFallbackSSEStream(circularData);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[FallbackSSE] Error creating stream:'),
        expect.any(Error)
      );
      expect(result).toContain('[ERROR]');
    });

    it('should handle complex data objects', async () => {
      const data = {
        message: 'complex',
        numbers: [1, 2, 3],
        nested: { value: true },
      };
      const response = createFallbackSSEStream(data);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      expect(result).toContain('"message":"complex"');
      expect(result).toContain('"numbers":[1,2,3]');
      expect(result).toContain('"nested":{"value":true}');
    });
  });

  describe('createTransformedSSEStream', () => {
    it('should transform stream data', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('hello'));
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createTransformedSSEStream({
        source: sourceResponse,
        transform: (chunk) => chunk.toUpperCase(),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      expect(result).toBe('HELLO');
    });

    it('should apply transform to multiple chunks', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('first '));
          controller.enqueue(encoder.encode('second '));
          controller.enqueue(encoder.encode('third'));
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createTransformedSSEStream({
        source: sourceResponse,
        transform: (chunk) => `[${chunk}]`,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      expect(result).toBe('[first ][second ][third]');
    });

    it('should handle missing reader', async () => {
      const { logger } = await import('@/lib/logger');
      const sourceResponse = new Response(null);

      const response = createTransformedSSEStream({
        source: sourceResponse,
        transform: (chunk) => chunk,
        route: 'transform-test',
      });

      const reader = response.body?.getReader();
      if (reader) {
        const { done } = await reader.read();
        expect(done).toBe(true);
      }

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[transform-test] No reader available')
      );
    });

    it('should handle transform errors', async () => {
      const { logger } = await import('@/lib/logger');

      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('test'));
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createTransformedSSEStream({
        source: sourceResponse,
        transform: () => {
          throw new Error('Transform failed');
        },
        route: 'error-transform',
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[error-transform] Transform stream error:'),
        expect.any(Error)
      );
      expect(result).toContain('[ERROR]');
    });

    it('should include additional headers', () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createTransformedSSEStream({
        source: sourceResponse,
        transform: (chunk) => chunk,
        additionalHeaders: {
          'X-Transform': 'enabled',
        },
      });

      expect(response.headers.get('x-transform')).toBe('enabled');
      expect(response.headers.get('content-type')).toBe('text/event-stream');
    });

    it('should use default route when not provided', async () => {
      const { logger } = await import('@/lib/logger');
      const sourceResponse = new Response(null);

      createTransformedSSEStream({
        source: sourceResponse,
        transform: (chunk) => chunk,
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[stream] No reader available')
      );
    });

    it('should preserve SSE headers', () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createTransformedSSEStream({
        source: sourceResponse,
        transform: (chunk) => chunk,
      });

      expect(response.headers.get('content-type')).toBe('text/event-stream');
      expect(response.headers.get('cache-control')).toBe('no-cache');
      expect(response.headers.get('connection')).toBe('keep-alive');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty stream', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createSSEStreamProxy({ source: sourceResponse });

      const reader = response.body?.getReader();
      if (reader) {
        const { done } = await reader.read();
        expect(done).toBe(true);
      }
    });

    it('should handle very large chunks', async () => {
      const largeChunk = 'x'.repeat(100000);
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(largeChunk));
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createSSEStreamProxy({ source: sourceResponse });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      expect(result.length).toBe(100000);
      expect(result).toBe(largeChunk);
    });

    it('should handle unicode characters', async () => {
      const unicodeData = 'Hello 世界 🌍 émojis';
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(unicodeData));
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createSSEStreamProxy({ source: sourceResponse });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      expect(result).toBe(unicodeData);
    });

    it('should handle special SSE formatting', async () => {
      const sseData = 'data: line1\ndata: line2\n\n';
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(sseData));
          controller.close();
        },
      });

      const sourceResponse = new Response(mockStream);
      const response = createSSEStreamProxy({ source: sourceResponse });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let result = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
      }

      expect(result).toBe(sseData);
    });
  });
});
