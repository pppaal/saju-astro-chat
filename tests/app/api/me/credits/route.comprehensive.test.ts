/**
 * Comprehensive tests for /api/me/credits
 * Tests credit balance retrieval, usage validation, and feature access control
 */

import { GET, POST } from '@/app/api/me/credits/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import {
  getCreditBalance,
  canUseCredits,
  canUseFeature,
  PLAN_CONFIG,
} from '@/lib/credits/creditService'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/credits/creditService', () => ({
  getCreditBalance: jest.fn(),
  canUseCredits: jest.fn(),
  canUseFeature: jest.fn(),
  PLAN_CONFIG: {
    free: {
      features: {
        saju: true,
        tarot: true,
        destiny_map: false,
        compatibility: false,
      },
    },
    basic: {
      features: {
        saju: true,
        tarot: true,
        destiny_map: true,
        compatibility: true,
      },
    },
  },
}))

jest.mock('@/lib/http', () => ({
  enforceBodySize: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

jest.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

describe('/api/me/credits', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/me/credits - Credit Balance', () => {
    it('should return free plan info for non-authenticated users', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isLoggedIn).toBe(false)
      expect(data.plan).toBe('free')
      expect(data.remainingCredits).toBe(0)
      expect(data.features).toBeDefined()
    })

    it('should return user credit balance for authenticated users', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'test@example.com' },
      }

      const mockBalance = {
        plan: 'basic',
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

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(getCreditBalance as jest.Mock).mockResolvedValue(mockBalance)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isLoggedIn).toBe(true)
      expect(data.plan).toBe('basic')
      expect(data.credits.monthly).toBe(100)
      expect(data.credits.used).toBe(25)
      expect(data.credits.bonus).toBe(10)
      expect(data.credits.remaining).toBe(85)
      expect(data.credits.total).toBe(110)
      expect(data.compatibility).toEqual({ used: 2, limit: 10, remaining: 8 })
      expect(data.followUp).toEqual({ used: 1, limit: 5, remaining: 4 })
      expect(getCreditBalance).toHaveBeenCalledWith('user-123')
    })

    it('should return plan features', async () => {
      const mockSession = {
        user: { id: 'user-123' },
      }

      const mockBalance = {
        plan: 'basic',
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

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(getCreditBalance as jest.Mock).mockResolvedValue(mockBalance)

      const response = await GET()
      const data = await response.json()

      expect(data.features).toBeDefined()
      expect(data.features).toEqual(PLAN_CONFIG.basic.features)
    })

    it('should handle getCreditBalance errors', async () => {
      const mockSession = {
        user: { id: 'user-123' },
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(getCreditBalance as jest.Mock).mockRejectedValue(new Error('Database error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
    })

    it('should include period end date', async () => {
      const mockSession = {
        user: { id: 'user-123' },
      }

      const periodEnd = new Date('2024-12-31T23:59:59Z')
      const mockBalance = {
        plan: 'basic',
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

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(getCreditBalance as jest.Mock).mockResolvedValue(mockBalance)

      const response = await GET()
      const data = await response.json()

      expect(data.periodEnd).toBeDefined()
    })
  })

  describe('POST /api/me/credits - Credit Usage Check', () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@example.com' },
    }

    it('should return 401 for unauthenticated users', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 1 }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('not_authenticated')
      expect(data.allowed).toBe(false)
    })

    it('should check credit availability for reading type', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseCredits as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 75,
      })

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 1 }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allowed).toBe(true)
      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })

    it('should check compatibility credit type', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseCredits as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 8,
      })

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'compatibility', amount: 1 }),
      })

      await POST(req)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'compatibility', 1)
    })

    it('should check followUp credit type', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseCredits as jest.Mock).mockResolvedValue({
        allowed: true,
        remaining: 4,
      })

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'followUp', amount: 1 }),
      })

      await POST(req)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'followUp', 1)
    })

    it('should default to reading type if not specified', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseCredits as jest.Mock).mockResolvedValue({ allowed: true })

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ amount: 1 }),
      })

      await POST(req)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })

    it('should reject invalid credit type', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'invalid_type', amount: 1 }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_type')
      expect(data.allowed).toBe(false)
    })

    it('should handle custom credit amount', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseCredits as jest.Mock).mockResolvedValue({ allowed: true })

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 5 }),
      })

      await POST(req)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 5)
    })

    it('should clamp amount to maximum limit', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseCredits as jest.Mock).mockResolvedValue({ allowed: false })

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 99999 }),
      })

      await POST(req)

      // Should clamp to MAX_CREDIT_AMOUNT (likely 100 or similar)
      const calls = (canUseCredits as jest.Mock).mock.calls[0]
      expect(calls[2]).toBeLessThanOrEqual(100)
    })

    it('should clamp amount to minimum of 1', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseCredits as jest.Mock).mockResolvedValue({ allowed: true })

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 0 }),
      })

      await POST(req)

      const calls = (canUseCredits as jest.Mock).mock.calls[0]
      expect(calls[2]).toBe(1)
    })

    it('should handle negative amount', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseCredits as jest.Mock).mockResolvedValue({ allowed: true })

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: -5 }),
      })

      await POST(req)

      const calls = (canUseCredits as jest.Mock).mock.calls[0]
      expect(calls[2]).toBe(1) // Should default to 1
    })

    it('should handle non-numeric amount', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseCredits as jest.Mock).mockResolvedValue({ allowed: true })

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 'invalid' }),
      })

      await POST(req)

      const calls = (canUseCredits as jest.Mock).mock.calls[0]
      expect(calls[2]).toBe(1) // Should default to 1
    })

    it('should handle decimal amounts by truncating', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseCredits as jest.Mock).mockResolvedValue({ allowed: true })

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 3.7 }),
      })

      await POST(req)

      const calls = (canUseCredits as jest.Mock).mock.calls[0]
      expect(calls[2]).toBe(3) // Should truncate to 3
    })
  })

  describe('POST /api/me/credits - Feature Access Check', () => {
    const mockSession = {
      user: { id: 'user-123' },
    }

    it('should check feature availability', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseFeature as jest.Mock).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'saju' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.feature).toBe('saju')
      expect(data.allowed).toBe(true)
      expect(canUseFeature).toHaveBeenCalledWith('user-123', 'saju')
    })

    it('should return reason when feature not available', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseFeature as jest.Mock).mockResolvedValue(false)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'destiny_map' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.allowed).toBe(false)
      expect(data.reason).toBe('feature_not_available')
    })

    it('should reject invalid feature', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'invalid_feature' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_feature')
      expect(data.allowed).toBe(false)
    })

    it('should prioritize feature check over credit check', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseFeature as jest.Mock).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({
          feature: 'tarot',
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
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: '',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_body')
    })

    it('should reject non-JSON body', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: 'not-json',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_body')
    })

    it('should reject non-object body', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify('string'),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_body')
    })

    it('should accept empty object and use defaults', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseCredits as jest.Mock).mockResolvedValue({ allowed: true })

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

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseCredits as jest.Mock).mockRejectedValue(new Error('Service unavailable'))

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 1 }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Service unavailable')
    })

    it('should handle canUseFeature errors', async () => {
      const mockSession = {
        user: { id: 'user-123' },
      }

      ;(getServerSession as jest.Mock).mockResolvedValue(mockSession)
      ;(canUseFeature as jest.Mock).mockRejectedValue(new Error('Database error'))

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'saju' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
    })

    it('should handle session errors', async () => {
      ;(getServerSession as jest.Mock).mockRejectedValue(new Error('Auth error'))

      const req = new NextRequest('http://localhost:3000/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(500)
    })
  })
})
