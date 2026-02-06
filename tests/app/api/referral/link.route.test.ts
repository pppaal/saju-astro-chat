/**
 * Comprehensive tests for /api/referral/link
 * Tests linking referral code after OAuth login
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

      // Require authentication for link
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
  linkReferrer: vi.fn(),
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
}))

import { POST } from '@/app/api/referral/link/route'
import { getServerSession } from 'next-auth'
import { linkReferrer } from '@/lib/referral'
import { prisma } from '@/lib/db/prisma'

describe('/api/referral/link', () => {
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

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session has no user', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: null } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should return 401 when session user has no id', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'test@example.com' } } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      const response = await POST(req)

      expect(response.status).toBe(401)
    })
  })

  describe('Validation', () => {
    it('should return 422 when referral code is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when referral code is empty', async () => {
      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: '' }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when referral code is too long', async () => {
      const longCode = 'A'.repeat(100)
      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: longCode }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Success Cases', () => {
    it('should link referral code successfully', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: null,
        createdAt: new Date(), // Just now
      } as any)
      vi.mocked(linkReferrer).mockResolvedValue({
        success: true,
        referrerId: 'referrer_123',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.linked).toBe(true)
      expect(data.data.referrerId).toBe('referrer_123')
    })

    it('should call linkReferrer with correct arguments', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: null,
        createdAt: new Date(),
      } as any)
      vi.mocked(linkReferrer).mockResolvedValue({
        success: true,
        referrerId: 'ref_123',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'MYCODE' }),
      })
      await POST(req)

      expect(linkReferrer).toHaveBeenCalledWith('user_123', 'MYCODE')
    })
  })

  describe('Already Linked', () => {
    it('should return linked=false when user already has a referrer', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: 'existing_referrer',
        createdAt: new Date(),
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.linked).toBe(false)
      expect(data.data.reason).toBe('already_linked')
    })

    it('should not call linkReferrer when already linked', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: 'existing_referrer',
        createdAt: new Date(),
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      await POST(req)

      expect(linkReferrer).not.toHaveBeenCalled()
    })
  })

  describe('Time Window', () => {
    it('should return linked=false when user signed up more than 24 hours ago', async () => {
      const moreThan24HoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: null,
        createdAt: moreThan24HoursAgo,
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.linked).toBe(false)
      expect(data.data.reason).toBe('too_late')
    })

    it('should allow linking within 24 hours', async () => {
      const lessThan24HoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: null,
        createdAt: lessThan24HoursAgo,
      } as any)
      vi.mocked(linkReferrer).mockResolvedValue({
        success: true,
        referrerId: 'ref_123',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(data.data.linked).toBe(true)
    })

    it('should not call linkReferrer when too late', async () => {
      const moreThan24HoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: null,
        createdAt: moreThan24HoursAgo,
      } as any)

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      await POST(req)

      expect(linkReferrer).not.toHaveBeenCalled()
    })
  })

  describe('Link Errors', () => {
    it('should return reason=invalid_code for invalid referral code', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: null,
        createdAt: new Date(),
      } as any)
      vi.mocked(linkReferrer).mockResolvedValue({
        success: false,
        error: 'invalid_code',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'INVALID' }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.linked).toBe(false)
      expect(data.data.reason).toBe('invalid_code')
    })

    it('should return reason=self_referral for self-referral attempt', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: null,
        createdAt: new Date(),
      } as any)
      vi.mocked(linkReferrer).mockResolvedValue({
        success: false,
        error: 'self_referral',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'MYOWNCODE' }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(data.data.linked).toBe(false)
      expect(data.data.reason).toBe('self_referral')
    })
  })

  describe('Error Handling', () => {
    it('should return INTERNAL_ERROR when linkReferrer throws', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: null,
        createdAt: new Date(),
      } as any)
      vi.mocked(linkReferrer).mockRejectedValue(new Error('Unexpected error'))

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle prisma.user.findUnique failure', async () => {
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('DB error'))

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      const response = await POST(req)

      expect(response.status).toBe(500)
    })

    it('should handle session fetch errors', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Session service unavailable'))

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      const response = await POST(req)

      expect(response.status).toBe(500)
    })
  })

  describe('Edge Cases', () => {
    it('should handle concurrent link requests', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: null,
        createdAt: new Date(),
      } as any)
      vi.mocked(linkReferrer)
        .mockResolvedValueOnce({ success: true, referrerId: 'ref_1' })
        .mockResolvedValueOnce({ success: false, error: 'already_linked' })

      const req1 = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'CODE1' }),
      })
      const response1 = await POST(req1)
      const data1 = await response1.json()

      const req2 = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'CODE2' }),
      })
      const response2 = await POST(req2)
      const data2 = await response2.json()

      expect(data1.data.linked).toBe(true)
      expect(data2.data.linked).toBe(false)
    })

    it('should handle user without createdAt (defaults to allowed)', async () => {
      // Reset the mock specifically for this test
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: null,
        createdAt: null, // null createdAt
      } as any)
      vi.mocked(linkReferrer).mockResolvedValue({
        success: true,
        referrerId: 'ref_123',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: 'TEST1234' }),
      })
      const response = await POST(req)
      const data = await response.json()

      // With no createdAt, hoursSinceCreation defaults to 0, so should be allowed
      // because 0 > 24 is false
      expect(response.status).toBe(200)
      expect(data.data.linked).toBe(true)
      expect(linkReferrer).toHaveBeenCalledWith('user_123', 'TEST1234')
    })

    it('should trim whitespace from referral code', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        referrerId: null,
        createdAt: new Date(),
      } as any)
      vi.mocked(linkReferrer).mockResolvedValue({
        success: true,
        referrerId: 'ref_123',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/link', {
        method: 'POST',
        body: JSON.stringify({ referralCode: '  TEST1234  ' }),
      })
      await POST(req)

      expect(linkReferrer).toHaveBeenCalledWith('user_123', 'TEST1234')
    })
  })
})
