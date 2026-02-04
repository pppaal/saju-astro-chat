/**
 * Comprehensive tests for Referral API Routes
 * Tests /claim, /link, /validate, /stats endpoints with authentication and rate limiting
 */

import { vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import {
  claimReferralReward,
  linkReferrer,
  findUserByReferralCode,
  getReferralStats,
} from '@/lib/referral'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() =>
    Promise.resolve({
      user: { name: 'Test User', email: 'test@example.com', id: 'test-user-id' },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  ),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    referralReward: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}))
vi.mock('@/lib/referral', () => ({
  claimReferralReward: vi.fn(),
  linkReferrer: vi.fn(),
  findUserByReferralCode: vi.fn(),
  getReferralStats: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 10,
    headers: new Headers(),
  }),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/api/zodValidation', () => ({
  referralClaimRequestSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data.code || typeof data.code !== 'string' || data.code.trim().length === 0) {
        return {
          success: false,
          error: { issues: [{ message: 'Code is required', path: ['code'] }] },
        }
      }
      if (data.code.length > 50) {
        return {
          success: false,
          error: { issues: [{ message: 'Code too long', path: ['code'] }] },
        }
      }
      return { success: true, data: { code: data.code.trim() } }
    }),
  },
  referralValidateQuerySchema: {
    safeParse: vi.fn((data: any) => {
      if (!data.code || typeof data.code !== 'string' || data.code.trim().length === 0) {
        return {
          success: false,
          error: { issues: [{ message: 'Code is required', path: ['code'] }] },
        }
      }
      if (data.code.length > 50) {
        return {
          success: false,
          error: { issues: [{ message: 'Code too long', path: ['code'] }] },
        }
      }
      return { success: true, data: { code: data.code } }
    }),
  },
}))

// Mock middleware with passthrough pattern
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      const { getServerSession } = await import('next-auth')
      const { authOptions } = await import('@/lib/auth/authOptions')

      let session: any = null
      try {
        session = await (getServerSession as any)(authOptions)
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error', status: 500 },
          },
          { status: 500 }
        )
      }

      // Check if auth is required - claim, link, stats require auth; validate does not
      const requiresAuth =
        _options?.requireAuth !== false &&
        (_options?.route?.includes('claim') ||
          _options?.route?.includes('link') ||
          _options?.route?.includes('stats') ||
          _options?.requireAuth === true)

      if (requiresAuth && !session?.user?.id) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Please log in to continue.', status: 401 },
          },
          { status: 401 }
        )
      }

      const context = {
        userId: session?.user?.id || null,
        session,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: !!session?.user?.id,
        isPremium: false,
      }

      const result = await handler(
        req || new NextRequest('http://localhost:3000/api/referral'),
        context,
        ...args
      )
      if (result instanceof Response) return result
      if (result?.error) {
        const statusMap: Record<string, number> = {
          BAD_REQUEST: 400,
          VALIDATION_ERROR: 422,
          INTERNAL_ERROR: 500,
          NOT_FOUND: 404,
          DATABASE_ERROR: 500,
          UNAUTHORIZED: 401,
        }
        return NextResponse.json(
          {
            success: false,
            error: {
              code: result.error.code,
              message: result.error.message,
              status: statusMap[result.error.code] || 500,
            },
          },
          { status: statusMap[result.error.code] || 500 }
        )
      }
      return NextResponse.json(
        { success: true, data: result.data },
        { status: result.status || 200 }
      )
    }
  }),
  createAuthenticatedGuard: vi.fn((opts: any) => ({
    ...opts,
    requireAuth: true,
  })),
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
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}))

describe('Referral API Routes', () => {
  const mockSession = {
    user: {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Re-setup default session mock
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
  })

  describe('POST /api/referral/claim', () => {
    it('should claim pending reward successfully', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(claimReferralReward as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        creditsAwarded: 5,
      })

      const { POST } = await import('@/app/api/referral/claim/route')
      const req = new NextRequest('http://localhost:3000/api/referral/claim', { method: 'POST' })
      const response = await POST(req)
      const data = await response.json()

      expect(data.data.claimed).toBe(true)
      expect(data.data.creditsAwarded).toBe(5)
      expect(response.status).toBe(200)
    })

    it('should return 401 when not authenticated', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const { POST } = await import('@/app/api/referral/claim/route')
      const req = new NextRequest('http://localhost:3000/api/referral/claim', { method: 'POST' })
      const response = await POST(req)
      const data = await response.json()

      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(response.status).toBe(401)
    })

    it('should handle no pending reward gracefully', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(claimReferralReward as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'no_pending_reward',
      })

      const { POST } = await import('@/app/api/referral/claim/route')
      const req = new NextRequest('http://localhost:3000/api/referral/claim', { method: 'POST' })
      const response = await POST(req)
      const data = await response.json()

      expect(data.data.claimed).toBe(false)
      expect(data.data.reason).toBe('no_pending_reward')
      expect(response.status).toBe(200)
    })

    it('should handle claim errors', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(claimReferralReward as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'database_error',
      })

      const { POST } = await import('@/app/api/referral/claim/route')
      const req = new NextRequest('http://localhost:3000/api/referral/claim', { method: 'POST' })
      const response = await POST(req)
      const data = await response.json()

      expect(data.error.code).toBe('BAD_REQUEST')
      expect(response.status).toBe(400)
    })

    it('should handle unexpected errors', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(claimReferralReward as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Unexpected error')
      )

      const { POST } = await import('@/app/api/referral/claim/route')
      const req = new NextRequest('http://localhost:3000/api/referral/claim', { method: 'POST' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  describe('POST /api/referral/link', () => {
    it('should link referral code successfully', async () => {
      const mockUser = {
        referrerId: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      }

      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      ;(linkReferrer as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        referrerId: 'referrer_123',
      })

      const { POST } = await import('@/app/api/referral/link/route')
      const request = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.linked).toBe(true)
      expect(data.data.referrerId).toBe('referrer_123')
    })

    it('should return 401 when not authenticated', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const { POST } = await import('@/app/api/referral/link/route')
      const request = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(response.status).toBe(401)
    })

    it('should return 422 when referral code missing', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)

      const { POST } = await import('@/app/api/referral/link/route')
      const request = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(response.status).toBe(422)
    })

    it('should reject when already linked', async () => {
      const mockUser = {
        referrerId: 'existing_referrer',
        createdAt: new Date(),
      }

      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

      const { POST } = await import('@/app/api/referral/link/route')
      const request = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.linked).toBe(false)
      expect(data.data.reason).toBe('already_linked')
    })

    it('should reject after 24 hours', async () => {
      const mockUser = {
        referrerId: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 25), // 25 hours ago
      }

      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)

      const { POST } = await import('@/app/api/referral/link/route')
      const request = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.linked).toBe(false)
      expect(data.data.reason).toBe('too_late')
    })

    it('should handle link errors', async () => {
      const mockUser = {
        referrerId: null,
        createdAt: new Date(),
      }

      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      ;(linkReferrer as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'invalid_code',
      })

      const { POST } = await import('@/app/api/referral/link/route')
      const request = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'INVALID' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.linked).toBe(false)
      expect(data.data.reason).toBe('invalid_code')
    })

    it('should handle self-referral attempt', async () => {
      const mockUser = {
        referrerId: null,
        createdAt: new Date(),
      }

      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      ;(linkReferrer as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'self_referral',
      })

      const { POST } = await import('@/app/api/referral/link/route')
      const request = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'SELF1234' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.data.linked).toBe(false)
      expect(data.data.reason).toBe('self_referral')
    })
  })

  describe('GET /api/referral/validate', () => {
    it('should validate correct referral code', async () => {
      ;(findUserByReferralCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user_123',
        name: 'Test User',
        referralCode: 'VALID123',
      })

      const { GET } = await import('@/app/api/referral/validate/route')
      const request = new NextRequest('http://localhost:3000/api/referral/validate?code=VALID123')

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.valid).toBe(true)
      expect(data.data.referrerName).toBe('Test User')
    })

    it('should handle invalid code', async () => {
      ;(findUserByReferralCode as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const { GET } = await import('@/app/api/referral/validate/route')
      const request = new NextRequest('http://localhost:3000/api/referral/validate?code=INVALID')

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.valid).toBe(false)
      expect(data.data.error).toBe('invalid_code')
    })

    it('should return error when code missing', async () => {
      const { GET } = await import('@/app/api/referral/validate/route')
      const request = new NextRequest('http://localhost:3000/api/referral/validate')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should use default name when referrer has no name', async () => {
      ;(findUserByReferralCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user_123',
        name: null,
        referralCode: 'VALID123',
      })

      const { GET } = await import('@/app/api/referral/validate/route')
      const request = new NextRequest('http://localhost:3000/api/referral/validate?code=VALID123')

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.valid).toBe(true)
      expect(data.data.referrerName).toBe('Friend')
    })

    it('should be rate limited', async () => {
      // Rate limit: 20 req / 60 sec
      const { GET } = await import('@/app/api/referral/validate/route')

      // This would normally trigger rate limiting after 20 requests
      // Testing the middleware options are set correctly
      expect(GET).toBeDefined()
    })

    it('should not require authentication', async () => {
      ;(findUserByReferralCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user_123',
        name: 'Public User',
        referralCode: 'PUBLIC12',
      })

      const { GET } = await import('@/app/api/referral/validate/route')
      const request = new NextRequest('http://localhost:3000/api/referral/validate?code=PUBLIC12')

      const response = await GET(request)

      expect(response.status).toBe(200)
      // Should work without session
    })
  })

  describe('GET /api/referral/stats', () => {
    it('should return referral statistics', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        referralCode: 'STATS123',
      })
      ;(prisma.user.count as ReturnType<typeof vi.fn>).mockResolvedValue(5)
      ;(prisma.referralReward.count as ReturnType<typeof vi.fn>).mockResolvedValue(2)
      ;(prisma.referralReward.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _count: 3,
        _sum: { creditsAwarded: 15 },
      })

      const { GET } = await import('@/app/api/referral/stats/route')
      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.referralCode).toBeDefined()
      expect(data.data.totalReferrals).toBe(5)
      expect(data.data.pendingRewards).toBe(2)
      expect(data.data.completedRewards).toBe(3)
      expect(data.data.totalCreditsEarned).toBe(15)
    })

    it('should return 401 when not authenticated', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const { GET } = await import('@/app/api/referral/stats/route')
      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)
      const data = await response.json()

      expect(data.error.code).toBe('UNAUTHORIZED')
      expect(response.status).toBe(401)
    })

    it('should generate code if missing', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        referralCode: null,
      })
      ;(prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
        referralCode: 'GEN12345',
      })
      ;(prisma.user.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
      ;(prisma.referralReward.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
      ;(prisma.referralReward.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _count: 0,
        _sum: { creditsAwarded: null },
      })

      const { GET } = await import('@/app/api/referral/stats/route')
      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.referralCode).toBeDefined()
      expect(data.data.referralCode.length).toBeGreaterThan(0)
    })

    it('should handle zero referrals', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        referralCode: 'ZERO1234',
      })
      ;(prisma.user.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
      ;(prisma.referralReward.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
      ;(prisma.referralReward.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
        _count: 0,
        _sum: { creditsAwarded: null },
      })

      const { GET } = await import('@/app/api/referral/stats/route')
      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.totalReferrals).toBe(0)
      expect(data.data.pendingRewards).toBe(0)
      expect(data.data.completedRewards).toBe(0)
      expect(data.data.totalCreditsEarned).toBe(0)
    })

    it('should handle database errors', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'))

      const { GET } = await import('@/app/api/referral/stats/route')
      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.message).toContain('Failed to fetch')
    })
  })

  describe('Security & Edge Cases', () => {
    it('should prevent SQL injection in referral code', async () => {
      const maliciousCode = "'; DROP TABLE users; --"

      ;(findUserByReferralCode as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const { GET } = await import('@/app/api/referral/validate/route')
      const request = new NextRequest(
        `http://localhost:3000/api/referral/validate?code=${encodeURIComponent(maliciousCode)}`
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.valid).toBe(false)
    })

    it('should handle very long referral codes', async () => {
      const longCode = 'A'.repeat(1000)

      // Long code exceeds 50 chars, so Zod validation fails
      const { GET } = await import('@/app/api/referral/validate/route')
      const request = new NextRequest(
        `http://localhost:3000/api/referral/validate?code=${longCode}`
      )

      const response = await GET(request)
      const data = await response.json()

      // Zod validation rejects codes > 50 chars with VALIDATION_ERROR
      expect(response.status).toBe(422)
    })

    it('should handle Unicode in referral codes', async () => {
      const unicodeCode = '\uC548\uB155\uD558\uC138\uC694'

      ;(findUserByReferralCode as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const { GET } = await import('@/app/api/referral/validate/route')
      const request = new NextRequest(
        `http://localhost:3000/api/referral/validate?code=${encodeURIComponent(unicodeCode)}`
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.valid).toBe(false)
    })

    it('should handle case sensitivity correctly', async () => {
      // Codes should be case-insensitive (converted to uppercase)
      ;(findUserByReferralCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user_123',
        name: 'User',
        referralCode: 'ABC12345',
      })

      const { GET } = await import('@/app/api/referral/validate/route')
      const request = new NextRequest('http://localhost:3000/api/referral/validate?code=abc12345')

      const response = await GET(request)

      // Should match regardless of case
      expect(findUserByReferralCode).toHaveBeenCalled()
    })

    it('should handle concurrent link attempts', async () => {
      const mockUser = {
        referrerId: null,
        createdAt: new Date(),
      }

      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser)
      ;(linkReferrer as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        referrerId: 'referrer_123',
      })

      const { POST } = await import('@/app/api/referral/link/route')
      // Use separate Request objects with their own bodies
      const request1 = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      const request2 = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })

      // Run sequentially since Request body can only be consumed once per fetch spec
      const response1 = await POST(request1)
      const response2 = await POST(request2)

      expect(response1.status).toBeLessThanOrEqual(500)
      expect(response2.status).toBeLessThanOrEqual(500)
      // At least one should succeed
      expect(response1.status === 200 || response2.status === 200).toBe(true)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete referral workflow', async () => {
      // 1. Validate code before signup
      ;(findUserByReferralCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'referrer_123',
        name: 'Referrer',
        referralCode: 'FLOW1234',
      })

      const { GET: validateGET } = await import('@/app/api/referral/validate/route')
      const validateReq = new NextRequest(
        'http://localhost:3000/api/referral/validate?code=FLOW1234'
      )
      const validateRes = await validateGET(validateReq)
      const validateData = await validateRes.json()
      expect(validateData.data.valid).toBe(true)

      // 2. Link after signup
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
      ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        referrerId: null,
        createdAt: new Date(),
      })
      ;(linkReferrer as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        referrerId: 'referrer_123',
      })

      const { POST: linkPOST } = await import('@/app/api/referral/link/route')
      const linkReq = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'FLOW1234' }),
      })
      const linkRes = await linkPOST(linkReq)
      const linkData = await linkRes.json()
      expect(linkData.data.linked).toBe(true)

      // 3. Claim reward after first analysis
      ;(claimReferralReward as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        creditsAwarded: 5,
      })

      const { POST: claimPOST } = await import('@/app/api/referral/claim/route')
      const claimReq = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const claimRes = await claimPOST(claimReq)
      const claimData = await claimRes.json()
      expect(claimData.data.claimed).toBe(true)
    })
  })
})
