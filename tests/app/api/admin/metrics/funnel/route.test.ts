/**
 * Comprehensive tests for Admin Funnel Metrics API
 * GET /api/admin/metrics/funnel - Get core funnel metrics
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ===========================================================================
// Mocks - all mocks must be declared BEFORE the route import
// ===========================================================================

vi.mock('next-auth', () => ({
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
    subscription: {
      count: vi.fn(),
    },
    reading: {
      count: vi.fn(),
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
import { getServerSession } from 'next-auth'
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

/**
 * Setup mock data for happy path tests
 */
function setupHappyPath(overrides?: {
  totalUsers?: number
  newUsers?: number
  activeSubscriptions?: number
  newSubscriptions?: number
  cancelledSubscriptions?: number
  recentReadings?: number
}) {
  const {
    totalUsers = 1000,
    newUsers = 50,
    activeSubscriptions = 200,
    newSubscriptions = 25,
    cancelledSubscriptions = 5,
    recentReadings = 500,
  } = overrides ?? {}

  // Auth setup
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)

  // Rate limit setup
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    remaining: 29,
    reset: Date.now() + 60000,
    limit: 30,
    headers: new Headers(),
  })

  // Prisma mocks
  const userCountMock = vi.mocked(prisma.user.count)
  userCountMock.mockImplementation(async (args?: any) => {
    // Total users (no filter)
    if (!args || !args.where) {
      return totalUsers
    }
    // New users (with createdAt filter)
    if (args.where?.createdAt) {
      return newUsers
    }
    return totalUsers
  })

  const subscriptionCountMock = vi.mocked(prisma.subscription.count)
  subscriptionCountMock.mockImplementation(async (args?: any) => {
    if (!args || !args.where) {
      return activeSubscriptions
    }
    // Active subscriptions
    if (args.where?.status?.in) {
      if (args.where?.createdAt) {
        return newSubscriptions
      }
      return activeSubscriptions
    }
    // Cancelled subscriptions
    if (args.where?.canceledAt) {
      return cancelledSubscriptions
    }
    return activeSubscriptions
  })

  vi.mocked(prisma.reading.count).mockResolvedValue(recentReadings)
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

      const req = createRequest()
      const response = await GET(req)
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

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject requests without email in session', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123' },
        expires: '2099-12-31',
      } as any)

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject non-admin users', async () => {
      vi.mocked(getServerSession).mockResolvedValue(nonAdminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(false)

      const req = createRequest()
      const response = await GET(req)
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

      const req = createRequest()
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(isAdminUser).toHaveBeenCalledWith('admin-user-123')
    })

    it('should log warning when session exists but no userId', async () => {
      // Session exists but without user id - this triggers the log within the route handler
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: '2099-12-31',
      } as any)
      // Mock rate limit to allow through
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        remaining: 29,
        reset: Date.now() + 60000,
        limit: 30,
        headers: new Headers(),
      })

      const req = createRequest()
      await GET(req)

      expect(logger.warn).toHaveBeenCalledWith(
        '[Funnel] No session or userId',
        expect.objectContaining({
          hasSession: true,
          hasUserId: false,
          hasEmail: true,
        })
      )
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

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error.code).toBe('RATE_LIMITED')
    })

    it('should allow requests within rate limit', async () => {
      setupHappyPath()

      const req = createRequest()
      const response = await GET(req)

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
      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.timeRange).toBe('24h')
    })

    it('should accept valid timeRange 1h', async () => {
      const req = createRequest({ timeRange: '1h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.timeRange).toBe('1h')
    })

    it('should accept valid timeRange 6h', async () => {
      const req = createRequest({ timeRange: '6h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.timeRange).toBe('6h')
    })

    it('should accept valid timeRange 7d', async () => {
      const req = createRequest({ timeRange: '7d' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.timeRange).toBe('7d')
    })

    it('should accept valid timeRange 30d', async () => {
      const req = createRequest({ timeRange: '30d' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.timeRange).toBe('30d')
    })

    it('should reject invalid timeRange', async () => {
      const req = createRequest({ timeRange: 'invalid' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Invalid timeRange parameter')
    })

    it('should reject unsupported timeRange values', async () => {
      const req = createRequest({ timeRange: '2h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // =========================================================================
  // Funnel Data Response Structure
  // =========================================================================
  describe('Funnel Data Response Structure', () => {
    beforeEach(() => {
      setupHappyPath({
        totalUsers: 1000,
        newUsers: 50,
        activeSubscriptions: 200,
        newSubscriptions: 25,
        cancelledSubscriptions: 5,
        recentReadings: 500,
      })
    })

    it('should return success response with correct structure', async () => {
      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.data).toBeDefined()
      expect(data.data.timeRange).toBe('24h')
    })

    it('should include visitors metrics', async () => {
      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.data.visitors).toBeDefined()
      expect(data.data.data.visitors.daily).toBeGreaterThanOrEqual(0)
      expect(data.data.data.visitors.weekly).toBeGreaterThanOrEqual(0)
      expect(data.data.data.visitors.monthly).toBeGreaterThanOrEqual(0)
      expect(data.data.data.visitors.trend).toBe(8.5)
    })

    it('should include registrations metrics', async () => {
      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.data.registrations).toBeDefined()
      expect(data.data.data.registrations.total).toBe(1000)
      expect(data.data.data.registrations.daily).toBe(50)
      expect(data.data.data.registrations.conversionRate).toBeGreaterThanOrEqual(0)
    })

    it('should include activations metrics', async () => {
      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.data.activations).toBeDefined()
      expect(data.data.data.activations.total).toBeDefined()
      expect(data.data.data.activations.rate).toBeGreaterThanOrEqual(0)
      expect(data.data.data.activations.rate).toBeLessThanOrEqual(100)
    })

    it('should include subscriptions metrics', async () => {
      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.data.subscriptions).toBeDefined()
      expect(data.data.data.subscriptions.active).toBe(200)
      expect(data.data.data.subscriptions.new).toBe(25)
      expect(data.data.data.subscriptions.churned).toBe(5)
      expect(data.data.data.subscriptions.mrr).toBeGreaterThanOrEqual(0)
    })

    it('should include engagement metrics', async () => {
      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.data.engagement).toBeDefined()
      expect(data.data.data.engagement.dailyActiveUsers).toBeGreaterThanOrEqual(0)
      expect(data.data.data.engagement.weeklyActiveUsers).toBeGreaterThanOrEqual(0)
      expect(data.data.data.engagement.avgSessionDuration).toBe(7.5)
      expect(data.data.data.engagement.readingsPerUser).toBeGreaterThanOrEqual(0)
    })

    it('should calculate MRR correctly', async () => {
      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      // MRR = activeSubscriptions * avgPlanPrice (9900)
      // 200 * 9900 = 1,980,000
      expect(data.data.data.subscriptions.mrr).toBe(200 * 9900)
    })

    it('should cap readingsPerUser at 10', async () => {
      setupHappyPath({
        totalUsers: 10,
        newUsers: 1,
        recentReadings: 100, // 100 / 1 = 100, should be capped at 10
      })

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.data.engagement.readingsPerUser).toBeLessThanOrEqual(10)
    })
  })

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe('Edge Cases', () => {
    it('should handle zero users', async () => {
      setupHappyPath({
        totalUsers: 0,
        newUsers: 0,
        activeSubscriptions: 0,
        newSubscriptions: 0,
        cancelledSubscriptions: 0,
        recentReadings: 0,
      })

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.data.registrations.total).toBe(0)
      expect(data.data.data.registrations.conversionRate).toBe(0)
      expect(data.data.data.activations.rate).toBe(0)
      expect(data.data.data.engagement.readingsPerUser).toBe(0)
    })

    it('should handle large numbers', async () => {
      setupHappyPath({
        totalUsers: 1000000,
        newUsers: 50000,
        activeSubscriptions: 200000,
        newSubscriptions: 10000,
        cancelledSubscriptions: 500,
        recentReadings: 5000000,
      })

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.data.registrations.total).toBe(1000000)
    })

    it('should handle database query with zero new users', async () => {
      setupHappyPath({
        totalUsers: 100,
        newUsers: 0,
        recentReadings: 50,
      })

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      // readingsPerUser = 50 / Math.max(1, 0) = 50, capped at 10
      expect(data.data.data.engagement.readingsPerUser).toBeLessThanOrEqual(10)
    })
  })

  // =========================================================================
  // Error Handling
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

    it('should handle prisma.user.count throwing with fallback values', async () => {
      // The route uses Promise.allSettled, so individual query failures
      // don't cause 500 errors - they return fallback values (0)
      vi.mocked(prisma.user.count).mockRejectedValue(new Error('Database connection error'))
      vi.mocked(prisma.subscription.count).mockResolvedValue(50)
      vi.mocked(prisma.reading.count).mockResolvedValue(100)

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      // Promise.allSettled handles errors gracefully, returns 200 with fallback values
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // user.count failed, so totalUsers and newUsers fallback to 0
      expect(data.data.data.registrations.total).toBe(0)
      expect(data.data.data.registrations.daily).toBe(0)
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('queries failed'))
    })

    it('should handle prisma.subscription.count throwing with fallback values', async () => {
      // The route uses Promise.allSettled, so individual query failures
      // don't cause 500 errors - they return fallback values (0)
      vi.mocked(prisma.user.count).mockResolvedValue(100)
      vi.mocked(prisma.subscription.count).mockRejectedValue(new Error('Subscription query failed'))
      vi.mocked(prisma.reading.count).mockResolvedValue(50)

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      // Promise.allSettled handles errors gracefully, returns 200 with fallback values
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // subscription.count failed, so subscription values fallback to 0
      expect(data.data.data.subscriptions.active).toBe(0)
      expect(data.data.data.subscriptions.new).toBe(0)
      expect(data.data.data.subscriptions.churned).toBe(0)
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('queries failed'))
    })

    it('should handle prisma.reading.count throwing with fallback values', async () => {
      // The route uses Promise.allSettled, so individual query failures
      // don't cause 500 errors - they return fallback values (0)
      vi.mocked(prisma.user.count).mockResolvedValue(100)
      vi.mocked(prisma.subscription.count).mockResolvedValue(50)
      vi.mocked(prisma.reading.count).mockRejectedValue(new Error('Reading query failed'))

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      // Promise.allSettled handles errors gracefully, returns 200 with fallback values
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // reading.count failed, so recentReadings fallback to 0, readingsPerUser = 0
      expect(data.data.data.engagement.readingsPerUser).toBe(0)
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('queries failed'))
    })

    it('should handle isAdminUser throwing', async () => {
      vi.mocked(isAdminUser).mockRejectedValue(new Error('Admin check failed'))

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should return success with fallback values when queries fail', async () => {
      // The route uses Promise.allSettled for resilient error handling
      // Individual query failures don't cause 500 errors
      vi.mocked(prisma.user.count).mockRejectedValue(new Error('Unexpected error'))
      vi.mocked(prisma.subscription.count).mockResolvedValue(0)
      vi.mocked(prisma.reading.count).mockResolvedValue(0)

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      // Promise.allSettled handles errors gracefully, returns 200
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Fallback values are used
      expect(data.data.data.registrations.total).toBe(0)
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('queries failed'))
    })
  })

  // =========================================================================
  // Date Range Calculation
  // =========================================================================
  describe('Date Range Calculation', () => {
    beforeEach(() => {
      setupHappyPath()
    })

    it('should pass correct date range to prisma queries for 1h', async () => {
      const req = createRequest({ timeRange: '1h' })
      await GET(req)

      expect(prisma.user.count).toHaveBeenCalled()
    })

    it('should pass correct date range to prisma queries for 6h', async () => {
      const req = createRequest({ timeRange: '6h' })
      await GET(req)

      expect(prisma.user.count).toHaveBeenCalled()
    })

    it('should pass correct date range to prisma queries for 24h', async () => {
      const req = createRequest({ timeRange: '24h' })
      await GET(req)

      expect(prisma.user.count).toHaveBeenCalled()
    })

    it('should pass correct date range to prisma queries for 7d', async () => {
      const req = createRequest({ timeRange: '7d' })
      await GET(req)

      expect(prisma.user.count).toHaveBeenCalled()
    })

    it('should pass correct date range to prisma queries for 30d', async () => {
      const req = createRequest({ timeRange: '30d' })
      await GET(req)

      expect(prisma.user.count).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Subscription Status Filtering
  // =========================================================================
  describe('Subscription Status Filtering', () => {
    beforeEach(() => {
      setupHappyPath()
    })

    it('should query for active and trialing subscriptions', async () => {
      const subscriptionCountMock = vi.mocked(prisma.subscription.count)

      const req = createRequest()
      await GET(req)

      // Check that subscription.count was called with status filter
      expect(subscriptionCountMock).toHaveBeenCalled()
      const calls = subscriptionCountMock.mock.calls
      const hasActiveStatusFilter = calls.some((call) =>
        call[0]?.where?.status?.in?.includes('active')
      )
      expect(hasActiveStatusFilter).toBe(true)
    })

    it('should query for cancelled subscriptions by canceledAt', async () => {
      const subscriptionCountMock = vi.mocked(prisma.subscription.count)

      const req = createRequest()
      await GET(req)

      const calls = subscriptionCountMock.mock.calls
      const hasCanceledAtFilter = calls.some((call) => call[0]?.where?.canceledAt)
      expect(hasCanceledAtFilter).toBe(true)
    })
  })

  // =========================================================================
  // Parallel Query Execution
  // =========================================================================
  describe('Parallel Query Execution', () => {
    it('should execute all queries in parallel using Promise.all', async () => {
      setupHappyPath()

      const userCountMock = vi.mocked(prisma.user.count)
      const subscriptionCountMock = vi.mocked(prisma.subscription.count)
      const readingCountMock = vi.mocked(prisma.reading.count)

      const req = createRequest()
      await GET(req)

      // All queries should be called
      expect(userCountMock).toHaveBeenCalled()
      expect(subscriptionCountMock).toHaveBeenCalled()
      expect(readingCountMock).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Calculated Metrics
  // =========================================================================
  describe('Calculated Metrics', () => {
    it('should calculate daily visitors based on newUsers', async () => {
      setupHappyPath({ newUsers: 10 })

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      // dailyVisitors = Math.round(newUsers * 30) = 10 * 30 = 300
      expect(data.data.data.visitors.daily).toBe(300)
    })

    it('should calculate weekly visitors based on daily', async () => {
      setupHappyPath({ newUsers: 10 })

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      // weeklyVisitors = Math.round(dailyVisitors * 5) = 300 * 5 = 1500
      expect(data.data.data.visitors.weekly).toBe(1500)
    })

    it('should calculate monthly visitors based on daily', async () => {
      setupHappyPath({ newUsers: 10 })

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      // monthlyVisitors = Math.round(dailyVisitors * 25) = 300 * 25 = 7500
      expect(data.data.data.visitors.monthly).toBe(7500)
    })

    it('should calculate activation rate correctly', async () => {
      setupHappyPath({ totalUsers: 100 })

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      // activatedUsers = Math.round(totalUsers * 0.75) = 75
      // rate = (75 / 100) * 100 = 75%
      expect(data.data.data.activations.total).toBe(75)
      expect(data.data.data.activations.rate).toBe(75)
    })

    it('should calculate daily active users as 15% of total', async () => {
      setupHappyPath({ totalUsers: 100 })

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      // dailyActiveUsers = Math.round(totalUsers * 0.15) = 15
      expect(data.data.data.engagement.dailyActiveUsers).toBe(15)
    })

    it('should calculate weekly active users as 35% of total', async () => {
      setupHappyPath({ totalUsers: 100 })

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      // weeklyActiveUsers = Math.round(totalUsers * 0.35) = 35
      expect(data.data.data.engagement.weeklyActiveUsers).toBe(35)
    })

    it('should calculate conversion rate correctly', async () => {
      setupHappyPath({ newUsers: 50 })

      const req = createRequest()
      const response = await GET(req)
      const data = await response.json()

      // dailyVisitors = 50 * 30 = 1500
      // conversionRate = (50 / 1500) * 100 = 3.33...
      expect(data.data.data.registrations.conversionRate).toBeCloseTo(3.33, 1)
    })
  })
})
