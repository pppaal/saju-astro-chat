/**
 * Comprehensive tests for /api/referral/claim
 * Tests claiming referral rewards with authentication and error handling
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

      // Require authentication for claim
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
  claimReferralReward: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    referralReward: {
      findFirst: vi.fn(),
      update: vi.fn(),
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

import { POST } from '@/app/api/referral/claim/route'
import { getServerSession } from 'next-auth'
import { claimReferralReward } from '@/lib/referral'

describe('/api/referral/claim', () => {
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

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session has no user', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: null } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should return 401 when session user has no id', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'test@example.com' } } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)

      expect(response.status).toBe(401)
    })
  })

  describe('Success Cases', () => {
    it('should claim pending reward successfully', async () => {
      vi.mocked(claimReferralReward).mockResolvedValue({
        success: true,
        creditsAwarded: 5,
      })

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.claimed).toBe(true)
      expect(data.data.creditsAwarded).toBe(5)
    })

    it('should handle different credit amounts', async () => {
      vi.mocked(claimReferralReward).mockResolvedValue({
        success: true,
        creditsAwarded: 10,
      })

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(data.data.creditsAwarded).toBe(10)
    })

    it('should call claimReferralReward with correct userId', async () => {
      vi.mocked(claimReferralReward).mockResolvedValue({
        success: true,
        creditsAwarded: 5,
      })

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      await POST(req)

      expect(claimReferralReward).toHaveBeenCalledWith('user_123')
    })
  })

  describe('No Pending Reward', () => {
    it('should return claimed=false when no pending reward exists', async () => {
      vi.mocked(claimReferralReward).mockResolvedValue({
        success: false,
        error: 'no_pending_reward',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.claimed).toBe(false)
      expect(data.data.reason).toBe('no_pending_reward')
    })

    it('should return undefined creditsAwarded when no reward claimed', async () => {
      vi.mocked(claimReferralReward).mockResolvedValue({
        success: false,
        error: 'no_pending_reward',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(data.data.creditsAwarded).toBeUndefined()
    })
  })

  describe('Error Handling', () => {
    it('should return BAD_REQUEST for claim failure with error message', async () => {
      vi.mocked(claimReferralReward).mockResolvedValue({
        success: false,
        error: 'database_error',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('BAD_REQUEST')
    })

    it('should return INTERNAL_ERROR when claimReferralReward throws', async () => {
      vi.mocked(claimReferralReward).mockRejectedValue(new Error('Unexpected error'))

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle session fetch errors', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Session service unavailable'))

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)

      expect(response.status).toBe(500)
    })

    it('should handle timeout errors', async () => {
      vi.mocked(claimReferralReward).mockRejectedValue(new Error('Request timeout'))

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)

      expect(response.status).toBe(500)
    })
  })

  describe('Edge Cases', () => {
    it('should handle concurrent claim requests', async () => {
      // First call succeeds, second returns no_pending_reward (already claimed)
      vi.mocked(claimReferralReward)
        .mockResolvedValueOnce({ success: true, creditsAwarded: 5 })
        .mockResolvedValueOnce({ success: false, error: 'no_pending_reward' })

      const req1 = new NextRequest('http://localhost:3000/api/referral/claim', { method: 'POST' })
      const response1 = await POST(req1)
      const data1 = await response1.json()

      const req2 = new NextRequest('http://localhost:3000/api/referral/claim', { method: 'POST' })
      const response2 = await POST(req2)
      const data2 = await response2.json()

      expect(data1.data.claimed).toBe(true)
      expect(data2.data.claimed).toBe(false)
    })

    it('should handle claim failure without error message', async () => {
      vi.mocked(claimReferralReward).mockResolvedValue({
        success: false,
        error: undefined,
      })

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      // The route returns BAD_REQUEST when success is false and error is not 'no_pending_reward'
      expect(response.status).toBe(400)
      expect(data.error.code).toBe('BAD_REQUEST')
    })

    it('should return reason=undefined when claim succeeds', async () => {
      vi.mocked(claimReferralReward).mockResolvedValue({
        success: true,
        creditsAwarded: 3,
      })

      const req = new NextRequest('http://localhost:3000/api/referral/claim', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(data.data.claimed).toBe(true)
      expect(data.data.reason).toBeUndefined()
    })
  })
})
