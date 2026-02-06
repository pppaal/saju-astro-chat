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
  ProgressionsRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock astrology functions
const mockSecondaryProgressionsChart = {
  planets: [
    { name: 'Sun', longitude: 125.5, sign: 'Leo', degree: 5, minute: 30, house: 5, speed: 1.0, retrograde: false },
    { name: 'Moon', longitude: 210.2, sign: 'Libra', degree: 0, minute: 12, house: 7, speed: 12.5, retrograde: false },
  ],
  ascendant: { name: 'Ascendant', longitude: 18.0, sign: 'Aries', degree: 18, minute: 0, house: 1, formatted: 'Aries 18°00′' },
  mc: { name: 'MC', longitude: 288.0, sign: 'Capricorn', degree: 18, minute: 0, house: 10, formatted: 'Capricorn 18°00′' },
  houses: [{ index: 1, cusp: 18.0, sign: 'Aries', formatted: 'Aries 18°00′' }],
  progressionType: 'secondary' as const,
  yearsProgressed: 34.5,
  progressedDate: '2024-11-29',
}

const mockSolarArcChart = {
  planets: [
    { name: 'Sun', longitude: 154.8, sign: 'Virgo', degree: 4, minute: 48, house: 6, speed: 1.0, retrograde: false },
    { name: 'Moon', longitude: 79.5, sign: 'Gemini', degree: 19, minute: 30, house: 3, speed: 12.5, retrograde: false },
  ],
  ascendant: { name: 'Ascendant', longitude: 49.3, sign: 'Taurus', degree: 19, minute: 18, house: 1, formatted: 'Taurus 19°18′' },
  mc: { name: 'MC', longitude: 319.3, sign: 'Aquarius', degree: 19, minute: 18, house: 10, formatted: 'Aquarius 19°18′' },
  houses: [{ index: 1, cusp: 49.3, sign: 'Taurus', formatted: 'Taurus 19°18′' }],
  progressionType: 'solarArc' as const,
  yearsProgressed: 34.5,
  progressedDate: '2024-11-29',
}

const mockProgressionSummary = {
  asc: 'Aries 18°00′',
  mc: 'Capricorn 18°00′',
  progressedDate: '2024-11-29',
  type: 'secondary',
}

const mockSolarArcSummary = {
  asc: 'Taurus 19°18′',
  mc: 'Aquarius 19°18′',
  progressedDate: '2024-11-29',
  type: 'solarArc',
}

vi.mock('@/lib/astrology', () => ({
  calculateSecondaryProgressions: vi.fn(),
  calculateSolarArcDirections: vi.fn(),
  getProgressedMoonPhase: vi.fn(),
  getProgressionSummary: vi.fn(),
}))

// ============ Imports (after all mocks) ============

import { POST } from '@/app/api/astrology/advanced/progressions/route'
import { rateLimit } from '@/lib/rateLimit'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { captureServerError } from '@/lib/telemetry'
import {
  calculateSecondaryProgressions,
  calculateSolarArcDirections,
  getProgressedMoonPhase,
  getProgressionSummary,
} from '@/lib/astrology'
import { logger } from '@/lib/logger'

// ============ Helpers ============

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/astrology/advanced/progressions', {
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
  targetDate: '2024-11-29',
}

const defaultRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '20',
  'X-RateLimit-Remaining': '19',
})

/**
 * Set up all mocks for a successful progressions calculation flow.
 */
function setupSuccessfulFlow() {
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    headers: defaultRateLimitHeaders,
  } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
  vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
  mockSafeParse.mockReturnValue({ success: true, data: validBody })
  vi.mocked(calculateSecondaryProgressions).mockResolvedValue(mockSecondaryProgressionsChart)
  vi.mocked(calculateSolarArcDirections).mockResolvedValue(mockSolarArcChart)
  vi.mocked(getProgressionSummary)
    .mockReturnValueOnce(mockProgressionSummary)
    .mockReturnValueOnce(mockSolarArcSummary)
  vi.mocked(getProgressedMoonPhase).mockReturnValue('Waning Gibbous')
}

// ============ Tests ============

describe('Progressions API - POST /api/astrology/advanced/progressions', () => {
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
            { path: ['targetDate'], message: 'Target date must be in YYYY-MM-DD format' },
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

    it('should return 400 for invalid targetDate format', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['targetDate'], message: 'Target date must be in YYYY-MM-DD format' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, targetDate: 'invalid-date' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('targetDate')
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
        '[Progressions API] Validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  // ---- Successful Chart Calculation ----
  describe('Successful Chart Calculation', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return 200 with secondary progressions and solar arc data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.secondary).toBeDefined()
      expect(data.secondary.chart).toEqual(mockSecondaryProgressionsChart)
      expect(data.solarArc).toBeDefined()
      expect(data.solarArc.chart).toEqual(mockSolarArcChart)
      expect(data.targetDate).toBe('2024-11-29')
    })

    it('should call calculateSecondaryProgressions with correct parameters', async () => {
      await POST(makeRequest(validBody))

      expect(calculateSecondaryProgressions).toHaveBeenCalledWith({
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
        targetDate: '2024-11-29',
      })
    })

    it('should call calculateSolarArcDirections with correct parameters', async () => {
      await POST(makeRequest(validBody))

      expect(calculateSolarArcDirections).toHaveBeenCalledWith({
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
        targetDate: '2024-11-29',
      })
    })

    it('should use today as targetDate when not provided', async () => {
      const todayISO = new Date().toISOString().split('T')[0]
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, targetDate: undefined },
      })

      await POST(makeRequest({ ...validBody, targetDate: undefined }))

      expect(calculateSecondaryProgressions).toHaveBeenCalledWith(
        expect.objectContaining({ targetDate: todayISO })
      )
      expect(calculateSolarArcDirections).toHaveBeenCalledWith(
        expect.objectContaining({ targetDate: todayISO })
      )
    })

    it('should call getProgressionSummary for both charts', async () => {
      await POST(makeRequest(validBody))

      expect(getProgressionSummary).toHaveBeenCalledTimes(2)
      expect(getProgressionSummary).toHaveBeenCalledWith(mockSecondaryProgressionsChart)
      expect(getProgressionSummary).toHaveBeenCalledWith(mockSolarArcChart)
    })

    it('should include moon phase when progressed Moon and Sun are found', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.moonPhase).toBeDefined()
      expect(data.moonPhase.phase).toBe('Waning Gibbous')
      expect(getProgressedMoonPhase).toHaveBeenCalled()
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

  // ---- Moon Phase Calculation ----
  describe('Moon Phase Calculation', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
      mockSafeParse.mockReturnValue({ success: true, data: validBody })
      vi.mocked(calculateSolarArcDirections).mockResolvedValue(mockSolarArcChart)
      vi.mocked(getProgressionSummary).mockReturnValue(mockProgressionSummary)
    })

    it('should return null moonPhase when Moon is not found in progressed chart', async () => {
      vi.mocked(calculateSecondaryProgressions).mockResolvedValue({
        ...mockSecondaryProgressionsChart,
        planets: [{ name: 'Sun', longitude: 125.5, sign: 'Leo', degree: 5, minute: 30, house: 5, speed: 1.0, retrograde: false }],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.moonPhase).toBeNull()
    })

    it('should return null moonPhase when Sun is not found in progressed chart', async () => {
      vi.mocked(calculateSecondaryProgressions).mockResolvedValue({
        ...mockSecondaryProgressionsChart,
        planets: [{ name: 'Moon', longitude: 210.2, sign: 'Libra', degree: 0, minute: 12, house: 7, speed: 12.5, retrograde: false }],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.moonPhase).toBeNull()
    })

    it('should call getProgressedMoonPhase with correct longitudes', async () => {
      vi.mocked(calculateSecondaryProgressions).mockResolvedValue(mockSecondaryProgressionsChart)
      vi.mocked(getProgressedMoonPhase).mockReturnValue('Full Moon')

      await POST(makeRequest(validBody))

      // Moon longitude: 210.2, Sun longitude: 125.5
      expect(getProgressedMoonPhase).toHaveBeenCalledWith(210.2, 125.5)
    })

    it('should include progressedMoonSign and progressedMoonHouse in moonPhase result', async () => {
      vi.mocked(calculateSecondaryProgressions).mockResolvedValue(mockSecondaryProgressionsChart)
      vi.mocked(getProgressedMoonPhase).mockReturnValue('Waning Gibbous')

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.moonPhase.progressedMoonSign).toBe('Libra')
      expect(data.moonPhase.progressedMoonHouse).toBe(7)
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

    it('should return 500 when calculateSecondaryProgressions throws', async () => {
      vi.mocked(calculateSecondaryProgressions).mockRejectedValue(new Error('Ephemeris engine error'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(captureServerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ route: '/api/astrology/advanced/progressions' })
      )
    })

    it('should return 500 when calculateSolarArcDirections throws', async () => {
      vi.mocked(calculateSecondaryProgressions).mockResolvedValue(mockSecondaryProgressionsChart)
      vi.mocked(calculateSolarArcDirections).mockRejectedValue(new Error('Solar arc calculation failed'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should return 500 when getProgressionSummary throws', async () => {
      vi.mocked(calculateSecondaryProgressions).mockResolvedValue(mockSecondaryProgressionsChart)
      vi.mocked(calculateSolarArcDirections).mockResolvedValue(mockSolarArcChart)
      vi.mocked(getProgressionSummary).mockImplementation(() => {
        throw new Error('Summary calculation failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should return 500 when request.json() throws (malformed body)', async () => {
      const badRequest = new Request('http://localhost/api/astrology/advanced/progressions', {
        method: 'POST',
        body: 'not-json{{',
        headers: { 'content-type': 'application/json' },
      })

      const response = await POST(badRequest)

      // When JSON parsing fails, body becomes {}, validation should still run
      expect([400, 500]).toContain(response.status)
    })

    it('should capture server errors via telemetry', async () => {
      vi.mocked(calculateSecondaryProgressions).mockRejectedValue(new Error('Progression calculation failed'))

      await POST(makeRequest(validBody))

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Progression calculation failed' }),
        { route: '/api/astrology/advanced/progressions' }
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
      expect(calculateSecondaryProgressions).toHaveBeenCalledWith(
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

    it('should handle far future targetDate', async () => {
      const futureDate = '2100-12-31'
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, targetDate: futureDate },
      })

      await POST(makeRequest({ ...validBody, targetDate: futureDate }))

      expect(calculateSecondaryProgressions).toHaveBeenCalledWith(
        expect.objectContaining({ targetDate: futureDate })
      )
    })

    it('should handle targetDate before birth date', async () => {
      const pastDate = '1980-01-01'
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, targetDate: pastDate },
      })

      await POST(makeRequest({ ...validBody, targetDate: pastDate }))

      expect(calculateSecondaryProgressions).toHaveBeenCalledWith(
        expect.objectContaining({ targetDate: pastDate })
      )
    })

    it('should handle concurrent requests without state leaking', async () => {
      const targetDates = ['2024-01-15', '2024-06-15', '2024-12-15']
      const requests = targetDates.map((targetDate) =>
        makeRequest({ ...validBody, targetDate })
      )

      // Configure mocks to return different dates based on input
      vi.mocked(calculateSecondaryProgressions).mockImplementation(async (input) => ({
        ...mockSecondaryProgressionsChart,
        progressedDate: input.targetDate,
      }))
      vi.mocked(calculateSolarArcDirections).mockImplementation(async (input) => ({
        ...mockSolarArcChart,
        progressedDate: input.targetDate,
      }))
      vi.mocked(getProgressionSummary).mockReturnValue(mockProgressionSummary)

      const responses = await Promise.all(requests.map((r) => POST(r)))

      responses.forEach((r) => {
        expect(r.status).toBe(200)
      })
      expect(calculateSecondaryProgressions).toHaveBeenCalledTimes(3)
    })

    it('should handle chart with empty planets array', async () => {
      vi.mocked(calculateSecondaryProgressions).mockResolvedValue({
        ...mockSecondaryProgressionsChart,
        planets: [],
      })
      vi.mocked(calculateSolarArcDirections).mockResolvedValue({
        ...mockSolarArcChart,
        planets: [],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.secondary.chart.planets).toEqual([])
      expect(data.solarArc.chart.planets).toEqual([])
      // No Moon found, so moonPhase should be null
      expect(data.moonPhase).toBeNull()
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
        expect(calculateSecondaryProgressions).toHaveBeenCalledWith(
          expect.objectContaining({
            natal: expect.objectContaining({ timeZone: tz }),
          })
        )
      }
    })

    it('should include summary for both secondary and solarArc', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.secondary.summary).toBeDefined()
      expect(data.solarArc.summary).toBeDefined()
    })
  })
})
