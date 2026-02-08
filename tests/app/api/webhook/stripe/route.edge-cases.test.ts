/**
 * P1: Stripe Webhook Edge Cases Tests
 * Webhook 시그니처 검증, 멱등성, 동시성 처리 테스트
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

// ---------- hoisted mocks ----------
const mockStripeWebhooksConstructEvent = vi.fn()
const mockStripeCustomersRetrieve = vi.fn()
const mockStripePaymentIntentsRetrieve = vi.fn()
const mockStripePaymentMethodsRetrieve = vi.fn()
const mockPrisma = {
  stripeEventLog: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  subscription: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  userCredits: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  bonusCreditPurchase: {
    create: vi.fn(),
  },
}

vi.mock('next/headers', () => ({
  headers: vi.fn(() => ({
    get: vi.fn((key: string) => {
      if (key === 'stripe-signature') return 'test-signature'
      return null
    }),
  })),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
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

vi.mock('@/lib/email', () => ({
  sendPaymentReceiptEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionConfirmEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/payments/prices', () => ({
  getPlanFromPriceId: vi.fn(() => ({ plan: 'premium', billingCycle: 'monthly' })),
}))

vi.mock('@/lib/credits/creditService', () => ({
  upgradePlan: vi.fn().mockResolvedValue(undefined),
  addBonusCredits: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      webhooks: {
        constructEvent: mockStripeWebhooksConstructEvent,
      },
      customers: {
        retrieve: mockStripeCustomersRetrieve,
      },
      paymentIntents: {
        retrieve: mockStripePaymentIntentsRetrieve,
      },
      paymentMethods: {
        retrieve: mockStripePaymentMethodsRetrieve,
      },
    })),
  }
})

describe('Stripe Webhook Edge Cases (P1)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()

    process.env = {
      ...originalEnv,
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
      NODE_ENV: 'test',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Signature Verification', () => {
    it('should reject missing signature header', async () => {
      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn(() => null),
      } as any)

      const { POST } = await import('@/app/api/webhook/stripe/route')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error?.message || data.message).toContain('Missing stripe-signature')
    })

    it('should reject invalid signature', async () => {
      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'stripe-signature') return 'invalid-signature'
          return null
        }),
      } as any)

      mockStripeWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('Signature verification failed')
      })

      const { POST } = await import('@/app/api/webhook/stripe/route')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error?.message || data.message).toContain('verification failed')
    })

    it('should reject tampered payload', async () => {
      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'stripe-signature') return 't=123,v1=abc'
          return null
        }),
      } as any)

      mockStripeWebhooksConstructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature')
      })

      const { POST } = await import('@/app/api/webhook/stripe/route')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('Replay Attack Prevention', () => {
    it('should reject events older than 5 minutes', async () => {
      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'stripe-signature') return 'valid-sig'
          return null
        }),
      } as any)

      // Event created 10 minutes ago
      const staleEvent = {
        id: 'evt_stale_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000) - 600, // 10 minutes ago
        livemode: false,
        api_version: '2023-10-16',
        data: { object: {} },
      }

      mockStripeWebhooksConstructEvent.mockReturnValue(staleEvent)

      const { POST } = await import('@/app/api/webhook/stripe/route')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(staleEvent),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error?.message || data.message).toContain('too old')
    })

    it('should accept events within 5 minute window', async () => {
      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'stripe-signature') return 'valid-sig'
          return null
        }),
      } as any)

      // Event created 2 minutes ago
      const recentEvent = {
        id: 'evt_recent_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000) - 120, // 2 minutes ago
        livemode: false,
        api_version: '2023-10-16',
        data: {
          object: {
            metadata: { type: 'subscription' },
          },
        },
      }

      mockStripeWebhooksConstructEvent.mockReturnValue(recentEvent)
      mockPrisma.stripeEventLog.create.mockResolvedValue({})
      mockPrisma.stripeEventLog.update.mockResolvedValue({})

      const { POST } = await import('@/app/api/webhook/stripe/route')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(recentEvent),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Idempotency', () => {
    it('should skip already processed events', async () => {
      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'stripe-signature') return 'valid-sig'
          return null
        }),
      } as any)

      const event = {
        id: 'evt_already_processed',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2023-10-16',
        data: { object: {} },
      }

      mockStripeWebhooksConstructEvent.mockReturnValue(event)

      // Simulate P2002 unique constraint violation
      const p2002Error = new Error('Unique constraint violation')
      ;(p2002Error as any).code = 'P2002'
      mockPrisma.stripeEventLog.create.mockRejectedValue(p2002Error)

      mockPrisma.stripeEventLog.findUnique.mockResolvedValue({
        eventId: event.id,
        success: true,
        processedAt: new Date(),
      })

      const { POST } = await import('@/app/api/webhook/stripe/route')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.duplicate).toBe(true)
    })

    it('should handle concurrent duplicate events', async () => {
      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'stripe-signature') return 'valid-sig'
          return null
        }),
      } as any)

      const event = {
        id: 'evt_concurrent_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2023-10-16',
        data: {
          object: { metadata: { type: 'subscription' } },
        },
      }

      mockStripeWebhooksConstructEvent.mockReturnValue(event)

      // First call succeeds, second call hits unique constraint
      let callCount = 0
      mockPrisma.stripeEventLog.create.mockImplementation(() => {
        callCount++
        if (callCount > 1) {
          const error = new Error('Unique constraint')
          ;(error as any).code = 'P2002'
          throw error
        }
        return Promise.resolve({})
      })

      mockPrisma.stripeEventLog.findUnique.mockResolvedValue({
        eventId: event.id,
        success: false,
      })
      mockPrisma.stripeEventLog.update.mockResolvedValue({})

      const { POST } = await import('@/app/api/webhook/stripe/route')

      // Simulate concurrent requests
      const request1 = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })
      const request2 = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const [response1, response2] = await Promise.all([POST(request1), POST(request2)])

      // At least one should succeed, other should detect duplicate
      const statuses = [response1.status, response2.status]
      expect(statuses).toContain(200)
    })
  })

  describe('Event Type Handling', () => {
    const validEvent = (type: string, data: any = {}) => ({
      id: `evt_${type.replace(/\./g, '_')}_${Date.now()}`,
      type,
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      api_version: '2023-10-16',
      data: { object: data },
    })

    beforeEach(() => {
      const { headers } = require('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'stripe-signature') return 'valid-sig'
          return null
        }),
      } as any)

      mockPrisma.stripeEventLog.create.mockResolvedValue({})
      mockPrisma.stripeEventLog.update.mockResolvedValue({})
    })

    it('should handle checkout.session.completed for credit pack', async () => {
      const event = validEvent('checkout.session.completed', {
        id: 'cs_test_123',
        customer: 'cus_123',
        metadata: {
          type: 'credit_pack',
          creditPack: 'standard',
          userId: 'user-123',
        },
        amount_total: 9900,
        currency: 'krw',
      })

      mockStripeWebhooksConstructEvent.mockReturnValue(event)
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      })

      const { POST } = await import('@/app/api/webhook/stripe/route')
      const { addBonusCredits } = await import('@/lib/credits/creditService')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(addBonusCredits).toHaveBeenCalledWith('user-123', 15) // standard pack = 15 credits
    })

    it('should handle invoice.payment_failed', async () => {
      const event = validEvent('invoice.payment_failed', {
        id: 'in_failed_123',
        subscription: 'sub_123',
        customer: 'cus_123',
      })

      mockStripeWebhooksConstructEvent.mockReturnValue(event)
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-db-id',
        userId: 'user-123',
        stripeSubscriptionId: 'sub_123',
        plan: 'premium',
      })
      mockPrisma.subscription.update.mockResolvedValue({})
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const { POST } = await import('@/app/api/webhook/stripe/route')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'past_due' }),
        })
      )
    })

    it('should handle customer.subscription.deleted', async () => {
      const event = validEvent('customer.subscription.deleted', {
        id: 'sub_deleted_123',
        customer: 'cus_123',
      })

      mockStripeWebhooksConstructEvent.mockReturnValue(event)
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-db-id',
        userId: 'user-123',
        stripeSubscriptionId: 'sub_deleted_123',
        plan: 'premium',
      })
      mockPrisma.subscription.update.mockResolvedValue({})
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
      })

      const { POST } = await import('@/app/api/webhook/stripe/route')
      const { upgradePlan } = await import('@/lib/credits/creditService')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(upgradePlan).toHaveBeenCalledWith('user-123', 'free')
    })

    it('should handle unrecognized event types gracefully', async () => {
      const event = validEvent('unknown.event.type', {})

      mockStripeWebhooksConstructEvent.mockReturnValue(event)

      const { POST } = await import('@/app/api/webhook/stripe/route')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  describe('Error Recovery', () => {
    it('should log failed event processing', async () => {
      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'stripe-signature') return 'valid-sig'
          return null
        }),
      } as any)

      const event = {
        id: 'evt_error_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2023-10-16',
        data: {
          object: {
            metadata: { type: 'credit_pack', creditPack: 'standard', userId: 'user-123' },
          },
        },
      }

      mockStripeWebhooksConstructEvent.mockReturnValue(event)
      mockPrisma.stripeEventLog.create.mockResolvedValue({})
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'))
      mockPrisma.stripeEventLog.findUnique.mockResolvedValue(null)
      mockPrisma.stripeEventLog.upsert.mockResolvedValue({})

      const { POST } = await import('@/app/api/webhook/stripe/route')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
      expect(mockPrisma.stripeEventLog.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            success: false,
            errorMsg: expect.stringContaining('Database error'),
          }),
        })
      )
    })

    it('should handle missing user gracefully for credit pack', async () => {
      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'stripe-signature') return 'valid-sig'
          return null
        }),
      } as any)

      const event = {
        id: 'evt_no_user_123',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2023-10-16',
        data: {
          object: {
            metadata: { type: 'credit_pack', creditPack: 'standard', userId: 'nonexistent-user' },
          },
        },
      }

      mockStripeWebhooksConstructEvent.mockReturnValue(event)
      mockPrisma.stripeEventLog.create.mockResolvedValue({})
      mockPrisma.stripeEventLog.update.mockResolvedValue({})
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const { POST } = await import('@/app/api/webhook/stripe/route')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(request)

      // Should succeed but not add credits (logged as warning)
      expect(response.status).toBe(200)
    })
  })

  describe('Livemode Handling', () => {
    it('should process test mode events', async () => {
      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'stripe-signature') return 'valid-sig'
          return null
        }),
      } as any)

      const event = {
        id: 'evt_test_mode',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        livemode: false,
        api_version: '2023-10-16',
        data: { object: { metadata: {} } },
      }

      mockStripeWebhooksConstructEvent.mockReturnValue(event)
      mockPrisma.stripeEventLog.create.mockResolvedValue({})
      mockPrisma.stripeEventLog.update.mockResolvedValue({})

      const { POST } = await import('@/app/api/webhook/stripe/route')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should process live mode events', async () => {
      const { headers } = await import('next/headers')
      vi.mocked(headers).mockReturnValue({
        get: vi.fn((key: string) => {
          if (key === 'stripe-signature') return 'valid-sig'
          return null
        }),
      } as any)

      const event = {
        id: 'evt_live_mode',
        type: 'checkout.session.completed',
        created: Math.floor(Date.now() / 1000),
        livemode: true,
        api_version: '2023-10-16',
        data: { object: { metadata: {} } },
      }

      mockStripeWebhooksConstructEvent.mockReturnValue(event)
      mockPrisma.stripeEventLog.create.mockResolvedValue({})
      mockPrisma.stripeEventLog.update.mockResolvedValue({})

      const { POST } = await import('@/app/api/webhook/stripe/route')

      const request = new Request('http://localhost/api/webhook/stripe', {
        method: 'POST',
        body: JSON.stringify(event),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })
})
