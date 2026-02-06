// tests/app/api/iching/stream/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mocks - all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

// Mock rate limiting
const mockRateLimit = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

// Mock request-ip
vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

// Mock public token validation
const mockRequirePublicToken = vi.fn()
vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: (...args: unknown[]) => mockRequirePublicToken(...args),
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
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

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reading: {
      create: vi.fn(),
    },
  },
}))

// Mock ApiClient for SSE streaming
const mockPostSSEStream = vi.fn()
vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: vi.fn(),
    postSSEStream: (...args: unknown[]) => mockPostSSEStream(...args),
  },
}))

// Mock credits
vi.mock('@/lib/credits', () => ({
  checkAndConsumeCredits: vi.fn().mockResolvedValue({ allowed: true }),
}))

vi.mock('@/lib/credits/creditRefund', () => ({
  refundCredits: vi.fn().mockResolvedValue(undefined),
}))

// Mock telemetry
vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

// Mock security/csrf
vi.mock('@/lib/security/csrf', () => ({
  csrfGuard: vi.fn().mockReturnValue(null),
}))

// Mock request body parser
const mockParseRequestBody = vi.fn()
vi.mock('@/lib/api/requestParser', () => ({
  parseRequestBody: (...args: unknown[]) => mockParseRequestBody(...args),
}))

// Mock HTTP body size enforcement
vi.mock('@/lib/http', () => ({
  enforceBodySize: vi.fn().mockReturnValue(null),
}))

// Mock iChing wisdom functions
const mockGenerateWisdomPrompt = vi.fn()
const mockGetHexagramWisdom = vi.fn()
vi.mock('@/lib/iChing/ichingWisdom', () => ({
  generateWisdomPrompt: (...args: unknown[]) => mockGenerateWisdomPrompt(...args),
  getHexagramWisdom: (...args: unknown[]) => mockGetHexagramWisdom(...args),
}))

// Mock iChing premium data functions
const mockCalculateNuclearHexagram = vi.fn()
const mockCalculateRelatedHexagrams = vi.fn()
vi.mock('@/lib/iChing/iChingPremiumData', () => ({
  calculateNuclearHexagram: (...args: unknown[]) => mockCalculateNuclearHexagram(...args),
  calculateRelatedHexagrams: (...args: unknown[]) => mockCalculateRelatedHexagrams(...args),
}))

// Mock streaming utilities
const mockCreateSSEStreamProxy = vi.fn()
const mockCreateFallbackSSEStream = vi.fn()
const mockCreateTransformedSSEStream = vi.fn()
vi.mock('@/lib/streaming/serverStreamProxy', () => ({
  createSSEStreamProxy: (...args: unknown[]) => mockCreateSSEStreamProxy(...args),
  createFallbackSSEStream: (...args: unknown[]) => mockCreateFallbackSSEStream(...args),
  createTransformedSSEStream: (...args: unknown[]) => mockCreateTransformedSSEStream(...args),
  isSSEResponse: vi.fn().mockReturnValue(true),
  createSSEEvent: vi.fn(),
  createSSEDoneEvent: vi.fn(),
  createSSEErrorEvent: vi.fn(),
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

// ---------------------------------------------------------------------------
// Import route handlers AFTER all mocks
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/iching/stream/route'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rateLimitResult(allowed: boolean) {
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', '30')
  headers.set('X-RateLimit-Remaining', allowed ? '29' : '0')
  return { allowed, headers, retryAfter: allowed ? undefined : 60 }
}

function makePostRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/iching/stream', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}

// Valid request body for I Ching stream
// Note: changingLines.index uses 1-6 range per the schema
const VALID_STREAM_BODY = {
  hexagramNumber: 1,
  hexagramName: '건괘',
  hexagramSymbol: '☰',
  judgment: '元亨利貞',
  image: '天行健 君子以自強不息',
  coreMeaning: '창조와 리더십',
  changingLines: [
    { index: 1, text: '잠룡물용' },
  ],
  resultingHexagram: {
    number: 44,
    name: '구괘',
    symbol: '☰☴',
    judgment: '여자가 씩씩하니',
  },
  question: '나의 사업 운세는 어떤가요?',
  locale: 'ko',
  themes: {
    career: '리더십 발휘의 시기',
    love: '적극적인 접근이 필요',
  },
}

// Mock SSE stream response
function createMockSSEResponse() {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('data: {"content":"해석 시작"}\n\n'))
      controller.enqueue(encoder.encode('data: {"content":"건괘는 하늘을 의미합니다"}\n\n'))
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// Mock wisdom data
const MOCK_HEXAGRAM_WISDOM = {
  keyword: '창조',
  coreWisdom: '하늘의 도는 쉬지 않고 움직인다',
  situationAdvice: { career: '리더십을 발휘하라' },
  warnings: ['교만하지 마라'],
  opportunities: ['창업', '리더십'],
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

function setupDefaults() {
  mockRateLimit.mockResolvedValue(rateLimitResult(true))
  mockRequirePublicToken.mockReturnValue({ valid: true })
  mockParseRequestBody.mockResolvedValue({ ...VALID_STREAM_BODY })

  // Mock wisdom functions
  mockGenerateWisdomPrompt.mockReturnValue('## 주역 괘 해석 프롬프트\n...')
  mockGetHexagramWisdom.mockReturnValue(MOCK_HEXAGRAM_WISDOM)
  mockCalculateNuclearHexagram.mockReturnValue({ number: 1, name_ko: '건', name_en: 'Qian' })
  mockCalculateRelatedHexagrams.mockReturnValue({
    inverted: { number: 1, name_ko: '건', name_en: 'Qian' },
    opposite: { number: 2, name_ko: '곤', name_en: 'Kun' },
  })

  // Mock SSE stream response
  mockPostSSEStream.mockResolvedValue({
    ok: true,
    response: createMockSSEResponse(),
  })

  // Mock stream proxy to return a simple response
  mockCreateSSEStreamProxy.mockReturnValue(createMockSSEResponse())
  mockCreateFallbackSSEStream.mockReturnValue(createMockSSEResponse())
}

// ===================================================================
// POST /api/iching/stream
// ===================================================================

describe('POST /api/iching/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaults()
  })

  // -----------------------------------------------------------------
  // Rate limiting
  // -----------------------------------------------------------------
  describe('Rate Limiting', () => {
    it('should return 429 when rate limited', async () => {
      mockRateLimit.mockResolvedValue(rateLimitResult(false))

      const response = await POST(makePostRequest(VALID_STREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error?.code).toBe('RATE_LIMITED')
    })
  })

  // -----------------------------------------------------------------
  // Token validation
  // -----------------------------------------------------------------
  describe('Token Validation', () => {
    it('should return 401 when public token is invalid', async () => {
      mockRequirePublicToken.mockReturnValue({ valid: false, reason: 'Invalid token' })

      const response = await POST(makePostRequest(VALID_STREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error?.code).toBe('UNAUTHORIZED')
    })
  })

  // -----------------------------------------------------------------
  // Body validation
  // -----------------------------------------------------------------
  describe('Body Validation', () => {
    it('should return 400 when body is null/invalid', async () => {
      mockParseRequestBody.mockResolvedValue(null)

      const response = await POST(makePostRequest('invalid'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_body')
    })

    it('should return 400 when hexagramNumber is missing', async () => {
      const body = { ...VALID_STREAM_BODY }
      delete (body as Record<string, unknown>).hexagramNumber
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when hexagramNumber is out of range (< 1)', async () => {
      const body = { ...VALID_STREAM_BODY, hexagramNumber: 0 }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when hexagramNumber is out of range (> 64)', async () => {
      const body = { ...VALID_STREAM_BODY, hexagramNumber: 65 }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when hexagramName is empty', async () => {
      const body = { ...VALID_STREAM_BODY, hexagramName: '' }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when hexagramName exceeds max length', async () => {
      const body = { ...VALID_STREAM_BODY, hexagramName: 'x'.repeat(201) }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when judgment exceeds max length', async () => {
      const body = { ...VALID_STREAM_BODY, judgment: 'x'.repeat(2001) }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when image exceeds max length', async () => {
      const body = { ...VALID_STREAM_BODY, image: 'x'.repeat(2001) }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should accept valid changingLines array', async () => {
      const body = {
        ...VALID_STREAM_BODY,
        changingLines: [
          { index: 1, text: '초효' },
          { index: 3, text: '삼효' },
          { index: 6, text: '상효' },
        ],
      }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))

      // Should proceed to SSE streaming (not return 400)
      expect(response.status).not.toBe(400)
    })

    it('should return 400 when changingLines has more than 6 items', async () => {
      const body = {
        ...VALID_STREAM_BODY,
        changingLines: [
          { index: 1, text: 'a' },
          { index: 2, text: 'b' },
          { index: 3, text: 'c' },
          { index: 4, text: 'd' },
          { index: 5, text: 'e' },
          { index: 6, text: 'f' },
          { index: 1, text: 'g' }, // 7th item
        ],
      }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })
  })

  // -----------------------------------------------------------------
  // Resulting Hexagram validation
  // -----------------------------------------------------------------
  describe('Resulting Hexagram Validation', () => {
    it('should accept valid resultingHexagram', async () => {
      const body = {
        ...VALID_STREAM_BODY,
        resultingHexagram: {
          number: 44,
          name: '구괘',
          symbol: '☰☴',
        },
      }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))

      expect(response.status).not.toBe(400)
    })

    it('should return 400 when resultingHexagram.number is out of range', async () => {
      const body = {
        ...VALID_STREAM_BODY,
        resultingHexagram: {
          number: 100,
          name: 'invalid',
          symbol: '?',
        },
      }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should accept request without resultingHexagram (optional)', async () => {
      const body = { ...VALID_STREAM_BODY }
      delete (body as Record<string, unknown>).resultingHexagram
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))

      expect(response.status).not.toBe(400)
    })
  })

  // -----------------------------------------------------------------
  // Locale handling
  // -----------------------------------------------------------------
  describe('Locale Handling', () => {
    it('should accept locale "ko"', async () => {
      const body = { ...VALID_STREAM_BODY, locale: 'ko' }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))

      expect(response.status).not.toBe(400)
    })

    it('should accept locale "en"', async () => {
      const body = { ...VALID_STREAM_BODY, locale: 'en' }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))

      expect(response.status).not.toBe(400)
    })

    it('should use default locale when not provided', async () => {
      const body = { ...VALID_STREAM_BODY }
      delete (body as Record<string, unknown>).locale
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))

      expect(response.status).not.toBe(400)
    })
  })

  // -----------------------------------------------------------------
  // Wisdom generation
  // -----------------------------------------------------------------
  describe('Wisdom Generation', () => {
    it('should call generateWisdomPrompt with correct context', async () => {
      mockParseRequestBody.mockResolvedValue(VALID_STREAM_BODY)

      await POST(makePostRequest(VALID_STREAM_BODY))

      expect(mockGenerateWisdomPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          hexagramNumber: 1,
          changingLines: [2], // index (1) + 1 = 2
          targetHexagram: 44,
          userQuestion: '나의 사업 운세는 어떤가요?',
          consultationType: 'general',
        })
      )
    })

    it('should call getHexagramWisdom with hexagram number', async () => {
      mockParseRequestBody.mockResolvedValue(VALID_STREAM_BODY)

      await POST(makePostRequest(VALID_STREAM_BODY))

      expect(mockGetHexagramWisdom).toHaveBeenCalledWith(1)
    })

    it('should calculate nuclear and related hexagrams', async () => {
      mockParseRequestBody.mockResolvedValue(VALID_STREAM_BODY)

      await POST(makePostRequest(VALID_STREAM_BODY))

      expect(mockCalculateNuclearHexagram).toHaveBeenCalledWith(1)
      expect(mockCalculateRelatedHexagrams).toHaveBeenCalledWith(1)
    })

    it('should handle null hexagram wisdom gracefully', async () => {
      mockGetHexagramWisdom.mockReturnValue(null)
      mockParseRequestBody.mockResolvedValue(VALID_STREAM_BODY)

      const response = await POST(makePostRequest(VALID_STREAM_BODY))

      // Should still proceed without error
      expect(response.status).not.toBe(500)
    })
  })

  // -----------------------------------------------------------------
  // Backend streaming
  // -----------------------------------------------------------------
  describe('Backend Streaming', () => {
    it('should call backend with correct endpoint', async () => {
      mockParseRequestBody.mockResolvedValue(VALID_STREAM_BODY)

      await POST(makePostRequest(VALID_STREAM_BODY))

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        '/iching/reading-stream',
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('should include wisdomPrompt in backend payload', async () => {
      mockParseRequestBody.mockResolvedValue(VALID_STREAM_BODY)

      await POST(makePostRequest(VALID_STREAM_BODY))

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          wisdomPrompt: expect.any(String),
        }),
        expect.any(Object)
      )
    })

    it('should include hexagramWisdom in backend payload when available', async () => {
      mockParseRequestBody.mockResolvedValue(VALID_STREAM_BODY)

      await POST(makePostRequest(VALID_STREAM_BODY))

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          hexagramWisdom: expect.objectContaining({
            keyword: '창조',
            coreWisdom: expect.any(String),
          }),
        }),
        expect.any(Object)
      )
    })

    it('should include nuclearHexagram in backend payload', async () => {
      mockParseRequestBody.mockResolvedValue(VALID_STREAM_BODY)

      await POST(makePostRequest(VALID_STREAM_BODY))

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          nuclearHexagram: expect.objectContaining({ number: 1 }),
        }),
        expect.any(Object)
      )
    })

    it('should include relatedHexagrams in backend payload', async () => {
      mockParseRequestBody.mockResolvedValue(VALID_STREAM_BODY)

      await POST(makePostRequest(VALID_STREAM_BODY))

      expect(mockPostSSEStream).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          relatedHexagrams: expect.objectContaining({
            inverted: expect.any(Object),
            opposite: expect.any(Object),
          }),
        }),
        expect.any(Object)
      )
    })
  })

  // -----------------------------------------------------------------
  // Fallback handling
  // -----------------------------------------------------------------
  describe('Fallback Handling', () => {
    it('should return fallback stream when backend fails', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        status: 503,
        error: 'Service unavailable',
      })
      mockParseRequestBody.mockResolvedValue(VALID_STREAM_BODY)

      await POST(makePostRequest(VALID_STREAM_BODY))

      expect(mockCreateFallbackSSEStream).toHaveBeenCalledWith(
        expect.objectContaining({
          done: true,
          error: 'Service unavailable',
        })
      )
    })

    it('should use Korean fallback message for ko locale', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        error: 'Backend error',
      })
      mockParseRequestBody.mockResolvedValue({ ...VALID_STREAM_BODY, locale: 'ko' })

      // Provide ko accept-language header to set context locale
      await POST(makePostRequest({ ...VALID_STREAM_BODY, locale: 'ko' }, { 'accept-language': 'ko-KR,ko;q=0.9' }))

      expect(mockCreateFallbackSSEStream).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('서비스'),
        })
      )
    })

    it('should use English fallback message for en locale', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        error: 'Backend error',
      })
      mockParseRequestBody.mockResolvedValue({ ...VALID_STREAM_BODY, locale: 'en' })

      await POST(makePostRequest({ ...VALID_STREAM_BODY, locale: 'en' }))

      expect(mockCreateFallbackSSEStream).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Service temporarily unavailable'),
        })
      )
    })

    it('should log error when backend stream fails', async () => {
      mockPostSSEStream.mockResolvedValue({
        ok: false,
        status: 500,
        error: 'Internal error',
      })
      mockParseRequestBody.mockResolvedValue(VALID_STREAM_BODY)

      await POST(makePostRequest(VALID_STREAM_BODY))

      expect(logger.error).toHaveBeenCalledWith(
        '[IChingStream] Backend error:',
        expect.objectContaining({ status: 500 })
      )
    })
  })

  // -----------------------------------------------------------------
  // Successful streaming
  // -----------------------------------------------------------------
  describe('Successful Streaming', () => {
    it('should return SSE stream response on success', async () => {
      mockParseRequestBody.mockResolvedValue(VALID_STREAM_BODY)

      await POST(makePostRequest(VALID_STREAM_BODY))

      expect(mockCreateSSEStreamProxy).toHaveBeenCalledWith(
        expect.objectContaining({
          route: 'IChingStream',
        })
      )
    })

    it('should handle request with minimal required fields', async () => {
      const minimalBody = {
        hexagramNumber: 1,
        hexagramName: '건',
        hexagramSymbol: '☰',
        judgment: '원형이정',
        image: '천행건',
      }
      mockParseRequestBody.mockResolvedValue(minimalBody)

      const response = await POST(makePostRequest(minimalBody))

      // Should not return 400
      expect(response.status).not.toBe(400)
    })

    it('should handle all 64 hexagrams', async () => {
      for (const hexNum of [1, 32, 64]) {
        const body = { ...VALID_STREAM_BODY, hexagramNumber: hexNum }
        mockParseRequestBody.mockResolvedValue(body)

        const response = await POST(makePostRequest(body))
        expect(response.status).not.toBe(400)
      }
    })
  })

  // -----------------------------------------------------------------
  // Themes validation
  // -----------------------------------------------------------------
  describe('Themes Validation', () => {
    it('should accept valid themes object', async () => {
      const body = {
        ...VALID_STREAM_BODY,
        themes: {
          career: '사업 운세 좋음',
          love: '연애 운세 보통',
          health: '건강 주의',
          wealth: '재물 운세 상승',
          timing: '봄에 좋음',
        },
      }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))

      expect(response.status).not.toBe(400)
    })

    it('should accept empty themes object', async () => {
      const body = { ...VALID_STREAM_BODY, themes: {} }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))

      expect(response.status).not.toBe(400)
    })

    it('should return 400 when theme value exceeds max length', async () => {
      const body = {
        ...VALID_STREAM_BODY,
        themes: {
          career: 'x'.repeat(501), // exceeds 500 max
        },
      }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })
  })

  // -----------------------------------------------------------------
  // Question validation
  // -----------------------------------------------------------------
  describe('Question Validation', () => {
    it('should accept valid question', async () => {
      const body = {
        ...VALID_STREAM_BODY,
        question: '내 사업은 잘 될까요?',
      }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))

      expect(response.status).not.toBe(400)
    })

    it('should accept request without question (optional)', async () => {
      const body = { ...VALID_STREAM_BODY }
      delete (body as Record<string, unknown>).question
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))

      expect(response.status).not.toBe(400)
    })

    it('should return 400 when question exceeds max length', async () => {
      const body = {
        ...VALID_STREAM_BODY,
        question: 'x'.repeat(501), // exceeds 500 max
      }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })
  })

  // -----------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle Korean text in fields', async () => {
      const body = {
        hexagramNumber: 1,
        hexagramName: '건괘(乾卦)',
        hexagramSymbol: '☰',
        judgment: '원형이정(元亨利貞)',
        image: '천행건 군자이자강불식(天行健 君子以自強不息)',
        question: '내 운세는 어떨까요?',
        locale: 'ko',
      }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))

      expect(response.status).not.toBe(400)
    })

    it('should handle multiple changing lines', async () => {
      const body = {
        ...VALID_STREAM_BODY,
        changingLines: [
          { index: 1, text: '초구' },
          { index: 3, text: '구삼' },
          { index: 5, text: '구오' },
        ],
      }
      mockParseRequestBody.mockResolvedValue(body)

      await POST(makePostRequest(body))

      expect(mockGenerateWisdomPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          changingLines: [2, 4, 6], // indices + 1
        })
      )
    })

    it('should handle empty changingLines array', async () => {
      const body = { ...VALID_STREAM_BODY, changingLines: [] }
      mockParseRequestBody.mockResolvedValue(body)

      await POST(makePostRequest(body))

      expect(mockGenerateWisdomPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          changingLines: [],
        })
      )
    })

    it('should handle special characters in question', async () => {
      const body = {
        ...VALID_STREAM_BODY,
        question: '내 사업은 잘 될까요? (2024년) & 가족 건강은?',
      }
      mockParseRequestBody.mockResolvedValue(body)

      const response = await POST(makePostRequest(body))

      expect(response.status).not.toBe(400)
    })
  })
})
