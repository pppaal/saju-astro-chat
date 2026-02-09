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
  isDbPremiumUser: vi.fn().mockResolvedValue(false),
}))

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    consultationHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    personaMemory: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
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
  consultationSaveSchema: {
    safeParse: vi.fn((data: any) => {
      if (data === null || typeof data !== 'object') {
        return {
          success: false,
          error: { issues: [{ message: 'Expected object' }] },
        }
      }

      const result: any = {}

      // Validate theme
      if (data.theme !== undefined) {
        if (typeof data.theme !== 'string') {
          return { success: false, error: { issues: [{ message: 'Expected string for theme' }] } }
        }
        if (data.theme.length > 100) {
          return {
            success: false,
            error: { issues: [{ message: 'Theme must be at most 100 characters' }] },
          }
        }
        result.theme = data.theme.trim()
      }

      // Validate summary
      if (data.summary !== undefined) {
        if (typeof data.summary !== 'string') {
          return {
            success: false,
            error: { issues: [{ message: 'Expected string for summary' }] },
          }
        }
        if (data.summary.length > 3000) {
          return {
            success: false,
            error: { issues: [{ message: 'Summary must be at most 3000 characters' }] },
          }
        }
        result.summary = data.summary.trim()
      }

      // Validate fullReport
      if (data.fullReport !== undefined) {
        if (typeof data.fullReport !== 'string') {
          return {
            success: false,
            error: { issues: [{ message: 'Expected string for fullReport' }] },
          }
        }
        if (data.fullReport.length > 30000) {
          return {
            success: false,
            error: { issues: [{ message: 'FullReport must be at most 30000 characters' }] },
          }
        }
        result.fullReport = data.fullReport
      }

      // Optional fields - pass through
      if (data.jungQuotes !== undefined) result.jungQuotes = data.jungQuotes
      if (data.signals !== undefined) result.signals = data.signals
      if (data.userQuestion !== undefined) {
        if (typeof data.userQuestion === 'string' && data.userQuestion.length > 1000) {
          return {
            success: false,
            error: { issues: [{ message: 'UserQuestion must be at most 1000 characters' }] },
          }
        }
        result.userQuestion =
          typeof data.userQuestion === 'string' ? data.userQuestion.trim() : data.userQuestion
      }

      // Validate locale
      const validLocales = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'ru', 'ar']
      if (data.locale !== undefined) {
        if (!validLocales.includes(data.locale)) {
          return {
            success: false,
            error: { issues: [{ message: 'Invalid locale' }] },
          }
        }
        result.locale = data.locale
      }

      return { success: true, data: result }
    }),
  },
  consultationGetQuerySchema: {
    safeParse: vi.fn((data: any) => {
      if (data === null || typeof data !== 'object') {
        return {
          success: false,
          error: { issues: [{ message: 'Expected object' }] },
        }
      }

      const result: any = {
        limit: 20,
        offset: 0,
      }

      // theme - optional string
      if (data.theme !== undefined) {
        if (typeof data.theme !== 'string') {
          return {
            success: false,
            error: { issues: [{ message: 'Expected string for theme' }] },
          }
        }
        if (data.theme.length > 50) {
          return {
            success: false,
            error: { issues: [{ message: 'Theme must be at most 50 characters' }] },
          }
        }
        result.theme = data.theme
      }

      // limit - coerce to number, int, min 1, max 50, default 20
      if (data.limit !== undefined) {
        const num = Number(data.limit)
        if (isNaN(num) || !Number.isInteger(num)) {
          return {
            success: false,
            error: { issues: [{ message: 'Limit must be an integer' }] },
          }
        }
        if (num < 1) {
          return {
            success: false,
            error: { issues: [{ message: 'Limit must be at least 1' }] },
          }
        }
        if (num > 50) {
          return {
            success: false,
            error: { issues: [{ message: 'Limit must be at most 50' }] },
          }
        }
        result.limit = num
      }

      // offset - coerce to number, int, min 0, default 0
      if (data.offset !== undefined) {
        const num = Number(data.offset)
        if (isNaN(num) || !Number.isInteger(num)) {
          return {
            success: false,
            error: { issues: [{ message: 'Offset must be an integer' }] },
          }
        }
        if (num < 0) {
          return {
            success: false,
            error: { issues: [{ message: 'Offset must be at least 0' }] },
          }
        }
        result.offset = num
      }

      return { success: true, data: result }
    }),
  },
}))

// ---------- Imports (after mocks) ----------

import { GET, POST } from '@/app/api/consultation/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'

// ---------- Helpers ----------

const mockSession = {
  user: { id: 'user-123', email: 'test@example.com' },
  expires: '2025-12-31',
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

// ---------- Tests ----------

describe('Consultation API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key'
  })

  // ---- Authentication ----

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({ theme: 'career', summary: 'test', fullReport: 'test report' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session has no email (context.session.user.email is undefined)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123' },
        expires: '2025-12-31',
      } as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({ theme: 'career', summary: 'test', fullReport: 'test report' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.message).toBe('not_authenticated')
    })

    it('should return 500 when getServerSession throws an error', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Session fetch failed'))

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({ theme: 'career', summary: 'test', fullReport: 'full' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  // ---- Premium Check (Stripe) ----

  describe('Premium subscription check', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return 403 when user has no active Stripe subscription', async () => {
      setupStripeInactive()

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({ theme: 'career', summary: 'test', fullReport: 'full report' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should return 403 when Stripe has no customers for the email', async () => {
      setupStripeNoCustomer()

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({ theme: 'career', summary: 'test', fullReport: 'full report' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should return 403 when STRIPE_SECRET_KEY is not set', async () => {
      delete process.env.STRIPE_SECRET_KEY

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({ theme: 'career', summary: 'test', fullReport: 'full report' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
    })

    it('should allow access for user with active subscription', async () => {
      setupStripeActive('test@example.com')
      vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
        id: 'cons-1',
        createdAt: new Date('2025-06-01'),
      } as any)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'Career reading',
          fullReport: 'Full career report',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
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

      vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
        id: 'cons-2',
        createdAt: new Date('2025-06-02'),
      } as any)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({ theme: 'love', summary: 'Love summary', fullReport: 'Love report' }),
      })

      const response = await POST(request)
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

      vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
        id: 'cons-3',
        createdAt: new Date('2025-06-03'),
      } as any)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'finance',
          summary: 'Finance summary',
          fullReport: 'Finance report',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should iterate through multiple customers to find an active subscription', async () => {
      const mockCustomerList = vi.fn().mockResolvedValue({
        data: [{ id: 'cus_1' }, { id: 'cus_2' }],
      })
      // First customer has canceled sub, second has active
      const mockSubList = vi
        .fn()
        .mockResolvedValueOnce({ data: [{ status: 'canceled' }] })
        .mockResolvedValueOnce({ data: [{ status: 'active' }] })

      vi.mocked(Stripe).mockImplementation(
        () =>
          ({
            customers: { list: mockCustomerList },
            subscriptions: { list: mockSubList },
          }) as any
      )

      vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
        id: 'cons-4',
        createdAt: new Date('2025-06-04'),
      } as any)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'health',
          summary: 'Health summary',
          fullReport: 'Health report',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
      expect(mockSubList).toHaveBeenCalledTimes(2)
    })
  })

  // ---- Input Validation ----

  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupStripeActive('test@example.com')
    })

    it('should return 400 for invalid JSON body', async () => {
      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: 'not valid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('BAD_REQUEST')
    })

    it('should return 400 when body is null', async () => {
      // Create a request with a body that parses to null
      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify(null),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 422 for Zod validation failure (e.g. theme too long)', async () => {
      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'x'.repeat(101),
          summary: 'test',
          fullReport: 'full report',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when required fields (theme, summary, fullReport) are missing after validation', async () => {
      // Pass an empty object - Zod will succeed but the route checks theme/summary/fullReport
      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.message).toContain('Missing required fields')
    })

    it('should return 422 when only theme is provided but summary and fullReport missing', async () => {
      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({ theme: 'career' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.message).toContain('Missing required fields')
    })

    it('should return 422 for invalid locale', async () => {
      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'summary',
          fullReport: 'report',
          locale: 'invalid_locale',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when summary exceeds max length', async () => {
      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'x'.repeat(3001),
          fullReport: 'report',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(422)
    })

    it('should return 422 when fullReport exceeds max length', async () => {
      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'summary',
          fullReport: 'x'.repeat(30001),
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(422)
    })

    it('should return 422 when userQuestion exceeds max length', async () => {
      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'summary',
          fullReport: 'report',
          userQuestion: 'q'.repeat(1001),
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(422)
    })
  })

  // ---- Successful Operations ----

  describe('Successful save', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupStripeActive('test@example.com')
    })

    it('should save consultation and return id and createdAt', async () => {
      const createdAt = new Date('2025-07-01T10:00:00Z')
      vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
        id: 'cons-100',
        createdAt,
      } as any)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'Career consultation summary',
          fullReport: 'Detailed career report content here',
          userQuestion: 'What should I focus on?',
          locale: 'ko',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('cons-100')
      expect(data.data.createdAt).toBeDefined()
    })

    it('should pass correct data to prisma.consultationHistory.create', async () => {
      vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
        id: 'cons-200',
        createdAt: new Date(),
      } as any)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'love',
          summary: 'Love summary',
          fullReport: 'Love full report',
          jungQuotes: ['quote1', 'quote2'],
          signals: { signal1: true },
          userQuestion: 'Will I find love?',
          locale: 'en',
        }),
      })

      await POST(request)

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          theme: 'love',
          summary: 'Love summary',
          fullReport: 'Love full report',
          jungQuotes: ['quote1', 'quote2'],
          signals: { signal1: true },
          userQuestion: 'Will I find love?',
          locale: 'en',
        },
      })
    })

    it('should default locale to ko when not provided', async () => {
      vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
        id: 'cons-300',
        createdAt: new Date(),
      } as any)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'health',
          summary: 'Health summary',
          fullReport: 'Health report',
        }),
      })

      await POST(request)

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            locale: 'ko',
          }),
        })
      )
    })

    it('should handle optional fields being undefined gracefully', async () => {
      vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
        id: 'cons-400',
        createdAt: new Date(),
      } as any)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'summary',
          fullReport: 'report',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // jungQuotes, signals, userQuestion should be undefined in create call
      expect(prisma.consultationHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-123',
            theme: 'career',
            summary: 'summary',
            fullReport: 'report',
          }),
        })
      )
    })
  })

  // ---- Persona Memory Updates ----

  describe('Persona memory updates', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupStripeActive('test@example.com')
      vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
        id: 'cons-mem',
        createdAt: new Date(),
      } as any)
    })

    it('should create new persona memory when none exists', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'summary',
          fullReport: 'report',
        }),
      })

      await POST(request)

      expect(prisma.personaMemory.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          dominantThemes: ['career'],
          lastTopics: ['career'],
          sessionCount: 1,
        },
      })
    })

    it('should update existing persona memory adding new theme', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue({
        userId: 'user-123',
        dominantThemes: ['love'],
        lastTopics: ['love'],
        sessionCount: 5,
      } as any)
      vi.mocked(prisma.personaMemory.update).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'summary',
          fullReport: 'report',
        }),
      })

      await POST(request)

      expect(prisma.personaMemory.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          dominantThemes: ['love', 'career'],
          lastTopics: ['career', 'love'],
          sessionCount: 6,
        },
      })
    })

    it('should not duplicate existing theme in dominantThemes', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue({
        userId: 'user-123',
        dominantThemes: ['career', 'love'],
        lastTopics: ['love', 'career'],
        sessionCount: 3,
      } as any)
      vi.mocked(prisma.personaMemory.update).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'summary',
          fullReport: 'report',
        }),
      })

      await POST(request)

      expect(prisma.personaMemory.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          dominantThemes: ['career', 'love'], // career already exists, not duplicated
          lastTopics: ['career', 'love'], // career moved to front
          sessionCount: 4,
        },
      })
    })

    it('should cap lastTopics at 10 items', async () => {
      const tenTopics = Array.from({ length: 10 }, (_, i) => `topic${i}`)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue({
        userId: 'user-123',
        dominantThemes: tenTopics,
        lastTopics: tenTopics,
        sessionCount: 10,
      } as any)
      vi.mocked(prisma.personaMemory.update).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'newTheme',
          summary: 'summary',
          fullReport: 'report',
        }),
      })

      await POST(request)

      const updateCall = vi.mocked(prisma.personaMemory.update).mock.calls[0][0]
      expect((updateCall.data.lastTopics as string[]).length).toBe(10)
      expect((updateCall.data.lastTopics as string[])[0]).toBe('newTheme')
    })

    it('should handle persona memory with null dominantThemes and lastTopics', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue({
        userId: 'user-123',
        dominantThemes: null,
        lastTopics: null,
        sessionCount: 0,
      } as any)
      vi.mocked(prisma.personaMemory.update).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'summary',
          fullReport: 'report',
        }),
      })

      await POST(request)

      expect(prisma.personaMemory.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: {
          dominantThemes: ['career'],
          lastTopics: ['career'],
          sessionCount: 1,
        },
      })
    })

    it('should still succeed even if persona memory update fails', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockRejectedValue(new Error('DB error'))

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'summary',
          fullReport: 'report',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Consultation save should still succeed
      expect(response.status).toBe(200)
      expect(data.data.id).toBe('cons-mem')
      expect(logger.error).toHaveBeenCalledWith('[updatePersonaMemory error]', expect.any(Error))
    })
  })

  // ---- Database Error Handling ----

  describe('Database errors', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupStripeActive('test@example.com')
    })

    it('should return 500 when consultation create fails', async () => {
      vi.mocked(prisma.consultationHistory.create).mockRejectedValue(
        new Error('Database connection lost')
      )

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'summary',
          fullReport: 'report',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Failed to save consultation')
      expect(logger.error).toHaveBeenCalledWith(
        '[Consultation POST] Database error',
        expect.objectContaining({ error: expect.any(Error) })
      )
    })
  })
})

// =============================================================
// GET Handler
// =============================================================

describe('Consultation API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key'
  })

  // ---- Authentication ----

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session has no email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123' },
        expires: '2025-12-31',
      } as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.message).toBe('not_authenticated')
    })

    it('should return 500 when getServerSession throws', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Auth service down'))

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(500)
    })
  })

  // ---- Premium Check (Stripe) ----

  describe('Premium subscription check', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return 403 when user has no active subscription', async () => {
      setupStripeInactive()

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
    })

    it('should return 403 when STRIPE_SECRET_KEY is missing', async () => {
      delete process.env.STRIPE_SECRET_KEY

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(403)
    })
  })

  // ---- Query Validation ----

  describe('Query parameter validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupStripeActive('test@example.com')
    })

    it('should return 422 when limit is not an integer', async () => {
      const request = new NextRequest('http://localhost/api/consultation?limit=abc', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when limit exceeds maximum (50)', async () => {
      const request = new NextRequest('http://localhost/api/consultation?limit=100', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(422)
    })

    it('should return 422 when limit is less than 1', async () => {
      const request = new NextRequest('http://localhost/api/consultation?limit=0', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(422)
    })

    it('should return 422 when offset is negative', async () => {
      const request = new NextRequest('http://localhost/api/consultation?offset=-5', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(422)
    })

    it('should return 422 when theme query param exceeds 50 characters', async () => {
      const longTheme = 'a'.repeat(51)
      const request = new NextRequest(`http://localhost/api/consultation?theme=${longTheme}`, {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(422)
    })
  })

  // ---- Successful Fetch ----

  describe('Successful consultation list fetch', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupStripeActive('test@example.com')
    })

    it('should return consultations with pagination using defaults', async () => {
      const mockConsultations = [
        {
          id: 'c1',
          theme: 'career',
          summary: 'Career consultation',
          createdAt: new Date('2025-07-01'),
          locale: 'ko',
          userQuestion: 'What about my job?',
        },
        {
          id: 'c2',
          theme: 'love',
          summary: 'Love consultation',
          createdAt: new Date('2025-06-15'),
          locale: 'ko',
          userQuestion: null,
        },
      ]

      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue(mockConsultations as any)
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(2)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.data).toHaveLength(2)
      expect(data.data.pagination.total).toBe(2)
      expect(data.data.pagination.limit).toBe(20)
      expect(data.data.pagination.offset).toBe(0)
      expect(data.data.pagination.hasMore).toBe(false)
    })

    it('should filter by theme when provided', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost/api/consultation?theme=career', {
        method: 'GET',
      })

      await GET(request)

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123', theme: 'career' },
        })
      )
      expect(prisma.consultationHistory.count).toHaveBeenCalledWith({
        where: { userId: 'user-123', theme: 'career' },
      })
    })

    it('should apply custom limit and offset', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost/api/consultation?limit=5&offset=10', {
        method: 'GET',
      })

      await GET(request)

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 10,
        })
      )
    })

    it('should return hasMore=true when more results exist', async () => {
      const fiveConsultations = Array.from({ length: 5 }, (_, i) => ({
        id: `c${i}`,
        theme: 'career',
        summary: `Summary ${i}`,
        createdAt: new Date(),
        locale: 'ko',
        userQuestion: null,
      }))

      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue(fiveConsultations as any)
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(20)

      const request = new NextRequest('http://localhost/api/consultation?limit=5&offset=0', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(data.data.pagination.hasMore).toBe(true)
      expect(data.data.pagination.total).toBe(20)
    })

    it('should return hasMore=false when on the last page', async () => {
      const twoConsultations = [
        {
          id: 'c1',
          theme: 'career',
          summary: 'S1',
          createdAt: new Date(),
          locale: 'ko',
          userQuestion: null,
        },
        {
          id: 'c2',
          theme: 'career',
          summary: 'S2',
          createdAt: new Date(),
          locale: 'ko',
          userQuestion: null,
        },
      ]

      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue(twoConsultations as any)
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(7)

      const request = new NextRequest('http://localhost/api/consultation?limit=5&offset=5', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      // offset(5) + consultations.length(2) = 7, total = 7  =>  hasMore = false
      expect(data.data.pagination.hasMore).toBe(false)
    })

    it('should order results by createdAt desc', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'GET',
      })

      await GET(request)

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('should select only the expected fields', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'GET',
      })

      await GET(request)

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            theme: true,
            summary: true,
            createdAt: true,
            locale: true,
            userQuestion: true,
          },
        })
      )
    })

    it('should not include theme in where clause when theme query param is absent', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'GET',
      })

      await GET(request)

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123' },
        })
      )
    })

    it('should return empty data array when no consultations exist', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.data).toEqual([])
      expect(data.data.pagination.total).toBe(0)
      expect(data.data.pagination.hasMore).toBe(false)
    })
  })

  // ---- Database Error Handling ----

  describe('Database errors', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupStripeActive('test@example.com')
    })

    it('should return 500 when findMany throws', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockRejectedValue(
        new Error('Connection timeout')
      )
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Failed to fetch consultations')
      expect(logger.error).toHaveBeenCalledWith(
        '[Consultation GET] Database error',
        expect.objectContaining({ error: expect.any(Error) })
      )
    })

    it('should return 500 when count throws', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockRejectedValue(new Error('Count query failed'))

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })
  })
})

// =============================================================
// Email Validation (indirectly tested via Stripe checks)
// =============================================================

describe('Consultation API - Email validation for Stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key'
  })

  it('should treat user with null email as not premium (POST)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-no-email', email: null },
      expires: '2025-12-31',
    } as any)

    const request = new NextRequest('http://localhost/api/consultation', {
      method: 'POST',
      body: JSON.stringify({ theme: 'career', summary: 'summary', fullReport: 'report' }),
    })

    const response = await POST(request)
    const data = await response.json()

    // email is null => checkStripeActive returns false => UNAUTHORIZED because middleware
    // checks context.session.user.email and it's null, so route returns UNAUTHORIZED
    // Actually the route checks `const userEmail = context.session?.user?.email`
    // email: null is falsy so it returns 'not_authenticated'
    expect(response.status).toBe(401)
  })

  it('should reject overly long email addresses for Stripe check (POST)', async () => {
    // Email longer than 254 chars fails isValidEmail
    const longEmail = 'a'.repeat(250) + '@test.com'
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-long-email', email: longEmail },
      expires: '2025-12-31',
    } as any)

    // Even though Stripe is mocked, checkStripeActive will return false because isValidEmail fails
    setupStripeActive(longEmail)

    const request = new NextRequest('http://localhost/api/consultation', {
      method: 'POST',
      body: JSON.stringify({ theme: 'career', summary: 'summary', fullReport: 'report' }),
    })

    const response = await POST(request)
    const data = await response.json()

    // isValidEmail rejects the email => checkStripeActive returns false => FORBIDDEN
    expect(response.status).toBe(403)
  })

  it('should reject invalid email format for Stripe check (POST)', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-bad-email', email: 'not-an-email' },
      expires: '2025-12-31',
    } as any)

    const request = new NextRequest('http://localhost/api/consultation', {
      method: 'POST',
      body: JSON.stringify({ theme: 'career', summary: 'summary', fullReport: 'report' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(403)
  })
})

// =============================================================
// Edge Cases
// =============================================================

describe('Consultation API - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key'
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    setupStripeActive('test@example.com')
  })

  it('POST: should handle body that is a non-object type (array)', async () => {
    const request = new NextRequest('http://localhost/api/consultation', {
      method: 'POST',
      body: JSON.stringify([1, 2, 3]),
    })

    const response = await POST(request)
    const data = await response.json()

    // Array passes typeof === 'object' but the Zod schema should reject it or
    // the route should handle it; depends on implementation.
    // The route checks `typeof rawBody !== 'object'` but arrays are objects in JS,
    // so it falls through to Zod validation. The Zod mock handles arrays.
    expect([400, 422]).toContain(response.status)
  })

  it('POST: should handle body with extra unknown fields gracefully', async () => {
    vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
      id: 'cons-extra',
      createdAt: new Date(),
    } as any)
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.personaMemory.create).mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost/api/consultation', {
      method: 'POST',
      body: JSON.stringify({
        theme: 'career',
        summary: 'summary',
        fullReport: 'report',
        unknownField: 'should be ignored',
        anotherField: 42,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
  })

  it('GET: should handle concurrent findMany and count via Promise.all', async () => {
    // Verify both are called (Promise.all behavior)
    vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
    vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

    const request = new NextRequest('http://localhost/api/consultation', {
      method: 'GET',
    })

    await GET(request)

    expect(prisma.consultationHistory.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.consultationHistory.count).toHaveBeenCalledTimes(1)
  })

  it('POST: should log warning on validation failure', async () => {
    const request = new NextRequest('http://localhost/api/consultation', {
      method: 'POST',
      body: JSON.stringify({
        theme: 'x'.repeat(101),
        summary: 'test',
        fullReport: 'report',
      }),
    })

    await POST(request)

    expect(logger.warn).toHaveBeenCalledWith(
      '[Consultation POST] validation failed',
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })

  it('GET: should log warning on query validation failure', async () => {
    const request = new NextRequest('http://localhost/api/consultation?limit=abc', {
      method: 'GET',
    })

    await GET(request)

    expect(logger.warn).toHaveBeenCalledWith(
      '[Consultation GET] query validation failed',
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })

  it('POST: should accept all valid locale values', async () => {
    const validLocales = ['ko', 'en', 'ja', 'zh']

    for (const locale of validLocales) {
      vi.clearAllMocks()
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      setupStripeActive('test@example.com')
      vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
        id: `cons-locale-${locale}`,
        createdAt: new Date(),
      } as any)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.personaMemory.create).mockResolvedValue({} as any)

      const request = new NextRequest('http://localhost/api/consultation', {
        method: 'POST',
        body: JSON.stringify({
          theme: 'career',
          summary: 'summary',
          fullReport: 'report',
          locale,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)
    }
  })
})
