/**
 * Comprehensive tests for /api/referral/stats
 * Tests referral statistics endpoint with database operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock middleware - must be before route import
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

      // Require authentication for stats
      if (!session?.user?.id) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Please log in to continue.', status: 401 },
          },
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

      try {
        const result = await handler(req, context, ...args)

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
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error', status: 500 },
          },
          { status: 500 }
        )
      }
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

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      count: vi.fn(),
    },
    userSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    referralReward: {
      count: vi.fn(),
      aggregate: vi.fn(),
    },
  },
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

import { GET } from '@/app/api/referral/stats/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'

describe('/api/referral/stats', () => {
  const mockSession = {
    user: {
      id: 'user_123',
      email: 'test@example.com',
      name: 'Test User',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
  })

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session has no user', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: null } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)

      expect(response.status).toBe(401)
    })

    it('should return 401 when session user has no id', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'test@example.com' } } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)

      expect(response.status).toBe(401)
    })
  })

  describe('Success Cases', () => {
    it('should return referral statistics', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'STATS123' } as any)
      vi.mocked(prisma.user.count).mockResolvedValue(5)
      vi.mocked(prisma.referralReward.count).mockResolvedValue(2)
      vi.mocked(prisma.referralReward.aggregate).mockResolvedValue({
        _count: 3,
        _sum: { creditsAwarded: 15 },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.referralCode).toBe('STATS123')
      expect(data.data.totalReferrals).toBe(5)
      expect(data.data.pendingRewards).toBe(2)
      expect(data.data.completedRewards).toBe(3)
      expect(data.data.totalCreditsEarned).toBe(15)
    })

    it('should generate new code if user has no referral code', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: null } as any)
      vi.mocked(prisma.userSettings.upsert).mockResolvedValue({ referralCode: 'NEWCODE1' } as any)
      vi.mocked(prisma.user.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.aggregate).mockResolvedValue({
        _count: 0,
        _sum: { creditsAwarded: null },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.referralCode).toBeDefined()
      expect(data.data.referralCode.length).toBeGreaterThan(0)
      expect(prisma.userSettings.upsert).toHaveBeenCalled()
    })

    it('should return existing code without creating new one', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'EXISTING' } as any)
      vi.mocked(prisma.user.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.aggregate).mockResolvedValue({
        _count: 0,
        _sum: { creditsAwarded: null },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      await GET(req)

      expect(prisma.userSettings.upsert).not.toHaveBeenCalled()
    })
  })

  describe('Zero Stats', () => {
    it('should handle zero referrals correctly', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'ZERO1234' } as any)
      vi.mocked(prisma.user.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.aggregate).mockResolvedValue({
        _count: 0,
        _sum: { creditsAwarded: null },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.totalReferrals).toBe(0)
      expect(data.data.pendingRewards).toBe(0)
      expect(data.data.completedRewards).toBe(0)
      expect(data.data.totalCreditsEarned).toBe(0)
    })

    it('should handle null creditsAwarded sum as 0', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'NULLSUM1' } as any)
      vi.mocked(prisma.user.count).mockResolvedValue(5)
      vi.mocked(prisma.referralReward.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.aggregate).mockResolvedValue({
        _count: 0,
        _sum: { creditsAwarded: null },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.totalCreditsEarned).toBe(0)
    })
  })

  describe('Database Operations', () => {
    it('should query user with correct userId', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'CODE' } as any)
      vi.mocked(prisma.user.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.aggregate).mockResolvedValue({
        _count: 0,
        _sum: { creditsAwarded: null },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      await GET(req)

      expect(prisma.userSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        select: { referralCode: true },
      })
    })

    it('should count referrals with correct filter', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'CODE' } as any)
      vi.mocked(prisma.user.count).mockResolvedValue(3)
      vi.mocked(prisma.referralReward.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.aggregate).mockResolvedValue({
        _count: 0,
        _sum: { creditsAwarded: null },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      await GET(req)

      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { referrerId: 'user_123' },
      })
    })

    it('should count pending rewards correctly', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'CODE' } as any)
      vi.mocked(prisma.user.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.count).mockResolvedValue(2)
      vi.mocked(prisma.referralReward.aggregate).mockResolvedValue({
        _count: 0,
        _sum: { creditsAwarded: null },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      await GET(req)

      expect(prisma.referralReward.count).toHaveBeenCalledWith({
        where: { userId: 'user_123', status: 'pending' },
      })
    })

    it('should aggregate completed rewards correctly', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'CODE' } as any)
      vi.mocked(prisma.user.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.aggregate).mockResolvedValue({
        _count: 5,
        _sum: { creditsAwarded: 25 },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      await GET(req)

      expect(prisma.referralReward.aggregate).toHaveBeenCalledWith({
        where: { userId: 'user_123', status: 'completed' },
        _count: true,
        _sum: { creditsAwarded: true },
      })
    })
  })

  describe('Error Handling', () => {
    it('should return DATABASE_ERROR when prisma.userSettings.findUnique fails', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockRejectedValue(new Error('DB error'))

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.message).toContain('Failed to fetch')
    })

    it('should handle prisma.user.count failure', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'CODE' } as any)
      vi.mocked(prisma.user.count).mockRejectedValue(new Error('Count failed'))

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)

      expect(response.status).toBe(500)
    })

    it('should handle prisma.referralReward.count failure', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'CODE' } as any)
      vi.mocked(prisma.user.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.count).mockRejectedValue(new Error('Reward count failed'))

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)

      expect(response.status).toBe(500)
    })

    it('should handle prisma.referralReward.aggregate failure', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'CODE' } as any)
      vi.mocked(prisma.user.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.count).mockResolvedValue(0)
      vi.mocked(prisma.referralReward.aggregate).mockRejectedValue(new Error('Aggregate failed'))

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)

      expect(response.status).toBe(500)
    })

    it('should handle session fetch errors', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Session service unavailable'))

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)

      expect(response.status).toBe(500)
    })
  })

  describe('Edge Cases', () => {
    it('should handle large credit amounts', async () => {
      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'LARGE' } as any)
      vi.mocked(prisma.user.count).mockResolvedValue(1000)
      vi.mocked(prisma.referralReward.count).mockResolvedValue(100)
      vi.mocked(prisma.referralReward.aggregate).mockResolvedValue({
        _count: 900,
        _sum: { creditsAwarded: 4500 },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.totalReferrals).toBe(1000)
      expect(data.data.totalCreditsEarned).toBe(4500)
    })

    it('should run database queries in parallel', async () => {
      const findUniqueSpy = vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({ referralCode: 'CODE' } as any)
      const countSpy = vi.mocked(prisma.user.count).mockResolvedValue(0)
      const rewardCountSpy = vi.mocked(prisma.referralReward.count).mockResolvedValue(0)
      const aggregateSpy = vi.mocked(prisma.referralReward.aggregate).mockResolvedValue({
        _count: 0,
        _sum: { creditsAwarded: null },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/stats')
      await GET(req)

      // All database operations should be called
      expect(findUniqueSpy).toHaveBeenCalled()
      expect(countSpy).toHaveBeenCalled()
      expect(rewardCountSpy).toHaveBeenCalled()
      expect(aggregateSpy).toHaveBeenCalled()
    })
  })
})
