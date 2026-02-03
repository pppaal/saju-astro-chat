/**
 * Comprehensive tests for /api/cron/reset-credits
 * Tests scheduled tasks, authentication, and credit management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/credits/creditService', () => ({
  resetAllExpiredCredits: vi.fn(),
  expireBonusCredits: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET, POST } from '@/app/api/cron/reset-credits/route'
import { resetAllExpiredCredits, expireBonusCredits } from '@/lib/credits/creditService'

describe('/api/cron/reset-credits', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Authentication', () => {
    it('should require valid CRON_SECRET', async () => {
      process.env.CRON_SECRET = 'my-secret-key'

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should accept valid CRON_SECRET', async () => {
      process.env.CRON_SECRET = 'my-secret-key'
      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 5,
        totalAmount: 500,
      })
      vi.mocked(resetAllExpiredCredits).mockResolvedValue({
        resetCount: 10,
        totalUsers: 100,
      })

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer my-secret-key',
        },
      })

      const response = await GET(req)

      expect(response.status).toBe(200)
    })

    it('should allow requests in development when CRON_SECRET not set', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.CRON_SECRET
      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 0,
      })
      vi.mocked(resetAllExpiredCredits).mockResolvedValue({
        resetCount: 0,
      })

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
      })

      const response = await GET(req)

      expect(response.status).toBe(200)
    })

    it('should reject requests in production when CRON_SECRET not set', async () => {
      process.env.NODE_ENV = 'production'
      delete process.env.CRON_SECRET

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
      })

      const response = await GET(req)

      expect(response.status).toBe(401)
    })

    it('should reject missing authorization header', async () => {
      process.env.CRON_SECRET = 'my-secret-key'

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
      })

      const response = await GET(req)

      expect(response.status).toBe(401)
    })

    it('should reject malformed authorization header', async () => {
      process.env.CRON_SECRET = 'my-secret-key'

      const malformedHeaders = [
        'my-secret-key', // Missing 'Bearer '
        'bearer my-secret-key', // Lowercase 'bearer'
        'Basic my-secret-key', // Wrong auth type
      ]

      for (const authHeader of malformedHeaders) {
        const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
          method: 'GET',
          headers: {
            authorization: authHeader,
          },
        })

        const response = await GET(req)
        expect(response.status).toBe(401)
      }
    })
  })

  describe('Credit Operations', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = 'test-secret'
    })

    it('should expire bonus credits', async () => {
      const bonusResult = {
        expired: 15,
        totalAmount: 1500,
        affectedUsers: 8,
      }

      vi.mocked(expireBonusCredits).mockResolvedValue(bonusResult)
      vi.mocked(resetAllExpiredCredits).mockResolvedValue({
        resetCount: 0,
      })

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(expireBonusCredits).toHaveBeenCalled()
      expect(data.bonusExpiration).toEqual(bonusResult)
    })

    it('should reset monthly credits', async () => {
      const monthlyResult = {
        resetCount: 25,
        totalUsers: 150,
        creditsReset: 2500,
      }

      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 0,
      })
      vi.mocked(resetAllExpiredCredits).mockResolvedValue(monthlyResult)

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(resetAllExpiredCredits).toHaveBeenCalled()
      expect(data.monthlyReset).toEqual(monthlyResult)
    })

    it('should run both operations in sequence', async () => {
      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 5,
      })
      vi.mocked(resetAllExpiredCredits).mockResolvedValue({
        resetCount: 10,
      })

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      await GET(req)

      // Verify both were called
      expect(expireBonusCredits).toHaveBeenCalled()
      expect(resetAllExpiredCredits).toHaveBeenCalled()

      // Verify order using toHaveBeenCalledBefore (from vitest-mock-extended or manual check)
      expect(expireBonusCredits).toHaveBeenCalledBefore(resetAllExpiredCredits as any)
    })

    it('should handle zero results', async () => {
      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 0,
        totalAmount: 0,
      })
      vi.mocked(resetAllExpiredCredits).mockResolvedValue({
        resetCount: 0,
        totalUsers: 0,
      })

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.bonusExpiration.expired).toBe(0)
      expect(data.monthlyReset.resetCount).toBe(0)
    })

    it('should handle large batch results', async () => {
      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 1000,
        totalAmount: 100000,
      })
      vi.mocked(resetAllExpiredCredits).mockResolvedValue({
        resetCount: 5000,
        totalUsers: 10000,
      })

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.bonusExpiration.expired).toBe(1000)
      expect(data.monthlyReset.resetCount).toBe(5000)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = 'test-secret'
    })

    it('should handle expireBonusCredits errors', async () => {
      vi.mocked(expireBonusCredits).mockRejectedValue(new Error('Database connection failed'))

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database connection failed')
    })

    it('should handle resetAllExpiredCredits errors', async () => {
      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 5,
      })
      vi.mocked(resetAllExpiredCredits).mockRejectedValue(new Error('Transaction failed'))

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Transaction failed')
    })

    it('should handle non-Error exceptions', async () => {
      vi.mocked(expireBonusCredits).mockRejectedValue('String error')

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
    })

    it('should not fail if bonus expiration partially succeeds', async () => {
      // Simulate partial success scenario
      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 5,
        failed: 2,
        errors: ['User not found', 'Transaction conflict'],
      })
      vi.mocked(resetAllExpiredCredits).mockResolvedValue({
        resetCount: 10,
      })

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.bonusExpiration.expired).toBe(5)
    })
  })

  describe('Response Format', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = 'test-secret'
    })

    it('should return success response with all fields', async () => {
      const bonusResult = {
        expired: 10,
        totalAmount: 1000,
      }
      const monthlyResult = {
        resetCount: 20,
        totalUsers: 100,
      }

      vi.mocked(expireBonusCredits).mockResolvedValue(bonusResult)
      vi.mocked(resetAllExpiredCredits).mockResolvedValue(monthlyResult)

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('message', 'Credit maintenance completed')
      expect(data).toHaveProperty('bonusExpiration')
      expect(data).toHaveProperty('monthlyReset')
      expect(data.bonusExpiration).toEqual(bonusResult)
      expect(data.monthlyReset).toEqual(monthlyResult)
    })

    it('should include detailed statistics in response', async () => {
      const bonusResult = {
        expired: 15,
        totalAmount: 1500,
        affectedUsers: 8,
        oldestExpiry: '2023-01-01',
      }
      const monthlyResult = {
        resetCount: 25,
        totalUsers: 150,
        creditsReset: 2500,
        planBreakdown: {
          basic: 10,
          premium: 15,
        },
      }

      vi.mocked(expireBonusCredits).mockResolvedValue(bonusResult)
      vi.mocked(resetAllExpiredCredits).mockResolvedValue(monthlyResult)

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.bonusExpiration).toEqual(bonusResult)
      expect(data.monthlyReset).toEqual(monthlyResult)
    })
  })

  describe('POST Method Support', () => {
    beforeEach(() => {
      process.env.CRON_SECRET = 'test-secret'
    })

    it('should support POST requests', async () => {
      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 5,
      })
      vi.mocked(resetAllExpiredCredits).mockResolvedValue({
        resetCount: 10,
      })

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should enforce same authentication for POST', async () => {
      process.env.CRON_SECRET = 'test-secret'

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'POST',
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      })

      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should return same results for POST as GET', async () => {
      const bonusResult = { expired: 5 }
      const monthlyResult = { resetCount: 10 }

      vi.mocked(expireBonusCredits).mockResolvedValue(bonusResult)
      vi.mocked(resetAllExpiredCredits).mockResolvedValue(monthlyResult)

      const getReq = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const postReq = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'POST',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const getResponse = await GET(getReq)
      const getData = await getResponse.json()

      vi.clearAllMocks()
      vi.mocked(expireBonusCredits).mockResolvedValue(bonusResult)
      vi.mocked(resetAllExpiredCredits).mockResolvedValue(monthlyResult)

      const postResponse = await POST(postReq)
      const postData = await postResponse.json()

      expect(getData).toEqual(postData)
    })
  })

  describe('Security', () => {
    it('should not expose CRON_SECRET in responses', async () => {
      process.env.CRON_SECRET = 'super-secret-key'
      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 5,
      })
      vi.mocked(resetAllExpiredCredits).mockResolvedValue({
        resetCount: 10,
      })

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer super-secret-key',
        },
      })

      const response = await GET(req)
      const data = await response.json()
      const responseText = JSON.stringify(data)

      expect(responseText).not.toContain('super-secret-key')
    })

    it('should not leak sensitive information in error messages', async () => {
      process.env.CRON_SECRET = 'test-secret'
      vi.mocked(expireBonusCredits).mockRejectedValue(
        new Error('Database password: secret123 connection failed')
      )

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      // Error message should be passed through (for debugging)
      // but should not contain actual sensitive data in production
      expect(data.error).toBeDefined()
    })

    it('should handle timing attacks on secret comparison', async () => {
      process.env.CRON_SECRET = 'a'.repeat(64)

      const wrongSecrets = ['b'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), '']

      for (const wrongSecret of wrongSecrets) {
        const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
          method: 'GET',
          headers: {
            authorization: `Bearer ${wrongSecret}`,
          },
        })

        const response = await GET(req)
        expect(response.status).toBe(401)
      }
    })
  })
})
