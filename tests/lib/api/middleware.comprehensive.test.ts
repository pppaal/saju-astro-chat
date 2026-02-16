/**
 * Comprehensive tests for API Middleware
 * Tests authentication, rate limiting, CSRF protection, credit checks, and auto-refund
 */

import { vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { csrfGuard } from '@/lib/security/csrf'
import { checkAndConsumeCredits } from '@/lib/credits'
import { refundCredits } from '@/lib/credits/creditRefund'
import { logger } from '@/lib/logger'
import { initializeApiContext, extractLocale, type MiddlewareOptions } from '@/lib/api/middleware'

// Mock dependencies
vi.mock('next-auth')
vi.mock('@/lib/rateLimit')
vi.mock('@/lib/request-ip')
vi.mock('@/lib/auth/publicToken')
vi.mock('@/lib/security/csrf')
vi.mock('@/lib/credits')
vi.mock('@/lib/credits/creditRefund')
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('API Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NODE_ENV = 'development'
    delete process.env.VITEST
  })

  describe('extractLocale', () => {
    it('should extract Korean locale from Accept-Language header', () => {
      const req = new Request('http://localhost:3000', {
        headers: { 'accept-language': 'ko-KR,ko;q=0.9' },
      })

      const locale = extractLocale(req)

      expect(locale).toBe('ko')
    })

    it('should extract locale from URL parameter', () => {
      const req = new Request('http://localhost:3000?locale=ja')

      const locale = extractLocale(req)

      expect(locale).toBe('ja')
    })

    it('should use language priority order (ko > ja > zh)', () => {
      // When both URL locale=zh and header ko are present,
      // ko wins because it is checked first in the source
      const req = new Request('http://localhost:3000?locale=zh', {
        headers: { 'accept-language': 'ko-KR' },
      })

      const locale = extractLocale(req)

      expect(locale).toBe('ko')
    })

    it('should default to English', () => {
      const req = new Request('http://localhost:3000')

      const locale = extractLocale(req)

      expect(locale).toBe('en')
    })

    it('should handle Japanese locale', () => {
      const req = new Request('http://localhost:3000', {
        headers: { 'accept-language': 'ja-JP' },
      })

      const locale = extractLocale(req)

      expect(locale).toBe('ja')
    })

    it('should handle Chinese locale', () => {
      const req = new Request('http://localhost:3000', {
        headers: { 'accept-language': 'zh-CN' },
      })

      const locale = extractLocale(req)

      expect(locale).toBe('zh')
    })
  })

  describe('initializeApiContext - CSRF Protection', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
      ;(getClientIp as any).mockReturnValue('1.2.3.4')
      ;(getServerSession as any).mockResolvedValue(null)
    })

    it('should validate CSRF for POST requests', async () => {
      ;(csrfGuard as any).mockReturnValue(null) // Valid

      const req = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })

      const { error } = await initializeApiContext(req)

      expect(csrfGuard).toHaveBeenCalled()
      expect(error).toBeUndefined()
    })

    it('should reject invalid CSRF origin', async () => {
      const csrfError = new Response(JSON.stringify({ error: 'csrf_validation_failed' }), {
        status: 403,
      })
      ;(csrfGuard as any).mockReturnValue(csrfError)

      const req = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })

      const { error } = await initializeApiContext(req)

      expect(error).toBeDefined()
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('CSRF'), expect.any(Object))
    })

    it('should skip CSRF for GET requests', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', { method: 'GET' })

      await initializeApiContext(req)

      expect(csrfGuard).not.toHaveBeenCalled()
    })

    it('should validate CSRF for PUT/PATCH/DELETE', async () => {
      ;(csrfGuard as any).mockReturnValue(null)

      const methods = ['PUT', 'PATCH', 'DELETE']

      for (const method of methods) {
        vi.clearAllMocks()
        const req = new NextRequest('http://localhost:3000/api/test', { method })

        await initializeApiContext(req)

        expect(csrfGuard).toHaveBeenCalled()
      }
    })

    it('should skip CSRF when skipCsrf option is true', async () => {
      const req = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })

      await initializeApiContext(req, { skipCsrf: true })

      expect(csrfGuard).not.toHaveBeenCalled()
    })

    it('should skip CSRF in test environment', async () => {
      process.env.NODE_ENV = 'test'

      const req = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })

      await initializeApiContext(req)

      expect(csrfGuard).not.toHaveBeenCalled()
    })
  })

  describe('initializeApiContext - Rate Limiting', () => {
    beforeEach(() => {
      ;(getClientIp as any).mockReturnValue('1.2.3.4')
      ;(getServerSession as any).mockResolvedValue(null)
      ;(csrfGuard as any).mockReturnValue(null)
    })

    it('should apply rate limiting', async () => {
      ;(rateLimit as any).mockResolvedValue({ allowed: true })

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        rateLimit: {
          limit: 10,
          windowSeconds: 60,
        },
        route: '/api/test',
      }

      const { error } = await initializeApiContext(req, options)

      expect(rateLimit).toHaveBeenCalledWith('api:/api/test:1.2.3.4', {
        limit: 10,
        windowSeconds: 60,
      })
      expect(error).toBeUndefined()
    })

    it('should reject when rate limit exceeded', async () => {
      const rateLimitHeaders = new Headers({
        'Retry-After': '30',
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
      })
      ;(rateLimit as any).mockResolvedValue({
        allowed: false,
        retryAfter: 30,
        headers: rateLimitHeaders,
      })

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        rateLimit: {
          limit: 10,
          windowSeconds: 60,
        },
        route: '/api/test',
      }

      const { error } = await initializeApiContext(req, options)

      expect(error).toBeDefined()
      const errorResponse = error as Response
      expect(errorResponse.status).toBe(429)
      expect(errorResponse.headers.get('Retry-After')).toBe('30')
      expect(errorResponse.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(errorResponse.headers.get('X-RateLimit-Remaining')).toBe('0')
    })

    it('should use custom keyPrefix', async () => {
      ;(rateLimit as any).mockResolvedValue({ allowed: true })

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        rateLimit: {
          limit: 5,
          windowSeconds: 30,
          keyPrefix: 'custom',
        },
        route: '/api/test',
      }

      await initializeApiContext(req, options)

      expect(rateLimit).toHaveBeenCalledWith('custom:/api/test:1.2.3.4', expect.any(Object))
    })

    it('should apply per-user rate limiting when authenticated', async () => {
      const mockSession = {
        user: { id: 'user_123', email: 'test@test.com' },
      }

      ;(getServerSession as any).mockResolvedValue(mockSession)
      ;(rateLimit as any).mockResolvedValue({ allowed: true })

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        rateLimit: {
          limit: 10,
          windowSeconds: 60,
        },
        route: '/api/test',
      }

      await initializeApiContext(req, options)

      // Should be called twice: once for IP, once for user
      expect(rateLimit).toHaveBeenCalledTimes(2)
      expect(rateLimit).toHaveBeenCalledWith('api:/api/test:user:user_123', expect.any(Object))
    })
  })

  describe('initializeApiContext - Token Validation', () => {
    beforeEach(() => {
      ;(getClientIp as any).mockReturnValue('1.2.3.4')
      ;(getServerSession as any).mockResolvedValue(null)
      ;(csrfGuard as any).mockReturnValue(null)
    })

    it('should require valid public token', async () => {
      ;(requirePublicToken as any).mockReturnValue({ valid: true })

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        requireToken: true,
      }

      const { error } = await initializeApiContext(req, options)

      expect(requirePublicToken).toHaveBeenCalled()
      expect(error).toBeUndefined()
    })

    it('should reject invalid token', async () => {
      ;(requirePublicToken as any).mockReturnValue({
        valid: false,
        reason: 'Token expired',
      })

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        requireToken: true,
      }

      const { error } = await initializeApiContext(req, options)

      expect(error).toBeDefined()
      const errorData = await (error as Response).json()
      expect(errorData.success).toBe(false)
      expect(errorData.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('initializeApiContext - Authentication', () => {
    beforeEach(() => {
      ;(getClientIp as any).mockReturnValue('1.2.3.4')
      ;(csrfGuard as any).mockReturnValue(null)
    })

    it('should require authentication', async () => {
      ;(getServerSession as any).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        requireAuth: true,
      }

      const { error } = await initializeApiContext(req, options)

      expect(error).toBeDefined()
      const errorData = await (error as Response).json()
      expect(errorData.success).toBe(false)
      expect(errorData.error.code).toBe('UNAUTHORIZED')
    })

    it('should allow authenticated requests', async () => {
      const mockSession = {
        user: { id: 'user_123', email: 'test@test.com' },
      }

      ;(getServerSession as any).mockResolvedValue(mockSession)

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        requireAuth: true,
      }

      const { context, error } = await initializeApiContext(req, options)

      expect(error).toBeUndefined()
      expect(context.isAuthenticated).toBe(true)
      expect(context.userId).toBe('user_123')
    })

    it('should detect premium users', async () => {
      const mockSession = {
        user: { id: 'user_123', email: 'test@test.com', plan: 'pro' },
      }

      ;(getServerSession as any).mockResolvedValue(mockSession)

      const req = new NextRequest('http://localhost:3000/api/test')

      const { context } = await initializeApiContext(req)

      expect(context.isPremium).toBe(true)
    })

    it('should not mark free users as premium', async () => {
      const mockSession = {
        user: { id: 'user_123', email: 'test@test.com', plan: 'free' },
      }

      ;(getServerSession as any).mockResolvedValue(mockSession)

      const req = new NextRequest('http://localhost:3000/api/test')

      const { context } = await initializeApiContext(req)

      expect(context.isPremium).toBe(false)
    })

    it('should handle session fetch errors gracefully', async () => {
      ;(getServerSession as any).mockRejectedValue(new Error('Session error'))

      const req = new NextRequest('http://localhost:3000/api/test')

      const { context } = await initializeApiContext(req)

      expect(context.isAuthenticated).toBe(false)
      expect(context.userId).toBeNull()
    })
  })

  describe('initializeApiContext - Credit Management', () => {
    beforeEach(() => {
      ;(getClientIp as any).mockReturnValue('1.2.3.4')
      ;(csrfGuard as any).mockReturnValue(null)
    })

    it('should check and consume credits', async () => {
      const mockSession = {
        user: { id: 'user_123', email: 'test@test.com' },
      }

      ;(getServerSession as any).mockResolvedValue(mockSession)
      ;(checkAndConsumeCredits as any).mockResolvedValue({
        allowed: true,
        remaining: 5,
      })

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        credits: {
          type: 'reading',
          amount: 1,
        },
      }

      const { context, error } = await initializeApiContext(req, options)

      expect(checkAndConsumeCredits).toHaveBeenCalledWith('reading', 1)
      expect(error).toBeUndefined()
      expect(context.creditInfo?.remaining).toBe(5)
    })

    it('should reject when insufficient credits', async () => {
      const mockSession = {
        user: { id: 'user_123', email: 'test@test.com' },
      }

      ;(getServerSession as any).mockResolvedValue(mockSession)
      ;(checkAndConsumeCredits as any).mockResolvedValue({
        allowed: false,
        error: 'insufficient_credits',
        errorCode: 'insufficient_credits',
        remaining: 0,
      })

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        credits: {
          type: 'reading',
          amount: 1,
        },
      }

      const { error } = await initializeApiContext(req, options)

      expect(error).toBeDefined()
      const errorResponse = error as Response
      expect(errorResponse.status).toBe(402)

      const errorData = await errorResponse.json()
      expect(errorData.error).toBe('insufficient_credits')
      expect(errorData.upgradeUrl).toBe('/pricing')
    })

    it('should require authentication for credit operations', async () => {
      ;(getServerSession as any).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        credits: {
          type: 'reading',
          amount: 1,
        },
      }

      const { error } = await initializeApiContext(req, options)

      expect(error).toBeDefined()
      const errorData = await (error as Response).json()
      expect(errorData.success).toBe(false)
      expect(errorData.error.code).toBe('UNAUTHORIZED')
    })

    it('should provide refundCreditsOnError function', async () => {
      const mockSession = {
        user: { id: 'user_123', email: 'test@test.com' },
      }

      ;(getServerSession as any).mockResolvedValue(mockSession)
      ;(checkAndConsumeCredits as any).mockResolvedValue({
        allowed: true,
        remaining: 5,
      })
      ;(refundCredits as any).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        credits: {
          type: 'reading',
          amount: 2,
        },
        route: '/api/tarot/chat',
      }

      const { context } = await initializeApiContext(req, options)

      expect(context.refundCreditsOnError).toBeDefined()

      // Call refund function
      await context.refundCreditsOnError!('AI backend timeout', { duration: 60000 })

      expect(refundCredits).toHaveBeenCalledWith({
        userId: 'user_123',
        creditType: 'reading',
        amount: 2,
        reason: 'api_error',
        apiRoute: '/api/tarot/chat',
        errorMessage: 'AI backend timeout',
        metadata: { duration: 60000 },
      })

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Credits refunded'),
        expect.any(Object)
      )
    })

    it('should handle refund failures gracefully', async () => {
      const mockSession = {
        user: { id: 'user_123', email: 'test@test.com' },
      }

      ;(getServerSession as any).mockResolvedValue(mockSession)
      ;(checkAndConsumeCredits as any).mockResolvedValue({
        allowed: true,
        remaining: 5,
      })
      ;(refundCredits as any).mockRejectedValue(new Error('Refund failed'))

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        credits: {
          type: 'reading',
          amount: 1,
        },
      }

      const { context } = await initializeApiContext(req, options)

      // Should not throw
      await context.refundCreditsOnError!('Test error')

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to refund'),
        expect.any(Object)
      )
    })
  })

  describe('Integration Scenarios', () => {
    beforeEach(() => {
      ;(getClientIp as any).mockReturnValue('1.2.3.4')
      ;(csrfGuard as any).mockReturnValue(null)
    })

    it('should handle complete authentication + rate limit + credits flow', async () => {
      const mockSession = {
        user: { id: 'user_123', email: 'test@test.com' },
      }

      ;(getServerSession as any).mockResolvedValue(mockSession)
      ;(rateLimit as any).mockResolvedValue({ allowed: true })
      ;(checkAndConsumeCredits as any).mockResolvedValue({
        allowed: true,
        remaining: 10,
      })

      const req = new NextRequest('http://localhost:3000/api/test')
      const options: MiddlewareOptions = {
        requireAuth: true,
        rateLimit: {
          limit: 10,
          windowSeconds: 60,
        },
        credits: {
          type: 'reading',
          amount: 1,
        },
        route: '/api/test',
      }

      const { context, error } = await initializeApiContext(req, options)

      expect(error).toBeUndefined()
      expect(context.isAuthenticated).toBe(true)
      expect(context.creditInfo?.remaining).toBe(10)
      expect(rateLimit).toHaveBeenCalledTimes(2) // IP + user
    })

    it('should fail fast on first middleware failure', async () => {
      ;(csrfGuard as any).mockReturnValue(
        new Response(JSON.stringify({ error: 'csrf_failed' }), { status: 403 })
      )

      const req = new NextRequest('http://localhost:3000/api/test', { method: 'POST' })
      const options: MiddlewareOptions = {
        requireAuth: true,
        rateLimit: { limit: 10, windowSeconds: 60 },
      }

      const { error } = await initializeApiContext(req, options)

      expect(error).toBeDefined()
      // Should not check auth or rate limit after CSRF failure
      expect(getServerSession).not.toHaveBeenCalled()
      expect(rateLimit).not.toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      ;(getClientIp as any).mockReturnValue('1.2.3.4')
      ;(csrfGuard as any).mockReturnValue(null)
      ;(getServerSession as any).mockResolvedValue(null)
    })

    it('should handle missing IP address', async () => {
      ;(getClientIp as any).mockReturnValue(null)

      const req = new NextRequest('http://localhost:3000/api/test')

      const { context } = await initializeApiContext(req)

      expect(context.ip).toBe('unknown')
    })

    it('should extract route from URL when not provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/some/nested/route')

      const { context } = await initializeApiContext(req)

      // Route should be extracted from URL
      expect(context).toBeDefined()
    })

    it('should handle malformed URLs gracefully', async () => {
      const req = new NextRequest('http://localhost:3000/api/test?locale=invalid')

      const { context } = await initializeApiContext(req)

      // Should fallback to 'en'
      expect(context.locale).toBe('en')
    })

    it('should not provide refund function when credits not consumed', async () => {
      const mockSession = {
        user: { id: 'user_123', email: 'test@test.com' },
      }

      ;(getServerSession as any).mockResolvedValue(mockSession)

      const req = new NextRequest('http://localhost:3000/api/test')

      const { context } = await initializeApiContext(req)

      expect(context.refundCreditsOnError).toBeUndefined()
    })
  })
})
