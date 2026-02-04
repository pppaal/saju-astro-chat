import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============ Mocks (must be before route import) ============

// Mock next-auth (not directly used by details route, but may be transitive)
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
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
vi.mock('@/lib/api/zodValidation', () => ({
  astrologyDetailsSchema: {
    safeParse: (...args: any[]) => mockSafeParse(...args),
  },
}))

// Mock astrology calculation
const mockNatalResult = {
  ascendant: { formatted: 'Aries 15\u00b020\u2032' },
  mc: { formatted: 'Capricorn 3\u00b010\u2032' },
  planets: [
    {
      name: 'Sun',
      formatted: 'Leo 22\u00b005\u2032',
      sign: 'Leo',
      degree: 22,
      minute: 5,
      house: 1,
      speed: 1.0,
    },
    {
      name: 'Moon',
      formatted: 'Cancer 10\u00b030\u2032',
      sign: 'Cancer',
      degree: 10,
      minute: 30,
      house: 12,
      speed: 12.5,
    },
  ],
  houses: [{ number: 1, sign: 'Aries', degree: 15 }],
  meta: {
    jdUT: 2451545.0,
    isoUTC: '2000-01-01T12:00:00Z',
    timeZone: 'Asia/Seoul',
    latitude: 37.5665,
    longitude: 126.978,
    houseSystem: 'Placidus' as const,
  },
}

const mockChart = {
  planets: mockNatalResult.planets.map((p) => ({
    ...p,
    retrograde: false,
  })),
  houses: mockNatalResult.houses,
  meta: mockNatalResult.meta,
}

vi.mock('@/lib/astrology', () => ({
  calculateNatalChart: vi.fn(),
  toChart: vi.fn(),
  resolveOptions: vi.fn(),
  findNatalAspectsPlus: vi.fn(),
  buildEngineMeta: vi.fn(),
}))

vi.mock('@/lib/astrology/localization', () => ({
  pickLabels: vi.fn(() => ({
    asc: 'Ascendant',
    mc: 'MC',
    title: 'Natal Chart Summary',
    planetPositions: 'Planet Positions',
    notice: '',
  })),
  normalizeLocale: vi.fn(() => 'en'),
  splitSignAndDegree: vi.fn((text: string) => {
    const parts = String(text || '')
      .trim()
      .match(/^(\S+)\s+(.*)$/)
    if (!parts) return { signPart: text, degreePart: '' }
    return { signPart: parts[1], degreePart: parts[2] }
  }),
  localizeSignLabel: vi.fn((sign: string) => sign),
  localizePlanetLabel: vi.fn((name: string) => name),
  parseHM: vi.fn((input: string) => {
    const [hh, mm] = String(input).split(':').map(Number)
    return { h: hh || 0, m: mm || 0 }
  }),
}))

// ============ Imports (after all mocks) ============

import { POST } from '@/app/api/astrology/details/route'
import { rateLimit } from '@/lib/rateLimit'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { captureServerError } from '@/lib/telemetry'
import {
  calculateNatalChart,
  toChart,
  resolveOptions,
  findNatalAspectsPlus,
  buildEngineMeta,
} from '@/lib/astrology'
import { logger } from '@/lib/logger'

// ============ Helpers ============

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/astrology/details', {
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
  locale: 'en',
}

const mockOpts = {
  includeMinorAspects: false,
  houseSystem: 'Placidus',
}

const mockAspectsPlus = [{ planet1: 'Sun', planet2: 'Moon', aspect: 'trine', orb: 1.5 }]

const mockEngineMeta = {
  jdUT: 2451545.0,
  isoUTC: '2000-01-01T12:00:00Z',
  timeZone: 'Asia/Seoul',
  latitude: 37.5665,
  longitude: 126.978,
  houseSystem: 'Placidus',
  engine: 'swisseph',
}

const defaultRateLimitHeaders = new Headers({
  'X-RateLimit-Limit': '30',
  'X-RateLimit-Remaining': '29',
})

/**
 * Set up all mocks for a successful chart calculation flow.
 */
function setupSuccessfulFlow() {
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    headers: defaultRateLimitHeaders,
  } as any)
  vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
  mockSafeParse.mockReturnValue({ success: true, data: {} })
  vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalResult as any)
  vi.mocked(toChart).mockReturnValue(mockChart as any)
  vi.mocked(resolveOptions).mockReturnValue(mockOpts as any)
  vi.mocked(findNatalAspectsPlus).mockReturnValue(mockAspectsPlus as any)
  vi.mocked(buildEngineMeta).mockReturnValue(mockEngineMeta as any)
}

// ============ Tests ============

describe('Astrology Details API - POST /api/astrology/details', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- Rate Limiting ----
  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        headers: new Headers({ 'Retry-After': '60' }),
      } as any)

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
      } as any)

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
      } as any)
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
      } as any)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
    })

    it('should return 400 when Zod validation fails', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['birthDate'], message: 'Required' }],
        },
      })

      const response = await POST(makeRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toEqual([{ path: 'birthDate', message: 'Required' }])
    })

    it('should return 400 with multiple validation errors', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['birthDate'], message: 'Required' },
            { path: ['latitude'], message: 'Must be between -90 and 90' },
            { path: ['longitude'], message: 'Must be between -180 and 180' },
          ],
        },
      })

      const response = await POST(makeRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toHaveLength(3)
    })

    it('should pass body fields to Zod schema in expected shape', async () => {
      setupSuccessfulFlow()

      await POST(makeRequest(validBody))

      expect(mockSafeParse).toHaveBeenCalledWith({
        birthDate: '1990-05-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
        locale: 'en',
      })
    })

    it('should return 400 for invalid date components (non-YYYY-MM-DD)', async () => {
      mockSafeParse.mockReturnValue({ success: true, data: {} })

      const response = await POST(makeRequest({ ...validBody, date: 'not-a-date' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('date must be YYYY-MM-DD.')
    })

    it('should return 400 for empty date string', async () => {
      mockSafeParse.mockReturnValue({ success: true, data: {} })

      const response = await POST(makeRequest({ ...validBody, date: '' }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('date must be YYYY-MM-DD.')
    })

    it('should return error for invalid date/time/timezone combination', async () => {
      mockSafeParse.mockReturnValue({ success: true, data: {} })

      // dayjs.tz throws for completely invalid timezone strings;
      // the try/catch in the route catches this and returns 500
      const response = await POST(
        makeRequest({
          ...validBody,
          date: '9999-99-99',
          time: '99:99',
          timeZone: 'Invalid/Zone',
        })
      )

      // Depending on dayjs behavior: either 400 (isValid check) or 500 (thrown error caught)
      expect([400, 500]).toContain(response.status)
    })

    it('should log validation warnings', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['birthDate'], message: 'Required' }],
        },
      })

      await POST(makeRequest({}))

      expect(logger.warn).toHaveBeenCalledWith(
        '[Astrology details] validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  // ---- Successful Chart Calculation ----
  describe('Successful Chart Calculation', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return 200 with full chart data', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chartData).toEqual(mockNatalResult)
      expect(data.chartMeta).toEqual(mockEngineMeta)
      expect(data.aspects).toEqual(mockAspectsPlus)
      expect(data.interpretation).toBeDefined()
      expect(data.advanced).toBeDefined()
    })

    it('should call calculateNatalChart with parsed parameters', async () => {
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

    it('should return interpretation string containing labels', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.interpretation).toContain('Natal Chart Summary')
      expect(data.interpretation).toContain('Ascendant')
      expect(data.interpretation).toContain('MC')
      expect(data.interpretation).toContain('Planet Positions')
    })

    it('should return advanced object with options, meta, houses, points, aspectsPlus', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advanced.options).toEqual(mockOpts)
      expect(data.advanced.meta).toEqual(mockEngineMeta)
      expect(data.advanced.aspectsPlus).toEqual(mockAspectsPlus)
      expect(data.advanced.houses).toBeDefined()
      expect(data.advanced.points).toBeDefined()
    })

    it('should construct points array with correct shape', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const sun = data.advanced.points.find((p: any) => p.name === 'Sun')
      expect(sun).toEqual(
        expect.objectContaining({
          key: 'Sun',
          name: 'Sun',
          sign: 'Leo',
          degree: 22,
          minute: 5,
          house: 1,
          speed: 1.0,
          rx: false,
        })
      )
    })

    it('should set rx to true for planets with negative speed', async () => {
      const retrogradeNatal = {
        ...mockNatalResult,
        planets: [
          {
            name: 'Mercury',
            formatted: 'Virgo 5\u00b010\u2032',
            sign: 'Virgo',
            degree: 5,
            minute: 10,
            house: 3,
            speed: -0.5,
          },
        ],
      }
      vi.mocked(calculateNatalChart).mockResolvedValue(retrogradeNatal as any)
      vi.mocked(toChart).mockReturnValue({
        planets: retrogradeNatal.planets,
        houses: mockNatalResult.houses,
        meta: mockNatalResult.meta,
      } as any)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const mercury = data.advanced.points.find((p: any) => p.name === 'Mercury')
      expect(mercury.rx).toBe(true)
    })

    it('should set rx to false for planets with positive speed', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const sun = data.advanced.points.find((p: any) => p.name === 'Sun')
      expect(sun.rx).toBe(false)
    })

    it('should include rate limit headers in successful response', async () => {
      const response = await POST(makeRequest(validBody))

      // The route sets limit.headers on the response
      expect(response.status).toBe(200)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('30')
    })

    it('should call resolveOptions with body.options', async () => {
      const bodyWithOptions = { ...validBody, options: { houseSystem: 'Koch' } }

      await POST(makeRequest(bodyWithOptions))

      expect(resolveOptions).toHaveBeenCalledWith({ houseSystem: 'Koch' })
    })
  })

  // ---- Chart Meta Fallback ----
  describe('Chart Meta Handling', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should use chart.meta when available', async () => {
      await POST(makeRequest(validBody))

      expect(buildEngineMeta).toHaveBeenCalledWith(mockNatalResult.meta, mockOpts)
    })

    it('should use default meta when chart.meta is missing', async () => {
      vi.mocked(toChart).mockReturnValue({
        ...mockChart,
        meta: undefined,
      } as any)

      await POST(makeRequest(validBody))

      expect(buildEngineMeta).toHaveBeenCalledWith(
        expect.objectContaining({
          jdUT: 0,
          isoUTC: '',
          timeZone: 'Asia/Seoul',
          latitude: 37.5665,
          longitude: 126.978,
          houseSystem: 'Placidus',
        }),
        mockOpts
      )
    })
  })

  // ---- Houses Fallback ----
  describe('Houses Fallback', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should use chart.houses when available', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advanced.houses).toEqual(mockNatalResult.houses)
    })

    it('should fall back to natal.houses when chart.houses is missing', async () => {
      vi.mocked(toChart).mockReturnValue({
        planets: mockChart.planets,
        houses: undefined,
        meta: mockNatalResult.meta,
      } as any)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      // Should fall back to natal.houses
      expect(data.advanced.houses).toEqual(mockNatalResult.houses)
    })

    it('should use empty array when neither chart nor natal have houses', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue({
        ...mockNatalResult,
        houses: undefined,
      } as any)
      vi.mocked(toChart).mockReturnValue({
        planets: mockChart.planets,
        houses: undefined,
        meta: mockNatalResult.meta,
      } as any)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advanced.houses).toEqual([])
    })
  })

  // ---- Points Fallback ----
  describe('Points Fallback', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should use chart.planets for points when available', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advanced.points).toHaveLength(2)
    })

    it('should fall back to natal.planets when chart.planets is missing', async () => {
      vi.mocked(toChart).mockReturnValue({
        planets: undefined,
        houses: mockNatalResult.houses,
        meta: mockNatalResult.meta,
      } as any)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advanced.points).toHaveLength(2)
    })

    it('should return empty points when neither has planets', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue({
        ...mockNatalResult,
        planets: undefined,
      } as any)
      vi.mocked(toChart).mockReturnValue({
        planets: undefined,
        houses: mockNatalResult.houses,
        meta: mockNatalResult.meta,
      } as any)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.advanced.points).toEqual([])
    })
  })

  // ---- Error Handling ----
  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        headers: defaultRateLimitHeaders,
      } as any)
      vi.mocked(requirePublicToken).mockReturnValue({ valid: true })
      mockSafeParse.mockReturnValue({ success: true, data: {} })
    })

    it('should return 500 when calculateNatalChart throws', async () => {
      vi.mocked(resolveOptions).mockReturnValue(mockOpts as any)
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Ephemeris engine error'))

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(captureServerError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ route: '/api/astrology/details' })
      )
    })

    it('should return 500 when toChart throws', async () => {
      vi.mocked(resolveOptions).mockReturnValue(mockOpts as any)
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalResult as any)
      vi.mocked(toChart).mockImplementation(() => {
        throw new Error('Chart conversion failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should return 500 when findNatalAspectsPlus throws', async () => {
      vi.mocked(resolveOptions).mockReturnValue(mockOpts as any)
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalResult as any)
      vi.mocked(toChart).mockReturnValue(mockChart as any)
      vi.mocked(findNatalAspectsPlus).mockImplementation(() => {
        throw new Error('Aspect calculation failed')
      })

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should return 500 when request.json() throws (malformed body)', async () => {
      const badRequest = new Request('http://localhost/api/astrology/details', {
        method: 'POST',
        body: 'not-json{{',
        headers: { 'content-type': 'application/json' },
      })

      const response = await POST(badRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should capture server errors via telemetry', async () => {
      vi.mocked(resolveOptions).mockReturnValue(mockOpts as any)
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Something broke'))

      await POST(makeRequest(validBody))

      expect(captureServerError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Something broke' }),
        { route: '/api/astrology/details' }
      )
    })
  })

  // ---- Edge Cases ----
  describe('Edge Cases', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should handle missing locale gracefully', async () => {
      const bodyNoLocale = { ...validBody }
      delete (bodyNoLocale as any).locale

      const response = await POST(makeRequest(bodyNoLocale))

      expect(response.status).toBe(200)
    })

    it('should handle missing options by passing undefined to resolveOptions', async () => {
      const bodyNoOptions = { ...validBody }
      delete (bodyNoOptions as any).options

      await POST(makeRequest(bodyNoOptions))

      expect(resolveOptions).toHaveBeenCalledWith(undefined)
    })

    it('should handle missing time field', async () => {
      const bodyNoTime = { ...validBody }
      delete (bodyNoTime as any).time

      const response = await POST(makeRequest(bodyNoTime))

      // parseHM('undefined') should still return { h: 0, m: 0 }
      expect(response.status).toBe(200)
    })

    it('should handle missing timeZone field', async () => {
      const bodyNoTz = { ...validBody }
      delete (bodyNoTz as any).timeZone

      const response = await POST(makeRequest(bodyNoTz))

      // timeZone becomes undefined, dayjs.tz might still work or produce invalid
      // The handler should still not throw -- caught by try/catch
      expect([200, 400, 500]).toContain(response.status)
    })

    it('should handle natal.ascendant with missing formatted field', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue({
        ...mockNatalResult,
        ascendant: { formatted: undefined },
        mc: { formatted: undefined },
      } as any)

      const response = await POST(makeRequest(validBody))

      // Should not crash; code uses String(natal.ascendant?.formatted || '')
      expect(response.status).toBe(200)
    })

    it('should handle empty planets array', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue({
        ...mockNatalResult,
        planets: [],
      } as any)
      vi.mocked(toChart).mockReturnValue({
        planets: [],
        houses: mockNatalResult.houses,
        meta: mockNatalResult.meta,
      } as any)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.advanced.points).toEqual([])
    })

    it('should handle planets with non-numeric speed (rx defaults to false)', async () => {
      vi.mocked(toChart).mockReturnValue({
        planets: [
          {
            name: 'Pluto',
            formatted: 'Scorpio 15\u00b000\u2032',
            sign: 'Scorpio',
            degree: 15,
            minute: 0,
            house: 8,
            speed: undefined,
          },
        ],
        houses: mockNatalResult.houses,
        meta: mockNatalResult.meta,
      } as any)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const pluto = data.advanced.points.find((p: any) => p.name === 'Pluto')
      // typeof undefined !== 'number', so rx = false
      expect(pluto.rx).toBe(false)
    })

    it('should pass body.date and body.time to Zod as birthDate and birthTime', async () => {
      const body = {
        date: '2000-01-01',
        time: '12:00',
        latitude: 0,
        longitude: 0,
        timeZone: 'UTC',
        locale: 'ko',
      }

      await POST(makeRequest(body))

      expect(mockSafeParse).toHaveBeenCalledWith(
        expect.objectContaining({
          birthDate: '2000-01-01',
          birthTime: '12:00',
          latitude: 0,
          longitude: 0,
          timezone: 'UTC',
          locale: 'ko',
        })
      )
    })

    it('should handle concurrent requests without state leaking', async () => {
      const requests = Array.from({ length: 3 }, (_, i) =>
        makeRequest({ ...validBody, date: `1990-05-${15 + i}` })
      )

      const responses = await Promise.all(requests.map((r) => POST(r)))

      responses.forEach((r) => {
        expect(r.status).toBe(200)
      })
      expect(calculateNatalChart).toHaveBeenCalledTimes(3)
    })
  })

  // ---- Localization ----
  describe('Localization', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should pass locale to pickLabels and normalizeLocale', async () => {
      const { pickLabels, normalizeLocale } = await import('@/lib/astrology/localization')

      await POST(makeRequest({ ...validBody, locale: 'ko' }))

      expect(pickLabels).toHaveBeenCalledWith('ko')
      expect(normalizeLocale).toHaveBeenCalledWith('ko')
    })

    it('should localize planet names using localizePlanetLabel', async () => {
      const { localizePlanetLabel } = await import('@/lib/astrology/localization')

      await POST(makeRequest(validBody))

      expect(localizePlanetLabel).toHaveBeenCalledWith('Sun', 'en')
      expect(localizePlanetLabel).toHaveBeenCalledWith('Moon', 'en')
    })

    it('should localize sign labels using localizeSignLabel', async () => {
      const { localizeSignLabel } = await import('@/lib/astrology/localization')

      await POST(makeRequest(validBody))

      // Called for ascendant, MC, and each planet
      expect(localizeSignLabel).toHaveBeenCalled()
    })
  })
})
