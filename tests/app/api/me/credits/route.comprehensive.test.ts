/**
 * Comprehensive tests for /api/me/credits
 * Tests credit balance retrieval, usage validation, and feature access control
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock middleware as passthrough - must be before route import
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      // Get session from the mocked getServerSession
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

      // If handler returned a Response directly, use it
      if (result instanceof Response) {
        return result
      }

      // Handle ApiHandlerResult
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

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/credits/creditService', async () => {
  const { PLAN_CONFIG } = await import('@/lib/config/pricing')
  return {
    getCreditBalance: vi.fn(),
    canUseCredits: vi.fn(),
    canUseFeature: vi.fn(),
    PLAN_CONFIG,
  }
})

vi.mock('@/lib/http', () => ({
  enforceBodySize: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/api/zodValidation', () => ({
  creditCheckRequestSchema: {
    safeParse: vi.fn((data: any) => {
      // Simulate Zod validation for creditCheckRequestSchema
      if (data === null || typeof data !== 'object') {
        return {
          success: false,
          error: { issues: [{ message: 'Expected object' }] },
        }
      }

      const result: any = {}

      // Validate type field
      if (data.type !== undefined) {
        const validTypes = ['reading', 'compatibility', 'followUp']
        if (data.type === null) {
          return {
            success: false,
            error: { issues: [{ message: 'Invalid type' }] },
          }
        }
        if (!validTypes.includes(data.type)) {
          return {
            success: false,
            error: { issues: [{ message: 'Invalid enum value' }] },
          }
        }
        result.type = data.type
      }

      // Validate feature field
      if (data.feature !== undefined) {
        const validFeatures = [
          'advancedAstrology',
          'counselor',
          'dreamAnalysis',
          'compatibility',
          'calendar',
          'pastLife',
          'lifeReading',
          'saju',
          'tarot',
          'destiny_map',
        ]
        if (data.feature === null) {
          return {
            success: false,
            error: { issues: [{ message: 'Invalid feature' }] },
          }
        }
        if (!validFeatures.includes(data.feature)) {
          return {
            success: false,
            error: { issues: [{ message: 'Invalid enum value' }] },
          }
        }
        result.feature = data.feature
      }

      // Validate amount field
      if (data.amount !== undefined) {
        if (data.amount === null || typeof data.amount === 'string') {
          if (typeof data.amount === 'string' && !isNaN(Number(data.amount))) {
            const num = Number(data.amount)
            if (Number.isInteger(num) && num >= 1 && num <= 1000) {
              result.amount = num
            } else {
              return {
                success: false,
                error: { issues: [{ message: 'Expected integer between 1 and 1000' }] },
              }
            }
          } else {
            return {
              success: false,
              error: { issues: [{ message: 'Expected number' }] },
            }
          }
        } else if (typeof data.amount === 'number') {
          if (!Number.isInteger(data.amount)) {
            return {
              success: false,
              error: { issues: [{ message: 'Expected integer' }] },
            }
          }
          if (data.amount < 1) {
            return {
              success: false,
              error: { issues: [{ message: 'Number must be greater than or equal to 1' }] },
            }
          }
          if (data.amount > 1000) {
            return {
              success: false,
              error: { issues: [{ message: 'Number must be less than or equal to 1000' }] },
            }
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
import {
  getCreditBalance,
  canUseCredits,
  canUseFeature,
  PLAN_CONFIG,
} from '@/lib/credits/creditService'

describe('/api/me/credits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/me/credits - Credit Balance', () => {
    it('should return 401 for non-authenticated users', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await GET(new NextRequest('http://localhost:3000/api/me/credits'))
      const data = await response.json()

      expect(response.status).toBe(401)
    })

    it('should return user credit balance for authenticated users', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      }

      const mockBalance = {
        plan: 'premium',
        monthlyCredits: 100,
        usedCredits: 25,
        bonusCredits: 10,
        remainingCredits: 85,
        totalCredits: 110,
        compatibility: { used: 2, limit: 10, remaining: 8 },
        followUp: { used: 1, limit: 5, remaining: 4 },
        historyRetention: 365,
        periodEnd: new Date('2024-12-31'),
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(getCreditBalance).mockResolvedValue(mockBalance as any)

      const response = await GET(new NextRequest('http://localhost:3000/api/me/credits'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.isLoggedIn).toBe(true)
      expect(data.data.plan).toBe('premium')
      expect(data.data.credits.monthly).toBe(100)
      expect(data.data.credits.used).toBe(25)
      expect(data.data.credits.bonus).toBe(10)
      expect(data.data.credits.remaining).toBe(85)
      expect(data.data.credits.total).toBe(110)
      expect(data.data.compatibility).toEqual({ used: 2, limit: 10, remaining: 8 })
      expect(data.data.followUp).toEqual({ used: 1, limit: 5, remaining: 4 })
      expect(getCreditBalance).toHaveBeenCalledWith('user-123')
    })

    it('should return plan features', async () => {
      const mockSession = {
        user: { id: 'user-123' },
      }

      const mockBalance = {
        plan: 'premium',
        monthlyCredits: 100,
        usedCredits: 0,
        bonusCredits: 0,
        remainingCredits: 100,
        totalCredits: 100,
        compatibility: { used: 0, limit: 10, remaining: 10 },
        followUp: { used: 0, limit: 5, remaining: 5 },
        historyRetention: 365,
        periodEnd: new Date(),
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(getCreditBalance).mockResolvedValue(mockBalance as any)

      const response = await GET(new NextRequest('http://localhost:3000/api/me/credits'))
      const data = await response.json()

      expect(data.data.features).toBeDefined()
      expect(data.data.features).toEqual(PLAN_CONFIG.premium.features)
    })

    it('should handle getCreditBalance errors', async () => {
      const mockSession = {
        user: { id: 'user-123' },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(getCreditBalance).mockRejectedValue(new Error('Database error'))

      const response = await GET(new NextRequest('http://localhost:3000/api/me/credits'))
      const data = await response.json()

      expect(response.status).toBe(500)
    })

    it('should include period end date', async () => {
      const mockSession = {
        user: { id: 'user-123' },
      }

      const periodEnd = new Date('2024-12-31T23:59:59Z')
      const mockBalance = {
        plan: 'premium',
        monthlyCredits: 100,
        usedCredits: 0,
        bonusCredits: 0,
        remainingCredits: 100,
        totalCredits: 100,
        compatibility: { used: 0, limit: 10, remaining: 10 },
        followUp: { used: 0, limit: 5, remaining: 5 },
        historyRetention: 365,
        periodEnd,
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(getCreditBalance).mockResolvedValue(mockBalance as any)

      const response = await GET(new NextRequest('http://localhost:3000/api/me/credits'))
      const data = await response.json()

      expect(data.data.periodEnd).toBeDefined()
    })
  })

  describe('POST /api/me/credits - Credit Usage Check', () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com' },
    }

    it('should return 401 for unauthenticated users', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 1 }),
      })

      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should check credit availability for reading type', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 75,
      } as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 1 }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.allowed).toBe(true)
      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })

    it('should check compatibility credit type', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 8,
      } as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'compatibility', amount: 1 }),
      })

      await POST(req)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'compatibility', 1)
    })

    it('should check followUp credit type', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 4,
      } as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'followUp', amount: 1 }),
      })

      await POST(req)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'followUp', 1)
    })

    it('should default to reading type if not specified', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseCredits).mockResolvedValue({ allowed: true } as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ amount: 1 }),
      })

      await POST(req)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })

    it('should reject invalid credit type via Zod validation', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'invalid_type', amount: 1 }),
      })

      const response = await POST(req)
      const data = await response.json()

      // Zod validation returns VALIDATION_ERROR (422)
      expect(response.status).toBe(422)
    })

    it('should handle custom credit amount', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseCredits).mockResolvedValue({ allowed: true } as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 5 }),
      })

      await POST(req)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 5)
    })

    it('should reject amount exceeding maximum via Zod validation', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 99999 }),
      })

      const response = await POST(req)

      // Zod schema has max(1000), so 99999 is rejected
      expect(response.status).toBe(422)
    })

    it('should reject zero amount via Zod validation', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 0 }),
      })

      const response = await POST(req)

      // Zod schema has min(1), so 0 is rejected
      expect(response.status).toBe(422)
    })

    it('should reject negative amount via Zod validation', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: -5 }),
      })

      const response = await POST(req)

      // Zod schema has min(1), so -5 is rejected
      expect(response.status).toBe(422)
    })

    it('should reject non-numeric amount via Zod validation', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 'invalid' }),
      })

      const response = await POST(req)

      // Zod rejects non-numeric amount
      expect(response.status).toBe(422)
    })

    it('should reject decimal amounts via Zod validation', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 3.7 }),
      })

      const response = await POST(req)

      // Zod schema has int(), so 3.7 is rejected
      expect(response.status).toBe(422)
    })
  })

  describe('POST /api/me/credits - Feature Access Check', () => {
    const mockSession = {
      user: { id: 'user-123' },
    }

    it('should check feature availability', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseFeature).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'compatibility' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.feature).toBe('compatibility')
      expect(data.data.allowed).toBe(true)
      expect(canUseFeature).toHaveBeenCalledWith('user-123', 'compatibility')
    })

    it('should return reason when feature not available', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseFeature).mockResolvedValue(false)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'compatibility' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.data.allowed).toBe(false)
      expect(data.data.reason).toBe('feature_not_available')
    })

    it('should reject invalid feature via Zod validation', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'invalid_feature' }),
      })

      const response = await POST(req)

      // Zod validation rejects invalid feature enum value
      expect(response.status).toBe(422)
    })

    it('should prioritize feature check over credit check', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseFeature).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({
          feature: 'compatibility',
          type: 'reading',
          amount: 1,
        }),
      })

      await POST(req)

      expect(canUseFeature).toHaveBeenCalled()
      expect(canUseCredits).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/me/credits - Input Validation', () => {
    const mockSession = {
      user: { id: 'user-123' },
    }

    it('should reject empty body', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: '',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should reject non-JSON body', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: 'not-json',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should reject non-object body', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify('string'),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should accept empty object and use defaults', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseCredits).mockResolvedValue({ allowed: true } as any)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })
  })

  describe('Error Handling', () => {
    it('should handle canUseCredits errors', async () => {
      const mockSession = {
        user: { id: 'user-123' },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseCredits).mockRejectedValue(new Error('Service unavailable'))

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 1 }),
      })

      const response = await POST(req)

      expect(response.status).toBe(500)
    })

    it('should handle canUseFeature errors', async () => {
      const mockSession = {
        user: { id: 'user-123' },
      }

      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseFeature).mockRejectedValue(new Error('Database error'))

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'compatibility' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(500)
    })

    it('should handle session errors', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Auth error'))

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(500)
    })
  })
})
