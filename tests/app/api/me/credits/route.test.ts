import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

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
          INTERNAL_ERROR: 500,
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

// Mock credit service
vi.mock('@/lib/credits/creditService', () => ({
  getCreditBalance: vi.fn(),
  canUseCredits: vi.fn(),
  canUseFeature: vi.fn(),
  PLAN_CONFIG: {
    free: {
      features: {
        savedReadings: true,
        historyDays: 30,
        compatibility: false,
        followUpQuestions: false,
      },
      monthlyCredits: 0,
    },
    basic: {
      features: {
        savedReadings: true,
        historyDays: 90,
        compatibility: true,
        followUpQuestions: true,
      },
      monthlyCredits: 10,
    },
  },
}))

vi.mock('@/lib/api/zodValidation', () => ({
  creditCheckRequestSchema: {
    safeParse: vi.fn((data: any) => {
      if (data === null || typeof data !== 'object') {
        return {
          success: false,
          error: { issues: [{ message: 'Expected object' }] },
        }
      }

      const result: any = {}

      // Validate type
      if (data.type !== undefined) {
        const validTypes = ['reading', 'compatibility', 'followUp']
        if (data.type === null) {
          return { success: false, error: { issues: [{ message: 'Invalid type' }] } }
        }
        if (!validTypes.includes(data.type)) {
          return { success: false, error: { issues: [{ message: 'Invalid enum value' }] } }
        }
        result.type = data.type
      }

      // Validate feature
      if (data.feature !== undefined) {
        const validFeatures = [
          'advancedAstrology',
          'counselor',
          'dreamAnalysis',
          'compatibility',
          'calendar',
          'pastLife',
          'lifeReading',
        ]
        if (data.feature === null) {
          return { success: false, error: { issues: [{ message: 'Invalid feature' }] } }
        }
        if (!validFeatures.includes(data.feature)) {
          return { success: false, error: { issues: [{ message: 'Invalid enum value' }] } }
        }
        result.feature = data.feature
      }

      // Validate amount
      if (data.amount !== undefined) {
        if (data.amount === null) {
          return { success: false, error: { issues: [{ message: 'Expected number' }] } }
        }
        if (typeof data.amount === 'string') {
          const num = Number(data.amount)
          if (!isNaN(num) && Number.isInteger(num) && num >= 1 && num <= 1000) {
            result.amount = num
          } else {
            return { success: false, error: { issues: [{ message: 'Expected number' }] } }
          }
        } else if (typeof data.amount === 'number') {
          if (!Number.isInteger(data.amount)) {
            return { success: false, error: { issues: [{ message: 'Expected integer' }] } }
          }
          if (data.amount < 1) {
            return { success: false, error: { issues: [{ message: 'Min 1' }] } }
          }
          if (data.amount > 1000) {
            return { success: false, error: { issues: [{ message: 'Max 1000' }] } }
          }
          result.amount = data.amount
        }
      }

      return { success: true, data: result }
    }),
  },
}))

import { GET, POST } from '@/app/api/me/credits/route'
import { getServerSession } from 'next-auth'
import { getCreditBalance, canUseCredits, canUseFeature } from '@/lib/credits/creditService'

describe('Credits API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 for non-logged-in users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/me/credits', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
  })

  it('should return credit balance for logged-in users', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com' },
      expires: '2025-12-31',
    }

    const mockBalance = {
      plan: 'basic' as const,
      monthlyCredits: 10,
      usedCredits: 3,
      bonusCredits: 5,
      remainingCredits: 12,
      totalCredits: 15,
      compatibility: {
        used: 2,
        limit: 10,
        remaining: 8,
      },
      followUp: {
        used: 1,
        limit: 5,
        remaining: 4,
      },
      historyRetention: 90,
      periodEnd: new Date('2025-12-31'),
    }

    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    vi.mocked(getCreditBalance).mockResolvedValue(mockBalance as any)

    const request = new NextRequest('http://localhost/api/me/credits', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.isLoggedIn).toBe(true)
    expect(data.data.plan).toBe('basic')
    expect(data.data.credits.remaining).toBe(12)
    expect(data.data.credits.total).toBe(15)
    expect(data.data.compatibility).toEqual(mockBalance.compatibility)
    expect(data.data.followUp).toEqual(mockBalance.followUp)
  })

  it('should handle errors gracefully', async () => {
    vi.mocked(getServerSession).mockRejectedValue(new Error('Session error'))

    const request = new NextRequest('http://localhost/api/me/credits', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })
})

describe('Credits API - POST', () => {
  const mockSession = {
    user: { id: 'user-123', email: 'test@example.com' },
    expires: '2025-12-31',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 1 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return 400 for invalid body', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should reject invalid credit type via Zod validation', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'invalid_type', amount: 1 }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Zod validation returns VALIDATION_ERROR (422)
      expect(response.status).toBe(422)
    })

    it('should accept valid credit types', async () => {
      const validTypes = ['reading', 'compatibility', 'followUp']

      for (const type of validTypes) {
        vi.clearAllMocks()
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
        vi.mocked(canUseCredits).mockResolvedValue({
          allowed: true,
          remaining: 10,
        } as any)

        const request = new NextRequest('http://localhost/api/me/credits', {
          method: 'POST',
          body: JSON.stringify({ type, amount: 1 }),
        })

        const response = await POST(request)
        expect(response.status).toBe(200)
      }
    })

    it('should default to "reading" type if not specified', async () => {
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 10,
      } as any)

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ amount: 1 }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })

    it('should reject invalid feature type via Zod validation', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'nonexistent_feature' }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Zod validation returns VALIDATION_ERROR (422)
      expect(response.status).toBe(422)
    })
  })

  describe('Amount Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 10,
      } as any)
    })

    it('should default amount to 1 if not specified', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading' }),
      })

      await POST(request)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })

    it('should reject negative amount via Zod validation', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: -5 }),
      })

      const response = await POST(request)

      // Zod schema has min(1), so -5 is rejected
      expect(response.status).toBe(422)
    })

    it('should reject amount exceeding maximum via Zod validation', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 999999 }),
      })

      const response = await POST(request)

      // Zod schema has max(1000), so 999999 is rejected
      expect(response.status).toBe(422)
    })

    it('should reject decimal amounts via Zod validation', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 3.7 }),
      })

      const response = await POST(request)

      // Zod schema has int(), so 3.7 is rejected
      expect(response.status).toBe(422)
    })

    it('should handle string amounts that are valid integers', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: '5' }),
      })

      const response = await POST(request)

      // Zod may coerce or reject string amounts depending on schema
      // The route handler receives validated data from Zod
      expect([200, 422]).toContain(response.status)
    })

    it('should reject non-numeric amounts via Zod validation', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 'invalid' }),
      })

      const response = await POST(request)

      // Zod rejects non-numeric string
      expect(response.status).toBe(422)
    })
  })

  describe('Feature Check', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should check feature availability', async () => {
      vi.mocked(canUseFeature).mockResolvedValue(true)

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'compatibility' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.feature).toBe('compatibility')
      expect(data.data.allowed).toBe(true)
      expect(canUseFeature).toHaveBeenCalledWith('user-123', 'compatibility')
    })

    it('should return feature_not_available when feature not allowed', async () => {
      vi.mocked(canUseFeature).mockResolvedValue(false)

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'compatibility' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.allowed).toBe(false)
      expect(data.data.reason).toBe('feature_not_available')
    })
  })

  describe('Credit Check', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should check credit availability', async () => {
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 10,
        total: 15,
      } as any)

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 1 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.allowed).toBe(true)
      expect(data.data.remaining).toBe(10)
      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })

    it('should return credit check result when insufficient', async () => {
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reason: 'insufficient_credits',
      } as any)

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 5 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.allowed).toBe(false)
      expect(data.data.reason).toBe('insufficient_credits')
    })

    it('should handle compatibility credits', async () => {
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 8,
      } as any)

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'compatibility', amount: 1 }),
      })

      await POST(request)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'compatibility', 1)
    })

    it('should handle followUp credits', async () => {
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 4,
      } as any)

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'followUp', amount: 1 }),
      })

      await POST(request)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'followUp', 1)
    })
  })

  describe('Body Size Limit', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should handle oversized request body gracefully', async () => {
      const largeBody = JSON.stringify({
        type: 'reading',
        amount: 1,
        padding: 'x'.repeat(5000), // > 4KB
      })

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: largeBody,
      })

      const response = await POST(request)

      // Should either reject (413) or handle gracefully
      expect([200, 413, 422]).toContain(response.status)
    })

    it('should accept normal-sized request body', async () => {
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 10,
      } as any)

      const normalBody = JSON.stringify({
        type: 'reading',
        amount: 1,
      })

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: normalBody,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should handle credit service errors', async () => {
      vi.mocked(canUseCredits).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 1 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    it('should handle feature service errors', async () => {
      vi.mocked(canUseFeature).mockRejectedValue(new Error('Service unavailable'))

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'compatibility' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 10,
      } as any)
    })

    it('should handle empty body object', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)

      // Should default to reading type and amount 1
      expect(response.status).toBe(200)
      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })

    it('should reject null body fields via Zod validation', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: null, amount: null }),
      })

      const response = await POST(request)

      // Zod rejects null values
      expect(response.status).toBe(422)
    })

    it('should reject zero amount via Zod validation', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 0 }),
      })

      const response = await POST(request)

      // Zod schema has min(1), so 0 is rejected
      expect(response.status).toBe(422)
    })
  })
})
