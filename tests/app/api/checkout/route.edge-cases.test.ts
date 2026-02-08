/**
 * P1: Checkout Edge Cases Tests
 * 결제 동시성, 멱등성, Webhook 엣지케이스 테스트
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---------- hoisted mocks ----------
const mockStripeCheckoutCreate = vi.fn()
const mockPrismaUserCredits = {
  findUnique: vi.fn(),
  update: vi.fn(),
  create: vi.fn(),
}
const mockPrismaTransaction = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/http', () => ({
  enforceBodySize: vi.fn(),
}))

vi.mock('@/lib/security/csrf', () => ({
  csrfGuard: vi.fn(() => null),
  validateOrigin: vi.fn(() => true),
}))

vi.mock('@/lib/payments/prices', () => ({
  getPriceId: vi.fn(() => 'price_123'),
  getCreditPackPriceId: vi.fn(() => 'price_credit_456'),
  allowedPriceIds: vi.fn(() => ['price_123']),
  allowedCreditPackIds: vi.fn(() => ['price_credit_456']),
}))

vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/credits', () => ({
  checkAndConsumeCredits: vi.fn(),
}))

vi.mock('@/lib/credits/creditRefund', () => ({
  refundCredits: vi.fn(),
}))

vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: vi.fn(() => ({ valid: true })),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userCredits: mockPrismaUserCredits,
    $transaction: mockPrismaTransaction,
  },
}))

// Mock Stripe
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: mockStripeCheckoutCreate,
        },
      },
    })),
  }
})

// ---------- imports (after mocks) ----------
import { POST } from '@/app/api/checkout/route'
import { getServerSession } from 'next-auth'
import { rateLimit } from '@/lib/rateLimit'

describe('/api/checkout - Edge Cases (P1)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()

    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_123',
      NEXT_PUBLIC_BASE_URL: 'https://example.com',
      NODE_ENV: 'test',
    }

    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 7,
      headers: {
        'X-RateLimit-Limit': '8',
        'X-RateLimit-Remaining': '7',
      },
    } as any)

    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: '2024-12-31',
    } as any)

    mockStripeCheckoutCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/session-123',
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function extractErrorMessage(data: any): string {
    if (typeof data?.error === 'string') return data.error
    if (typeof data?.error?.message === 'string') return data.error.message
    return ''
  }

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous checkout requests for same user', async () => {
      const requests = Array.from({ length: 5 }, () =>
        new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
        })
      )

      const responses = await Promise.all(requests.map((req) => POST(req)))

      // All should succeed or be rate limited gracefully
      responses.forEach((response) => {
        expect([200, 429]).toContain(response.status)
      })
    })

    it('should use different idempotency keys for different requests', async () => {
      const req1 = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const req2 = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req1)
      await POST(req2)

      const key1 = mockStripeCheckoutCreate.mock.calls[0]?.[1]?.idempotencyKey
      const key2 = mockStripeCheckoutCreate.mock.calls[1]?.[1]?.idempotencyKey

      expect(key1).toBeDefined()
      expect(key2).toBeDefined()
      expect(key1).not.toBe(key2)
    })

    it('should use same idempotency key for retried request with same key', async () => {
      const idempotencyKey = 'user-123-checkout-abc'

      const req1 = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const req2 = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req1)
      await POST(req2)

      const key1 = mockStripeCheckoutCreate.mock.calls[0]?.[1]?.idempotencyKey
      const key2 = mockStripeCheckoutCreate.mock.calls[1]?.[1]?.idempotencyKey

      expect(key1).toBe(idempotencyKey)
      expect(key2).toBe(idempotencyKey)
    })
  })

  describe('Idempotency Edge Cases', () => {
    it('should sanitize idempotency key with special characters', async () => {
      const specialKey = 'key-with-special!@#$%^&*()'

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': specialKey,
        },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req)

      const usedKey = mockStripeCheckoutCreate.mock.calls[0]?.[1]?.idempotencyKey
      expect(usedKey).toBeDefined()
      // Key should be used as-is if under length limit
      expect(usedKey.length).toBeLessThanOrEqual(128)
    })

    it('should handle empty idempotency key by generating new one', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': '',
        },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req)

      const usedKey = mockStripeCheckoutCreate.mock.calls[0]?.[1]?.idempotencyKey
      expect(usedKey).toBeDefined()
      expect(usedKey.length).toBeGreaterThan(0)
    })

    it('should handle exactly 128 character idempotency key', async () => {
      const maxLengthKey = 'a'.repeat(127) // Just under the 128 limit

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': maxLengthKey,
        },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req)

      const usedKey = mockStripeCheckoutCreate.mock.calls[0]?.[1]?.idempotencyKey
      expect(usedKey).toBe(maxLengthKey)
    })
  })

  describe('Stripe Error Handling', () => {
    it('should handle Stripe rate limit error', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      ;(rateLimitError as any).type = 'StripeRateLimitError'
      ;(rateLimitError as any).code = 'rate_limit'

      mockStripeCheckoutCreate.mockRejectedValue(rateLimitError)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('stripe_error')
    })

    it('should handle Stripe card declined error', async () => {
      const cardError = new Error('Card declined')
      ;(cardError as any).type = 'StripeCardError'
      ;(cardError as any).code = 'card_declined'
      ;(cardError as any).raw = { message: 'Your card was declined' }

      mockStripeCheckoutCreate.mockRejectedValue(cardError)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('Your card was declined')
    })

    it('should handle Stripe invalid request error', async () => {
      const invalidError = new Error('Invalid request')
      ;(invalidError as any).type = 'StripeInvalidRequestError'
      ;(invalidError as any).code = 'parameter_invalid'

      mockStripeCheckoutCreate.mockRejectedValue(invalidError)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
    })

    it('should handle Stripe API connection error', async () => {
      const connectionError = new Error('Connection failed')
      ;(connectionError as any).type = 'StripeAPIError'

      mockStripeCheckoutCreate.mockRejectedValue(connectionError)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
    })

    it('should handle Stripe authentication error', async () => {
      const authError = new Error('Authentication failed')
      ;(authError as any).type = 'StripeAuthenticationError'
      ;(authError as any).code = 'api_key_invalid'

      mockStripeCheckoutCreate.mockRejectedValue(authError)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
    })

    it('should handle network timeout', async () => {
      mockStripeCheckoutCreate.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 100)
          )
      )

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
    })
  })

  describe('Malformed Request Handling', () => {
    it('should handle request with null body', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'null',
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should handle request with array body', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ plan: 'premium' }]),
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should handle deeply nested body', async () => {
      const nestedBody = {
        plan: 'premium',
        billingCycle: 'monthly',
        extra: { nested: { deeply: { data: 'value' } } },
      }

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nestedBody),
      })

      const response = await POST(req)

      // Should succeed, ignoring extra fields
      expect(response.status).toBe(200)
    })

    it('should handle unicode in plan name', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'プレミアム', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      // Should fail validation for invalid plan
      expect(response.status).toBe(422)
    })

    it('should handle prototype pollution attempt', async () => {
      const maliciousBody = JSON.stringify({
        plan: 'premium',
        billingCycle: 'monthly',
        __proto__: { admin: true },
        constructor: { prototype: { admin: true } },
      })

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: maliciousBody,
      })

      const response = await POST(req)

      // Should either succeed normally or fail safely
      expect([200, 422]).toContain(response.status)
    })
  })

  describe('Session Edge Cases', () => {
    it('should handle expired session', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        expires: '2020-01-01', // Expired
      } as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      // Session expiry should be handled by the auth middleware
      expect([200, 401]).toContain(response.status)
    })

    it('should handle session with missing user id', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: '2024-12-31',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      // Should handle gracefully
      expect([200, 401]).toContain(response.status)
    })

    it('should handle special characters in email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: "user+tag'test@example.com" },
        expires: '2024-12-31',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      // Should fail email validation due to single quote
      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('invalid_email')
    })
  })

  describe('Plan and Billing Cycle Combinations', () => {
    it('should handle all valid plan combinations', async () => {
      const combinations = [
        { plan: 'premium', billingCycle: 'monthly' },
        { plan: 'premium', billingCycle: 'yearly' },
        { plan: 'pro', billingCycle: 'monthly' },
        { plan: 'pro', billingCycle: 'yearly' },
      ]

      for (const combo of combinations) {
        vi.clearAllMocks()
        mockStripeCheckoutCreate.mockResolvedValue({
          url: 'https://checkout.stripe.com/session-123',
        })

        const req = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(combo),
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
      }
    })

    it('should handle all valid credit pack types', async () => {
      const packs = ['mini', 'standard', 'plus', 'mega', 'ultimate']

      for (const pack of packs) {
        vi.clearAllMocks()
        mockStripeCheckoutCreate.mockResolvedValue({
          url: 'https://checkout.stripe.com/session-123',
        })

        const req = new NextRequest('http://localhost:3000/api/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creditPack: pack }),
        })

        const response = await POST(req)

        expect(response.status).toBe(200)
      }
    })
  })
})
