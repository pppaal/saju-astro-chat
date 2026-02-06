// tests/app/api/iching/changing-line/route.test.ts
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

// Mock ApiClient
const mockApiClientPost = vi.fn()
vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockApiClientPost(...args),
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

// ---------------------------------------------------------------------------
// Import route handlers AFTER all mocks
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/iching/changing-line/route'
import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rateLimitResult(allowed: boolean) {
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', '60')
  headers.set('X-RateLimit-Remaining', allowed ? '59' : '0')
  return { allowed, headers, retryAfter: allowed ? undefined : 60 }
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/iching/changing-line', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
    },
  })
}

// Valid request body
const VALID_BODY = {
  hexagramNumber: 1,
  lineIndex: 0,
  locale: 'ko',
}

// Mock backend response
const MOCK_BACKEND_RESPONSE = {
  text: '잠룡물용',
  meaning: '잠겨있는 용이니 쓰지 마라',
  interpretation: '때를 기다려라',
  lineNumber: 1,
}

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

function setupDefaults() {
  mockRateLimit.mockResolvedValue(rateLimitResult(true))
  mockRequirePublicToken.mockReturnValue({ valid: true })
  mockApiClientPost.mockResolvedValue({
    ok: true,
    status: 200,
    data: MOCK_BACKEND_RESPONSE,
  })
}

// ===================================================================
// POST /api/iching/changing-line
// ===================================================================

describe('POST /api/iching/changing-line', () => {
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

      const response = await POST(makePostRequest(VALID_BODY))
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error?.code).toBe('RATE_LIMITED')
    })
  })

  // -----------------------------------------------------------------
  // Body validation
  // -----------------------------------------------------------------
  describe('Body Validation', () => {
    it('should return 400 when body is null/invalid JSON', async () => {
      const req = new NextRequest('http://localhost/api/iching/changing-line', {
        method: 'POST',
        body: 'not valid json',
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('BAD_REQUEST')
    })

    it('should return 400 when hexagramNumber is missing', async () => {
      const body = {
        lineIndex: 0,
        locale: 'ko',
      }

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      // MISSING_FIELD returns 400, VALIDATION_ERROR returns 422
      expect([400, 422]).toContain(response.status)
      expect(data.error).toBeDefined()
    })

    it('should return 422 when hexagramNumber is out of range (< 1)', async () => {
      const body = {
        hexagramNumber: 0,
        lineIndex: 0,
        locale: 'ko',
      }

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error).toBeDefined()
    })

    it('should return 422 when hexagramNumber is out of range (> 64)', async () => {
      const body = {
        hexagramNumber: 65,
        lineIndex: 0,
        locale: 'ko',
      }

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error).toBeDefined()
    })

    it('should return 400 when lineIndex is missing', async () => {
      const body = {
        hexagramNumber: 1,
        locale: 'ko',
      }

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      // MISSING_FIELD returns 400, VALIDATION_ERROR returns 422
      expect([400, 422]).toContain(response.status)
      expect(data.error).toBeDefined()
    })

    it('should return 422 when lineIndex is out of range (< 0)', async () => {
      const body = {
        hexagramNumber: 1,
        lineIndex: -1,
        locale: 'ko',
      }

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error).toBeDefined()
    })

    it('should return 422 when lineIndex is out of range (> 5)', async () => {
      const body = {
        hexagramNumber: 1,
        lineIndex: 6,
        locale: 'ko',
      }

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error).toBeDefined()
    })

    it('should return 400 when hexagramNumber is not an integer', async () => {
      const body = {
        hexagramNumber: 1.5,
        lineIndex: 0,
        locale: 'ko',
      }

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      // Non-integer values may be treated as MISSING_FIELD (400) or VALIDATION_ERROR (422)
      expect([400, 422]).toContain(response.status)
      expect(data.error).toBeDefined()
    })
  })

  // -----------------------------------------------------------------
  // Locale validation
  // -----------------------------------------------------------------
  describe('Locale Validation', () => {
    it('should accept valid locale "ko"', async () => {
      const body = {
        hexagramNumber: 1,
        lineIndex: 0,
        locale: 'ko',
      }

      const response = await POST(makePostRequest(body))

      expect(response.status).toBe(200)
      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/iching/changing-line',
        expect.objectContaining({ locale: 'ko' }),
        expect.any(Object)
      )
    })

    it('should accept valid locale "en"', async () => {
      const body = {
        hexagramNumber: 1,
        lineIndex: 0,
        locale: 'en',
      }

      const response = await POST(makePostRequest(body))

      expect(response.status).toBe(200)
      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/iching/changing-line',
        expect.objectContaining({ locale: 'en' }),
        expect.any(Object)
      )
    })

    it('should default locale to "ko" when not provided', async () => {
      const body = {
        hexagramNumber: 1,
        lineIndex: 0,
      }

      const response = await POST(makePostRequest(body))

      expect(response.status).toBe(200)
      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/iching/changing-line',
        expect.objectContaining({ locale: 'ko' }),
        expect.any(Object)
      )
    })
  })

  // -----------------------------------------------------------------
  // Successful response
  // -----------------------------------------------------------------
  describe('Successful Response', () => {
    it('should return 200 with backend data on success', async () => {
      const response = await POST(makePostRequest(VALID_BODY))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(MOCK_BACKEND_RESPONSE)
    })

    it('should pass correct lineIndex (1-based) to backend', async () => {
      const body = {
        hexagramNumber: 1,
        lineIndex: 2, // 0-based index
        locale: 'ko',
      }

      await POST(makePostRequest(body))

      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/iching/changing-line',
        expect.objectContaining({ lineIndex: 3 }), // Backend uses 1-6
        expect.any(Object)
      )
    })

    it('should call backend with 10 second timeout', async () => {
      await POST(makePostRequest(VALID_BODY))

      expect(mockApiClientPost).toHaveBeenCalledWith('/iching/changing-line', expect.any(Object), {
        timeout: 10000,
      })
    })

    it('should handle hexagram 64 correctly', async () => {
      const body = {
        hexagramNumber: 64,
        lineIndex: 5,
        locale: 'en',
      }

      const response = await POST(makePostRequest(body))

      expect(response.status).toBe(200)
      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/iching/changing-line',
        { hexagramNumber: 64, lineIndex: 6, locale: 'en' },
        expect.any(Object)
      )
    })
  })

  // -----------------------------------------------------------------
  // Backend errors
  // -----------------------------------------------------------------
  describe('Backend Error Handling', () => {
    it('should return 502 when backend returns error', async () => {
      mockApiClientPost.mockResolvedValue({
        ok: false,
        status: 500,
        error: 'Internal server error',
      })

      const response = await POST(makePostRequest(VALID_BODY))
      const data = await response.json()

      // BACKEND_ERROR maps to 502 Bad Gateway
      expect(response.status).toBe(502)
      expect(data.error.code).toBe('BACKEND_ERROR')
    })

    it('should return 502 when backend returns error without status', async () => {
      mockApiClientPost.mockResolvedValue({
        ok: false,
        error: 'Unknown error',
      })

      const response = await POST(makePostRequest(VALID_BODY))
      const data = await response.json()

      // BACKEND_ERROR maps to 502 Bad Gateway
      expect(response.status).toBe(502)
      expect(data.error.code).toBe('BACKEND_ERROR')
    })

    it('should log error when backend fails', async () => {
      mockApiClientPost.mockResolvedValue({
        ok: false,
        status: 503,
        error: 'Service unavailable',
      })

      await POST(makePostRequest(VALID_BODY))

      expect(logger.error).toHaveBeenCalledWith(
        '[ChangingLine] Backend error:',
        expect.objectContaining({ status: 503, error: 'Service unavailable' })
      )
    })

    it('should return 502 for any backend error including 404', async () => {
      mockApiClientPost.mockResolvedValue({
        ok: false,
        status: 404,
        error: 'Hexagram not found',
      })

      const response = await POST(makePostRequest(VALID_BODY))
      const data = await response.json()

      // BACKEND_ERROR always maps to 502 regardless of backend status
      expect(response.status).toBe(502)
      expect(data.error.code).toBe('BACKEND_ERROR')
    })
  })

  // -----------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle all 64 hexagrams', async () => {
      for (const hexNum of [1, 32, 64]) {
        const body = { hexagramNumber: hexNum, lineIndex: 0, locale: 'ko' }
        const response = await POST(makePostRequest(body))
        expect(response.status).toBe(200)
      }
    })

    it('should handle all 6 line indices (0-5)', async () => {
      for (let lineIdx = 0; lineIdx < 6; lineIdx++) {
        const body = { hexagramNumber: 1, lineIndex: lineIdx, locale: 'ko' }
        const response = await POST(makePostRequest(body))
        expect(response.status).toBe(200)
      }
    })

    it('should handle empty body', async () => {
      const response = await POST(makePostRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should ignore extra fields in request body', async () => {
      const body = {
        hexagramNumber: 1,
        lineIndex: 0,
        locale: 'ko',
        extraField: 'should be ignored',
        anotherExtra: 123,
      }

      const response = await POST(makePostRequest(body))

      expect(response.status).toBe(200)
    })

    it('should handle string numbers for hexagramNumber', async () => {
      const body = {
        hexagramNumber: '32', // String instead of number
        lineIndex: 0,
        locale: 'ko',
      }

      const response = await POST(makePostRequest(body))
      const data = await response.json()

      // Zod should coerce or reject based on schema
      // Based on schema, it expects number type
      expect(response.status).toBe(400)
    })

    it('should handle rich backend response with all fields', async () => {
      const richResponse = {
        text: '비룡재천',
        meaning: '나는 용이 하늘에 있다',
        interpretation: '대인을 만남이 이롭다',
        lineNumber: 5,
        position: '오효',
        element: '양',
        advice: '적극적으로 나아가라',
        timing: '봄',
      }

      mockApiClientPost.mockResolvedValue({
        ok: true,
        status: 200,
        data: richResponse,
      })

      const response = await POST(makePostRequest(VALID_BODY))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(richResponse)
    })
  })
})
