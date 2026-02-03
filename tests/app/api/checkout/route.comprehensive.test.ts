import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST } from '@/app/api/checkout/route'
import { getServerSession } from 'next-auth'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { enforceBodySize } from '@/lib/http'
import { csrfGuard } from '@/lib/security/csrf'
import { getPriceId, getCreditPackPriceId, allowedPriceIds, allowedCreditPackIds } from '@/lib/payments/prices'
import Stripe from 'stripe'

vi.mock('next-auth')
vi.mock('@/lib/rateLimit')
vi.mock('@/lib/request-ip')
vi.mock('@/lib/http')
vi.mock('@/lib/security/csrf')
vi.mock('@/lib/payments/prices')
vi.mock('@/lib/telemetry')
vi.mock('@/lib/metrics')

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock Stripe
const mockStripeCheckoutCreate = vi.fn()
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

describe('/api/checkout', () => {
  const mockRateLimit = {
    allowed: true,
    remaining: 7,
    headers: {
      'X-RateLimit-Limit': '8',
      'X-RateLimit-Remaining': '7',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    vi.mocked(getClientIp).mockReturnValue('127.0.0.1')
    vi.mocked(csrfGuard).mockReturnValue(null)
    vi.mocked(enforceBodySize).mockReturnValue(null)
    vi.mocked(rateLimit).mockResolvedValue(mockRateLimit as any)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: '2024-12-31',
    } as any)

    // Set environment variables
    process.env.STRIPE_SECRET_KEY = 'sk_test_123'
    process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com'

    // Mock prices functions
    vi.mocked(getPriceId).mockReturnValue('price_123')
    vi.mocked(getCreditPackPriceId).mockReturnValue('price_credit_456')
    vi.mocked(allowedPriceIds).mockReturnValue(['price_123'])
    vi.mocked(allowedCreditPackIds).mockReturnValue(['price_credit_456'])

    mockStripeCheckoutCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/session-123',
    })
  })

  describe('Security Checks', () => {
    it('should block request with CSRF error', async () => {
      const csrfError = new Response(JSON.stringify({ error: 'csrf_failed' }), { status: 403 })
      vi.mocked(csrfGuard).mockReturnValue(csrfError)

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req as any)

      expect(response.status).toBe(403)
    })

    it('should enforce body size limit', async () => {
      const oversizedError = new Response(JSON.stringify({ error: 'too_large' }), { status: 413 })
      vi.mocked(enforceBodySize).mockReturnValue(oversizedError)

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      const response = await POST(req as any)

      expect(response.status).toBe(413)
    })

    it('should enforce rate limiting', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        retryAfter: 60,
        headers: {
          'X-RateLimit-Limit': '8',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60',
        },
      } as any)

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toBe('rate_limited')
    })

    it('should require authentication', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('not_authenticated')
    })
  })

  describe('Configuration Validation', () => {
    it('should return error when NEXT_PUBLIC_BASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('missing_base_url')
    })

    it('should return error when STRIPE_SECRET_KEY is missing', async () => {
      delete process.env.STRIPE_SECRET_KEY

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('missing_secret')
    })
  })

  describe('Input Validation', () => {
    it('should reject both plan and creditPack', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'premium',
          creditPack: 'mini',
        }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('choose_one_of_plan_or_creditPack')
    })

    it('should reject missing product', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('missing_product')
    })

    it('should reject invalid email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'invalid-email' },
        expires: '2024-12-31',
      } as any)

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_email')
    })

    it('should reject email longer than 254 characters', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: longEmail },
        expires: '2024-12-31',
      } as any)

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_email')
    })

    it('should reject missing email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: null },
        expires: '2024-12-31',
      } as any)

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_email')
    })
  })

  describe('Subscription Checkout', () => {
    it('should create subscription checkout session', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/session-123')
      expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          line_items: [{ price: 'price_123', quantity: 1 }],
          customer_email: 'test@example.com',
          metadata: expect.objectContaining({
            type: 'subscription',
            plan: 'premium',
            billingCycle: 'monthly',
          }),
        }),
        expect.any(Object)
      )
    })

    it('should default to premium monthly if not specified', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      await POST(req as any)

      expect(getPriceId).toHaveBeenCalledWith('premium', 'monthly')
    })

    it('should validate subscription price is allowed', async () => {
      vi.mocked(allowedPriceIds).mockReturnValue([])

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_price')
    })

    it('should allow promotion codes for subscriptions', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', billingCycle: 'yearly' }),
      })

      await POST(req as any)

      const createCall = mockStripeCheckoutCreate.mock.calls[0][0]
      expect(createCall.allow_promotion_codes).toBe(true)
    })

    it('should return error when Stripe returns no URL', async () => {
      mockStripeCheckoutCreate.mockResolvedValue({ url: null })

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('no_checkout_url')
    })
  })

  describe('Credit Pack Checkout', () => {
    it('should create credit pack checkout session', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditPack: 'mini' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe('https://checkout.stripe.com/session-123')
      expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'payment',
          line_items: [{ price: 'price_credit_456', quantity: 1 }],
          customer_email: 'test@example.com',
          metadata: expect.objectContaining({
            type: 'credit_pack',
            creditPack: 'mini',
          }),
        }),
        expect.any(Object)
      )
    })

    it('should validate credit pack price is allowed', async () => {
      vi.mocked(allowedCreditPackIds).mockReturnValue([])

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditPack: 'mini' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_credit_pack')
    })

    it('should reject invalid credit pack', async () => {
      vi.mocked(getCreditPackPriceId).mockReturnValue(null)

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditPack: 'invalid' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_credit_pack')
    })
  })

  describe('Idempotency', () => {
    it('should use client-provided idempotency key', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': 'client-key-123',
        },
        body: JSON.stringify({ plan: 'premium' }),
      })

      await POST(req as any)

      expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
        expect.any(Object),
        { idempotencyKey: 'client-key-123' }
      )
    })

    it('should generate idempotency key if not provided', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      await POST(req as any)

      const callArgs = mockStripeCheckoutCreate.mock.calls[0][1]
      expect(callArgs).toHaveProperty('idempotencyKey')
      expect(typeof callArgs.idempotencyKey).toBe('string')
    })

    it('should reject overly long idempotency key', async () => {
      const longKey = 'a'.repeat(200)

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': longKey,
        },
        body: JSON.stringify({ plan: 'premium' }),
      })

      await POST(req as any)

      const callArgs = mockStripeCheckoutCreate.mock.calls[0][1]
      expect(callArgs.idempotencyKey).not.toBe(longKey)
    })
  })

  describe('Error Handling', () => {
    it('should handle Stripe errors', async () => {
      mockStripeCheckoutCreate.mockRejectedValue(new Error('Stripe API error'))

      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('stripe_error')
    })

    it('should handle invalid JSON body', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const response = await POST(req as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('missing_product')
    })
  })

  describe('Metadata', () => {
    it('should include userId in metadata', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      await POST(req as any)

      const createCall = mockStripeCheckoutCreate.mock.calls[0][0]
      expect(createCall.metadata.userId).toBe('user-123')
    })

    it('should include source as web', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      await POST(req as any)

      const createCall = mockStripeCheckoutCreate.mock.calls[0][0]
      expect(createCall.metadata.source).toBe('web')
    })
  })

  describe('URLs', () => {
    it('should set correct success URL', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      await POST(req as any)

      const createCall = mockStripeCheckoutCreate.mock.calls[0][0]
      expect(createCall.success_url).toBe('https://example.com/success?session_id={CHECKOUT_SESSION_ID}')
    })

    it('should set correct cancel URL', async () => {
      const req = new Request('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      await POST(req as any)

      const createCall = mockStripeCheckoutCreate.mock.calls[0][0]
      expect(createCall.cancel_url).toBe('https://example.com/pricing')
    })
  })
})
