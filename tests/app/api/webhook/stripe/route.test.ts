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
}))

// Mock email service
vi.mock('@/lib/email', () => ({
  sendPaymentReceiptEmail: vi.fn().mockResolvedValue(undefined),
}))

// ---------------------------------------------------------------------------
// Import route handler and mocked modules AFTER all vi.mock calls
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/webhook/stripe/route'
import { prisma } from '@/lib/db/prisma'
import { addBonusCredits } from '@/lib/credits/creditService'
import { sendPaymentReceiptEmail } from '@/lib/email'
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
    const creditPackEvent = (id: string) =>
      makeEvent('checkout.session.completed', {
        id,
        metadata: { type: 'credit_pack', creditPack: 'standard', userId: 'user-1' },
        amount_total: 9900,
        currency: 'krw',
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
})
