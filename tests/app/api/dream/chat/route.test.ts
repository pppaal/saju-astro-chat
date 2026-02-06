import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks - all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

// Mock middleware
const mockInitializeApiContext = vi.fn()
const mockCreatePublicStreamGuard = vi.fn(() => ({}))

vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: (...args: unknown[]) => mockInitializeApiContext(...args),
  createPublicStreamGuard: (...args: unknown[]) => mockCreatePublicStreamGuard(...args),
}))

// Mock streaming utilities
const mockCreateSSEStreamProxy = vi.fn()

vi.mock('@/lib/streaming', () => ({
  createSSEStreamProxy: (...args: unknown[]) => mockCreateSSEStreamProxy(...args),
}))

// Mock API client
const mockPostSSEStream = vi.fn()

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    postSSEStream: (...args: unknown[]) => mockPostSSEStream(...args),
  },
}))

// Mock HTTP utilities
const mockEnforceBodySize = vi.fn()

vi.mock('@/lib/http', () => ({
  enforceBodySize: (...args: unknown[]) => mockEnforceBodySize(...args),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock Zod validation schema
const mockSafeParse = vi.fn()

vi.mock('@/lib/api/zodValidation', () => ({
  dreamChatRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock HTTP constants
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

// Mock API limits
vi.mock('@/lib/constants/api-limits', () => ({
  BODY_LIMITS: {
    LARGE: 100000,
  },
}))

// ---------------------------------------------------------------------------
// Import route handlers AFTER all mocks
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/dream/chat/route'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEFAULT_CONTEXT = {
  ip: '127.0.0.1',
  locale: 'ko',
  session: { user: { id: 'user-123', email: 'test@example.com' } },
  userId: 'user-123',
  isAuthenticated: true,
  isPremium: false,
  creditInfo: { remaining: 10 },
}

const VALID_REQUEST_BODY = {
  messages: [{ role: 'user', content: 'What does my dream about flying mean?' }],
  dreamContext: {
    dreamText: 'I was flying over the ocean and saw a great whale beneath the waves.',
    summary: 'A dream about flying and ocean',
    symbols: ['flying', 'ocean', 'whale'],
    emotions: ['wonder', 'freedom'],
    themes: ['liberation', 'exploration'],
    recommendations: ['Keep a dream journal'],
  },
  locale: 'ko',
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/dream/chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-public-token': 'valid-token',
    },
  })
}

function mockSuccessfulMiddleware(context = DEFAULT_CONTEXT) {
  mockInitializeApiContext.mockResolvedValue({
    context,
    error: undefined,
  })
}

function mockMiddlewareError(status: number, error: Record<string, unknown>) {
  mockInitializeApiContext.mockResolvedValue({
    context: DEFAULT_CONTEXT,
    error: NextResponse.json(error, { status }),
  })
}

function mockValidation(success: boolean, data?: unknown, issues?: unknown[]) {
  if (success) {
    mockSafeParse.mockReturnValue({ success: true, data })
  } else {
    mockSafeParse.mockReturnValue({
      success: false,
      error: { issues: issues || [{ path: ['dreamContext'], message: 'Required' }] },
    })
  }
}

function mockBackendSuccess() {
  const mockResponse = new Response(null, { status: 200 })
  mockPostSSEStream.mockResolvedValue({
    ok: true,
    status: 200,
    response: mockResponse,
  })
  mockCreateSSEStreamProxy.mockReturnValue(mockResponse)
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

function setupDefaults() {
  mockSuccessfulMiddleware()
  mockEnforceBodySize.mockReturnValue(null)
  mockValidation(true, VALID_REQUEST_BODY)
  mockBackendSuccess()
}

// ===================================================================
// Tests
// ===================================================================
describe('Dream Chat API - POST /api/dream/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaults()
  })

  // -----------------------------------------------------------------
  // Authentication & Middleware
  // -----------------------------------------------------------------
  describe('Authentication & Middleware', () => {
    it('should return 401 when authentication fails', async () => {
      mockMiddlewareError(401, { error: 'Unauthorized' })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 429 when rate limited', async () => {
      mockMiddlewareError(429, { error: 'Too many requests' })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Too many requests')
    })

    it('should return 402 when credits are insufficient', async () => {
      mockMiddlewareError(402, { error: 'Insufficient credits', code: 'no_credits' })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.code).toBe('no_credits')
    })

    it('should call initializeApiContext with correct guard options', async () => {
      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(mockInitializeApiContext).toHaveBeenCalled()
      expect(mockCreatePublicStreamGuard).toHaveBeenCalledWith({
        route: 'dream-chat',
        limit: 20,
        windowSeconds: 60,
        requireCredits: true,
        creditType: 'followUp',
        creditAmount: 1,
      })
    })

    it('should return 403 when CSRF validation fails', async () => {
      mockMiddlewareError(403, { error: 'csrf_validation_failed' })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('csrf_validation_failed')
    })
  })

  // -----------------------------------------------------------------
  // Body Size Validation
  // -----------------------------------------------------------------
  describe('Body Size Validation', () => {
    it('should return 413 when body is too large', async () => {
      mockEnforceBodySize.mockReturnValue(
        NextResponse.json({ error: 'Payload too large' }, { status: 413 })
      )

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const data = await response.json()

      expect(response.status).toBe(413)
      expect(data.error).toBe('Payload too large')
    })

    it('should pass body size check when within limits', async () => {
      mockEnforceBodySize.mockReturnValue(null)

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(mockEnforceBodySize).toHaveBeenCalled()
      expect(response.status).toBe(200)
    })
  })

  // -----------------------------------------------------------------
  // Request Validation
  // -----------------------------------------------------------------
  describe('Request Validation', () => {
    it('should return 400 when messages array is missing', async () => {
      mockValidation(false, undefined, [{ path: ['messages'], message: 'Required' }])

      const response = await POST(makePostRequest({ dreamContext: {} }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toContainEqual({
        path: 'messages',
        message: 'Required',
      })
    })

    it('should return 400 when messages array is empty', async () => {
      mockValidation(false, undefined, [
        { path: ['messages'], message: 'Array must contain at least 1 element(s)' },
      ])

      const response = await POST(makePostRequest({ messages: [], dreamContext: {} }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when dreamContext is missing', async () => {
      mockValidation(false, undefined, [{ path: ['dreamContext'], message: 'Required' }])

      const response = await POST(
        makePostRequest({ messages: [{ role: 'user', content: 'test' }] })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when dreamText in context is too short', async () => {
      mockValidation(false, undefined, [
        {
          path: ['dreamContext', 'dreamText'],
          message: 'String must contain at least 5 character(s)',
        },
      ])

      const response = await POST(
        makePostRequest({
          messages: [{ role: 'user', content: 'test' }],
          dreamContext: { dreamText: 'abc' },
        })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContainEqual(
        expect.objectContaining({ path: 'dreamContext.dreamText' })
      )
    })

    it('should log validation errors', async () => {
      mockValidation(false, undefined, [{ path: ['messages'], message: 'Required' }])

      await POST(makePostRequest({}))

      expect(logger.warn).toHaveBeenCalledWith(
        '[dream/chat] validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })

    it('should accept valid request with all required fields', async () => {
      mockValidation(true, VALID_REQUEST_BODY)

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(response.status).toBe(200)
    })
  })

  // -----------------------------------------------------------------
  // Locale Handling
  // -----------------------------------------------------------------
  describe('Locale Handling', () => {
    it('should use locale from request body', async () => {
      const bodyWithLocale = { ...VALID_REQUEST_BODY, locale: 'en' }
      mockValidation(true, bodyWithLocale)

      await POST(makePostRequest(bodyWithLocale))

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/dream/chat-stream',
        expect.objectContaining({ language: 'en' }),
        expect.any(Object)
      )
    })

    it('should fallback to context locale when body locale is missing', async () => {
      const bodyWithoutLocale = { ...VALID_REQUEST_BODY }
      delete (bodyWithoutLocale as Record<string, unknown>).locale
      mockValidation(true, bodyWithoutLocale)

      await POST(makePostRequest(bodyWithoutLocale))

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/dream/chat-stream',
        expect.objectContaining({ language: 'ko' }),
        expect.any(Object)
      )
    })

    it('should default to "ko" when no locale is available', async () => {
      const bodyWithoutLocale = { ...VALID_REQUEST_BODY }
      delete (bodyWithoutLocale as Record<string, unknown>).locale
      mockValidation(true, bodyWithoutLocale)
      mockInitializeApiContext.mockResolvedValue({
        context: { ...DEFAULT_CONTEXT, locale: undefined },
        error: undefined,
      })

      await POST(makePostRequest(bodyWithoutLocale))

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/dream/chat-stream',
        expect.objectContaining({ language: 'ko' }),
        expect.any(Object)
      )
    })
  })

  // -----------------------------------------------------------------
  // Backend Communication
  // -----------------------------------------------------------------
  describe('Backend Communication', () => {
    it('should send correct payload to backend', async () => {
      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/dream/chat-stream',
        expect.objectContaining({
          messages: VALID_REQUEST_BODY.messages,
          dream_context: expect.objectContaining({
            dream_text: VALID_REQUEST_BODY.dreamContext.dreamText,
            summary: VALID_REQUEST_BODY.dreamContext.summary,
            symbols: VALID_REQUEST_BODY.dreamContext.symbols,
            emotions: VALID_REQUEST_BODY.dreamContext.emotions,
            themes: VALID_REQUEST_BODY.dreamContext.themes,
            recommendations: VALID_REQUEST_BODY.dreamContext.recommendations,
          }),
          language: 'ko',
        }),
        { timeout: 45000 }
      )
    })

    it('should include enhanced context fields when provided', async () => {
      const bodyWithEnhancedContext = {
        ...VALID_REQUEST_BODY,
        dreamContext: {
          ...VALID_REQUEST_BODY.dreamContext,
          cultural_notes: { korean: 'Cultural note' },
          celestial: { moon_phase: 'full' },
          saju: { dayStem: '甲' },
          previous_consultations: [{ id: '1', summary: 'prev' }],
          persona_memory: { lastTopics: ['dream'] },
        },
      }
      mockValidation(true, bodyWithEnhancedContext)

      await POST(makePostRequest(bodyWithEnhancedContext))

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/dream/chat-stream',
        expect.objectContaining({
          dream_context: expect.objectContaining({
            cultural_notes: { korean: 'Cultural note' },
            celestial: { moon_phase: 'full' },
            saju: { dayStem: '甲' },
            previous_consultations: [{ id: '1', summary: 'prev' }],
            persona_memory: { lastTopics: ['dream'] },
          }),
        }),
        expect.any(Object)
      )
    })

    it('should use 45 second timeout for backend request', async () => {
      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(mockPostSSEStream).toHaveBeenCalledWith(expect.any(String), expect.any(Object), {
        timeout: 45000,
      })
    })

    it('should return backend error when backend fails', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        status: 500,
        error: 'Backend service unavailable',
      })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Backend error')
      expect(data.detail).toBe('Backend service unavailable')
    })

    it('should log backend errors', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        status: 503,
        error: 'Service unavailable',
      })

      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(logger.error).toHaveBeenCalledWith(
        '[DreamChat] Backend error:',
        expect.objectContaining({
          status: 503,
          error: 'Service unavailable',
        })
      )
    })
  })

  // -----------------------------------------------------------------
  // Streaming Response
  // -----------------------------------------------------------------
  describe('Streaming Response', () => {
    it('should return SSE stream proxy on success', async () => {
      const mockStream = new Response('data: test\n\n', {
        headers: { 'content-type': 'text/event-stream' },
      })
      mockPostSSEStream.mockResolvedValue({
        ok: true,
        status: 200,
        response: mockStream,
      })
      mockCreateSSEStreamProxy.mockReturnValue(mockStream)

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(mockCreateSSEStreamProxy).toHaveBeenCalledWith({
        source: mockStream,
        route: 'DreamChat',
      })
      expect(response).toBe(mockStream)
    })

    it('should log context information before sending to backend', async () => {
      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(logger.info).toHaveBeenCalledWith(
        '[DreamChat] Sending enhanced context to backend:',
        expect.objectContaining({
          hasContext: true,
          symbolCount: 3,
        })
      )
    })
  })

  // -----------------------------------------------------------------
  // Error Handling
  // -----------------------------------------------------------------
  describe('Error Handling', () => {
    it('should return 500 when unexpected error occurs', async () => {
      mockPostSSEStream.mockRejectedValue(new Error('Unexpected error'))

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Server error')
    })

    it('should log unexpected errors', async () => {
      const error = new Error('Unexpected error')
      mockPostSSEStream.mockRejectedValue(error)

      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(logger.error).toHaveBeenCalledWith('Dream chat error:', error)
    })

    it('should handle JSON parse errors gracefully', async () => {
      // When req.json() fails, the route catches the error and returns 500
      const badRequest = new NextRequest('http://localhost/api/dream/chat', {
        method: 'POST',
        body: 'not valid json',
        headers: { 'content-type': 'application/json' },
      })

      // We need to mock the context to allow the request through middleware
      mockSuccessfulMiddleware()
      mockEnforceBodySize.mockReturnValue(null)

      const response = await POST(badRequest)
      const data = await response.json()

      // JSON parse error results in 500 internal error since req.json() throws
      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should handle backend timeout', async () => {
      const timeoutError = new Error('Request timeout')
      timeoutError.name = 'AbortError'
      mockPostSSEStream.mockRejectedValue(timeoutError)

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Server error')
    })
  })

  // -----------------------------------------------------------------
  // Edge Cases
  // -----------------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle empty symbols array in dreamContext', async () => {
      const bodyWithEmptySymbols = {
        ...VALID_REQUEST_BODY,
        dreamContext: {
          ...VALID_REQUEST_BODY.dreamContext,
          symbols: [],
        },
      }
      mockValidation(true, bodyWithEmptySymbols)

      const response = await POST(makePostRequest(bodyWithEmptySymbols))

      expect(response.status).toBe(200)
    })

    it('should handle very long dream text', async () => {
      const longDreamText = 'A'.repeat(10000)
      const bodyWithLongDream = {
        ...VALID_REQUEST_BODY,
        dreamContext: {
          ...VALID_REQUEST_BODY.dreamContext,
          dreamText: longDreamText,
        },
      }
      mockValidation(true, bodyWithLongDream)

      const response = await POST(makePostRequest(bodyWithLongDream))

      expect(response.status).toBe(200)
    })

    it('should handle multiple messages in conversation', async () => {
      const bodyWithMultipleMessages = {
        ...VALID_REQUEST_BODY,
        messages: [
          { role: 'user', content: 'First question' },
          { role: 'assistant', content: 'First answer' },
          { role: 'user', content: 'Follow-up question' },
        ],
      }
      mockValidation(true, bodyWithMultipleMessages)

      await POST(makePostRequest(bodyWithMultipleMessages))

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/dream/chat-stream',
        expect.objectContaining({
          messages: bodyWithMultipleMessages.messages,
        }),
        expect.any(Object)
      )
    })

    it('should handle special characters in dream text', async () => {
      const bodyWithSpecialChars = {
        ...VALID_REQUEST_BODY,
        dreamContext: {
          ...VALID_REQUEST_BODY.dreamContext,
          dreamText: 'I dreamed about <script>alert("xss")</script> and unicode: \u{1F600}',
        },
      }
      mockValidation(true, bodyWithSpecialChars)

      const response = await POST(makePostRequest(bodyWithSpecialChars))

      expect(response.status).toBe(200)
    })

    it('should handle Korean dream text', async () => {
      const bodyWithKorean = {
        ...VALID_REQUEST_BODY,
        dreamContext: {
          ...VALID_REQUEST_BODY.dreamContext,
          dreamText: '나는 하늘을 날아다니는 꿈을 꾸었습니다. 바다 위를 날면서 고래를 봤어요.',
        },
      }
      mockValidation(true, bodyWithKorean)

      const response = await POST(makePostRequest(bodyWithKorean))

      expect(response.status).toBe(200)
    })

    it('should handle null optional fields in dreamContext', async () => {
      const bodyWithNulls = {
        messages: [{ role: 'user', content: 'test' }],
        dreamContext: {
          dreamText: 'A dream about flying',
          summary: null,
          symbols: null,
          emotions: null,
          themes: null,
          recommendations: null,
        },
      }
      mockValidation(true, bodyWithNulls)

      const response = await POST(makePostRequest(bodyWithNulls))

      expect(response.status).toBe(200)
    })
  })
})
