import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---------- hoisted mocks ----------
const mockStripeCheckoutCreate = vi.fn()

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
import {
  getPriceId,
  getCreditPackPriceId,
  allowedPriceIds,
  allowedCreditPackIds,
} from '@/lib/payments/prices'

describe('/api/checkout', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()

    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_123',
      NEXT_PUBLIC_BASE_URL: 'https://example.com',
      NODE_ENV: 'test',
    }

    // Default: rate limiting allows request
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 7,
      headers: {
        'X-RateLimit-Limit': '8',
        'X-RateLimit-Remaining': '7',
      },
    } as any)

    // Default: authenticated user
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: '2024-12-31',
    } as any)

    // Default: prices
    vi.mocked(getPriceId).mockReturnValue('price_123')
    vi.mocked(getCreditPackPriceId).mockReturnValue('price_credit_456')
    vi.mocked(allowedPriceIds).mockReturnValue(['price_123'])
    vi.mocked(allowedCreditPackIds).mockReturnValue(['price_credit_456'])

    // Default: Stripe success
    mockStripeCheckoutCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/session-123',
    })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // Helper to extract the application-level error message from the middleware response.
  // The middleware formats error responses as:
  //   { success: false, error: { code, message, status } }
  // The handler passes short error strings (e.g. 'invalid_email') as the `message` field.
  function extractErrorMessage(data: any): string {
    if (typeof data?.error === 'string') return data.error
    if (typeof data?.error?.message === 'string') return data.error.message
    return ''
  }

  describe('Security Checks', () => {
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

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(429)
    })

    it('should require authentication', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)

      expect(response.status).toBe(401)
    })
  })

  describe('Configuration Validation', () => {
    it('should return error when NEXT_PUBLIC_BASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(extractErrorMessage(data)).toContain('missing_base_url')
    })

    it('should return error when STRIPE_SECRET_KEY is missing', async () => {
      delete process.env.STRIPE_SECRET_KEY

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(extractErrorMessage(data)).toContain('missing_secret')
    })
  })

  describe('Input Validation', () => {
    it('should reject both plan and creditPack', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'premium',
          creditPack: 'mini',
          billingCycle: 'monthly',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      // Zod validation fails for both plan+creditPack
      expect(response.status).toBe(422)
    })

    it('should reject missing product', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(req)
      const data = await response.json()

      // Zod validation fails - must have plan or creditPack
      expect(response.status).toBe(422)
    })

    it('should reject invalid email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'invalid-email' },
        expires: '2024-12-31',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('invalid_email')
    })

    it('should reject email longer than 254 characters', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: longEmail },
        expires: '2024-12-31',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('invalid_email')
    })

    it('should reject missing email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: null },
        expires: '2024-12-31',
      } as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('invalid_email')
    })

    it('should reject plan without billingCycle', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium' }),
      })

      const response = await POST(req)

      // Zod validation requires billingCycle when plan is specified
      expect(response.status).toBe(422)
    })
  })

  describe('Subscription Checkout', () => {
    it('should create subscription checkout session', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: 'premium',
          billingCycle: 'monthly',
        }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data?.url || data.url).toBe('https://checkout.stripe.com/session-123')
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

    it('should validate subscription price is allowed', async () => {
      vi.mocked(allowedPriceIds).mockReturnValue([])

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('invalid_price')
    })

    it('should allow promotion codes for subscriptions', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', billingCycle: 'yearly' }),
      })

      await POST(req)

      const createCall = mockStripeCheckoutCreate.mock.calls[0][0]
      expect(createCall.allow_promotion_codes).toBe(true)
    })

    it('should return error when Stripe returns no URL', async () => {
      mockStripeCheckoutCreate.mockResolvedValue({ url: null })

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(extractErrorMessage(data)).toContain('no_checkout_url')
    })
  })

  describe('Credit Pack Checkout', () => {
    it('should create credit pack checkout session', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditPack: 'mini' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data?.url || data.url).toBe('https://checkout.stripe.com/session-123')
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

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditPack: 'mini' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('invalid_credit_pack')
    })

    it('should reject invalid credit pack', async () => {
      vi.mocked(getCreditPackPriceId).mockReturnValue(null as any)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creditPack: 'mini' }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(extractErrorMessage(data)).toContain('invalid_credit_pack')
    })
  })

  describe('Idempotency', () => {
    it('should use client-provided idempotency key', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': 'client-key-123',
        },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req)

      expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(expect.any(Object), {
        idempotencyKey: 'client-key-123',
      })
    })

    it('should generate idempotency key if not provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req)

      const callArgs = mockStripeCheckoutCreate.mock.calls[0][1]
      expect(callArgs).toHaveProperty('idempotencyKey')
      expect(typeof callArgs.idempotencyKey).toBe('string')
    })

    it('should reject overly long idempotency key', async () => {
      const longKey = 'a'.repeat(200)

      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': longKey,
        },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req)

      const callArgs = mockStripeCheckoutCreate.mock.calls[0][1]
      expect(callArgs.idempotencyKey).not.toBe(longKey)
    })
  })

  describe('Error Handling', () => {
    it('should handle Stripe errors', async () => {
      mockStripeCheckoutCreate.mockRejectedValue(new Error('Stripe API error'))

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

    it('should handle invalid JSON body', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const response = await POST(req)

      // Zod validation on empty parsed body fails
      expect(response.status).toBe(422)
    })
  })

  describe('Metadata', () => {
    it('should include userId in metadata', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req)

      const createCall = mockStripeCheckoutCreate.mock.calls[0][0]
      expect(createCall.metadata.userId).toBe('user-123')
    })

    it('should include source as web', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req)

      const createCall = mockStripeCheckoutCreate.mock.calls[0][0]
      expect(createCall.metadata.source).toBe('web')
    })
  })

  describe('URLs', () => {
    it('should set correct success URL', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req)

      const createCall = mockStripeCheckoutCreate.mock.calls[0][0]
      expect(createCall.success_url).toBe(
        'https://example.com/success?session_id={CHECKOUT_SESSION_ID}'
      )
    })

    it('should set correct cancel URL', async () => {
      const req = new NextRequest('http://localhost:3000/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'premium', billingCycle: 'monthly' }),
      })

      await POST(req)

      const createCall = mockStripeCheckoutCreate.mock.calls[0][0]
      expect(createCall.cancel_url).toBe('https://example.com/pricing')
    })
  })
})
