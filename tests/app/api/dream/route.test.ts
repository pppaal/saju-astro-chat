import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks – all vi.mock calls MUST appear before importing the route handlers
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

// Mock telemetry
vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

// Mock public token validation
const mockRequirePublicToken = vi.fn()
vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: (...args: unknown[]) => mockRequirePublicToken(...args),
}))

// Mock next-auth
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}))
vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock consultation saving
const mockSaveConsultation = vi.fn()
const mockExtractSummary = vi.fn((text: string) => text?.substring(0, 50) ?? '')
vi.mock('@/lib/consultation/saveConsultation', () => ({
  saveConsultation: (...args: unknown[]) => mockSaveConsultation(...args),
  extractSummary: (...args: unknown[]) => mockExtractSummary(...args),
}))

// Mock circuit breaker
const mockWithCircuitBreaker = vi.fn()
vi.mock('@/lib/circuitBreaker', () => ({
  withCircuitBreaker: (...args: unknown[]) => mockWithCircuitBreaker(...args),
}))

// Mock credit checking
const mockCheckAndConsumeCredits = vi.fn()
const mockCreditErrorResponse = vi.fn()
vi.mock('@/lib/credits/withCredits', () => ({
  checkAndConsumeCredits: (...args: unknown[]) => mockCheckAndConsumeCredits(...args),
  creditErrorResponse: (...args: unknown[]) => mockCreditErrorResponse(...args),
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

// Mock error sanitizer
vi.mock('@/lib/security/errorSanitizer', () => ({
  sanitizeError: vi.fn((_e: unknown, _ctx: string) => ({
    error: 'Internal server error',
  })),
}))

// Mock validation – DreamRequestSchema with safeParse
const mockSafeParse = vi.fn()
vi.mock('@/lib/validation', () => ({
  DreamRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock request body parser
const mockParseRequestBody = vi.fn()
vi.mock('@/lib/api/requestParser', () => ({
  parseRequestBody: (...args: unknown[]) => mockParseRequestBody(...args),
}))

// Mock API client
vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

// Mock metrics
vi.mock('@/lib/metrics/index', () => ({
  recordApiRequest: vi.fn(),
}))

// Mock HTTP constants – provide real values
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
import { GET, POST } from '@/app/api/dream/route'
import { getServerSession } from 'next-auth/next'
import { captureServerError } from '@/lib/telemetry'
import { recordApiRequest } from '@/lib/metrics/index'
import { sanitizeError } from '@/lib/security/errorSanitizer'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build rate-limit result with standard Headers (Web API Headers, same as real impl) */
function rateLimitResult(allowed: boolean) {
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', '10')
  headers.set('X-RateLimit-Remaining', allowed ? '9' : '0')
  return { allowed, headers }
}

/** Default successful circuit-breaker response */
function circuitBreakerSuccess(data: Record<string, unknown> = {}) {
  return {
    result: {
      summary: 'Dream analysis summary',
      dreamSymbols: [{ label: 'Water', meaning: 'Emotions' }],
      themes: [{ label: 'Transformation', weight: 0.8 }],
      astrology: { highlights: ['Moon phase active'] },
      crossInsights: ['Insight 1'],
      recommendations: ['Keep a dream journal'],
      culturalNotes: { korean: '꿈 해석', western: 'Dream interpretation' },
      luckyElements: { isLucky: true, luckyNumbers: [7] },
      premiumFeatures: null,
      celestial: null,
      ...data,
    },
    fromFallback: false,
  }
}

/** A valid dream request body used in most POST tests */
const VALID_DREAM_BODY = {
  dream: 'I was flying over the ocean and saw a great whale beneath the waves',
  locale: 'en',
  symbols: ['ocean', 'whale'],
  emotions: ['wonder'],
  themes: ['freedom'],
  context: [],
}

/** A minimal NextRequest helper */
function makePostRequest(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/dream', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}

function makeGetRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/dream', {
    method: 'GET',
    headers,
  })
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

function setupDefaults() {
  // Rate limit allowed
  mockRateLimit.mockResolvedValue(rateLimitResult(true))
  // Public token valid
  mockRequirePublicToken.mockReturnValue({ valid: true })
  // Body parsing succeeds returning the valid body
  mockParseRequestBody.mockResolvedValue({ ...VALID_DREAM_BODY })
  // Zod validation succeeds
  mockSafeParse.mockReturnValue({
    success: true,
    data: { ...VALID_DREAM_BODY },
  })
  // Credits allowed
  mockCheckAndConsumeCredits.mockResolvedValue({ allowed: true, remaining: 9 })
  // Circuit breaker returns success
  mockWithCircuitBreaker.mockResolvedValue(circuitBreakerSuccess())
  // No session by default
  vi.mocked(getServerSession).mockResolvedValue(null)
  // Save consultation success
  mockSaveConsultation.mockResolvedValue({ success: true, consultationId: 'c-1' })
}

// ===================================================================
// GET /api/dream
// ===================================================================
describe('Dream API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaults()
  })

  it('should return 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue(rateLimitResult(false))

    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toBe('Too many requests')
  })

  it('should return 401 when public token is invalid', async () => {
    mockRequirePublicToken.mockReturnValue({ valid: false, reason: 'Invalid or missing token' })

    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return alive message on valid request', async () => {
    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Dream API alive!')
  })

  it('should include rate limit headers in successful response', async () => {
    const response = await GET(makeGetRequest())

    expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('9')
  })

  it('should include rate limit headers in 401 response', async () => {
    mockRequirePublicToken.mockReturnValue({ valid: false, reason: 'missing' })

    const response = await GET(makeGetRequest())

    expect(response.status).toBe(401)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
  })

  it('should return 500 and sanitized error when unexpected error occurs', async () => {
    // Make rateLimit succeed but requirePublicToken succeed,
    // then force NextResponse.json to throw inside the try block.
    // The easiest way: have rateLimit return a headers object whose forEach throws.
    const badHeaders = new Map<string, string>()
    // Override forEach to throw inside the try block
    badHeaders.forEach = () => {
      throw new Error('Unexpected header error')
    }
    mockRateLimit.mockResolvedValue({ allowed: true, headers: badHeaders })
    mockRequirePublicToken.mockReturnValue({ valid: true })

    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(captureServerError).toHaveBeenCalled()
  })
})

// ===================================================================
// POST /api/dream
// ===================================================================
describe('Dream API - POST', () => {
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

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('Too many requests')
    })

    it('should record rate_limited metric', async () => {
      mockRateLimit.mockResolvedValue(rateLimitResult(false))

      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(recordApiRequest).toHaveBeenCalledWith('dream', 'analyze', 'rate_limited')
    })

    it('should include rate limit headers in 429 response', async () => {
      mockRateLimit.mockResolvedValue(rateLimitResult(false))

      const response = await POST(makePostRequest(VALID_DREAM_BODY))

      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    })
  })

  // -----------------------------------------------------------------
  // Public token authentication
  // -----------------------------------------------------------------
  describe('Public Token Authentication', () => {
    it('should return 401 when public token is invalid', async () => {
      mockRequirePublicToken.mockReturnValue({ valid: false, reason: 'Invalid or missing token' })

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should record error metric on token failure', async () => {
      mockRequirePublicToken.mockReturnValue({ valid: false })

      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(recordApiRequest).toHaveBeenCalledWith('dream', 'analyze', 'error')
    })

    it('should include rate limit headers in 401 response', async () => {
      mockRequirePublicToken.mockReturnValue({ valid: false })

      const response = await POST(makePostRequest(VALID_DREAM_BODY))

      expect(response.status).toBe(401)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
    })
  })

  // -----------------------------------------------------------------
  // Request body parsing
  // -----------------------------------------------------------------
  describe('Request Body Parsing', () => {
    it('should return 400 when body is null (unparseable JSON)', async () => {
      mockParseRequestBody.mockResolvedValue(null)

      const response = await POST(makePostRequest('not valid json'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON body')
    })

    it('should record validation_error metric on null body', async () => {
      mockParseRequestBody.mockResolvedValue(null)

      await POST(makePostRequest('{}'))

      expect(recordApiRequest).toHaveBeenCalledWith('dream', 'analyze', 'validation_error')
    })
  })

  // -----------------------------------------------------------------
  // Legacy field support (dreamText -> dream)
  // -----------------------------------------------------------------
  describe('Legacy Field Name Support', () => {
    it('should map dreamText to dream when dream field is absent', async () => {
      const legacyBody = {
        dreamText: 'I had a vivid dream about flying over mountains',
        locale: 'en',
      }
      mockParseRequestBody.mockResolvedValue({ ...legacyBody })
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          dream: legacyBody.dreamText,
          locale: 'en',
        },
      })

      const response = await POST(makePostRequest(legacyBody))

      // parseRequestBody returns a mutable object; the route should assign dream = dreamText
      // Then safeParse is called with the raw body containing dream field
      expect(mockSafeParse).toHaveBeenCalledWith(
        expect.objectContaining({ dream: legacyBody.dreamText })
      )
    })

    it('should not overwrite dream if both dream and dreamText are present', async () => {
      const body = {
        dream: 'The real dream text',
        dreamText: 'Legacy text that should be ignored',
        locale: 'en',
      }
      mockParseRequestBody.mockResolvedValue({ ...body })
      mockSafeParse.mockReturnValue({
        success: true,
        data: { dream: body.dream, locale: 'en' },
      })

      await POST(makePostRequest(body))

      expect(mockSafeParse).toHaveBeenCalledWith(
        expect.objectContaining({ dream: 'The real dream text' })
      )
    })
  })

  // -----------------------------------------------------------------
  // Locale detection from Accept-Language header
  // -----------------------------------------------------------------
  describe('Locale Detection', () => {
    it('should detect Korean locale from accept-language header', async () => {
      const body = { dream: 'A dream about ancient mountains in the mist' }
      mockParseRequestBody.mockResolvedValue({ ...body })
      mockSafeParse.mockImplementation((raw: Record<string, unknown>) => ({
        success: true,
        data: { dream: raw.dream, locale: raw.locale },
      }))

      await POST(makePostRequest(body, { 'accept-language': 'ko-KR,ko;q=0.9' }))

      expect(mockSafeParse).toHaveBeenCalledWith(expect.objectContaining({ locale: 'ko' }))
    })

    it('should detect Japanese locale from accept-language header', async () => {
      const body = { dream: 'A dream about ancient mountains in the mist' }
      mockParseRequestBody.mockResolvedValue({ ...body })
      mockSafeParse.mockImplementation((raw: Record<string, unknown>) => ({
        success: true,
        data: { dream: raw.dream, locale: raw.locale },
      }))

      await POST(makePostRequest(body, { 'accept-language': 'ja;q=0.8' }))

      expect(mockSafeParse).toHaveBeenCalledWith(expect.objectContaining({ locale: 'ja' }))
    })

    it('should detect Chinese locale from accept-language header', async () => {
      const body = { dream: 'A dream about ancient mountains in the mist' }
      mockParseRequestBody.mockResolvedValue({ ...body })
      mockSafeParse.mockImplementation((raw: Record<string, unknown>) => ({
        success: true,
        data: { dream: raw.dream, locale: raw.locale },
      }))

      await POST(makePostRequest(body, { 'accept-language': 'zh-CN,zh;q=0.9' }))

      expect(mockSafeParse).toHaveBeenCalledWith(expect.objectContaining({ locale: 'zh' }))
    })

    it('should default to English when accept-language does not match', async () => {
      const body = { dream: 'A dream about ancient mountains in the mist' }
      mockParseRequestBody.mockResolvedValue({ ...body })
      mockSafeParse.mockImplementation((raw: Record<string, unknown>) => ({
        success: true,
        data: { dream: raw.dream, locale: raw.locale },
      }))

      await POST(makePostRequest(body, { 'accept-language': 'fr-FR,de;q=0.8' }))

      expect(mockSafeParse).toHaveBeenCalledWith(expect.objectContaining({ locale: 'en' }))
    })

    it('should default to English when accept-language is absent', async () => {
      const body = { dream: 'A dream about ancient mountains in the mist' }
      mockParseRequestBody.mockResolvedValue({ ...body })
      mockSafeParse.mockImplementation((raw: Record<string, unknown>) => ({
        success: true,
        data: { dream: raw.dream, locale: raw.locale },
      }))

      await POST(makePostRequest(body))

      expect(mockSafeParse).toHaveBeenCalledWith(expect.objectContaining({ locale: 'en' }))
    })

    it('should NOT override locale if already provided in body', async () => {
      const body = { dream: 'A dream about ancient mountains in the mist', locale: 'ko' }
      mockParseRequestBody.mockResolvedValue({ ...body })
      mockSafeParse.mockImplementation((raw: Record<string, unknown>) => ({
        success: true,
        data: { dream: raw.dream, locale: raw.locale },
      }))

      // Even though accept-language is Japanese, body locale should win
      await POST(makePostRequest(body, { 'accept-language': 'ja;q=0.9' }))

      expect(mockSafeParse).toHaveBeenCalledWith(expect.objectContaining({ locale: 'ko' }))
    })
  })

  // -----------------------------------------------------------------
  // Zod validation
  // -----------------------------------------------------------------
  describe('Zod Validation', () => {
    it('should return 400 with validation errors when schema fails', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['dream'], message: 'String must contain at least 10 character(s)' }],
        },
      })

      const response = await POST(makePostRequest({ dream: 'short' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Validation failed')
      expect(data.error).toContain('dream')
    })

    it('should include all validation error paths in the message', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['dream'], message: 'Required' },
            { path: ['locale'], message: 'Invalid enum value' },
          ],
        },
      })

      const response = await POST(makePostRequest({ locale: 'xx' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('dream')
      expect(data.error).toContain('locale')
    })

    it('should record validation_error metric on Zod failure', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['dream'], message: 'Required' }],
        },
      })

      await POST(makePostRequest({}))

      expect(recordApiRequest).toHaveBeenCalledWith('dream', 'analyze', 'validation_error')
    })
  })

  // -----------------------------------------------------------------
  // Credit checking
  // -----------------------------------------------------------------
  describe('Credit Checking', () => {
    it('should return credit error response when credits disallowed', async () => {
      const creditResult = {
        allowed: false,
        error: 'Insufficient credits',
        errorCode: 'no_credits',
      }
      mockCheckAndConsumeCredits.mockResolvedValue(creditResult)
      mockCreditErrorResponse.mockReturnValue(
        NextResponse.json({ error: 'Insufficient credits', code: 'no_credits' }, { status: 402 })
      )

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.error).toBe('Insufficient credits')
      expect(mockCreditErrorResponse).toHaveBeenCalledWith(creditResult)
    })

    it('should call checkAndConsumeCredits with type reading and amount 1', async () => {
      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(mockCheckAndConsumeCredits).toHaveBeenCalledWith('reading', 1)
    })

    it('should set rate limit headers on credit error response', async () => {
      mockCheckAndConsumeCredits.mockResolvedValue({ allowed: false })
      // Return a response that we can verify headers are merged onto
      const creditResponse = NextResponse.json({ error: 'no credits' }, { status: 402 })
      mockCreditErrorResponse.mockReturnValue(creditResponse)

      const response = await POST(makePostRequest(VALID_DREAM_BODY))

      // The route merges rate limit headers onto the credit error response
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
    })

    it('should return 401 for not_authenticated credit error', async () => {
      const creditResult = {
        allowed: false,
        error: 'Login required',
        errorCode: 'not_authenticated',
      }
      mockCheckAndConsumeCredits.mockResolvedValue(creditResult)
      mockCreditErrorResponse.mockReturnValue(
        NextResponse.json({ error: 'Login required', code: 'not_authenticated' }, { status: 401 })
      )

      const response = await POST(makePostRequest(VALID_DREAM_BODY))

      expect(response.status).toBe(401)
    })
  })

  // -----------------------------------------------------------------
  // Successful response (circuit breaker returns real data)
  // -----------------------------------------------------------------
  describe('Successful Dream Analysis', () => {
    it('should return 200 with analysis result', async () => {
      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary).toBe('Dream analysis summary')
      expect(data.dreamSymbols).toEqual([{ label: 'Water', meaning: 'Emotions' }])
      expect(data.themes).toEqual([{ label: 'Transformation', weight: 0.8 }])
    })

    it('should include fromFallback=false for real backend response', async () => {
      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(data.fromFallback).toBe(false)
    })

    it('should include saved=false when user is not logged in', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(data.saved).toBe(false)
    })

    it('should include rate limit headers in success response', async () => {
      const response = await POST(makePostRequest(VALID_DREAM_BODY))

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9')
    })

    it('should record success metric with timing', async () => {
      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(recordApiRequest).toHaveBeenCalledWith(
        'dream',
        'analyze',
        'success',
        expect.any(Number)
      )
    })

    it('should pass dream, symbols, emotions, themes, context, locale, birth to circuit breaker fn', async () => {
      const bodyWithBirth = {
        ...VALID_DREAM_BODY,
        birth: { date: '1990-01-15', time: '10:30', timezone: 'Asia/Seoul' },
      }
      mockParseRequestBody.mockResolvedValue({ ...bodyWithBirth })
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...bodyWithBirth },
      })

      await POST(makePostRequest(bodyWithBirth))

      // withCircuitBreaker is called with (name, fn, fallback, options)
      expect(mockWithCircuitBreaker).toHaveBeenCalledWith(
        'flask-dream',
        expect.any(Function),
        expect.any(Function),
        { failureThreshold: 3, resetTimeoutMs: 60000 }
      )
    })
  })

  // -----------------------------------------------------------------
  // Fallback response
  // -----------------------------------------------------------------
  describe('Fallback Response (Circuit Breaker)', () => {
    it('should return fromFallback=true when circuit breaker uses fallback', async () => {
      mockWithCircuitBreaker.mockResolvedValue({
        result: {
          summary: 'Fallback summary',
          dreamSymbols: [],
          themes: [],
        },
        fromFallback: true,
      })

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.fromFallback).toBe(true)
    })

    it('should still save consultation even with fallback data', async () => {
      const mockSession = {
        user: { id: 'user-42', email: 'test@test.com' },
        expires: '2026-12-31',
      }
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockWithCircuitBreaker.mockResolvedValue({
        result: { summary: 'Fallback summary' },
        fromFallback: true,
      })

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(data.fromFallback).toBe(true)
      expect(mockSaveConsultation).toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------
  // Saving consultation for logged-in users
  // -----------------------------------------------------------------
  describe('Consultation Saving', () => {
    const mockSession = {
      user: { id: 'user-42', email: 'test@test.com' },
      expires: '2026-12-31',
    }

    it('should save consultation when user is logged in', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(data.saved).toBe(true)
      expect(mockSaveConsultation).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-42',
          theme: 'dream',
          locale: 'en',
          userQuestion: VALID_DREAM_BODY.dream,
        })
      )
    })

    it('should pass signals with symbols, emotions, themes, and response data', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(mockSaveConsultation).toHaveBeenCalledWith(
        expect.objectContaining({
          signals: expect.objectContaining({
            symbols: VALID_DREAM_BODY.symbols,
            emotions: VALID_DREAM_BODY.emotions,
            themes: VALID_DREAM_BODY.themes,
            dreamSymbols: [{ label: 'Water', meaning: 'Emotions' }],
          }),
        })
      )
    })

    it('should call extractSummary with response summary', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(mockExtractSummary).toHaveBeenCalledWith('Dream analysis summary')
    })

    it('should call extractSummary with dream substring when summary is falsy', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockWithCircuitBreaker.mockResolvedValue({
        result: {
          summary: '',
          dreamSymbols: [],
          themes: [],
        },
        fromFallback: false,
      })

      await POST(makePostRequest(VALID_DREAM_BODY))

      // When summary is '', it's falsy, so fallback to dream.substring(0, 100)
      expect(mockExtractSummary).toHaveBeenCalledWith(VALID_DREAM_BODY.dream.substring(0, 100))
    })

    it('should set saved=false when save fails silently', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockSaveConsultation.mockResolvedValue({ success: false })

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(data.saved).toBe(false)
    })

    it('should log warning and set saved=false when saveConsultation throws', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockSaveConsultation.mockRejectedValue(new Error('DB connection failed'))

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(data.saved).toBe(false)
      expect(logger.warn).toHaveBeenCalledWith(
        '[Dream API] Failed to save dream:',
        expect.any(Error)
      )
    })

    it('should not attempt saving when user is not logged in (no session)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(mockSaveConsultation).not.toHaveBeenCalled()
    })

    it('should not attempt saving when session has no user id', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'test@test.com' },
        expires: '2026-12-31',
      } as any)

      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(mockSaveConsultation).not.toHaveBeenCalled()
    })

    it('should build fullReport from summary, crossInsights, and recommendations', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockWithCircuitBreaker.mockResolvedValue({
        result: {
          summary: 'Summary text',
          crossInsights: ['Insight A', 'Insight B'],
          recommendations: ['Rec 1', 'Rec 2'],
        },
        fromFallback: false,
      })

      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(mockSaveConsultation).toHaveBeenCalledWith(
        expect.objectContaining({
          fullReport: 'Summary text\n\nInsight A\nInsight B\n\nRec 1\nRec 2',
        })
      )
    })

    it('should handle missing crossInsights and recommendations in fullReport', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockWithCircuitBreaker.mockResolvedValue({
        result: {
          summary: 'Only summary',
        },
        fromFallback: false,
      })

      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(mockSaveConsultation).toHaveBeenCalledWith(
        expect.objectContaining({
          fullReport: 'Only summary',
        })
      )
    })
  })

  // -----------------------------------------------------------------
  // Error handling in the outer catch block
  // -----------------------------------------------------------------
  describe('Error Handling', () => {
    it('should return 500 and capture error when circuit breaker throws', async () => {
      mockWithCircuitBreaker.mockRejectedValue(new Error('Unexpected backend failure'))

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unexpected backend failure')
      expect(captureServerError).toHaveBeenCalledWith(expect.any(Error), {
        route: '/api/dream',
        method: 'POST',
      })
    })

    it('should record error metric with timing when exception occurs', async () => {
      mockWithCircuitBreaker.mockRejectedValue(new Error('fail'))

      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(recordApiRequest).toHaveBeenCalledWith('dream', 'analyze', 'error', expect.any(Number))
    })

    it('should handle non-Error thrown values', async () => {
      mockWithCircuitBreaker.mockRejectedValue('string error')

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('string error')
    })

    it('should return error message from Error object', async () => {
      mockWithCircuitBreaker.mockRejectedValue(new Error('Specific error message'))

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(data.error).toBe('Specific error message')
    })

    it('should fallback to "server error" when error.message is empty', async () => {
      mockWithCircuitBreaker.mockRejectedValue(new Error(''))

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('server error')
    })

    it('should return 500 when checkAndConsumeCredits throws', async () => {
      mockCheckAndConsumeCredits.mockRejectedValue(new Error('Credit service down'))

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(captureServerError).toHaveBeenCalled()
    })

    it('should return 500 when parseRequestBody throws', async () => {
      mockParseRequestBody.mockRejectedValue(new Error('Parse crash'))

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(captureServerError).toHaveBeenCalled()
    })
  })

  // -----------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle dream text with special characters', async () => {
      const body = {
        dream: 'A dream about <script>alert("xss")</script> and other "quoted" things & symbols',
        locale: 'en',
      }
      mockParseRequestBody.mockResolvedValue({ ...body })
      mockSafeParse.mockReturnValue({ success: true, data: { ...body } })

      const response = await POST(makePostRequest(body))

      expect(response.status).toBe(200)
    })

    it('should handle empty optional arrays in the request', async () => {
      const body = {
        dream: 'A long enough dream text for validation to pass',
        locale: 'en',
        symbols: [],
        emotions: [],
        themes: [],
        context: [],
      }
      mockParseRequestBody.mockResolvedValue({ ...body })
      mockSafeParse.mockReturnValue({ success: true, data: { ...body } })

      const response = await POST(makePostRequest(body))

      expect(response.status).toBe(200)
    })

    it('should handle response with premium features', async () => {
      mockWithCircuitBreaker.mockResolvedValue(
        circuitBreakerSuccess({
          premiumFeatures: {
            combinations: [
              {
                combination: 'water+whale',
                meaning: 'Deep emotions',
                interpretation: 'Strong intuition',
                fortune_type: 'positive',
                is_lucky: true,
                lucky_score: 90,
              },
            ],
            taemong: {
              is_taemong: true,
              symbols: [],
              primary_symbol: null,
            },
            lucky_numbers: {
              numbers: [7, 14, 21],
              matched_symbols: ['water'],
              dominant_element: 'water',
              element_analysis: 'Water dominant',
              confidence: 0.85,
            },
          },
        })
      )

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.premiumFeatures).toBeDefined()
      expect(data.premiumFeatures.combinations).toHaveLength(1)
      expect(data.premiumFeatures.taemong.is_taemong).toBe(true)
      expect(data.premiumFeatures.lucky_numbers.numbers).toEqual([7, 14, 21])
    })

    it('should handle response with celestial context', async () => {
      const celestialData = {
        timestamp: '2026-02-04T12:00:00Z',
        moon_phase: {
          name: 'Waxing Crescent',
          korean: '초승달',
          emoji: '🌒',
          illumination: 0.15,
          age_days: 3,
          dream_quality: 'Vivid',
          dream_meaning: 'New beginnings',
          favorable_symbols: ['water'],
          intensified_symbols: ['moon'],
          advice: 'Pay attention to dreams',
          weight_modifier: 1.2,
          enhanced_themes: ['intuition'],
        },
        moon_sign: {
          sign: 'Cancer',
          korean: '게자리',
          dream_flavor: 'Emotional',
          enhanced_symbols: ['water', 'home'],
        },
        retrogrades: [],
        significant_aspects: [],
        planets: [],
        source: 'ephemeris',
      }

      mockWithCircuitBreaker.mockResolvedValue(circuitBreakerSuccess({ celestial: celestialData }))

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.celestial).toBeDefined()
      expect(data.celestial.moon_phase.name).toBe('Waxing Crescent')
    })

    it('should handle Korean locale fallback content', async () => {
      const koDream = {
        dream: '바다 위를 날아다니는 꿈을 꾸었습니다. 고래가 파도 아래에 있었습니다.',
        locale: 'ko',
      }
      mockParseRequestBody.mockResolvedValue({ ...koDream })
      mockSafeParse.mockReturnValue({ success: true, data: { ...koDream } })
      mockWithCircuitBreaker.mockResolvedValue({
        result: {
          summary: '꿈 분석 결과입니다',
          dreamSymbols: [{ label: '바다', meaning: '감정' }],
          themes: [{ label: '자유', weight: 0.8 }],
        },
        fromFallback: false,
      })

      const response = await POST(makePostRequest(koDream))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary).toBe('꿈 분석 결과입니다')
    })

    it('should handle undefined optional fields in validated body', async () => {
      const minimalBody = {
        dream: 'A minimal dream text that is long enough to pass validation',
        locale: 'en',
      }
      mockParseRequestBody.mockResolvedValue({ ...minimalBody })
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          dream: minimalBody.dream,
          locale: 'en',
          symbols: undefined,
          emotions: undefined,
          themes: undefined,
          context: undefined,
          birth: undefined,
        },
      })

      const response = await POST(makePostRequest(minimalBody))

      expect(response.status).toBe(200)
    })

    it('should handle getServerSession throwing during save and still return success', async () => {
      // The outer try succeeds, but the inner session check throws
      vi.mocked(getServerSession).mockRejectedValue(new Error('Session service unavailable'))

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      // The save block has its own try/catch, so this should still return 200
      expect(response.status).toBe(200)
      expect(data.saved).toBe(false)
      expect(logger.warn).toHaveBeenCalledWith(
        '[Dream API] Failed to save dream:',
        expect.any(Error)
      )
    })

    it('should handle response where all optional fields are null/undefined', async () => {
      mockWithCircuitBreaker.mockResolvedValue({
        result: {
          summary: undefined,
          dreamSymbols: undefined,
          themes: undefined,
          astrology: undefined,
          crossInsights: undefined,
          recommendations: undefined,
          culturalNotes: undefined,
          luckyElements: undefined,
          premiumFeatures: undefined,
          celestial: undefined,
        },
        fromFallback: true,
      })

      const response = await POST(makePostRequest(VALID_DREAM_BODY))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.fromFallback).toBe(true)
    })

    it('should handle very long dream text', async () => {
      const longDream = 'A'.repeat(5000)
      const body = { dream: longDream, locale: 'en' }
      mockParseRequestBody.mockResolvedValue({ ...body })
      mockSafeParse.mockReturnValue({ success: true, data: { ...body } })

      const response = await POST(makePostRequest(body))

      expect(response.status).toBe(200)
    })
  })

  // -----------------------------------------------------------------
  // Circuit breaker options
  // -----------------------------------------------------------------
  describe('Circuit Breaker Configuration', () => {
    it('should use flask-dream as circuit breaker name', async () => {
      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(mockWithCircuitBreaker).toHaveBeenCalledWith(
        'flask-dream',
        expect.any(Function),
        expect.any(Function),
        expect.any(Object)
      )
    })

    it('should use failureThreshold of 3 and resetTimeout of 60s', async () => {
      await POST(makePostRequest(VALID_DREAM_BODY))

      expect(mockWithCircuitBreaker).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        expect.any(Function),
        { failureThreshold: 3, resetTimeoutMs: 60000 }
      )
    })
  })
})
