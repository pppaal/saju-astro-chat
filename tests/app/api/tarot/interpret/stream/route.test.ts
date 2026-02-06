// tests/app/api/tarot/interpret/stream/route.test.ts
// Comprehensive tests for the tarot interpretation streaming API

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks - all vi.mock calls MUST appear before importing the route handler
// ---------------------------------------------------------------------------

// Mock SSE stream proxy
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

// Mock middleware
const mockWithApiMiddleware = vi.fn()
const mockCreatePublicStreamGuard = vi.fn()

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: (handler: any, guard: any) => {
    mockWithApiMiddleware(handler, guard)
    // Return the actual handler for testing - this allows us to test the route logic
    return async (req: NextRequest) => {
      // Simulate middleware passing context
      const mockContext = {
        userId: 'test-user-123',
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
      }
      return handler(req, mockContext)
    }
  },
  createPublicStreamGuard: (...args: unknown[]) => {
    mockCreatePublicStreamGuard(...args)
    return {
      route: 'tarot-interpret-stream',
      requireToken: true,
      rateLimit: { limit: 10, windowSeconds: 60 },
      credits: { type: 'reading', amount: 1 },
    }
  },
  extractLocale: vi.fn(() => 'ko'),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock TarotInterpretSchema from validator
const mockSafeParse = vi.fn()

vi.mock('@/lib/api/validator', () => ({
  TarotInterpretSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
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

// Mock zodValidation
vi.mock('@/lib/api/zodValidation', () => ({
  createValidationErrorResponse: vi.fn((error: any, options?: any) => {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', status: 422, details: error.issues },
      }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    )
  }),
}))

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

const VALID_TAROT_CARDS = [
  { name: 'The Fool', isReversed: false, position: 'Past' },
  { name: 'The Magician', isReversed: true, position: 'Present' },
  { name: 'The High Priestess', isReversed: false, position: 'Future' },
]

const VALID_REQUEST_BODY = {
  category: 'love',
  spreadId: 'three_card',
  spreadTitle: 'Love Reading',
  cards: VALID_TAROT_CARDS,
  userQuestion: 'What does my love life look like?',
  language: 'ko',
}

const MOCK_PARSED_DATA = {
  category: 'love',
  spreadId: 'three_card',
  spreadTitle: 'Love Reading',
  cards: VALID_TAROT_CARDS,
  userQuestion: 'What does my love life look like?',
  language: 'ko',
}

function createPostRequest(
  body: unknown,
  headers?: Record<string, string>
): NextRequest {
  return new NextRequest('http://localhost:3000/api/tarot/interpret/stream', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

function createMockSSEResponse(): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"content": "Test interpretation"}\n\n'))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

function setupDefaultMocks() {
  mockSafeParse.mockReturnValue({
    success: true,
    data: MOCK_PARSED_DATA,
  })

  mockPostSSEStream.mockResolvedValue({
    ok: true,
    response: createMockSSEResponse(),
  })

  mockCreateSSEStreamProxy.mockReturnValue(
    new Response('stream', {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    })
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/tarot/interpret/stream', () => {
  let POST: (request: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    setupDefaultMocks()

    // Import the route handler fresh to pick up mocks
    const routeModule = await import('@/app/api/tarot/interpret/stream/route')
    POST = routeModule.POST
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // Route Configuration Tests
  // =========================================================================
  describe('Route Configuration', () => {
    it('should configure middleware with createPublicStreamGuard', async () => {
      expect(mockCreatePublicStreamGuard).toHaveBeenCalledWith({
        route: 'tarot-interpret-stream',
        limit: 10,
        windowSeconds: 60,
        requireCredits: true,
        creditType: 'reading',
        creditAmount: 1,
      })
    })

    it('should use withApiMiddleware wrapper', async () => {
      expect(mockWithApiMiddleware).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Input Validation Tests
  // =========================================================================
  describe('Input Validation', () => {
    it('should return 400 for invalid JSON body', async () => {
      const invalidRequest = new NextRequest(
        'http://localhost:3000/api/tarot/interpret/stream',
        {
          method: 'POST',
          body: 'not valid json',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      const response = await POST(invalidRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('BAD_REQUEST')
    })

    it('should return 422 when Zod validation fails', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['cards'], message: 'Required' },
            { path: ['category'], message: 'String must contain at least 1 character(s)' },
          ],
        },
      })

      const req = createPostRequest({})
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when cards array is empty', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['cards'], message: 'Array must contain at least 1 element(s)' },
          ],
        },
      })

      const req = createPostRequest({ ...VALID_REQUEST_BODY, cards: [] })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when cards array exceeds limit (15)', async () => {
      const tooManyCards = Array.from({ length: 20 }, (_, i) => ({
        name: `Card ${i}`,
        isReversed: false,
        position: `Position ${i}`,
      }))

      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['cards'], message: 'Array must contain at most 15 element(s)' },
          ],
        },
      })

      const req = createPostRequest({ ...VALID_REQUEST_BODY, cards: tooManyCards })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when card name is missing', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['cards', 0, 'name'], message: 'Required' },
          ],
        },
      })

      const invalidCards = [{ isReversed: false, position: 'Past' }]
      const req = createPostRequest({ ...VALID_REQUEST_BODY, cards: invalidCards })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when card name exceeds max length (400)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['cards', 0, 'name'], message: 'String must contain at most 400 character(s)' },
          ],
        },
      })

      const longName = 'A'.repeat(500)
      const invalidCards = [{ name: longName, isReversed: false }]
      const req = createPostRequest({ ...VALID_REQUEST_BODY, cards: invalidCards })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when category exceeds max length (64)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['category'], message: 'String must contain at most 64 character(s)' },
          ],
        },
      })

      const longCategory = 'A'.repeat(100)
      const req = createPostRequest({ ...VALID_REQUEST_BODY, category: longCategory })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when userQuestion exceeds max length (600)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['userQuestion'], message: 'String must contain at most 600 character(s)' },
          ],
        },
      })

      const longQuestion = 'A'.repeat(800)
      const req = createPostRequest({ ...VALID_REQUEST_BODY, userQuestion: longQuestion })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when spreadTitle exceeds max length (200)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['spreadTitle'], message: 'String must contain at most 200 character(s)' },
          ],
        },
      })

      const longTitle = 'A'.repeat(300)
      const req = createPostRequest({ ...VALID_REQUEST_BODY, spreadTitle: longTitle })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when position exceeds max length (80)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['cards', 0, 'position'], message: 'String must contain at most 80 character(s)' },
          ],
        },
      })

      const invalidCards = [
        { name: 'The Fool', isReversed: false, position: 'A'.repeat(100) },
      ]
      const req = createPostRequest({ ...VALID_REQUEST_BODY, cards: invalidCards })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should accept valid request with all required fields', async () => {
      const req = createPostRequest(VALID_REQUEST_BODY)
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(mockPostSSEStream).toHaveBeenCalled()
    })

    it('should accept valid request with optional fields omitted', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          category: 'general',
          spreadId: 'single_card',
          cards: [{ name: 'The Fool', isReversed: false }],
          language: 'ko',
        },
      })

      const minimalRequest = {
        cards: [{ name: 'The Fool', isReversed: false }],
      }

      const req = createPostRequest(minimalRequest)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should default language to ko when not provided', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          ...MOCK_PARSED_DATA,
          language: 'ko', // Default value
        },
      })

      const bodyWithoutLanguage = { ...VALID_REQUEST_BODY }
      delete (bodyWithoutLanguage as any).language

      const req = createPostRequest(bodyWithoutLanguage)
      await POST(req)

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          language: 'ko',
        }),
        expect.any(Object)
      )
    })

    it('should accept en language', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          ...MOCK_PARSED_DATA,
          language: 'en',
        },
      })

      const req = createPostRequest({ ...VALID_REQUEST_BODY, language: 'en' })
      await POST(req)

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          language: 'en',
        }),
        expect.any(Object)
      )
    })
  })

  // =========================================================================
  // Backend API Call Tests
  // =========================================================================
  describe('Backend API Call', () => {
    it('should call backend with correct endpoint', async () => {
      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('should format cards correctly for backend', async () => {
      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          context: expect.objectContaining({
            cards: [
              { name: 'The Fool', is_reversed: false, position: 'Past' },
              { name: 'The Magician', is_reversed: true, position: 'Present' },
              { name: 'The High Priestess', is_reversed: false, position: 'Future' },
            ],
          }),
        }),
        expect.any(Object)
      )
    })

    it('should include category in context', async () => {
      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          context: expect.objectContaining({
            category: 'love',
          }),
        }),
        expect.any(Object)
      )
    })

    it('should include spread_title in context', async () => {
      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          context: expect.objectContaining({
            spread_title: 'Love Reading',
          }),
        }),
        expect.any(Object)
      )
    })

    it('should generate default spread_title when not provided', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          ...MOCK_PARSED_DATA,
          spreadTitle: undefined,
        },
      })

      const bodyWithoutTitle = { ...VALID_REQUEST_BODY }
      delete (bodyWithoutTitle as any).spreadTitle

      const req = createPostRequest(bodyWithoutTitle)
      await POST(req)

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          context: expect.objectContaining({
            spread_title: 'love spread', // Generated from category
          }),
        }),
        expect.any(Object)
      )
    })

    it('should use userQuestion as message content', async () => {
      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'What does my love life look like?' },
          ],
        }),
        expect.any(Object)
      )
    })

    it('should use "general reading" when userQuestion is not provided', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          ...MOCK_PARSED_DATA,
          userQuestion: undefined,
        },
      })

      const bodyWithoutQuestion = { ...VALID_REQUEST_BODY }
      delete (bodyWithoutQuestion as any).userQuestion

      const req = createPostRequest(bodyWithoutQuestion)
      await POST(req)

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          messages: [
            { role: 'user', content: 'general reading' },
          ],
        }),
        expect.any(Object)
      )
    })

    it('should set timeout to 20000ms', async () => {
      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { timeout: 20000 }
      )
    })

    it('should include counselorId when provided', async () => {
      const bodyWithCounselor = {
        ...VALID_REQUEST_BODY,
        counselorId: 'counselor-123',
      }

      const req = createPostRequest(bodyWithCounselor)
      await POST(req)

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          counselor_id: 'counselor-123',
        }),
        expect.any(Object)
      )
    })

    it('should include counselorStyle when provided', async () => {
      const bodyWithStyle = {
        ...VALID_REQUEST_BODY,
        counselorStyle: 'mystical',
      }

      const req = createPostRequest(bodyWithStyle)
      await POST(req)

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          counselor_style: 'mystical',
        }),
        expect.any(Object)
      )
    })

    it('should not include counselorId if not a string', async () => {
      const bodyWithInvalidCounselor = {
        ...VALID_REQUEST_BODY,
        counselorId: 123, // Not a string
      }

      const req = createPostRequest(bodyWithInvalidCounselor)
      await POST(req)

      const callArgs = mockPostSSEStream.mock.calls[0]
      expect(callArgs[1].counselor_id).toBeUndefined()
    })

    it('should not include counselorStyle if not a string', async () => {
      const bodyWithInvalidStyle = {
        ...VALID_REQUEST_BODY,
        counselorStyle: { type: 'mystical' }, // Not a string
      }

      const req = createPostRequest(bodyWithInvalidStyle)
      await POST(req)

      const callArgs = mockPostSSEStream.mock.calls[0]
      expect(callArgs[1].counselor_style).toBeUndefined()
    })
  })

  // =========================================================================
  // Streaming Response Tests
  // =========================================================================
  describe('Streaming Response', () => {
    it('should return SSE stream proxy on success', async () => {
      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(mockCreateSSEStreamProxy).toHaveBeenCalledWith({
        source: expect.any(Object),
        route: 'TarotInterpretStream',
      })
    })

    it('should pass backend response as source', async () => {
      const mockResponse = createMockSSEResponse()
      mockPostSSEStream.mockResolvedValue({
        ok: true,
        response: mockResponse,
      })

      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(mockCreateSSEStreamProxy).toHaveBeenCalledWith({
        source: mockResponse,
        route: 'TarotInterpretStream',
      })
    })
  })

  // =========================================================================
  // Error Handling Tests
  // =========================================================================
  describe('Error Handling', () => {
    it('should return 502 error response when backend returns error', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        status: 500,
        error: 'Internal server error',
      })

      const req = createPostRequest(VALID_REQUEST_BODY)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error.code).toBe('BACKEND_ERROR')
    })

    it('should return 502 when backend returns no status', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        status: undefined,
        error: 'Connection failed',
      })

      const req = createPostRequest(VALID_REQUEST_BODY)
      const response = await POST(req)

      expect(response.status).toBe(502)
    })

    it('should return 502 when backend returns 503', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        status: 503,
        error: 'Service unavailable',
      })

      const req = createPostRequest(VALID_REQUEST_BODY)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error.code).toBe('BACKEND_ERROR')
    })

    it('should return 502 when backend returns rate limit error', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        status: 429,
        error: 'Rate limit exceeded',
      })

      const req = createPostRequest(VALID_REQUEST_BODY)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(502)
      expect(data.error.code).toBe('BACKEND_ERROR')
    })

    it('should log error when backend fails', async () => {
      const { logger } = await import('@/lib/logger')

      mockPostSSEStream.mockResolvedValue({
        ok: false,
        status: 500,
        error: 'Backend error message',
      })

      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(logger.error).toHaveBeenCalledWith(
        '[TarotInterpretStream] Backend error:',
        expect.objectContaining({
          status: 500,
          error: 'Backend error message',
        })
      )
    })
  })

  // =========================================================================
  // Card Transformation Tests
  // =========================================================================
  describe('Card Data Transformation', () => {
    it('should transform isReversed to is_reversed', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          ...MOCK_PARSED_DATA,
          cards: [
            { name: 'The Fool', isReversed: true, position: 'Center' },
          ],
        },
      })

      const req = createPostRequest({
        cards: [{ name: 'The Fool', isReversed: true, position: 'Center' }],
      })
      await POST(req)

      const callArgs = mockPostSSEStream.mock.calls[0]
      expect(callArgs[1].context.cards[0]).toEqual({
        name: 'The Fool',
        is_reversed: true,
        position: 'Center',
      })
    })

    it('should handle empty position string', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          ...MOCK_PARSED_DATA,
          cards: [
            { name: 'The Fool', isReversed: false, position: '' },
          ],
        },
      })

      const req = createPostRequest({
        cards: [{ name: 'The Fool', isReversed: false, position: '' }],
      })
      await POST(req)

      const callArgs = mockPostSSEStream.mock.calls[0]
      expect(callArgs[1].context.cards[0].position).toBe('')
    })

    it('should handle undefined position', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          ...MOCK_PARSED_DATA,
          cards: [
            { name: 'The Fool', isReversed: false },
          ],
        },
      })

      const req = createPostRequest({
        cards: [{ name: 'The Fool', isReversed: false }],
      })
      await POST(req)

      const callArgs = mockPostSSEStream.mock.calls[0]
      expect(callArgs[1].context.cards[0].position).toBe('')
    })

    it('should transform multiple cards correctly', async () => {
      const multipleCards = [
        { name: 'The Sun', isReversed: false, position: '1' },
        { name: 'The Moon', isReversed: true, position: '2' },
        { name: 'The Star', isReversed: false, position: '3' },
        { name: 'The Tower', isReversed: true, position: '4' },
        { name: 'The World', isReversed: false, position: '5' },
      ]

      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          ...MOCK_PARSED_DATA,
          cards: multipleCards,
        },
      })

      const req = createPostRequest({ cards: multipleCards })
      await POST(req)

      const callArgs = mockPostSSEStream.mock.calls[0]
      expect(callArgs[1].context.cards).toHaveLength(5)
      expect(callArgs[1].context.cards[0].is_reversed).toBe(false)
      expect(callArgs[1].context.cards[1].is_reversed).toBe(true)
      expect(callArgs[1].context.cards[4].is_reversed).toBe(false)
    })
  })

  // =========================================================================
  // Context Structure Tests
  // =========================================================================
  describe('Backend Context Structure', () => {
    it('should include empty overall_message in context', async () => {
      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      const callArgs = mockPostSSEStream.mock.calls[0]
      expect(callArgs[1].context.overall_message).toBe('')
    })

    it('should include empty guidance in context', async () => {
      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      const callArgs = mockPostSSEStream.mock.calls[0]
      expect(callArgs[1].context.guidance).toBe('')
    })

    it('should structure context object correctly', async () => {
      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      const callArgs = mockPostSSEStream.mock.calls[0]
      expect(callArgs[1].context).toEqual({
        category: 'love',
        spread_title: 'Love Reading',
        cards: expect.any(Array),
        overall_message: '',
        guidance: '',
      })
    })
  })

  // =========================================================================
  // Integration-like Tests
  // =========================================================================
  describe('Integration', () => {
    it('should complete full flow: validate -> call backend -> return stream', async () => {
      const req = createPostRequest(VALID_REQUEST_BODY)
      const response = await POST(req)

      // Validation was called
      expect(mockSafeParse).toHaveBeenCalledWith(VALID_REQUEST_BODY)

      // Backend was called
      expect(mockPostSSEStream).toHaveBeenCalled()

      // Stream proxy was created
      expect(mockCreateSSEStreamProxy).toHaveBeenCalled()

      // Response is successful
      expect(response.status).toBe(200)
    })

    it('should handle Korean language request', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          category: '연애',
          spreadId: 'three_card',
          spreadTitle: '연애 운세',
          cards: [
            { name: '바보', isReversed: false, position: '과거' },
            { name: '마법사', isReversed: true, position: '현재' },
            { name: '여사제', isReversed: false, position: '미래' },
          ],
          userQuestion: '내 연애운은 어떨까요?',
          language: 'ko',
        },
      })

      const koreanRequest = {
        category: '연애',
        spreadTitle: '연애 운세',
        cards: [
          { name: '바보', isReversed: false, position: '과거' },
          { name: '마법사', isReversed: true, position: '현재' },
          { name: '여사제', isReversed: false, position: '미래' },
        ],
        userQuestion: '내 연애운은 어떨까요?',
        language: 'ko',
      }

      const req = createPostRequest(koreanRequest)
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          language: 'ko',
          context: expect.objectContaining({
            category: '연애',
          }),
        }),
        expect.any(Object)
      )
    })

    it('should handle English language request', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          ...MOCK_PARSED_DATA,
          language: 'en',
        },
      })

      const englishRequest = {
        ...VALID_REQUEST_BODY,
        language: 'en',
      }

      const req = createPostRequest(englishRequest)
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          language: 'en',
        }),
        expect.any(Object)
      )
    })

    it('should handle single card spread', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          category: 'daily',
          spreadId: 'single',
          cards: [{ name: 'The Star', isReversed: false }],
          language: 'ko',
        },
      })

      const singleCardRequest = {
        category: 'daily',
        spreadId: 'single',
        cards: [{ name: 'The Star', isReversed: false }],
      }

      const req = createPostRequest(singleCardRequest)
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/api/tarot/chat-stream',
        expect.objectContaining({
          context: expect.objectContaining({
            cards: [{ name: 'The Star', is_reversed: false, position: '' }],
          }),
        }),
        expect.any(Object)
      )
    })

    it('should handle Celtic Cross spread (10 cards)', async () => {
      const celticCrossCards = [
        { name: 'The Present', isReversed: false, position: '1' },
        { name: 'The Challenge', isReversed: true, position: '2' },
        { name: 'The Past', isReversed: false, position: '3' },
        { name: 'The Future', isReversed: false, position: '4' },
        { name: 'Above', isReversed: true, position: '5' },
        { name: 'Below', isReversed: false, position: '6' },
        { name: 'Advice', isReversed: false, position: '7' },
        { name: 'External Influences', isReversed: true, position: '8' },
        { name: 'Hopes and Fears', isReversed: false, position: '9' },
        { name: 'Outcome', isReversed: false, position: '10' },
      ]

      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          category: 'life',
          spreadId: 'celtic_cross',
          spreadTitle: 'Celtic Cross Reading',
          cards: celticCrossCards,
          language: 'en',
        },
      })

      const req = createPostRequest({
        category: 'life',
        spreadId: 'celtic_cross',
        cards: celticCrossCards,
      })
      const response = await POST(req)

      expect(response.status).toBe(200)
      const callArgs = mockPostSSEStream.mock.calls[0]
      expect(callArgs[1].context.cards).toHaveLength(10)
    })
  })
})

// =========================================================================
// Route Export Tests
// =========================================================================
describe('Route Exports', () => {
  it('should export POST handler', async () => {
    vi.resetModules()

    const module = await import('@/app/api/tarot/interpret/stream/route')

    expect(typeof module.POST).toBe('function')
  })
})
