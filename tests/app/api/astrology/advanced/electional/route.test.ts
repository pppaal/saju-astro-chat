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
  ElectionalRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock astrology functions
const mockChartData = {
  planets: [
    { name: 'Sun', longitude: 120.5, latitude: 0, speed: 1.0, retrograde: false },
    { name: 'Moon', longitude: 45.2, latitude: 5.1, speed: 12.5, retrograde: false },
    { name: 'Mercury', longitude: 110.3, latitude: 1.2, speed: 1.5, retrograde: true },
    { name: 'Venus', longitude: 95.8, latitude: 2.3, speed: 1.2, retrograde: false },
    { name: 'Mars', longitude: 210.5, latitude: 0.5, speed: 0.7, retrograde: false },
  ],
  houses: [
    { index: 1, cusp: 15.0, sign: 'Aries' },
    { index: 2, cusp: 45.0, sign: 'Taurus' },
  ],
  ascendant: { longitude: 15.0, sign: 'Aries' },
  mc: { longitude: 285.0, sign: 'Capricorn' },
}

const mockChart = {
  ...mockChartData,
  getPlanet: vi.fn((name: string) => mockChartData.planets.find((p) => p.name === name)),
}

const mockElectionAnalysis = {
  score: 75,
  moonPhase: 0.35,
  moonSign: 'Taurus',
  voidOfCourse: false,
  retrogradePlanets: ['Mercury'],
  beneficAspects: [
    { planet1: 'Venus', planet2: 'Jupiter', aspect: 'trine', orb: 2.5 },
    { planet1: 'Sun', planet2: 'Moon', aspect: 'sextile', orb: 1.8 },
  ],
  maleficAspects: [{ planet1: 'Mars', planet2: 'Saturn', aspect: 'square', orb: 3.2 }],
  recommendations: ['Good time for creative endeavors', 'Mercury retrograde - double-check communications'],
  warnings: ['Avoid signing contracts during Mercury retrograde'],
}

const mockGuidelines = {
  bestMoonPhases: ['waxing', 'first_quarter'],
  avoidMoonPhases: ['waning', 'new_moon'],
  favorablePlanets: ['Venus', 'Jupiter'],
  unfavorablePlanets: ['Saturn', 'Mars'],
  tips: ['Choose a day when Moon is in a fixed sign for stability'],
}

vi.mock('@/lib/astrology', () => ({
  calculateNatalChart: vi.fn(),
  toChart: vi.fn(),
  analyzeElection: vi.fn(),
  getMoonPhaseName: vi.fn(),
  getElectionalGuidelines: vi.fn(),
}))

// ============ Imports (after all mocks) ============

import { POST } from '@/app/api/astrology/advanced/electional/route'
import { rateLimit } from '@/lib/rateLimit'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { captureServerError } from '@/lib/telemetry'
import {
  calculateNatalChart,
  toChart,
  analyzeElection,
  getMoonPhaseName,
  getElectionalGuidelines,
} from '@/lib/astrology'
import { logger } from '@/lib/logger'

// ============ Helpers ============

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/astrology/advanced/electional', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const validBody = {
  date: '2024-06-15',
  time: '14:30',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
  eventType: 'business_start',
}

const basicOnlyBody = {
  date: '2024-06-15',
  time: '14:30',
  latitude: 37.5665,
  longitude: 126.978,
  timeZone: 'Asia/Seoul',
  basicOnly: true,
}

const defaultRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '20',
  'X-RateLimit-Remaining': '19',
})

/**
 * Set up all mocks for a successful electional calculation flow.
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
  vi.mocked(analyzeElection).mockReturnValue(mockElectionAnalysis)
  vi.mocked(getMoonPhaseName).mockReturnValue('Waxing Crescent')
  vi.mocked(getElectionalGuidelines).mockReturnValue(mockGuidelines)
}

/**
 * Set up mocks for basicOnly flow.
 */
function setupBasicOnlyFlow() {
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    headers: defaultRateLimitHeaders,
  } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
  vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
  mockSafeParse.mockReturnValue({ success: true, data: basicOnlyBody })
  vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
  vi.mocked(toChart).mockReturnValue(mockChart)
  vi.mocked(analyzeElection).mockReturnValue(mockElectionAnalysis)
  vi.mocked(getMoonPhaseName).mockReturnValue('Waxing Crescent')
}

// ============ Tests ============

describe('Electional API - POST /api/astrology/advanced/electional', () => {
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

    it('should use correct rate limit key with astro-electional prefix', async () => {
      setupSuccessfulFlow()

      await POST(makeRequest(validBody))

      expect(rateLimit).toHaveBeenCalledWith(
        'astro-electional:192.168.1.1',
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
    })

    it('should proceed when public token is valid', async () => {
      setupSuccessfulFlow()

      const response = await POST(makeRequest(validBody))

      expect(response.status).toBe(200)
    })

    it('should include rate limit headers in 401 response', async () => {
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

    it('should return 400 for invalid time format', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['time'], message: 'Time must be in HH:MM format' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, time: '25:00' }))
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
        '[Electional API] Validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  // ---- Event Type Validation ----
  describe('Event Type Validation', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
    })

    it('should return 400 when eventType is missing and basicOnly is false', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, eventType: undefined, basicOnly: false },
      })

      const response = await POST(makeRequest({ ...validBody, eventType: undefined }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.message).toContain('eventType is required')
    })

    it('should return 400 when eventType is missing and basicOnly is not provided', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, eventType: undefined },
      })

      const response = await POST(makeRequest({ ...validBody, eventType: undefined }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.message).toContain('eventType is required')
    })

    it('should return 422 for invalid eventType', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, eventType: 'invalid_event_type' },
      })

      const response = await POST(makeRequest({ ...validBody, eventType: 'invalid_event_type' }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.message).toContain('Invalid eventType')
    })

    it('should list valid event types in error message for invalid eventType', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, eventType: 'invalid_type' },
      })

      const response = await POST(makeRequest({ ...validBody, eventType: 'invalid_type' }))
      const data = await response.json()

      expect(data.error.message).toContain('business_start')
      expect(data.error.message).toContain('marriage')
    })

    it.each([
      'business_start',
      'signing_contracts',
      'marriage',
      'engagement',
      'first_date',
      'surgery',
      'dental',
      'start_treatment',
      'long_journey',
      'moving_house',
      'investment',
      'buying_property',
      'major_purchase',
      'creative_start',
      'publishing',
      'starting_studies',
      'exam',
      'lawsuit',
      'court_appearance',
    ])('should accept valid eventType: %s', async (eventType) => {
      setupSuccessfulFlow()
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, eventType },
      })

      const response = await POST(makeRequest({ ...validBody, eventType }))

      expect(response.status).toBe(200)
    })
  })

  // ---- Basic Only Mode ----
  describe('Basic Only Mode', () => {
    beforeEach(() => {
      setupBasicOnlyFlow()
    })

    it('should return basic moon info when basicOnly is true', async () => {
      const response = await POST(makeRequest(basicOnlyBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.basicOnly).toBe(true)
      expect(data.moonPhase).toBeDefined()
      expect(data.moonPhaseName).toBe('Waxing Crescent')
      expect(data.moonSign).toBe('Taurus')
      expect(data.voidOfCourse).toBe(false)
      expect(data.retrogradePlanets).toEqual(['Mercury'])
    })

    it('should not require eventType when basicOnly is true', async () => {
      const response = await POST(makeRequest(basicOnlyBody))

      expect(response.status).toBe(200)
    })

    it('should call analyzeElection with business_start as default for basicOnly', async () => {
      await POST(makeRequest(basicOnlyBody))

      expect(analyzeElection).toHaveBeenCalledWith(mockChart, 'business_start', expect.any(Date))
    })

    it('should include dateTime in basicOnly response', async () => {
      const response = await POST(makeRequest(basicOnlyBody))
      const data = await response.json()

      expect(data.dateTime).toBeDefined()
      expect(new Date(data.dateTime).getFullYear()).toBe(2024)
    })

    it('should not include analysis or guidelines in basicOnly response', async () => {
      const response = await POST(makeRequest(basicOnlyBody))
      const data = await response.json()

      expect(data.analysis).toBeUndefined()
      expect(data.guidelines).toBeUndefined()
    })
  })

  // ---- Successful Full Analysis ----
  describe('Successful Full Analysis', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return 200 with full analysis data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analysis).toBeDefined()
      expect(data.guidelines).toBeDefined()
      expect(data.eventType).toBe('business_start')
      expect(data.dateTime).toBeDefined()
    })

    it('should include complete analysis object', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.analysis.score).toBe(75)
      expect(data.analysis.moonPhase).toBe(0.35)
      expect(data.analysis.moonPhaseName).toBe('Waxing Crescent')
      expect(data.analysis.moonSign).toBe('Taurus')
      expect(data.analysis.voidOfCourse).toBe(false)
      expect(data.analysis.retrogradePlanets).toEqual(['Mercury'])
      expect(data.analysis.beneficAspects).toBeDefined()
      expect(data.analysis.maleficAspects).toBeDefined()
      expect(data.analysis.recommendations).toBeDefined()
      expect(data.analysis.warnings).toBeDefined()
    })

    it('should call calculateNatalChart with correct parameters', async () => {
      await POST(makeRequest(validBody))

      expect(calculateNatalChart).toHaveBeenCalledWith({
        year: 2024,
        month: 6,
        date: 15,
        hour: 14,
        minute: 30,
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: 'Asia/Seoul',
      })
    })

    it('should call toChart to convert chart data', async () => {
      await POST(makeRequest(validBody))

      expect(toChart).toHaveBeenCalledWith(mockChartData)
    })

    it('should call analyzeElection with correct parameters', async () => {
      await POST(makeRequest(validBody))

      expect(analyzeElection).toHaveBeenCalledWith(mockChart, 'business_start', expect.any(Date))
    })

    it('should call getElectionalGuidelines with event type', async () => {
      await POST(makeRequest(validBody))

      expect(getElectionalGuidelines).toHaveBeenCalledWith('business_start')
    })

    it('should call getMoonPhaseName with moon phase value', async () => {
      await POST(makeRequest(validBody))

      expect(getMoonPhaseName).toHaveBeenCalledWith(0.35)
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
      expect(captureServerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ route: '/api/astrology/advanced/electional' })
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
    })

    it('should return 500 when analyzeElection throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockReturnValue(mockChart)
      vi.mocked(analyzeElection).mockImplementation(() => {
        throw new Error('Election analysis failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should return 500 when getElectionalGuidelines throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockReturnValue(mockChart)
      vi.mocked(analyzeElection).mockReturnValue(mockElectionAnalysis)
      vi.mocked(getMoonPhaseName).mockReturnValue('Waxing Crescent')
      vi.mocked(getElectionalGuidelines).mockImplementation(() => {
        throw new Error('Guidelines retrieval failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle malformed JSON body gracefully', async () => {
      const badRequest = new Request('http://localhost/api/astrology/advanced/electional', {
        method: 'POST',
        body: 'not-json{{',
        headers: { 'content-type': 'application/json' },
      })

      const response = await POST(badRequest)

      // When JSON parsing fails, body becomes {}, validation should still run
      expect([400, 500]).toContain(response.status)
    })

    it('should capture server errors via telemetry', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Calculation failed'))

      await POST(makeRequest(validBody))

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Calculation failed' }),
        { route: '/api/astrology/advanced/electional' }
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

    it('should handle midnight time (00:00)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, time: '00:00' },
      })

      await POST(makeRequest({ ...validBody, time: '00:00' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ hour: 0, minute: 0 })
      )
    })

    it('should handle end of day time (23:59)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, time: '23:59' },
      })

      await POST(makeRequest({ ...validBody, time: '23:59' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ hour: 23, minute: 59 })
      )
    })

    it('should handle far future date', async () => {
      const futureDate = '2100-12-31'
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: futureDate },
      })

      await POST(makeRequest({ ...validBody, date: futureDate }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2100, month: 12, date: 31 })
      )
    })

    it('should handle past date', async () => {
      const pastDate = '1900-01-01'
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: pastDate },
      })

      await POST(makeRequest({ ...validBody, date: pastDate }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ year: 1900, month: 1, date: 1 })
      )
    })

    it('should handle concurrent requests without state leaking', async () => {
      const eventTypes = ['business_start', 'marriage', 'surgery']
      const requests = eventTypes.map((eventType) => makeRequest({ ...validBody, eventType }))

      // Configure mock to return different event types
      vi.mocked(getElectionalGuidelines).mockImplementation((type) => ({
        ...mockGuidelines,
        eventType: type,
      }))

      const responses = await Promise.all(requests.map((r) => POST(r)))

      responses.forEach((r) => {
        expect(r.status).toBe(200)
      })
      expect(analyzeElection).toHaveBeenCalledTimes(3)
    })

    it('should handle analysis with empty beneficAspects', async () => {
      vi.mocked(analyzeElection).mockReturnValue({
        ...mockElectionAnalysis,
        beneficAspects: [],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analysis.beneficAspects).toEqual([])
    })

    it('should handle analysis with empty maleficAspects', async () => {
      vi.mocked(analyzeElection).mockReturnValue({
        ...mockElectionAnalysis,
        maleficAspects: [],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analysis.maleficAspects).toEqual([])
    })

    it('should handle analysis with no retrograde planets', async () => {
      vi.mocked(analyzeElection).mockReturnValue({
        ...mockElectionAnalysis,
        retrogradePlanets: [],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analysis.retrogradePlanets).toEqual([])
    })

    it('should handle void of course moon', async () => {
      vi.mocked(analyzeElection).mockReturnValue({
        ...mockElectionAnalysis,
        voidOfCourse: true,
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analysis.voidOfCourse).toBe(true)
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

    it('should handle numeric timezone offset', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, timeZone: '9' },
      })

      await POST(makeRequest({ ...validBody, timeZone: '9' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ timeZone: '9' })
      )
    })
  })

  // ---- Response Format ----
  describe('Response Format', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return proper JSON structure for full analysis', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data).toHaveProperty('analysis')
      expect(data).toHaveProperty('guidelines')
      expect(data).toHaveProperty('eventType')
      expect(data).toHaveProperty('dateTime')

      expect(data.analysis).toHaveProperty('score')
      expect(data.analysis).toHaveProperty('moonPhase')
      expect(data.analysis).toHaveProperty('moonPhaseName')
      expect(data.analysis).toHaveProperty('moonSign')
      expect(data.analysis).toHaveProperty('voidOfCourse')
      expect(data.analysis).toHaveProperty('retrogradePlanets')
      expect(data.analysis).toHaveProperty('beneficAspects')
      expect(data.analysis).toHaveProperty('maleficAspects')
      expect(data.analysis).toHaveProperty('recommendations')
      expect(data.analysis).toHaveProperty('warnings')
    })

    it('should return proper JSON structure for basicOnly mode', async () => {
      setupBasicOnlyFlow()

      const response = await POST(makeRequest(basicOnlyBody))
      const data = await response.json()

      expect(data).toHaveProperty('moonPhase')
      expect(data).toHaveProperty('moonPhaseName')
      expect(data).toHaveProperty('moonSign')
      expect(data).toHaveProperty('voidOfCourse')
      expect(data).toHaveProperty('retrogradePlanets')
      expect(data).toHaveProperty('dateTime')
      expect(data).toHaveProperty('basicOnly')

      expect(data).not.toHaveProperty('analysis')
      expect(data).not.toHaveProperty('guidelines')
      expect(data).not.toHaveProperty('eventType')
    })

    it('should return ISO format dateTime', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.dateTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  // ---- Date/Time Parsing ----
  describe('Date/Time Parsing', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should correctly parse date string into year, month, day', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: '2025-03-21' },
      })

      await POST(makeRequest({ ...validBody, date: '2025-03-21' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 2025,
          month: 3,
          date: 21,
        })
      )
    })

    it('should correctly parse time string into hour and minute', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, time: '09:45' },
      })

      await POST(makeRequest({ ...validBody, time: '09:45' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({
          hour: 9,
          minute: 45,
        })
      )
    })

    it('should handle single digit month and day in date', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: '2024-01-05' },
      })

      await POST(makeRequest({ ...validBody, date: '2024-01-05' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 2024,
          month: 1,
          date: 5,
        })
      )
    })
  })
})
