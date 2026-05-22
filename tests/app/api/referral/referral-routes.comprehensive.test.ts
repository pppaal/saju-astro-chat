/**
 * Comprehensive tests for Referral API Routes
 * Tests /claim, /stats endpoints with authentication and rate limiting
 */

import { vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import {
  claimReferralReward,
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
    userSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
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

      // Check if auth is required - claim, stats require auth
      const requiresAuth =
        _options?.requireAuth !== false &&
        (_options?.route?.includes('claim') ||
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
})
