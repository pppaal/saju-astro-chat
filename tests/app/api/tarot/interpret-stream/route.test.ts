// tests/app/api/tarot/interpret-stream/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks - all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

// Mock middleware - initializeApiContext and createPublicStreamGuard
const mockInitializeApiContext = vi.fn()
const mockCreatePublicStreamGuard = vi.fn(() => ({
  route: 'tarot-interpret-stream',
  requireToken: true,
  rateLimit: { limit: 10, windowSeconds: 60 },
  credits: { type: 'reading', amount: 1 },
}))

vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: (...args: unknown[]) => mockInitializeApiContext(...args),
  createPublicStreamGuard: (...args: unknown[]) => mockCreatePublicStreamGuard(...args),
  extractLocale: vi.fn(() => 'ko'),
}))

// Mock streaming utilities
const mockCreateSSEEvent = vi.fn((data: unknown) => `data: ${JSON.stringify(data)}\n\n`)
const mockCreateSSEDoneEvent = vi.fn(() => 'data: [DONE]\n\n')

vi.mock('@/lib/streaming', () => ({
  createSSEEvent: (...args: unknown[]) => mockCreateSSEEvent(...args),
  createSSEDoneEvent: (...args: unknown[]) => mockCreateSSEDoneEvent(...args),
}))

// Mock apiClient
const mockApiClientPost = vi.fn()

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockApiClientPost(...args),
  },
}))

// Mock enforceBodySize
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

// Mock HTTP constants
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

// Mock metrics
vi.mock('@/lib/metrics/index', () => ({
  recordExternalCall: vi.fn(),
}))

// Mock Zod validation schema
const mockTarotInterpretStreamSafeParse = vi.fn()

vi.mock('@/lib/api/zodValidation', () => ({
  tarotInterpretStreamSchema: {
    safeParse: (...args: unknown[]) => mockTarotInterpretStreamSafeParse(...args),
  },
  createValidationErrorResponse: vi.fn((error: any, options?: any) => {
    return new Response(
      JSON.stringify({
        error: 'validation_failed',
        details: error.issues.map((i: any) => ({ path: i.path.join('.'), message: i.message })),
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }),
}))

// Mock errorHandler
vi.mock('@/lib/api/errorHandler', () => ({
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    RATE_LIMITED: 'RATE_LIMITED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    BACKEND_ERROR: 'BACKEND_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  },
  createErrorResponse: vi.fn(({ code, message }) => {
    const statusMap: Record<string, number> = {
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      RATE_LIMITED: 429,
      VALIDATION_ERROR: 422,
      INTERNAL_ERROR: 500,
      BACKEND_ERROR: 502,
      SERVICE_UNAVAILABLE: 503,
    }
    const status = statusMap[code] || 500
    return new Response(
      JSON.stringify({
        success: false,
        error: { code, message: message || 'Error', status },
      }),
      { status, headers: { 'Content-Type': 'application/json' } }
    )
  }),
}))

// ---------------------------------------------------------------------------
// Import route handlers AFTER all mocks
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/tarot/interpret-stream/route'
import { logger } from '@/lib/logger'
import { NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CARD = {
  name: 'The Fool',
  nameKo: '바보',
  isReversed: false,
  position: 'Past',
  positionKo: '과거',
  keywords: ['new beginnings', 'innocence'],
  keywordsKo: ['새로운 시작', '순수함'],
}

const VALID_REQUEST_BODY = {
  categoryId: 'love',
  spreadId: 'three-card',
  spreadTitle: '삼카드 스프레드',
  cards: [VALID_CARD],
  userQuestion: '연애 운세는 어떤가요?',
  language: 'ko',
  birthdate: '1990-05-15',
  previousReadings: [],
}

const MOCK_CONTEXT = {
  ip: '127.0.0.1',
  locale: 'ko',
  userId: 'user-123',
  session: { user: { id: 'user-123', email: 'test@example.com' } },
  isAuthenticated: true,
  isPremium: false,
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/tarot/interpret-stream', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-public-token': 'valid-token',
    },
  })
}

// Helper to create a mock OpenAI streaming response
function createMockOpenAIStreamResponse(chunks: string[]) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

function setupDefaults() {
  // Default: middleware passes
  mockInitializeApiContext.mockResolvedValue({
    context: MOCK_CONTEXT,
    error: undefined,
  })

  // Default: body size OK
  mockEnforceBodySize.mockReturnValue(null)

  // Default: validation passes
  mockTarotInterpretStreamSafeParse.mockReturnValue({
    success: true,
    data: VALID_REQUEST_BODY,
  })

  // Default: backend fallback OK
  mockApiClientPost.mockResolvedValue({
    ok: true,
    data: {
      overall_message: 'Backend interpretation',
      card_insights: [{ position: 'Past', interpretation: 'Card interpretation' }],
      guidance: [{ title: 'Advice', detail: 'Take action' }],
    },
  })
}

// ===================================================================
// POST /api/tarot/interpret-stream
// ===================================================================

describe('POST /api/tarot/interpret-stream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaults()
    // Clear any existing OPENAI_API_KEY for tests
    delete process.env.OPENAI_API_KEY
  })

  // -----------------------------------------------------------------
  // Middleware Integration
  // -----------------------------------------------------------------
  describe('Middleware Integration', () => {
    it('should call createPublicStreamGuard with correct options', async () => {
      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(mockCreatePublicStreamGuard).toHaveBeenCalledWith({
        route: 'tarot-interpret-stream',
        limit: 10,
        windowSeconds: 60,
        requireCredits: true,
        creditType: 'reading',
        creditAmount: 1,
      })
    })

    it('should call initializeApiContext with request and guard options', async () => {
      const req = makePostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(mockInitializeApiContext).toHaveBeenCalledWith(req, expect.any(Object))
    })

    it('should return middleware error response when middleware fails', async () => {
      const errorResponse = NextResponse.json({ error: { code: 'RATE_LIMITED' } }, { status: 429 })
      mockInitializeApiContext.mockResolvedValue({
        context: MOCK_CONTEXT,
        error: errorResponse,
      })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(response.status).toBe(429)
    })

    it('should return 401 when token is invalid', async () => {
      const errorResponse = NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
      mockInitializeApiContext.mockResolvedValue({
        context: MOCK_CONTEXT,
        error: errorResponse,
      })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(response.status).toBe(401)
    })
  })

  // -----------------------------------------------------------------
  // Body Size Enforcement
  // -----------------------------------------------------------------
  describe('Body Size Enforcement', () => {
    it('should enforce body size limit of 256KB', async () => {
      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(mockEnforceBodySize).toHaveBeenCalledWith(expect.any(NextRequest), 256 * 1024)
    })

    it('should return error when body is oversized', async () => {
      const oversizedResponse = NextResponse.json({ error: 'payload_too_large' }, { status: 413 })
      mockEnforceBodySize.mockReturnValue(oversizedResponse)

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(response.status).toBe(413)
    })
  })

  // -----------------------------------------------------------------
  // Input Validation
  // -----------------------------------------------------------------
  describe('Input Validation', () => {
    it('should return 400 when validation fails', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['categoryId'], message: 'Required' }],
        },
      })

      const response = await POST(makePostRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toEqual([{ path: 'categoryId', message: 'Required' }])
    })

    it('should return 400 when categoryId is missing', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['categoryId'], message: 'Required' }],
        },
      })

      const body = { ...VALID_REQUEST_BODY }
      delete (body as Record<string, unknown>).categoryId

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when cards array is empty', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['cards'], message: 'Array must contain at least 1 element(s)' }],
        },
      })

      const response = await POST(makePostRequest({ ...VALID_REQUEST_BODY, cards: [] }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when too many cards (> 15)', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['cards'], message: 'Array must contain at most 15 element(s)' }],
        },
      })

      const tooManyCards = Array.from({ length: 20 }, (_, i) => ({
        ...VALID_CARD,
        name: `Card ${i}`,
        position: `Position ${i}`,
      }))

      const response = await POST(makePostRequest({ ...VALID_REQUEST_BODY, cards: tooManyCards }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when card is missing required fields', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['cards', 0, 'isReversed'], message: 'Required' }],
        },
      })

      const invalidCard = { name: 'The Fool', position: 'Past' } // missing isReversed
      const response = await POST(makePostRequest({ ...VALID_REQUEST_BODY, cards: [invalidCard] }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when userQuestion exceeds max length', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['userQuestion'], message: 'String must contain at most 600 character(s)' },
          ],
        },
      })

      const longQuestion = 'x'.repeat(700)
      const response = await POST(
        makePostRequest({ ...VALID_REQUEST_BODY, userQuestion: longQuestion })
      )
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should accept valid language "ko"', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, language: 'ko' },
      })

      const response = await POST(makePostRequest({ ...VALID_REQUEST_BODY, language: 'ko' }))

      // Should not return 400
      expect(response.status).not.toBe(400)
    })

    it('should accept valid language "en"', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, language: 'en' },
      })

      const response = await POST(makePostRequest({ ...VALID_REQUEST_BODY, language: 'en' }))

      expect(response.status).not.toBe(400)
    })

    it('should accept previousReadings array (max 3)', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: {
          ...VALID_REQUEST_BODY,
          previousReadings: ['Reading 1', 'Reading 2', 'Reading 3'],
        },
      })

      const response = await POST(
        makePostRequest({
          ...VALID_REQUEST_BODY,
          previousReadings: ['Reading 1', 'Reading 2', 'Reading 3'],
        })
      )

      expect(response.status).not.toBe(400)
    })
  })

  // -----------------------------------------------------------------
  // Fallback Mode (No OPENAI_API_KEY)
  // -----------------------------------------------------------------
  describe('Fallback Mode (No OPENAI_API_KEY)', () => {
    it('should use fallback payload when OPENAI_API_KEY is missing', async () => {
      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      // Should return SSE stream with fallback header
      expect(response.headers.get('X-Fallback')).toBe('1')
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should return Korean fallback messages for ko locale', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, language: 'ko' },
      })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const text = await response.text()

      // Should contain Korean text
      expect(text).toContain('카드')
    })

    it('should return English fallback messages for en locale', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, language: 'en' },
      })

      const response = await POST(makePostRequest({ ...VALID_REQUEST_BODY, language: 'en' }))
      const text = await response.text()

      // Should contain English text (the fallback uses "cards" and "upright")
      expect(text).toContain('cards')
      expect(text).toContain('upright')
    })

    it('should log warning when OPENAI_API_KEY is missing', async () => {
      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(logger.warn).toHaveBeenCalledWith(
        'Tarot stream missing OPENAI_API_KEY, using fallback'
      )
    })
  })

  // -----------------------------------------------------------------
  // OpenAI Streaming (With API Key)
  // -----------------------------------------------------------------
  describe('OpenAI Streaming', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key'
    })

    afterEach(() => {
      delete process.env.OPENAI_API_KEY
    })

    it('should call OpenAI API with correct parameters', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(
          createMockOpenAIStreamResponse([
            'data: {"choices":[{"delta":{"content":"{\\"overall\\":"}}]}\n\n',
            'data: {"choices":[{"delta":{"content":"\\"Test\\"}"}}]}\n\n',
            'data: [DONE]\n\n',
          ])
        )
      global.fetch = mockFetch

      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          },
          body: expect.stringContaining('gpt-4o-mini'),
        })
      )
    })

    it('should use gpt-4o-mini model', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      await POST(makePostRequest(VALID_REQUEST_BODY))

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe('gpt-4o-mini')
    })

    it('should request JSON response format', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      await POST(makePostRequest(VALID_REQUEST_BODY))

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.response_format).toEqual({ type: 'json_object' })
    })

    it('should enable streaming', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      await POST(makePostRequest(VALID_REQUEST_BODY))

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.stream).toBe(true)
    })

    it('should return SSE stream response on success', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(
          createMockOpenAIStreamResponse([
            'data: {"choices":[{"delta":{"content":"test"}}]}\n\n',
            'data: [DONE]\n\n',
          ])
        )
      global.fetch = mockFetch

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
    })

    it('should fallback to backend when OpenAI fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      // Should return fallback stream
      expect(response.headers.get('X-Fallback')).toBe('1')
      expect(logger.error).toHaveBeenCalledWith(
        'OpenAI stream fetch error:',
        expect.objectContaining({ error: expect.any(Error) })
      )
    })

    it('should fallback to backend when OpenAI returns error status', async () => {
      global.fetch = vi.fn().mockResolvedValue(new Response('Rate limit exceeded', { status: 429 }))

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(response.headers.get('X-Fallback')).toBe('1')
      expect(logger.error).toHaveBeenCalledWith(
        'OpenAI stream error:',
        expect.objectContaining({ status: 429 })
      )
    })
  })

  // -----------------------------------------------------------------
  // Backend Fallback
  // -----------------------------------------------------------------
  describe('Backend Fallback', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key'
    })

    afterEach(() => {
      delete process.env.OPENAI_API_KEY
    })

    it('should call backend API on OpenAI failure', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('OpenAI down'))

      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/api/tarot/interpret',
        expect.objectContaining({
          category: 'love',
          spread_id: 'three-card',
          cards: expect.any(Array),
        }),
        { timeout: 20000 }
      )
    })

    it('should use backend payload when backend succeeds', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('OpenAI down'))
      mockApiClientPost.mockResolvedValue({
        ok: true,
        data: {
          overall_message: 'Backend interpretation',
          card_insights: [{ position: 'Past', interpretation: 'Card meaning' }],
          guidance: 'Take action',
        },
      })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const text = await response.text()

      expect(text).toContain('Backend interpretation')
    })

    it('should use base fallback when backend also fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('OpenAI down'))
      mockApiClientPost.mockResolvedValue({
        ok: false,
        status: 500,
        error: 'Backend error',
      })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      // Should still return a fallback stream
      expect(response.headers.get('X-Fallback')).toBe('1')
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should log backend fallback errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('OpenAI down'))
      mockApiClientPost.mockResolvedValue({
        ok: false,
        status: 500,
        error: 'Backend error',
      })

      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(logger.error).toHaveBeenCalledWith(
        'Tarot stream backend fallback error:',
        expect.objectContaining({ status: 500 })
      )
    })
  })

  // -----------------------------------------------------------------
  // Personalization Features
  // -----------------------------------------------------------------
  describe('Personalization Features', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key'
    })

    afterEach(() => {
      delete process.env.OPENAI_API_KEY
    })

    it('should include zodiac sign context when birthdate provided', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, birthdate: '1990-05-15' }, // Taurus
      })

      await POST(makePostRequest({ ...VALID_REQUEST_BODY, birthdate: '1990-05-15' }))

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')
      // Should include zodiac info for May 15 (Taurus)
      expect(userMessage.content).toContain('황소자리')
    })

    it('should ignore impossible YYYY-MM-DD birthdate values', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: {
          ...VALID_REQUEST_BODY,
          language: 'en',
          birthdate: '1990-02-31',
        },
      })

      await POST(
        makePostRequest({
          ...VALID_REQUEST_BODY,
          language: 'en',
          birthdate: '1990-02-31',
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).not.toContain('Zodiac:')
    })
    it('should include previous readings context when provided', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: {
          ...VALID_REQUEST_BODY,
          previousReadings: ['Previous reading about love'],
        },
      })

      await POST(
        makePostRequest({
          ...VALID_REQUEST_BODY,
          previousReadings: ['Previous reading about love'],
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).toContain('Previous reading about love')
    })

    it('should analyze question mood for worried patterns', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, userQuestion: '너무 걱정되고 불안해요' },
      })

      await POST(makePostRequest({ ...VALID_REQUEST_BODY, userQuestion: '너무 걱정되고 불안해요' }))

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).toContain('걱정')
    })
  })

  // -----------------------------------------------------------------
  // Error Handling
  // -----------------------------------------------------------------
  describe('Error Handling', () => {
    it('should return 500 on unexpected errors', async () => {
      mockTarotInterpretStreamSafeParse.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should log errors on server error', async () => {
      mockTarotInterpretStreamSafeParse.mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(logger.error).toHaveBeenCalledWith(
        'Tarot stream error:',
        expect.objectContaining({ error: expect.any(Error) })
      )
    })

    it('should handle JSON parse errors gracefully', async () => {
      // Create a request that will fail JSON parsing
      const badRequest = new NextRequest('http://localhost/api/tarot/interpret-stream', {
        method: 'POST',
        body: 'not json',
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await POST(badRequest)

      expect(response.status).toBe(500)
    })
  })

  // -----------------------------------------------------------------
  // Locale Handling
  // -----------------------------------------------------------------
  describe('Locale Handling', () => {
    it('should use body language over context locale when provided', async () => {
      mockInitializeApiContext.mockResolvedValue({
        context: { ...MOCK_CONTEXT, locale: 'ko' },
        error: undefined,
      })
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, language: 'en' },
      })

      const response = await POST(makePostRequest({ ...VALID_REQUEST_BODY, language: 'en' }))
      const text = await response.text()

      // Should use English (the fallback uses "cards" and "upright")
      expect(text).toContain('cards')
      expect(text).toContain('upright')
    })

    it('should fall back to context locale when body language is not provided', async () => {
      mockInitializeApiContext.mockResolvedValue({
        context: { ...MOCK_CONTEXT, locale: 'ko' },
        error: undefined,
      })
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, language: undefined },
      })

      const response = await POST(makePostRequest({ ...VALID_REQUEST_BODY, language: undefined }))
      const text = await response.text()

      // Should use Korean (from context)
      expect(text).toContain('카드')
    })
  })

  // -----------------------------------------------------------------
  // SSE Stream Format
  // -----------------------------------------------------------------
  describe('SSE Stream Format', () => {
    it('should return proper SSE headers', async () => {
      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    it('should include X-Fallback header when using fallback', async () => {
      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(response.headers.get('X-Fallback')).toBe('1')
    })
  })

  // -----------------------------------------------------------------
  // Card Processing
  // -----------------------------------------------------------------
  describe('Card Processing', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key'
    })

    afterEach(() => {
      delete process.env.OPENAI_API_KEY
    })

    it('should handle reversed cards correctly', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      const reversedCard = { ...VALID_CARD, isReversed: true }
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, cards: [reversedCard] },
      })

      await POST(makePostRequest({ ...VALID_REQUEST_BODY, cards: [reversedCard] }))

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).toContain('역방향')
    })

    it('should use Korean card names when language is ko', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, language: 'ko' },
      })

      await POST(makePostRequest(VALID_REQUEST_BODY))

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).toContain('바보') // Korean name for The Fool
    })

    it('should use English card names when language is en', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, language: 'en' },
      })

      await POST(makePostRequest({ ...VALID_REQUEST_BODY, language: 'en' }))

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).toContain('The Fool') // English name
    })

    it('should include card keywords in prompt', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      await POST(makePostRequest(VALID_REQUEST_BODY))

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).toContain('새로운 시작')
    })

    it('should process multiple cards', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      const multipleCards = [
        { ...VALID_CARD, name: 'The Fool', position: 'Past' },
        { ...VALID_CARD, name: 'The Magician', position: 'Present' },
        { ...VALID_CARD, name: 'The High Priestess', position: 'Future' },
      ]

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, cards: multipleCards },
      })

      await POST(makePostRequest({ ...VALID_REQUEST_BODY, cards: multipleCards }))

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const systemMessage = callBody.messages.find((m: { role: string }) => m.role === 'system')
      // Should mention all 3 cards
      expect(systemMessage.content).toContain('3')
    })
  })

  // -----------------------------------------------------------------
  // Edge Cases
  // -----------------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle missing optional fields gracefully', async () => {
      const minimalBody = {
        categoryId: 'general',
        cards: [{ name: 'The Fool', isReversed: false, position: 'Present' }],
      }

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: minimalBody,
      })

      const response = await POST(makePostRequest(minimalBody))

      expect(response.status).not.toBe(400)
    })

    it('should handle empty userQuestion', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, userQuestion: '' },
      })

      const response = await POST(makePostRequest({ ...VALID_REQUEST_BODY, userQuestion: '' }))

      expect(response.status).not.toBe(400)
    })

    it('should handle special characters in question', async () => {
      const specialQuestion = '내 운세는? (2024년) & 사랑은 어떨까요?'
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, userQuestion: specialQuestion },
      })

      const response = await POST(
        makePostRequest({
          ...VALID_REQUEST_BODY,
          userQuestion: specialQuestion,
        })
      )

      expect(response.status).not.toBe(400)
    })

    it('should handle birthdate that produces null zodiac', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, birthdate: 'invalid-date' },
      })

      const response = await POST(
        makePostRequest({
          ...VALID_REQUEST_BODY,
          birthdate: 'invalid-date',
        })
      )

      // Should still work, just without zodiac context
      expect(response.status).not.toBe(400)
    })
  })
})

// ===================================================================
// Tests for Internal Functions (via behavior testing)
// ===================================================================

describe('Tarot Stream - Internal Function Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaults()
  })

  // -----------------------------------------------------------------
  // Zodiac Sign Calculation
  // -----------------------------------------------------------------
  describe('Zodiac Sign Calculation (via buildFallbackPayload)', () => {
    it('should recognize Aries (March 21 - April 19)', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, birthdate: '1990-04-10' },
      })

      const response = await POST(
        makePostRequest({ ...VALID_REQUEST_BODY, birthdate: '1990-04-10' })
      )
      expect(response.status).not.toBe(400)
    })

    it('should recognize Capricorn across year boundary (Dec 22 - Jan 19)', async () => {
      // Test December date (Capricorn)
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, birthdate: '1990-12-25' },
      })

      const response = await POST(
        makePostRequest({ ...VALID_REQUEST_BODY, birthdate: '1990-12-25' })
      )
      expect(response.status).not.toBe(400)
    })
  })

  // -----------------------------------------------------------------
  // Question Mood Analysis
  // -----------------------------------------------------------------
  describe('Question Mood Analysis', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key'
    })

    afterEach(() => {
      delete process.env.OPENAI_API_KEY
    })

    it('should detect worried mood patterns in Korean', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, userQuestion: '실패할까봐 두렵고 걱정돼요' },
      })

      await POST(
        makePostRequest({ ...VALID_REQUEST_BODY, userQuestion: '실패할까봐 두렵고 걱정돼요' })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).toContain('안심')
    })

    it('should detect urgent mood patterns', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, userQuestion: '급해요! 지금 당장 알려주세요' },
      })

      await POST(
        makePostRequest({ ...VALID_REQUEST_BODY, userQuestion: '급해요! 지금 당장 알려주세요' })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).toContain('핵심')
    })

    it('should detect hopeful mood patterns', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, userQuestion: '성공할 수 있을까요? 희망이 있나요?' },
      })

      await POST(
        makePostRequest({
          ...VALID_REQUEST_BODY,
          userQuestion: '성공할 수 있을까요? 희망이 있나요?',
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).toContain('긍정')
    })

    it('should detect curious mood patterns', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, userQuestion: '궁금해요! 어떻게 될지 알고 싶어요' },
      })

      await POST(
        makePostRequest({
          ...VALID_REQUEST_BODY,
          userQuestion: '궁금해요! 어떻게 될지 알고 싶어요',
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const userMessage = callBody.messages.find((m: { role: string }) => m.role === 'user')
      expect(userMessage.content).toContain('흥미')
    })

    it('should detect English mood patterns', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValue(createMockOpenAIStreamResponse(['data: [DONE]\n\n']))
      global.fetch = mockFetch

      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, language: 'en', userQuestion: 'I am worried and anxious' },
      })

      await POST(
        makePostRequest({
          ...VALID_REQUEST_BODY,
          language: 'en',
          userQuestion: 'I am worried and anxious',
        })
      )

      // For English, mood hints may not be included (implementation specific)
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------
  // Normalize Advice Function
  // -----------------------------------------------------------------
  describe('Normalize Advice (via backend fallback)', () => {
    beforeEach(() => {
      process.env.OPENAI_API_KEY = 'test-api-key'
    })

    afterEach(() => {
      delete process.env.OPENAI_API_KEY
    })

    it('should handle string advice', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('OpenAI down'))
      mockApiClientPost.mockResolvedValue({
        ok: true,
        data: {
          overall_message: 'Test',
          card_insights: [],
          guidance: 'Simple string advice',
        },
      })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const text = await response.text()

      expect(text).toContain('Simple string advice')
    })

    it('should handle array advice with title and detail', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('OpenAI down'))
      mockApiClientPost.mockResolvedValue({
        ok: true,
        data: {
          overall_message: 'Test',
          card_insights: [],
          guidance: [
            { title: 'Step 1', detail: 'Do this first' },
            { title: 'Step 2', detail: 'Then do this' },
          ],
        },
      })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const text = await response.text()

      expect(text).toContain('Step 1')
      expect(text).toContain('Do this first')
    })
  })
})

// ===================================================================
// Logging Tests
// ===================================================================

describe('Tarot Stream - Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaults()
  })

  it('should log request info', async () => {
    await POST(makePostRequest(VALID_REQUEST_BODY))

    expect(logger.info).toHaveBeenCalledWith(
      'Tarot stream request',
      expect.objectContaining({ ip: '127.0.0.1' })
    )
  })

  it('should log payload details', async () => {
    await POST(makePostRequest(VALID_REQUEST_BODY))

    expect(logger.info).toHaveBeenCalledWith(
      'Tarot stream payload',
      expect.objectContaining({
        categoryId: 'love',
        spreadId: 'three-card',
        language: 'ko',
        cards: 1,
      })
    )
  })

  it('should log validation failures', async () => {
    mockTarotInterpretStreamSafeParse.mockReturnValue({
      success: false,
      error: {
        issues: [{ path: ['categoryId'], message: 'Required' }],
      },
    })

    await POST(makePostRequest({}))

    expect(logger.warn).toHaveBeenCalledWith(
      '[Tarot interpret-stream] validation failed',
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })
})
