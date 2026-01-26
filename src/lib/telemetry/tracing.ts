/**
 * Distributed Tracing with OpenTelemetry
 *
 * Tracks requests across services to identify bottlenecks and errors.
 * Integrates with Jaeger, Zipkin, or Datadog.
 */

import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';
import { logger } from '@/lib/logger';

const tracer = trace.getTracer('saju-astro-chat', '1.0.0');

/**
 * Create a new span for tracing
 *
 * @example
 * ```ts
 * const span = createSpan('api.saju.calculate');
 * try {
 *   // Your code here
 *   span.setStatus({ code: SpanStatusCode.OK });
 * } catch (error) {
 *   span.recordException(error);
 *   span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
 * } finally {
 *   span.end();
 * }
 * ```
 */
export function createSpan(name: string, attributes?: Record<string, string | number | boolean>): Span {
  const span = tracer.startSpan(name, {
    attributes: {
      'service.name': 'saju-astro-chat',
      'service.version': '1.0.0',
      ...(attributes || {}),
    },
  });

  return span;
}

/**
 * Trace an async function
 *
 * @example
 * ```ts
 * const result = await traceAsync('database.query', async () => {
 *   return await prisma.user.findMany();
 * }, { table: 'users' });
 * ```
 */
export async function traceAsync<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const span = createSpan(name, attributes);

  try {
    const result = await context.with(trace.setSpan(context.active(), span), fn);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Trace a synchronous function
 */
export function traceSync<T>(
  name: string,
  fn: () => T,
  attributes?: Record<string, string | number | boolean>
): T {
  const span = createSpan(name, attributes);

  try {
    const result = context.with(trace.setSpan(context.active(), span), fn);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  } finally {
    span.end();
  }
}

/**
 * Add custom event to current span
 */
export function addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>) {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Set attributes on current span
 */
export function setSpanAttributes(attributes: Record<string, string | number | boolean>) {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Get trace context for propagation
 */
export function getTraceContext(): Record<string, string> {
  const span = trace.getActiveSpan();
  if (!span) {
    return {};
  }

  const spanContext = span.spanContext();
  return {
    'traceparent': `00-${spanContext.traceId}-${spanContext.spanId}-01`,
    'tracestate': spanContext.traceState?.serialize() || '',
  };
}

/**
 * Decorator for tracing class methods
 */
export function Trace(spanName?: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const targetConstructor = (target as { constructor: { name: string } }).constructor;
    const name = spanName || `${targetConstructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (...args: unknown[]) {
      const thisConstructor = (this as { constructor: { name: string } }).constructor;
      return traceAsync(
        name,
        () => originalMethod.apply(this, args),
        {
          'method': String(propertyKey),
          'class': thisConstructor.name,
        }
      );
    };

    return descriptor;
  };
}

/**
 * Middleware wrapper for Express/Next.js route handlers
 */
export function traceRouteHandler<T>(
  routeName: string,
  handler: (req: Request) => Promise<T>
) {
  return async (req: Request): Promise<T> => {
    const span = createSpan(`http.${routeName}`, {
      'http.method': req.method,
      'http.url': req.url,
      'http.route': routeName,
    });

    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => handler(req));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      span.end();
    }
  };
}

/**
 * Trace database queries
 */
export async function traceQuery<T>(
  operation: string,
  table: string,
  query: () => Promise<T>
): Promise<T> {
  return traceAsync(
    `db.${operation}`,
    query,
    {
      'db.system': 'postgresql',
      'db.operation': operation,
      'db.table': table,
    }
  );
}

/**
 * Trace external API calls
 */
export async function traceExternalCall<T>(
  serviceName: string,
  endpoint: string,
  call: () => Promise<T>
): Promise<T> {
  return traceAsync(
    `external.${serviceName}`,
    call,
    {
      'peer.service': serviceName,
      'http.url': endpoint,
    }
  );
}

/**
 * Initialize tracing (call this in instrumentation.ts)
 */
export function initTracing() {
  if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    logger.info('[Tracing] OpenTelemetry initialized', {
      endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    });
  } else {
    logger.warn('[Tracing] OTEL_EXPORTER_OTLP_ENDPOINT not set, tracing disabled');
  }
}
