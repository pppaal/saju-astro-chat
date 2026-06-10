import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ============ Mocks (must be before route import) ============

// Mock middleware as passthrough
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      const { getServerSession } = await import('@/lib/auth/session')
      let session: any = null
      try {
        session = await (getServerSession as any)()
      } catch {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } },
          { status: 500 }
        )
      }

      // Astrology route uses createAstrologyGuard which requires token but not auth.
      // Session may be null for unauthenticated users; the route still works.
      const context = {
        userId: session?.user?.id ?? null,
        session,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: !!session?.user,
        isPremium: false,
      }

      try {
        const result = await handler(req, context, ...args)

        if (result instanceof Response) {
          return result
        }

        if (result.error) {
          const statusMap: Record<string, number> = {
            BAD_REQUEST: 400,
            VALIDATION_ERROR: 422,
            INTERNAL_ERROR: 500,
          }
          return NextResponse.json(
            {
              success: false,
              error: {
                code: result.error.code,
                message: result.error.message,
                details: result.error.details,
              },
            },
            { status: statusMap[result.error.code] || 500 }
          )
        }

        return NextResponse.json(
          { success: true, data: result.data },
          { status: result.status || 200 }
        )
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INTERNAL_ERROR', message: err.message || 'Internal Server Error' },
          },
          { status: 500 }
        )
      }
    }
  }),
  createAstrologyGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any, options?: any) => ({
    data,
    status: options?.status,
    meta: options?.meta,
  })),
  apiError: vi.fn((code: string, message?: string, details?: any) => ({
    error: { code, message, details },
  })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
  },
}))

// Mock next-auth
vi.mock('@/lib/auth/session', () => ({
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

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reading: {
      create: vi.fn(),
    },
  },
}))

// Mock cache — the route now uses cacheOrCalculate for the natal chart and
// builds the interpretation locally (no AI backend / askClaude anymore).
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheOrCalculate: vi.fn(async (_key: string, fn: () => Promise<unknown>) => fn()),
  CacheKeys: {
    natalChart: vi.fn(
      (date: string, time: string, lat: number, lon: number) =>
        `natal:${date}:${time}:${lat}:${lon}`
    ),
  },
  CACHE_TTL: {
    NATAL_CHART: 60 * 60 * 24 * 30,
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

// Mock Zod validation
vi.mock('@/lib/api/zodValidation', () => ({
  validateRequestBody: vi.fn(),
  astrologyRequestSchema: {},
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

// ============ Imports (after all mocks) ============

import { POST } from '@/app/api/astrology/route'
import { getServerSession } from '@/lib/auth/session'
import {
  calculateNatalChart,
  toChart,
  resolveOptions,
  findNatalAspectsPlus,
  buildEngineMeta,
} from '@/lib/astrology'
import { validateRequestBody } from '@/lib/api/zodValidation'

// ============ Helpers ============

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/astrology', {
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

/**
 * Set up mocks for a successful natal chart calculation flow.
 */
function setupSuccessfulCalculation() {
  vi.mocked(validateRequestBody).mockResolvedValue({
    success: true as const,
    data: { ...validBody, latitude: 37.5665, longitude: 126.978 },
  })
  vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalResult as any)
  vi.mocked(toChart).mockReturnValue(mockChart as any)
  vi.mocked(resolveOptions).mockReturnValue(mockOpts as any)
  vi.mocked(findNatalAspectsPlus).mockReturnValue(mockAspectsPlus as any)
  vi.mocked(buildEngineMeta).mockReturnValue(mockEngineMeta as any)
}

// ============ Tests ============

describe('Astrology API - POST /api/astrology', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- Authentication ----
  describe('Authentication', () => {
    it('should work for unauthenticated users (no session)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      setupSuccessfulCalculation()

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.chartData).toBeDefined()
    })

    it('should work for authenticated users', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
        expires: '2099-12-31',
      }
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupSuccessfulCalculation()

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 500 when getServerSession throws', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('session error'))

      const response = await POST(makeRequest(validBody))

      expect(response.status).toBe(500)
    })
  })

  // ---- Input Validation ----
  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(null)
    })

    it('should return validation error when body validation fails', async () => {
      vi.mocked(validateRequestBody).mockResolvedValue({
        success: false as const,
        errors: [{ path: 'date', message: 'Required' }],
      })

      const response = await POST(makeRequest({}))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('date')
    })

    it('should return validation error for multiple invalid fields', async () => {
      vi.mocked(validateRequestBody).mockResolvedValue({
        success: false as const,
        errors: [
          { path: 'date', message: 'Required' },
          { path: 'latitude', message: 'Must be a number' },
        ],
      })

      const response = await POST(makeRequest({}))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.message).toContain('date')
      expect(data.error.message).toContain('latitude')
    })

    it('should return validation error for invalid date components', async () => {
      vi.mocked(validateRequestBody).mockResolvedValue({
        success: true as const,
        data: { ...validBody, date: 'invalid', latitude: 37.5, longitude: 126.9 },
      })
      // date splitting will produce NaN
      const response = await POST(makeRequest({ ...validBody, date: 'invalid' }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return error for invalid date/time/timezone combination', async () => {
      // dayjs.tz throws for completely invalid timezone strings; middleware catches this
      vi.mocked(validateRequestBody).mockResolvedValue({
        success: true as const,
        data: {
          ...validBody,
          date: '9999-99-99',
          time: '99:99',
          timeZone: 'Invalid/Zone',
          latitude: 37.5,
          longitude: 126.9,
        },
      })

      const response = await POST(makeRequest({ ...validBody, date: '9999-99-99' }))

      // Either returns validation error (422) or caught by middleware (500)
      expect([422, 500]).toContain(response.status)
    })
  })

  // ---- Successful Operations ----
  describe('Successful Chart Calculation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      setupSuccessfulCalculation()
    })

    it('should calculate natal chart and return full response', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.chartData).toEqual(mockNatalResult)
      expect(data.data.chartMeta).toEqual(mockEngineMeta)
      expect(data.data.aspects).toEqual(mockAspectsPlus)
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

    it('should call resolveOptions with body options', async () => {
      const bodyWithOptions = { ...validBody, options: { houseSystem: 'Koch' } }
      vi.mocked(validateRequestBody).mockResolvedValue({
        success: true as const,
        data: { ...bodyWithOptions, latitude: 37.5665, longitude: 126.978 },
      })

      await POST(makeRequest(bodyWithOptions))

      expect(resolveOptions).toHaveBeenCalledWith({ houseSystem: 'Koch' })
    })

    it('should return advanced data with houses, points, and aspectsPlus', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.data.advanced).toBeDefined()
      expect(data.data.advanced.options).toEqual(mockOpts)
      expect(data.data.advanced.meta).toEqual(mockEngineMeta)
      expect(data.data.advanced.aspectsPlus).toEqual(mockAspectsPlus)
      expect(data.data.advanced.houses).toBeDefined()
      expect(data.data.advanced.points).toBeDefined()
    })

    it('should include debug info in response', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(data.data.debug).toBeDefined()
      expect(data.data.debug.locale).toBe('en')
      expect(data.data.debug.opts).toEqual(mockOpts)
    })

    it('should compute rx flag from planet speed', async () => {
      // Planet with negative speed should have rx = true
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
        ...mockChart,
        planets: retrogradeNatal.planets.map((p) => ({ ...p, retrograde: false })),
      } as any)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      const mercury = data.data.advanced.points.find((p: any) => p.name === 'Mercury')
      expect(mercury.rx).toBe(true)
    })
  })

  // The route builds its interpretation locally now; verify the computed value.
  describe('Local Interpretation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      setupSuccessfulCalculation()
    })

    it('should return a locally computed interpretation', async () => {
      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.interpretation).toContain('Natal Chart Summary')
      expect(data.data.interpretation).toContain('Ascendant:')
      expect(data.data.interpretation).toContain('MC:')
    })
  })

  // ---- Error Handling ----
  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(null)
    })

    it('should handle calculateNatalChart throwing an error', async () => {
      vi.mocked(validateRequestBody).mockResolvedValue({
        success: true as const,
        data: { ...validBody, latitude: 37.5665, longitude: 126.978 },
      })
      vi.mocked(resolveOptions).mockReturnValue(mockOpts as any)
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Ephemeris calculation failed'))

      const response = await POST(makeRequest(validBody))

      // The middleware catch block returns 500
      expect(response.status).toBe(500)
    })

    it('should handle toChart throwing an error', async () => {
      vi.mocked(validateRequestBody).mockResolvedValue({
        success: true as const,
        data: { ...validBody, latitude: 37.5665, longitude: 126.978 },
      })
      vi.mocked(resolveOptions).mockReturnValue(mockOpts as any)
      vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalResult as any)
      vi.mocked(toChart).mockImplementation(() => {
        throw new Error('Chart conversion error')
      })

      const response = await POST(makeRequest(validBody))

      expect(response.status).toBe(500)
    })
  })

  // ---- Edge Cases ----
  describe('Edge Cases', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      setupSuccessfulCalculation()
    })

    it('should handle missing locale by defaulting', async () => {
      const bodyNoLocale = { ...validBody }
      delete (bodyNoLocale as any).locale

      vi.mocked(validateRequestBody).mockResolvedValue({
        success: true as const,
        data: { ...bodyNoLocale, latitude: 37.5665, longitude: 126.978 },
      })

      const response = await POST(makeRequest(bodyNoLocale))

      expect(response.status).toBe(200)
    })

    it('should handle missing options by passing undefined to resolveOptions', async () => {
      const bodyNoOptions = { ...validBody }

      vi.mocked(validateRequestBody).mockResolvedValue({
        success: true as const,
        data: { ...bodyNoOptions, latitude: 37.5665, longitude: 126.978 },
      })

      await POST(makeRequest(bodyNoOptions))

      expect(resolveOptions).toHaveBeenCalledWith(undefined)
    })

    it('should handle natal result with empty planets array', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue({
        ...mockNatalResult,
        planets: [],
      } as any)
      vi.mocked(toChart).mockReturnValue({
        planets: [],
        houses: [],
        meta: mockNatalResult.meta,
      } as any)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.advanced.points).toEqual([])
    })

    it('should handle natal result without meta', async () => {
      vi.mocked(calculateNatalChart).mockResolvedValue({
        ...mockNatalResult,
        meta: undefined,
      } as any)
      vi.mocked(toChart).mockReturnValue({
        ...mockChart,
        meta: undefined,
      } as any)

      const response = await POST(makeRequest(validBody))

      // Should still succeed using defaultMeta fallback
      expect(response.status).toBe(200)
      expect(buildEngineMeta).toHaveBeenCalledWith(
        expect.objectContaining({ jdUT: 0, isoUTC: '', houseSystem: 'Placidus' }),
        expect.anything()
      )
    })

    it('should handle chart without houses', async () => {
      vi.mocked(toChart).mockReturnValue({
        planets: mockChart.planets,
        houses: undefined,
        meta: mockNatalResult.meta,
      } as any)

      const response = await POST(makeRequest(validBody))
      const data = await response.json()

      expect(response.status).toBe(200)
      // houses should fall back to empty array via `chart.houses || []`
      expect(data.data.advanced.houses).toEqual([])
    })
  })
})
