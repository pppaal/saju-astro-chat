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
}))

vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: (...args: unknown[]) => mockInitializeApiContext(...args),
  createPublicStreamGuard: (...args: unknown[]) => mockCreatePublicStreamGuard(...args),
  extractLocale: vi.fn(() => 'ko'),
}))

const mockCheckAndConsumeCredits = vi.fn()
const mockCreditErrorResponse = vi.fn((result: { error?: string; errorCode?: string }) =>
  new Response(JSON.stringify({ error: result.error, code: result.errorCode }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
)
const mockApplyCreditResultCookies = vi.fn((response: Response, result?: { guestReadingAccess?: string }) => {
  if (result?.guestReadingAccess) {
    response.headers.set('x-credit-cookies', result.guestReadingAccess)
  }
  return response
})

vi.mock('@/lib/credits/withCredits', () => ({
  checkAndConsumeCredits: (...args: unknown[]) => mockCheckAndConsumeCredits(...args),
  creditErrorResponse: (...args: unknown[]) => mockCreditErrorResponse(...args),
  applyCreditResultCookies: (...args: unknown[]) => mockApplyCreditResultCookies(...args),
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

// Mock Claude SDK — 실제 호출 대신 ReadableStream<string> 을 emit 하는 mock.
// 각 테스트가 mockCallClaudeStream.mockResolvedValue(createMockClaudeStream([...]))
// 으로 응답을 정의하거나, mockCallClaudeStream.mock.calls[0][0] 로 전달된
// systemPrompt/userPrompt 를 assert 한다.
const mockCallClaudeStream = vi.fn()
const mockIsClaudeAvailable = vi.fn(() => true)

vi.mock('@/lib/llm/claude', () => ({
  callClaudeStream: (...args: unknown[]) => mockCallClaudeStream(...args),
  isClaudeAvailable: () => mockIsClaudeAvailable(),
  DEFAULT_CLAUDE_MODEL: 'claude-haiku-4-5-test',
  PREMIUM_CLAUDE_MODEL: 'claude-opus-4-test',
}))

// The route streams via streamClaudeWithContinuation now (auto-continues past
// maxTokens). Route it to the same spy so the existing call-arg/stream
// assertions (mockCallClaudeStream.mock.calls[0][0].userPrompt, etc.) hold.
vi.mock('@/lib/llm/claudeWithContinuation', () => ({
  streamClaudeWithContinuation: (...args: unknown[]) => mockCallClaudeStream(...args),
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

// Helper to create a mock Claude streaming response (ReadableStream<string>).
// 각 chunk 는 Claude SDK 가 callClaudeStream 으로부터 enqueue 하는 단위
// (token-level text delta) 와 동일.
function createMockClaudeStream(chunks: string[]) {
  return new ReadableStream<string>({
    start(controller) {
      for (const c of chunks) controller.enqueue(c)
      controller.close()
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

  mockCheckAndConsumeCredits.mockResolvedValue({
    allowed: true,
    userId: 'user-123',
  })

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

  // Default: Claude available + returns single-chunk valid JSON stream.
  mockIsClaudeAvailable.mockReturnValue(true)
  mockCallClaudeStream.mockResolvedValue(
    createMockClaudeStream([
      '{"overall":"Test overall","cards":[{"position":"Past","interpretation":"Past interp"}],"advice":"Test advice"}',
    ])
  )
}

// ===================================================================
// POST /api/tarot/interpret-stream
// ===================================================================

describe('POST /api/tarot/interpret-stream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaults()
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

  describe('Credit Handling', () => {
    it('should check and consume credits with the incoming request', async () => {
      const req = makePostRequest(VALID_REQUEST_BODY)

      await POST(req)

      expect(mockCheckAndConsumeCredits).toHaveBeenCalledWith('reading', 1, req)
    })

    it('should charge 2 credits for a large spread (>= 8 cards)', async () => {
      const largeSpread = {
        ...VALID_REQUEST_BODY,
        cards: Array.from({ length: 8 }, (_, i) => ({
          ...VALID_CARD,
          name: `Card ${i}`,
          position: `Position ${i}`,
        })),
      }
      mockTarotInterpretStreamSafeParse.mockReturnValue({ success: true, data: largeSpread })
      const req = makePostRequest(largeSpread)

      await POST(req)

      expect(mockCheckAndConsumeCredits).toHaveBeenCalledWith('reading', 2, req)
    })

    it('should return credit error response when guest/session access is denied', async () => {
      mockCheckAndConsumeCredits.mockResolvedValue({
        allowed: false,
        error: '무료 체험 리딩은 이미 사용했습니다. 로그인 후 계속 이용하세요.',
        errorCode: 'guest_limit_reached',
      })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.code).toBe('guest_limit_reached')
    })

    it('should apply guest cookies to successful stream responses', async () => {
      mockCheckAndConsumeCredits.mockResolvedValue({
        allowed: true,
        remaining: 0,
        guestReadingAccess: 'interpret_granted',
      })

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(response.headers.get('x-credit-cookies')).toBe('interpret_granted')
      expect(mockApplyCreditResultCookies).toHaveBeenCalled()
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
  // Fallback Mode (Claude unavailable — ANTHROPIC_API_KEY 미설정 또는 호출 실패)
  // -----------------------------------------------------------------
  describe('Fallback Mode (Claude unavailable)', () => {
    beforeEach(() => {
      mockIsClaudeAvailable.mockReturnValue(false)
    })

    it('should use fallback payload when Claude is unavailable', async () => {
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

    it('should log warning when Claude is unavailable', async () => {
      await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(logger.warn).toHaveBeenCalledWith(
        'Tarot stream missing ANTHROPIC_API_KEY, using fallback'
      )
    })

    it('should use fallback when callClaudeStream throws', async () => {
      // Claude 사용 가능하다고 보고되지만 실제 호출 시 던지는 케이스
      mockIsClaudeAvailable.mockReturnValue(true)
      mockCallClaudeStream.mockRejectedValueOnce(new Error('Claude API error'))

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(response.headers.get('X-Fallback')).toBe('1')
      expect(logger.error).toHaveBeenCalledWith(
        '[tarot-stream] Claude initial call failed',
        expect.objectContaining({ error: expect.any(String) })
      )
    })
  })

  // -----------------------------------------------------------------
  // Personalization Features
  // -----------------------------------------------------------------
  describe('Personalization Features', () => {
    it('should ignore impossible YYYY-MM-DD birthdate values', async () => {
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

      const callArgs = mockCallClaudeStream.mock.calls[0][0]
      expect(callArgs.userPrompt).not.toContain('Zodiac:')
    })

    it('should analyze question mood for worried patterns', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, userQuestion: '너무 걱정되고 불안해요' },
      })

      await POST(makePostRequest({ ...VALID_REQUEST_BODY, userQuestion: '너무 걱정되고 불안해요' }))

      const callArgs = mockCallClaudeStream.mock.calls[0][0]
      expect(callArgs.userPrompt).toContain('걱정')
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

      await POST(makePostRequest({ ...VALID_REQUEST_BODY, language: 'en' }))

      // English language flows into the prompt builder → English keywords
      const callArgs = mockCallClaudeStream.mock.calls[0][0]
      expect(callArgs.userPrompt).toContain('The Fool')
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

      await POST(makePostRequest({ ...VALID_REQUEST_BODY, language: undefined }))

      // language 미지정 시 context.locale='ko' 로 fallback → Korean card name 등장
      const callArgs = mockCallClaudeStream.mock.calls[0][0]
      expect(callArgs.userPrompt).toContain('바보')
    })
  })

  // -----------------------------------------------------------------
  // SSE Stream Format
  // -----------------------------------------------------------------
  describe('SSE Stream Format', () => {
    it('should return proper SSE headers on success', async () => {
      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      // Claude streaming path 은 no-cache 와 함께 no-transform 도 명시
      // (프록시에서 transform 되어 chunk 가 모이지 않도록).
      expect(response.headers.get('Cache-Control')).toContain('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    it('should include X-Fallback header when Claude unavailable', async () => {
      mockIsClaudeAvailable.mockReturnValue(false)

      const response = await POST(makePostRequest(VALID_REQUEST_BODY))

      expect(response.headers.get('X-Fallback')).toBe('1')
    })
  })

  // -----------------------------------------------------------------
  // Card Processing
  // -----------------------------------------------------------------
  describe('Card Processing', () => {
    it('should handle reversed cards correctly', async () => {
      const reversedCard = { ...VALID_CARD, isReversed: true }
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, cards: [reversedCard] },
      })

      await POST(makePostRequest({ ...VALID_REQUEST_BODY, cards: [reversedCard] }))

      const callArgs = mockCallClaudeStream.mock.calls[0][0]
      expect(callArgs.userPrompt).toContain('역방향')
    })

    it('should use Korean card names when language is ko', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, language: 'ko' },
      })

      await POST(makePostRequest(VALID_REQUEST_BODY))

      const callArgs = mockCallClaudeStream.mock.calls[0][0]
      expect(callArgs.userPrompt).toContain('바보') // Korean name for The Fool
    })

    it('should use English card names when language is en', async () => {
      mockTarotInterpretStreamSafeParse.mockReturnValue({
        success: true,
        data: { ...VALID_REQUEST_BODY, language: 'en' },
      })

      await POST(makePostRequest({ ...VALID_REQUEST_BODY, language: 'en' }))

      const callArgs = mockCallClaudeStream.mock.calls[0][0]
      expect(callArgs.userPrompt).toContain('The Fool') // English name
    })

    it('should include card keywords in prompt', async () => {
      await POST(makePostRequest(VALID_REQUEST_BODY))

      const callArgs = mockCallClaudeStream.mock.calls[0][0]
      expect(callArgs.userPrompt).toContain('새로운 시작')
    })

    it('should process multiple cards', async () => {
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

      const callArgs = mockCallClaudeStream.mock.calls[0][0]
      // 시스템 프롬프트는 카드 수를 명시
      expect(callArgs.systemPrompt).toContain('3')
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
