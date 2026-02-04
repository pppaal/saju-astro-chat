import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks  (must be declared before importing the route handler)
// ---------------------------------------------------------------------------

// The webhook route does NOT use withApiMiddleware, but we mock it for safety
// in case a transitive import pulls it in.
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => handler),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
  },
}))

// Mock next-auth (not used directly by the webhook, but may be pulled transitively)
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

// Mock telemetry & metrics
vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
}))

// Mock request-ip
vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}))

// Mock next/headers -- headers() is called inside the route
const mockHeadersGet = vi.fn()
const mockHeadersHas = vi.fn()
vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: mockHeadersGet,
    has: mockHeadersHas,
  })),
}))

// ---------------------------------------------------------------------------
// Stripe mock
// ---------------------------------------------------------------------------
const mockConstructEvent = vi.fn()
const mockCustomerRetrieve = vi.fn()
const mockPaymentIntentsRetrieve = vi.fn()
const mockPaymentMethodsRetrieve = vi.fn()

vi.mock('stripe', () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: mockConstructEvent,
    },
    customers: {
      retrieve: mockCustomerRetrieve,
    },
    paymentIntents: {
      retrieve: mockPaymentIntentsRetrieve,
    },
    paymentMethods: {
      retrieve: mockPaymentMethodsRetrieve,
    },
  }))
  return { default: StripeMock }
})

// Mock prices helper
vi.mock('@/lib/payments/prices', () => ({
  getPlanFromPriceId: vi.fn(),
}))

// Mock credit service
vi.mock('@/lib/credits/creditService', () => ({
  upgradePlan: vi.fn(),
  addBonusCredits: vi.fn(),
}))

// Mock email service
vi.mock('@/lib/email', () => ({
  sendPaymentReceiptEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionConfirmEmail: vi.fn().mockResolvedValue(undefined),
  sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
}))

// ---------------------------------------------------------------------------
// Import route handler and mocked modules AFTER all vi.mock calls
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/webhook/stripe/route'
import { prisma } from '@/lib/db/prisma'
import { getPlanFromPriceId } from '@/lib/payments/prices'
import { upgradePlan, addBonusCredits } from '@/lib/credits/creditService'
import {
  sendPaymentReceiptEmail,
  sendSubscriptionConfirmEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentFailedEmail,
} from '@/lib/email'
import { captureServerError } from '@/lib/telemetry'
import { recordCounter } from '@/lib/metrics'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Seconds since epoch, "now" by default. */
function nowEpoch(offsetSeconds = 0): number {
  return Math.floor(Date.now() / 1000) + offsetSeconds
}

/** Build a minimal Stripe-like event object. */
function makeEvent(
  type: string,
  dataObject: Record<string, unknown>,
  overrides: Record<string, unknown> = {}
) {
  return {
    id: `evt_test_${Date.now()}`,
    type,
    data: { object: dataObject },
    created: nowEpoch(), // fresh event
    livemode: false,
    api_version: '2025-10-29.clover',
    ...overrides,
  }
}

/** Build a NextRequest with a body string and optional stripe-signature header. */
function makeWebhookRequest(body = '{}') {
  return new NextRequest('http://localhost/api/webhook/stripe', {
    method: 'POST',
    body,
  })
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Stripe Webhook API - POST /api/webhook/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default env vars
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx'
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_xxx'

    // Default: signature header is present
    mockHeadersGet.mockImplementation((name: string) => {
      if (name === 'stripe-signature') return 'sig_test'
      return null
    })

    // Default: idempotency create succeeds (first-time event)
    vi.mocked(prisma.stripeEventLog.create).mockResolvedValue({} as any)
    // Default: event log update succeeds
    vi.mocked(prisma.stripeEventLog.update).mockResolvedValue({} as any)
  })

  // =========================================================================
  // 1. Configuration errors
  // =========================================================================
  describe('Configuration errors', () => {
    it('should return 500 when STRIPE_WEBHOOK_SECRET is not set', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET

      const response = await POST(makeWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Webhook secret not configured')
      expect(vi.mocked(logger.error)).toHaveBeenCalled()
      expect(vi.mocked(captureServerError)).toHaveBeenCalled()
      expect(vi.mocked(recordCounter)).toHaveBeenCalledWith('stripe_webhook_config_error', 1, {
        reason: 'missing_secret',
      })
    })

    it('should return 500 when STRIPE_WEBHOOK_SECRET is empty string', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = ''

      const response = await POST(makeWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Webhook secret not configured')
    })
  })

  // =========================================================================
  // 2. Missing signature header
  // =========================================================================
  describe('Missing stripe-signature header', () => {
    it('should return 400 when stripe-signature header is absent', async () => {
      mockHeadersGet.mockReturnValue(null) // no signature

      const response = await POST(makeWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing stripe-signature header')
      expect(vi.mocked(recordCounter)).toHaveBeenCalledWith('stripe_webhook_auth_error', 1, {
        reason: 'missing_signature',
      })
    })
  })

  // =========================================================================
  // 3. Signature verification failure
  // =========================================================================
  describe('Signature verification', () => {
    it('should return 400 when constructEvent throws', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      const response = await POST(makeWebhookRequest('raw_body'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Webhook signature verification failed')
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('Signature verification failed'),
        expect.objectContaining({ message: 'Invalid signature' })
      )
      expect(vi.mocked(recordCounter)).toHaveBeenCalledWith('stripe_webhook_auth_error', 1, {
        reason: 'verify_failed',
      })
    })

    it('should handle non-Error throw in constructEvent', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw 'string_error'
      })

      const response = await POST(makeWebhookRequest('raw_body'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Webhook signature verification failed')
    })
  })

  // =========================================================================
  // 4. Stale event rejection (replay attack prevention)
  // =========================================================================
  describe('Stale event rejection', () => {
    it('should return 400 for events older than 5 minutes', async () => {
      const staleEvent = makeEvent(
        'checkout.session.completed',
        {},
        {
          created: nowEpoch(-301), // 301 seconds ago
        }
      )
      mockConstructEvent.mockReturnValue(staleEvent)

      const response = await POST(makeWebhookRequest('body'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Event too old')
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.stringContaining('Stale event rejected'),
        expect.any(Object)
      )
      expect(vi.mocked(recordCounter)).toHaveBeenCalledWith('stripe_webhook_stale_event', 1, {
        event: 'checkout.session.completed',
      })
    })

    it('should accept events within the 5-minute window', async () => {
      const freshEvent = makeEvent(
        'checkout.session.completed',
        {
          metadata: { type: 'credit_pack', creditPack: 'mini', userId: 'u1' },
          amount_total: 5000,
          currency: 'krw',
          id: 'cs_test',
        },
        { created: nowEpoch(-100) }
      ) // 100 seconds ago (within 300s limit)
      mockConstructEvent.mockReturnValue(freshEvent)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u1',
        email: 'u@e.com',
        name: 'Test',
      } as any)
      vi.mocked(addBonusCredits).mockResolvedValue(undefined as any)

      const response = await POST(makeWebhookRequest('body'))
      expect(response.status).toBe(200)
    })
  })

  // =========================================================================
  // 5. Idempotency / duplicate events
  // =========================================================================
  describe('Idempotency checks', () => {
    it('should return { received: true, duplicate: true } for already-processed events', async () => {
      const event = makeEvent('checkout.session.completed', {})
      mockConstructEvent.mockReturnValue(event)

      // Simulate P2002 unique constraint violation
      const duplicateErr: any = new Error('Unique constraint failed')
      duplicateErr.code = 'P2002'
      vi.mocked(prisma.stripeEventLog.create).mockRejectedValue(duplicateErr)
      vi.mocked(prisma.stripeEventLog.findUnique).mockResolvedValue({
        eventId: event.id,
        success: true,
        processedAt: new Date(),
      } as any)

      const response = await POST(makeWebhookRequest('body'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(data.duplicate).toBe(true)
      expect(vi.mocked(recordCounter)).toHaveBeenCalledWith('stripe_webhook_duplicate', 1, {
        event: event.type,
      })
    })

    it('should return duplicate for events that are in-progress (not yet successful)', async () => {
      const event = makeEvent('checkout.session.completed', {})
      mockConstructEvent.mockReturnValue(event)

      const duplicateErr: any = new Error('Unique constraint failed')
      duplicateErr.code = 'P2002'
      vi.mocked(prisma.stripeEventLog.create).mockRejectedValue(duplicateErr)
      vi.mocked(prisma.stripeEventLog.findUnique).mockResolvedValue({
        eventId: event.id,
        success: false,
        processedAt: null,
      } as any)

      const response = await POST(makeWebhookRequest('body'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(data.duplicate).toBe(true)
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.stringContaining('Event processing in progress or failed')
      )
    })

    it('should re-throw non-P2002 errors from idempotency create', async () => {
      const event = makeEvent('checkout.session.completed', {})
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.stripeEventLog.create).mockRejectedValue(new Error('DB connection lost'))

      // The throw on line 144 is OUTSIDE the main try/catch, so the POST
      // function itself rejects with the original error.
      await expect(POST(makeWebhookRequest('body'))).rejects.toThrow('DB connection lost')
    })
  })

  // =========================================================================
  // 6. checkout.session.completed  (credit pack purchase)
  // =========================================================================
  describe('checkout.session.completed', () => {
    it('should add bonus credits for a valid credit pack purchase', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_test_123',
        metadata: { type: 'credit_pack', creditPack: 'standard', userId: 'user-1' },
        amount_total: 9900,
        currency: 'krw',
      })
      mockConstructEvent.mockReturnValue(event)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
      } as any)
      vi.mocked(addBonusCredits).mockResolvedValue(undefined as any)

      const response = await POST(makeWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(vi.mocked(addBonusCredits)).toHaveBeenCalledWith('user-1', 15) // standard = 15
      expect(vi.mocked(sendPaymentReceiptEmail)).toHaveBeenCalledWith(
        'user-1',
        'alice@example.com',
        expect.objectContaining({
          userName: 'Alice',
          amount: 9900,
          currency: 'krw',
          productName: 'Standard (15 Credits)',
          transactionId: 'cs_test_123',
        })
      )
      // Verify success is recorded in event log
      expect(vi.mocked(prisma.stripeEventLog.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: event.id },
          data: expect.objectContaining({ success: true }),
        })
      )
    })

    it('should handle all credit pack types correctly', async () => {
      const packMapping: Record<string, number> = {
        mini: 5,
        standard: 15,
        plus: 40,
        mega: 100,
        ultimate: 250,
      }

      for (const [pack, expectedCredits] of Object.entries(packMapping)) {
        vi.clearAllMocks()

        // Restore defaults after clearAllMocks
        vi.mocked(prisma.stripeEventLog.create).mockResolvedValue({} as any)
        vi.mocked(prisma.stripeEventLog.update).mockResolvedValue({} as any)
        mockHeadersGet.mockImplementation((name: string) => {
          if (name === 'stripe-signature') return 'sig_test'
          return null
        })

        const event = makeEvent('checkout.session.completed', {
          id: `cs_${pack}`,
          metadata: { type: 'credit_pack', creditPack: pack, userId: 'u1' },
          amount_total: 1000,
          currency: 'krw',
        })
        mockConstructEvent.mockReturnValue(event)
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'u1',
          name: 'Bob',
          email: 'bob@x.com',
        } as any)
        vi.mocked(addBonusCredits).mockResolvedValue(undefined as any)

        const response = await POST(makeWebhookRequest())
        expect(response.status).toBe(200)
        expect(vi.mocked(addBonusCredits)).toHaveBeenCalledWith('u1', expectedCredits)
      }
    })

    it('should skip non-credit-pack checkout sessions', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_other',
        metadata: { type: 'subscription' },
      })
      mockConstructEvent.mockReturnValue(event)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(addBonusCredits)).not.toHaveBeenCalled()
    })

    it('should skip when metadata is missing type field', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_no_type',
        metadata: {},
      })
      mockConstructEvent.mockReturnValue(event)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(addBonusCredits)).not.toHaveBeenCalled()
    })

    it('should skip when metadata has no creditPack', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_no_pack',
        metadata: { type: 'credit_pack', userId: 'u1' },
      })
      mockConstructEvent.mockReturnValue(event)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(addBonusCredits)).not.toHaveBeenCalled()
    })

    it('should skip when metadata has no userId', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_no_uid',
        metadata: { type: 'credit_pack', creditPack: 'mini' },
      })
      mockConstructEvent.mockReturnValue(event)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(addBonusCredits)).not.toHaveBeenCalled()
    })

    it('should skip for unknown credit pack name', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_unknown_pack',
        metadata: { type: 'credit_pack', creditPack: 'nonexistent', userId: 'u1' },
      })
      mockConstructEvent.mockReturnValue(event)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(addBonusCredits)).not.toHaveBeenCalled()
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('Unknown credit pack')
      )
    })

    it('should skip when user is not found', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_no_user',
        metadata: { type: 'credit_pack', creditPack: 'mini', userId: 'ghost' },
      })
      mockConstructEvent.mockReturnValue(event)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(addBonusCredits)).not.toHaveBeenCalled()
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('User not found')
      )
    })

    it('should throw (and return 500) when addBonusCredits fails', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_fail',
        metadata: { type: 'credit_pack', creditPack: 'mini', userId: 'u1' },
      })
      mockConstructEvent.mockReturnValue(event)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u1',
        email: 'u@e.com',
        name: null,
      } as any)
      vi.mocked(addBonusCredits).mockRejectedValue(new Error('DB write failed'))
      vi.mocked(prisma.stripeEventLog.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.stripeEventLog.upsert).mockResolvedValue({} as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(500)
    })

    it('should not send email when user has no email', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_no_email',
        metadata: { type: 'credit_pack', creditPack: 'mini', userId: 'u1' },
        amount_total: 1000,
        currency: 'krw',
      })
      mockConstructEvent.mockReturnValue(event)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'u1',
        name: null,
        email: null,
      } as any)
      vi.mocked(addBonusCredits).mockResolvedValue(undefined as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(sendPaymentReceiptEmail)).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 7. customer.subscription.created
  // =========================================================================
  describe('customer.subscription.created', () => {
    const subscriptionObj = {
      id: 'sub_123',
      customer: 'cus_abc',
      status: 'active',
      items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      current_period_start: nowEpoch(),
      current_period_end: nowEpoch(30 * 86400),
      cancel_at_period_end: false,
    }

    it('should upsert subscription and upgrade plan', async () => {
      const event = makeEvent('customer.subscription.created', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      mockCustomerRetrieve.mockResolvedValue({
        id: 'cus_abc',
        deleted: false,
        email: 'alice@example.com',
      })
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'user',
        stripeCustomerId: 'cus_abc',
        plan: 'free',
      } as any)
      vi.mocked(getPlanFromPriceId).mockReturnValue({
        plan: 'pro',
        billingCycle: 'monthly',
      })
      vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as any)
      vi.mocked(upgradePlan).mockResolvedValue(undefined as any)

      const response = await POST(makeWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(vi.mocked(prisma.subscription.upsert)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_123' },
          create: expect.objectContaining({
            userId: 'user-1',
            plan: 'pro',
            billingCycle: 'monthly',
          }),
        })
      )
      expect(vi.mocked(upgradePlan)).toHaveBeenCalledWith('user-1', 'pro')
      expect(vi.mocked(sendSubscriptionConfirmEmail)).toHaveBeenCalledWith(
        'user-1',
        'alice@example.com',
        expect.objectContaining({
          userName: 'Alice',
          planName: 'pro',
          billingCycle: 'monthly',
        })
      )
    })

    it('should skip when customer is deleted', async () => {
      const event = makeEvent('customer.subscription.created', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      mockCustomerRetrieve.mockResolvedValue({ id: 'cus_abc', deleted: true })

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.upsert)).not.toHaveBeenCalled()
    })

    it('should skip when customer has no email', async () => {
      const event = makeEvent('customer.subscription.created', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      mockCustomerRetrieve.mockResolvedValue({
        id: 'cus_abc',
        deleted: false,
        email: null,
      })

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.upsert)).not.toHaveBeenCalled()
    })

    it('should skip when user is not found by email', async () => {
      const event = makeEvent('customer.subscription.created', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      mockCustomerRetrieve.mockResolvedValue({
        id: 'cus_abc',
        deleted: false,
        email: 'nobody@example.com',
      })
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.upsert)).not.toHaveBeenCalled()
    })

    it('should skip when priceId is not whitelisted', async () => {
      const event = makeEvent('customer.subscription.created', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      mockCustomerRetrieve.mockResolvedValue({
        id: 'cus_abc',
        deleted: false,
        email: 'alice@example.com',
      })
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
      } as any)
      vi.mocked(getPlanFromPriceId).mockReturnValue(null)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.upsert)).not.toHaveBeenCalled()
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('Price not whitelisted'),
        expect.any(Object)
      )
    })

    it('should handle upgradePlan failure gracefully (logs but does not crash)', async () => {
      const event = makeEvent('customer.subscription.created', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      mockCustomerRetrieve.mockResolvedValue({
        id: 'cus_abc',
        deleted: false,
        email: 'alice@example.com',
      })
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
      } as any)
      vi.mocked(getPlanFromPriceId).mockReturnValue({ plan: 'pro', billingCycle: 'monthly' })
      vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as any)
      vi.mocked(upgradePlan).mockRejectedValue(new Error('credit upgrade error'))

      const response = await POST(makeWebhookRequest())
      // Should still return 200 because the error is caught internally
      expect(response.status).toBe(200)
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upgrade credits'),
        expect.any(Error)
      )
    })

    it('should handle subscription with no items gracefully', async () => {
      const noItemsSub = {
        ...subscriptionObj,
        items: { data: [] },
      }
      const event = makeEvent('customer.subscription.created', noItemsSub)
      mockConstructEvent.mockReturnValue(event)

      mockCustomerRetrieve.mockResolvedValue({
        id: 'cus_abc',
        deleted: false,
        email: 'alice@example.com',
      })
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
      } as any)
      // priceId will be '' and getPlanFromPriceId returns null
      vi.mocked(getPlanFromPriceId).mockReturnValue(null)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.upsert)).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 8. customer.subscription.updated
  // =========================================================================
  describe('customer.subscription.updated', () => {
    const subscriptionObj = {
      id: 'sub_upd_1',
      customer: 'cus_abc',
      status: 'active',
      items: { data: [{ price: { id: 'price_premium_monthly' } }] },
      current_period_start: nowEpoch(),
      current_period_end: nowEpoch(30 * 86400),
      cancel_at_period_end: false,
      canceled_at: null,
    }

    it('should update an existing subscription', async () => {
      const event = makeEvent('customer.subscription.updated', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_upd_1',
        userId: 'user-1',
        plan: 'pro',
        billingCycle: 'monthly',
        stripePriceId: 'price_pro_monthly',
      } as any)
      vi.mocked(getPlanFromPriceId).mockReturnValue({ plan: 'premium', billingCycle: 'monthly' })
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      vi.mocked(upgradePlan).mockResolvedValue(undefined as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_upd_1' },
          data: expect.objectContaining({
            plan: 'premium',
            status: 'active',
          }),
        })
      )
      // Plan changed from pro -> premium while status is active => upgrade
      expect(vi.mocked(upgradePlan)).toHaveBeenCalledWith('user-1', 'premium')
    })

    it('should NOT call upgradePlan when plan has not changed', async () => {
      const event = makeEvent('customer.subscription.updated', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_upd_1',
        userId: 'user-1',
        plan: 'premium',
        billingCycle: 'monthly',
        stripePriceId: 'price_premium_monthly',
      } as any)
      vi.mocked(getPlanFromPriceId).mockReturnValue({ plan: 'premium', billingCycle: 'monthly' })
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(upgradePlan)).not.toHaveBeenCalled()
    })

    it('should NOT call upgradePlan when plan changed but status is not active', async () => {
      const inactiveSub = { ...subscriptionObj, status: 'past_due' }
      const event = makeEvent('customer.subscription.updated', inactiveSub)
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_upd_1',
        userId: 'user-1',
        plan: 'pro',
        billingCycle: 'monthly',
        stripePriceId: 'price_pro_monthly',
      } as any)
      vi.mocked(getPlanFromPriceId).mockReturnValue({ plan: 'premium', billingCycle: 'monthly' })
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(upgradePlan)).not.toHaveBeenCalled()
    })

    it('should fall back to handleSubscriptionCreated when subscription does not exist', async () => {
      const event = makeEvent('customer.subscription.updated', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null) // not found

      // Set up mocks for the handleSubscriptionCreated fallback path
      mockCustomerRetrieve.mockResolvedValue({
        id: 'cus_abc',
        deleted: false,
        email: 'alice@example.com',
      })
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
      } as any)
      vi.mocked(getPlanFromPriceId).mockReturnValue({ plan: 'premium', billingCycle: 'monthly' })
      vi.mocked(prisma.subscription.upsert).mockResolvedValue({} as any)
      vi.mocked(upgradePlan).mockResolvedValue(undefined as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      // Falls through to handleSubscriptionCreated which calls upsert
      expect(vi.mocked(prisma.subscription.upsert)).toHaveBeenCalled()
    })

    it('should use existing plan when getPlanFromPriceId returns null', async () => {
      const event = makeEvent('customer.subscription.updated', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_upd_1',
        userId: 'user-1',
        plan: 'pro',
        billingCycle: 'yearly',
        stripePriceId: 'price_pro_yearly',
      } as any)
      vi.mocked(getPlanFromPriceId).mockReturnValue(null) // unknown price
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: 'pro', // falls back to existing
            billingCycle: 'yearly',
          }),
        })
      )
    })

    it('should set canceledAt when subscription has canceled_at timestamp', async () => {
      const canceledTimestamp = nowEpoch(-60)
      const canceledSub = { ...subscriptionObj, canceled_at: canceledTimestamp }
      const event = makeEvent('customer.subscription.updated', canceledSub)
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_upd_1',
        userId: 'user-1',
        plan: 'premium',
        billingCycle: 'monthly',
        stripePriceId: 'price_premium_monthly',
      } as any)
      vi.mocked(getPlanFromPriceId).mockReturnValue({ plan: 'premium', billingCycle: 'monthly' })
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            canceledAt: new Date(canceledTimestamp * 1000),
          }),
        })
      )
    })

    it('should handle upgradePlan failure gracefully on plan change', async () => {
      const event = makeEvent('customer.subscription.updated', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_upd_1',
        userId: 'user-1',
        plan: 'starter',
        billingCycle: 'monthly',
        stripePriceId: 'price_starter_monthly',
      } as any)
      vi.mocked(getPlanFromPriceId).mockReturnValue({ plan: 'premium', billingCycle: 'monthly' })
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      vi.mocked(upgradePlan).mockRejectedValue(new Error('credit system down'))

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200) // error is caught internally
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('Failed to upgrade credits'),
        expect.any(Error)
      )
    })
  })

  // =========================================================================
  // 9. customer.subscription.deleted
  // =========================================================================
  describe('customer.subscription.deleted', () => {
    const subscriptionObj = {
      id: 'sub_del_1',
      customer: 'cus_abc',
      status: 'canceled',
      items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      current_period_start: nowEpoch(-30 * 86400),
      current_period_end: nowEpoch(),
      cancel_at_period_end: true,
    }

    it('should cancel subscription and downgrade to free', async () => {
      const event = makeEvent('customer.subscription.deleted', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_del_1',
        userId: 'user-1',
        plan: 'pro',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      vi.mocked(upgradePlan).mockResolvedValue(undefined as any)
      // findUnique for user (second call)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
      } as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)

      expect(vi.mocked(prisma.subscription.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_del_1' },
          data: expect.objectContaining({ status: 'canceled' }),
        })
      )
      expect(vi.mocked(upgradePlan)).toHaveBeenCalledWith('user-1', 'free')
      expect(vi.mocked(sendSubscriptionCancelledEmail)).toHaveBeenCalledWith(
        'user-1',
        'alice@example.com',
        expect.objectContaining({ userName: 'Alice', planName: 'pro' })
      )
    })

    it('should skip when subscription not found in DB', async () => {
      const event = makeEvent('customer.subscription.deleted', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.update)).not.toHaveBeenCalled()
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.stringContaining('Subscription not found')
      )
    })

    it('should handle upgradePlan failure gracefully on downgrade', async () => {
      const event = makeEvent('customer.subscription.deleted', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_del_1',
        userId: 'user-1',
        plan: 'pro',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      vi.mocked(upgradePlan).mockRejectedValue(new Error('downgrade failed'))
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
      } as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200) // error is caught internally
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('Failed to downgrade credits'),
        expect.any(Error)
      )
    })

    it('should not send email when user has no email', async () => {
      const event = makeEvent('customer.subscription.deleted', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_del_1',
        userId: 'user-1',
        plan: 'pro',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      vi.mocked(upgradePlan).mockResolvedValue(undefined as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: null,
        name: null,
      } as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(sendSubscriptionCancelledEmail)).not.toHaveBeenCalled()
    })

    it('should not send email when user is not found', async () => {
      const event = makeEvent('customer.subscription.deleted', subscriptionObj)
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_del_1',
        userId: 'user-1',
        plan: 'pro',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      vi.mocked(upgradePlan).mockResolvedValue(undefined as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(sendSubscriptionCancelledEmail)).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 10. invoice.payment_succeeded
  // =========================================================================
  describe('invoice.payment_succeeded', () => {
    it('should update subscription status to active with payment method', async () => {
      const event = makeEvent('invoice.payment_succeeded', {
        subscription: 'sub_inv_1',
        payment_intent: 'pi_abc',
      })
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_inv_1',
        userId: 'user-1',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      mockPaymentIntentsRetrieve.mockResolvedValue({ payment_method: 'pm_xxx' })
      mockPaymentMethodsRetrieve.mockResolvedValue({ type: 'card' })

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_inv_1' },
          data: { status: 'active', paymentMethod: 'card' },
        })
      )
    })

    it('should handle subscription as object (not string)', async () => {
      const event = makeEvent('invoice.payment_succeeded', {
        subscription: { id: 'sub_obj_1' },
        payment_intent: 'pi_abc',
      })
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_obj_1',
        userId: 'user-1',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      mockPaymentIntentsRetrieve.mockResolvedValue({ payment_method: 'pm_xxx' })
      mockPaymentMethodsRetrieve.mockResolvedValue({ type: 'kakao_pay' })

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'active', paymentMethod: 'kakao_pay' },
        })
      )
    })

    it('should skip when invoice has no subscription', async () => {
      const event = makeEvent('invoice.payment_succeeded', {
        subscription: null,
        payment_intent: 'pi_abc',
      })
      mockConstructEvent.mockReturnValue(event)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.findUnique)).not.toHaveBeenCalled()
    })

    it('should skip update when subscription not found in DB', async () => {
      const event = makeEvent('invoice.payment_succeeded', {
        subscription: 'sub_ghost',
        payment_intent: 'pi_abc',
      })
      mockConstructEvent.mockReturnValue(event)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.update)).not.toHaveBeenCalled()
    })

    it('should handle payment_intent as object (not string)', async () => {
      const event = makeEvent('invoice.payment_succeeded', {
        subscription: 'sub_inv_2',
        payment_intent: { id: 'pi_obj' },
      })
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_inv_2',
        userId: 'user-1',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      mockPaymentIntentsRetrieve.mockResolvedValue({ payment_method: 'pm_xxx' })
      mockPaymentMethodsRetrieve.mockResolvedValue({ type: 'card' })

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(mockPaymentIntentsRetrieve).toHaveBeenCalledWith('pi_obj')
    })

    it('should set paymentMethod to null when payment_intent is missing', async () => {
      const event = makeEvent('invoice.payment_succeeded', {
        subscription: 'sub_inv_3',
        payment_intent: null,
      })
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_inv_3',
        userId: 'user-1',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'active', paymentMethod: null },
        })
      )
    })

    it('should return null payment method when stripe api call fails', async () => {
      const event = makeEvent('invoice.payment_succeeded', {
        subscription: 'sub_inv_4',
        payment_intent: 'pi_fail',
      })
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_inv_4',
        userId: 'user-1',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      mockPaymentIntentsRetrieve.mockRejectedValue(new Error('Stripe API error'))

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'active', paymentMethod: null },
        })
      )
    })

    it('should return null payment method when paymentIntent has no payment_method', async () => {
      const event = makeEvent('invoice.payment_succeeded', {
        subscription: 'sub_inv_5',
        payment_intent: 'pi_no_pm',
      })
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_inv_5',
        userId: 'user-1',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      mockPaymentIntentsRetrieve.mockResolvedValue({ payment_method: null })

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'active', paymentMethod: null },
        })
      )
    })
  })

  // =========================================================================
  // 11. invoice.payment_failed
  // =========================================================================
  describe('invoice.payment_failed', () => {
    it('should update subscription status to past_due and send failure email', async () => {
      const event = makeEvent('invoice.payment_failed', {
        subscription: 'sub_fail_1',
      })
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_fail_1',
        userId: 'user-1',
        plan: 'premium',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
      } as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)

      expect(vi.mocked(prisma.subscription.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { stripeSubscriptionId: 'sub_fail_1' },
          data: { status: 'past_due' },
        })
      )
      expect(vi.mocked(sendPaymentFailedEmail)).toHaveBeenCalledWith(
        'user-1',
        'alice@example.com',
        expect.objectContaining({
          userName: 'Alice',
          planName: 'premium',
        })
      )
    })

    it('should skip when invoice has no subscription', async () => {
      const event = makeEvent('invoice.payment_failed', {
        subscription: null,
      })
      mockConstructEvent.mockReturnValue(event)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.findUnique)).not.toHaveBeenCalled()
    })

    it('should handle subscription as object', async () => {
      const event = makeEvent('invoice.payment_failed', {
        subscription: { id: 'sub_fail_obj' },
      })
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_fail_obj',
        userId: 'user-1',
        plan: 'pro',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: 'bob@x.com',
        name: 'Bob',
      } as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.update)).toHaveBeenCalled()
    })

    it('should skip update when subscription not found in DB', async () => {
      const event = makeEvent('invoice.payment_failed', {
        subscription: 'sub_ghost',
      })
      mockConstructEvent.mockReturnValue(event)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.subscription.update)).not.toHaveBeenCalled()
    })

    it('should not send email when user has no email', async () => {
      const event = makeEvent('invoice.payment_failed', {
        subscription: 'sub_fail_noemail',
      })
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_fail_noemail',
        userId: 'user-1',
        plan: 'pro',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        email: null,
        name: null,
      } as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(sendPaymentFailedEmail)).not.toHaveBeenCalled()
    })

    it('should not send email when user not found', async () => {
      const event = makeEvent('invoice.payment_failed', {
        subscription: 'sub_fail_nouser',
      })
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({
        stripeSubscriptionId: 'sub_fail_nouser',
        userId: 'user-1',
        plan: 'pro',
      } as any)
      vi.mocked(prisma.subscription.update).mockResolvedValue({} as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(sendPaymentFailedEmail)).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // 12. Unhandled event types (default branch)
  // =========================================================================
  describe('Unhandled event types', () => {
    it('should log a warning and return 200 for unknown event types', async () => {
      const event = makeEvent('charge.refunded', { id: 'ch_xxx' })
      mockConstructEvent.mockReturnValue(event)

      const response = await POST(makeWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled event type: charge.refunded')
      )
    })
  })

  // =========================================================================
  // 13. Error handling in event processing (catch block)
  // =========================================================================
  describe('Error handling during event processing', () => {
    it('should return 500 and log error details when handler throws', async () => {
      const event = makeEvent('customer.subscription.deleted', {
        id: 'sub_throw',
        customer: 'cus_abc',
        status: 'canceled',
        items: { data: [] },
      })
      mockConstructEvent.mockReturnValue(event)

      // findUnique throws
      vi.mocked(prisma.subscription.findUnique).mockRejectedValue(new Error('DB timeout'))
      vi.mocked(prisma.stripeEventLog.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.stripeEventLog.upsert).mockResolvedValue({} as any)

      const response = await POST(makeWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal Server Error')
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('Error handling customer.subscription.deleted'),
        expect.any(Error)
      )
      expect(vi.mocked(recordCounter)).toHaveBeenCalledWith('stripe_webhook_handler_error', 1, {
        event: 'customer.subscription.deleted',
      })
      // Should have attempted to upsert the error into the event log
      expect(vi.mocked(prisma.stripeEventLog.upsert)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: event.id },
          update: expect.objectContaining({ success: false, errorMsg: 'DB timeout' }),
        })
      )
    })

    it('should handle non-Error throw in event handler', async () => {
      const event = makeEvent('customer.subscription.deleted', {
        id: 'sub_nonError',
        customer: 'cus_abc',
        status: 'canceled',
        items: { data: [] },
      })
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockRejectedValue('string_reject')
      vi.mocked(prisma.stripeEventLog.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.stripeEventLog.upsert).mockResolvedValue({} as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(500)
      // The error message should be 'Unknown error' for non-Error throws
      expect(vi.mocked(prisma.stripeEventLog.upsert)).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ errorMsg: 'Unknown error' }),
        })
      )
    })

    it('should return duplicate when event was processed by another worker during error handling', async () => {
      const event = makeEvent('customer.subscription.deleted', {
        id: 'sub_race',
        customer: 'cus_abc',
        status: 'canceled',
        items: { data: [] },
      })
      mockConstructEvent.mockReturnValue(event)

      // Handler throws
      vi.mocked(prisma.subscription.findUnique).mockRejectedValue(new Error('fail'))
      // But by the time we check, another worker succeeded
      vi.mocked(prisma.stripeEventLog.findUnique).mockResolvedValue({
        eventId: event.id,
        success: true,
        processedAt: new Date(),
      } as any)

      const response = await POST(makeWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(data.duplicate).toBe(true)
    })

    it('should handle error when logging the error itself fails', async () => {
      const event = makeEvent('customer.subscription.deleted', {
        id: 'sub_logfail',
        customer: 'cus_abc',
        status: 'canceled',
        items: { data: [] },
      })
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.subscription.findUnique).mockRejectedValue(new Error('handler fail'))
      // Error logging also fails
      vi.mocked(prisma.stripeEventLog.findUnique).mockRejectedValue(new Error('log fail'))

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(500)
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('Failed to log error event'),
        expect.any(Error)
      )
    })
  })

  // =========================================================================
  // 14. Event log success update
  // =========================================================================
  describe('Event log success recording', () => {
    it('should update event log with success=true after successful processing', async () => {
      const event = makeEvent('invoice.payment_succeeded', {
        subscription: 'sub_log_ok',
        payment_intent: null,
      })
      mockConstructEvent.mockReturnValue(event)
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null) // no sub found

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(200)
      expect(vi.mocked(prisma.stripeEventLog.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: event.id },
          data: expect.objectContaining({
            success: true,
            errorMsg: null,
          }),
        })
      )
    })
  })

  // =========================================================================
  // 15. Edge cases
  // =========================================================================
  describe('Edge cases', () => {
    it('should handle empty request body gracefully (constructEvent decides)', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload')
      })

      const response = await POST(makeWebhookRequest(''))
      expect(response.status).toBe(400)
    })

    it('should handle event at exactly 300 seconds old (boundary)', async () => {
      const event = makeEvent(
        'checkout.session.completed',
        {
          metadata: { type: 'other' },
        },
        { created: nowEpoch(-300) }
      )
      mockConstructEvent.mockReturnValue(event)

      const response = await POST(makeWebhookRequest())
      // 300 seconds is exactly the boundary; eventAgeSeconds > 300 is the check.
      // 300 is NOT > 300, so it should be accepted.
      expect(response.status).toBe(200)
    })

    it('should handle event with null metadata on checkout session', async () => {
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_null_meta',
        metadata: null,
      })
      mockConstructEvent.mockReturnValue(event)

      const response = await POST(makeWebhookRequest())
      // metadata?.type !== 'credit_pack' => skips
      expect(response.status).toBe(200)
      expect(vi.mocked(addBonusCredits)).not.toHaveBeenCalled()
    })

    it('should pass stripe-signature and body to constructEvent', async () => {
      mockConstructEvent.mockReturnValue(makeEvent('charge.refunded', { id: 'ch_xxx' }))

      await POST(makeWebhookRequest('test_body_payload'))

      expect(mockConstructEvent).toHaveBeenCalledWith(
        'test_body_payload',
        'sig_test',
        'whsec_test_xxx'
      )
    })
  })
})
