/**
 * Comprehensive tests for /api/referral/me
 * Tests user referral stats retrieval with authentication
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

      // Require authentication for me
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

vi.mock('@/lib/referral', () => ({
  getReferralStats: vi.fn(),
  getReferralUrl: vi.fn((code: string) => `https://destinypal.me/?ref=${code}`),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    referralReward: {
      findMany: vi.fn(),
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

import { GET } from '@/app/api/referral/me/route'
import { getServerSession } from 'next-auth'
import { getReferralStats, getReferralUrl } from '@/lib/referral'

describe('/api/referral/me', () => {
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

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session has no user', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: null } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      const response = await GET(req)

      expect(response.status).toBe(401)
    })

    it('should return 401 when session user has no id', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'test@example.com' } } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      const response = await GET(req)

      expect(response.status).toBe(401)
    })
  })

  describe('Success Cases', () => {
    it('should return referral stats for authenticated user', async () => {
      const mockStats = {
        referralCode: 'MYCODE12',
        stats: {
          total: 5,
          completed: 3,
          pending: 2,
          creditsEarned: 15,
        },
        referrals: [
          { id: 'ref1', name: 'User 1', joinedAt: new Date(), hasAnalysis: true },
          { id: 'ref2', name: 'User 2', joinedAt: new Date(), hasAnalysis: false },
        ],
        rewards: [
          { id: 'rwd1', credits: 5, status: 'completed', createdAt: new Date() },
        ],
      }
      vi.mocked(getReferralStats).mockResolvedValue(mockStats as any)

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.referralCode).toBe('MYCODE12')
      expect(data.data.stats.total).toBe(5)
      expect(data.data.stats.completed).toBe(3)
      expect(data.data.stats.pending).toBe(2)
      expect(data.data.stats.creditsEarned).toBe(15)
    })

    it('should include referral URL in response', async () => {
      const mockStats = {
        referralCode: 'URLCODE1',
        stats: { total: 0, completed: 0, pending: 0, creditsEarned: 0 },
        referrals: [],
        rewards: [],
      }
      vi.mocked(getReferralStats).mockResolvedValue(mockStats as any)

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.referralUrl).toBeDefined()
      expect(data.data.referralUrl).toContain('URLCODE1')
    })

    it('should return referrals list with user details', async () => {
      const mockStats = {
        referralCode: 'CODE123',
        stats: { total: 2, completed: 1, pending: 1, creditsEarned: 5 },
        referrals: [
          { id: 'ref1', name: 'John Doe', joinedAt: new Date('2024-01-01'), hasAnalysis: true },
          { id: 'ref2', name: 'Anonymous', joinedAt: new Date('2024-01-02'), hasAnalysis: false },
        ],
        rewards: [],
      }
      vi.mocked(getReferralStats).mockResolvedValue(mockStats as any)

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.referrals).toHaveLength(2)
      expect(data.data.referrals[0].name).toBe('John Doe')
      expect(data.data.referrals[0].hasAnalysis).toBe(true)
    })

    it('should return rewards history', async () => {
      const mockStats = {
        referralCode: 'CODE123',
        stats: { total: 1, completed: 1, pending: 0, creditsEarned: 5 },
        referrals: [],
        rewards: [
          {
            id: 'rwd1',
            credits: 5,
            status: 'completed',
            createdAt: new Date('2024-01-01'),
            completedAt: new Date('2024-01-02'),
          },
        ],
      }
      vi.mocked(getReferralStats).mockResolvedValue(mockStats as any)

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.rewards).toHaveLength(1)
      expect(data.data.rewards[0].credits).toBe(5)
      expect(data.data.rewards[0].status).toBe('completed')
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero referrals', async () => {
      const mockStats = {
        referralCode: 'NEWUSER1',
        stats: { total: 0, completed: 0, pending: 0, creditsEarned: 0 },
        referrals: [],
        rewards: [],
      }
      vi.mocked(getReferralStats).mockResolvedValue(mockStats as any)

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.stats.total).toBe(0)
      expect(data.data.referrals).toHaveLength(0)
    })

    it('should call getReferralStats with correct userId', async () => {
      vi.mocked(getReferralStats).mockResolvedValue({
        referralCode: 'CODE',
        stats: { total: 0, completed: 0, pending: 0, creditsEarned: 0 },
        referrals: [],
        rewards: [],
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      await GET(req)

      expect(getReferralStats).toHaveBeenCalledWith('user_123')
    })

    it('should call getReferralUrl with the referral code', async () => {
      vi.mocked(getReferralStats).mockResolvedValue({
        referralCode: 'URLTEST1',
        stats: { total: 0, completed: 0, pending: 0, creditsEarned: 0 },
        referrals: [],
        rewards: [],
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      await GET(req)

      expect(getReferralUrl).toHaveBeenCalledWith('URLTEST1')
    })

    it('should handle large number of referrals', async () => {
      const manyReferrals = Array.from({ length: 100 }, (_, i) => ({
        id: `ref${i}`,
        name: `User ${i}`,
        joinedAt: new Date(),
        hasAnalysis: i % 2 === 0,
      }))
      const mockStats = {
        referralCode: 'POWERUSER',
        stats: { total: 100, completed: 50, pending: 50, creditsEarned: 250 },
        referrals: manyReferrals,
        rewards: [],
      }
      vi.mocked(getReferralStats).mockResolvedValue(mockStats as any)

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.referrals).toHaveLength(100)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(getReferralStats).mockRejectedValue(new Error('Database connection failed'))

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      const response = await GET(req)

      expect(response.status).toBe(500)
    })

    it('should handle session fetch errors', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Session service unavailable'))

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      const response = await GET(req)

      expect(response.status).toBe(500)
    })

    it('should handle timeout errors', async () => {
      vi.mocked(getReferralStats).mockRejectedValue(new Error('Request timeout'))

      const req = new NextRequest('http://localhost:3000/api/referral/me')
      const response = await GET(req)

      expect(response.status).toBe(500)
    })
  })
})
