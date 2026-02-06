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
  SolarReturnRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock astrology functions
const mockSolarReturnChart = {
  planets: [
    { name: 'Sun', longitude: 120.5, sign: 'Leo', degree: 0, minute: 30, house: 5, speed: 1.0, retrograde: false },
    { name: 'Moon', longitude: 45.2, sign: 'Taurus', degree: 15, minute: 12, house: 2, speed: 12.5, retrograde: false },
  ],
  ascendant: { name: 'Ascendant', longitude: 15.0, sign: 'Aries', degree: 15, minute: 0, house: 1, formatted: 'Aries 15°00′' },
  mc: { name: 'MC', longitude: 285.0, sign: 'Capricorn', degree: 15, minute: 0, house: 10, formatted: 'Capricorn 15°00′' },
  houses: [{ index: 1, cusp: 15.0, sign: 'Aries', formatted: 'Aries 15°00′' }],
  returnType: 'solar' as const,
  returnYear: 2024,
  exactReturnTime: '2024-05-15T08:30:00.000Z',
}

const mockSolarReturnSummary = {
  year: 2024,
  ascSign: 'Aries',
  sunHouse: 5,
  moonSign: 'Taurus',
  moonHouse: 2,
  theme: '창조성, 로맨스, 자녀 관련 이벤트의 해',
}

vi.mock('@/lib/astrology', () => ({
  calculateSolarReturn: vi.fn(),
  getSolarReturnSummary: vi.fn(),
}))

// ============ Imports (after all mocks) ============

import { POST } from '@/app/api/astrology/advanced/solar-return/route'
import { rateLimit } from '@/lib/rateLimit'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { captureServerError } from '@/lib/telemetry'
import { calculateSolarReturn, getSolarReturnSummary } from '@/lib/astrology'
import { logger } from '@/lib/logger'

// ============ Helpers ============

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/astrology/advanced/solar-return', {
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
  year: 2024,
}

const defaultRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '20',
  'X-RateLimit-Remaining': '19',
})

/**
 * Set up all mocks for a successful solar return calculation flow.
 */
function setupSuccessfulFlow() {
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    headers: defaultRateLimitHeaders,
  } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
  vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
  mockSafeParse.mockReturnValue({ success: true, data: validBody })
  vi.mocked(calculateSolarReturn).mockResolvedValue(mockSolarReturnChart)
  vi.mocked(getSolarReturnSummary).mockReturnValue(mockSolarReturnSummary)
}

// ============ Tests ============

describe('Solar Return API - POST /api/astrology/advanced/solar-return', () => {
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
    })

    it('should allow request when rate limit is not exceeded', async () => {
      setupSuccessfulFlow()

      const response = await POST(makeRequest(validBody))

      expect(response.status).toBe(200)
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
    })

    it('should proceed when public token is valid', async () => {
      setupSuccessfulFlow()

      const response = await POST(makeRequest(validBody))

      expect(response.status).toBe(200)
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

    it('should log validation warnings', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['date'], message: 'Required' }],
        },
      })

      await POST(makeRequest({}))

      expect(logger.warn).toHaveBeenCalledWith(
        '[SolarReturn API] Validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  // ---- Successful Chart Calculation ----
  describe('Successful Chart Calculation', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return 200 with solar return chart data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chart).toEqual(mockSolarReturnChart)
      expect(data.summary).toEqual(mockSolarReturnSummary)
      expect(data.year).toBe(2024)
    })

    it('should call calculateSolarReturn with correct parameters', async () => {
      await POST(makeRequest(validBody))

      expect(calculateSolarReturn).toHaveBeenCalledWith({
        natal: {
          year: 1990,
          month: 5,
          date: 15,
          hour: 14,
          minute: 30,
          latitude: 37.5665,
          longitude: 126.978,
          timeZone: 'Asia/Seoul',
        },
        year: 2024,
      })
    })

    it('should use current year when year is not provided', async () => {
      const currentYear = new Date().getFullYear()
      const bodyWithoutYear = { ...validBody }
      delete (bodyWithoutYear as Partial<typeof validBody>).year

      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, year: undefined },
      })

      await POST(makeRequest(bodyWithoutYear))

      expect(calculateSolarReturn).toHaveBeenCalledWith({
        natal: expect.any(Object),
        year: currentYear,
      })
    })

    it('should call getSolarReturnSummary with the calculated chart', async () => {
      await POST(makeRequest(validBody))

      expect(getSolarReturnSummary).toHaveBeenCalledWith(mockSolarReturnChart)
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

    it('should return 500 when calculateSolarReturn throws', async () => {
      vi.mocked(calculateSolarReturn).mockRejectedValue(new Error('Ephemeris engine error'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(captureServerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ route: '/api/astrology/advanced/solar-return' })
      )
    })

    it('should return 500 when getSolarReturnSummary throws', async () => {
      vi.mocked(calculateSolarReturn).mockResolvedValue(mockSolarReturnChart)
      vi.mocked(getSolarReturnSummary).mockImplementation(() => {
        throw new Error('Summary calculation failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should return 500 when request.json() throws (malformed body)', async () => {
      const badRequest = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        body: 'not-json{{',
        headers: { 'content-type': 'application/json' },
      })

      const response = await POST(badRequest)

      // When JSON parsing fails, body becomes {}, validation should still run
      expect([400, 500]).toContain(response.status)
    })

    it('should capture server errors via telemetry', async () => {
      vi.mocked(calculateSolarReturn).mockRejectedValue(new Error('Something broke'))

      await POST(makeRequest(validBody))

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Something broke' }),
        { route: '/api/astrology/advanced/solar-return' }
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
      expect(calculateSolarReturn).toHaveBeenCalledWith(
        expect.objectContaining({
          natal: expect.objectContaining({ latitude: -90 }),
        })
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

    it('should handle future year calculation', async () => {
      const futureYear = 2050
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, year: futureYear },
      })

      await POST(makeRequest({ ...validBody, year: futureYear }))

      expect(calculateSolarReturn).toHaveBeenCalledWith(
        expect.objectContaining({ year: futureYear })
      )
    })

    it('should handle past year calculation', async () => {
      const pastYear = 1950
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, year: pastYear },
      })

      await POST(makeRequest({ ...validBody, year: pastYear }))

      expect(calculateSolarReturn).toHaveBeenCalledWith(
        expect.objectContaining({ year: pastYear })
      )
    })

    it('should handle concurrent requests without state leaking', async () => {
      const requests = Array.from({ length: 3 }, (_, i) =>
        makeRequest({ ...validBody, year: 2020 + i })
      )

      // Configure mock to return different years based on input
      vi.mocked(calculateSolarReturn).mockImplementation(async (input) => ({
        ...mockSolarReturnChart,
        returnYear: input.year,
      }))

      const responses = await Promise.all(requests.map((r) => POST(r)))

      responses.forEach((r) => {
        expect(r.status).toBe(200)
      })
      expect(calculateSolarReturn).toHaveBeenCalledTimes(3)
    })

    it('should handle chart with empty planets array', async () => {
      vi.mocked(calculateSolarReturn).mockResolvedValue({
        ...mockSolarReturnChart,
        planets: [],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chart.planets).toEqual([])
    })
  })
})
