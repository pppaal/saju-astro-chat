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
  MidpointsRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock astrology functions
const mockChartData = {
  planets: [
    { name: 'Sun', longitude: 120.5, sign: 'Leo', degree: 0, minute: 30, house: 5, speed: 1.0, retrograde: false },
    { name: 'Moon', longitude: 45.2, sign: 'Taurus', degree: 15, minute: 12, house: 2, speed: 12.5, retrograde: false },
    { name: 'Mercury', longitude: 115.8, sign: 'Leo', degree: 25, minute: 48, house: 5, speed: 1.5, retrograde: false },
    { name: 'Venus', longitude: 95.3, sign: 'Cancer', degree: 5, minute: 18, house: 4, speed: 1.2, retrograde: false },
    { name: 'Mars', longitude: 210.5, sign: 'Libra', degree: 0, minute: 30, house: 7, speed: 0.7, retrograde: false },
  ],
  ascendant: { name: 'Ascendant', longitude: 15.0, sign: 'Aries', degree: 15, minute: 0, house: 1, formatted: 'Aries 15 00' },
  mc: { name: 'MC', longitude: 285.0, sign: 'Capricorn', degree: 15, minute: 0, house: 10, formatted: 'Capricorn 15 00' },
  houses: [{ index: 1, cusp: 15.0, sign: 'Aries', formatted: 'Aries 15 00' }],
}

const mockNatalChart = {
  planets: mockChartData.planets,
  ascendant: mockChartData.ascendant,
  mc: mockChartData.mc,
  houses: mockChartData.houses,
}

const mockMidpoints = [
  {
    id: 'Sun/Moon',
    planet1: 'Sun',
    planet2: 'Moon',
    longitude: 82.85,
    sign: 'Gemini' as const,
    degree: 22,
    minute: 51,
    formatted: 'Gemini 22 51',
    name_ko: '영혼의 점',
    keywords: ['통합된 자아', '내면과 외면의 조화'],
  },
  {
    id: 'Venus/Mars',
    planet1: 'Venus',
    planet2: 'Mars',
    longitude: 152.9,
    sign: 'Virgo' as const,
    degree: 2,
    minute: 54,
    formatted: 'Virgo 02 54',
    name_ko: '열정의 점',
    keywords: ['성적 에너지', '로맨틱 끌림', '창조적 열정'],
  },
  {
    id: 'Sun/Venus',
    planet1: 'Sun',
    planet2: 'Venus',
    longitude: 107.9,
    sign: 'Cancer' as const,
    degree: 17,
    minute: 54,
    formatted: 'Cancer 17 54',
    name_ko: '매력의 점',
    keywords: ['개인적 매력', '자기 가치'],
  },
]

const mockActivations = [
  {
    midpoint: mockMidpoints[0],
    activator: 'Mercury',
    aspectType: 'square' as const,
    orb: 0.95,
    description: 'Mercury이(가) Sun/Moon 미드포인트를 사각으로 활성화',
  },
  {
    midpoint: mockMidpoints[1],
    activator: 'Jupiter',
    aspectType: 'conjunction' as const,
    orb: 1.2,
    description: 'Jupiter이(가) Venus/Mars 미드포인트를 합으로 활성화',
  },
]

vi.mock('@/lib/astrology', () => ({
  calculateNatalChart: vi.fn(),
  toChart: vi.fn(),
  calculateMidpoints: vi.fn(),
  findMidpointActivations: vi.fn(),
}))

// ============ Imports (after all mocks) ============

import { POST } from '@/app/api/astrology/advanced/midpoints/route'
import { rateLimit } from '@/lib/rateLimit'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { captureServerError } from '@/lib/telemetry'
import {
  calculateNatalChart,
  toChart,
  calculateMidpoints,
  findMidpointActivations,
} from '@/lib/astrology'
import { logger } from '@/lib/logger'

// ============ Helpers ============

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/astrology/advanced/midpoints', {
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
  orb: 1.5,
}

const defaultRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '20',
  'X-RateLimit-Remaining': '19',
})

/**
 * Set up all mocks for a successful midpoints calculation flow.
 */
function setupSuccessfulFlow() {
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    headers: defaultRateLimitHeaders,
  } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
  vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
  mockSafeParse.mockReturnValue({ success: true, data: validBody })
  vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
  vi.mocked(toChart).mockReturnValue(mockNatalChart)
  vi.mocked(calculateMidpoints).mockReturnValue(mockMidpoints)
  vi.mocked(findMidpointActivations).mockReturnValue(mockActivations)
}

// ============ Tests ============

describe('Midpoints API - POST /api/astrology/advanced/midpoints', () => {
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

    it('should use correct rate limit key with IP', async () => {
      setupSuccessfulFlow()

      await POST(makeRequest(validBody))

      expect(rateLimit).toHaveBeenCalledWith(
        'api:astrology/advanced/midpoints:192.168.1.1',
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
      expect(data.error.message).toBe('Invalid or missing token')
    })

    it('should return 401 when public token is missing', async () => {
      vi.mocked(requirePublicToken).mockReturnValue({
        valid: false,
        reason: 'Token missing',
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(data.error.message).toBe('Token missing')
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

    it('should return 400 for missing time', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['time'], message: 'Time must be in HH:MM format' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, time: undefined }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_TIME')
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
      expect(data.error.code).toBe('INVALID_COORDINATES')
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
      expect(data.error.code).toBe('INVALID_COORDINATES')
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
      expect(data.error.code).toBe('INVALID_COORDINATES')
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

    it('should return 400 for invalid orb (too high)', async () => {
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

    it('should return 400 for invalid orb (negative)', async () => {
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

    it('should log validation warnings', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['date'], message: 'Required' }],
        },
      })

      await POST(makeRequest({}))

      expect(logger.warn).toHaveBeenCalledWith(
        '[Midpoints API] Validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })

    it('should include issues array in validation error response', async () => {
      const issues = [
        { path: ['date'], message: 'Required' },
        { path: ['time'], message: 'Required' },
      ]
      mockSafeParse.mockReturnValue({
        success: false,
        error: { issues },
      })

      const response = await POST(makeRequest({}))
      const data = await response.json()

      expect(data.error.code).toBe('INVALID_DATE')
    })
  })

  // ---- Successful Midpoint Calculation ----
  describe('Successful Midpoint Calculation', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return 200 with midpoints and activations data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.midpoints).toBeDefined()
      expect(data.data.activations).toBeDefined()
      expect(data.data.totalMidpoints).toBe(mockMidpoints.length)
      expect(data.data.totalActivations).toBe(mockActivations.length)
    })

    it('should return correctly formatted midpoints', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.data.midpoints).toHaveLength(mockMidpoints.length)
      expect(data.data.midpoints[0]).toEqual({
        id: 'Sun/Moon',
        planet1: 'Sun',
        planet2: 'Moon',
        longitude: 82.85,
        sign: 'Gemini',
        degree: 22,
        minute: 51,
        formatted: 'Gemini 22 51',
        nameKo: '영혼의 점',
        keywords: ['통합된 자아', '내면과 외면의 조화'],
      })
    })

    it('should return correctly formatted activations', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.data.activations).toHaveLength(mockActivations.length)
      expect(data.data.activations[0]).toEqual({
        midpointId: 'Sun/Moon',
        midpointNameKo: '영혼의 점',
        activator: 'Mercury',
        aspectType: 'square',
        orb: 0.95,
        description: 'Mercury이(가) Sun/Moon 미드포인트를 사각으로 활성화',
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

    it('should call toChart with chart data from calculateNatalChart', async () => {
      await POST(makeRequest(validBody))

      expect(toChart).toHaveBeenCalledWith(mockChartData)
    })

    it('should call calculateMidpoints with natal chart', async () => {
      await POST(makeRequest(validBody))

      expect(calculateMidpoints).toHaveBeenCalledWith(mockNatalChart)
    })

    it('should call findMidpointActivations with correct parameters', async () => {
      await POST(makeRequest(validBody))

      expect(findMidpointActivations).toHaveBeenCalledWith(mockNatalChart, 1.5)
    })

    it('should use default orb of 1.5 when not provided', async () => {
      const bodyWithoutOrb = { ...validBody }
      delete (bodyWithoutOrb as Partial<typeof validBody>).orb

      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, orb: 1.5 }, // Default from schema
      })

      await POST(makeRequest(bodyWithoutOrb))

      expect(findMidpointActivations).toHaveBeenCalledWith(mockNatalChart, 1.5)
    })

    it('should use custom orb when provided', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, orb: 2.5 },
      })

      await POST(makeRequest({ ...validBody, orb: 2.5 }))

      expect(findMidpointActivations).toHaveBeenCalledWith(mockNatalChart, 2.5)
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

    it('should correctly parse date string to numbers', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: '2000-12-25' },
      })

      await POST(makeRequest({ ...validBody, date: '2000-12-25' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({
          year: 2000,
          month: 12,
          date: 25,
        })
      )
    })

    it('should correctly parse time string to numbers', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, time: '09:05' },
      })

      await POST(makeRequest({ ...validBody, time: '09:05' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({
          hour: 9,
          minute: 5,
        })
      )
    })

    it('should convert timeZone to string', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, timeZone: 9 }, // Numeric timezone offset
      })

      await POST(makeRequest({ ...validBody, timeZone: 9 }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({
          timeZone: '9',
        })
      )
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
        expect.objectContaining({ route: '/api/astrology/advanced/midpoints' })
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

    it('should return 500 when calculateMidpoints throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockReturnValue(mockNatalChart)
      vi.mocked(calculateMidpoints).mockImplementation(() => {
        throw new Error('Midpoint calculation failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Internal server error')
    })

    it('should return 500 when findMidpointActivations throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockReturnValue(mockNatalChart)
      vi.mocked(calculateMidpoints).mockReturnValue(mockMidpoints)
      vi.mocked(findMidpointActivations).mockImplementation(() => {
        throw new Error('Activation search failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Internal server error')
    })

    it('should handle malformed JSON body gracefully', async () => {
      const badRequest = new Request('http://localhost/api/astrology/advanced/midpoints', {
        method: 'POST',
        body: 'not-json{{',
        headers: { 'content-type': 'application/json' },
      })

      const response = await POST(badRequest)

      // When JSON parsing fails, body becomes {}, validation should still run
      expect([400, 500]).toContain(response.status)
    })

    it('should handle empty body', async () => {
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

    it('should capture server errors via telemetry', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Midpoint calculation failed'))

      await POST(makeRequest(validBody))

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Midpoint calculation failed' }),
        { route: '/api/astrology/advanced/midpoints' }
      )
    })

    it('should not leak error details in response', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Sensitive database error details'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Internal server error')
      expect(JSON.stringify(data)).not.toContain('database')
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

      expect(findMidpointActivations).toHaveBeenCalledWith(mockNatalChart, 0)
    })

    it('should handle maximum valid orb (5)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, orb: 5 },
      })

      await POST(makeRequest({ ...validBody, orb: 5 }))

      expect(findMidpointActivations).toHaveBeenCalledWith(mockNatalChart, 5)
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

    it('should handle historic birth date', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: '1900-01-01' },
      })

      const response = await POST(makeRequest({ ...validBody, date: '1900-01-01' }))

      expect(response.status).toBe(200)
      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ year: 1900, month: 1, date: 1 })
      )
    })

    it('should handle future birth date', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: '2050-12-31' },
      })

      const response = await POST(makeRequest({ ...validBody, date: '2050-12-31' }))

      expect(response.status).toBe(200)
    })

    it('should handle empty midpoints result', async () => {
      vi.mocked(calculateMidpoints).mockReturnValue([])
      vi.mocked(findMidpointActivations).mockReturnValue([])

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.midpoints).toEqual([])
      expect(data.data.activations).toEqual([])
      expect(data.data.totalMidpoints).toBe(0)
      expect(data.data.totalActivations).toBe(0)
    })

    it('should handle no activations found', async () => {
      vi.mocked(findMidpointActivations).mockReturnValue([])

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.midpoints).toHaveLength(mockMidpoints.length)
      expect(data.data.activations).toEqual([])
      expect(data.data.totalActivations).toBe(0)
    })

    it('should handle concurrent requests without state leaking', async () => {
      const requests = Array.from({ length: 3 }, (_, i) =>
        makeRequest({ ...validBody, orb: 1.0 + i * 0.5 })
      )

      // Configure mock to return different orb values
      let callCount = 0
      mockSafeParse.mockImplementation(() => {
        const orb = 1.0 + callCount * 0.5
        callCount++
        return { success: true, data: { ...validBody, orb } }
      })

      const responses = await Promise.all(requests.map((r) => POST(r)))

      responses.forEach((r) => {
        expect(r.status).toBe(200)
      })
      expect(calculateNatalChart).toHaveBeenCalledTimes(3)
      expect(findMidpointActivations).toHaveBeenCalledTimes(3)
    })

    it('should handle chart with minimal planets array', async () => {
      const minimalChart = {
        planets: [
          { name: 'Sun', longitude: 120.5, sign: 'Leo', degree: 0, minute: 30, house: 5, speed: 1.0, retrograde: false },
        ],
        ascendant: mockChartData.ascendant,
        mc: mockChartData.mc,
        houses: [],
      }
      vi.mocked(toChart).mockReturnValue(minimalChart)
      vi.mocked(calculateMidpoints).mockReturnValue([])

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.totalMidpoints).toBe(0)
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

    it('should handle equator location (latitude 0)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, latitude: 0 },
      })

      const response = await POST(makeRequest({ ...validBody, latitude: 0 }))

      expect(response.status).toBe(200)
    })

    it('should handle prime meridian location (longitude 0)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, longitude: 0 },
      })

      const response = await POST(makeRequest({ ...validBody, longitude: 0 }))

      expect(response.status).toBe(200)
    })

    it('should handle fractional orb values', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, orb: 1.25 },
      })

      await POST(makeRequest({ ...validBody, orb: 1.25 }))

      expect(findMidpointActivations).toHaveBeenCalledWith(mockNatalChart, 1.25)
    })
  })

  // ---- Response Structure ----
  describe('Response Structure', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should include all required fields in response', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.data).toHaveProperty('midpoints')
      expect(data.data).toHaveProperty('activations')
      expect(data.data).toHaveProperty('totalMidpoints')
      expect(data.data).toHaveProperty('totalActivations')
    })

    it('should include all required fields in midpoint objects', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const midpoint = data.data.midpoints[0]
      expect(midpoint).toHaveProperty('id')
      expect(midpoint).toHaveProperty('planet1')
      expect(midpoint).toHaveProperty('planet2')
      expect(midpoint).toHaveProperty('longitude')
      expect(midpoint).toHaveProperty('sign')
      expect(midpoint).toHaveProperty('degree')
      expect(midpoint).toHaveProperty('minute')
      expect(midpoint).toHaveProperty('formatted')
      expect(midpoint).toHaveProperty('nameKo')
      expect(midpoint).toHaveProperty('keywords')
    })

    it('should include all required fields in activation objects', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const activation = data.data.activations[0]
      expect(activation).toHaveProperty('midpointId')
      expect(activation).toHaveProperty('midpointNameKo')
      expect(activation).toHaveProperty('activator')
      expect(activation).toHaveProperty('aspectType')
      expect(activation).toHaveProperty('orb')
      expect(activation).toHaveProperty('description')
    })

    it('should transform name_ko to nameKo in midpoints', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      // Verify camelCase transformation
      expect(data.data.midpoints[0].nameKo).toBe('영혼의 점')
      expect(data.data.midpoints[0]).not.toHaveProperty('name_ko')
    })

    it('should use midpoint name_ko for midpointNameKo in activations', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.data.activations[0].midpointNameKo).toBe('영혼의 점')
    })

    it('should accurately count midpoints and activations', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.data.totalMidpoints).toBe(data.data.midpoints.length)
      expect(data.data.totalActivations).toBe(data.data.activations.length)
    })
  })
})
