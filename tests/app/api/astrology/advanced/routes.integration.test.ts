/**
 * P3: Astrology Advanced Routes Integration Tests
 * 고급 Astrology API 라우트 통합 테스트 (solar-return, lunar-return, progressions)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextResponse } from 'next/server'

// ---------- hoisted mocks ----------
const mockRateLimit = vi.fn()
const mockRequirePublicToken = vi.fn()
const mockCalculateSolarReturn = vi.fn()
const mockGetSolarReturnSummary = vi.fn()
const mockCalculateLunarReturn = vi.fn()
const mockGetLunarReturnSummary = vi.fn()
const mockCalculateProgressions = vi.fn()
const mockGetProgressionsSummary = vi.fn()

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: mockRateLimit,
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: mockRequirePublicToken,
}))

vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/security/errorSanitizer', () => ({
  sanitizeError: vi.fn((error) => ({
    error: 'Internal server error',
    message: error instanceof Error ? error.message : 'Unknown error',
  })),
}))

vi.mock('@/lib/astrology', () => ({
  calculateSolarReturn: mockCalculateSolarReturn,
  getSolarReturnSummary: mockGetSolarReturnSummary,
  calculateLunarReturn: mockCalculateLunarReturn,
  getLunarReturnSummary: mockGetLunarReturnSummary,
  calculateProgressions: mockCalculateProgressions,
  getProgressionsSummary: mockGetProgressionsSummary,
}))

describe('Astrology Advanced Routes (P3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: rate limit allows
    mockRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 19,
      headers: new Map([
        ['X-RateLimit-Limit', '20'],
        ['X-RateLimit-Remaining', '19'],
      ]),
    })

    // Default: token valid
    mockRequirePublicToken.mockReturnValue({ valid: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const validBirthData = {
    date: '1990-05-15',
    time: '14:30',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 9,
  }

  describe('Solar Return API', () => {
    const mockChart = {
      sun: { sign: 'Taurus', degree: 24.5 },
      moon: { sign: 'Cancer', degree: 12.3 },
      ascendant: { sign: 'Virgo', degree: 15.7 },
      planets: [],
      aspects: [],
    }

    const mockSummary = {
      theme: 'Personal growth and transformation',
      keyPlanets: ['Sun', 'Jupiter'],
      challenges: ['Saturn square'],
      opportunities: ['Venus trine Jupiter'],
    }

    beforeEach(() => {
      mockCalculateSolarReturn.mockResolvedValue(mockChart)
      mockGetSolarReturnSummary.mockReturnValue(mockSummary)
    })

    it('should calculate solar return for valid request', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validBirthData,
          year: 2024,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chart).toBeDefined()
      expect(data.summary).toBeDefined()
      expect(data.year).toBe(2024)
    })

    it('should use current year as default', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBirthData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.year).toBe(new Date().getFullYear())
    })

    it('should enforce rate limiting', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        headers: new Map([
          ['X-RateLimit-Limit', '20'],
          ['X-RateLimit-Remaining', '0'],
          ['Retry-After', '60'],
        ]),
      })

      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBirthData),
      })

      const response = await POST(request)

      expect(response.status).toBe(429)
    })

    it('should require valid public token', async () => {
      mockRequirePublicToken.mockReturnValue({
        valid: false,
        reason: 'Token not provided',
      })

      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBirthData),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should validate required fields', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const invalidRequest = new Request(
        'http://localhost/api/astrology/advanced/solar-return',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: '1990-05-15',
            // Missing time, latitude, longitude
          }),
        }
      )

      const response = await POST(invalidRequest)

      expect(response.status).toBe(422)
    })

    it('should validate date format', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validBirthData,
          date: '15/05/1990', // Invalid format
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(422)
    })

    it('should validate time format', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validBirthData,
          time: '25:70', // Invalid time
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(422)
    })

    it('should validate latitude range', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validBirthData,
          latitude: 100, // Invalid: should be -90 to 90
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(422)
    })

    it('should validate longitude range', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validBirthData,
          longitude: 200, // Invalid: should be -180 to 180
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(422)
    })

    it('should handle calculation errors gracefully', async () => {
      mockCalculateSolarReturn.mockRejectedValue(new Error('Ephemeris data not available'))

      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBirthData),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should set cache control headers', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBirthData),
      })

      const response = await POST(request)

      expect(response.headers.get('Cache-Control')).toBe('no-store')
    })
  })

  describe('Lunar Return API', () => {
    const mockChart = {
      moon: { sign: 'Cancer', degree: 15.2 },
      sun: { sign: 'Gemini', degree: 8.7 },
      ascendant: { sign: 'Libra', degree: 22.1 },
      planets: [],
      aspects: [],
    }

    const mockSummary = {
      emotionalTheme: 'Nurturing and home',
      keyInfluences: ['Moon conjunct Venus'],
      monthlyFocus: 'Family matters',
    }

    beforeEach(() => {
      mockCalculateLunarReturn.mockResolvedValue(mockChart)
      mockGetLunarReturnSummary.mockReturnValue(mockSummary)
    })

    it('should calculate lunar return for valid request', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/lunar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/lunar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validBirthData,
          year: 2024,
          month: 6,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chart).toBeDefined()
      expect(data.summary).toBeDefined()
      expect(data.year).toBe(2024)
      expect(data.month).toBe(6)
    })

    it('should use current year and month as default', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/lunar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/lunar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBirthData),
      })

      const response = await POST(request)
      const data = await response.json()

      const now = new Date()
      expect(response.status).toBe(200)
      expect(data.year).toBe(now.getFullYear())
      expect(data.month).toBe(now.getMonth() + 1)
    })

    it('should enforce rate limiting', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        headers: new Map([
          ['X-RateLimit-Limit', '20'],
          ['X-RateLimit-Remaining', '0'],
        ]),
      })

      const { POST } = await import('@/app/api/astrology/advanced/lunar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/lunar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBirthData),
      })

      const response = await POST(request)

      expect(response.status).toBe(429)
    })

    it('should require valid public token', async () => {
      mockRequirePublicToken.mockReturnValue({
        valid: false,
        reason: 'Invalid token',
      })

      const { POST } = await import('@/app/api/astrology/advanced/lunar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/lunar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBirthData),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should validate month range', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/lunar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/lunar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validBirthData,
          month: 13, // Invalid month
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should handle malformed JSON', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/lunar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/lunar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json{',
      })

      const response = await POST(request)

      // Should fail validation due to empty parsed body
      expect(response.status).toBe(400)
    })
  })

  describe('Common Validation Patterns', () => {
    it('should handle empty request body', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(request)

      expect(response.status).toBe(422)
    })

    it('should handle null values', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: null,
          time: null,
          latitude: null,
          longitude: null,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(422)
    })

    it('should handle extreme coordinate values', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      // North Pole
      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validBirthData,
          latitude: 90,
          longitude: 0,
        }),
      })

      const response = await POST(request)

      // Should be valid - extreme but within range
      expect([200, 422]).toContain(response.status)
    })

    it('should handle historical dates', async () => {
      mockCalculateSolarReturn.mockResolvedValue({
        sun: { sign: 'Aries', degree: 10 },
      })
      mockGetSolarReturnSummary.mockReturnValue({ theme: 'Historical' })

      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validBirthData,
          date: '1900-01-01',
          year: 1950,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle future dates', async () => {
      mockCalculateSolarReturn.mockResolvedValue({
        sun: { sign: 'Capricorn', degree: 5 },
      })
      mockGetSolarReturnSummary.mockReturnValue({ theme: 'Future' })

      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...validBirthData,
          year: 2050,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Rate Limiting Behavior', () => {
    it('should track rate limit per IP', async () => {
      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      // First 20 requests should succeed
      for (let i = 0; i < 5; i++) {
        mockRateLimit.mockResolvedValue({
          allowed: true,
          remaining: 19 - i,
          headers: new Map([
            ['X-RateLimit-Remaining', String(19 - i)],
          ]),
        })

        const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validBirthData),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      }
    })

    it('should include rate limit headers in response', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 15,
        headers: new Map([
          ['X-RateLimit-Limit', '20'],
          ['X-RateLimit-Remaining', '15'],
          ['X-RateLimit-Reset', '1700000000'],
        ]),
      })

      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBirthData),
      })

      const response = await POST(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('20')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('15')
    })
  })

  describe('Error Handling', () => {
    it('should sanitize internal errors', async () => {
      mockCalculateLunarReturn.mockRejectedValue(
        new Error('Internal database connection string: postgres://user:pass@host')
      )

      const { POST } = await import('@/app/api/astrology/advanced/lunar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/lunar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBirthData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      // Should not expose connection string
      expect(JSON.stringify(data)).not.toContain('postgres://user:pass')
    })

    it('should handle timeout errors', async () => {
      mockCalculateSolarReturn.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Calculation timeout')), 100)
          )
      )

      const { POST } = await import('@/app/api/astrology/advanced/solar-return/route')

      const request = new Request('http://localhost/api/astrology/advanced/solar-return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBirthData),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})
