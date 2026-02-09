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
  EclipsesRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock astrology functions
const mockNatalChartData = {
  planets: [
    { name: 'Sun', longitude: 120.5, sign: 'Leo', degree: 0, minute: 30 },
    { name: 'Moon', longitude: 45.2, sign: 'Taurus', degree: 15, minute: 12 },
    { name: 'Mercury', longitude: 130.0, sign: 'Leo', degree: 10, minute: 0 },
    { name: 'Venus', longitude: 100.0, sign: 'Cancer', degree: 10, minute: 0 },
    { name: 'Mars', longitude: 200.0, sign: 'Libra', degree: 20, minute: 0 },
  ],
  ascendant: { longitude: 15.0, sign: 'Aries', degree: 15, minute: 0 },
  mc: { longitude: 285.0, sign: 'Capricorn', degree: 15, minute: 0 },
  houses: [{ index: 1, cusp: 15.0, sign: 'Aries' }],
}

const mockNatalChart = {
  planets: mockNatalChartData.planets,
  ascendant: mockNatalChartData.ascendant,
  mc: mockNatalChartData.mc,
  houses: mockNatalChartData.houses,
}

const mockEclipseImpacts = [
  {
    eclipse: {
      date: '2024-04-08',
      type: 'Solar',
      sign: 'Aries',
      degree: 19.5,
      description: 'Total Solar Eclipse in Aries',
    },
    affectedPoint: 'Ascendant',
    aspectType: 'conjunction',
    orb: 2.5,
    house: 1,
    interpretation: 'Significant personal transformation and new beginnings',
  },
  {
    eclipse: {
      date: '2024-09-17',
      type: 'Lunar',
      sign: 'Pisces',
      degree: 25.0,
      description: 'Partial Lunar Eclipse in Pisces',
    },
    affectedPoint: 'Moon',
    aspectType: 'trine',
    orb: 1.2,
    house: 12,
    interpretation: 'Emotional insights and spiritual awakening',
  },
]

const mockUpcomingEclipses = [
  {
    date: '2024-04-08',
    type: 'Solar',
    sign: 'Aries',
    degree: 19.5,
    description: 'Total Solar Eclipse in Aries',
  },
  {
    date: '2024-09-17',
    type: 'Lunar',
    sign: 'Pisces',
    degree: 25.0,
    description: 'Partial Lunar Eclipse in Pisces',
  },
  {
    date: '2024-10-02',
    type: 'Solar',
    sign: 'Libra',
    degree: 10.0,
    description: 'Annular Solar Eclipse in Libra',
  },
  {
    date: '2025-03-14',
    type: 'Lunar',
    sign: 'Virgo',
    degree: 24.0,
    description: 'Total Lunar Eclipse in Virgo',
  },
]

const mockSensitivityResult = {
  sensitive: true,
  sensitivePoints: ['Ascendant', 'Moon', 'North Node'],
  nodeSign: 'Aries',
}

vi.mock('@/lib/astrology', () => ({
  calculateNatalChart: vi.fn(),
  toChart: vi.fn(),
  findEclipseImpact: vi.fn(),
  getUpcomingEclipses: vi.fn(),
  checkEclipseSensitivity: vi.fn(),
}))

// ============ Imports (after all mocks) ============

import { POST } from '@/app/api/astrology/advanced/eclipses/route'
import { rateLimit } from '@/lib/rateLimit'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { captureServerError } from '@/lib/telemetry'
import {
  calculateNatalChart,
  toChart,
  findEclipseImpact,
  getUpcomingEclipses,
  checkEclipseSensitivity,
} from '@/lib/astrology'
import { logger } from '@/lib/logger'

// ============ Helpers ============

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/astrology/advanced/eclipses', {
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
  orb: 3.0,
}

const defaultRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '20',
  'X-RateLimit-Remaining': '19',
})

/**
 * Set up all mocks for a successful eclipse calculation flow.
 */
function setupSuccessfulFlow() {
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    headers: defaultRateLimitHeaders,
  } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
  vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
  mockSafeParse.mockReturnValue({ success: true, data: validBody })
  vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartData)
  vi.mocked(toChart).mockReturnValue(mockNatalChart)
  vi.mocked(findEclipseImpact).mockReturnValue(mockEclipseImpacts)
  vi.mocked(getUpcomingEclipses).mockReturnValue(mockUpcomingEclipses)
  vi.mocked(checkEclipseSensitivity).mockReturnValue(mockSensitivityResult)
}

// ============ Tests ============

describe('Eclipses API - POST /api/astrology/advanced/eclipses', () => {
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
      expect(data.success).toBe(false)
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
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Invalid or missing token')
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
            { path: ['longitude'], message: 'Longitude must be >= -180' },
          ],
        },
      })

      const response = await POST(makeRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.issues).toHaveLength(3)
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
      expect(data.details).toContain('date')
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
      expect(data.details).toContain('time')
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
      expect(data.details).toContain('latitude')
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
      expect(data.details).toContain('longitude')
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

    it('should return 400 for orb value too high', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['orb'], message: 'Orb must be <= 10' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, orb: 15 }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('orb')
    })

    it('should return 400 for negative orb value', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['orb'], message: 'Orb must be >= 0' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, orb: -1 }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('orb')
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
        '[Eclipses API] Validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  // ---- Successful Eclipse Calculation ----
  describe('Successful Eclipse Calculation', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return 200 with eclipse data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.impacts).toBeDefined()
      expect(data.upcoming).toBeDefined()
      expect(data.sensitivity).toBeDefined()
      expect(data.totalImpacts).toBe(2)
    })

    it('should return properly formatted impacts', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.impacts).toHaveLength(2)
      expect(data.impacts[0]).toEqual({
        eclipseDate: '2024-04-08',
        eclipseType: 'Solar',
        eclipseSign: 'Aries',
        eclipseDegree: 19.5,
        eclipseDescription: 'Total Solar Eclipse in Aries',
        affectedPoint: 'Ascendant',
        aspectType: 'conjunction',
        orb: 2.5,
        house: 1,
        interpretation: 'Significant personal transformation and new beginnings',
      })
    })

    it('should return properly formatted upcoming eclipses', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.upcoming).toHaveLength(4)
      expect(data.upcoming[0]).toEqual({
        date: '2024-04-08',
        type: 'Solar',
        sign: 'Aries',
        degree: 19.5,
        description: 'Total Solar Eclipse in Aries',
      })
    })

    it('should return properly formatted sensitivity data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.sensitivity).toEqual({
        isSensitive: true,
        sensitivePoints: ['Ascendant', 'Moon', 'North Node'],
        nodeSign: 'Aries',
      })
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

    it('should call toChart with the calculated chart data', async () => {
      await POST(makeRequest(validBody))

      expect(toChart).toHaveBeenCalledWith(mockNatalChartData)
    })

    it('should call findEclipseImpact with natal chart and orb', async () => {
      await POST(makeRequest(validBody))

      expect(findEclipseImpact).toHaveBeenCalledWith(mockNatalChart, undefined, 3.0)
    })

    it('should call getUpcomingEclipses with current date and count of 4', async () => {
      await POST(makeRequest(validBody))

      expect(getUpcomingEclipses).toHaveBeenCalledWith(expect.any(Date), 4)
    })

    it('should call checkEclipseSensitivity with the natal chart', async () => {
      await POST(makeRequest(validBody))

      expect(checkEclipseSensitivity).toHaveBeenCalledWith(mockNatalChart)
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

    it('should use default orb when not provided', async () => {
      const bodyWithoutOrb = { ...validBody }
      delete (bodyWithoutOrb as Record<string, unknown>).orb
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, orb: 3.0 }, // default orb value
      })

      await POST(makeRequest(bodyWithoutOrb))

      expect(findEclipseImpact).toHaveBeenCalledWith(mockNatalChart, undefined, 3.0)
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
      expect(data.error).toBe('Internal Server Error')
      expect(captureServerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ route: '/api/astrology/advanced/eclipses' })
      )
    })

    it('should return 500 when toChart throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartData)
      vi.mocked(toChart).mockImplementation(() => {
        throw new Error('Chart conversion failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should return 500 when findEclipseImpact throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartData)
      vi.mocked(toChart).mockReturnValue(mockNatalChart)
      vi.mocked(findEclipseImpact).mockImplementation(() => {
        throw new Error('Eclipse impact calculation failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should return 500 when getUpcomingEclipses throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartData)
      vi.mocked(toChart).mockReturnValue(mockNatalChart)
      vi.mocked(findEclipseImpact).mockReturnValue(mockEclipseImpacts)
      vi.mocked(getUpcomingEclipses).mockImplementation(() => {
        throw new Error('Upcoming eclipses fetch failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should return 500 when checkEclipseSensitivity throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChartData)
      vi.mocked(toChart).mockReturnValue(mockNatalChart)
      vi.mocked(findEclipseImpact).mockReturnValue(mockEclipseImpacts)
      vi.mocked(getUpcomingEclipses).mockReturnValue(mockUpcomingEclipses)
      vi.mocked(checkEclipseSensitivity).mockImplementation(() => {
        throw new Error('Sensitivity check failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should handle malformed JSON body gracefully', async () => {
      const badRequest = new Request('http://localhost/api/astrology/advanced/eclipses', {
        method: 'POST',
        body: 'not-json{{',
        headers: { 'content-type': 'application/json' },
      })

      const response = await POST(badRequest)

      // When JSON parsing fails, body becomes {}, validation should still run
      expect([400, 500]).toContain(response.status)
    })

    it('should capture server errors via telemetry', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Eclipse calculation failed'))

      await POST(makeRequest(validBody))

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Eclipse calculation failed' }),
        { route: '/api/astrology/advanced/eclipses' }
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

      expect(findEclipseImpact).toHaveBeenCalledWith(mockNatalChart, undefined, 0)
    })

    it('should handle maximum valid orb (10)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, orb: 10 },
      })

      await POST(makeRequest({ ...validBody, orb: 10 }))

      expect(findEclipseImpact).toHaveBeenCalledWith(mockNatalChart, undefined, 10)
    })

    it('should handle empty impacts array', async () => {
      vi.mocked(findEclipseImpact).mockReturnValue([])

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.impacts).toEqual([])
      expect(data.totalImpacts).toBe(0)
    })

    it('should handle non-sensitive natal chart', async () => {
      vi.mocked(checkEclipseSensitivity).mockReturnValue({
        sensitive: false,
        sensitivePoints: [],
        nodeSign: 'Cancer',
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sensitivity.isSensitive).toBe(false)
      expect(data.sensitivity.sensitivePoints).toEqual([])
    })

    it('should handle empty upcoming eclipses', async () => {
      vi.mocked(getUpcomingEclipses).mockReturnValue([])

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.upcoming).toEqual([])
    })

    it('should handle concurrent requests without state leaking', async () => {
      const requests = Array.from({ length: 3 }, (_, i) =>
        makeRequest({ ...validBody, orb: i + 1 })
      )

      // Configure mock to return different orb values based on input
      vi.mocked(findEclipseImpact).mockImplementation((chart, eclipses, orb) => {
        return mockEclipseImpacts.map((impact) => ({
          ...impact,
          orb: orb || 3.0,
        }))
      })

      const responses = await Promise.all(requests.map((r) => POST(r)))

      responses.forEach((r) => {
        expect(r.status).toBe(200)
      })
      expect(findEclipseImpact).toHaveBeenCalledTimes(3)
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

    it('should handle end of day time correctly', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, time: '23:59' },
      })

      await POST(makeRequest({ ...validBody, time: '23:59' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ hour: 23, minute: 59 })
      )
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
        expect(calculateNatalChart).toHaveBeenCalledWith(
          expect.objectContaining({ timeZone: tz })
        )
      }
    })

    it('should handle numeric timezone offset correctly', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, timeZone: 9 },
      })

      await POST(makeRequest({ ...validBody, timeZone: 9 }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ timeZone: '9' })
      )
    })

    it('should handle fractional orb values', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, orb: 2.5 },
      })

      await POST(makeRequest({ ...validBody, orb: 2.5 }))

      expect(findEclipseImpact).toHaveBeenCalledWith(mockNatalChart, undefined, 2.5)
    })
  })

  // ---- Response Structure ----
  describe('Response Structure', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should contain all required top-level fields', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data).toHaveProperty('impacts')
      expect(data).toHaveProperty('upcoming')
      expect(data).toHaveProperty('sensitivity')
      expect(data).toHaveProperty('totalImpacts')
    })

    it('should have correct types for top-level fields', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(Array.isArray(data.impacts)).toBe(true)
      expect(Array.isArray(data.upcoming)).toBe(true)
      expect(typeof data.sensitivity).toBe('object')
      expect(typeof data.totalImpacts).toBe('number')
    })

    it('should have correct structure for impact items', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      if (data.impacts.length > 0) {
        const impact = data.impacts[0]
        expect(impact).toHaveProperty('eclipseDate')
        expect(impact).toHaveProperty('eclipseType')
        expect(impact).toHaveProperty('eclipseSign')
        expect(impact).toHaveProperty('eclipseDegree')
        expect(impact).toHaveProperty('eclipseDescription')
        expect(impact).toHaveProperty('affectedPoint')
        expect(impact).toHaveProperty('aspectType')
        expect(impact).toHaveProperty('orb')
        expect(impact).toHaveProperty('house')
        expect(impact).toHaveProperty('interpretation')
      }
    })

    it('should have correct structure for upcoming eclipse items', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      if (data.upcoming.length > 0) {
        const eclipse = data.upcoming[0]
        expect(eclipse).toHaveProperty('date')
        expect(eclipse).toHaveProperty('type')
        expect(eclipse).toHaveProperty('sign')
        expect(eclipse).toHaveProperty('degree')
        expect(eclipse).toHaveProperty('description')
      }
    })

    it('should have correct structure for sensitivity object', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.sensitivity).toHaveProperty('isSensitive')
      expect(data.sensitivity).toHaveProperty('sensitivePoints')
      expect(data.sensitivity).toHaveProperty('nodeSign')
      expect(typeof data.sensitivity.isSensitive).toBe('boolean')
      expect(Array.isArray(data.sensitivity.sensitivePoints)).toBe(true)
    })

    it('should have totalImpacts matching impacts array length', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.totalImpacts).toBe(data.impacts.length)
    })
  })
})
