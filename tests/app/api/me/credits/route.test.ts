import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/me/credits/route'

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

import { getServerSession } from 'next-auth'
import { getCreditBalance, canUseCredits, canUseFeature } from '@/lib/credits/creditService'

describe('Credits API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return free plan info for non-logged-in users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/me/credits', {
      method: 'GET',
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.isLoggedIn).toBe(false)
    expect(data.plan).toBe('free')
    expect(data.remainingCredits).toBe(0)
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

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.isLoggedIn).toBe(true)
    expect(data.plan).toBe('basic')
    expect(data.credits.remaining).toBe(12)
    expect(data.credits.total).toBe(15)
    expect(data.compatibility).toEqual(mockBalance.compatibility)
    expect(data.followUp).toEqual(mockBalance.followUp)
  })

  it('should handle errors gracefully', async () => {
    vi.mocked(getServerSession).mockRejectedValue(new Error('Session error'))

    const request = new NextRequest('http://localhost/api/me/credits', {
      method: 'GET',
    })

    const response = await GET()
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
      expect(data.error).toBe('not_authenticated')
      expect(data.allowed).toBe(false)
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
      expect(data.error).toBe('invalid_body')
      expect(data.allowed).toBe(false)
    })

    it('should return 400 for invalid credit type', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'invalid_type', amount: 1 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_type')
      expect(data.allowed).toBe(false)
    })

    it('should accept valid credit types', async () => {
      const validTypes = ['reading', 'compatibility', 'followUp']

      for (const type of validTypes) {
        vi.clearAllMocks()
        vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
        vi.mocked(canUseCredits).mockResolvedValue({
          allowed: true,
          remaining: 10,
        })

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
      })

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ amount: 1 }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })

    it('should return 400 for invalid feature type', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ feature: 'nonexistent_feature' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_feature')
      expect(data.allowed).toBe(false)
    })
  })

  describe('Amount Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 10,
      })
    })

    it('should default amount to 1 if not specified', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading' }),
      })

      await POST(request)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })

    it('should clamp amount to minimum 1', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: -5 }),
      })

      await POST(request)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', expect.any(Number))
      const calledAmount = vi.mocked(canUseCredits).mock.calls[0][2]
      expect(calledAmount).toBeGreaterThanOrEqual(1)
    })

    it('should clamp amount to maximum limit', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 999999 }),
      })

      await POST(request)

      const calledAmount = vi.mocked(canUseCredits).mock.calls[0][2]
      expect(calledAmount).toBeLessThanOrEqual(1000)
    })

    it('should truncate decimal amounts', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 3.7 }),
      })

      await POST(request)

      const calledAmount = vi.mocked(canUseCredits).mock.calls[0][2]
      expect(Number.isInteger(calledAmount)).toBe(true)
    })

    it('should handle string amounts', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: '5' }),
      })

      await POST(request)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 5)
    })

    it('should handle non-numeric amounts', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 'invalid' }),
      })

      await POST(request)

      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
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
      expect(data.feature).toBe('compatibility')
      expect(data.allowed).toBe(true)
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
      expect(data.allowed).toBe(false)
      expect(data.reason).toBe('feature_not_available')
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
      })

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 1 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allowed).toBe(true)
      expect(data.remaining).toBe(10)
      expect(canUseCredits).toHaveBeenCalledWith('user-123', 'reading', 1)
    })

    it('should return credit check result when insufficient', async () => {
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reason: 'insufficient_credits',
      })

      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 5 }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.allowed).toBe(false)
      expect(data.reason).toBe('insufficient_credits')
    })

    it('should handle compatibility credits', async () => {
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 8,
      })

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
      })

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
      expect([200, 413]).toContain(response.status)
    })

    it('should accept normal-sized request body', async () => {
      vi.mocked(canUseCredits).mockResolvedValue({
        allowed: true,
        remaining: 10,
      })

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
      })
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

    it('should handle null body fields', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: null, amount: null }),
      })

      const response = await POST(request)

      // Should use defaults
      expect(response.status).toBe(200)
    })

    it('should handle zero amount', async () => {
      const request = new NextRequest('http://localhost/api/me/credits', {
        method: 'POST',
        body: JSON.stringify({ type: 'reading', amount: 0 }),
      })

      await POST(request)

      // Should clamp to minimum 1
      const calledAmount = vi.mocked(canUseCredits).mock.calls[0][2]
      expect(calledAmount).toBeGreaterThanOrEqual(1)
    })
  })
})
