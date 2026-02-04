/**
 * createStreamRoute Tests
 *
 * Comprehensive tests for the streaming route factory that handles
 * body parsing, Zod validation, backend SSE streaming, error fallbacks,
 * optional transform, and optional side effects.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

// ---------- mock handles we need to manipulate per-test ----------

const mockInitializeApiContext = vi.fn()
const mockParseRequestBody = vi.fn()
const mockEnforceBodySize = vi.fn()
const mockPostSSEStream = vi.fn()
const mockCreateSSEStreamProxy = vi.fn()
const mockCreateTransformedSSEStream = vi.fn()
const mockCreateFallbackSSEStream = vi.fn()
const mockLoggerWarn = vi.fn()
const mockLoggerError = vi.fn()

// ---------- mock all external modules ----------

vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: (...args: unknown[]) => mockInitializeApiContext(...args),
}))

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    postSSEStream: (...args: unknown[]) => mockPostSSEStream(...args),
  },
}))

vi.mock('@/lib/streaming/serverStreamProxy', () => ({
  createSSEStreamProxy: (...args: unknown[]) => mockCreateSSEStreamProxy(...args),
  createTransformedSSEStream: (...args: unknown[]) => mockCreateTransformedSSEStream(...args),
  createFallbackSSEStream: (...args: unknown[]) => mockCreateFallbackSSEStream(...args),
}))

vi.mock('@/lib/api/requestParser', () => ({
  parseRequestBody: (...args: unknown[]) => mockParseRequestBody(...args),
}))

vi.mock('@/lib/http', () => ({
  enforceBodySize: (...args: unknown[]) => mockEnforceBodySize(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: (...args: unknown[]) => mockLoggerError(...args),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYLOAD_TOO_LARGE: 413,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

// We use next/server's NextResponse.json in the source, mock at module level
vi.mock('next/server', () => {
  class MockNextResponse extends Response {
    static json(body: unknown, init?: ResponseInit) {
      const jsonStr = JSON.stringify(body)
      return new Response(jsonStr, {
        ...init,
        headers: { 'content-type': 'application/json', ...init?.headers },
      })
    }
  }
  return {
    NextRequest: class {},
    NextResponse: MockNextResponse,
  }
})

// ---------- import the module under test AFTER mocks ----------

import { createStreamRoute, type StreamRouteConfig } from '@/lib/streaming/createStreamRoute'

// ---------- helpers ----------

/** Minimal NextRequest-like object */
function makeRequest(
  body: Record<string, unknown> = {},
  headers: Record<string, string> = {}
): any {
  return {
    json: async () => body,
    headers: new Headers(headers),
    method: 'POST',
    url: 'http://localhost/api/test',
  }
}

/** Standard api context returned by initializeApiContext */
function makeContext(locale = 'ko') {
  return {
    context: { ip: '127.0.0.1', locale, session: null, userId: null },
    error: null,
  }
}

/** Build a simple test schema */
const testSchema = z.object({
  question: z.string(),
  userId: z.string().optional(),
})

type TestValidated = z.infer<typeof testSchema>

/** Default stream route config for tests */
function makeConfig(
  overrides: Partial<StreamRouteConfig<TestValidated>> = {}
): StreamRouteConfig<TestValidated> {
  return {
    route: 'TestStream',
    guard: {} as any,
    schema: testSchema,
    fallbackMessage: { ko: '서비스 오류입니다', en: 'Service error' },
    buildPayload: async (validated) => ({
      endpoint: '/api/test-stream',
      body: { question: validated.question },
    }),
    ...overrides,
  }
}

// ---------- reset between tests ----------

beforeEach(() => {
  vi.clearAllMocks()

  // Happy-path defaults
  mockEnforceBodySize.mockReturnValue(null)
  mockInitializeApiContext.mockResolvedValue(makeContext())
  mockParseRequestBody.mockResolvedValue({ question: 'hello' })
  mockPostSSEStream.mockResolvedValue({
    ok: true,
    response: new Response('data: ok\n\n', {
      headers: { 'content-type': 'text/event-stream', 'x-fallback': '0' },
    }),
  })
  mockCreateSSEStreamProxy.mockReturnValue(new Response('stream'))
  mockCreateTransformedSSEStream.mockReturnValue(new Response('transformed'))
  mockCreateFallbackSSEStream.mockReturnValue(new Response('fallback'))
})

// ================================================================
// Tests
// ================================================================

describe('createStreamRoute', () => {
  // ----------------------------------------------------------
  // Factory return value
  // ----------------------------------------------------------
  describe('factory output', () => {
    it('returns an async function (POST handler)', () => {
      const handler = createStreamRoute(makeConfig())
      expect(typeof handler).toBe('function')
    })
  })

  // ----------------------------------------------------------
  // Body size enforcement
  // ----------------------------------------------------------
  describe('body size enforcement', () => {
    it('skips body size check when maxBodySize is not set', async () => {
      const handler = createStreamRoute(makeConfig())
      await handler(makeRequest())
      expect(mockEnforceBodySize).not.toHaveBeenCalled()
    })

    it('calls enforceBodySize when maxBodySize is set', async () => {
      const handler = createStreamRoute(makeConfig({ maxBodySize: 1024 }))
      const req = makeRequest()
      await handler(req)
      expect(mockEnforceBodySize).toHaveBeenCalledWith(req, 1024)
    })

    it('returns oversized response when body exceeds limit', async () => {
      const tooLargeResponse = new Response('Payload too large', { status: 413 })
      mockEnforceBodySize.mockReturnValue(tooLargeResponse)

      const handler = createStreamRoute(makeConfig({ maxBodySize: 100 }))
      const result = await handler(makeRequest())

      expect(result.status).toBe(413)
      // Should not proceed to middleware
      expect(mockInitializeApiContext).not.toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------
  // Middleware (auth / rate limit / credits)
  // ----------------------------------------------------------
  describe('middleware guard', () => {
    it('passes guard options to initializeApiContext', async () => {
      const guard = { auth: true, rateLimit: { limit: 10 } } as any
      const handler = createStreamRoute(makeConfig({ guard }))
      const req = makeRequest()
      await handler(req)

      expect(mockInitializeApiContext).toHaveBeenCalledWith(req, guard)
    })

    it('returns early when middleware returns an error', async () => {
      const errorResponse = new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
      mockInitializeApiContext.mockResolvedValue({ context: null, error: errorResponse })

      const handler = createStreamRoute(makeConfig())
      const result = await handler(makeRequest())

      expect(result.status).toBe(401)
      expect(mockParseRequestBody).not.toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------
  // Body parsing
  // ----------------------------------------------------------
  describe('body parsing', () => {
    it('returns 400 when rawBody is null', async () => {
      mockParseRequestBody.mockResolvedValue(null)

      const handler = createStreamRoute(makeConfig())
      const result = await handler(makeRequest())

      expect(result.status).toBe(400)
      const body = await result.json()
      expect(body.error).toBe('invalid_body')
    })

    it('returns 400 when rawBody is a non-object (string)', async () => {
      mockParseRequestBody.mockResolvedValue('not-an-object')

      const handler = createStreamRoute(makeConfig())
      const result = await handler(makeRequest())

      expect(result.status).toBe(400)
    })

    it('returns 400 when rawBody is a number', async () => {
      mockParseRequestBody.mockResolvedValue(42)

      const handler = createStreamRoute(makeConfig())
      const result = await handler(makeRequest())

      expect(result.status).toBe(400)
    })
  })

  // ----------------------------------------------------------
  // Zod validation
  // ----------------------------------------------------------
  describe('Zod validation', () => {
    it('returns 400 with details when validation fails', async () => {
      // rawBody missing required "question" field
      mockParseRequestBody.mockResolvedValue({ notQuestion: 123 })

      const handler = createStreamRoute(makeConfig())
      const result = await handler(makeRequest())

      expect(result.status).toBe(400)
      const body = await result.json()
      expect(body.error).toBe('validation_failed')
      expect(body.details).toBeDefined()
      expect(Array.isArray(body.details)).toBe(true)
      expect(body.details[0]).toHaveProperty('path')
      expect(body.details[0]).toHaveProperty('message')
    })

    it('logs a warning on validation failure', async () => {
      mockParseRequestBody.mockResolvedValue({ bad: true })

      const handler = createStreamRoute(makeConfig())
      await handler(makeRequest())

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('[TestStream] validation failed'),
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })

    it('proceeds to buildPayload on valid data', async () => {
      mockParseRequestBody.mockResolvedValue({ question: 'tell me' })
      const buildPayload = vi.fn().mockResolvedValue({
        endpoint: '/test',
        body: { question: 'tell me' },
      })

      const handler = createStreamRoute(makeConfig({ buildPayload }))
      await handler(makeRequest())

      expect(buildPayload).toHaveBeenCalledWith(
        { question: 'tell me' },
        expect.any(Object),
        expect.any(Object),
        { question: 'tell me' }
      )
    })
  })

  // ----------------------------------------------------------
  // buildPayload
  // ----------------------------------------------------------
  describe('buildPayload', () => {
    it('short-circuits when buildPayload returns a Response', async () => {
      const earlyResponse = new Response('blocked', { status: 403 })
      const buildPayload = vi.fn().mockResolvedValue(earlyResponse)

      const handler = createStreamRoute(makeConfig({ buildPayload }))
      const result = await handler(makeRequest())

      expect(result).toBe(earlyResponse)
      expect(mockPostSSEStream).not.toHaveBeenCalled()
    })

    it('passes rawBody as fourth argument to buildPayload', async () => {
      const rawBody = { question: 'x', extraField: 42 }
      mockParseRequestBody.mockResolvedValue(rawBody)
      const buildPayload = vi.fn().mockResolvedValue({
        endpoint: '/test',
        body: {},
      })

      const handler = createStreamRoute(makeConfig({ buildPayload }))
      await handler(makeRequest())

      expect(buildPayload).toHaveBeenCalledWith(
        expect.objectContaining({ question: 'x' }),
        expect.any(Object),
        expect.any(Object),
        rawBody
      )
    })

    it('uses default timeout of 60000 when not specified', async () => {
      const handler = createStreamRoute(makeConfig())
      await handler(makeRequest())

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/test-stream',
        { question: 'hello' },
        { timeout: 60000 }
      )
    })

    it('uses custom timeout when specified by buildPayload', async () => {
      const buildPayload = vi.fn().mockResolvedValue({
        endpoint: '/api/custom',
        body: { q: 1 },
        timeout: 120000,
      })

      const handler = createStreamRoute(makeConfig({ buildPayload }))
      await handler(makeRequest())

      expect(mockPostSSEStream).toHaveBeenCalledWith('/api/custom', { q: 1 }, { timeout: 120000 })
    })
  })

  // ----------------------------------------------------------
  // Backend stream failure / fallback
  // ----------------------------------------------------------
  describe('backend stream failure', () => {
    it('returns fallback SSE stream in Korean when locale is ko', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        status: 500,
        error: 'Internal server error',
      })

      const handler = createStreamRoute(makeConfig())
      await handler(makeRequest())

      expect(mockCreateFallbackSSEStream).toHaveBeenCalledWith({
        content: '서비스 오류입니다',
        done: true,
        error: 'Internal server error',
      })
    })

    it('returns fallback SSE stream in English when locale is en', async () => {
      mockInitializeApiContext.mockResolvedValue(makeContext('en'))
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        status: 502,
        error: 'Bad gateway',
      })

      const handler = createStreamRoute(makeConfig())
      await handler(makeRequest())

      expect(mockCreateFallbackSSEStream).toHaveBeenCalledWith({
        content: 'Service error',
        done: true,
        error: 'Bad gateway',
      })
    })

    it('defaults to English when locale is neither ko nor en', async () => {
      mockInitializeApiContext.mockResolvedValue(makeContext('ja'))
      mockPostSSEStream.mockResolvedValue({ ok: false, status: 500, error: 'err' })

      const handler = createStreamRoute(makeConfig())
      await handler(makeRequest())

      expect(mockCreateFallbackSSEStream).toHaveBeenCalledWith(
        expect.objectContaining({ content: 'Service error' })
      )
    })

    it('logs error on backend failure', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        status: 503,
        error: 'service unavailable',
      })

      const handler = createStreamRoute(makeConfig())
      await handler(makeRequest())

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[TestStream] Backend error:'),
        expect.objectContaining({ status: 503, error: 'service unavailable' })
      )
    })
  })

  // ----------------------------------------------------------
  // afterStream side effect
  // ----------------------------------------------------------
  describe('afterStream', () => {
    it('fires afterStream when configured and stream succeeds', async () => {
      const afterStream = vi.fn().mockResolvedValue(undefined)

      const handler = createStreamRoute(makeConfig({ afterStream }))
      await handler(makeRequest())

      expect(afterStream).toHaveBeenCalledWith({ question: 'hello' }, expect.any(Object))
    })

    it('does not fire afterStream when backend stream fails', async () => {
      const afterStream = vi.fn()
      mockPostSSEStream.mockResolvedValue({ ok: false, status: 500, error: 'err' })

      const handler = createStreamRoute(makeConfig({ afterStream }))
      await handler(makeRequest())

      expect(afterStream).not.toHaveBeenCalled()
    })

    it('catches and logs afterStream errors without breaking the response', async () => {
      const afterStream = vi.fn().mockRejectedValue(new Error('side-effect failed'))

      const handler = createStreamRoute(makeConfig({ afterStream }))
      const result = await handler(makeRequest())

      // The handler should still return a successful stream response
      expect(result).toBeDefined()

      // Wait for the microtask queue to flush so the catch handler runs
      await new Promise((r) => setTimeout(r, 10))

      expect(mockLoggerWarn).toHaveBeenCalledWith(
        expect.stringContaining('[TestStream] afterStream error:'),
        expect.any(Error)
      )
    })

    it('does not call afterStream when it is not provided', async () => {
      const handler = createStreamRoute(makeConfig({ afterStream: undefined }))
      const result = await handler(makeRequest())
      // Should still succeed
      expect(result).toBeDefined()
    })
  })

  // ----------------------------------------------------------
  // Stream response: transformed vs proxied
  // ----------------------------------------------------------
  describe('stream response mode', () => {
    it('proxies stream when no transform is set', async () => {
      const handler = createStreamRoute(makeConfig())
      const result = await handler(makeRequest())

      expect(mockCreateSSEStreamProxy).toHaveBeenCalledWith({
        source: expect.any(Response),
        route: 'TestStream',
      })
      expect(mockCreateTransformedSSEStream).not.toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('uses transformed stream when transform is set', async () => {
      const transform = vi.fn((chunk: string) => chunk.toUpperCase())

      const handler = createStreamRoute(makeConfig({ transform }))
      const result = await handler(makeRequest())

      expect(mockCreateTransformedSSEStream).toHaveBeenCalledWith({
        source: expect.any(Response),
        transform: expect.any(Function),
        route: 'TestStream',
        additionalHeaders: { 'X-Fallback': '0' },
      })
      expect(mockCreateSSEStreamProxy).not.toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('passes validated data to transform wrapper', async () => {
      const transform = vi.fn((chunk: string, validated: TestValidated) => {
        return `[${validated.question}] ${chunk}`
      })

      const handler = createStreamRoute(makeConfig({ transform }))
      await handler(makeRequest())

      // Extract the transform wrapper that was passed to createTransformedSSEStream
      const call = mockCreateTransformedSSEStream.mock.calls[0][0]
      const wrappedTransform = call.transform

      // Call it to verify it delegates correctly
      const out = wrappedTransform('chunk-data')
      expect(transform).toHaveBeenCalledWith('chunk-data', { question: 'hello' })
      expect(out).toBe('[hello] chunk-data')
    })

    it('reads x-fallback header from backend response', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: true,
        response: new Response('data: ok\n\n', {
          headers: { 'content-type': 'text/event-stream', 'x-fallback': '1' },
        }),
      })

      const handler = createStreamRoute(makeConfig({ transform: (c) => c }))
      await handler(makeRequest())

      const call = mockCreateTransformedSSEStream.mock.calls[0][0]
      expect(call.additionalHeaders['X-Fallback']).toBe('1')
    })

    it('defaults x-fallback header to "0" when missing', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: true,
        response: new Response('data: ok\n\n', {
          headers: { 'content-type': 'text/event-stream' },
        }),
      })

      const handler = createStreamRoute(makeConfig({ transform: (c) => c }))
      await handler(makeRequest())

      const call = mockCreateTransformedSSEStream.mock.calls[0][0]
      expect(call.additionalHeaders['X-Fallback']).toBe('0')
    })
  })

  // ----------------------------------------------------------
  // Top-level error handling (catch block)
  // ----------------------------------------------------------
  describe('top-level error handling', () => {
    it('returns 500 JSON when an unexpected error occurs', async () => {
      mockInitializeApiContext.mockRejectedValue(new Error('unexpected'))

      const handler = createStreamRoute(makeConfig())
      const result = await handler(makeRequest())

      expect(result.status).toBe(500)
      const body = await result.json()
      expect(body.error).toBe('Server error')
    })

    it('logs the unexpected error', async () => {
      const err = new Error('boom')
      mockParseRequestBody.mockRejectedValue(err)

      const handler = createStreamRoute(makeConfig())
      await handler(makeRequest())

      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.stringContaining('[TestStream] error:'),
        err
      )
    })

    it('handles non-Error thrown values', async () => {
      mockPostSSEStream.mockRejectedValue('string error')

      const handler = createStreamRoute(makeConfig())
      const result = await handler(makeRequest())

      expect(result.status).toBe(500)
    })
  })

  // ----------------------------------------------------------
  // Full happy path integration
  // ----------------------------------------------------------
  describe('happy path end-to-end', () => {
    it('processes valid request through all stages without transform', async () => {
      const handler = createStreamRoute(makeConfig())
      const req = makeRequest()
      const result = await handler(req)

      // Verify order of operations
      expect(mockInitializeApiContext).toHaveBeenCalled()
      expect(mockParseRequestBody).toHaveBeenCalled()
      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/test-stream',
        { question: 'hello' },
        { timeout: 60000 }
      )
      expect(mockCreateSSEStreamProxy).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('processes valid request through all stages with transform and afterStream', async () => {
      const afterStream = vi.fn().mockResolvedValue(undefined)
      const transform = vi.fn((c: string) => c)

      const handler = createStreamRoute(makeConfig({ afterStream, transform }))
      const result = await handler(makeRequest())

      expect(afterStream).toHaveBeenCalled()
      expect(mockCreateTransformedSSEStream).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })
})
