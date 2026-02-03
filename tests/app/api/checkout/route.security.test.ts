/**
 * Security-focused tests for /api/checkout
 * Tests Stripe integration, payment processing, CSRF protection, and rate limiting
 */

import { POST } from '@/app/api/checkout/route'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { rateLimit } from '@/lib/rateLimit'
import { csrfGuard } from '@/lib/security/csrf'
import Stripe from 'stripe'

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

jest.mock('@/lib/rateLimit', () => ({
  rateLimit: jest.fn(),
}))

jest.mock('@/lib/security/csrf', () => ({
  csrfGuard: jest.fn(),
}))

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  }))
})

jest.mock('@/lib/request-ip', () => ({
  getClientIp: jest.fn(() => '127.0.0.1'),
}))

jest.mock('@/lib/http', () => ({
  enforceBodySize: jest.fn(),
}))

jest.mock('@/lib/telemetry', () => ({
  captureServerError: jest.fn(),
}))

jest.mock('@/lib/metrics', () => ({
  recordCounter: jest.fn(),
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

jest.mock('@/lib/payments/prices', () => ({
  getPriceId: jest.fn((plan, cycle) => `price_${plan}_${cycle}`),
  getCreditPackPriceId: jest.fn((pack) => `price_pack_${pack}`),
  allowedPriceIds: jest.fn(() => [
    'price_premium_monthly',
    'price_premium_yearly',
    'price_basic_monthly',
  ]),
  allowedCreditPackIds: jest.fn(() => [
    'price_pack_small',
    'price_pack_medium',
    'price_pack_large',
  ]),
}))

describe('/api/checkout - Security Tests', () => {
  const originalEnv = process.env
  let mockStripeCreate: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_123',
      NEXT_PUBLIC_BASE_URL: 'https://example.com',
    }
    ;(csrfGuard as jest.Mock).mockReturnValue(null)
    ;(rateLimit as jest.Mock).mockResolvedValue({
      allowed: true,
      headers: new Headers(),
    })

    mockStripeCreate = jest.fn().mockResolvedValue({
      url: 'https://checkout.stripe.com/session123',
      id: 'cs_test_123',
    })
    ;(Stripe as unknown as jest.Mock).mockImplementation(() => ({
      checkout: {
        sessions: {
          create: mockStripeCreate,
        },
      },
    }))
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('CSRF Protection', () => {
    it('should block requests failing CSRF check', async () => {
      const csrfError = new Response('CSRF validation failed', {
        status: 403,
      })
      ;(csrfGuard as jest.Mock).mockReturnValue(csrfError)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(403)
      expect(mockStripeCreate).not.toHaveBeenCalled()
    })

    it('should allow requests passing CSRF check', async () => {
      ;(csrfGuard as jest.Mock).mockReturnValue(null)
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
        headers: {
          origin: 'https://example.com',
        },
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
    })
  })

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      ;(rateLimit as jest.Mock).mockResolvedValue({
        allowed: false,
        headers: new Headers({ 'Retry-After': '60' }),
      })

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('rate_limited')
    })

    it('should use IP-based rate limiting', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req)

      expect(rateLimit).toHaveBeenCalledWith(
        expect.stringContaining('checkout:'),
        expect.objectContaining({
          limit: 8,
          windowSeconds: 60,
        })
      )
    })
  })

  describe('Authentication', () => {
    it('should require authentication', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('not_authenticated')
    })

    it('should require valid user session', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: null,
      })

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should validate email format', async () => {
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'invalid-email' },
      })

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_email')
    })

    it('should reject emails longer than 254 characters', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: longEmail },
      })

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_email')
    })
  })

  describe('Input Validation', () => {
    beforeEach(() => {
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })
    })

    it('should reject request with both plan and creditPack', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'premium',
          creditPack: 'small',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('choose_one_of_plan_or_creditPack')
    })

    it('should reject request with neither plan nor creditPack', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('missing_product')
    })

    it('should reject invalid price IDs', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan: 'invalid_plan',
          billingCycle: 'monthly',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_price')
    })

    it('should reject invalid credit pack IDs', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          creditPack: 'invalid_pack',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_credit_pack')
    })

    it('should handle malformed JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: 'not-json',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })
  })

  describe('Stripe Configuration', () => {
    it('should fail when STRIPE_SECRET_KEY missing', async () => {
      delete process.env.STRIPE_SECRET_KEY
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('missing_secret')
    })

    it('should fail when NEXT_PUBLIC_BASE_URL missing', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('missing_base_url')
    })
  })

  describe('Subscription Creation', () => {
    beforeEach(() => {
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })
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
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })
    })

    it('should create one-time payment session for credit pack', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          creditPack: 'small',
        }),
      })

      await POST(req)

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          line_items: [{ price: 'price_pack_small', quantity: 1 }],
          metadata: expect.objectContaining({
            type: 'credit_pack',
            creditPack: 'small',
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
          creditPack: 'small',
        }),
      })

      await POST(req)

      const createCall = mockStripeCreate.mock.calls[0][0]
      expect(createCall.allow_promotion_codes).toBeUndefined()
    })
  })

  describe('Idempotency', () => {
    beforeEach(() => {
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })
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
      expect(createCall.idempotencyKey).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
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
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })
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
      expect(data.error).toBe('stripe_error')
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
      expect(data.error).toBe('no_checkout_url')
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
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })
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
      ;(getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      })
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
      expect(data.url).toBe('https://checkout.stripe.com/session123')
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

      expect(data.url).toMatch(/^https:\/\//)
    })
  })
})
