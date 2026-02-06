/**
 * Comprehensive Unit Tests for /api/calendar/route.ts
 *
 * Tests the Calendar API endpoint for yearly important dates including:
 * - Query parameter validation (birthDate required, format validation)
 * - Saju calculation integration
 * - Astrology calculation with fallback
 * - Category filtering
 * - Grade grouping (0-5)
 * - Location/timezone handling
 * - Redis caching
 * - AI backend integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies before importing route
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = { userId: null, session: null, ip: '127.0.0.1', locale: 'ko' }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      return NextResponse.json(result, { status: 200 })
    }
  }),
  createPublicStreamGuard: vi.fn(() => ({})),
  extractLocale: vi.fn((req: any) => {
    const acceptLang = req.headers?.get?.('accept-language') || ''
    if (acceptLang.includes('ko')) return 'ko'
    if (acceptLang.includes('ja')) return 'ja'
    if (acceptLang.includes('zh')) return 'zh'
    return 'en'
  }),
}))

vi.mock('@/lib/Saju/saju', () => ({
  calculateSajuData: vi.fn(),
}))

vi.mock('@/lib/astrology/foundation/astrologyService', () => ({
  calculateNatalChart: vi.fn(),
}))

vi.mock('@/lib/destiny-map/destinyCalendar', () => ({
  calculateYearlyImportantDates: vi.fn(),
}))

vi.mock('@/lib/cache/redis-cache', () => ({
  cacheOrCalculate: vi.fn((key, fn) => fn()),
  CacheKeys: { yearlyCalendar: vi.fn(() => 'test-cache-key') },
  CACHE_TTL: { CALENDAR_DATA: 86400 },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({ ok: false, data: null }),
  },
}))

vi.mock('@/i18n/locales/ko', () => ({
  default: {
    calendar: {
      good_day: '좋은 날',
      recommendations: { rest: '휴식하세요' },
      warnings: { caution: '주의하세요' },
    },
  },
}))

vi.mock('@/i18n/locales/en', () => ({
  default: {
    calendar: {
      good_day: 'Good day',
      recommendations: { rest: 'Take rest' },
      warnings: { caution: 'Be careful' },
    },
  },
}))

// Import after mocks
import { GET } from '@/app/api/calendar/route'
import { calculateSajuData } from '@/lib/Saju/saju'
import { calculateNatalChart } from '@/lib/astrology/foundation/astrologyService'
import { calculateYearlyImportantDates } from '@/lib/destiny-map/destinyCalendar'
import { cacheOrCalculate } from '@/lib/cache/redis-cache'
import { apiClient } from '@/lib/api/ApiClient'
import { logger } from '@/lib/logger'

// Helper to create mock request
function createRequest(params: Record<string, string | undefined>): NextRequest {
  const url = new URL('http://localhost:3000/api/calendar')
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, value)
    }
  })
  return new NextRequest(url)
}

// Mock Saju result
const mockSajuResult = {
  pillars: {
    year: { heavenlyStem: { name: '甲' }, earthlyBranch: { name: '子' } },
    month: { heavenlyStem: { name: '乙' }, earthlyBranch: { name: '丑' } },
    day: { heavenlyStem: { name: '丙' }, earthlyBranch: { name: '寅' } },
    time: { heavenlyStem: { name: '丁' }, earthlyBranch: { name: '卯' } },
  },
  unse: {
    daeun: [
      { age: 10, heavenlyStem: '戊', earthlyBranch: '辰' },
      { age: 20, heavenlyStem: '己', earthlyBranch: '巳' },
    ],
  },
  daeWoon: { startAge: 3 },
}

// Mock Natal Chart result
const mockNatalChart = {
  planets: [
    { name: 'Sun', sign: 'Aries', longitude: 15.5 },
    { name: 'Moon', sign: 'Cancer', longitude: 120.3 },
  ],
}

// Mock important dates
const mockImportantDates = [
  {
    date: '2025-03-15',
    grade: 0,
    score: 95,
    categories: ['career'],
    titleKey: 'calendar.good_day',
    descKey: 'calendar.good_desc',
    sajuFactorKeys: [],
    astroFactorKeys: [],
    recommendationKeys: [],
    warningKeys: [],
  },
  {
    date: '2025-03-16',
    grade: 1,
    score: 85,
    categories: ['wealth'],
    titleKey: 'calendar.good_day',
    descKey: 'calendar.good_desc',
    sajuFactorKeys: [],
    astroFactorKeys: [],
    recommendationKeys: [],
    warningKeys: [],
  },
  {
    date: '2025-03-17',
    grade: 2,
    score: 70,
    categories: ['love'],
    titleKey: 'calendar.good_day',
    descKey: 'calendar.good_desc',
    sajuFactorKeys: [],
    astroFactorKeys: [],
    recommendationKeys: [],
    warningKeys: [],
  },
  {
    date: '2025-03-18',
    grade: 3,
    score: 50,
    categories: ['health'],
    titleKey: 'calendar.good_day',
    descKey: 'calendar.good_desc',
    sajuFactorKeys: [],
    astroFactorKeys: [],
    recommendationKeys: [],
    warningKeys: [],
  },
  {
    date: '2025-03-19',
    grade: 4,
    score: 30,
    categories: ['travel'],
    titleKey: 'calendar.good_day',
    descKey: 'calendar.good_desc',
    sajuFactorKeys: [],
    astroFactorKeys: [],
    recommendationKeys: [],
    warningKeys: [],
  },
  {
    date: '2025-03-20',
    grade: 5,
    score: 10,
    categories: ['study'],
    titleKey: 'calendar.good_day',
    descKey: 'calendar.good_desc',
    sajuFactorKeys: [],
    astroFactorKeys: [],
    recommendationKeys: [],
    warningKeys: [],
  },
]

describe('Calendar API Route - /api/calendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mocks
    vi.mocked(calculateSajuData).mockReturnValue(mockSajuResult as any)
    vi.mocked(calculateNatalChart).mockResolvedValue(mockNatalChart as any)
    vi.mocked(calculateYearlyImportantDates).mockReturnValue(mockImportantDates as any)
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('Query Parameter Validation', () => {
    it('should return 400 when birthDate is missing', async () => {
      const request = createRequest({})

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBeDefined()
    })

    it('should return 400 when birthDate has invalid format (wrong separator)', async () => {
      const request = createRequest({ birthDate: '1990/01/15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('INVALID_DATE')
    })

    it('should return 400 when birthDate has invalid format (no separators)', async () => {
      const request = createRequest({ birthDate: '19900115' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('INVALID_DATE')
    })

    it('should return 400 when birthDate has invalid date values (month 13)', async () => {
      const request = createRequest({ birthDate: '1990-13-01' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('INVALID_DATE')
    })

    it('should return 400 when birthDate has invalid date values (Feb 30)', async () => {
      const request = createRequest({ birthDate: '1990-02-30' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 400 when birthTime has invalid format', async () => {
      const request = createRequest({ birthDate: '1990-01-15', birthTime: '25:00' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('INVALID_TIME')
    })

    it('should return 422 when year is out of range (too low)', async () => {
      const request = createRequest({ birthDate: '1990-01-15', year: '1800' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when year is out of range (too high)', async () => {
      const request = createRequest({ birthDate: '1990-01-15', year: '2200' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when category is invalid', async () => {
      const request = createRequest({ birthDate: '1990-01-15', category: 'invalid_category' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Successful Responses', () => {
    it('should return success with valid birthDate only', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.type).toBe('yearly')
      expect(data.birthInfo.date).toBe('1990-01-15')
    })

    it('should return success with all optional parameters', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthTime: '14:30',
        birthPlace: 'Tokyo',
        year: '2025',
        gender: 'female',
        locale: 'en',
        category: 'career',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.birthInfo.time).toBe('14:30')
      expect(data.birthInfo.place).toBe('Tokyo')
      expect(data.year).toBe(2025)
    })

    it('should use default values for optional parameters', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.birthInfo.time).toBe('12:00') // default
      expect(data.birthInfo.place).toBe('Seoul') // default
    })

    it('should handle leap year dates correctly', async () => {
      const request = createRequest({ birthDate: '2000-02-29' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Category Filtering', () => {
    it('should filter dates by career category', async () => {
      const request = createRequest({ birthDate: '1990-01-15', category: 'career' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // allDates should only include career category dates
      data.allDates.forEach((date: any) => {
        expect(date.categories).toContain('career')
      })
    })

    it('should filter dates by wealth category', async () => {
      const request = createRequest({ birthDate: '1990-01-15', category: 'wealth' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      data.allDates.forEach((date: any) => {
        expect(date.categories).toContain('wealth')
      })
    })

    it('should filter dates by love category', async () => {
      const request = createRequest({ birthDate: '1990-01-15', category: 'love' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should filter dates by health category', async () => {
      const request = createRequest({ birthDate: '1990-01-15', category: 'health' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should return all dates when no category filter', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allDates.length).toBe(6) // All mock dates
    })
  })

  describe('Date Calculations for Different Years', () => {
    it('should calculate dates for current year by default', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.year).toBe(new Date().getFullYear())
    })

    it('should calculate dates for specified year', async () => {
      const request = createRequest({ birthDate: '1990-01-15', year: '2025' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.year).toBe(2025)
      expect(vi.mocked(calculateYearlyImportantDates)).toHaveBeenCalledWith(
        2025,
        expect.any(Object),
        expect.any(Object),
        expect.any(Object)
      )
    })

    it('should calculate dates for past year', async () => {
      const request = createRequest({ birthDate: '1990-01-15', year: '2020' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.year).toBe(2020)
    })

    it('should calculate dates for future year', async () => {
      const request = createRequest({ birthDate: '1990-01-15', year: '2030' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.year).toBe(2030)
    })
  })

  describe('Grade Grouping', () => {
    it('should return dates grouped by grade (0-5)', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary).toBeDefined()
      expect(data.summary.grade0).toBeDefined()
      expect(data.summary.grade1).toBeDefined()
      expect(data.summary.grade2).toBeDefined()
      expect(data.summary.grade3).toBeDefined()
      expect(data.summary.grade4).toBeDefined()
      expect(data.summary.grade5).toBeDefined()
    })

    it('should count grade 0 dates correctly', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data.summary.grade0).toBe(1) // One grade 0 date in mock
    })

    it('should count grade 5 dates correctly', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data.summary.grade5).toBe(1) // One grade 5 date in mock
    })

    it('should include topDates from grade 0, 1, 2', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data.topDates).toBeDefined()
      expect(Array.isArray(data.topDates)).toBe(true)
    })

    it('should include goodDates from grade 1, 2', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data.goodDates).toBeDefined()
      expect(Array.isArray(data.goodDates)).toBe(true)
    })

    it('should include badDates from grade 4, 5', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data.badDates).toBeDefined()
      expect(Array.isArray(data.badDates)).toBe(true)
    })

    it('should include worstDates from grade 5', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data.worstDates).toBeDefined()
      expect(Array.isArray(data.worstDates)).toBe(true)
    })
  })

  describe('Location/Timezone Handling', () => {
    it('should use Seoul coords when birthPlace is not in LOCATION_COORDS', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthPlace: 'InvalidCity12345',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // The place is passed through, but LOCATION_COORDS falls back to Seoul
      expect(data.birthInfo.place).toBe('InvalidCity12345')
      // Verify saju was called with Seoul timezone (fallback)
      expect(vi.mocked(calculateSajuData)).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        'solar',
        'Asia/Seoul' // Falls back to Seoul timezone
      )
    })

    it('should fallback to Seoul when birthPlace exceeds MAX_PLACE_LEN (64 chars)', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthPlace: 'A'.repeat(70), // Exceeds MAX_PLACE_LEN of 64
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.birthInfo.place).toBe('Seoul')
    })

    it('should return 422 when birthPlace exceeds Zod schema limit (100 chars)', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthPlace: 'A'.repeat(150), // Exceeds Zod .max(100)
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should use valid birthPlace when provided', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthPlace: 'Tokyo',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.birthInfo.place).toBe('Tokyo')
    })

    it('should use New York timezone for New York birthPlace', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthPlace: 'New York',
      })

      await GET(request)

      expect(vi.mocked(calculateSajuData)).toHaveBeenCalledWith(
        '1990-01-15',
        expect.any(String),
        expect.any(String),
        'solar',
        'America/New_York'
      )
    })
  })

  describe('Saju Calculation', () => {
    it('should call calculateSajuData with correct parameters', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthTime: '14:30',
        gender: 'female',
      })

      await GET(request)

      expect(vi.mocked(calculateSajuData)).toHaveBeenCalledWith(
        '1990-01-15',
        '14:30',
        'female',
        'solar',
        'Asia/Seoul'
      )
    })

    it('should return 500 when saju calculation throws error', async () => {
      vi.mocked(calculateSajuData).mockImplementation(() => {
        throw new Error('Saju calculation failed')
      })

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle saju result with missing pillars', async () => {
      vi.mocked(calculateSajuData).mockReturnValue({
        pillars: null,
        unse: { daeun: [] },
        daeWoon: { startAge: 0 },
      } as any)

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should handle saju result with missing daeun', async () => {
      vi.mocked(calculateSajuData).mockReturnValue({
        ...mockSajuResult,
        unse: { daeun: null },
      } as any)

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should use male as default gender', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      await GET(request)

      expect(vi.mocked(calculateSajuData)).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'male',
        'solar',
        expect.any(String)
      )
    })
  })

  describe('Astrology Calculation', () => {
    it('should call calculateNatalChart with correct parameters', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthTime: '14:30',
        birthPlace: 'Tokyo',
      })

      await GET(request)

      expect(vi.mocked(calculateNatalChart)).toHaveBeenCalledWith({
        year: 1990,
        month: 1,
        date: 15,
        hour: 14,
        minute: 30,
        latitude: expect.any(Number),
        longitude: expect.any(Number),
        timeZone: 'Asia/Tokyo',
      })
    })

    it('should fallback to simple calculation when astrology fails', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Astrology failed'))

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(vi.mocked(logger).warn).toHaveBeenCalledWith(
        expect.stringContaining('Astrology calculation fallback'),
        expect.any(Error)
      )
    })

    it('should determine sun sign correctly in fallback mode (Aries - March)', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Astrology failed'))

      const request = createRequest({ birthDate: '1990-03-25' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should determine sun sign correctly in fallback mode (Capricorn - January)', async () => {
      vi.mocked(calculateNatalChart).mockRejectedValue(new Error('Astrology failed'))

      const request = createRequest({ birthDate: '1990-01-05' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should use default hour 12 when birthTime is not provided', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      await GET(request)

      expect(vi.mocked(calculateNatalChart)).toHaveBeenCalledWith(
        expect.objectContaining({
          hour: 12,
          minute: 0,
        })
      )
    })
  })

  describe('Caching', () => {
    it('should use cacheOrCalculate for date calculations', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      await GET(request)

      expect(vi.mocked(cacheOrCalculate)).toHaveBeenCalled()
    })

    it('should generate unique cache key based on parameters', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache')

      const request = createRequest({
        birthDate: '1990-01-15',
        birthTime: '14:30',
        gender: 'female',
        year: '2025',
        category: 'career',
      })

      await GET(request)

      expect(CacheKeys.yearlyCalendar).toHaveBeenCalledWith(
        '1990-01-15',
        '14:30',
        'female',
        2025,
        'career'
      )
    })

    it('should set Cache-Control header for response', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)

      expect(response.headers.get('Cache-Control')).toBe(
        'private, max-age=3600, stale-while-revalidate=1800'
      )
    })
  })

  describe('AI Backend Integration', () => {
    it('should set aiEnhanced to true when AI returns data', async () => {
      vi.mocked(apiClient).post.mockResolvedValueOnce({
        ok: true,
        data: {
          auspicious_dates: ['2025-03-01'],
          caution_dates: ['2025-03-10'],
        },
      } as any)

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.aiEnhanced).toBe(true)
      expect(data.aiInsights).toBeDefined()
    })

    it('should set aiEnhanced to false when AI fails', async () => {
      vi.mocked(apiClient).post.mockRejectedValue(new Error('AI backend unavailable'))

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.aiEnhanced).toBe(false)
    })

    it('should not include aiInsights when AI fails', async () => {
      vi.mocked(apiClient).post.mockResolvedValueOnce({ ok: false, data: null } as any)

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data.aiInsights).toBeUndefined()
    })
  })

  describe('Locale Handling', () => {
    it('should use Korean locale by default', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Response should use Korean translations by default
      expect(data.success).toBe(true)
    })

    it('should use English locale when specified', async () => {
      const request = createRequest({ birthDate: '1990-01-15', locale: 'en' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Response Structure', () => {
    it('should include all required response fields', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('success')
      expect(data).toHaveProperty('type')
      expect(data).toHaveProperty('year')
      expect(data).toHaveProperty('aiEnhanced')
      expect(data).toHaveProperty('birthInfo')
      expect(data).toHaveProperty('summary')
      expect(data).toHaveProperty('topDates')
      expect(data).toHaveProperty('goodDates')
      expect(data).toHaveProperty('badDates')
      expect(data).toHaveProperty('worstDates')
      expect(data).toHaveProperty('allDates')
    })

    it('should include birthInfo with date, time, and place', async () => {
      const request = createRequest({
        birthDate: '1990-01-15',
        birthTime: '14:30',
        birthPlace: 'Tokyo',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.birthInfo.date).toBe('1990-01-15')
      expect(data.birthInfo.time).toBe('14:30')
      expect(data.birthInfo.place).toBe('Tokyo')
    })

    it('should include summary with total and grade counts', async () => {
      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data.summary.total).toBe(6)
      expect(typeof data.summary.grade0).toBe('number')
      expect(typeof data.summary.grade1).toBe('number')
      expect(typeof data.summary.grade2).toBe('number')
      expect(typeof data.summary.grade3).toBe('number')
      expect(typeof data.summary.grade4).toBe('number')
      expect(typeof data.summary.grade5).toBe('number')
    })

    it('should limit topDates to 10 items', async () => {
      // Create 20 grade 0-2 dates
      const manyDates = Array.from({ length: 20 }, (_, i) => ({
        date: `2025-03-${String(i + 1).padStart(2, '0')}`,
        grade: i % 3,
        score: 90 - i,
        categories: ['career'],
        titleKey: 'calendar.good_day',
        descKey: 'calendar.good_desc',
        sajuFactorKeys: [],
        astroFactorKeys: [],
        recommendationKeys: [],
        warningKeys: [],
      }))
      vi.mocked(calculateYearlyImportantDates).mockReturnValue(manyDates as any)

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data.topDates.length).toBeLessThanOrEqual(10)
    })

    it('should limit goodDates to 20 items', async () => {
      // Create 30 grade 1-2 dates
      const manyDates = Array.from({ length: 30 }, (_, i) => ({
        date: `2025-03-${String(i + 1).padStart(2, '0')}`,
        grade: (i % 2) + 1,
        score: 80 - i,
        categories: ['wealth'],
        titleKey: 'calendar.good_day',
        descKey: 'calendar.good_desc',
        sajuFactorKeys: [],
        astroFactorKeys: [],
        recommendationKeys: [],
        warningKeys: [],
      }))
      vi.mocked(calculateYearlyImportantDates).mockReturnValue(manyDates as any)

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(data.goodDates.length).toBeLessThanOrEqual(20)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty date results', async () => {
      vi.mocked(calculateYearlyImportantDates).mockReturnValue([])

      const request = createRequest({ birthDate: '1990-01-15' })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allDates).toEqual([])
      expect(data.summary.total).toBe(0)
    })

    it('should handle birthDate at year boundary (Jan 1)', async () => {
      const request = createRequest({ birthDate: '1990-01-01' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should handle birthDate at year boundary (Dec 31)', async () => {
      const request = createRequest({ birthDate: '1990-12-31' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should handle extreme past year', async () => {
      const request = createRequest({ birthDate: '1990-01-15', year: '1901' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should handle far future year', async () => {
      const request = createRequest({ birthDate: '1990-01-15', year: '2099' })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })
})
