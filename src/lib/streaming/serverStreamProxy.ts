/**
 * Server-Side SSE Stream Proxy Utilities
 * Reusable functions for proxying backend SSE streams to frontend
 */

import { logger } from '@/lib/logger'

export interface StreamProxyOptions {
  /** Source stream from backend */
  source: Response
  /** Optional headers to merge */
  additionalHeaders?: HeadersInit
  /** Route name for logging */
  route?: string
}

/**
 * Create a proxied SSE stream from a backend response
 * Handles reading from backend and forwarding to client
 *
 * @example
 * const backendResponse = await fetch(backendUrl);
 * return createSSEStreamProxy({
 *   source: backendResponse,
 *   route: "tarot-stream"
 * });
 */
export function createSSEStreamProxy(options: StreamProxyOptions): Response {
  const { source, additionalHeaders = {}, route = 'stream' } = options

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = source.body?.getReader()
      if (!reader) {
        logger.error(`[${route}] No reader available from source`)
        controller.close()
        return
      }

      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          // Pass through the SSE data
          const text = decoder.decode(value, { stream: true })
          controller.enqueue(encoder.encode(text))
        }
      } catch (error) {
        logger.error(`[${route}] Stream error:`, error)
      } finally {
        // Release the reader to prevent connection leaks
        try {
          reader.cancel()
        } catch {
          /* ignore cancel errors */
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...additionalHeaders,
    },
  })
}

/**
 * Check if a response is an SSE stream
 */
export function isSSEResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type')
  return contentType?.includes('text/event-stream') ?? false
}

/**
 * Create a simple SSE event string
 * @example createSSEEvent({ content: "hello" }) // "data: {\"content\":\"hello\"}\n\n"
 */
export function createSSEEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

/**
 * Create a done event for SSE streams
 */
export function createSSEDoneEvent(): string {
  return 'data: [DONE]\n\n'
}

/**
 * Create an error event for SSE streams
 */
export function createSSEErrorEvent(error: string): string {
  return `data: [ERROR] ${error}\n\n`
}

/**
 * Create a fallback SSE stream with a single message
 * Useful when backend is unavailable
 *
 * @example
 * return createFallbackSSEStream({
 *   content: "Sorry, service is temporarily unavailable",
 *   done: true
 * });
 */
export function createFallbackSSEStream(
  data: Record<string, unknown>,
  additionalHeaders?: HeadersInit
): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      try {
        const event = createSSEEvent(data)
        controller.enqueue(encoder.encode(event))
        controller.enqueue(encoder.encode(createSSEDoneEvent()))
      } catch (error) {
        logger.error('[FallbackSSE] Error creating stream:', error)
        const errorEvent = createSSEErrorEvent(
          error instanceof Error ? error.message : 'Unknown error'
        )
        controller.enqueue(encoder.encode(errorEvent))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...additionalHeaders,
    },
  })
}

/**
 * Transform stream data on-the-fly
 * Useful for adding metadata or transforming backend responses
 */
export interface StreamTransformOptions {
  source: Response
  transform: (chunk: string) => string
  route?: string
  additionalHeaders?: HeadersInit
}

export function createTransformedSSEStream(options: StreamTransformOptions): Response {
  const { source, transform, route = 'stream', additionalHeaders = {} } = options

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const reader = source.body?.getReader()
      if (!reader) {
        logger.error(`[${route}] No reader available`)
        controller.close()
        return
      }

      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          const text = decoder.decode(value, { stream: true })
          const transformed = transform(text)
          controller.enqueue(encoder.encode(transformed))
        }
      } catch (error) {
        logger.error(`[${route}] Transform stream error:`, error)
        const errorEvent = createSSEErrorEvent(
          error instanceof Error ? error.message : 'Transform error'
        )
        controller.enqueue(encoder.encode(errorEvent))
      } finally {
        // Release the reader to prevent connection leaks
        try {
          reader.cancel()
        } catch {
          /* ignore cancel errors */
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      ...additionalHeaders,
    },
  })
}
