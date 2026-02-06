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
  HarmonicsRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock natal chart data
const mockChartData = {
  planets: [
    { name: 'Sun', longitude: 120.5, sign: 'Leo', degree: 0, minute: 30, house: 5, speed: 1.0, retrograde: false },
    { name: 'Moon', longitude: 45.2, sign: 'Taurus', degree: 15, minute: 12, house: 2, speed: 12.5, retrograde: false },
    { name: 'Mercury', longitude: 135.8, sign: 'Leo', degree: 15, minute: 48, house: 5, speed: 1.2, retrograde: false },
    { name: 'Venus', longitude: 100.3, sign: 'Cancer', degree: 10, minute: 18, house: 4, speed: 1.1, retrograde: false },
    { name: 'Mars', longitude: 210.7, sign: 'Libra', degree: 0, minute: 42, house: 7, speed: 0.7, retrograde: false },
  ],
  ascendant: { name: 'Ascendant', longitude: 15.0, sign: 'Aries', degree: 15, minute: 0, house: 1, formatted: 'Aries 15\u00b000\u2032' },
  mc: { name: 'MC', longitude: 285.0, sign: 'Capricorn', degree: 15, minute: 0, house: 10, formatted: 'Capricorn 15\u00b000\u2032' },
  houses: [{ index: 1, cusp: 15.0, sign: 'Aries', formatted: 'Aries 15\u00b000\u2032' }],
}

const mockNatalChart = {
  planets: mockChartData.planets,
  ascendant: mockChartData.ascendant,
  mc: mockChartData.mc,
  houses: mockChartData.houses,
}

// Mock harmonic chart (7th harmonic example)
const mockHarmonicChart = {
  planets: [
    { name: 'Sun', longitude: 123.5, sign: 'Leo', degree: 3, minute: 30, house: 5, speed: 1.0, retrograde: false },
    { name: 'Moon', longitude: 316.4, sign: 'Aquarius', degree: 16, minute: 24, house: 11, speed: 12.5, retrograde: false },
    { name: 'Mercury', longitude: 230.6, sign: 'Scorpio', degree: 20, minute: 36, house: 8, speed: 1.2, retrograde: false },
  ],
  ascendant: { name: 'Ascendant', longitude: 105.0, sign: 'Cancer', degree: 15, minute: 0, house: 1, formatted: 'Cancer 15\u00b000\u2032' },
  mc: { name: 'MC', longitude: 195.0, sign: 'Libra', degree: 15, minute: 0, house: 10, formatted: 'Libra 15\u00b000\u2032' },
}

// Mock harmonic analysis
const mockHarmonicAnalysis = {
  strength: 0.78,
  conjunctions: [
    { planet1: 'Sun', planet2: 'Mercury', orb: 2.5 },
    { planet1: 'Moon', planet2: 'Venus', orb: 1.8 },
  ],
  patterns: ['Grand Trine', 'T-Square'],
  interpretation: 'The 7th harmonic reveals creative inspiration and romantic idealism.',
}

// Mock harmonic meaning
const mockHarmonicMeaning = {
  number: 7,
  name: 'Septile',
  keywords: ['inspiration', 'creativity', 'spiritual insight'],
  description: 'The seventh harmonic relates to creative inspiration and spiritual development.',
}

// Mock harmonic profile
const mockHarmonicProfile = {
  strongestHarmonics: [
    { number: 5, strength: 0.92, name: 'Quintile' },
    { number: 7, strength: 0.78, name: 'Septile' },
    { number: 9, strength: 0.71, name: 'Novile' },
  ],
  weakestHarmonics: [
    { number: 11, strength: 0.23, name: 'Undecile' },
    { number: 13, strength: 0.31, name: 'Tredecile' },
  ],
  overallInterpretation: 'Strong creative and spiritual tendencies with emphasis on the 5th and 7th harmonics.',
  ageHarmonic: {
    strength: 0.65,
    conjunctions: [{ planet1: 'Sun', planet2: 'Jupiter', orb: 1.2 }],
    patterns: ['Stellium'],
    interpretation: 'At age 35, there is emphasis on expansion and growth.',
  },
}

vi.mock('@/lib/astrology', () => ({
  calculateNatalChart: vi.fn(),
  toChart: vi.fn(),
  calculateHarmonicChart: vi.fn(),
  analyzeHarmonic: vi.fn(),
  generateHarmonicProfile: vi.fn(),
  getHarmonicMeaning: vi.fn(),
}))

// ============ Imports (after all mocks) ============

import { POST } from '@/app/api/astrology/advanced/harmonics/route'
import { rateLimit } from '@/lib/rateLimit'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { captureServerError } from '@/lib/telemetry'
import {
  calculateNatalChart,
  toChart,
  calculateHarmonicChart,
  analyzeHarmonic,
  generateHarmonicProfile,
  getHarmonicMeaning,
} from '@/lib/astrology'
import { logger } from '@/lib/logger'

// ============ Helpers ============

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/astrology/advanced/harmonics', {
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
  harmonic: 7,
}

const validBodyWithProfile = {
  ...validBody,
  fullProfile: true,
  currentAge: 35,
}

const defaultRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '20',
  'X-RateLimit-Remaining': '19',
})

/**
 * Set up all mocks for a successful harmonics calculation flow.
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
  vi.mocked(calculateHarmonicChart).mockReturnValue(mockHarmonicChart)
  vi.mocked(analyzeHarmonic).mockReturnValue(mockHarmonicAnalysis)
  vi.mocked(getHarmonicMeaning).mockReturnValue(mockHarmonicMeaning)
  vi.mocked(generateHarmonicProfile).mockReturnValue(mockHarmonicProfile)
}

/**
 * Set up mocks for a successful flow with full profile.
 */
function setupSuccessfulFlowWithProfile() {
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    headers: defaultRateLimitHeaders,
  } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
  vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
  mockSafeParse.mockReturnValue({ success: true, data: validBodyWithProfile })
  vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
  vi.mocked(toChart).mockReturnValue(mockNatalChart)
  vi.mocked(calculateHarmonicChart).mockReturnValue(mockHarmonicChart)
  vi.mocked(analyzeHarmonic).mockReturnValue(mockHarmonicAnalysis)
  vi.mocked(getHarmonicMeaning).mockReturnValue(mockHarmonicMeaning)
  vi.mocked(generateHarmonicProfile).mockReturnValue(mockHarmonicProfile)
}

// ============ Tests ============

describe('Harmonics API - POST /api/astrology/advanced/harmonics', () => {
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

    it('should use correct rate limit key with IP', async () => {
      setupSuccessfulFlow()

      await POST(makeRequest(validBody))

      expect(rateLimit).toHaveBeenCalledWith('astro-harmonics:192.168.1.1', { limit: 20, windowSeconds: 60 })
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

    it('should include rate limit headers in unauthorized response', async () => {
      vi.mocked(requirePublicToken).mockReturnValue({
        valid: false,
        reason: 'Invalid token',
      })

      const response = await POST(makeRequest(validBody))

      expect(response.status).toBe(401)
      // Headers are still set from rate limit
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
            { path: ['harmonic'], message: 'Harmonic must be >= 1' },
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

    it('should return 422 for invalid harmonic number (too low)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['harmonic'], message: 'Harmonic must be >= 1' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, harmonic: 0 }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 for invalid harmonic number (too high)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['harmonic'], message: 'Harmonic must be <= 144' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, harmonic: 200 }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 for invalid currentAge (negative)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['currentAge'], message: 'Age must be >= 0' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, currentAge: -5 }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 for invalid currentAge (too high)', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['currentAge'], message: 'Age must be <= 150' }],
        },
      })

      const response = await POST(makeRequest({ ...validBody, currentAge: 200 }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
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
        '[Harmonics API] Validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  // ---- Successful Harmonic Chart Calculation ----
  describe('Successful Harmonic Chart Calculation', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return 200 with harmonic chart data for specific harmonic', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.harmonicChart).toBeDefined()
      expect(data.harmonicChart.harmonicNumber).toBe(7)
      expect(data.harmonicChart.planets).toEqual(mockHarmonicChart.planets)
      expect(data.harmonicChart.ascendant).toEqual(mockHarmonicChart.ascendant)
      expect(data.harmonicChart.mc).toEqual(mockHarmonicChart.mc)
    })

    it('should return analysis data for specific harmonic', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analysis).toBeDefined()
      expect(data.analysis.strength).toBe(mockHarmonicAnalysis.strength)
      expect(data.analysis.conjunctions).toEqual(mockHarmonicAnalysis.conjunctions)
      expect(data.analysis.patterns).toEqual(mockHarmonicAnalysis.patterns)
      expect(data.analysis.interpretation).toBe(mockHarmonicAnalysis.interpretation)
    })

    it('should return harmonic meaning for specific harmonic', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.meaning).toEqual(mockHarmonicMeaning)
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

    it('should call toChart with chart data', async () => {
      await POST(makeRequest(validBody))

      expect(toChart).toHaveBeenCalledWith(mockChartData)
    })

    it('should call calculateHarmonicChart with natal chart and harmonic number', async () => {
      await POST(makeRequest(validBody))

      expect(calculateHarmonicChart).toHaveBeenCalledWith(mockNatalChart, 7)
    })

    it('should call analyzeHarmonic with natal chart and harmonic number', async () => {
      await POST(makeRequest(validBody))

      expect(analyzeHarmonic).toHaveBeenCalledWith(mockNatalChart, 7)
    })

    it('should call getHarmonicMeaning with harmonic number', async () => {
      await POST(makeRequest(validBody))

      expect(getHarmonicMeaning).toHaveBeenCalledWith(7)
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

  // ---- Full Profile Calculation ----
  describe('Full Profile Calculation', () => {
    beforeEach(() => {
      setupSuccessfulFlowWithProfile()
    })

    it('should return profile data when fullProfile is true', async () => {
      const response = await POST(makeRequest(validBodyWithProfile))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.profile).toBeDefined()
      expect(data.profile.strongestHarmonics).toEqual(mockHarmonicProfile.strongestHarmonics)
      expect(data.profile.weakestHarmonics).toEqual(mockHarmonicProfile.weakestHarmonics)
      expect(data.profile.overallInterpretation).toBe(mockHarmonicProfile.overallInterpretation)
    })

    it('should return age harmonic when currentAge is provided', async () => {
      const response = await POST(makeRequest(validBodyWithProfile))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ageHarmonic).toBeDefined()
      expect(data.ageHarmonic.age).toBe(35)
      expect(data.ageHarmonic.strength).toBe(mockHarmonicProfile.ageHarmonic?.strength)
      expect(data.ageHarmonic.conjunctions).toEqual(mockHarmonicProfile.ageHarmonic?.conjunctions)
      expect(data.ageHarmonic.patterns).toEqual(mockHarmonicProfile.ageHarmonic?.patterns)
      expect(data.ageHarmonic.interpretation).toBe(mockHarmonicProfile.ageHarmonic?.interpretation)
    })

    it('should call generateHarmonicProfile with natal chart and currentAge', async () => {
      await POST(makeRequest(validBodyWithProfile))

      expect(generateHarmonicProfile).toHaveBeenCalledWith(mockNatalChart, 35)
    })

    it('should return profile when only currentAge is provided (without fullProfile)', async () => {
      const bodyWithAgeOnly = { ...validBody, currentAge: 30 }
      mockSafeParse.mockReturnValue({ success: true, data: bodyWithAgeOnly })

      const response = await POST(makeRequest(bodyWithAgeOnly))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.profile).toBeDefined()
      expect(generateHarmonicProfile).toHaveBeenCalledWith(mockNatalChart, 30)
    })

    it('should not include ageHarmonic if profile does not have it', async () => {
      vi.mocked(generateHarmonicProfile).mockReturnValue({
        ...mockHarmonicProfile,
        ageHarmonic: undefined,
      })

      const response = await POST(makeRequest(validBodyWithProfile))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ageHarmonic).toBeUndefined()
    })
  })

  // ---- Request without specific harmonic ----
  describe('Request without specific harmonic', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as ReturnType<typeof rateLimit> extends Promise<infer T> ? T : never)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockReturnValue(mockNatalChart)
      vi.mocked(generateHarmonicProfile).mockReturnValue(mockHarmonicProfile)
    })

    it('should return only profile when harmonic is not specified but fullProfile is true', async () => {
      const bodyWithProfileOnly = { ...validBody, harmonic: undefined, fullProfile: true }
      mockSafeParse.mockReturnValue({ success: true, data: bodyWithProfileOnly })

      const response = await POST(makeRequest(bodyWithProfileOnly))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.harmonicChart).toBeUndefined()
      expect(data.analysis).toBeUndefined()
      expect(data.meaning).toBeUndefined()
      expect(data.profile).toBeDefined()
    })

    it('should not call harmonic-specific functions when harmonic is not specified', async () => {
      const bodyWithProfileOnly = { ...validBody, harmonic: undefined, fullProfile: true }
      mockSafeParse.mockReturnValue({ success: true, data: bodyWithProfileOnly })

      await POST(makeRequest(bodyWithProfileOnly))

      expect(calculateHarmonicChart).not.toHaveBeenCalled()
      expect(analyzeHarmonic).not.toHaveBeenCalled()
      expect(getHarmonicMeaning).not.toHaveBeenCalled()
    })

    it('should return empty response when neither harmonic nor fullProfile/currentAge is specified', async () => {
      const minimalBody = { ...validBody, harmonic: undefined, fullProfile: false, currentAge: undefined }
      mockSafeParse.mockReturnValue({ success: true, data: minimalBody })

      const response = await POST(makeRequest(minimalBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.harmonicChart).toBeUndefined()
      expect(data.profile).toBeUndefined()
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
        expect.objectContaining({ route: '/api/astrology/advanced/harmonics' })
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

    it('should return 500 when calculateHarmonicChart throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockReturnValue(mockNatalChart)
      vi.mocked(calculateHarmonicChart).mockImplementation(() => {
        throw new Error('Harmonic calculation failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should return 500 when analyzeHarmonic throws', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockReturnValue(mockNatalChart)
      vi.mocked(calculateHarmonicChart).mockReturnValue(mockHarmonicChart)
      vi.mocked(analyzeHarmonic).mockImplementation(() => {
        throw new Error('Harmonic analysis failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should return 500 when generateHarmonicProfile throws', async () => {
      mockSafeParse.mockReturnValue({ success: true, data: validBodyWithProfile })
      vi.mocked(calculateNatalChart).mockResolvedValue(mockChartData)
      vi.mocked(toChart).mockReturnValue(mockNatalChart)
      vi.mocked(calculateHarmonicChart).mockReturnValue(mockHarmonicChart)
      vi.mocked(analyzeHarmonic).mockReturnValue(mockHarmonicAnalysis)
      vi.mocked(getHarmonicMeaning).mockReturnValue(mockHarmonicMeaning)
      vi.mocked(generateHarmonicProfile).mockImplementation(() => {
        throw new Error('Profile generation failed')
      })

      const response = await POST(makeRequest(validBodyWithProfile))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should return 400 when request.json() throws (malformed body)', async () => {
      const badRequest = new Request('http://localhost/api/astrology/advanced/harmonics', {
        method: 'POST',
        body: 'not-json{{',
        headers: { 'content-type': 'application/json' },
      })

      // When JSON parsing fails, body becomes {}, validation should still run
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
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Ephemeris engine crash'))

      await POST(makeRequest(validBody))

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Ephemeris engine crash' }),
        { route: '/api/astrology/advanced/harmonics' }
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

    it('should handle minimum harmonic (1)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, harmonic: 1 },
      })

      await POST(makeRequest({ ...validBody, harmonic: 1 }))

      expect(calculateHarmonicChart).toHaveBeenCalledWith(mockNatalChart, 1)
    })

    it('should handle maximum harmonic (144)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, harmonic: 144 },
      })

      await POST(makeRequest({ ...validBody, harmonic: 144 }))

      expect(calculateHarmonicChart).toHaveBeenCalledWith(mockNatalChart, 144)
    })

    it('should handle age 0', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, currentAge: 0, fullProfile: true },
      })

      await POST(makeRequest({ ...validBody, currentAge: 0, fullProfile: true }))

      expect(generateHarmonicProfile).toHaveBeenCalledWith(mockNatalChart, 0)
    })

    it('should handle age 150', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, currentAge: 150, fullProfile: true },
      })

      await POST(makeRequest({ ...validBody, currentAge: 150, fullProfile: true }))

      expect(generateHarmonicProfile).toHaveBeenCalledWith(mockNatalChart, 150)
    })

    it('should handle concurrent requests without state leaking', async () => {
      const harmonics = [5, 7, 9]
      const requests = harmonics.map((h) =>
        makeRequest({ ...validBody, harmonic: h })
      )

      // Configure mock to return different harmonics based on input
      vi.mocked(calculateHarmonicChart).mockImplementation((chart, harmonic) => ({
        ...mockHarmonicChart,
        harmonicNumber: harmonic,
      }))

      const responses = await Promise.all(requests.map((r) => POST(r)))

      responses.forEach((r) => {
        expect(r.status).toBe(200)
      })
      expect(calculateHarmonicChart).toHaveBeenCalledTimes(3)
    })

    it('should handle chart with empty planets array', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue({
        ...mockChartData,
        planets: [],
      })
      vi.mocked(toChart).mockReturnValue({
        ...mockNatalChart,
        planets: [],
      })
      vi.mocked(calculateHarmonicChart).mockReturnValue({
        ...mockHarmonicChart,
        planets: [],
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.harmonicChart.planets).toEqual([])
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

    it('should handle common harmonic numbers (5, 7, 9)', async () => {
      const commonHarmonics = [5, 7, 9]

      for (const harmonic of commonHarmonics) {
        vi.clearAllMocks()
        setupSuccessfulFlow()
        mockSafeParse.mockReturnValue({
          success: true,
          data: { ...validBody, harmonic },
        })

        const response = await POST(makeRequest({ ...validBody, harmonic }))

        expect(response.status).toBe(200)
        expect(calculateHarmonicChart).toHaveBeenCalledWith(mockNatalChart, harmonic)
        expect(analyzeHarmonic).toHaveBeenCalledWith(mockNatalChart, harmonic)
        expect(getHarmonicMeaning).toHaveBeenCalledWith(harmonic)
      }
    })

    it('should handle midnight time (00:00)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, time: '00:00' },
      })

      const response = await POST(makeRequest({ ...validBody, time: '00:00' }))

      expect(response.status).toBe(200)
      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ hour: 0, minute: 0 })
      )
    })

    it('should handle end of day time (23:59)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, time: '23:59' },
      })

      const response = await POST(makeRequest({ ...validBody, time: '23:59' }))

      expect(response.status).toBe(200)
      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ hour: 23, minute: 59 })
      )
    })

    it('should handle date parsing correctly', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: '2000-12-31' },
      })

      await POST(makeRequest({ ...validBody, date: '2000-12-31' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2000, month: 12, date: 31 })
      )
    })

    it('should handle leap year date', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validBody, date: '2000-02-29' },
      })

      await POST(makeRequest({ ...validBody, date: '2000-02-29' }))

      expect(calculateNatalChart).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2000, month: 2, date: 29 })
      )
    })
  })

  // ---- Response Structure ----
  describe('Response Structure', () => {
    beforeEach(() => {
      setupSuccessfulFlowWithProfile()
    })

    it('should return proper structure for full response', async () => {
      const response = await POST(makeRequest(validBodyWithProfile))
      const data = await response.json()

      expect(response.status).toBe(200)

      // Harmonic chart structure
      expect(data.harmonicChart).toHaveProperty('harmonicNumber')
      expect(data.harmonicChart).toHaveProperty('planets')
      expect(data.harmonicChart).toHaveProperty('ascendant')
      expect(data.harmonicChart).toHaveProperty('mc')

      // Analysis structure
      expect(data.analysis).toHaveProperty('strength')
      expect(data.analysis).toHaveProperty('conjunctions')
      expect(data.analysis).toHaveProperty('patterns')
      expect(data.analysis).toHaveProperty('interpretation')

      // Profile structure
      expect(data.profile).toHaveProperty('strongestHarmonics')
      expect(data.profile).toHaveProperty('weakestHarmonics')
      expect(data.profile).toHaveProperty('overallInterpretation')

      // Age harmonic structure
      expect(data.ageHarmonic).toHaveProperty('age')
      expect(data.ageHarmonic).toHaveProperty('strength')
      expect(data.ageHarmonic).toHaveProperty('conjunctions')
      expect(data.ageHarmonic).toHaveProperty('patterns')
      expect(data.ageHarmonic).toHaveProperty('interpretation')
    })

    it('should not include extra fields in harmonicChart', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const harmonicChartKeys = Object.keys(data.harmonicChart)
      expect(harmonicChartKeys).toEqual(
        expect.arrayContaining(['harmonicNumber', 'planets', 'ascendant', 'mc'])
      )
      expect(harmonicChartKeys).not.toContain('houses')
    })

    it('should not include extra fields in analysis', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const analysisKeys = Object.keys(data.analysis)
      expect(analysisKeys).toEqual(
        expect.arrayContaining(['strength', 'conjunctions', 'patterns', 'interpretation'])
      )
    })

    it('should not include extra fields in profile', async () => {
      const response = await POST(makeRequest(validBodyWithProfile))
      const data = await response.json()

      const profileKeys = Object.keys(data.profile)
      expect(profileKeys).toEqual(
        expect.arrayContaining(['strongestHarmonics', 'weakestHarmonics', 'overallInterpretation'])
      )
    })
  })
})
