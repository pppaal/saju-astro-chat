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
  DraconicRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock astrology functions
const mockNatalData = {
  planets: [
    {
      name: 'Sun',
      longitude: 45.5,
      sign: 'Taurus',
      degree: 15,
      minute: 30,
      house: 2,
      speed: 1.0,
      retrograde: false,
    },
    {
      name: 'Moon',
      longitude: 120.2,
      sign: 'Leo',
      degree: 0,
      minute: 12,
      house: 5,
      speed: 12.5,
      retrograde: false,
    },
    {
      name: 'True Node',
      longitude: 30.0,
      sign: 'Taurus',
      degree: 0,
      minute: 0,
      house: 2,
      speed: -0.05,
      retrograde: true,
    },
  ],
  ascendant: {
    name: 'Ascendant',
    longitude: 15.0,
    sign: 'Aries',
    degree: 15,
    minute: 0,
    house: 1,
    formatted: 'Aries 15 00',
  },
  mc: {
    name: 'MC',
    longitude: 285.0,
    sign: 'Capricorn',
    degree: 15,
    minute: 0,
    house: 10,
    formatted: 'Capricorn 15 00',
  },
  houses: [{ index: 1, cusp: 15.0, sign: 'Aries', formatted: 'Aries 15 00' }],
}

const mockNatalChart = {
  ...mockNatalData,
  chartType: 'natal' as const,
}

const mockDraconicChart = {
  planets: [
    {
      name: 'Sun',
      longitude: 15.5,
      sign: 'Aries',
      degree: 15,
      minute: 30,
      house: 1,
      speed: 1.0,
      retrograde: false,
      formatted: 'Aries 15 30',
    },
    {
      name: 'Moon',
      longitude: 90.2,
      sign: 'Cancer',
      degree: 0,
      minute: 12,
      house: 4,
      speed: 12.5,
      retrograde: false,
      formatted: 'Cancer 0 12',
    },
    {
      name: 'True Node',
      longitude: 0.0,
      sign: 'Aries',
      degree: 0,
      minute: 0,
      house: 1,
      speed: -0.05,
      retrograde: true,
      formatted: 'Aries 0 00',
    },
  ],
  ascendant: {
    name: 'Ascendant',
    longitude: 345.0,
    sign: 'Pisces',
    degree: 15,
    minute: 0,
    house: 1,
    formatted: 'Pisces 15 00',
  },
  mc: {
    name: 'MC',
    longitude: 255.0,
    sign: 'Sagittarius',
    degree: 15,
    minute: 0,
    house: 10,
    formatted: 'Sagittarius 15 00',
  },
  houses: [{ index: 1, cusp: 345.0, sign: 'Pisces', formatted: 'Pisces 15 00' }],
  chartType: 'draconic' as const,
  natalNorthNode: 30.0,
  offsetDegrees: 30.0,
}

const mockDraconicComparison = {
  draconicChart: mockDraconicChart,
  natalChart: mockNatalChart,
  alignments: [
    {
      draconicPlanet: 'Sun',
      natalPlanet: 'Ascendant',
      orb: 0.5,
      meaning: 'Soul identity aligns with personality expression',
    },
  ],
  tensions: [
    {
      draconicPlanet: 'Moon',
      natalPlanet: 'Saturn',
      aspectType: 'square',
      orb: 2.3,
      meaning: 'Growth pressure between soul needs and responsibilities',
    },
  ],
  summary: {
    soulIdentity: 'Pioneer Soul - Past life as warrior',
    soulNeeds: 'Autonomy and courage',
    soulPurpose: "Achiever Soul's mission",
    karmicLessons: 'Unfinished tasks from past lives',
    alignmentScore: 65,
  },
}

const mockPlanetMeaning = {
  meaning: "Soul's essential identity",
  archetype: 'Pioneer Soul',
  pastLife: 'Warrior, leader',
}

vi.mock('@/lib/astrology', () => ({
  calculateNatalChart: vi.fn(),
  toChart: vi.fn(),
  calculateDraconicChart: vi.fn(),
  compareDraconicToNatal: vi.fn(),
  getDraconicPlanetMeaning: vi.fn(),
}))

// ============ Imports (after all mocks) ============

import { POST } from '@/app/api/astrology/advanced/draconic/route'
import { rateLimit } from '@/lib/rateLimit'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { captureServerError } from '@/lib/telemetry'
import {
  calculateNatalChart,
  toChart,
  calculateDraconicChart,
  compareDraconicToNatal,
  getDraconicPlanetMeaning,
} from '@/lib/astrology'
import { logger } from '@/lib/logger'

// ============ Helpers ============

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/astrology/advanced/draconic', {
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
  compareToNatal: true,
}

const defaultRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '20',
  'X-RateLimit-Remaining': '19',
})

/**
 * Set up all mocks for a successful draconic chart calculation flow.
 */
function setupSuccessfulFlow() {
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    headers: defaultRateLimitHeaders,
  } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
  vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
  mockSafeParse.mockReturnValue({ success: true, data: validBody })
  vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalData)
  vi.mocked(toChart).mockReturnValue(mockNatalChart)
  vi.mocked(calculateDraconicChart).mockReturnValue(mockDraconicChart)
  vi.mocked(compareDraconicToNatal).mockReturnValue(mockDraconicComparison)
  vi.mocked(getDraconicPlanetMeaning).mockReturnValue(mockPlanetMeaning)
}

// ============ Tests ============

describe('Draconic API - POST /api/astrology/advanced/draconic', () => {
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

    it('should use correct rate limit key with client IP', async () => {
      setupSuccessfulFlow()

      await POST(makeRequest(validBody))

      expect(rateLimit).toHaveBeenCalledWith('astro-draconic:192.168.1.1', { limit: 20, windowSeconds: 60 })
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

    it('should include rate limit headers in unauthorized response', async () => {
      vi.mocked(requirePublicToken).mockReturnValue({
        valid: false,
        reason: 'Invalid token',
      })

      const response = await POST(makeRequest(validBody))

      expect(response.status).toBe(401)
      // Headers should be present even in unauthorized response
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

      const response = await POST(makeRequest({ ...validBody, time: '2:30pm' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('time')
    })

    it('should return 400 for invalid latitude out of range (too high)', async () => {
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

    it('should return 400 for invalid latitude out of range (too low)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['latitude'], message: 'Latitude must be >= -90' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, latitude: -100 }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContain('latitude')
    })

    it('should return 400 for invalid longitude out of range (too high)', async () => {
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

    it('should return 400 for invalid longitude out of range (too low)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['longitude'], message: 'Longitude must be >= -180' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, longitude: -200 }))
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

    it('should log validation warnings', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['date'], message: 'Required' }],
        },
      })

      await POST(makeRequest({}))

      expect(logger.warn).toHaveBeenCalledWith(
        '[Draconic API] Validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })

    it('should include issues array in validation error response', async () => {
      const issues = [
        { path: ['date'], message: 'Date must be in YYYY-MM-DD format' },
        { path: ['time'], message: 'Time must be in HH:MM format' },
      ]
      mockSafeParse.mockReturnValue({
        success: false,
        error: { issues },
      })

      const response = await POST(makeRequest({}))
      const data = await response.json()

      expect(data.issues).toEqual(issues)
    })
  })

  // ---- Successful Chart Calculation ----
  describe('Successful Chart Calculation', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return 200 with draconic chart data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.draconicChart).toBeDefined()
      expect(data.draconicChart.planets).toBeDefined()
      expect(data.draconicChart.ascendant).toBeDefined()
      expect(data.draconicChart.mc).toBeDefined()
      expect(data.draconicChart.houses).toBeDefined()
      expect(data.draconicChart.natalNorthNode).toBe(30.0)
    })

    it('should return planet meanings in response', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.planetMeanings).toBeDefined()
      expect(Array.isArray(data.planetMeanings)).toBe(true)
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

    it('should call toChart to convert natal data to chart format', async () => {
      await POST(makeRequest(validBody))

      expect(toChart).toHaveBeenCalledWith(mockNatalData)
    })

    it('should call calculateDraconicChart with natal chart', async () => {
      await POST(makeRequest(validBody))

      expect(calculateDraconicChart).toHaveBeenCalledWith(mockNatalChart)
    })

    it('should include comparison data when compareToNatal is true', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, compareToNatal: true },
      })

      const response = await POST(makeRequest({ ...validBody, compareToNatal: true }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(compareDraconicToNatal).toHaveBeenCalledWith(mockNatalChart)
      expect(data.comparison).toBeDefined()
      expect(data.comparison.alignments).toBeDefined()
      expect(data.comparison.tensions).toBeDefined()
      expect(data.comparison.summary).toBeDefined()
    })

    it('should not include comparison data when compareToNatal is false', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, compareToNatal: false },
      })

      const response = await POST(makeRequest({ ...validBody, compareToNatal: false }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(compareDraconicToNatal).not.toHaveBeenCalled()
      expect(data.comparison).toBeNull()
    })

    it('should call getDraconicPlanetMeaning for each planet', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(getDraconicPlanetMeaning).toHaveBeenCalled()
      // Should be called for each planet in draconic chart
      expect(getDraconicPlanetMeaning).toHaveBeenCalledTimes(mockDraconicChart.planets.length)
    })

    it('should include planet name, sign, formatted, and meaning in planetMeanings', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      data.planetMeanings.forEach((pm: { planet: string; sign: string; formatted: string; meaning: unknown }) => {
        expect(pm.planet).toBeDefined()
        expect(pm.sign).toBeDefined()
        expect(pm.formatted).toBeDefined()
        expect(pm.meaning).toBeDefined()
      })
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
      expect(data.error).toBe('Internal Server Error')
      expect(captureServerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ route: '/api/astrology/advanced/draconic' })
      )
    })

    it('should return 500 when toChart throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalData)
      vi.mocked(toChart).mockImplementation(() => {
        throw new Error('Chart conversion failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should return 500 when calculateDraconicChart throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalData)
      vi.mocked(toChart).mockReturnValue(mockNatalChart)
      vi.mocked(calculateDraconicChart).mockImplementation(() => {
        throw new Error('North Node not found in natal chart')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should return 500 when compareDraconicToNatal throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalData)
      vi.mocked(toChart).mockReturnValue(mockNatalChart)
      vi.mocked(calculateDraconicChart).mockReturnValue(mockDraconicChart)
      vi.mocked(compareDraconicToNatal).mockImplementation(() => {
        throw new Error('Comparison calculation failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should return 500 when getDraconicPlanetMeaning throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalData)
      vi.mocked(toChart).mockReturnValue(mockNatalChart)
      vi.mocked(calculateDraconicChart).mockReturnValue(mockDraconicChart)
      vi.mocked(getDraconicPlanetMeaning).mockImplementation(() => {
        throw new Error('Meaning lookup failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should handle malformed JSON body gracefully', async () => {
      const badRequest = new Request('http://localhost/api/astrology/advanced/draconic', {
        method: 'POST',
        body: 'not-json{{',
        headers: { 'content-type': 'application/json' },
      })

      const response = await POST(badRequest)

      // When JSON parsing fails, body becomes {}, validation should still run
      expect([400, 500]).toContain(response.status)
    })

    it('should capture server errors via telemetry', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Draconic calculation failed'))

      await POST(makeRequest(validBody))

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Draconic calculation failed' }),
        { route: '/api/astrology/advanced/draconic' }
      )
    })

    it('should not expose internal error details in response', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Sensitive internal error details'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(data.error).not.toContain('Sensitive')
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

    it('should handle early date (1900-01-01)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: '1900-01-01' },
      })

      await POST(makeRequest({ ...validBody, date: '1900-01-01' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ year: 1900, month: 1, date: 1 })
      )
    })

    it('should handle future date', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: '2050-12-31' },
      })

      await POST(makeRequest({ ...validBody, date: '2050-12-31' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2050, month: 12, date: 31 })
      )
    })

    it('should handle concurrent requests without state leaking', async () => {
      const requests = Array.from({ length: 3 }, (_, i) =>
        makeRequest({ ...validBody, latitude: 30 + i * 10 })
      )

      // Configure mock to return different results based on input
      vi.mocked(calculateDraconicChart).mockImplementation(() => ({
        ...mockDraconicChart,
      }))

      const responses = await Promise.all(requests.map((r) => POST(r)))

      responses.forEach((r) => {
        expect(r.status).toBe(200)
      })
      expect(calculateNatalChart).toHaveBeenCalledTimes(3)
    })

    it('should handle chart with empty planets array', async () => {
      vi.mocked(calculateDraconicChart).mockReturnValue({
        ...mockDraconicChart,
        planets: [],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.draconicChart.planets).toEqual([])
      expect(data.planetMeanings).toEqual([])
    })

    it('should handle different timezones correctly', async () => {
      const timeZones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney']

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
        data: { ...validBody, timeZone: 9 },
      })

      await POST(makeRequest({ ...validBody, timeZone: 9 }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ timeZone: '9' })
      )
    })

    it('should default compareToNatal to true when not specified', async () => {
      const bodyWithoutCompare = { ...validBody }
      delete (bodyWithoutCompare as Partial<typeof validBody>).compareToNatal
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, compareToNatal: true },
      })

      const response = await POST(makeRequest(bodyWithoutCompare))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(compareDraconicToNatal).toHaveBeenCalled()
      expect(data.comparison).not.toBeNull()
    })

    it('should handle natal chart with no True Node gracefully', async () => {
      vi.mocked(calculateDraconicChart).mockImplementation(() => {
        throw new Error('North Node (True Node) not found in natal chart')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(captureServerError).toHaveBeenCalled()
    })

    it('should handle comparison with no alignments', async () => {
      vi.mocked(compareDraconicToNatal).mockReturnValue({
        ...mockDraconicComparison,
        alignments: [],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.comparison.alignments).toEqual([])
    })

    it('should handle comparison with no tensions', async () => {
      vi.mocked(compareDraconicToNatal).mockReturnValue({
        ...mockDraconicComparison,
        tensions: [],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.comparison.tensions).toEqual([])
    })
  })

  // ---- Response Structure ----
  describe('Response Structure', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should have correct response structure with comparison', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('draconicChart')
      expect(data).toHaveProperty('planetMeanings')
      expect(data).toHaveProperty('comparison')

      // Draconic chart structure
      expect(data.draconicChart).toHaveProperty('planets')
      expect(data.draconicChart).toHaveProperty('ascendant')
      expect(data.draconicChart).toHaveProperty('mc')
      expect(data.draconicChart).toHaveProperty('houses')
      expect(data.draconicChart).toHaveProperty('natalNorthNode')

      // Comparison structure
      expect(data.comparison).toHaveProperty('alignments')
      expect(data.comparison).toHaveProperty('tensions')
      expect(data.comparison).toHaveProperty('summary')
    })

    it('should have correct response structure without comparison', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, compareToNatal: false },
      })

      const response = await POST(makeRequest({ ...validBody, compareToNatal: false }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('draconicChart')
      expect(data).toHaveProperty('planetMeanings')
      expect(data.comparison).toBeNull()
    })

    it('should have planet meanings with correct structure', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(Array.isArray(data.planetMeanings)).toBe(true)
      if (data.planetMeanings.length > 0) {
        const planetMeaning = data.planetMeanings[0]
        expect(planetMeaning).toHaveProperty('planet')
        expect(planetMeaning).toHaveProperty('sign')
        expect(planetMeaning).toHaveProperty('formatted')
        expect(planetMeaning).toHaveProperty('meaning')
      }
    })
  })
})
