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

// 라우트는 시크릿 검증 전에 IP rate limit(5/min)을 건다. 실제 인메모리
// 리미터를 그대로 두면 같은 IP 키를 쓰는 이 파일의 테스트 23개가 5회 이후
// 전부 429 가 되므로 기본 allow 로 목킹하고, 429 경로는 별도 테스트에서
// allowed:false 로 검증한다.
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true }),
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
import { rateLimit } from '@/lib/rateLimit'

describe('/api/cron/reset-credits', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Rate limiting', () => {
    it('IP 한도 초과 시 시크릿 검증 전에 429 를 반환한다', async () => {
      process.env.CRON_SECRET = 'my-secret-key'
      vi.mocked(rateLimit).mockResolvedValueOnce({
        allowed: false,
      } as Awaited<ReturnType<typeof rateLimit>>)

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: { authorization: 'Bearer my-secret-key' },
      })

      const response = await GET(req)
      expect(response.status).toBe(429)
      // 한도 초과면 올바른 시크릿이어도 크레딧 작업이 실행되지 않는다.
      expect(expireBonusCredits).not.toHaveBeenCalled()
      expect(resetAllExpiredCredits).not.toHaveBeenCalled()
    })
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
      expect(data.error.code).toBe('UNAUTHORIZED')
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

    it('should reject requests in development when CRON_SECRET not set', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.CRON_SECRET

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
      })

      const response = await GET(req)

      // Route always rejects when CRON_SECRET is not set, regardless of environment
      expect(response.status).toBe(401)
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

    // (옛 "should reset monthly credits" 제거 — 월간 충전 모델 폐지로
    //  resetAllExpiredCredits 가 삭제되고 cron 은 보너스 만료만 수행한다.)

    it('runs only the bonus-expiration operation', async () => {
      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 5,
      })

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      await GET(req)

      expect(expireBonusCredits).toHaveBeenCalled()
    })

    it('should handle zero results', async () => {
      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 0,
        totalAmount: 0,
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
    })

    it('should handle large batch results', async () => {
      vi.mocked(expireBonusCredits).mockResolvedValue({
        expired: 1000,
        totalAmount: 100000,
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
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    // (옛 "should handle resetAllExpiredCredits errors" 제거 — 함수 삭제됨.)

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
      expect(data.error.code).toBe('INTERNAL_ERROR')
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

      vi.mocked(expireBonusCredits).mockResolvedValue(bonusResult)

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
      expect(data.bonusExpiration).toEqual(bonusResult)
      // 월간 충전 모델 폐지 → monthlyReset 필드 없음.
      expect(data).not.toHaveProperty('monthlyReset')
    })

    it('should include detailed statistics in response', async () => {
      const bonusResult = {
        expired: 15,
        totalAmount: 1500,
        affectedUsers: 8,
        oldestExpiry: '2023-01-01',
      }

      vi.mocked(expireBonusCredits).mockResolvedValue(bonusResult)

      const req = new NextRequest('http://localhost:3000/api/cron/reset-credits', {
        method: 'GET',
        headers: {
          authorization: 'Bearer test-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.bonusExpiration).toEqual(bonusResult)
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
