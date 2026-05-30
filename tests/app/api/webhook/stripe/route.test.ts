import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks  (must be declared before importing the route handler)
// ---------------------------------------------------------------------------

// The webhook route uses withApiMiddleware; provide a minimal context.
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return (req: any) =>
      handler(req, {
        userId: null,
        session: null,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: false,
        isPremium: false,
      })
  }),
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

// Mock credit service
vi.mock('@/lib/credits/creditService', () => ({
  addBonusCredits: vi.fn(),
  revokeBonusCreditPurchase: vi.fn().mockResolvedValue({
    revoked: true,
    reclaimed: 0,
    alreadyUsed: 0,
  }),
}))

// Mock referral service
vi.mock('@/lib/referral', () => ({
  grantReferralRewardOnFirstPurchase: vi.fn().mockResolvedValue({ granted: false }),
}))

// ---------------------------------------------------------------------------
// Import route handler and mocked modules AFTER all vi.mock calls
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/webhook/stripe/route'
import { prisma } from '@/lib/db/prisma'
import { addBonusCredits, revokeBonusCreditPurchase } from '@/lib/credits/creditService'
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
function makeWebhookRequest(body = '{}', signature: string | null = 'sig_test') {
  const headers: Record<string, string> = {}
  if (signature) {
    headers['stripe-signature'] = signature
  }
  return new NextRequest('http://localhost/api/webhook/stripe', {
    method: 'POST',
    body,
    headers,
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
      expect(data.error.message).toBe('Webhook secret not configured')
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
      expect(data.error.message).toBe('Webhook secret not configured')
    })
  })

  // =========================================================================
  // 2. Missing signature header
  // =========================================================================
  describe('Missing stripe-signature header', () => {
    it('should return 400 when stripe-signature header is absent', async () => {
      const response = await POST(makeWebhookRequest('{}', null))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.message).toBe('Missing stripe-signature header')
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
      expect(data.error.message).toBe('Webhook signature verification failed')
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
      expect(data.error.message).toBe('Webhook signature verification failed')
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
      expect(data.error.message).toBe('Event too old')
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

    it('B1: should REPROCESS events with existing success=false (previously crashed mid-handler)', async () => {
      // Regression: previously this returned { duplicate: true } and short-circuited,
      // leaving partially-processed events permanently abandoned. Now it must
      // fall through to the handler; downstream ops are idempotent.
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_b1_retry',
        // No metadata → handler is no-op but still processes (no early duplicate return).
        metadata: { type: 'other' },
      })
      mockConstructEvent.mockReturnValue(event)

      const duplicateErr: any = new Error('Unique constraint failed')
      duplicateErr.code = 'P2002'
      vi.mocked(prisma.stripeEventLog.create).mockRejectedValue(duplicateErr)
      vi.mocked(prisma.stripeEventLog.findUnique).mockResolvedValue({
        eventId: event.id,
        success: false,
        processedAt: null,
      } as any)
      vi.mocked(prisma.stripeEventLog.update).mockResolvedValue({} as any)

      const response = await POST(makeWebhookRequest('body'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      // CRITICAL: must NOT short-circuit as duplicate
      expect(data.duplicate).toBeUndefined()
      // The retry-failed metric is emitted
      expect(vi.mocked(recordCounter)).toHaveBeenCalledWith(
        'stripe_webhook_retry_failed_event',
        1,
        { event: event.type }
      )
      // And handler ran through to success update
      expect(vi.mocked(prisma.stripeEventLog.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: event.id },
          data: expect.objectContaining({ success: true }),
        })
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
        payment_status: 'paid',
        payment_intent: 'pi_test_123',
      })
      mockConstructEvent.mockReturnValue(event)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        name: 'Alice',
        email: 'alice@example.com',
      } as any)
      vi.mocked(addBonusCredits).mockResolvedValue(undefined as any)
      vi.mocked(prisma.pendingCreditRevocation.findUnique).mockResolvedValue(null)

      const response = await POST(makeWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      // standard pack = 40 credits (per CREDIT_PACKS config)
      expect(vi.mocked(addBonusCredits)).toHaveBeenCalledWith(
        'user-1',
        40,
        'purchase',
        'pi_test_123'
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
        mini: 10,
        standard: 40,
        plus: 100,
        mega: 240,
        ultimate: 500,
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
          payment_status: 'paid',
          payment_intent: `pi_${pack}`,
        })
        mockConstructEvent.mockReturnValue(event)
        vi.mocked(prisma.user.findUnique).mockResolvedValue({
          id: 'u1',
          name: 'Bob',
          email: 'bob@x.com',
        } as any)
        vi.mocked(addBonusCredits).mockResolvedValue(undefined as any)
        vi.mocked(prisma.pendingCreditRevocation.findUnique).mockResolvedValue(null)

        const response = await POST(makeWebhookRequest())
        expect(response.status).toBe(200)
        expect(vi.mocked(addBonusCredits)).toHaveBeenCalledWith(
          'u1',
          expectedCredits,
          'purchase',
          `pi_${pack}`
        )
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
        payment_status: 'paid',
        payment_intent: 'pi_fail',
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

  })

  // =========================================================================
  // 12. Unhandled event types (default branch)
  // =========================================================================
  describe('Unhandled event types', () => {
    it('should log a warning and return 200 for unknown event types', async () => {
      const event = makeEvent('payment_intent.created', { id: 'pi_xxx' })
      mockConstructEvent.mockReturnValue(event)

      const response = await POST(makeWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
        expect.stringContaining('Unhandled event type: payment_intent.created')
      )
    })
  })

  // =========================================================================
  // 13. Error handling in event processing (catch block)
  // =========================================================================
  describe('Error handling during event processing', () => {
    const creditPackEvent = (id: string) =>
      makeEvent('checkout.session.completed', {
        id,
        metadata: { type: 'credit_pack', creditPack: 'standard', userId: 'user-1' },
        amount_total: 9900,
        currency: 'krw',
        payment_status: 'paid',
        payment_intent: `pi_${id}`,
      })

    it('should return 500 and log error details when handler throws', async () => {
      const event = creditPackEvent('cs_throw')
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        name: 'A',
        email: 'a@b.com',
      } as any)
      // addBonusCredits throws → handler rethrows
      vi.mocked(addBonusCredits).mockRejectedValue(new Error('DB timeout'))
      vi.mocked(prisma.stripeEventLog.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.stripeEventLog.upsert).mockResolvedValue({} as any)

      const response = await POST(makeWebhookRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.message).toBe('Internal Server Error')
      expect(vi.mocked(logger.error)).toHaveBeenCalledWith(
        expect.stringContaining('Error handling checkout.session.completed'),
        expect.any(Error)
      )
      expect(vi.mocked(recordCounter)).toHaveBeenCalledWith('stripe_webhook_handler_error', 1, {
        event: 'checkout.session.completed',
      })
      expect(vi.mocked(prisma.stripeEventLog.upsert)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: event.id },
          update: expect.objectContaining({ success: false, errorMsg: 'DB timeout' }),
        })
      )
    })

    it('should handle non-Error throw in event handler', async () => {
      const event = creditPackEvent('cs_nonError')
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        name: 'A',
        email: 'a@b.com',
      } as any)
      vi.mocked(addBonusCredits).mockRejectedValue('string_reject')
      vi.mocked(prisma.stripeEventLog.findUnique).mockResolvedValue(null)
      vi.mocked(prisma.stripeEventLog.upsert).mockResolvedValue({} as any)

      const response = await POST(makeWebhookRequest())
      expect(response.status).toBe(500)
      expect(vi.mocked(prisma.stripeEventLog.upsert)).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ errorMsg: 'Unknown error' }),
        })
      )
    })

    it('should return duplicate when event was processed by another worker during error handling', async () => {
      const event = creditPackEvent('cs_race')
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        name: 'A',
        email: 'a@b.com',
      } as any)
      vi.mocked(addBonusCredits).mockRejectedValue(new Error('fail'))
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
      const event = creditPackEvent('cs_logfail')
      mockConstructEvent.mockReturnValue(event)

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-1',
        name: 'A',
        email: 'a@b.com',
      } as any)
      vi.mocked(addBonusCredits).mockRejectedValue(new Error('handler fail'))
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
      // An unhandled event still processes successfully (default branch).
      const event = makeEvent('charge.refunded', { id: 'ch_log_ok' })
      mockConstructEvent.mockReturnValue(event)

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
        { created: nowEpoch(-299) }
      )
      mockConstructEvent.mockReturnValue(event)

      const response = await POST(makeWebhookRequest())
      // 299 seconds old is within the 300s window (eventAgeSeconds > 300 check).
      // Use -299 instead of -300 to avoid timing drift between event creation and assertion.
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

  // =========================================================================
  // 16. Regression: 3 Stripe webhook bug fixes
  // =========================================================================
  describe('Regression: Stripe webhook bug fixes', () => {
    it('B1: re-runs handler when StripeEventLog row exists with success=false (no short-circuit)', async () => {
      // Setup: a previous webhook attempt crashed AFTER inserting the log row
      // (success=false) but BEFORE updating it to success=true. Stripe retries
      // the event. Old behavior: short-circuit as "duplicate" and never finish.
      // New behavior: fall through and re-run the handler.
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_b1',
        metadata: { type: 'credit_pack', creditPack: 'mini', userId: 'user-b1' },
        amount_total: 1900,
        currency: 'krw',
        payment_status: 'paid',
        payment_intent: 'pi_b1',
      })
      mockConstructEvent.mockReturnValue(event)

      // First insert hits P2002 (row already there from previous attempt)
      const dup: any = new Error('Unique constraint failed')
      dup.code = 'P2002'
      vi.mocked(prisma.stripeEventLog.create).mockRejectedValue(dup)
      vi.mocked(prisma.stripeEventLog.findUnique).mockResolvedValue({
        eventId: event.id,
        success: false, // <-- key: not successful, must reprocess
        processedAt: null,
      } as any)
      vi.mocked(prisma.stripeEventLog.update).mockResolvedValue({} as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-b1',
        name: 'B1',
        email: 'b1@example.com',
      } as any)
      vi.mocked(addBonusCredits).mockResolvedValue(undefined as any)
      vi.mocked(prisma.pendingCreditRevocation.findUnique).mockResolvedValue(null)

      const response = await POST(makeWebhookRequest('body'))
      const data = await response.json()

      expect(response.status).toBe(200)
      // CRITICAL: not a short-circuit duplicate
      expect(data.duplicate).toBeUndefined()
      // Handler actually ran
      expect(vi.mocked(addBonusCredits)).toHaveBeenCalledWith(
        'user-b1',
        10, // mini = 10 credits
        'purchase',
        'pi_b1'
      )
      // Success is recorded
      expect(vi.mocked(prisma.stripeEventLog.update)).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: event.id },
          data: expect.objectContaining({ success: true }),
        })
      )
      // Retry metric is emitted
      expect(vi.mocked(recordCounter)).toHaveBeenCalledWith(
        'stripe_webhook_retry_failed_event',
        1,
        { event: 'checkout.session.completed' }
      )
    })

    it('B2: runs PendingCreditRevocation check even when addBonusCredits returns P2002 (idempotent retry)', async () => {
      // Setup: 1st attempt granted credits then crashed before revocation
      // check. 2nd attempt: addBonusCredits throws P2002 (already credited).
      // We must STILL run the PendingCreditRevocation check so a queued
      // revoke actually fires — otherwise refunded user keeps credits.
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_b2',
        metadata: { type: 'credit_pack', creditPack: 'mini', userId: 'user-b2' },
        amount_total: 1900,
        currency: 'krw',
        payment_status: 'paid',
        payment_intent: 'pi_b2',
      })
      mockConstructEvent.mockReturnValue(event)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-b2',
        name: 'B2',
        email: 'b2@example.com',
      } as any)
      // addBonusCredits throws P2002 (already credited on prior attempt)
      const dup: any = new Error('Unique constraint failed on BonusCreditPurchase.stripePaymentId')
      dup.code = 'P2002'
      vi.mocked(addBonusCredits).mockRejectedValue(dup)
      // A queued revocation EXISTS for this paymentIntent
      vi.mocked(prisma.pendingCreditRevocation.findUnique).mockResolvedValue({
        id: 'pending-1',
        stripePaymentIntentId: 'pi_b2',
        refundAmountCents: 1900,
        currency: 'krw',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
      } as any)
      vi.mocked(prisma.pendingCreditRevocation.delete).mockResolvedValue({} as any)
      vi.mocked(revokeBonusCreditPurchase).mockResolvedValue({
        revoked: true,
        reclaimed: 10,
        alreadyUsed: 0,
      })

      const response = await POST(makeWebhookRequest('body'))

      expect(response.status).toBe(200)
      // CRITICAL: revoke MUST be called even though addBonusCredits dedup'd
      expect(vi.mocked(revokeBonusCreditPurchase)).toHaveBeenCalledWith('pi_b2')
      // Pending row is cleaned up
      expect(vi.mocked(prisma.pendingCreditRevocation.delete)).toHaveBeenCalledWith({
        where: { id: 'pending-1' },
      })
      // Duplicate purchase metric was emitted (still detected as duplicate)
      expect(vi.mocked(recordCounter)).toHaveBeenCalledWith(
        'stripe_webhook_purchase_duplicate',
        1,
        { pack: 'mini' }
      )
    })

    it('B3: skips addBonusCredits when session.payment_status is "unpaid" (async payment)', async () => {
      // Setup: async payment (e.g. bank transfer). checkout.session.completed
      // fires with payment_status='unpaid' and payment_intent=null. Granting
      // credits here would (a) send credits before payment, and (b) write
      // stripePaymentId=null which bypasses the unique-constraint dedup,
      // causing repeated grants on every Stripe retry.
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_b3_unpaid',
        metadata: { type: 'credit_pack', creditPack: 'mini', userId: 'user-b3' },
        amount_total: 1900,
        currency: 'krw',
        payment_status: 'unpaid',
        payment_intent: null,
      })
      mockConstructEvent.mockReturnValue(event)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-b3',
        name: 'B3',
        email: 'b3@example.com',
      } as any)

      const response = await POST(makeWebhookRequest('body'))
      const data = await response.json()

      // Success response (Stripe should not retry — the event itself is fine)
      expect(response.status).toBe(200)
      expect(data.received).toBe(true)
      // CRITICAL: no credit grant
      expect(vi.mocked(addBonusCredits)).not.toHaveBeenCalled()
      // Skip metric emitted for observability
      expect(vi.mocked(recordCounter)).toHaveBeenCalledWith(
        'stripe_webhook_unpaid_checkout_skipped',
        1,
        expect.objectContaining({ pack: 'mini', status: 'unpaid' })
      )
      // Pending revocation is NOT queried (we exit before that)
      expect(vi.mocked(prisma.pendingCreditRevocation.findUnique)).not.toHaveBeenCalled()
    })

    it('B3: skips addBonusCredits when payment_intent is null even if payment_status is "paid"', async () => {
      // Defense-in-depth: if Stripe ever delivers payment_status="paid" but
      // no payment_intent (shouldn't happen, but is possible for certain
      // session types), we still bail because we'd write stripePaymentId=null
      // and lose dedup.
      const event = makeEvent('checkout.session.completed', {
        id: 'cs_b3_no_pi',
        metadata: { type: 'credit_pack', creditPack: 'mini', userId: 'user-b3b' },
        amount_total: 1900,
        currency: 'krw',
        payment_status: 'paid',
        payment_intent: null,
      })
      mockConstructEvent.mockReturnValue(event)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-b3b',
        name: 'B3b',
        email: 'b3b@example.com',
      } as any)

      const response = await POST(makeWebhookRequest('body'))
      expect(response.status).toBe(200)
      expect(vi.mocked(addBonusCredits)).not.toHaveBeenCalled()
    })
  })
})
