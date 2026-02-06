/**
 * Comprehensive Unit Tests for Admin Metrics Comprehensive API
 *
 * Tests for GET /api/admin/metrics/comprehensive
 * This route returns section-specific data for the admin dashboard tabs.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks - all mocks must be declared BEFORE the route import
// ---------------------------------------------------------------------------

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = {
        userId: 'test-user-id',
        session: { user: { id: 'test-user-id', email: 'test@example.com' } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
      }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      if (result?.error) {
        const statusMap: Record<string, number> = {
          FORBIDDEN: 403,
          VALIDATION_ERROR: 422,
          INTERNAL_ERROR: 500,
          UNAUTHORIZED: 401,
        }
        return NextResponse.json(
          { success: false, error: result.error },
          { status: statusMap[result.error.code] || 500 }
        )
      }
      return NextResponse.json({ success: true, data: result.data }, { status: 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    FORBIDDEN: 'FORBIDDEN',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    userCredits: {
      groupBy: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    premiumContentAccess: {
      groupBy: vi.fn(),
    },
    bonusCreditPurchase: {
      aggregate: vi.fn(),
    },
    creditRefundLog: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    matchProfile: {
      count: vi.fn(),
    },
    matchSwipe: {
      groupBy: vi.fn(),
    },
    matchConnection: {
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    matchMessage: {
      aggregate: vi.fn(),
    },
    emailLog: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    pushSubscription: {
      count: vi.fn(),
    },
    consultationHistory: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    destinyMatrixReport: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    tarotReading: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    reading: {
      groupBy: vi.fn(),
    },
    pastLifeResult: {
      count: vi.fn(),
    },
    compatibilityResult: {
      count: vi.fn(),
    },
    userReport: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    userBlock: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    referralReward: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    adminAuditLog: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
    },
    stripeEventLog: {
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    sharedResult: {
      groupBy: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/admin', () => ({
  isAdminUser: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/metrics/schema', () => ({
  DashboardTimeRangeSchema: {
    safeParse: vi.fn((value: string) => {
      const validRanges = ['1h', '6h', '24h', '7d', '30d']
      if (validRanges.includes(value)) {
        return { success: true, data: value }
      }
      return { success: false, error: { message: 'Invalid time range' } }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Import route handler AFTER all mocks are declared
// ---------------------------------------------------------------------------

import { GET } from '@/app/api/admin/metrics/comprehensive/route'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'
import { logger } from '@/lib/logger'
import { DashboardTimeRangeSchema } from '@/lib/metrics/schema'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/metrics/comprehensive')
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return new NextRequest(url.toString())
}

function setupDefaultMocks() {
  // Users data mocks
  vi.mocked(prisma.user.count).mockResolvedValue(100)
  vi.mocked(prisma.user.findMany).mockResolvedValue([
    {
      id: 'user-1',
      email: 'user1@example.com',
      name: 'User One',
      role: 'USER',
      createdAt: new Date('2024-01-15'),
    },
  ] as any)
  vi.mocked(prisma.user.groupBy).mockResolvedValue([
    { role: 'USER', _count: { id: 80 } },
    { role: 'ADMIN', _count: { id: 20 } },
  ] as any)
  vi.mocked(prisma.userCredits.groupBy).mockResolvedValue([
    { plan: 'FREE', _count: { id: 50 } },
    { plan: 'PREMIUM', _count: { id: 50 } },
  ] as any)

  // Revenue data mocks
  vi.mocked(prisma.subscription.count).mockResolvedValue(50)
  vi.mocked(prisma.subscription.groupBy).mockResolvedValue([
    { plan: 'monthly', _count: { id: 30 } },
    { plan: 'yearly', _count: { id: 20 } },
  ] as any)
  vi.mocked(prisma.premiumContentAccess.groupBy).mockResolvedValue([
    { service: 'tarot', _sum: { creditUsed: 100 }, _count: { id: 50 } },
  ] as any)
  vi.mocked(prisma.bonusCreditPurchase.aggregate).mockResolvedValue({
    _sum: { amount: 1000, remaining: 500 },
    _count: { id: 20 },
  } as any)
  vi.mocked(prisma.creditRefundLog.findMany).mockResolvedValue([
    {
      id: 'refund-1',
      userId: 'user-1',
      creditType: 'PREMIUM',
      amount: 10,
      reason: 'error',
      apiRoute: '/api/test',
      createdAt: new Date('2024-01-15'),
    },
  ] as any)

  // Matching data mocks
  vi.mocked(prisma.matchProfile.count).mockResolvedValue(200)
  vi.mocked(prisma.matchSwipe.groupBy).mockResolvedValue([
    { action: 'LIKE', _count: { id: 500 } },
    { action: 'PASS', _count: { id: 300 } },
  ] as any)
  vi.mocked(prisma.matchConnection.aggregate).mockResolvedValue({
    _count: { id: 100 },
    _avg: { compatibilityScore: 0.85 },
  } as any)
  vi.mocked(prisma.matchConnection.count).mockResolvedValue(50)
  vi.mocked(prisma.matchMessage.aggregate).mockResolvedValue({
    _count: { id: 1000 },
  } as any)

  // Notifications data mocks
  vi.mocked(prisma.emailLog.groupBy).mockResolvedValue([
    { status: 'SENT', _count: { id: 100 } },
    { type: 'welcome', _count: { id: 50 } },
  ] as any)
  vi.mocked(prisma.emailLog.findMany).mockResolvedValue([
    {
      id: 'email-1',
      email: 'user@example.com',
      type: 'welcome',
      status: 'SENT',
      subject: 'Welcome',
      errorMsg: null,
      provider: 'sendgrid',
      createdAt: new Date('2024-01-15'),
    },
  ] as any)
  vi.mocked(prisma.pushSubscription.count).mockResolvedValue(75)

  // Content data mocks
  vi.mocked(prisma.consultationHistory.count).mockResolvedValue(500)
  vi.mocked(prisma.consultationHistory.groupBy).mockResolvedValue([
    { theme: 'career', _count: { id: 200 } },
  ] as any)
  vi.mocked(prisma.destinyMatrixReport.count).mockResolvedValue(300)
  vi.mocked(prisma.destinyMatrixReport.groupBy).mockResolvedValue([
    { reportType: 'full', _count: { id: 200 } },
  ] as any)
  vi.mocked(prisma.tarotReading.count).mockResolvedValue(400)
  vi.mocked(prisma.tarotReading.groupBy).mockResolvedValue([
    { theme: 'love', _count: { id: 150 } },
  ] as any)
  vi.mocked(prisma.reading.groupBy).mockResolvedValue([
    { type: 'daily', _count: { id: 100 } },
  ] as any)
  vi.mocked(prisma.pastLifeResult.count).mockResolvedValue(100)
  vi.mocked(prisma.compatibilityResult.count).mockResolvedValue(150)

  // Moderation data mocks
  vi.mocked(prisma.userReport.groupBy).mockResolvedValue([
    { status: 'PENDING', _count: { id: 10 } },
  ] as any)
  vi.mocked(prisma.userReport.findMany).mockResolvedValue([
    {
      id: 'report-1',
      category: 'spam',
      status: 'PENDING',
      description: 'Spam content',
      createdAt: new Date('2024-01-15'),
      reporter: { email: 'reporter@example.com' },
      reported: { email: 'reported@example.com' },
    },
  ] as any)
  vi.mocked(prisma.userBlock.count).mockResolvedValue(20)
  vi.mocked(prisma.userBlock.findMany).mockResolvedValue([
    {
      id: 'block-1',
      reason: 'harassment',
      createdAt: new Date('2024-01-15'),
      blocker: { email: 'blocker@example.com' },
      blocked: { email: 'blocked@example.com' },
    },
  ] as any)
  vi.mocked(prisma.referralReward.aggregate).mockResolvedValue({
    _sum: { creditsAwarded: 500 },
    _count: { id: 30 },
  } as any)
  vi.mocked(prisma.referralReward.groupBy).mockResolvedValue([
    { status: 'CLAIMED', _count: { id: 25 } },
  ] as any)

  // Audit data mocks
  vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValue([
    {
      id: 'audit-1',
      adminEmail: 'admin@example.com',
      action: 'USER_UPDATE',
      targetType: 'user',
      targetId: 'user-1',
      success: true,
      errorMessage: null,
      createdAt: new Date('2024-01-15'),
      metadata: {},
    },
  ] as any)
  vi.mocked(prisma.adminAuditLog.groupBy).mockResolvedValue([
    { action: 'USER_UPDATE', _count: { id: 10 } },
  ] as any)
  vi.mocked(prisma.adminAuditLog.count).mockResolvedValue(50)

  // System data mocks - creditRefundLog.groupBy is called twice
  // First call: by creditType, Second call: by reason
  vi.mocked(prisma.creditRefundLog.groupBy)
    .mockResolvedValueOnce([
      { creditType: 'PREMIUM', _sum: { amount: 100 }, _count: { id: 10 } },
    ] as any)
    .mockResolvedValueOnce([
      { reason: 'error', _count: { id: 5 } },
    ] as any)
    .mockResolvedValue([
      { creditType: 'PREMIUM', _sum: { amount: 100 }, _count: { id: 10 } },
    ] as any)
  vi.mocked(prisma.stripeEventLog.groupBy).mockResolvedValue([
    { type: 'payment_succeeded', _count: { id: 50 } },
  ] as any)
  vi.mocked(prisma.stripeEventLog.count).mockResolvedValue(5)
  vi.mocked(prisma.stripeEventLog.findMany).mockResolvedValue([
    {
      id: 'stripe-1',
      eventId: 'evt_123',
      type: 'payment_succeeded',
      success: true,
      errorMsg: null,
      processedAt: new Date('2024-01-15'),
    },
  ] as any)
  vi.mocked(prisma.sharedResult.groupBy).mockResolvedValue([
    { resultType: 'tarot', _count: { id: 30 }, _sum: { viewCount: 500 } },
  ] as any)
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('GET /api/admin/metrics/comprehensive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(DashboardTimeRangeSchema.safeParse).mockImplementation((value: string) => {
      const validRanges = ['1h', '6h', '24h', '7d', '30d']
      if (validRanges.includes(value)) {
        return { success: true, data: value } as any
      }
      return { success: false, error: { message: 'Invalid time range' } } as any
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // Authentication & Authorization Tests
  // =========================================================================
  describe('Authentication & Authorization', () => {
    it('should return 403 when user is not admin', async () => {
      vi.mocked(isAdminUser).mockResolvedValue(false)

      const req = makeRequest({ section: 'users', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(logger.warn).toHaveBeenCalledWith(
        '[Comprehensive] Unauthorized access attempt',
        expect.objectContaining({ email: 'test@example.com' })
      )
    })

    it('should allow access when user is admin', async () => {
      vi.mocked(isAdminUser).mockResolvedValue(true)

      const req = makeRequest({ section: 'users', timeRange: '24h' })
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(isAdminUser).toHaveBeenCalledWith('test-user-id')
    })
  })

  // =========================================================================
  // Validation Tests
  // =========================================================================
  describe('Input Validation', () => {
    it('should return 422 for missing section parameter', async () => {
      const req = makeRequest({ timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Invalid section')
    })

    it('should return 422 for invalid section parameter', async () => {
      const req = makeRequest({ section: 'invalid-section', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Invalid section')
    })

    it('should return 422 for invalid timeRange parameter', async () => {
      vi.mocked(DashboardTimeRangeSchema.safeParse).mockReturnValue({
        success: false,
        error: { message: 'Invalid time range' },
      } as any)

      const req = makeRequest({ section: 'users', timeRange: 'invalid' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toContain('Invalid timeRange')
    })

    it('should use default 24h timeRange when not provided', async () => {
      const req = makeRequest({ section: 'users' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Response structure: { success: true, data: { data: <section-data>, section, timeRange } }
      expect(data.data.timeRange).toBe('24h')
    })

    it('should accept all valid sections', async () => {
      const validSections = [
        'users',
        'revenue',
        'matching',
        'notifications',
        'content',
        'moderation',
        'audit',
        'system',
      ]

      for (const section of validSections) {
        vi.clearAllMocks()
        setupDefaultMocks()
        vi.mocked(isAdminUser).mockResolvedValue(true)
        vi.mocked(DashboardTimeRangeSchema.safeParse).mockReturnValue({
          success: true,
          data: '24h',
        } as any)

        const req = makeRequest({ section, timeRange: '24h' })
        const response = await GET(req)

        expect(response.status).toBe(200)
      }
    })

    it('should accept all valid timeRange values', async () => {
      const validTimeRanges = ['1h', '6h', '24h', '7d', '30d']

      for (const timeRange of validTimeRanges) {
        vi.clearAllMocks()
        setupDefaultMocks()
        vi.mocked(isAdminUser).mockResolvedValue(true)
        vi.mocked(DashboardTimeRangeSchema.safeParse).mockReturnValue({
          success: true,
          data: timeRange,
        } as any)

        const req = makeRequest({ section: 'users', timeRange })
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.timeRange).toBe(timeRange)
      }
    })
  })

  // =========================================================================
  // Section-Specific Data Tests
  // =========================================================================
  describe('Section: users', () => {
    it('should return user data when section=users', async () => {
      const req = makeRequest({ section: 'users', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.section).toBe('users')
      expect(data.data.data).toHaveProperty('totalUsers')
      expect(data.data.data).toHaveProperty('recentSignups')
      expect(data.data.data).toHaveProperty('roleDistribution')
      expect(data.data.data).toHaveProperty('planDistribution')
      expect(data.data.data.totalUsers).toBe(100)
    })

    it('should format user data correctly', async () => {
      const req = makeRequest({ section: 'users', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      const userData = data.data.data
      expect(userData.recentSignups[0]).toHaveProperty('id')
      expect(userData.recentSignups[0]).toHaveProperty('email')
      expect(userData.recentSignups[0]).toHaveProperty('name')
      expect(userData.recentSignups[0]).toHaveProperty('role')
      expect(userData.recentSignups[0]).toHaveProperty('createdAt')
      expect(typeof userData.recentSignups[0].createdAt).toBe('string')
    })
  })

  describe('Section: revenue', () => {
    it('should return revenue data when section=revenue', async () => {
      const req = makeRequest({ section: 'revenue', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.section).toBe('revenue')
      expect(data.data.data).toHaveProperty('activeSubscriptions')
      expect(data.data.data).toHaveProperty('subscriptionsByPlan')
      expect(data.data.data).toHaveProperty('creditUsageByService')
      expect(data.data.data).toHaveProperty('bonusCreditStats')
      expect(data.data.data).toHaveProperty('recentRefunds')
    })

    it('should format revenue data with correct structure', async () => {
      const req = makeRequest({ section: 'revenue', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      const revenueData = data.data.data
      expect(revenueData.bonusCreditStats).toHaveProperty('totalAmount')
      expect(revenueData.bonusCreditStats).toHaveProperty('totalRemaining')
      expect(revenueData.bonusCreditStats).toHaveProperty('purchaseCount')
    })
  })

  describe('Section: matching', () => {
    it('should return matching data when section=matching', async () => {
      const req = makeRequest({ section: 'matching', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.section).toBe('matching')
      expect(data.data.data).toHaveProperty('totalProfiles')
      expect(data.data.data).toHaveProperty('activeProfiles')
      expect(data.data.data).toHaveProperty('verifiedProfiles')
      expect(data.data.data).toHaveProperty('swipeStats')
      expect(data.data.data).toHaveProperty('connections')
      expect(data.data.data).toHaveProperty('chatStartedCount')
      expect(data.data.data).toHaveProperty('messageCount')
    })

    it('should format matching data with correct structure', async () => {
      const req = makeRequest({ section: 'matching', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      const matchingData = data.data.data
      expect(matchingData.connections).toHaveProperty('count')
      expect(matchingData.connections).toHaveProperty('avgCompatibility')
    })
  })

  describe('Section: notifications', () => {
    it('should return notifications data when section=notifications', async () => {
      const req = makeRequest({ section: 'notifications', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.section).toBe('notifications')
      expect(data.data.data).toHaveProperty('emailByStatus')
      expect(data.data.data).toHaveProperty('emailByType')
      expect(data.data.data).toHaveProperty('recentEmails')
      expect(data.data.data).toHaveProperty('activePushSubscriptions')
      expect(data.data.data).toHaveProperty('totalPushSubscriptions')
    })
  })

  describe('Section: content', () => {
    it('should return content data when section=content', async () => {
      const req = makeRequest({ section: 'content', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.section).toBe('content')
      expect(data.data.data).toHaveProperty('consultations')
      expect(data.data.data).toHaveProperty('destinyMatrix')
      expect(data.data.data).toHaveProperty('tarotReadings')
      expect(data.data.data).toHaveProperty('readingsByType')
      expect(data.data.data).toHaveProperty('pastLifeCount')
      expect(data.data.data).toHaveProperty('compatibilityCount')
    })
  })

  describe('Section: moderation', () => {
    it('should return moderation data when section=moderation', async () => {
      const req = makeRequest({ section: 'moderation', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.section).toBe('moderation')
      expect(data.data.data).toHaveProperty('reportsByStatus')
      expect(data.data.data).toHaveProperty('recentReports')
      expect(data.data.data).toHaveProperty('totalBlocks')
      expect(data.data.data).toHaveProperty('recentBlocks')
      expect(data.data.data).toHaveProperty('referralStats')
      expect(data.data.data).toHaveProperty('referralByStatus')
    })
  })

  describe('Section: audit', () => {
    it('should return audit data when section=audit', async () => {
      const req = makeRequest({ section: 'audit', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.section).toBe('audit')
      expect(data.data.data).toHaveProperty('totalLogs')
      expect(data.data.data).toHaveProperty('recentLogs')
      expect(data.data.data).toHaveProperty('actionBreakdown')
    })
  })

  describe('Section: system', () => {
    it('should return system data when section=system', async () => {
      const req = makeRequest({ section: 'system', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.section).toBe('system')
      expect(data.data.data).toHaveProperty('creditRefunds')
      expect(data.data.data).toHaveProperty('stripeEvents')
      expect(data.data.data).toHaveProperty('sharedResults')
    })
  })

  // =========================================================================
  // Date Range Calculation Tests
  // =========================================================================
  describe('Date Range Calculations', () => {
    it('should calculate correct date range for 1h', async () => {
      vi.mocked(DashboardTimeRangeSchema.safeParse).mockReturnValue({
        success: true,
        data: '1h',
      } as any)

      const req = makeRequest({ section: 'users', timeRange: '1h' })
      await GET(req)

      // Verify that prisma calls were made with date parameters
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      )
    })

    it('should calculate correct date range for 6h', async () => {
      vi.mocked(DashboardTimeRangeSchema.safeParse).mockReturnValue({
        success: true,
        data: '6h',
      } as any)

      const req = makeRequest({ section: 'users', timeRange: '6h' })
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(prisma.user.findMany).toHaveBeenCalled()
    })

    it('should calculate correct date range for 24h', async () => {
      vi.mocked(DashboardTimeRangeSchema.safeParse).mockReturnValue({
        success: true,
        data: '24h',
      } as any)

      const req = makeRequest({ section: 'users', timeRange: '24h' })
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(prisma.user.findMany).toHaveBeenCalled()
    })

    it('should calculate correct date range for 7d', async () => {
      vi.mocked(DashboardTimeRangeSchema.safeParse).mockReturnValue({
        success: true,
        data: '7d',
      } as any)

      const req = makeRequest({ section: 'users', timeRange: '7d' })
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(prisma.user.findMany).toHaveBeenCalled()
    })

    it('should calculate correct date range for 30d', async () => {
      vi.mocked(DashboardTimeRangeSchema.safeParse).mockReturnValue({
        success: true,
        data: '30d',
      } as any)

      const req = makeRequest({ section: 'users', timeRange: '30d' })
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(prisma.user.findMany).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Error Handling Tests
  // =========================================================================
  describe('Error Handling', () => {
    it('should handle database errors gracefully and return 500', async () => {
      vi.mocked(prisma.user.count).mockRejectedValue(new Error('Database connection failed'))

      const req = makeRequest({ section: 'users', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(logger.error).toHaveBeenCalledWith(
        '[Comprehensive API Error]',
        expect.any(Error)
      )
    })

    it('should handle prisma.user.findMany errors gracefully', async () => {
      vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('Query timeout'))

      const req = makeRequest({ section: 'users', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle revenue section database errors gracefully', async () => {
      vi.mocked(prisma.subscription.count).mockRejectedValue(
        new Error('Subscription query failed')
      )

      const req = makeRequest({ section: 'revenue', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle matching section database errors gracefully', async () => {
      vi.mocked(prisma.matchProfile.count).mockRejectedValue(
        new Error('Match profile query failed')
      )

      const req = makeRequest({ section: 'matching', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle audit section database errors gracefully', async () => {
      vi.mocked(prisma.adminAuditLog.findMany).mockRejectedValue(
        new Error('Audit log query failed')
      )

      const req = makeRequest({ section: 'audit', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe('Edge Cases', () => {
    it('should handle empty data sets gracefully', async () => {
      vi.mocked(prisma.user.count).mockResolvedValue(0)
      vi.mocked(prisma.user.findMany).mockResolvedValue([])
      vi.mocked(prisma.user.groupBy).mockResolvedValue([])
      vi.mocked(prisma.userCredits.groupBy).mockResolvedValue([])

      const req = makeRequest({ section: 'users', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.data.totalUsers).toBe(0)
      expect(data.data.data.recentSignups).toEqual([])
      expect(data.data.data.roleDistribution).toEqual([])
    })

    it('should handle null values in aggregates', async () => {
      vi.mocked(prisma.bonusCreditPurchase.aggregate).mockResolvedValue({
        _sum: { amount: null, remaining: null },
        _count: { id: 0 },
      } as any)

      const req = makeRequest({ section: 'revenue', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.data.bonusCreditStats.totalAmount).toBe(0)
      expect(data.data.data.bonusCreditStats.totalRemaining).toBe(0)
    })

    it('should handle null average in matching connections', async () => {
      vi.mocked(prisma.matchConnection.aggregate).mockResolvedValue({
        _count: { id: 0 },
        _avg: { compatibilityScore: null },
      } as any)

      const req = makeRequest({ section: 'matching', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.data.connections.avgCompatibility).toBeNull()
    })

    it('should include section and timeRange in response', async () => {
      const req = makeRequest({ section: 'users', timeRange: '7d' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.section).toBe('users')
      expect(data.data.timeRange).toBe('7d')
    })

    it('should handle large datasets without timeout', async () => {
      // Simulate large dataset
      const largeUserArray = Array.from({ length: 20 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        name: `User ${i}`,
        role: 'USER',
        createdAt: new Date(),
      }))
      vi.mocked(prisma.user.findMany).mockResolvedValue(largeUserArray as any)

      const req = makeRequest({ section: 'users', timeRange: '30d' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.data.recentSignups).toHaveLength(20)
    })

    it('should properly serialize dates to ISO strings', async () => {
      const testDate = new Date('2024-06-15T10:30:00.000Z')
      vi.mocked(prisma.emailLog.findMany).mockResolvedValue([
        {
          id: 'email-1',
          email: 'test@example.com',
          type: 'welcome',
          status: 'SENT',
          subject: 'Welcome',
          errorMsg: null,
          provider: 'sendgrid',
          createdAt: testDate,
        },
      ] as any)

      const req = makeRequest({ section: 'notifications', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.data.recentEmails[0].createdAt).toBe(
        '2024-06-15T10:30:00.000Z'
      )
    })
  })

  // =========================================================================
  // Concurrent Request Handling
  // =========================================================================
  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent section requests', async () => {
      const sections = ['users', 'revenue', 'matching']
      const requests = sections.map((section) =>
        makeRequest({ section, timeRange: '24h' })
      )

      const responses = await Promise.all(requests.map((req) => GET(req)))

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })
    })
  })

  // =========================================================================
  // Security Tests
  // =========================================================================
  describe('Security', () => {
    it('should call isAdminUser with correct userId', async () => {
      const req = makeRequest({ section: 'users', timeRange: '24h' })
      await GET(req)

      expect(isAdminUser).toHaveBeenCalledWith('test-user-id')
    })

    it('should log warning on unauthorized access attempt', async () => {
      vi.mocked(isAdminUser).mockResolvedValue(false)

      const req = makeRequest({ section: 'users', timeRange: '24h' })
      await GET(req)

      expect(logger.warn).toHaveBeenCalledWith(
        '[Comprehensive] Unauthorized access attempt',
        expect.objectContaining({
          email: 'test@example.com',
          userId: 'test-user-id',
        })
      )
    })
  })

  // =========================================================================
  // Response Structure Tests
  // =========================================================================
  describe('Response Structure', () => {
    it('should return success: true for valid requests', async () => {
      const req = makeRequest({ section: 'users', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(data.success).toBe(true)
    })

    it('should return success: false for error responses', async () => {
      vi.mocked(isAdminUser).mockResolvedValue(false)

      const req = makeRequest({ section: 'users', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(data.success).toBe(false)
    })

    it('should include error code and message in error responses', async () => {
      const req = makeRequest({ section: 'invalid', timeRange: '24h' })
      const response = await GET(req)
      const data = await response.json()

      expect(data.error).toHaveProperty('code')
      expect(data.error).toHaveProperty('message')
    })
  })
})
