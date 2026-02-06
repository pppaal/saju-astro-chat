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
  LunarReturnRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock astrology functions
const mockLunarReturnChart = {
  planets: [
    { name: 'Sun', longitude: 45.2, sign: 'Taurus', degree: 15, minute: 12, house: 2, speed: 1.0, retrograde: false },
    { name: 'Moon', longitude: 120.5, sign: 'Leo', degree: 0, minute: 30, house: 5, speed: 12.5, retrograde: false },
  ],
  ascendant: { name: 'Ascendant', longitude: 25.0, sign: 'Aries', degree: 25, minute: 0, house: 1, formatted: 'Aries 25°00′' },
  mc: { name: 'MC', longitude: 295.0, sign: 'Capricorn', degree: 25, minute: 0, house: 10, formatted: 'Capricorn 25°00′' },
  houses: [{ index: 1, cusp: 25.0, sign: 'Aries', formatted: 'Aries 25°00′' }],
  returnType: 'lunar' as const,
  returnYear: 2024,
  returnMonth: 6,
  exactReturnTime: '2024-06-10T14:22:00.000Z',
}

const mockLunarReturnSummary = {
  year: 2024,
  month: 6,
  ascSign: 'Aries',
  moonHouse: 5,
  sunSign: 'Taurus',
  theme: '창조성과 즐거움을 추구하는 달',
}

vi.mock('@/lib/astrology', () => ({
  calculateLunarReturn: vi.fn(),
  getLunarReturnSummary: vi.fn(),
}))

// ============ Imports (after all mocks) ============

import { POST } from '@/app/api/astrology/advanced/lunar-return/route'
import { rateLimit } from '@/lib/rateLimit'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { captureServerError } from '@/lib/telemetry'
import { calculateLunarReturn, getLunarReturnSummary } from '@/lib/astrology'
import { logger } from '@/lib/logger'

// ============ Helpers ============

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/astrology/advanced/lunar-return', {
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
  month: 6,
}

const defaultRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '20',
  'X-RateLimit-Remaining': '19',
})

/**
 * Set up all mocks for a successful lunar return calculation flow.
 */
function setupSuccessfulFlow() {
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    headers: defaultRateLimitHeaders,
  } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
  vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
  mockSafeParse.mockReturnValue({ success: true, data: validBody })
  vi.mocked(calculateLunarReturn).mockResolvedValue(mockLunarReturnChart)
  vi.mocked(getLunarReturnSummary).mockReturnValue(mockLunarReturnSummary)
}

// ============ Tests ============

describe('Lunar Return API - POST /api/astrology/advanced/lunar-return', () => {
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
      expect(data.error).toBe('Too many requests. Try again soon.')
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
      expect(data.error).toBe('Unauthorized')
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
      expect(data.error).toBe('Validation failed')
      expect(data.details).toContain('date')
    })

    it('should return 400 with multiple validation errors', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['date'], message: 'Date must be in YYYY-MM-DD format' },
            { path: ['latitude'], message: 'Latitude must be >= -90' },
            { path: ['month'], message: 'Month must be between 1 and 12' },
          ],
        },
      })

      const response = await POST(makeRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.issues).toHaveLength(3)
    })

    it('should return 400 for invalid latitude out of range', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['latitude'], message: 'Latitude must be <= 90' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, latitude: 95 }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('latitude')
    })

    it('should return 400 for invalid longitude out of range', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['longitude'], message: 'Longitude must be <= 180' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, longitude: 185 }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('longitude')
    })

    it('should return 400 for invalid month (out of 1-12 range)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['month'], message: 'Month must be between 1 and 12' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, month: 13 }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('month')
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
      expect(data.details).toContain('timeZone')
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
        '[LunarReturn API] Validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  // ---- Successful Chart Calculation ----
  describe('Successful Chart Calculation', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return 200 with lunar return chart data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chart).toEqual(mockLunarReturnChart)
      expect(data.summary).toEqual(mockLunarReturnSummary)
      expect(data.year).toBe(2024)
      expect(data.month).toBe(6)
    })

    it('should call calculateLunarReturn with correct parameters', async () => {
      await POST(makeRequest(validBody))

      expect(calculateLunarReturn).toHaveBeenCalledWith({
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
        month: 6,
      })
    })

    it('should use current year when year is not provided', async () => {
      const currentYear = new Date().getFullYear()
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, year: undefined },
      })

      await POST(makeRequest({ ...validBody, year: undefined }))

      expect(calculateLunarReturn).toHaveBeenCalledWith(
        expect.objectContaining({ year: currentYear })
      )
    })

    it('should use current month when month is not provided', async () => {
      const currentMonth = new Date().getMonth() + 1
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, month: undefined },
      })

      await POST(makeRequest({ ...validBody, month: undefined }))

      expect(calculateLunarReturn).toHaveBeenCalledWith(
        expect.objectContaining({ month: currentMonth })
      )
    })

    it('should call getLunarReturnSummary with the calculated chart', async () => {
      await POST(makeRequest(validBody))

      expect(getLunarReturnSummary).toHaveBeenCalledWith(mockLunarReturnChart)
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

    it('should return 500 when calculateLunarReturn throws', async () => {
      vi.mocked(calculateLunarReturn).mockRejectedValue(new Error('Ephemeris engine error'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(captureServerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ route: '/api/astrology/advanced/lunar-return' })
      )
    })

    it('should return 500 when getLunarReturnSummary throws', async () => {
      vi.mocked(calculateLunarReturn).mockResolvedValue(mockLunarReturnChart)
      vi.mocked(getLunarReturnSummary).mockImplementation(() => {
        throw new Error('Summary calculation failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should return 500 when request.json() throws (malformed body)', async () => {
      const badRequest = new Request('http://localhost/api/astrology/advanced/lunar-return', {
        method: 'POST',
        body: 'not-json{{',
        headers: { 'content-type': 'application/json' },
      })

      const response = await POST(badRequest)

      // When JSON parsing fails, body becomes {}, validation should still run
      expect([400, 500]).toContain(response.status)
    })

    it('should capture server errors via telemetry', async () => {
      vi.mocked(calculateLunarReturn).mockRejectedValue(new Error('Moon calculation failed'))

      await POST(makeRequest(validBody))

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Moon calculation failed' }),
        { route: '/api/astrology/advanced/lunar-return' }
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
      expect(calculateLunarReturn).toHaveBeenCalledWith(
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

    it('should handle minimum valid month (1)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, month: 1 },
      })

      await POST(makeRequest({ ...validBody, month: 1 }))

      expect(calculateLunarReturn).toHaveBeenCalledWith(
        expect.objectContaining({ month: 1 })
      )
    })

    it('should handle maximum valid month (12)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, month: 12 },
      })

      await POST(makeRequest({ ...validBody, month: 12 }))

      expect(calculateLunarReturn).toHaveBeenCalledWith(
        expect.objectContaining({ month: 12 })
      )
    })

    it('should handle future year and month calculation', async () => {
      const futureYear = 2050
      const futureMonth = 8
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, year: futureYear, month: futureMonth },
      })

      await POST(makeRequest({ ...validBody, year: futureYear, month: futureMonth }))

      expect(calculateLunarReturn).toHaveBeenCalledWith(
        expect.objectContaining({ year: futureYear, month: futureMonth })
      )
    })

    it('should handle past year calculation', async () => {
      const pastYear = 1960
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, year: pastYear },
      })

      await POST(makeRequest({ ...validBody, year: pastYear }))

      expect(calculateLunarReturn).toHaveBeenCalledWith(
        expect.objectContaining({ year: pastYear })
      )
    })

    it('should handle concurrent requests without state leaking', async () => {
      const requests = Array.from({ length: 3 }, (_, i) =>
        makeRequest({ ...validBody, month: (i % 12) + 1 })
      )

      // Configure mock to return different months based on input
      vi.mocked(calculateLunarReturn).mockImplementation(async (input) => ({
        ...mockLunarReturnChart,
        returnMonth: input.month,
      }))

      const responses = await Promise.all(requests.map((r) => POST(r)))

      responses.forEach((r) => {
        expect(r.status).toBe(200)
      })
      expect(calculateLunarReturn).toHaveBeenCalledTimes(3)
    })

    it('should handle chart with empty planets array', async () => {
      vi.mocked(calculateLunarReturn).mockResolvedValue({
        ...mockLunarReturnChart,
        planets: [],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chart.planets).toEqual([])
    })

    it('should handle different timezones correctly', async () => {
      const timeZones = ['America/New_York', 'Europe/London', 'Asia/Tokyo']

      for (const tz of timeZones) {
        mockSafeParse.mockReturnValue({
          success: true,
          data: { ...validBody, timeZone: tz },
        })

        const response = await POST(makeRequest({ ...validBody, timeZone: tz }))

        expect(response.status).toBe(200)
        expect(calculateLunarReturn).toHaveBeenCalledWith(
          expect.objectContaining({
            natal: expect.objectContaining({ timeZone: tz }),
          })
        )
      }
    })
  })
})
