/**
 * Comprehensive tests for /api/referral/validate
 * Tests referral code validation (public endpoint, no auth required)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock middleware - must be before route import
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      // validate is a public endpoint - no auth required
      const context = {
        userId: null,
        session: null,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: false,
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
              data: result.error.details,
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
  findUserByReferralCode: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
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

import { GET } from '@/app/api/referral/validate/route'
import { findUserByReferralCode } from '@/lib/referral'

describe('/api/referral/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validation', () => {
    it('should return 422 when code is missing', async () => {
      const req = new NextRequest('http://localhost:3000/api/referral/validate')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when code is empty string', async () => {
      const req = new NextRequest('http://localhost:3000/api/referral/validate?code=')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when code is too long', async () => {
      const longCode = 'A'.repeat(100)
      const req = new NextRequest(`http://localhost:3000/api/referral/validate?code=${longCode}`)
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Success Cases', () => {
    it('should return valid=true for existing referral code', async () => {
      vi.mocked(findUserByReferralCode).mockResolvedValue({
        id: 'user_123',
        name: 'Test Referrer',
        referralCode: 'VALID123',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/validate?code=VALID123')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.valid).toBe(true)
      expect(data.data.referrerName).toBe('Test Referrer')
    })

    it('should return Friend as default name when referrer has no name', async () => {
      vi.mocked(findUserByReferralCode).mockResolvedValue({
        id: 'user_123',
        name: null,
        referralCode: 'VALID123',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/validate?code=VALID123')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.valid).toBe(true)
      expect(data.data.referrerName).toBe('Friend')
    })

    it('should return Friend for empty string name', async () => {
      vi.mocked(findUserByReferralCode).mockResolvedValue({
        id: 'user_123',
        name: '',
        referralCode: 'VALID123',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/validate?code=VALID123')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.referrerName).toBe('Friend')
    })
  })

  describe('Invalid Code', () => {
    it('should return valid=false for non-existent code', async () => {
      vi.mocked(findUserByReferralCode).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/referral/validate?code=INVALID')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.valid).toBe(false)
      expect(data.data.error).toBe('invalid_code')
    })

    it('should return valid=false without referrerName for invalid code', async () => {
      vi.mocked(findUserByReferralCode).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/referral/validate?code=NOTFOUND')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.valid).toBe(false)
      expect(data.data.referrerName).toBeUndefined()
    })
  })

  describe('Security', () => {
    it('should handle SQL injection attempts safely', async () => {
      const maliciousCode = "'; DROP TABLE users; --"
      vi.mocked(findUserByReferralCode).mockResolvedValue(null)

      const req = new NextRequest(
        `http://localhost:3000/api/referral/validate?code=${encodeURIComponent(maliciousCode)}`
      )
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.valid).toBe(false)
      expect(findUserByReferralCode).toHaveBeenCalled()
    })

    it('should handle XSS attempts safely', async () => {
      const xssCode = '<script>alert("xss")</script>'
      vi.mocked(findUserByReferralCode).mockResolvedValue(null)

      const req = new NextRequest(
        `http://localhost:3000/api/referral/validate?code=${encodeURIComponent(xssCode)}`
      )
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.valid).toBe(false)
    })

    it('should handle unicode characters', async () => {
      const unicodeCode = '\uC548\uB155\uD558\uC138\uC694'
      vi.mocked(findUserByReferralCode).mockResolvedValue(null)

      const req = new NextRequest(
        `http://localhost:3000/api/referral/validate?code=${encodeURIComponent(unicodeCode)}`
      )
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBeLessThanOrEqual(422) // Either validation error or valid=false
    })
  })

  describe('Public Access', () => {
    it('should work without authentication', async () => {
      vi.mocked(findUserByReferralCode).mockResolvedValue({
        id: 'user_123',
        name: 'Public User',
        referralCode: 'PUBLIC12',
      })

      const req = new NextRequest('http://localhost:3000/api/referral/validate?code=PUBLIC12')
      const response = await GET(req)

      expect(response.status).toBe(200)
    })
  })

  describe('Edge Cases', () => {
    it('should handle codes with special characters', async () => {
      vi.mocked(findUserByReferralCode).mockResolvedValue(null)

      const req = new NextRequest(
        'http://localhost:3000/api/referral/validate?code=TEST-CODE_123'
      )
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.valid).toBe(false)
    })

    it('should handle whitespace in code', async () => {
      vi.mocked(findUserByReferralCode).mockResolvedValue(null)

      const req = new NextRequest(
        'http://localhost:3000/api/referral/validate?code=%20TEST%20'
      )
      const response = await GET(req)

      expect(response.status).toBeLessThanOrEqual(422)
    })

    it('should call findUserByReferralCode with the provided code', async () => {
      vi.mocked(findUserByReferralCode).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/referral/validate?code=TESTCODE')
      await GET(req)

      expect(findUserByReferralCode).toHaveBeenCalledWith('TESTCODE')
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(findUserByReferralCode).mockRejectedValue(new Error('Database error'))

      const req = new NextRequest('http://localhost:3000/api/referral/validate?code=TESTCODE')
      const response = await GET(req)

      expect(response.status).toBe(500)
    })
  })
})
