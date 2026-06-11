/**
 * Tests for Admin Funnel Metrics API
 * GET /api/admin/metrics/funnel - Get core funnel metrics
 *
 * NOTE: This route was rewritten to return ONLY real, measurable metrics
 * (registrations / activations / engagement). The old "visitors" block and
 * hardcoded multipliers (visitors = newUsers*30, trend=8.5, DAU=total*0.15,
 * avgSessionDuration=7.5) were removed because there is no analytics/visitor
 * tracking table to measure them. These tests assert the real-data shape.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ===========================================================================
// Mocks - all mocks must be declared BEFORE the route import
// ===========================================================================

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 29,
    reset: Date.now() + 60000,
    limit: 30,
    headers: new Headers(),
  }),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
  recordTiming: vi.fn(),
}))

vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: vi.fn(() => ({ valid: true })),
}))

vi.mock('@/lib/security/csrf', () => ({
  csrfGuard: vi.fn(() => null),
}))

vi.mock('@/lib/credits', () => ({
  checkAndConsumeCredits: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}))

vi.mock('@/lib/credits/creditRefund', () => ({
  refundCredits: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    tarotReading: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    counselorChatSession: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/admin', () => ({
  isAdminUser: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// ===========================================================================
// Import route handler AFTER all mocks are declared
// ===========================================================================

import { GET } from '@/app/api/admin/metrics/funnel/route'
import { getServerSession } from '@/lib/auth/session'
import { rateLimit } from '@/lib/rateLimit'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'
import { logger } from '@/lib/logger'

// ===========================================================================
// Helpers
// ===========================================================================

function createRequest(queryParams: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/metrics/funnel')
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url)
}

const adminSession = {
  user: { id: 'admin-user-123', email: 'admin@example.com' },
  expires: '2099-12-31',
}

const nonAdminSession = {
  user: { id: 'regular-user-456', email: 'user@example.com' },
  expires: '2099-12-31',
}

/** Build an array of distinct {userId} rows, mimicking prisma groupBy output. */
function makeUsers(n: number): Array<{ userId: string }> {
  return Array.from({ length: n }, (_, i) => ({ userId: `u${i}` }))
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Setup mock data for happy-path tests. All values are independently
 * controllable so we can assert that the route reports REAL DB-derived
 * numbers rather than fabricated multiples.
 */
function setupHappyPath(overrides?: {
  totalUsers?: number
  newUsers?: number
  prevNewUsers?: number
  activatedUsers?: number
  dau?: number
  wau?: number
  weeklyTarot?: number
  weeklyCounsel?: number
}) {
  const {
    totalUsers = 1000,
    newUsers = 50,
    prevNewUsers = 40,
    activatedUsers = 600,
    dau = 80,
    wau = 200,
    weeklyTarot = 100,
    weeklyCounsel = 50,
  } = overrides ?? {}

  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    remaining: 29,
    reset: Date.now() + 60000,
    limit: 30,
    headers: new Headers(),
  })

  // user.count: 모든 호출이 realUserWhere(OR accounts/passwordHash)를 쓴다.
  // 누적(total) 은 where 에 AND 가 없고, 기간 윈도 호출은 where.AND[1].createdAt
  // 를 가진다. order: [current window = newUsers] then [previous = prevNewUsers].
  let windowedCalls = 0
  vi.mocked(prisma.user.count).mockImplementation(async (args?: any) => {
    if (!args?.where?.AND) return totalUsers
    windowedCalls += 1
    return windowedCalls === 1 ? newUsers : prevNewUsers
  })

  // groupBy distinguishes the window by its createdAt.gte:
  //   gte === epoch(0)          → all-time activated users
  //   gte within last ~2 days   → DAU window
  //   otherwise (7d ago)        → WAU window
  // Reading 모델 제거(2026-06-06) — 활성 판정은 tarotReading + counselorChatSession.
  // 모든 distinct id 를 tarotReading.groupBy 로 돌려주고 counselor 쪽은 [] 라
  // 라우트의 Set 합집합이 정확히 의도한 수가 되게 한다.
  vi.mocked(prisma.tarotReading.groupBy).mockImplementation(async (args: any) => {
    const gte = new Date(args.where.createdAt.gte).getTime()
    if (gte === 0) return makeUsers(activatedUsers) as any
    if (gte > Date.now() - 2 * DAY_MS) return makeUsers(dau) as any
    return makeUsers(wau) as any
  })
  vi.mocked(prisma.counselorChatSession.groupBy).mockResolvedValue([] as any)

  vi.mocked(prisma.tarotReading.count).mockResolvedValue(weeklyTarot)
  vi.mocked(prisma.counselorChatSession.count).mockResolvedValue(weeklyCounsel)
}

// ===========================================================================
// Test Suite
// ===========================================================================

describe('GET /api/admin/metrics/funnel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com,superadmin@test.com'
  })

  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  // =========================================================================
  // Authentication & Authorization
  // =========================================================================
  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await GET(createRequest())
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject requests without user id in session', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'someone@test.com' },
        expires: '2099-12-31',
      } as any)

      const response = await GET(createRequest())
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject requests without email in session', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123' },
        expires: '2099-12-31',
      } as any)

      const response = await GET(createRequest())
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject non-admin users', async () => {
      vi.mocked(getServerSession).mockResolvedValue(nonAdminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(false)

      const response = await GET(createRequest())
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(logger.warn).toHaveBeenCalledWith(
        '[Funnel] Unauthorized access attempt',
        expect.objectContaining({
          email: 'user@example.com',
          userId: 'regular-user-456',
        })
      )
    })

    it('should allow admin users', async () => {
      setupHappyPath()

      const response = await GET(createRequest())

      expect(response.status).toBe(200)
      expect(isAdminUser).toHaveBeenCalledWith('admin-user-123')
    })
  })

  // =========================================================================
  // Rate Limiting
  // =========================================================================
  describe('Rate Limiting', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(true)
    })

    it('should enforce rate limits', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: Date.now() + 60000,
        limit: 30,
        headers: new Headers({ 'X-RateLimit-Remaining': '0' }),
      })

      const response = await GET(createRequest())
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error.code).toBe('RATE_LIMITED')
    })

    it('should allow requests within rate limit', async () => {
      setupHappyPath()
      const response = await GET(createRequest())
      expect(response.status).toBe(200)
    })
  })

  // =========================================================================
  // Query Parameter Validation
  // =========================================================================
  describe('Query Parameter Validation', () => {
    beforeEach(() => {
      setupHappyPath()
    })

    it('should default to 24h timeRange', async () => {
      const data = await (await GET(createRequest())).json()
      expect(data.data.timeRange).toBe('24h')
    })

    it.each(['1h', '6h', '24h', '7d', '30d'])('should accept valid timeRange %s', async (tr) => {
      const response = await GET(createRequest({ timeRange: tr }))
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.data.timeRange).toBe(tr)
    })

    it('should reject invalid timeRange', async () => {
      const response = await GET(createRequest({ timeRange: 'invalid' }))
      const data = await response.json()
      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid timeRange parameter')
    })

    it('should reject unsupported timeRange values', async () => {
      const response = await GET(createRequest({ timeRange: '2h' }))
      const data = await response.json()
      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // =========================================================================
  // Funnel Data Response Structure (real metrics only)
  // =========================================================================
  describe('Funnel Data Response Structure', () => {
    beforeEach(() => {
      setupHappyPath()
    })

    it('should return success response with correct envelope', async () => {
      const response = await GET(createRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.data).toBeDefined()
      expect(data.data.timeRange).toBe('24h')
    })

    it('should NOT include the removed fake "visitors" block', async () => {
      const data = (await (await GET(createRequest())).json()).data.data
      expect(data.visitors).toBeUndefined()
    })

    it('should include real registrations metrics', async () => {
      const data = (await (await GET(createRequest())).json()).data.data
      expect(data.registrations.total).toBe(1000)
      expect(data.registrations.daily).toBe(50)
      expect(typeof data.registrations.trend).toBe('number')
      // removed fabricated field
      expect(data.registrations.conversionRate).toBeUndefined()
    })

    it('should include real activations metrics', async () => {
      const data = (await (await GET(createRequest())).json()).data.data
      expect(data.activations.total).toBe(600)
      expect(data.activations.rate).toBeGreaterThanOrEqual(0)
      expect(data.activations.rate).toBeLessThanOrEqual(100)
    })

    it('should include real engagement metrics', async () => {
      const data = (await (await GET(createRequest())).json()).data.data
      expect(data.engagement.dailyActiveUsers).toBe(80)
      expect(data.engagement.weeklyActiveUsers).toBe(200)
      expect(data.engagement.readingsPerUser).toBeGreaterThanOrEqual(0)
      // removed fabricated field
      expect(data.engagement.avgSessionDuration).toBeUndefined()
    })
  })

  // =========================================================================
  // Real Metric Calculations
  // =========================================================================
  describe('Real Metric Calculations', () => {
    it('should compute activation rate from distinct active users', async () => {
      setupHappyPath({ totalUsers: 1000, activatedUsers: 600 })
      const data = (await (await GET(createRequest())).json()).data.data
      // 600 / 1000 * 100
      expect(data.activations.total).toBe(600)
      expect(data.activations.rate).toBeCloseTo(60, 5)
    })

    it('should report DAU/WAU as distinct active-user counts', async () => {
      setupHappyPath({ dau: 33, wau: 111 })
      const data = (await (await GET(createRequest())).json()).data.data
      expect(data.engagement.dailyActiveUsers).toBe(33)
      expect(data.engagement.weeklyActiveUsers).toBe(111)
    })

    it('should compute readingsPerUser from weekly actions / WAU', async () => {
      setupHappyPath({ wau: 100, weeklyTarot: 100, weeklyCounsel: 100 })
      const data = (await (await GET(createRequest())).json()).data.data
      // (100 tarot + 100 counsel) / 100 wau = 2
      expect(data.engagement.readingsPerUser).toBeCloseTo(2, 5)
    })

    it('should compute a positive registration trend vs previous period', async () => {
      setupHappyPath({ newUsers: 60, prevNewUsers: 40 })
      const data = (await (await GET(createRequest())).json()).data.data
      // (60 - 40) / 40 * 100 = 50
      expect(data.registrations.trend).toBeCloseTo(50, 5)
    })

    it('should compute a negative registration trend when signups fall', async () => {
      setupHappyPath({ newUsers: 20, prevNewUsers: 40 })
      const data = (await (await GET(createRequest())).json()).data.data
      // (20 - 40) / 40 * 100 = -50
      expect(data.registrations.trend).toBeCloseTo(-50, 5)
    })

    it('should report 100% trend when previous period had zero signups', async () => {
      setupHappyPath({ newUsers: 10, prevNewUsers: 0 })
      const data = (await (await GET(createRequest())).json()).data.data
      expect(data.registrations.trend).toBe(100)
    })
  })

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe('Edge Cases', () => {
    it('should handle zero users/activity', async () => {
      setupHappyPath({
        totalUsers: 0,
        newUsers: 0,
        prevNewUsers: 0,
        activatedUsers: 0,
        dau: 0,
        wau: 0,
        weeklyReadings: 0,
        weeklyTarot: 0,
        weeklyCounsel: 0,
      })

      const response = await GET(createRequest())
      const data = (await response.json()).data.data

      expect(response.status).toBe(200)
      expect(data.registrations.total).toBe(0)
      expect(data.registrations.trend).toBe(0)
      expect(data.activations.rate).toBe(0)
      expect(data.engagement.readingsPerUser).toBe(0)
    })

    it('should handle large numbers', async () => {
      setupHappyPath({ totalUsers: 1_000_000, activatedUsers: 750_000 })
      const response = await GET(createRequest())
      const data = (await response.json()).data.data
      expect(response.status).toBe(200)
      expect(data.registrations.total).toBe(1_000_000)
      expect(data.activations.rate).toBeCloseTo(75, 5)
    })
  })

  // =========================================================================
  // Error Handling (Promise.allSettled → graceful fallbacks)
  // =========================================================================
  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(true)
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        remaining: 29,
        reset: Date.now() + 60000,
        limit: 30,
        headers: new Headers(),
      })
    })

    it('should fall back to 0 registrations when user.count throws', async () => {
      setupHappyPath()
      vi.mocked(prisma.user.count).mockRejectedValue(new Error('DB error'))

      const response = await GET(createRequest())
      const data = (await response.json()).data.data

      expect(response.status).toBe(200)
      expect(data.registrations.total).toBe(0)
    })

    it('should fall back to 0 activations/DAU/WAU when groupBy throws', async () => {
      setupHappyPath()
      vi.mocked(prisma.tarotReading.groupBy).mockRejectedValue(new Error('groupBy failed'))

      const response = await GET(createRequest())
      const data = (await response.json()).data.data

      expect(response.status).toBe(200)
      expect(data.activations.total).toBe(0)
      expect(data.engagement.dailyActiveUsers).toBe(0)
      expect(data.engagement.weeklyActiveUsers).toBe(0)
    })

    it('should return 500 when isAdminUser throws', async () => {
      vi.mocked(isAdminUser).mockRejectedValue(new Error('Admin check failed'))

      const response = await GET(createRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  // =========================================================================
  // Date Range Calculation
  // =========================================================================
  describe('Date Range Calculation', () => {
    beforeEach(() => {
      setupHappyPath()
    })

    it.each(['1h', '6h', '24h', '7d', '30d'])(
      'should query the database for timeRange %s',
      async (tr) => {
        await GET(createRequest({ timeRange: tr }))
        expect(prisma.user.count).toHaveBeenCalled()
      }
    )
  })

  // =========================================================================
  // Parallel Query Execution
  // =========================================================================
  describe('Parallel Query Execution', () => {
    it('should execute user, groupBy and count queries', async () => {
      setupHappyPath()
      await GET(createRequest())

      expect(prisma.user.count).toHaveBeenCalled()
      expect(prisma.tarotReading.groupBy).toHaveBeenCalled()
      expect(prisma.tarotReading.count).toHaveBeenCalled()
    })
  })
})
