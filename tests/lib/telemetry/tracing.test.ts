/**
 * Tests for src/lib/telemetry/tracing.ts
 * OpenTelemetry 분산 추적 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to avoid hoisting issues with vi.mock factory
const { mockSpan, mockTracer } = vi.hoisted(() => {
  const mockSpan = {
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
    addEvent: vi.fn(),
    setAttributes: vi.fn(),
    spanContext: vi.fn(() => ({
      traceId: 'abc123',
      spanId: 'def456',
      traceState: { serialize: () => 'key=value' },
    })),
  };

  const mockTracer = {
    startSpan: vi.fn(() => mockSpan),
  };

  return { mockSpan, mockTracer };
});

vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => mockTracer),
    getActiveSpan: vi.fn(() => mockSpan),
    setSpan: vi.fn((_ctx: unknown, span: unknown) => span),
  },
  context: {
    active: vi.fn(() => ({})),
    with: vi.fn((_ctx: unknown, fn: () => unknown) => fn()),
  },
  SpanStatusCode: {
    OK: 0,
    ERROR: 2,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  createSpan,
  traceAsync,
  traceSync,
  addSpanEvent,
  setSpanAttributes,
  getTraceContext,
  Trace,
  traceRouteHandler,
  traceQuery,
  traceExternalCall,
  initTracing,
} from '@/lib/telemetry/tracing';
import { trace, SpanStatusCode } from '@opentelemetry/api';

describe('tracing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSpan', () => {
    it('should create a span with default attributes', () => {
      const span = createSpan('test.span');

      expect(mockTracer.startSpan).toHaveBeenCalledWith('test.span', {
        attributes: expect.objectContaining({
          'service.name': 'saju-astro-chat',
          'service.version': '1.0.0',
        }),
      });
      expect(span).toBe(mockSpan);
    });

    it('should merge custom attributes', () => {
      createSpan('test.span', { 'custom.key': 'value' });

      expect(mockTracer.startSpan).toHaveBeenCalledWith('test.span', {
        attributes: expect.objectContaining({
          'custom.key': 'value',
          'service.name': 'saju-astro-chat',
        }),
      });
    });
  });

  describe('traceAsync', () => {
    it('should trace async function and set OK status', async () => {
      const result = await traceAsync('async.op', async () => 42);

      expect(result).toBe(42);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should trace async function with attributes', async () => {
      await traceAsync('async.op', async () => 'done', { table: 'users' });

      expect(mockTracer.startSpan).toHaveBeenCalledWith('async.op', expect.objectContaining({
        attributes: expect.objectContaining({ table: 'users' }),
      }));
    });

    it('should record exception and set ERROR status on failure', async () => {
      const error = new Error('async failure');

      await expect(traceAsync('async.op', async () => { throw error; }))
        .rejects.toThrow('async failure');

      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'async failure',
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', async () => {
      await expect(traceAsync('async.op', async () => { throw 'string error'; }))
        .rejects.toBe('string error');

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Unknown error',
      });
    });
  });

  describe('traceSync', () => {
    it('should trace sync function and set OK status', () => {
      const result = traceSync('sync.op', () => 99);

      expect(result).toBe(99);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should record exception on sync failure', () => {
      const error = new Error('sync failure');

      expect(() => traceSync('sync.op', () => { throw error; }))
        .toThrow('sync failure');

      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'sync failure',
      });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle non-Error exceptions', () => {
      expect(() => traceSync('sync.op', () => { throw 'string'; }))
        .toThrow('string');

      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: SpanStatusCode.ERROR,
        message: 'Unknown error',
      });
    });
  });

  describe('addSpanEvent', () => {
    it('should add event to active span', () => {
      addSpanEvent('test.event', { key: 'value' });

      expect(mockSpan.addEvent).toHaveBeenCalledWith('test.event', { key: 'value' });
    });

    it('should not throw when no active span', () => {
      (trace.getActiveSpan as ReturnType<typeof vi.fn>).mockReturnValueOnce(undefined);

      expect(() => addSpanEvent('test.event')).not.toThrow();
    });
  });

  describe('setSpanAttributes', () => {
    it('should set attributes on active span', () => {
      setSpanAttributes({ key: 'value', count: 5 });

      expect(mockSpan.setAttributes).toHaveBeenCalledWith({ key: 'value', count: 5 });
    });

    it('should not throw when no active span', () => {
      (trace.getActiveSpan as ReturnType<typeof vi.fn>).mockReturnValueOnce(undefined);

      expect(() => setSpanAttributes({ key: 'value' })).not.toThrow();
    });
  });

  describe('getTraceContext', () => {
    it('should return traceparent and tracestate', () => {
      const ctx = getTraceContext();

      expect(ctx.traceparent).toBe('00-abc123-def456-01');
      expect(ctx.tracestate).toBe('key=value');
    });

    it('should return empty object when no active span', () => {
      (trace.getActiveSpan as ReturnType<typeof vi.fn>).mockReturnValueOnce(undefined);

      expect(getTraceContext()).toEqual({});
    });

    it('should handle missing traceState', () => {
      mockSpan.spanContext.mockReturnValueOnce({
        traceId: 'abc',
        spanId: 'def',
        traceState: undefined,
      });

      const ctx = getTraceContext();
      expect(ctx.tracestate).toBe('');
    });
  });

  describe('Trace decorator', () => {
    it('should be a function that returns a decorator', () => {
      const decorator = Trace('custom.name');
      expect(typeof decorator).toBe('function');
    });

    it('should apply decorator to method descriptor manually', async () => {
      const originalFn = async function () { return 'original'; };
      const descriptor: PropertyDescriptor = {
        value: originalFn,
        writable: true,
        enumerable: false,
        configurable: true,
      };

      const decorator = Trace('manual.trace');
      const result = decorator({}, 'testMethod', descriptor);

      // The decorator should replace the value with a traced version
      expect(result.value).not.toBe(originalFn);
      expect(typeof result.value).toBe('function');

      // Calling the wrapped function should invoke traceAsync
      await result.value();
      expect(mockTracer.startSpan).toHaveBeenCalledWith('manual.trace', expect.any(Object));
    });
  });

  describe('traceRouteHandler', () => {
    it('should trace a route handler', async () => {
      const handler = vi.fn().mockResolvedValue('response');
      const traced = traceRouteHandler('api.test', handler);

      const req = new Request('https://example.com/api/test', { method: 'GET' });
      const result = await traced(req);

      expect(result).toBe('response');
      expect(mockTracer.startSpan).toHaveBeenCalledWith(
        'http.api.test',
        expect.objectContaining({
          attributes: expect.objectContaining({
            'http.method': 'GET',
            'http.route': 'api.test',
          }),
        })
      );
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: SpanStatusCode.OK });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should record exception on handler failure', async () => {
      const error = new Error('route error');
      const handler = vi.fn().mockRejectedValue(error);
      const traced = traceRouteHandler('api.test', handler);

      const req = new Request('https://example.com/api/test');
      await expect(traced(req)).rejects.toThrow('route error');

      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('traceQuery', () => {
    it('should trace a database query', async () => {
      const query = vi.fn().mockResolvedValue([{ id: 1 }]);

      const result = await traceQuery('findMany', 'users', query);

      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe('traceExternalCall', () => {
    it('should trace an external API call', async () => {
      const call = vi.fn().mockResolvedValue({ data: 'ok' });

      const result = await traceExternalCall('openai', 'https://api.openai.com', call);

      expect(result).toEqual({ data: 'ok' });
    });
  });

  describe('initTracing', () => {
    it('should log info when OTEL endpoint is set', async () => {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4317';

      initTracing();

      const { logger } = await import('@/lib/logger');
      expect(logger.info).toHaveBeenCalledWith(
        '[Tracing] OpenTelemetry initialized',
        expect.objectContaining({ endpoint: 'http://localhost:4317' })
      );

      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    });

    it('should log warning when OTEL endpoint is not set', async () => {
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

      initTracing();

      const { logger } = await import('@/lib/logger');
      expect(logger.warn).toHaveBeenCalledWith(
        '[Tracing] OTEL_EXPORTER_OTLP_ENDPOINT not set, tracing disabled'
      );
    });
  });
});
