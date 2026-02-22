import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mock middleware as passthrough - must be before route import
// ---------------------------------------------------------------------------
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      const { getServerSession } = await import('next-auth')
      let session: any = null
      try {
        session = await (getServerSession as any)()
      } catch {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } },
          { status: 500 }
        )
      }

      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'not_authenticated' } },
          { status: 401 }
        )
      }

      const context = {
        userId: session.user.id,
        session,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }

      const result = await handler(req, context, ...args)

      if (result instanceof Response) {
        return result
      }

      if (result.error) {
        const statusMap: Record<string, number> = {
          BAD_REQUEST: 400,
          VALIDATION_ERROR: 422,
          INTERNAL_ERROR: 500,
          DATABASE_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: { code: result.error.code, message: result.error.message } },
          { status: statusMap[result.error.code] || 500 }
        )
      }

      return NextResponse.json(
        { success: true, data: result.data },
        { status: result.status || 200 }
      )
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
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
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}))

// ---------------------------------------------------------------------------
// Mock next-auth
// ---------------------------------------------------------------------------
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Mock Redis cache
// ---------------------------------------------------------------------------
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock Prisma - every model/method the route touches
// ---------------------------------------------------------------------------
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reading: { findMany: vi.fn() },
    tarotReading: { findMany: vi.fn() },
    consultationHistory: { findMany: vi.fn() },
    userInteraction: { findMany: vi.fn() },
    dailyFortune: { findMany: vi.fn() },
    savedCalendarDate: { findMany: vi.fn() },
    iCPResult: { findMany: vi.fn() },
    compatibilityResult: { findMany: vi.fn() },
    destinyMatrixReport: { findMany: vi.fn() },
    personalityResult: { findMany: vi.fn() },
  },
}))

// ---------------------------------------------------------------------------
// Mock Zod validation schema – mirrors the real paginationQuerySchema + type
// ---------------------------------------------------------------------------
vi.mock('@/lib/api/zodValidation', () => ({
  meHistoryQuerySchema: {
    safeParse: vi.fn((data: any) => {
      const result: any = {}

      // Validate limit
      if (data.limit !== undefined) {
        const num = Number(data.limit)
        if (isNaN(num) || !Number.isInteger(num) || num < 1 || num > 100) {
          return {
            success: false,
            error: { issues: [{ message: 'limit must be between 1 and 100' }] },
          }
        }
        result.limit = num
      } else {
        result.limit = 20 // default
      }

      // Validate offset
      if (data.offset !== undefined) {
        const num = Number(data.offset)
        if (isNaN(num) || !Number.isInteger(num) || num < 0) {
          return {
            success: false,
            error: { issues: [{ message: 'offset must be >= 0' }] },
          }
        }
        result.offset = num
      } else {
        result.offset = 0 // default
      }

      // Validate type (service filter)
      if (data.type !== undefined) {
        if (typeof data.type !== 'string' || data.type.length > 50) {
          return {
            success: false,
            error: { issues: [{ message: 'Invalid type' }] },
          }
        }
        result.type = data.type
      }

      return { success: true, data: result }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------
import { GET } from '@/app/api/me/history/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockSession = {
  user: { id: 'user-123', email: 'test@example.com' },
  expires: '2025-12-31',
}

/** Shorthand to build a NextRequest for the history endpoint. */
function makeRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/me/history')
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url, { method: 'GET' })
}

/** Create a Date-like object whose toISOString returns a fixed date string. */
function fakeDate(dateStr: string): Date {
  return {
    toISOString: () => `${dateStr}T00:00:00.000Z`,
  } as unknown as Date
}

/** Set every prisma model to return empty arrays (happy-path baseline). */
function mockAllPrismaEmpty() {
  vi.mocked(prisma.reading.findMany).mockResolvedValue([])
  vi.mocked(prisma.tarotReading.findMany).mockResolvedValue([])
  vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
  vi.mocked(prisma.userInteraction.findMany).mockResolvedValue([])
  vi.mocked(prisma.dailyFortune.findMany).mockResolvedValue([])
  vi.mocked(prisma.savedCalendarDate.findMany).mockResolvedValue([])
  vi.mocked(prisma.iCPResult.findMany).mockResolvedValue([])
  vi.mocked(prisma.compatibilityResult.findMany).mockResolvedValue([])
  vi.mocked(prisma.destinyMatrixReport.findMany).mockResolvedValue([])
  vi.mocked(prisma.personalityResult.findMany).mockResolvedValue([])
}

// ===========================================================================
// Tests
// ===========================================================================
describe('History API – GET /api/me/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(cacheGet).mockResolvedValue(null)
    vi.mocked(cacheSet).mockResolvedValue(undefined as any)
  })

  // -----------------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------------
  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 500 when getServerSession throws', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('session boom'))

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------
  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should accept request with no query params (defaults limit=20, offset=0)', async () => {
      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pagination.limit).toBe(20)
      expect(data.data.pagination.offset).toBe(0)
    })

    it('should accept valid limit and offset', async () => {
      const response = await GET(makeRequest({ limit: '10', offset: '5' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pagination.limit).toBe(10)
      expect(data.data.pagination.offset).toBe(5)
    })

    it('should reject limit out of range (> 100)', async () => {
      const response = await GET(makeRequest({ limit: '200' }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject limit of 0', async () => {
      const response = await GET(makeRequest({ limit: '0' }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject negative offset', async () => {
      const response = await GET(makeRequest({ offset: '-1' }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject non-numeric limit', async () => {
      const response = await GET(makeRequest({ limit: 'abc' }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should accept a valid service filter', async () => {
      const response = await GET(makeRequest({ service: 'tarot' }))
      const data = await response.json()

      expect(response.status).toBe(200)
    })
  })

  // -----------------------------------------------------------------------
  // Cache behaviour
  // -----------------------------------------------------------------------
  describe('Caching', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should return cached data on cache hit and skip DB queries', async () => {
      const cachedHistory = [
        {
          date: '2025-06-01',
          records: [{ id: 'r1', date: '2025-06-01', service: 'tarot', type: 'tarot-reading' }],
        },
      ]
      vi.mocked(cacheGet).mockResolvedValue(cachedHistory as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.history).toEqual(cachedHistory)
      // DB should NOT have been called
      expect(prisma.reading.findMany).not.toHaveBeenCalled()
      expect(prisma.tarotReading.findMany).not.toHaveBeenCalled()
    })

    it('should query DB when cache misses', async () => {
      vi.mocked(cacheGet).mockResolvedValue(null)

      const response = await GET(makeRequest())

      expect(response.status).toBe(200)
      expect(prisma.reading.findMany).toHaveBeenCalled()
      expect(prisma.tarotReading.findMany).toHaveBeenCalled()
      expect(prisma.consultationHistory.findMany).toHaveBeenCalled()
    })

    it('should write result to cache after DB fetch', async () => {
      vi.mocked(cacheGet).mockResolvedValue(null)

      await GET(makeRequest())

      expect(cacheSet).toHaveBeenCalledWith(
        expect.stringContaining('user:user-123:history:'),
        expect.any(Array),
        300
      )
    })

    it('should still succeed when cache read fails', async () => {
      vi.mocked(cacheGet).mockRejectedValue(new Error('Redis down'))

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(logger.warn).toHaveBeenCalledWith('[History] Cache read failed:', expect.any(Error))
    })

    it('should still succeed when cache write fails', async () => {
      vi.mocked(cacheGet).mockResolvedValue(null)
      vi.mocked(cacheSet).mockRejectedValue(new Error('Redis write fail'))

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(logger.warn).toHaveBeenCalledWith('[History] Cache write failed:', expect.any(Error))
    })

    it('should include service filter in cache key', async () => {
      vi.mocked(cacheGet).mockResolvedValue(null)

      await GET(makeRequest({ service: 'tarot' }))

      expect(cacheGet).toHaveBeenCalledWith(expect.stringContaining(':tarot'))
    })

    it('should use "all" in cache key when no service filter', async () => {
      vi.mocked(cacheGet).mockResolvedValue(null)

      await GET(makeRequest())

      expect(cacheGet).toHaveBeenCalledWith(expect.stringContaining(':all'))
    })
  })

  // -----------------------------------------------------------------------
  // Empty results
  // -----------------------------------------------------------------------
  describe('Empty Results', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should return empty history when user has no records', async () => {
      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.history).toEqual([])
      expect(data.data.pagination.count).toBe(0)
      expect(data.data.pagination.totalRecords).toBe(0)
      expect(data.data.pagination.hasMore).toBe(false)
    })
  })

  // -----------------------------------------------------------------------
  // Record mapping - each Prisma model
  // -----------------------------------------------------------------------
  describe('Record Mapping – Readings', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should map reading records correctly', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'read-1', createdAt: fakeDate('2025-06-15'), type: 'astrology', title: 'My reading' },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      const record = data.data.history[0].records[0]
      expect(record.id).toBe('read-1')
      expect(record.date).toBe('2025-06-15')
      expect(record.service).toBe('astrology')
      expect(record.summary).toBe('My reading')
      expect(record.type).toBe('reading')
    })

    it('should handle reading with no title', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'read-2', createdAt: fakeDate('2025-06-15'), type: 'saju', title: null },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.summary).toBeUndefined()
    })
  })

  describe('Record Mapping – Tarot Readings', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should map tarot reading with question', async () => {
      vi.mocked(prisma.tarotReading.findMany).mockResolvedValue([
        {
          id: 'tarot-1',
          createdAt: fakeDate('2025-06-10'),
          question: 'Will I get the job?',
          theme: 'career',
          spreadTitle: null,
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.id).toBe('tarot-1')
      expect(record.service).toBe('tarot')
      expect(record.theme).toBe('career')
      expect(record.summary).toBe('Will I get the job?')
      expect(record.type).toBe('tarot-reading')
    })

    it('should fall back to spreadTitle when question is null', async () => {
      vi.mocked(prisma.tarotReading.findMany).mockResolvedValue([
        {
          id: 'tarot-2',
          createdAt: fakeDate('2025-06-10'),
          question: null,
          theme: null,
          spreadTitle: 'Celtic Cross',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.summary).toBe('Celtic Cross')
    })

    it('should default summary when both question and spreadTitle are null', async () => {
      vi.mocked(prisma.tarotReading.findMany).mockResolvedValue([
        {
          id: 'tarot-3',
          createdAt: fakeDate('2025-06-10'),
          question: null,
          theme: null,
          spreadTitle: null,
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.summary).toBe('타로 리딩')
    })
  })

  describe('Record Mapping – Consultations', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should map dream consultation correctly', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        { id: 'con-1', createdAt: fakeDate('2025-06-08'), theme: 'dream', summary: 'Flying dream' },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('dream')
      expect(record.theme).toBeUndefined()
      expect(record.summary).toBe('Flying dream')
      expect(record.type).toBe('consultation')
    })

    it('should default dream summary when null', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        { id: 'con-1b', createdAt: fakeDate('2025-06-08'), theme: 'dream', summary: null },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.summary).toBe('꿈 해석')
    })

    it('should map life-prediction consultation', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        {
          id: 'con-2',
          createdAt: fakeDate('2025-06-07'),
          theme: 'life-prediction',
          summary: 'Future insight',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('life-prediction')
      expect(record.summary).toBe('Future insight')
    })

    it('should map life-prediction-timing consultation', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        {
          id: 'con-3',
          createdAt: fakeDate('2025-06-06'),
          theme: 'life-prediction-timing',
          summary: null,
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('life-prediction-timing')
      expect(record.summary).toBe('인생 예측')
    })

    it('should map destiny-map consultation with known theme', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        {
          id: 'con-4',
          createdAt: fakeDate('2025-06-05'),
          theme: 'focus_love',
          summary: 'Love analysis',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('destiny-map')
      expect(record.theme).toBe('focus_love')
      expect(record.summary).toBe('연애운 분석을 이용했습니다')
    })

    it('should map destiny-map consultation with unknown theme label', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        { id: 'con-5', createdAt: fakeDate('2025-06-04'), theme: 'custom_theme', summary: null },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('destiny-map')
      expect(record.summary).toBe('custom_theme 분석을 이용했습니다')
    })

    it('should map destiny-map with null theme', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        { id: 'con-6', createdAt: fakeDate('2025-06-03'), theme: null, summary: null },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('destiny-map')
      expect(record.summary).toBe('Destiny Map 분석을 이용했습니다')
    })
  })

  describe('Record Mapping – formatDestinyMapSummary themes', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    const themeExpectations: Array<[string, string]> = [
      ['focus_overall', '종합 운세 분석을 이용했습니다'],
      ['focus_love', '연애운 분석을 이용했습니다'],
      ['focus_career', '직장/사업운 분석을 이용했습니다'],
      ['focus_money', '재물운 분석을 이용했습니다'],
      ['focus_health', '건강운 분석을 이용했습니다'],
      ['dream', '꿈 해석 분석을 이용했습니다'],
    ]

    for (const [theme, expected] of themeExpectations) {
      it(`should produce correct label for theme "${theme}"`, async () => {
        vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
          { id: `theme-${theme}`, createdAt: fakeDate('2025-01-01'), theme, summary: null },
        ] as any)

        const response = await GET(makeRequest())
        const data = await response.json()

        // For 'dream' theme the service is 'dream', not destiny-map, so summary path differs
        const record = data.data.history[0].records[0]
        if (theme === 'dream') {
          // dream consultations go through the dream branch
          expect(record.service).toBe('dream')
          expect(record.summary).toBe('꿈 해석')
        } else {
          expect(record.summary).toBe(expected)
        }
      })
    }
  })

  describe('Record Mapping – User Interactions', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should map interaction records', async () => {
      vi.mocked(prisma.userInteraction.findMany).mockResolvedValue([
        {
          id: 'int-1',
          createdAt: fakeDate('2025-06-12'),
          type: 'complete',
          service: 'tarot',
          theme: 'love',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.id).toBe('int-1')
      expect(record.service).toBe('tarot')
      expect(record.theme).toBe('love')
      expect(record.type).toBe('interaction')
      expect(record.summary).toBeUndefined()
    })

    it('should handle interaction with null theme', async () => {
      vi.mocked(prisma.userInteraction.findMany).mockResolvedValue([
        {
          id: 'int-2',
          createdAt: fakeDate('2025-06-12'),
          type: 'view',
          service: 'saju',
          theme: null,
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.theme).toBeUndefined()
    })
  })

  describe('Record Mapping – Daily Fortunes', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should map daily fortune records', async () => {
      vi.mocked(prisma.dailyFortune.findMany).mockResolvedValue([
        { id: 'fort-1', createdAt: fakeDate('2025-06-11'), date: '2025-06-11', overallScore: 85 },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.id).toBe('fort-1')
      expect(record.date).toBe('2025-06-11')
      expect(record.service).toBe('daily-fortune')
      expect(record.summary).toBe('Overall score: 85')
      expect(record.type).toBe('fortune')
    })
  })

  describe('Record Mapping – Calendar Dates', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should map calendar date with grade <= 2 as 좋은 날', async () => {
      vi.mocked(prisma.savedCalendarDate.findMany).mockResolvedValue([
        {
          id: 'cal-1',
          createdAt: fakeDate('2025-06-09'),
          date: '2025-06-09',
          grade: 1,
          title: 'Great day',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('destiny-calendar')
      expect(record.theme).toBe('좋은 날')
      expect(record.summary).toBe('Great day')
      expect(record.type).toBe('calendar')
    })

    it('should map calendar date with grade 2 as 좋은 날', async () => {
      vi.mocked(prisma.savedCalendarDate.findMany).mockResolvedValue([
        {
          id: 'cal-1b',
          createdAt: fakeDate('2025-06-09'),
          date: '2025-06-09',
          grade: 2,
          title: 'OK day',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.theme).toBe('좋은 날')
    })

    it('should map calendar date with grade 4 as 주의 날', async () => {
      vi.mocked(prisma.savedCalendarDate.findMany).mockResolvedValue([
        {
          id: 'cal-2',
          createdAt: fakeDate('2025-06-09'),
          date: '2025-06-09',
          grade: 4,
          title: null,
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.theme).toBe('주의 날')
      expect(record.summary).toBe('저장된 날짜')
    })

    it('should map calendar date with grade 3 as 보통 날', async () => {
      vi.mocked(prisma.savedCalendarDate.findMany).mockResolvedValue([
        {
          id: 'cal-3',
          createdAt: fakeDate('2025-06-09'),
          date: '2025-06-09',
          grade: 3,
          title: 'Neutral',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.theme).toBe('보통 날')
    })

    it('should map calendar date with grade 5 as 보통 날', async () => {
      vi.mocked(prisma.savedCalendarDate.findMany).mockResolvedValue([
        {
          id: 'cal-4',
          createdAt: fakeDate('2025-06-09'),
          date: '2025-06-09',
          grade: 5,
          title: null,
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.theme).toBe('보통 날')
    })
  })

  describe('Record Mapping – ICP Results', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should map ICP result with both styles', async () => {
      vi.mocked(prisma.iCPResult.findMany).mockResolvedValue([
        {
          id: 'icp-1',
          createdAt: fakeDate('2025-06-08'),
          primaryStyle: 'Romantic',
          secondaryStyle: 'Classic',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('personality-icp')
      expect(record.theme).toBe('Romantic')
      expect(record.summary).toBe('Romantic / Classic 스타일')
      expect(record.type).toBe('icp-result')
    })

    it('should handle ICP result with no secondary style', async () => {
      vi.mocked(prisma.iCPResult.findMany).mockResolvedValue([
        {
          id: 'icp-2',
          createdAt: fakeDate('2025-06-08'),
          primaryStyle: 'Minimalist',
          secondaryStyle: null,
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.summary).toBe('Minimalist 스타일')
    })
  })

  describe('Record Mapping – Compatibility Results', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should map compatibility result with both names', async () => {
      vi.mocked(prisma.compatibilityResult.findMany).mockResolvedValue([
        {
          id: 'compat-1',
          createdAt: fakeDate('2025-06-07'),
          crossSystemScore: 88,
          person1Name: 'Alice',
          person2Name: 'Bob',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('compatibility')
      expect(record.summary).toBe('Alice & Bob - 궁합 88점')
      expect(record.type).toBe('compatibility-result')
    })

    it('should use default names when person names are null', async () => {
      vi.mocked(prisma.compatibilityResult.findMany).mockResolvedValue([
        {
          id: 'compat-2',
          createdAt: fakeDate('2025-06-07'),
          crossSystemScore: 72,
          person1Name: null,
          person2Name: null,
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.summary).toBe('Person 1 & Person 2 - 궁합 72점')
    })
  })

  describe('Record Mapping – Destiny Matrix Reports', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should map timing report as premium-reports', async () => {
      vi.mocked(prisma.destinyMatrixReport.findMany).mockResolvedValue([
        {
          id: 'mx-1',
          createdAt: fakeDate('2025-06-06'),
          reportType: 'timing',
          period: '2025-Q3',
          theme: 'career',
          title: 'Q3 Outlook',
          summary: 'Good quarter',
          overallScore: 90,
          grade: 'A',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('premium-reports')
      expect(record.theme).toBe('2025-Q3') // timing uses period
      expect(record.summary).toBe('Good quarter')
      expect(record.type).toBe('destiny-matrix-report')
    })

    it('should map themed report as premium-reports', async () => {
      vi.mocked(prisma.destinyMatrixReport.findMany).mockResolvedValue([
        {
          id: 'mx-2',
          createdAt: fakeDate('2025-06-05'),
          reportType: 'themed',
          period: null,
          theme: 'love',
          title: 'Love Report',
          summary: null,
          overallScore: 80,
          grade: 'B',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('premium-reports')
      expect(record.theme).toBe('love') // non-timing uses theme
      expect(record.summary).toBe('Love Report') // falls back to title
    })

    it('should map comprehensive report as premium-reports', async () => {
      vi.mocked(prisma.destinyMatrixReport.findMany).mockResolvedValue([
        {
          id: 'mx-3',
          createdAt: fakeDate('2025-06-04'),
          reportType: 'comprehensive',
          period: null,
          theme: 'overall',
          title: null,
          summary: null,
          overallScore: 75,
          grade: 'C',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('premium-reports')
      // When both summary and title are null, falls back to grade+score
      expect(record.summary).toBe('C 75점')
    })

    it('should map basic matrix report as destiny-matrix', async () => {
      vi.mocked(prisma.destinyMatrixReport.findMany).mockResolvedValue([
        {
          id: 'mx-4',
          createdAt: fakeDate('2025-06-03'),
          reportType: 'basic',
          period: null,
          theme: 'general',
          title: 'Basic Report',
          summary: 'A basic analysis',
          overallScore: 60,
          grade: null,
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('destiny-matrix')
      expect(record.summary).toBe('A basic analysis')
    })

    it('should handle matrix report with no summary, title, grade, or score', async () => {
      vi.mocked(prisma.destinyMatrixReport.findMany).mockResolvedValue([
        {
          id: 'mx-5',
          createdAt: fakeDate('2025-06-02'),
          reportType: 'basic',
          period: null,
          theme: null,
          title: null,
          summary: null,
          overallScore: null,
          grade: null,
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      // Falls back to `${grade} ${overallScore}점` -> " 점" (with nulls becoming empty-ish)
      expect(record.summary).toBe(' 점')
    })
  })

  describe('Record Mapping – Personality Results', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should map personality result correctly', async () => {
      vi.mocked(prisma.personalityResult.findMany).mockResolvedValue([
        {
          id: 'pers-1',
          createdAt: fakeDate('2025-06-01'),
          typeCode: 'INTJ',
          personaName: 'The Architect',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const record = data.data.history[0].records[0]
      expect(record.service).toBe('personality')
      expect(record.theme).toBe('INTJ')
      expect(record.summary).toBe('The Architect (INTJ)')
      expect(record.type).toBe('personality-result')
    })
  })

  // -----------------------------------------------------------------------
  // Filtering by service
  // -----------------------------------------------------------------------
  describe('Service Filtering', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should filter records by service name', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'r-1', createdAt: fakeDate('2025-06-15'), type: 'astrology', title: 'Test' },
      ] as any)
      vi.mocked(prisma.tarotReading.findMany).mockResolvedValue([
        {
          id: 't-1',
          createdAt: fakeDate('2025-06-15'),
          question: 'Q?',
          theme: null,
          spreadTitle: null,
        },
      ] as any)

      const response = await GET(makeRequest({ service: 'tarot' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      // Only tarot records should be present
      const allRecords = data.data.history.flatMap((d: any) => d.records)
      expect(allRecords.every((r: any) => r.service === 'tarot' || r.type === 'tarot')).toBe(true)
    })

    it('should filter by type field as well', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'r-1', createdAt: fakeDate('2025-06-15'), type: 'astrology', title: 'A' },
      ] as any)

      const response = await GET(makeRequest({ service: 'reading' }))
      const data = await response.json()

      // 'reading' matches the type field
      const allRecords = data.data.history.flatMap((d: any) => d.records)
      expect(allRecords.length).toBe(1)
      expect(allRecords[0].type).toBe('reading')
    })

    it('should return empty when service filter matches nothing', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'r-1', createdAt: fakeDate('2025-06-15'), type: 'astrology', title: 'Test' },
      ] as any)

      const response = await GET(makeRequest({ service: 'nonexistent-service' }))
      const data = await response.json()

      expect(data.data.history).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // Grouping and sorting
  // -----------------------------------------------------------------------
  describe('Grouping and Sorting', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should group records by date', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'r-1', createdAt: fakeDate('2025-06-15'), type: 'astrology', title: 'A' },
        { id: 'r-2', createdAt: fakeDate('2025-06-15'), type: 'saju', title: 'B' },
        { id: 'r-3', createdAt: fakeDate('2025-06-14'), type: 'astrology', title: 'C' },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(data.data.history.length).toBe(2)
      const dates = data.data.history.map((h: any) => h.date)
      expect(dates).toContain('2025-06-15')
      expect(dates).toContain('2025-06-14')
    })

    it('should sort dates in descending order (most recent first)', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'r-old', createdAt: fakeDate('2025-01-01'), type: 'saju', title: 'Old' },
        { id: 'r-new', createdAt: fakeDate('2025-06-15'), type: 'saju', title: 'New' },
        { id: 'r-mid', createdAt: fakeDate('2025-03-10'), type: 'saju', title: 'Mid' },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const dates = data.data.history.map((h: any) => h.date)
      expect(dates).toEqual(['2025-06-15', '2025-03-10', '2025-01-01'])
    })

    it('should sort records within a date group by service name (alphabetical)', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'r-1', createdAt: fakeDate('2025-06-15'), type: 'saju', title: 'S' },
      ] as any)
      vi.mocked(prisma.tarotReading.findMany).mockResolvedValue([
        {
          id: 't-1',
          createdAt: fakeDate('2025-06-15'),
          question: 'Q?',
          theme: null,
          spreadTitle: null,
        },
      ] as any)
      vi.mocked(prisma.dailyFortune.findMany).mockResolvedValue([
        { id: 'f-1', createdAt: fakeDate('2025-06-15'), date: '2025-06-15', overallScore: 80 },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      const group = data.data.history.find((h: any) => h.date === '2025-06-15')
      const services = group.records.map((r: any) => r.service)
      const sortedServices = [...services].sort()
      expect(services).toEqual(sortedServices)
    })
  })

  // -----------------------------------------------------------------------
  // Pagination
  // -----------------------------------------------------------------------
  describe('Pagination', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should respect the limit parameter for daily history count', async () => {
      // Create 5 records on 5 different dates
      vi.mocked(prisma.reading.findMany).mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          id: `r-${i}`,
          createdAt: fakeDate(`2025-06-${String(10 + i).padStart(2, '0')}`),
          type: 'saju',
          title: `Reading ${i}`,
        })) as any
      )

      const response = await GET(makeRequest({ limit: '3' }))
      const data = await response.json()

      // History is sliced to limit
      expect(data.data.history.length).toBeLessThanOrEqual(3)
      expect(data.data.pagination.limit).toBe(3)
    })

    it('should report hasMore=true when totalRecords >= limit', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          id: `r-${i}`,
          createdAt: fakeDate(`2025-06-${String(i + 1).padStart(2, '0')}`),
          type: 'saju',
          title: `Reading ${i}`,
        })) as any
      )

      const response = await GET(makeRequest({ limit: '5' }))
      const data = await response.json()

      expect(data.data.pagination.hasMore).toBe(true)
    })

    it('should report hasMore=false when few records exist', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'r-1', createdAt: fakeDate('2025-06-15'), type: 'saju', title: 'Only one' },
      ] as any)

      const response = await GET(makeRequest({ limit: '20' }))
      const data = await response.json()

      expect(data.data.pagination.hasMore).toBe(false)
    })

    it('should pass correct skip to prisma when offset > 0', async () => {
      await GET(makeRequest({ offset: '18' }))

      // offset / 9 = 2 (floored)
      expect(prisma.reading.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 2 }))
    })

    it('should pass skip=0 when offset is 0', async () => {
      await GET(makeRequest({ offset: '0' }))

      expect(prisma.reading.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0 }))
    })

    it('should return correct pagination metadata', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'r-1', createdAt: fakeDate('2025-06-15'), type: 'saju', title: 'A' },
        { id: 'r-2', createdAt: fakeDate('2025-06-14'), type: 'saju', title: 'B' },
      ] as any)

      const response = await GET(makeRequest({ limit: '10', offset: '5' }))
      const data = await response.json()

      expect(data.data.pagination).toEqual(
        expect.objectContaining({
          limit: 10,
          offset: 5,
          count: expect.any(Number),
          totalRecords: expect.any(Number),
          hasMore: expect.any(Boolean),
        })
      )
    })
  })

  // -----------------------------------------------------------------------
  // Table query limits
  // -----------------------------------------------------------------------
  describe('Per-table Query Limits', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should compute perTableLimit as ceil(limit / 3)', async () => {
      await GET(makeRequest({ limit: '30' }))

      // perTableLimit = ceil(30 / 3) = 10
      expect(prisma.reading.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }))
      expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      )
      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      )
    })

    it('should compute minorTableLimit as ceil(limit / 6)', async () => {
      await GET(makeRequest({ limit: '30' }))

      // minorTableLimit = ceil(30 / 6) = 5
      expect(prisma.userInteraction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      )
      expect(prisma.savedCalendarDate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      )
      expect(prisma.iCPResult.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }))
    })

    it('should cap daily fortune take at Math.min(minorTableLimit, 14)', async () => {
      // For limit=30: minorTableLimit = 5, Math.min(5,14) = 5
      await GET(makeRequest({ limit: '30' }))
      expect(prisma.dailyFortune.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      )
    })

    it('should cap daily fortune take at 14 for large limits', async () => {
      // For limit=100: minorTableLimit = ceil(100/6) = 17, Math.min(17,14) = 14
      await GET(makeRequest({ limit: '100' }))
      expect(prisma.dailyFortune.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 14 })
      )
    })
  })

  // -----------------------------------------------------------------------
  // safeQuery - destinyMatrixReport resilience
  // -----------------------------------------------------------------------
  describe('safeQuery Resilience', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should handle destinyMatrixReport table not existing (safeQuery catches error)', async () => {
      vi.mocked(prisma.destinyMatrixReport.findMany).mockRejectedValue(
        new Error('Table does not exist')
      )

      const response = await GET(makeRequest())
      const data = await response.json()

      // Should still succeed with empty matrix reports
      expect(response.status).toBe(200)
      expect(logger.warn).toHaveBeenCalledWith(
        '[History] Query failed (table may not exist):',
        'Table does not exist'
      )
    })
  })

  // -----------------------------------------------------------------------
  // Error Handling
  // -----------------------------------------------------------------------
  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return DATABASE_ERROR when a required prisma query throws', async () => {
      // reading.findMany (not wrapped in safeQuery) rejects
      vi.mocked(prisma.reading.findMany).mockRejectedValue(new Error('Connection refused'))
      vi.mocked(prisma.tarotReading.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.userInteraction.findMany).mockResolvedValue([])
      vi.mocked(prisma.dailyFortune.findMany).mockResolvedValue([])
      vi.mocked(prisma.savedCalendarDate.findMany).mockResolvedValue([])
      vi.mocked(prisma.iCPResult.findMany).mockResolvedValue([])
      vi.mocked(prisma.compatibilityResult.findMany).mockResolvedValue([])
      vi.mocked(prisma.destinyMatrixReport.findMany).mockResolvedValue([])
      vi.mocked(prisma.personalityResult.findMany).mockResolvedValue([])

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(logger.error).toHaveBeenCalledWith('Error fetching history:', expect.any(Error))
    })

    it('should return DATABASE_ERROR when personalityResult query throws', async () => {
      mockAllPrismaEmpty()
      vi.mocked(prisma.personalityResult.findMany).mockRejectedValue(new Error('Query timeout'))

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })

    it('should return DATABASE_ERROR when all queries throw', async () => {
      const err = new Error('DB is down')
      vi.mocked(prisma.reading.findMany).mockRejectedValue(err)
      vi.mocked(prisma.tarotReading.findMany).mockRejectedValue(err)
      vi.mocked(prisma.consultationHistory.findMany).mockRejectedValue(err)
      vi.mocked(prisma.userInteraction.findMany).mockRejectedValue(err)
      vi.mocked(prisma.dailyFortune.findMany).mockRejectedValue(err)
      vi.mocked(prisma.savedCalendarDate.findMany).mockRejectedValue(err)
      vi.mocked(prisma.iCPResult.findMany).mockRejectedValue(err)
      vi.mocked(prisma.compatibilityResult.findMany).mockRejectedValue(err)
      vi.mocked(prisma.destinyMatrixReport.findMany).mockRejectedValue(err)
      vi.mocked(prisma.personalityResult.findMany).mockRejectedValue(err)

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })
  })

  // -----------------------------------------------------------------------
  // Mixed records across multiple models
  // -----------------------------------------------------------------------
  describe('Mixed Records Integration', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should aggregate records from all models into a single response', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'r-1', createdAt: fakeDate('2025-06-15'), type: 'astrology', title: 'Reading' },
      ] as any)
      vi.mocked(prisma.tarotReading.findMany).mockResolvedValue([
        {
          id: 't-1',
          createdAt: fakeDate('2025-06-15'),
          question: 'Q?',
          theme: 'love',
          spreadTitle: null,
        },
      ] as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        { id: 'c-1', createdAt: fakeDate('2025-06-14'), theme: 'dream', summary: 'Dream analysis' },
      ] as any)
      vi.mocked(prisma.dailyFortune.findMany).mockResolvedValue([
        { id: 'f-1', createdAt: fakeDate('2025-06-14'), date: '2025-06-14', overallScore: 92 },
      ] as any)
      vi.mocked(prisma.personalityResult.findMany).mockResolvedValue([
        {
          id: 'p-1',
          createdAt: fakeDate('2025-06-13'),
          typeCode: 'ENFP',
          personaName: 'The Campaigner',
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.history.length).toBe(3) // 3 distinct dates

      const allRecords = data.data.history.flatMap((h: any) => h.records)
      expect(allRecords.length).toBe(5)

      const types = allRecords.map((r: any) => r.type)
      expect(types).toContain('reading')
      expect(types).toContain('tarot-reading')
      expect(types).toContain('consultation')
      expect(types).toContain('fortune')
      expect(types).toContain('personality-result')

      expect(data.data.pagination.totalRecords).toBe(5)
    })

    it('should correctly aggregate multiple records on same date from different models', async () => {
      const sameDate = '2025-06-15'
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'r-1', createdAt: fakeDate(sameDate), type: 'saju', title: 'Saju' },
      ] as any)
      vi.mocked(prisma.tarotReading.findMany).mockResolvedValue([
        {
          id: 't-1',
          createdAt: fakeDate(sameDate),
          question: 'Will it rain?',
          theme: null,
          spreadTitle: null,
        },
      ] as any)
      vi.mocked(prisma.iCPResult.findMany).mockResolvedValue([
        {
          id: 'icp-1',
          createdAt: fakeDate(sameDate),
          primaryStyle: 'Adventurous',
          secondaryStyle: null,
        },
      ] as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(data.data.history.length).toBe(1) // all same date
      expect(data.data.history[0].records.length).toBe(3)
    })
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe('Edge Cases', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockAllPrismaEmpty()
    })

    it('should handle limit=1 correctly', async () => {
      vi.mocked(prisma.reading.findMany).mockResolvedValue([
        { id: 'r-1', createdAt: fakeDate('2025-06-15'), type: 'saju', title: 'A' },
        { id: 'r-2', createdAt: fakeDate('2025-06-14'), type: 'saju', title: 'B' },
      ] as any)

      const response = await GET(makeRequest({ limit: '1' }))
      const data = await response.json()

      expect(data.data.history.length).toBeLessThanOrEqual(1)
    })

    it('should handle maximum valid limit=100', async () => {
      const response = await GET(makeRequest({ limit: '100' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pagination.limit).toBe(100)
    })

    it('should handle large offset gracefully', async () => {
      const response = await GET(makeRequest({ offset: '9999' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.history).toEqual([])
    })

    it('should handle concurrent empty tables without error', async () => {
      // All tables return empty (baseline) - Promise.all should resolve
      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.history).toEqual([])
    })

    it('should use personalityResult skip calculation with / 10 instead of / 9', async () => {
      await GET(makeRequest({ offset: '20' }))

      // personalityResult uses Math.floor(offset / 10)
      expect(prisma.personalityResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 2 }) // floor(20 / 10) = 2
      )

      // Others use Math.floor(offset / 9)
      expect(prisma.reading.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 2 }) // floor(20 / 9) = 2
      )
    })

    it('should differentiate offset skip between personalityResult and other tables', async () => {
      await GET(makeRequest({ offset: '19' }))

      // personalityResult: floor(19 / 10) = 1
      expect(prisma.personalityResult.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 1 })
      )

      // reading: floor(19 / 9) = 2
      expect(prisma.reading.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 2 }))
    })
  })
})
