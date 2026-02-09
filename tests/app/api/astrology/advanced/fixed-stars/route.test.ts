import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============ Mocks (must be before route import) ============

// Mock rate limiting
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}))

// Mock request-ip
vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '192.168.1.1'),
}))

// Mock telemetry
vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

// Mock public token auth
vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: vi.fn(),
}))

// Mock error sanitizer
vi.mock('@/lib/security/errorSanitizer', () => ({
  sanitizeError: vi.fn((error) => ({
    error: 'Internal Server Error',
    message: error?.message || 'Unknown error',
  })),
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

// Mock HTTP_STATUS
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

// Mock Zod validation schema
const mockSafeParse = vi.fn()
vi.mock('@/lib/api/astrology-validation', () => ({
  FixedStarsRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock astrology functions
const mockChartData = {
  planets: [
    { name: 'Sun', longitude: 149.5, latitude: 0 },
    { name: 'Moon', longitude: 45.2, latitude: 1.2 },
    { name: 'Mercury', longitude: 160.8, latitude: -2.1 },
    { name: 'Venus', longitude: 175.3, latitude: 0.8 },
    { name: 'Mars', longitude: 200.1, latitude: 1.5 },
  ],
  houses: [
    { index: 1, cusp: 15.0 },
    { index: 10, cusp: 285.0 },
  ],
  ascendant: 15.0,
  mc: 285.0,
}

const mockChart = {
  planets: [
    { name: 'Sun', longitude: 149.5, sign: 'Leo', degree: 29, minute: 30, house: 5, speed: 1.0, retrograde: false },
    { name: 'Moon', longitude: 45.2, sign: 'Taurus', degree: 15, minute: 12, house: 2, speed: 12.5, retrograde: false },
    { name: 'Mercury', longitude: 160.8, sign: 'Virgo', degree: 10, minute: 48, house: 6, speed: 1.2, retrograde: false },
    { name: 'Venus', longitude: 175.3, sign: 'Virgo', degree: 25, minute: 18, house: 6, speed: 1.1, retrograde: false },
    { name: 'Mars', longitude: 200.1, sign: 'Libra', degree: 20, minute: 6, house: 7, speed: 0.6, retrograde: false },
  ],
  ascendant: { name: 'Ascendant', longitude: 15.0, sign: 'Aries', degree: 15, minute: 0, house: 1, formatted: 'Aries 15d00m' },
  mc: { name: 'MC', longitude: 285.0, sign: 'Capricorn', degree: 15, minute: 0, house: 10, formatted: 'Capricorn 15d00m' },
  houses: [{ index: 1, cusp: 15.0, sign: 'Aries', formatted: 'Aries 15d00m' }],
}

const mockConjunctions = [
  {
    star: {
      name: 'Regulus',
      name_ko: 'Regulus (King Star)',
      longitude: 149.83,
      magnitude: 1.35,
      nature: 'Mars/Jupiter',
      constellation: 'Leo',
      keywords: ['royalty', 'success', 'honor', 'leadership'],
      interpretation: 'The most royal star. Brings success and honor, but beware of revenge.',
    },
    planet: 'Sun',
    orb: 0.33,
    description: 'Sun conjunct Regulus (orb: 0.33 degrees)',
  },
]

const mockBrightStars = [
  { name: 'Sirius', name_ko: 'Sirius', magnitude: -1.46 },
  { name: 'Canopus', name_ko: 'Canopus', magnitude: -0.72 },
  { name: 'Arcturus', name_ko: 'Arcturus', magnitude: -0.05 },
  { name: 'Vega', name_ko: 'Vega', magnitude: 0.03 },
  { name: 'Capella', name_ko: 'Capella', magnitude: 0.08 },
]

vi.mock('@/lib/astrology', () => ({
  calculateNatalChart: vi.fn(),
  toChart: vi.fn(),
  findFixedStarConjunctions: vi.fn(),
  getAllFixedStars: vi.fn(),
}))

// ============ Imports (after all mocks) ============

import { POST } from '@/app/api/astrology/advanced/fixed-stars/route'
import { rateLimit } from '@/lib/rateLimit'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { captureServerError } from '@/lib/telemetry'
import { calculateNatalChart, toChart, findFixedStarConjunctions, getAllFixedStars } from '@/lib/astrology'
import { logger } from '@/lib/logger'

// ============ Helpers ============

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/astrology/advanced/fixed-stars', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const validBody = {
  date: '1990-05-15',
  time: '14:30',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
  orb: 1.0,
  includeAspects: true,
}

const defaultRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '20',
  'X-RateLimit-Remaining': '19',
})

/**
 * Set up all mocks for a successful fixed stars calculation flow.
 */
function setupSuccessfulFlow() {
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    headers: defaultRateLimitHeaders,
  } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
  vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
  mockSafeParse.mockReturnValue({ success: true, data: validBody })
  vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
  vi.mocked(toChart).mockReturnValue(mockChart)
  vi.mocked(findFixedStarConjunctions).mockReturnValue(mockConjunctions)
  vi.mocked(getAllFixedStars).mockReturnValue(mockBrightStars)
}

// ============ Tests ============

describe('Fixed Stars API - POST /api/astrology/advanced/fixed-stars', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- Rate Limiting ----
  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        headers: new Headers({ 'Retry-After': '60' }),
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error.code).toBe('RATE_LIMITED')
      expect(data.error.message).toBe('Too many requests. Please wait a moment.')
    })

    it('should include rate limit headers in rate-limited response', async () => {
      const retryHeaders = new Headers({ 'Retry-After': '30' })
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        headers: retryHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)

      const response = await POST(makeRequest(validBody))

      expect(response.status).toBe(429)
      expect(response.headers.get('Retry-After')).toBe('30')
    })

    it('should allow request when rate limit is not exceeded', async () => {
      setupSuccessfulFlow()

      const response = await POST(makeRequest(validBody))

      expect(response.status).toBe(200)
    })

    it('should use correct rate limit key for fixed-stars endpoint', async () => {
      setupSuccessfulFlow()

      await POST(makeRequest(validBody))

      expect(rateLimit).toHaveBeenCalledWith(
        expect.stringContaining('api:astrology/advanced/fixed-stars:'),
        expect.objectContaining({ limit: 20, windowSeconds: 60 })
      )
    })
  })

  // ---- Token Authentication ----
  describe('Token Authentication', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
    })

    it('should return 401 when public token is invalid', async () => {
      vi.mocked(requirePublicToken).mockReturnValue({
        valid: false,
        reason: 'Invalid or missing token',
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Invalid or missing token')
    })

    it('should proceed when public token is valid', async () => {
      setupSuccessfulFlow()

      const response = await POST(makeRequest(validBody))

      expect(response.status).toBe(200)
    })

    it('should include rate limit headers in unauthorized response', async () => {
      vi.mocked(requirePublicToken).mockReturnValue({
        valid: false,
        reason: 'Invalid token',
      })

      const response = await POST(makeRequest(validBody))

      expect(response.status).toBe(401)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('20')
    })
  })

  // ---- Input Validation ----
  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
    })

    it('should return 400 when Zod validation fails for missing date', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['date'], message: 'Date must be in YYYY-MM-DD format' }],
        },
      })

      const response = await POST(makeRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_DATE')
    })

    it('should return 400 with multiple validation errors', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['date'], message: 'Date must be in YYYY-MM-DD format' },
            { path: ['latitude'], message: 'Latitude must be >= -90' },
            { path: ['longitude'], message: 'Longitude must be >= -180' },
          ],
        },
      })

      const response = await POST(makeRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_DATE')
    })

    it('should return 400 for invalid date format', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['date'], message: 'Date must be in YYYY-MM-DD format' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, date: '15-05-1990' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_DATE')
    })

    it('should return 400 for invalid time format', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['time'], message: 'Time must be in HH:MM format' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, time: '2:30 PM' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_TIME')
    })

    it('should return 400 for invalid latitude out of range', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['latitude'], message: 'Latitude must be <= 90' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, latitude: 100 }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_COORDINATES')
    })

    it('should return 400 for invalid longitude out of range', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['longitude'], message: 'Longitude must be <= 180' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, longitude: 200 }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_COORDINATES')
    })

    it('should return 400 for missing timezone', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['timeZone'], message: 'Timezone is required' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, timeZone: '' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_TIME')
    })

    it('should return 422 for invalid orb value (negative)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['orb'], message: 'Orb must be >= 0' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, orb: -1 }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 for invalid orb value (too large)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['orb'], message: 'Orb must be <= 5' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, orb: 10 }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should log validation warnings', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['date'], message: 'Required' }],
        },
      })

      await POST(makeRequest({}))

      expect(logger.warn).toHaveBeenCalledWith(
        '[FixedStars API] Validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })

    it('should include rate limit headers in validation error response', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['date'], message: 'Required' }],
        },
      })

      const response = await POST(makeRequest({}))

      expect(response.status).toBe(400)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('20')
    })
  })

  // ---- Successful Fixed Stars Calculation ----
  describe('Successful Fixed Stars Calculation', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return 200 with fixed star conjunctions data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.conjunctions).toBeDefined()
      expect(data.data.conjunctions).toHaveLength(1)
      expect(data.data.conjunctions[0].starName).toBe('Regulus')
    })

    it('should return conjunction details with all required fields', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const conjunction = data.data.conjunctions[0]
      expect(conjunction.starName).toBe('Regulus')
      expect(conjunction.starNameKo).toBeDefined()
      expect(conjunction.planet).toBe('Sun')
      expect(conjunction.orb).toBe(0.33)
      expect(conjunction.magnitude).toBe(1.35)
      expect(conjunction.nature).toBe('Mars/Jupiter')
      expect(conjunction.keywords).toBeDefined()
      expect(conjunction.interpretation).toBeDefined()
      expect(conjunction.description).toBeDefined()
    })

    it('should return bright stars count', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.data.brightStarsCount).toBeDefined()
      expect(typeof data.data.brightStarsCount).toBe('number')
    })

    it('should return total conjunctions count', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.data.totalConjunctions).toBeDefined()
      expect(data.data.totalConjunctions).toBe(1)
    })

    it('should call calculateNatalChart with correct parameters', async () => {
      await POST(makeRequest(validBody))

      expect(calculateNatalChart).toHaveBeenCalledWith({
        year: 1990,
        month: 5,
        date: 15,
        hour: 14,
        minute: 30,
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: 'Asia/Seoul',
      })
    })

    it('should call toChart with the natal chart data', async () => {
      await POST(makeRequest(validBody))

      expect(toChart).toHaveBeenCalledWith(mockChartData)
    })

    it('should call findFixedStarConjunctions with chart, year, and orb', async () => {
      await POST(makeRequest(validBody))

      expect(findFixedStarConjunctions).toHaveBeenCalledWith(mockChart, 1990, 1.0)
    })

    it('should use default orb value when not provided', async () => {
      const bodyWithoutOrb = { ...validBody }
      delete (bodyWithoutOrb as Partial<typeof validBody>).orb

      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, orb: 1.0 }, // Default orb is 1.0
      })

      await POST(makeRequest(bodyWithoutOrb))

      expect(findFixedStarConjunctions).toHaveBeenCalledWith(mockChart, 1990, 1.0)
    })

    it('should call getAllFixedStars and filter bright stars', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(getAllFixedStars).toHaveBeenCalled()
      expect(data.data.brightStarsCount).toBeDefined()
    })

    it('should include rate limit headers in successful response', async () => {
      const response = await POST(makeRequest(validBody))

      expect(response.status).toBe(200)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('20')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('19')
    })

    it('should set Cache-Control to no-store', async () => {
      const response = await POST(makeRequest(validBody))

      expect(response.headers.get('Cache-Control')).toBe('no-store')
    })
  })

  // ---- Error Handling ----
  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
      mockSafeParse.mockReturnValue({ success: true, data: validBody })
    })

    it('should return 500 when calculateNatalChart throws', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Ephemeris engine error'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Internal server error')
      expect(captureServerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ route: '/api/astrology/advanced/fixed-stars' })
      )
    })

    it('should return 500 when toChart throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockImplementation(() => {
        throw new Error('Chart conversion failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Internal server error')
    })

    it('should return 500 when findFixedStarConjunctions throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockReturnValue(mockChart)
      vi.mocked(findFixedStarConjunctions).mockImplementation(() => {
        throw new Error('Fixed star calculation failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Internal server error')
    })

    it('should return 500 when getAllFixedStars throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockReturnValue(mockChart)
      vi.mocked(findFixedStarConjunctions).mockReturnValue(mockConjunctions)
      vi.mocked(getAllFixedStars).mockImplementation(() => {
        throw new Error('Failed to get fixed stars')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Internal server error')
    })

    it('should handle malformed JSON body gracefully', async () => {
      const badRequest = new Request('http://localhost/api/astrology/advanced/fixed-stars', {
        method: 'POST',
        body: 'not-json{{',
        headers: { 'content-type': 'application/json' },
      })

      // When JSON parsing fails, body becomes {}, validation should fail
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['date'], message: 'Required' }],
        },
      })

      const response = await POST(badRequest)

      expect([400, 500]).toContain(response.status)
    })

    it('should capture server errors via telemetry', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Calculation engine crashed'))

      await POST(makeRequest(validBody))

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Calculation engine crashed' }),
        { route: '/api/astrology/advanced/fixed-stars' }
      )
    })
  })

  // ---- Edge Cases ----
  describe('Edge Cases', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should handle minimum valid latitude (-90)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, latitude: -90 },
      })

      const response = await POST(makeRequest({ ...validBody, latitude: -90 }))

      expect(response.status).toBe(200)
      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -90 })
      )
    })

    it('should handle maximum valid latitude (90)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, latitude: 90 },
      })

      const response = await POST(makeRequest({ ...validBody, latitude: 90 }))

      expect(response.status).toBe(200)
    })

    it('should handle minimum valid longitude (-180)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, longitude: -180 },
      })

      const response = await POST(makeRequest({ ...validBody, longitude: -180 }))

      expect(response.status).toBe(200)
    })

    it('should handle maximum valid longitude (180)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, longitude: 180 },
      })

      const response = await POST(makeRequest({ ...validBody, longitude: 180 }))

      expect(response.status).toBe(200)
    })

    it('should handle minimum valid orb (0)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, orb: 0 },
      })

      await POST(makeRequest({ ...validBody, orb: 0 }))

      expect(findFixedStarConjunctions).toHaveBeenCalledWith(mockChart, 1990, 0)
    })

    it('should handle maximum valid orb (5)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, orb: 5 },
      })

      await POST(makeRequest({ ...validBody, orb: 5 }))

      expect(findFixedStarConjunctions).toHaveBeenCalledWith(mockChart, 1990, 5)
    })

    it('should handle empty conjunctions array', async () => {
      vi.mocked(findFixedStarConjunctions).mockReturnValue([])

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.conjunctions).toEqual([])
      expect(data.data.totalConjunctions).toBe(0)
    })

    it('should handle multiple conjunctions', async () => {
      const multipleConjunctions = [
        ...mockConjunctions,
        {
          star: {
            name: 'Sirius',
            name_ko: 'Sirius (Dog Star)',
            longitude: 104.08,
            magnitude: -1.46,
            nature: 'Jupiter/Mars',
            constellation: 'Canis Major',
            keywords: ['fame', 'wealth', 'passion', 'honor'],
            interpretation: 'The brightest star in the night sky. Brings fame and wealth.',
          },
          planet: 'Moon',
          orb: 0.88,
          description: 'Moon conjunct Sirius (orb: 0.88 degrees)',
        },
      ]
      vi.mocked(findFixedStarConjunctions).mockReturnValue(multipleConjunctions)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.conjunctions).toHaveLength(2)
      expect(data.data.totalConjunctions).toBe(2)
    })

    it('should handle historical birth dates', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: '1850-01-01' },
      })

      await POST(makeRequest({ ...validBody, date: '1850-01-01' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ year: 1850, month: 1, date: 1 })
      )
    })

    it('should handle future birth dates', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: '2100-12-31' },
      })

      await POST(makeRequest({ ...validBody, date: '2100-12-31' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2100, month: 12, date: 31 })
      )
    })

    it('should handle concurrent requests without state leaking', async () => {
      const requests = Array.from({ length: 3 }, (_, i) =>
        makeRequest({ ...validBody, latitude: 30 + i * 10 })
      )

      vi.mocked(calculateNatalChart).mockImplementation(async (input) => ({
        ...mockChartData,
        // Return different data based on latitude to verify independence
        planets: mockChartData.planets.map((p) => ({
          ...p,
          longitude: p.longitude + (input.latitude as number),
        })),
      }))

      const responses = await Promise.all(requests.map((r) => POST(r)))

      responses.forEach((r) => {
        expect(r.status).toBe(200)
      })
      expect(calculateNatalChart).toHaveBeenCalledTimes(3)
    })

    it('should handle different timezones correctly', async () => {
      const timeZones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Pacific/Auckland']

      for (const tz of timeZones) {
        vi.clearAllMocks()
        setupSuccessfulFlow()
        mockSafeParse.mockReturnValue({
          success: true,
          data: { ...validBody, timeZone: tz },
        })

        const response = await POST(makeRequest({ ...validBody, timeZone: tz }))

        expect(response.status).toBe(200)
        expect(calculateNatalChart).toHaveBeenCalledWith(
          expect.objectContaining({ timeZone: tz })
        )
      }
    })

    it('should handle midnight time correctly', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, time: '00:00' },
      })

      await POST(makeRequest({ ...validBody, time: '00:00' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ hour: 0, minute: 0 })
      )
    })

    it('should handle end-of-day time correctly', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, time: '23:59' },
      })

      await POST(makeRequest({ ...validBody, time: '23:59' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ hour: 23, minute: 59 })
      )
    })

    it('should handle fractional orb values', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, orb: 1.5 },
      })

      await POST(makeRequest({ ...validBody, orb: 1.5 }))

      expect(findFixedStarConjunctions).toHaveBeenCalledWith(mockChart, 1990, 1.5)
    })
  })

  // ---- Response Structure ----
  describe('Response Structure', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return properly structured conjunction objects', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.data).toHaveProperty('conjunctions')
      expect(data.data).toHaveProperty('brightStarsCount')
      expect(data.data).toHaveProperty('totalConjunctions')

      if (data.data.conjunctions.length > 0) {
        const conjunction = data.data.conjunctions[0]
        expect(conjunction).toHaveProperty('starName')
        expect(conjunction).toHaveProperty('starNameKo')
        expect(conjunction).toHaveProperty('planet')
        expect(conjunction).toHaveProperty('orb')
        expect(conjunction).toHaveProperty('magnitude')
        expect(conjunction).toHaveProperty('nature')
        expect(conjunction).toHaveProperty('keywords')
        expect(conjunction).toHaveProperty('interpretation')
        expect(conjunction).toHaveProperty('description')
      }
    })

    it('should transform star data correctly in response', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const conjunction = data.data.conjunctions[0]
      expect(conjunction.starName).toBe(mockConjunctions[0].star.name)
      expect(conjunction.starNameKo).toBe(mockConjunctions[0].star.name_ko)
      expect(conjunction.magnitude).toBe(mockConjunctions[0].star.magnitude)
      expect(conjunction.nature).toBe(mockConjunctions[0].star.nature)
      expect(conjunction.keywords).toEqual(mockConjunctions[0].star.keywords)
      expect(conjunction.interpretation).toBe(mockConjunctions[0].star.interpretation)
    })

    it('should not expose internal chart data in response', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data).not.toHaveProperty('chart')
      expect(data).not.toHaveProperty('planets')
      expect(data).not.toHaveProperty('houses')
      expect(data).not.toHaveProperty('ascendant')
      expect(data).not.toHaveProperty('mc')
    })
  })
})
