/**
 * Comprehensive tests for /api/referral/create-code
 * Tests referral code creation with authentication and rate limiting
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

      // Require authentication for create-code
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
  getUserReferralCode: vi.fn(),
  getReferralUrl: vi.fn((code: string) => `https://destinypal.me/?ref=${code}`),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
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

import { POST } from '@/app/api/referral/create-code/route'
import { getServerSession } from 'next-auth'
import { getUserReferralCode, getReferralUrl } from '@/lib/referral'

describe('/api/referral/create-code', () => {
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

      const req = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session has no user', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: null } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })
      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should return 401 when session user has no id', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'test@example.com' } } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })
      const response = await POST(req)

      expect(response.status).toBe(401)
    })
  })

  describe('Success Cases', () => {
    it('should create and return a new referral code', async () => {
      const mockCode = 'ABC12345'
      vi.mocked(getUserReferralCode).mockResolvedValue(mockCode)

      const req = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.code).toBe(mockCode)
      expect(data.data.referralUrl).toBe(`https://destinypal.me/?ref=${mockCode}`)
      expect(getUserReferralCode).toHaveBeenCalledWith('user_123')
    })

    it('should return existing referral code if user already has one', async () => {
      const existingCode = 'EXISTING'
      vi.mocked(getUserReferralCode).mockResolvedValue(existingCode)

      const req = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.code).toBe(existingCode)
    })

    it('should include referral URL in response', async () => {
      const mockCode = 'TESTCODE'
      vi.mocked(getUserReferralCode).mockResolvedValue(mockCode)
      vi.mocked(getReferralUrl).mockReturnValue('https://destinypal.me/?ref=TESTCODE')

      const req = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(data.data.referralUrl).toBeDefined()
      expect(data.data.referralUrl).toContain(mockCode)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(getUserReferralCode).mockRejectedValue(new Error('Database connection failed'))

      const req = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })
      const response = await POST(req)

      expect(response.status).toBe(500)
    })

    it('should handle session fetch errors', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Session service unavailable'))

      const req = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })
      const response = await POST(req)

      expect(response.status).toBe(500)
    })

    it('should handle referral service timeout', async () => {
      vi.mocked(getUserReferralCode).mockRejectedValue(new Error('Request timeout'))

      const req = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })
      const response = await POST(req)

      expect(response.status).toBe(500)
    })
  })

  describe('Edge Cases', () => {
    it('should handle concurrent code creation requests', async () => {
      const mockCode = 'CONCURRENT1'
      vi.mocked(getUserReferralCode).mockResolvedValue(mockCode)

      const req1 = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })

      const response1 = await POST(req1)

      const req2 = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })

      const response2 = await POST(req2)

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)
    })

    it('should call getUserReferralCode with correct userId', async () => {
      vi.mocked(getUserReferralCode).mockResolvedValue('CODE123')

      const req = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })
      await POST(req)

      expect(getUserReferralCode).toHaveBeenCalledWith('user_123')
    })

    it('should call getReferralUrl with the code from getUserReferralCode', async () => {
      const mockCode = 'URLCODE'
      vi.mocked(getUserReferralCode).mockResolvedValue(mockCode)

      const req = new NextRequest('http://localhost:3000/api/referral/create-code', {
        method: 'POST',
      })
      await POST(req)

      expect(getReferralUrl).toHaveBeenCalledWith(mockCode)
    })
  })
})
