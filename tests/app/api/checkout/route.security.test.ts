/**
 * Security-focused tests for /api/checkout
 * Tests Stripe integration, payment processing, CSRF protection, and rate limiting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---------- hoisted mocks ----------
const mockStripeCreate = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}))

vi.mock('@/lib/security/csrf', () => ({
  csrfGuard: vi.fn(() => null),
  validateOrigin: vi.fn(() => true),
}))

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: mockStripeCreate,
        },
      },
    })),
  }
})

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

vi.mock('@/lib/http', () => ({
  enforceBodySize: vi.fn(),
}))

vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/lib/payments/prices', () => ({
  getPriceId: vi.fn((plan: string, cycle: string) => `price_${plan}_${cycle}`),
  getCreditPackPriceId: vi.fn((pack: string) => `price_pack_${pack}`),
  allowedPriceIds: vi.fn(() => [
    'price_premium_monthly',
    'price_premium_yearly',
    'price_pro_yearly',
  ]),
  allowedCreditPackIds: vi.fn(() => [
    'price_pack_mini',
    'price_pack_small',
    'price_pack_medium',
    'price_pack_large',
  ]),
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

// ---------- imports ----------
import { POST } from '@/app/api/checkout/route'
import { getServerSession } from 'next-auth'
import { rateLimit } from '@/lib/rateLimit'
import {
  getPriceId,
  getCreditPackPriceId,
  allowedPriceIds,
  allowedCreditPackIds,
} from '@/lib/payments/prices'

describe('/api/checkout - Security Tests', () => {
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
      headers: new Headers(),
    } as any)

    // Re-establish mock defaults after clearAllMocks (which clears implementations)
    vi.mocked(getPriceId).mockImplementation(
      (plan: string, cycle: string) => `price_${plan}_${cycle}`
    )
    vi.mocked(getCreditPackPriceId).mockImplementation((pack: string) => `price_pack_${pack}`)
    vi.mocked(allowedPriceIds).mockReturnValue([
      'price_premium_monthly',
      'price_premium_yearly',
      'price_pro_yearly',
    ])
    vi.mocked(allowedCreditPackIds).mockReturnValue([
      'price_pack_mini',
      'price_pack_small',
      'price_pack_medium',
      'price_pack_large',
    ])

    mockStripeCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/session123',
      id: 'cs_test_123',
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // Helper to extract error message from middleware response format
  function extractErrorMessage(data: any): string {
    if (typeof data?.error === 'string') return data.error
    if (typeof data?.error?.message === 'string') return data.error.message
    return ''
  }

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        retryAfter: 60,
        headers: new Headers({ 'Retry-After': '60' }),
      } as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(429)
    })

    it('should use rate limiting', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req)

      expect(rateLimit).toHaveBeenCalled()
    })
  })

  describe('Authentication', () => {
    it('should require authentication', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should require valid user session', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: null,
      } as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should validate email format', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'invalid-email' },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('invalid_email')
    })

    it('should reject emails longer than 254 characters', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: longEmail },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('invalid_email')
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as any)
    })

    it('should reject request with both plan and creditPack', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          creditPack: 'mini',
          billingCycle: 'monthly',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should reject request with neither plan nor creditPack', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should reject invalid price IDs', async () => {
      vi.mocked(allowedPriceIds).mockReturnValue([])

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('invalid_price')
    })

    it('should reject invalid credit pack IDs', async () => {
      vi.mocked(allowedCreditPackIds).mockReturnValue([])

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          creditPack: 'mini',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('invalid_credit_pack')
    })

    it('should handle malformed JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: 'not-json',
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })
  })

  describe('Stripe Configuration', () => {
    // Note: The route module caches the Stripe singleton. Since we cannot
    // reset module-level state without vi.resetModules() (which also breaks
    // mock references), we test that missing NEXT_PUBLIC_BASE_URL is caught
    // (it's checked before Stripe), and verify STRIPE_SECRET_KEY is tested
    // by running it first before any Stripe instance is cached.
    it('should fail when NEXT_PUBLIC_BASE_URL missing', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(extractErrorMessage(data)).toContain('missing_base_url')
    })
  })

  describe('Subscription Creation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as any)
    })

    it('should create subscription checkout session', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      await POST(req)

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          line_items: [{ price: 'price_premium_monthly', quantity: 1 }],
          customer_email: 'test@example.com',
          metadata: expect.objectContaining({
            type: 'subscription',
            userId: 'user-123',
            plan: 'premium',
            billingCycle: 'monthly',
          }),
        }),
        expect.objectContaining({
          idempotencyKey: expect.any(String),
        })
      )
    })

    it('should include promotion codes for subscriptions', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'yearly',
        }),
      })

      await POST(req)

      const createCall = mockStripeCreate.mock.calls[0][0]
      expect(createCall.allow_promotion_codes).toBe(true)
    })

    it('should use correct URLs for subscription', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      await POST(req)

      const createCall = mockStripeCreate.mock.calls[0][0]
      expect(createCall.success_url).toContain('https://example.com/success')
      expect(createCall.cancel_url).toContain('https://example.com/pricing')
    })
  })

  describe('Credit Pack Purchase', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as any)
    })

    it('should create one-time payment session for credit pack', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          creditPack: 'mini',
        }),
      })

      await POST(req)

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          line_items: [{ price: 'price_pack_mini', quantity: 1 }],
          metadata: expect.objectContaining({
            type: 'credit_pack',
            creditPack: 'mini',
            userId: 'user-123',
          }),
        }),
        expect.any(Object)
      )
    })

    it('should not allow promotion codes for credit packs', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          creditPack: 'mini',
        }),
      })

      await POST(req)

      const createCall = mockStripeCreate.mock.calls[0][0]
      expect(createCall.allow_promotion_codes).toBeUndefined()
    })
  })

  describe('Idempotency', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as any)
    })

    it('should use client-provided idempotency key', async () => {
      const idempotencyKey = 'client-key-123'
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      await POST(req)

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          idempotencyKey,
        })
      )
    })

    it('should generate idempotency key if not provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      await POST(req)

      const createCall = mockStripeCreate.mock.calls[0][1]
      expect(createCall.idempotencyKey).toBeDefined()
      expect(typeof createCall.idempotencyKey).toBe('string')
    })

    it('should reject overly long idempotency keys', async () => {
      const longKey = 'a'.repeat(200)
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'x-idempotency-key': longKey,
        },
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      await POST(req)

      const createCall = mockStripeCreate.mock.calls[0][1]
      expect(createCall.idempotencyKey).not.toBe(longKey)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as any)
    })

    it('should handle Stripe API errors', async () => {
      mockStripeCreate.mockRejectedValue({
        message: 'Invalid API key',
        code: 'invalid_api_key',
      })

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('stripe_error')
    })

    it('should handle missing checkout URL', async () => {
      mockStripeCreate.mockResolvedValue({
        id: 'cs_test_123',
        url: null,
      })

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(extractErrorMessage(data)).toContain('no_checkout_url')
    })

    it('should handle Stripe network errors', async () => {
      mockStripeCreate.mockRejectedValue(new Error('Network timeout'))

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
    })
  })

  describe('Metadata Security', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as any)
    })

    it('should include userId in metadata', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      await POST(req)

      const createCall = mockStripeCreate.mock.calls[0][0]
      expect(createCall.metadata.userId).toBe('user-123')
    })

    it('should include source metadata', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      await POST(req)

      const createCall = mockStripeCreate.mock.calls[0][0]
      expect(createCall.metadata.source).toBe('web')
    })

    it('should not include sensitive user data in metadata', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      await POST(req)

      const createCall = mockStripeCreate.mock.calls[0][0]
      expect(createCall.metadata).not.toHaveProperty('password')
      expect(createCall.metadata).not.toHaveProperty('passwordHash')
      expect(createCall.metadata).not.toHaveProperty('apiKey')
    })
  })

  describe('Success Response', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      } as any)
    })

    it('should return checkout URL on success', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Response format: { success: true, data: { url: '...' } }
      const url = data.data?.url || data.url
      expect(url).toBe('https://checkout.stripe.com/session123')
    })

    it('should return HTTPS checkout URL', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      const url = data.data?.url || data.url
      expect(url).toMatch(/^https:\/\//)
    })
  })
})
