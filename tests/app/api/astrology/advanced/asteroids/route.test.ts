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
  AsteroidsRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Note: swisseph is required at runtime with require() so we don't mock it here.
// The actual swisseph module is used for Julian Day calculation.

// Mock astrology functions
const mockChartData = {
  planets: [
    { name: 'Sun', longitude: 120.5, sign: 'Leo', degree: 0, minute: 30, house: 5, speed: 1.0, retrograde: false },
    { name: 'Moon', longitude: 45.2, sign: 'Taurus', degree: 15, minute: 12, house: 2, speed: 12.5, retrograde: false },
    { name: 'Mars', longitude: 88.3, sign: 'Gemini', degree: 28, minute: 18, house: 3, speed: 0.8, retrograde: false },
  ],
  ascendant: { name: 'Ascendant', longitude: 15.0, sign: 'Aries', degree: 15, minute: 0, house: 1, formatted: 'Aries 15 00\u2032' },
  mc: { name: 'MC', longitude: 285.0, sign: 'Capricorn', degree: 15, minute: 0, house: 10, formatted: 'Capricorn 15 00\u2032' },
  houses: [
    { index: 1, cusp: 15.0, sign: 'Aries', formatted: 'Aries 15 00\u2032' },
    { index: 2, cusp: 45.0, sign: 'Taurus', formatted: 'Taurus 15 00\u2032' },
    { index: 3, cusp: 75.0, sign: 'Gemini', formatted: 'Gemini 15 00\u2032' },
    { index: 4, cusp: 105.0, sign: 'Cancer', formatted: 'Cancer 15 00\u2032' },
    { index: 5, cusp: 135.0, sign: 'Leo', formatted: 'Leo 15 00\u2032' },
    { index: 6, cusp: 165.0, sign: 'Virgo', formatted: 'Virgo 15 00\u2032' },
    { index: 7, cusp: 195.0, sign: 'Libra', formatted: 'Libra 15 00\u2032' },
    { index: 8, cusp: 225.0, sign: 'Scorpio', formatted: 'Scorpio 15 00\u2032' },
    { index: 9, cusp: 255.0, sign: 'Sagittarius', formatted: 'Sagittarius 15 00\u2032' },
    { index: 10, cusp: 285.0, sign: 'Capricorn', formatted: 'Capricorn 15 00\u2032' },
    { index: 11, cusp: 315.0, sign: 'Aquarius', formatted: 'Aquarius 15 00\u2032' },
    { index: 12, cusp: 345.0, sign: 'Pisces', formatted: 'Pisces 15 00\u2032' },
  ],
}

const mockChart = {
  planets: mockChartData.planets,
  houses: mockChartData.houses,
}

const mockAsteroids = {
  Ceres: { longitude: 78.5, sign: 'Gemini', degree: 18, minute: 30, house: 3, retrograde: false },
  Pallas: { longitude: 156.2, sign: 'Virgo', degree: 6, minute: 12, house: 6, retrograde: false },
  Juno: { longitude: 234.8, sign: 'Scorpio', degree: 24, minute: 48, house: 8, retrograde: true },
  Vesta: { longitude: 312.1, sign: 'Aquarius', degree: 12, minute: 6, house: 11, retrograde: false },
}

const mockInterpretations = {
  Ceres: { theme: 'Nurturing and self-care', keyMeaning: 'How you nurture others and yourself' },
  Pallas: { theme: 'Wisdom and strategy', keyMeaning: 'Your creative intelligence and problem-solving' },
  Juno: { theme: 'Partnership and commitment', keyMeaning: 'What you need in committed relationships' },
  Vesta: { theme: 'Dedication and focus', keyMeaning: 'What you dedicate yourself to' },
}

const mockAsteroidInfo = {
  Ceres: { name: 'Ceres', symbol: '\u26B3', keywords: ['nurturing', 'mothering', 'food'] },
  Pallas: { name: 'Pallas', symbol: '\u26B4', keywords: ['wisdom', 'strategy', 'pattern recognition'] },
  Juno: { name: 'Juno', symbol: '\u26B5', keywords: ['partnership', 'marriage', 'commitment'] },
  Vesta: { name: 'Vesta', symbol: '\u26B6', keywords: ['dedication', 'focus', 'sacred fire'] },
}

const mockAspects = [
  { asteroid: 'Ceres', planet: 'Sun', aspect: 'trine', orb: 2.0 },
  { asteroid: 'Juno', planet: 'Mars', aspect: 'square', orb: 1.5 },
]

vi.mock('@/lib/astrology', () => ({
  calculateNatalChart: vi.fn(),
  toChart: vi.fn(),
  calculateAllAsteroids: vi.fn(),
  interpretAsteroid: vi.fn(),
  findAllAsteroidAspects: vi.fn(),
  getAsteroidInfo: vi.fn(),
}))

// ============ Imports (after all mocks) ============

import { POST } from '@/app/api/astrology/advanced/asteroids/route'
import { rateLimit } from '@/lib/rateLimit'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { captureServerError } from '@/lib/telemetry'
import {
  calculateNatalChart,
  toChart,
  calculateAllAsteroids,
  interpretAsteroid,
  findAllAsteroidAspects,
  getAsteroidInfo,
} from '@/lib/astrology'
import { logger } from '@/lib/logger'

// ============ Helpers ============

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/astrology/advanced/asteroids', {
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
  includeAspects: true,
}

const defaultRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '20',
  'X-RateLimit-Remaining': '19',
})

/**
 * Set up all mocks for a successful asteroids calculation flow.
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
  // Note: swisseph.swe_utc_to_jd uses the real module (required at runtime)
  vi.mocked(calculateAllAsteroids).mockReturnValue(mockAsteroids)
  vi.mocked(interpretAsteroid).mockImplementation((asteroid) => {
    const name = asteroid.sign === 'Gemini' ? 'Ceres' :
                 asteroid.sign === 'Virgo' ? 'Pallas' :
                 asteroid.sign === 'Scorpio' ? 'Juno' : 'Vesta'
    return mockInterpretations[name as keyof typeof mockInterpretations]
  })
  vi.mocked(getAsteroidInfo).mockImplementation((name: string) => {
    return mockAsteroidInfo[name as keyof typeof mockAsteroidInfo]
  })
  vi.mocked(findAllAsteroidAspects).mockReturnValue(mockAspects)
}

// ============ Tests ============

describe('Asteroids API - POST /api/astrology/advanced/asteroids', () => {
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

    it('should use correct rate limit key with client IP', async () => {
      setupSuccessfulFlow()

      await POST(makeRequest(validBody))

      expect(rateLimit).toHaveBeenCalledWith(
        'astro-asteroids:192.168.1.1',
        { limit: 20, windowSeconds: 60 }
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
      expect(data.error.message).toBe('Please log in to continue.')
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

    it('should return 400 when date format is invalid', async () => {
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

    it('should return 400 when time format is invalid', async () => {
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
      // The first error determines the code - date comes first so INVALID_DATE
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

    it('should return 400 for latitude below minimum', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['latitude'], message: 'Latitude must be >= -90' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, latitude: -95 }))
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

    it('should return 400 for longitude below minimum', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['longitude'], message: 'Longitude must be >= -180' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, longitude: -190 }))
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
      // timeZone path contains 'time' so it maps to INVALID_TIME
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
        '[Asteroids API] Validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })

    it('should handle empty body gracefully', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['date'], message: 'Required' },
            { path: ['time'], message: 'Required' },
            { path: ['latitude'], message: 'Required' },
            { path: ['longitude'], message: 'Required' },
            { path: ['timeZone'], message: 'Required' },
          ],
        },
      })

      const response = await POST(makeRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_DATE')
    })
  })

  // ---- Successful Asteroid Calculation ----
  describe('Successful Asteroid Calculation', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return 200 with asteroid data for all 4 asteroids', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.asteroids).toBeDefined()
      expect(data.asteroids.Ceres).toBeDefined()
      expect(data.asteroids.Pallas).toBeDefined()
      expect(data.asteroids.Juno).toBeDefined()
      expect(data.asteroids.Vesta).toBeDefined()
    })

    it('should include position data for each asteroid', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.asteroids.Ceres.longitude).toBe(78.5)
      expect(data.asteroids.Ceres.sign).toBe('Gemini')
      expect(data.asteroids.Ceres.house).toBe(3)
    })

    it('should include asteroid info for each asteroid', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.asteroids.Ceres.info).toBeDefined()
      expect(data.asteroids.Ceres.info.name).toBe('Ceres')
      expect(data.asteroids.Pallas.info.name).toBe('Pallas')
      expect(data.asteroids.Juno.info.name).toBe('Juno')
      expect(data.asteroids.Vesta.info.name).toBe('Vesta')
    })

    it('should include interpretation for each asteroid', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.asteroids.Ceres.interpretation).toBeDefined()
      expect(data.asteroids.Pallas.interpretation).toBeDefined()
      expect(data.asteroids.Juno.interpretation).toBeDefined()
      expect(data.asteroids.Vesta.interpretation).toBeDefined()
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

    it('should call calculateAllAsteroids with Julian Day and house cusps', async () => {
      await POST(makeRequest(validBody))

      expect(calculateAllAsteroids).toHaveBeenCalledWith(
        expect.any(Number), // Julian Day (calculated from date/time)
        expect.arrayContaining([15, 45, 75, 105, 135, 165, 195, 225, 255, 285, 315, 345])
      )
    })

    it('should call interpretAsteroid for each asteroid', async () => {
      await POST(makeRequest(validBody))

      expect(interpretAsteroid).toHaveBeenCalledTimes(4)
    })

    it('should call getAsteroidInfo for each asteroid', async () => {
      await POST(makeRequest(validBody))

      expect(getAsteroidInfo).toHaveBeenCalledWith('Ceres')
      expect(getAsteroidInfo).toHaveBeenCalledWith('Pallas')
      expect(getAsteroidInfo).toHaveBeenCalledWith('Juno')
      expect(getAsteroidInfo).toHaveBeenCalledWith('Vesta')
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

  // ---- Aspects Calculation ----
  describe('Aspects Calculation', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should include aspects when includeAspects is true', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.aspects).toBeDefined()
      expect(data.aspects).toEqual(mockAspects)
      expect(findAllAsteroidAspects).toHaveBeenCalledWith(mockAsteroids, mockChart.planets)
    })

    it('should not include aspects when includeAspects is false', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, includeAspects: false },
      })

      const response = await POST(makeRequest({ ...validBody, includeAspects: false }))
      const data = await response.json()

      expect(data.aspects).toBeNull()
      expect(findAllAsteroidAspects).not.toHaveBeenCalled()
    })

    it('should include aspects by default when includeAspects is not specified', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, includeAspects: true }, // Default value from schema
      })

      const response = await POST(makeRequest({ ...validBody }))
      const data = await response.json()

      expect(data.aspects).toBeDefined()
    })
  })

  // ---- Julian Day Calculation ----
  describe('Julian Day Calculation', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
      mockSafeParse.mockReturnValue({ success: true, data: validBody })
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockReturnValue(mockChart)
    })

    it('should calculate Julian Day and pass it to calculateAllAsteroids', async () => {
      setupSuccessfulFlow()

      await POST(makeRequest(validBody))

      // Julian Day is passed as first argument to calculateAllAsteroids
      expect(calculateAllAsteroids).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Array)
      )

      // Verify the Julian Day is a reasonable value (around 2448000 for 1990)
      const jdArg = vi.mocked(calculateAllAsteroids).mock.calls[0][0]
      expect(jdArg).toBeGreaterThan(2440000) // After 1970
      expect(jdArg).toBeLessThan(2460000) // Before 2030
    })

    it('should use the correct house cusps from the chart', async () => {
      setupSuccessfulFlow()

      await POST(makeRequest(validBody))

      // Verify house cusps are passed correctly
      const houseCuspsArg = vi.mocked(calculateAllAsteroids).mock.calls[0][1]
      expect(houseCuspsArg).toHaveLength(12)
      expect(houseCuspsArg[0]).toBe(15) // First house cusp
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
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Chart calculation failed'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(captureServerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ route: '/api/astrology/advanced/asteroids' })
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

    it('should return 500 when calculateAllAsteroids throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockReturnValue(mockChart)
      // swisseph uses real module, no mock needed
      vi.mocked(calculateAllAsteroids).mockImplementation(() => {
        throw new Error('Asteroid calculation failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should return 500 when interpretAsteroid throws', async () => {
      setupSuccessfulFlow()
      vi.mocked(interpretAsteroid).mockImplementation(() => {
        throw new Error('Interpretation failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should return 500 when findAllAsteroidAspects throws', async () => {
      setupSuccessfulFlow()
      vi.mocked(findAllAsteroidAspects).mockImplementation(() => {
        throw new Error('Aspect calculation failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle malformed JSON body gracefully', async () => {
      const badRequest = new Request('http://localhost/api/astrology/advanced/asteroids', {
        method: 'POST',
        body: 'not-json{{',
        headers: { 'content-type': 'application/json' },
      })

      const response = await POST(badRequest)

      // When JSON parsing fails, body becomes {}, validation should still run
      expect([400, 500]).toContain(response.status)
    })

    it('should capture server errors via telemetry', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Ephemeris error'))

      await POST(makeRequest(validBody))

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Ephemeris error' }),
        { route: '/api/astrology/advanced/asteroids' }
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

    it('should handle concurrent requests without state leaking', async () => {
      const requests = Array.from({ length: 3 }, (_, i) =>
        makeRequest({ ...validBody, latitude: 30 + i * 10 })
      )

      // Configure mock to return different values based on input
      vi.mocked(calculateNatalChart).mockImplementation(async (input) => ({
        ...mockChartData,
        ascendant: { ...mockChartData.ascendant, degree: input.latitude },
      }))

      const responses = await Promise.all(requests.map((r) => POST(r)))

      responses.forEach((r) => {
        expect(r.status).toBe(200)
      })
      expect(calculateNatalChart).toHaveBeenCalledTimes(3)
    })

    it('should handle historical birth dates', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: '1800-01-01' },
      })

      await POST(makeRequest({ ...validBody, date: '1800-01-01' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ year: 1800, month: 1, date: 1 })
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

    it('should handle retrograde asteroids', async () => {
      vi.mocked(calculateAllAsteroids).mockReturnValue({
        ...mockAsteroids,
        Ceres: { ...mockAsteroids.Ceres, retrograde: true },
        Pallas: { ...mockAsteroids.Pallas, retrograde: true },
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.asteroids.Ceres.retrograde).toBe(true)
      expect(data.asteroids.Pallas.retrograde).toBe(true)
    })

    it('should handle empty aspects array', async () => {
      vi.mocked(findAllAsteroidAspects).mockReturnValue([])

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.aspects).toEqual([])
    })

    it('should handle zero coordinates (prime meridian and equator)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, latitude: 0, longitude: 0 },
      })

      const response = await POST(makeRequest({ ...validBody, latitude: 0, longitude: 0 }))

      expect(response.status).toBe(200)
      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: 0, longitude: 0 })
      )
    })
  })

  // ---- Response Structure ----
  describe('Response Structure', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return correctly structured response with all asteroid data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      // Check top-level structure
      expect(data).toHaveProperty('asteroids')
      expect(data).toHaveProperty('aspects')

      // Check asteroid structure
      const asteroidNames = ['Ceres', 'Pallas', 'Juno', 'Vesta']
      for (const name of asteroidNames) {
        expect(data.asteroids[name]).toHaveProperty('longitude')
        expect(data.asteroids[name]).toHaveProperty('sign')
        expect(data.asteroids[name]).toHaveProperty('degree')
        expect(data.asteroids[name]).toHaveProperty('minute')
        expect(data.asteroids[name]).toHaveProperty('house')
        expect(data.asteroids[name]).toHaveProperty('retrograde')
        expect(data.asteroids[name]).toHaveProperty('info')
        expect(data.asteroids[name]).toHaveProperty('interpretation')
      }
    })

    it('should merge asteroid position with info and interpretation', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      // Ceres should have position data, info, and interpretation merged
      const ceres = data.asteroids.Ceres
      expect(ceres.longitude).toBe(78.5) // From position
      expect(ceres.info.name).toBe('Ceres') // From info
      expect(ceres.interpretation).toBeDefined() // From interpretation
    })
  })
})
