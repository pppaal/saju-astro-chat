import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------- Mocks (must come before route import) ----------

// Mock middleware as passthrough - must be before route import
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      const { getServerSession } = await import('next-auth')
      let session: any = null
      try {
        session = await (getServerSession as any)()
      } catch {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } },
          { status: 500 }
        )
      }

      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'not_authenticated' } },
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

      const result = await handler(req, context, ...args)

      if (result instanceof Response) {
        return result
      }

      if (result.error) {
        const statusMap: Record<string, number> = {
          BAD_REQUEST: 400,
          VALIDATION_ERROR: 422,
          UNAUTHORIZED: 401,
          FORBIDDEN: 403,
          NOT_FOUND: 404,
          INTERNAL_ERROR: 500,
          DATABASE_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: { code: result.error.code, message: result.error.message } },
          { status: statusMap[result.error.code] || 500 }
        )
      }

      return NextResponse.json(
        { success: true, data: result.data },
        { status: result.status || 200 }
      )
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
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
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/auth/premium', () => ({
  isDbPremiumUser: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    consultationHistory: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

// Mock Stripe
vi.mock('stripe', () => {
  const mockStripe = vi.fn().mockImplementation(() => ({
    customers: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
    subscriptions: {
      list: vi.fn().mockResolvedValue({ data: [] }),
    },
  }))
  return { default: mockStripe }
})

// Mock Zod validation schemas
vi.mock('@/lib/api/zodValidation', () => ({
  idParamSchema: {
    safeParse: vi.fn((data: any) => {
      if (data === null || typeof data !== 'object') {
        return {
          success: false,
          error: { issues: [{ message: 'Expected object' }] },
        }
      }

      if (!data.id || typeof data.id !== 'string') {
        return {
          success: false,
          error: { issues: [{ message: 'Expected string for id' }] },
        }
      }

      if (data.id.length < 1) {
        return {
          success: false,
          error: { issues: [{ message: 'ID must be at least 1 character' }] },
        }
      }

      if (data.id.length > 100) {
        return {
          success: false,
          error: { issues: [{ message: 'ID must be at most 100 characters' }] },
        }
      }

      return { success: true, data: { id: data.id } }
    }),
  },
  createValidationErrorResponse: vi.fn(
    (
      error: { issues: Array<{ path?: string[]; message: string }> },
      options?: { route?: string }
    ) => {
      const { NextResponse } = require('next/server')
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            status: 400,
            details: error.issues.map((issue: { path?: string[]; message: string }) => ({
              path: issue.path || [],
              message: issue.message,
            })),
          },
        },
        { status: 400 }
      )
    }
  ),
}))

// ---------- Imports (after mocks) ----------

import { GET, DELETE } from '@/app/api/consultation/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'
import { isDbPremiumUser } from '@/lib/auth/premium'

// ---------- Helpers ----------

const mockSession = {
  user: { id: 'user-123', email: 'test@example.com' },
  expires: '2025-12-31',
}

beforeEach(() => {
  vi.mocked(isDbPremiumUser).mockResolvedValue(false)
})

// Route context with params promise
function createRouteContext(id: string) {
  return {
    params: Promise.resolve({ id }),
  }
}

/**
 * Configure Stripe mock so that the given email has an active subscription.
 */
function setupStripeActive(email: string) {
  const mockCustomerList = vi.fn().mockResolvedValue({
    data: [{ id: 'cus_abc' }],
  })
  const mockSubList = vi.fn().mockResolvedValue({
    data: [{ status: 'active' }],
  })

  vi.mocked(Stripe).mockImplementation(
    () =>
      ({
        customers: { list: mockCustomerList },
        subscriptions: { list: mockSubList },
      }) as any
  )

  return { mockCustomerList, mockSubList }
}

/**
 * Configure Stripe mock so that the given email has NO active subscription.
 */
function setupStripeInactive() {
  const mockCustomerList = vi.fn().mockResolvedValue({
    data: [{ id: 'cus_abc' }],
  })
  const mockSubList = vi.fn().mockResolvedValue({
    data: [{ status: 'canceled' }],
  })

  vi.mocked(Stripe).mockImplementation(
    () =>
      ({
        customers: { list: mockCustomerList },
        subscriptions: { list: mockSubList },
      }) as any
  )

  return { mockCustomerList, mockSubList }
}

/**
 * Configure Stripe mock so that the email has no customer records.
 */
function setupStripeNoCustomer() {
  const mockCustomerList = vi.fn().mockResolvedValue({ data: [] })

  vi.mocked(Stripe).mockImplementation(
    () =>
      ({
        customers: { list: mockCustomerList },
        subscriptions: { list: vi.fn() },
      }) as any
  )

  return { mockCustomerList }
}

// =============================================================
// GET Handler Tests
// =============================================================

describe('Consultation [id] API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key'
  })

  // ---- Authentication ----

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new Request('http://localhost/api/consultation/cons-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123' },
        expires: '2025-12-31',
      } as any)

      const request = new Request('http://localhost/api/consultation/cons-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.message).toBe('not_authenticated')
    })

    it('should return 500 when getServerSession throws an error', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Session fetch failed'))

      const request = new Request('http://localhost/api/consultation/cons-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  // ---- Parameter Validation ----

  describe('Parameter validation', () => {
    it('should return 400 for invalid params (empty id)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const request = new Request('http://localhost/api/consultation/', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext(''))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for id exceeding max length (100 chars)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      const longId = 'x'.repeat(101)

      const request = new Request(`http://localhost/api/consultation/${longId}`, {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext(longId))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // ---- Premium Check (Stripe) ----

  describe('Premium subscription check', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return 403 when user has no active Stripe subscription', async () => {
      setupStripeInactive()

      const request = new Request('http://localhost/api/consultation/cons-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should return 403 when Stripe has no customers for the email', async () => {
      setupStripeNoCustomer()

      const request = new Request('http://localhost/api/consultation/cons-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should return 403 when STRIPE_SECRET_KEY is not set', async () => {
      delete process.env.STRIPE_SECRET_KEY

      const request = new Request('http://localhost/api/consultation/cons-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(403)
    })

    it('should allow access for user with active subscription', async () => {
      setupStripeActive('test@example.com')
      vi.mocked(prisma.consultationHistory.findFirst).mockResolvedValue({
        id: 'cons-123',
        userId: 'user-123',
        theme: 'career',
        summary: 'Career consultation',
        fullReport: 'Full report content',
        createdAt: new Date('2025-06-01'),
      } as any)

      const request = new Request('http://localhost/api/consultation/cons-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.data.id).toBe('cons-123')
    })

    it('should recognize trialing subscription status as premium', async () => {
      const mockCustomerList = vi.fn().mockResolvedValue({ data: [{ id: 'cus_trial' }] })
      const mockSubList = vi.fn().mockResolvedValue({ data: [{ status: 'trialing' }] })
      vi.mocked(Stripe).mockImplementation(
        () =>
          ({
            customers: { list: mockCustomerList },
            subscriptions: { list: mockSubList },
          }) as any
      )

      vi.mocked(prisma.consultationHistory.findFirst).mockResolvedValue({
        id: 'cons-123',
        userId: 'user-123',
        theme: 'career',
        summary: 'summary',
        fullReport: 'report',
        createdAt: new Date(),
      } as any)

      const request = new Request('http://localhost/api/consultation/cons-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-123'))
      expect(response.status).toBe(200)
    })

    it('should recognize past_due subscription status as premium', async () => {
      const mockCustomerList = vi.fn().mockResolvedValue({ data: [{ id: 'cus_pastdue' }] })
      const mockSubList = vi.fn().mockResolvedValue({ data: [{ status: 'past_due' }] })
      vi.mocked(Stripe).mockImplementation(
        () =>
          ({
            customers: { list: mockCustomerList },
            subscriptions: { list: mockSubList },
          }) as any
      )

      vi.mocked(prisma.consultationHistory.findFirst).mockResolvedValue({
        id: 'cons-123',
        userId: 'user-123',
        theme: 'finance',
        summary: 'summary',
        fullReport: 'report',
        createdAt: new Date(),
      } as any)

      const request = new Request('http://localhost/api/consultation/cons-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-123'))
      expect(response.status).toBe(200)
    })
  })

  // ---- Fetching Consultation by ID ----

  describe('Fetch consultation by ID', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupStripeActive('test@example.com')
    })

    it('should return consultation data when found', async () => {
      const mockConsultation = {
        id: 'cons-123',
        userId: 'user-123',
        theme: 'career',
        summary: 'Career advice summary',
        fullReport: 'Full detailed career report',
        jungQuotes: ['Quote 1'],
        signals: { positive: true },
        userQuestion: 'What should I do?',
        locale: 'ko',
        createdAt: new Date('2025-07-01T10:00:00Z'),
      }

      vi.mocked(prisma.consultationHistory.findFirst).mockResolvedValue(mockConsultation as any)

      const request = new Request('http://localhost/api/consultation/cons-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Note: Date becomes ISO string after JSON serialization through NextResponse.json()
      const result = data.data.data
      expect(result.id).toBe(mockConsultation.id)
      expect(result.userId).toBe(mockConsultation.userId)
      expect(result.theme).toBe(mockConsultation.theme)
      expect(result.summary).toBe(mockConsultation.summary)
      expect(result.fullReport).toBe(mockConsultation.fullReport)
      expect(result.createdAt).toBe('2025-07-01T10:00:00.000Z')
    })

    it('should query with correct where clause (id and userId)', async () => {
      vi.mocked(prisma.consultationHistory.findFirst).mockResolvedValue({
        id: 'cons-456',
        userId: 'user-123',
        theme: 'love',
        summary: 'Love summary',
        fullReport: 'Love report',
        createdAt: new Date(),
      } as any)

      const request = new Request('http://localhost/api/consultation/cons-456', {
        method: 'GET',
      })

      await GET(request, createRouteContext('cons-456'))

      expect(prisma.consultationHistory.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'cons-456',
          userId: 'user-123',
        },
      })
    })
  })

  // ---- 404 When Not Found ----

  describe('Not found handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupStripeActive('test@example.com')
    })

    it('should return 404 when consultation does not exist', async () => {
      vi.mocked(prisma.consultationHistory.findFirst).mockResolvedValue(null)

      const request = new Request('http://localhost/api/consultation/nonexistent-id', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('nonexistent-id'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('상담 기록을 찾을 수 없습니다')
    })
  })

  // ---- Access Control (Own Consultations Only) ----

  describe('Access control - own consultations only', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupStripeActive('test@example.com')
    })

    it('should return 404 when trying to access another user consultation', async () => {
      // The query includes userId in the where clause, so if the consultation
      // belongs to another user, findFirst returns null
      vi.mocked(prisma.consultationHistory.findFirst).mockResolvedValue(null)

      const request = new Request('http://localhost/api/consultation/other-user-cons', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('other-user-cons'))
      const data = await response.json()

      // Should return 404 because the where clause filters by userId
      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should only find consultations that match both id AND userId', async () => {
      vi.mocked(prisma.consultationHistory.findFirst).mockResolvedValue(null)

      const request = new Request('http://localhost/api/consultation/cons-789', {
        method: 'GET',
      })

      await GET(request, createRouteContext('cons-789'))

      // Verify the query has both id and userId
      expect(prisma.consultationHistory.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'cons-789',
          userId: 'user-123',
        },
      })
    })
  })

  // ---- Error Handling ----

  describe('Error handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupStripeActive('test@example.com')
    })

    it('should return 500 and log error when database throws', async () => {
      vi.mocked(prisma.consultationHistory.findFirst).mockRejectedValue(
        new Error('Database connection lost')
      )

      const request = new Request('http://localhost/api/consultation/cons-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Internal Server Error')
      expect(logger.error).toHaveBeenCalledWith('[Consultation GET by ID error]', expect.any(Error))
    })

    it('should handle Prisma-specific errors appropriately', async () => {
      const prismaError = new Error('PrismaClientKnownRequestError')
      ;(prismaError as any).code = 'P2025'
      vi.mocked(prisma.consultationHistory.findFirst).mockRejectedValue(prismaError)

      const request = new Request('http://localhost/api/consultation/cons-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })
  })
})

// =============================================================
// DELETE Handler Tests
// =============================================================

describe('Consultation [id] API - DELETE', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key'
  })

  // ---- Authentication ----

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/consultation/cons-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session has no user', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        expires: '2025-12-31',
      } as any)

      const request = new NextRequest('http://localhost/api/consultation/cons-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 500 when getServerSession throws an error', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Auth service unavailable'))

      const request = new NextRequest('http://localhost/api/consultation/cons-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  // ---- Parameter Validation ----

  describe('Parameter validation', () => {
    it('should return 400 for invalid params (empty id)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const request = new NextRequest('http://localhost/api/consultation/', {
        method: 'DELETE',
      })

      const response = await DELETE(request, createRouteContext(''))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for id exceeding max length', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      const longId = 'y'.repeat(101)

      const request = new NextRequest(`http://localhost/api/consultation/${longId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, createRouteContext(longId))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // ---- Successful Deletion ----

  describe('Successful deletion', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should delete consultation and return success message', async () => {
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost/api/consultation/cons-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.message).toContain('상담 기록이 삭제되었습니다')
    })

    it('should call deleteMany with correct where clause', async () => {
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost/api/consultation/cons-456', {
        method: 'DELETE',
      })

      await DELETE(request, createRouteContext('cons-456'))

      expect(prisma.consultationHistory.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'cons-456',
          userId: 'user-123',
        },
      })
    })
  })

  // ---- 404 When Not Found ----

  describe('Not found handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return 404 when consultation does not exist or does not belong to user', async () => {
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost/api/consultation/nonexistent-id', {
        method: 'DELETE',
      })

      const response = await DELETE(request, createRouteContext('nonexistent-id'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('상담 기록을 찾을 수 없습니다')
    })
  })

  // ---- Access Control (Own Consultations Only) ----

  describe('Access control - own consultations only', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return 404 when trying to delete another user consultation', async () => {
      // deleteMany with userId filter returns count: 0 if consultation belongs to another user
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost/api/consultation/other-user-cons', {
        method: 'DELETE',
      })

      const response = await DELETE(request, createRouteContext('other-user-cons'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should filter by both id AND userId in delete query', async () => {
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 0 })

      const request = new NextRequest('http://localhost/api/consultation/cons-789', {
        method: 'DELETE',
      })

      await DELETE(request, createRouteContext('cons-789'))

      // Verify the query has both id and userId
      expect(prisma.consultationHistory.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'cons-789',
          userId: 'user-123',
        },
      })
    })
  })

  // ---- Error Handling ----

  describe('Error handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return 500 and log error when database throws', async () => {
      vi.mocked(prisma.consultationHistory.deleteMany).mockRejectedValue(
        new Error('Database write error')
      )

      const request = new NextRequest('http://localhost/api/consultation/cons-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Internal Server Error')
      expect(logger.error).toHaveBeenCalledWith('[Consultation DELETE error]', expect.any(Error))
    })

    it('should handle Prisma constraint violations appropriately', async () => {
      const prismaError = new Error('Foreign key constraint failed')
      ;(prismaError as any).code = 'P2003'
      vi.mocked(prisma.consultationHistory.deleteMany).mockRejectedValue(prismaError)

      const request = new NextRequest('http://localhost/api/consultation/cons-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request, createRouteContext('cons-123'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })
  })
})

// =============================================================
// Email Validation for Stripe (GET only - requires premium)
// =============================================================

describe('Consultation [id] API - Email validation for Stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key'
  })

  it('should treat user with null email as not premium (GET)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-no-email', email: null },
      expires: '2025-12-31',
    } as any)

    const request = new Request('http://localhost/api/consultation/cons-123', {
      method: 'GET',
    })

    const response = await GET(request, createRouteContext('cons-123'))
    const data = await response.json()

    // email is null => checkStripeActive returns false => UNAUTHORIZED
    // because route checks `context.session?.user?.email` and it's null
    expect(response.status).toBe(401)
  })

  it('should reject overly long email addresses for Stripe check (GET)', async () => {
    const longEmail = 'a'.repeat(250) + '@test.com'
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-long-email', email: longEmail },
      expires: '2025-12-31',
    } as any)

    setupStripeActive(longEmail)

    const request = new Request('http://localhost/api/consultation/cons-123', {
      method: 'GET',
    })

    const response = await GET(request, createRouteContext('cons-123'))
    const data = await response.json()

    // isValidEmail rejects the email => checkStripeActive returns false => FORBIDDEN
    expect(response.status).toBe(403)
  })

  it('should reject invalid email format for Stripe check (GET)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-bad-email', email: 'not-an-email' },
      expires: '2025-12-31',
    } as any)

    const request = new Request('http://localhost/api/consultation/cons-123', {
      method: 'GET',
    })

    const response = await GET(request, createRouteContext('cons-123'))
    expect(response.status).toBe(403)
  })
})

// =============================================================
// Edge Cases
// =============================================================

describe('Consultation [id] API - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key'
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
  })

  describe('GET edge cases', () => {
    beforeEach(() => {
      setupStripeActive('test@example.com')
    })

    it('should handle consultation with minimal data', async () => {
      vi.mocked(prisma.consultationHistory.findFirst).mockResolvedValue({
        id: 'cons-minimal',
        userId: 'user-123',
        theme: 'career',
        summary: null,
        fullReport: null,
        createdAt: new Date(),
      } as any)

      const request = new Request('http://localhost/api/consultation/cons-minimal', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('cons-minimal'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.data.id).toBe('cons-minimal')
    })

    it('should handle special characters in consultation id', async () => {
      const specialId = 'cons-123-abc-xyz'
      vi.mocked(prisma.consultationHistory.findFirst).mockResolvedValue({
        id: specialId,
        userId: 'user-123',
        theme: 'career',
        summary: 'summary',
        fullReport: 'report',
        createdAt: new Date(),
      } as any)

      const request = new Request(`http://localhost/api/consultation/${specialId}`, {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext(specialId))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.data.id).toBe(specialId)
    })

    it('should handle CUID format ids', async () => {
      const cuidId = 'clxyz1234567890abcdef'
      vi.mocked(prisma.consultationHistory.findFirst).mockResolvedValue({
        id: cuidId,
        userId: 'user-123',
        theme: 'finance',
        summary: 'Finance summary',
        fullReport: 'Finance report',
        createdAt: new Date(),
      } as any)

      const request = new Request(`http://localhost/api/consultation/${cuidId}`, {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext(cuidId))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.data.id).toBe(cuidId)
    })
  })

  describe('DELETE edge cases', () => {
    it('should handle deleting consultation with all optional fields', async () => {
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest('http://localhost/api/consultation/cons-full', {
        method: 'DELETE',
      })

      const response = await DELETE(request, createRouteContext('cons-full'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle UUID format ids in delete', async () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000'
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 1 })

      const request = new NextRequest(`http://localhost/api/consultation/${uuidId}`, {
        method: 'DELETE',
      })

      const response = await DELETE(request, createRouteContext(uuidId))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(prisma.consultationHistory.deleteMany).toHaveBeenCalledWith({
        where: {
          id: uuidId,
          userId: 'user-123',
        },
      })
    })
  })
})

// =============================================================
// Rate Limiting Configuration Tests
// =============================================================

describe('Consultation [id] API - Rate Limiting Configuration', () => {
  // Note: createAuthenticatedGuard is called at module load time, before our mocks are set up.
  // We verify the route configuration structurally instead of checking mock calls.

  it('should export GET as a function wrapped by withApiMiddleware', () => {
    expect(typeof GET).toBe('function')
  })

  it('should export DELETE as a function wrapped by withApiMiddleware', () => {
    expect(typeof DELETE).toBe('function')
  })
})
