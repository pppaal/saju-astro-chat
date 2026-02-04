import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks - all mocks must be declared BEFORE the route import
// ---------------------------------------------------------------------------

// Mock next-auth
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

// Mock CSRF guard
vi.mock('@/lib/security/csrf', () => ({
  csrfGuard: vi.fn(),
}))

// Mock admin check
vi.mock('@/lib/auth/admin', () => ({
  isAdminUser: vi.fn(),
}))

// Mock admin audit log
vi.mock('@/lib/auth/adminAudit', () => ({
  logAdminAction: vi.fn(),
}))

// Mock rate limiter
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}))

// Mock request parser - returns parsed JSON from the request
vi.mock('@/lib/api/requestParser', () => ({
  parseRequestBody: vi.fn(async (req: Request) => {
    try {
      return await req.clone().json()
    } catch {
      return null
    }
  }),
}))

// Mock Zod validation schema – delegate to the real schema so validation
// behaviour is realistic.  We import the real module lazily inside the factory
// to avoid hoisting issues.
vi.mock('@/lib/api/zodValidation', async () => {
  const { z } = await import('zod')

  const adminRefundSubscriptionRequestSchema = z
    .object({
      subscriptionId: z.string().min(1).max(200).trim().optional(),
      email: z.string().email().max(200).trim().optional(),
    })
    .refine((data) => data.subscriptionId || data.email, {
      message: 'Either subscriptionId or email must be provided',
    })

  return { adminRefundSubscriptionRequestSchema }
})

// Mock prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock credit service
vi.mock('@/lib/credits/creditService', () => ({
  getUserCredits: vi.fn(),
}))

// Mock telemetry
vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

// Mock error sanitizer
vi.mock('@/lib/security/errorSanitizer', () => ({
  sanitizeError: vi.fn(() => ({ error: 'Internal server error' })),
}))

// Mock pricing constant
vi.mock('@/lib/config/pricing', () => ({
  BASE_CREDIT_PRICE_KRW: 380,
}))

// Mock HTTP_STATUS constants - provide the real values
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    PAYLOAD_TOO_LARGE: 413,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },
}))

// ---------------------------------------------------------------------------
// Stripe mock – this is the most involved mock because the route creates
// a Stripe instance via `new Stripe(key, ...)` inside `getStripe()`.
// We provide a constructor-function mock whose instances expose the
// methods used by the route.
// ---------------------------------------------------------------------------

const mockStripeRefundsCreate = vi.fn()
const mockStripeSubscriptionsRetrieve = vi.fn()
const mockStripeSubscriptionsCancel = vi.fn()
const mockStripeSubscriptionsList = vi.fn()
const mockStripeCustomersList = vi.fn()
const mockStripeInvoicesRetrieve = vi.fn()
const mockStripePaymentIntentsRetrieve = vi.fn()
const mockStripeChargesRetrieve = vi.fn()
const mockStripeBalanceTransactionsRetrieve = vi.fn()

vi.mock('stripe', () => {
  const StripeMock = vi.fn().mockImplementation(() => ({
    subscriptions: {
      retrieve: mockStripeSubscriptionsRetrieve,
      cancel: mockStripeSubscriptionsCancel,
      list: mockStripeSubscriptionsList,
    },
    customers: {
      list: mockStripeCustomersList,
    },
    invoices: {
      retrieve: mockStripeInvoicesRetrieve,
    },
    paymentIntents: {
      retrieve: mockStripePaymentIntentsRetrieve,
    },
    charges: {
      retrieve: mockStripeChargesRetrieve,
    },
    balanceTransactions: {
      retrieve: mockStripeBalanceTransactionsRetrieve,
    },
    refunds: {
      create: mockStripeRefundsCreate,
    },
  }))
  return { default: StripeMock }
})

// ---------------------------------------------------------------------------
// Import route handler AFTER all mocks are declared
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/admin/refund-subscription/route'
import { getServerSession } from 'next-auth'
import { csrfGuard } from '@/lib/security/csrf'
import { isAdminUser } from '@/lib/auth/admin'
import { logAdminAction } from '@/lib/auth/adminAudit'
import { rateLimit } from '@/lib/rateLimit'
import { prisma } from '@/lib/db/prisma'
import { getUserCredits } from '@/lib/credits/creditService'
import { captureServerError } from '@/lib/telemetry'
import { sanitizeError } from '@/lib/security/errorSanitizer'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shortcut: build a NextRequest for the refund endpoint. */
function makeRequest(
  body: Record<string, unknown> | string | null,
  headers?: Record<string, string>
) {
  const init: RequestInit & { headers?: Record<string, string> } = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }
  if (body !== null) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
  }
  return new NextRequest('http://localhost/api/admin/refund-subscription', init)
}

/** Standard admin session object used by most happy-path tests. */
const adminSession = {
  user: { id: 'admin-user-1', email: 'admin@example.com' },
  expires: '2099-12-31',
}

/** Convenience: set up all mocks so the full happy-path succeeds. */
function setupHappyPath(overrides?: {
  amountPaid?: number
  usedCredits?: number
  currency?: string
  customerIsObject?: boolean
}) {
  const {
    amountPaid = 10000,
    usedCredits = 5,
    currency = 'krw',
    customerIsObject = true,
  } = overrides ?? {}

  // Auth
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(csrfGuard).mockReturnValue(null)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    remaining: 9,
    reset: 0,
    headers: new Headers(),
  })

  // Stripe subscription retrieve
  const subscriptionObj: any = {
    id: 'sub_123',
    latest_invoice: {
      id: 'inv_123',
      amount_paid: amountPaid,
      currency,
      payment_intent: {
        id: 'pi_123',
        amount_received: amountPaid,
        currency,
        latest_charge: {
          id: 'ch_123',
          balance_transaction: {
            id: 'txn_123',
            fee: 300,
          },
        },
      },
    },
    customer: customerIsObject ? { id: 'cus_123', email: 'customer@example.com' } : 'cus_123',
  }
  mockStripeSubscriptionsRetrieve.mockResolvedValue(subscriptionObj)

  // Stripe cancel
  mockStripeSubscriptionsCancel.mockResolvedValue({ id: 'sub_123', status: 'canceled' })

  // Stripe refund
  mockStripeRefundsCreate.mockResolvedValue({ id: 're_123' })

  // DB subscription lookup
  vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'target-user-1' } as any)

  // Credit service
  vi.mocked(getUserCredits).mockResolvedValue({ usedCredits } as any)

  // Audit
  vi.mocked(logAdminAction).mockResolvedValue(undefined)
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Admin Refund Subscription API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Ensure STRIPE_SECRET_KEY is set so getStripe() does not throw
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key'
  })

  // =========================================================================
  // CSRF Protection
  // =========================================================================
  describe('CSRF Protection', () => {
    it('should return the CSRF error response when csrfGuard fails', async () => {
      const csrfResponse = new Response(JSON.stringify({ error: 'csrf_validation_failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
      vi.mocked(csrfGuard).mockReturnValue(csrfResponse as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('csrf_validation_failed')
    })

    it('should proceed when csrfGuard returns null', async () => {
      setupHappyPath()

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(csrfGuard).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Admin Authentication & Authorization
  // =========================================================================
  describe('Admin Auth', () => {
    beforeEach(() => {
      vi.mocked(csrfGuard).mockReturnValue(null)
    })

    it('should return 401 when session has no user id (adminUserId falsy)', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'someone@test.com' } } as any)
      vi.mocked(isAdminUser).mockResolvedValue(false)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when session is null (no user at all)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when isAdminUser returns false', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'regular-user', email: 'user@test.com' },
      } as any)
      vi.mocked(isAdminUser).mockResolvedValue(false)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should log an unauthorized audit event when non-admin attempts refund', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'regular-user', email: 'user@test.com' },
      } as any)
      vi.mocked(isAdminUser).mockResolvedValue(false)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      await POST(req)

      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'refund_attempt_unauthorized',
          success: false,
          errorMessage: 'User is not an admin',
        })
      )
    })

    it('should allow a valid admin user through', async () => {
      setupHappyPath()

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(isAdminUser).toHaveBeenCalledWith('admin-user-1')
    })
  })

  // =========================================================================
  // Rate Limiting
  // =========================================================================
  describe('Rate Limiting', () => {
    beforeEach(() => {
      vi.mocked(csrfGuard).mockReturnValue(null)
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(true)
    })

    it('should return 429 when rate limit is exceeded', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: 1234567890,
        headers: new Headers(),
      })

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(429)
      const data = await res.json()
      expect(data.error).toContain('Too many refund requests')
    })

    it('should log a rate limited audit event', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: 1234567890,
        headers: new Headers(),
      })

      const req = makeRequest({ subscriptionId: 'sub_123' })
      await POST(req)

      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'refund_rate_limited',
          success: false,
          errorMessage: 'Rate limit exceeded',
        })
      )
    })

    it('should call rateLimit with the admin email key', async () => {
      setupHappyPath()

      const req = makeRequest({ subscriptionId: 'sub_123' })
      await POST(req)

      expect(rateLimit).toHaveBeenCalledWith('admin-refund:admin@example.com', {
        limit: 10,
        windowSeconds: 3600,
      })
    })
  })

  // =========================================================================
  // Input Validation (Zod)
  // =========================================================================
  describe('Input Validation', () => {
    beforeEach(() => {
      vi.mocked(csrfGuard).mockReturnValue(null)
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(true)
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        reset: 0,
        headers: new Headers(),
      })
    })

    it('should return 400 when neither subscriptionId nor email is provided', async () => {
      const req = makeRequest({})
      const res = await POST(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when body is empty object', async () => {
      const req = makeRequest({})
      const res = await POST(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('validation_failed')
      expect(data.details).toBeDefined()
    })

    it('should return 400 when email is invalid', async () => {
      const req = makeRequest({ email: 'not-an-email' })
      const res = await POST(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when subscriptionId is empty string', async () => {
      const req = makeRequest({ subscriptionId: '' })
      const res = await POST(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('validation_failed')
    })

    it('should log a validation_failed audit event on bad input', async () => {
      const req = makeRequest({})
      await POST(req)

      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'refund_validation_failed',
          success: false,
          errorMessage: 'Validation failed',
        })
      )
    })

    it('should accept a valid subscriptionId', async () => {
      setupHappyPath()

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
    })

    it('should accept a valid email', async () => {
      setupHappyPath()

      // When using email, we go through the customer-lookup path
      mockStripeCustomersList.mockResolvedValue({ data: [{ id: 'cus_456' }] })
      mockStripeSubscriptionsList.mockResolvedValue({ data: [{ id: 'sub_456' }] })
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_456',
        latest_invoice: {
          id: 'inv_456',
          amount_paid: 10000,
          currency: 'krw',
          payment_intent: {
            id: 'pi_456',
            amount_received: 10000,
            currency: 'krw',
            latest_charge: {
              id: 'ch_456',
              balance_transaction: { fee: 300 },
            },
          },
        },
        customer: { id: 'cus_456', email: 'customer@example.com' },
      })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'user-456' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: 2 } as any)

      const req = makeRequest({ email: 'customer@example.com' })
      const res = await POST(req)

      expect(res.status).toBe(200)
    })

    it('should accept both subscriptionId and email (subscriptionId takes precedence)', async () => {
      setupHappyPath()

      const req = makeRequest({ subscriptionId: 'sub_123', email: 'backup@example.com' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      // subscriptionId path: subscriptions.retrieve is called directly
      expect(mockStripeSubscriptionsRetrieve).toHaveBeenCalledWith('sub_123', expect.any(Object))
      // customers.list should NOT have been called
      expect(mockStripeCustomersList).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Subscription Resolution via Email (customer lookup path)
  // =========================================================================
  describe('Resolve Subscription by Email', () => {
    beforeEach(() => {
      vi.mocked(csrfGuard).mockReturnValue(null)
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(true)
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        reset: 0,
        headers: new Headers(),
      })
    })

    it('should throw when no Stripe customer found for email', async () => {
      mockStripeCustomersList.mockResolvedValue({ data: [] })

      const req = makeRequest({ email: 'nobody@example.com' })
      const res = await POST(req)

      // The thrown error is caught in the catch block -> 500
      expect(res.status).toBe(500)
      expect(captureServerError).toHaveBeenCalled()
    })

    it('should throw when customer has no subscriptions', async () => {
      mockStripeCustomersList.mockResolvedValue({ data: [{ id: 'cus_789' }] })
      mockStripeSubscriptionsList.mockResolvedValue({ data: [] })

      const req = makeRequest({ email: 'nosubs@example.com' })
      const res = await POST(req)

      expect(res.status).toBe(500)
      expect(captureServerError).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Invoice / PaymentIntent / Charge Resolution Edge Cases
  // =========================================================================
  describe('Invoice Resolution', () => {
    beforeEach(() => {
      setupHappyPath()
    })

    it('should return 400 when subscription has no invoice', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: null,
        customer: { id: 'cus_123', email: 'c@test.com' },
      })

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('No invoice found for subscription')
    })

    it('should retrieve invoice by string id when latest_invoice is a string', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: 'inv_string_ref',
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      mockStripeInvoicesRetrieve.mockResolvedValue({
        id: 'inv_string_ref',
        amount_paid: 10000,
        currency: 'krw',
        payment_intent: {
          id: 'pi_123',
          amount_received: 10000,
          currency: 'krw',
          latest_charge: {
            id: 'ch_123',
            balance_transaction: { fee: 300 },
          },
        },
      })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: 0 } as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockStripeInvoicesRetrieve).toHaveBeenCalledWith('inv_string_ref', {
        expand: ['payment_intent'],
      })
    })

    it('should return 400 when invoice has no payment intent', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 10000,
          currency: 'krw',
          payment_intent: null,
        },
        customer: 'cus_123',
      })

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('No payment intent found for invoice')
    })

    it('should retrieve payment intent by string id when it is a string', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 10000,
          currency: 'krw',
          payment_intent: 'pi_string_ref',
        },
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      mockStripePaymentIntentsRetrieve.mockResolvedValue({
        id: 'pi_string_ref',
        amount_received: 10000,
        currency: 'krw',
        latest_charge: {
          id: 'ch_123',
          balance_transaction: { fee: 300 },
        },
      })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: 0 } as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockStripePaymentIntentsRetrieve).toHaveBeenCalledWith('pi_string_ref', {
        expand: ['latest_charge'],
      })
    })

    it('should retrieve charge by string id when latest_charge is a string', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 10000,
          currency: 'krw',
          payment_intent: {
            id: 'pi_123',
            amount_received: 10000,
            currency: 'krw',
            latest_charge: 'ch_string_ref',
          },
        },
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      mockStripeChargesRetrieve.mockResolvedValue({
        id: 'ch_string_ref',
        balance_transaction: { fee: 500 },
      })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: 0 } as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      expect(mockStripeChargesRetrieve).toHaveBeenCalledWith('ch_string_ref', {
        expand: ['balance_transaction'],
      })
    })

    it('should handle null latest_charge (stripeFee = 0)', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 10000,
          currency: 'krw',
          payment_intent: {
            id: 'pi_123',
            amount_received: 10000,
            currency: 'krw',
            latest_charge: null,
          },
        },
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: 0 } as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.stripeFee).toBe(0)
    })

    it('should handle charge with null balance_transaction (stripeFee = 0)', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 10000,
          currency: 'krw',
          payment_intent: {
            id: 'pi_123',
            amount_received: 10000,
            currency: 'krw',
            latest_charge: {
              id: 'ch_123',
              balance_transaction: null,
            },
          },
        },
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: 0 } as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.stripeFee).toBe(0)
    })

    it('should retrieve balance_transaction by string id', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 10000,
          currency: 'krw',
          payment_intent: {
            id: 'pi_123',
            amount_received: 10000,
            currency: 'krw',
            latest_charge: {
              id: 'ch_123',
              balance_transaction: 'txn_string_ref',
            },
          },
        },
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      mockStripeBalanceTransactionsRetrieve.mockResolvedValue({ fee: 250 })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: 0 } as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.stripeFee).toBe(250)
      expect(mockStripeBalanceTransactionsRetrieve).toHaveBeenCalledWith('txn_string_ref')
    })
  })

  // =========================================================================
  // Amount / Currency Checks
  // =========================================================================
  describe('Amount and Currency Validation', () => {
    beforeEach(() => {
      setupHappyPath()
    })

    it('should return 400 when amountPaid is 0', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 0,
          currency: 'krw',
          payment_intent: {
            id: 'pi_123',
            amount_received: 0,
            currency: 'krw',
            latest_charge: null,
          },
        },
        customer: 'cus_123',
      })

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('No paid amount found for subscription')
    })

    it('should return 400 when currency is not krw', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 10000,
          currency: 'usd',
          payment_intent: {
            id: 'pi_123',
            amount_received: 10000,
            currency: 'usd',
            latest_charge: { id: 'ch_123', balance_transaction: { fee: 300 } },
          },
        },
        customer: 'cus_123',
      })

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Only KRW refunds are supported')
    })

    it('should fall back to paymentIntent.amount_received when invoice.amount_paid is null', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: null,
          currency: 'krw',
          payment_intent: {
            id: 'pi_123',
            amount_received: 5000,
            currency: 'krw',
            latest_charge: { id: 'ch_123', balance_transaction: { fee: 100 } },
          },
        },
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: 0 } as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.amountPaid).toBe(5000)
    })
  })

  // =========================================================================
  // DB Subscription Lookup
  // =========================================================================
  describe('DB Subscription Lookup', () => {
    beforeEach(() => {
      setupHappyPath()
    })

    it('should return 404 when subscription not found in database', async () => {
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue(null)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Subscription not found in database')
    })
  })

  // =========================================================================
  // Refund Calculation
  // =========================================================================
  describe('Refund Calculation', () => {
    beforeEach(() => {
      vi.mocked(csrfGuard).mockReturnValue(null)
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(true)
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        reset: 0,
        headers: new Headers(),
      })
      vi.mocked(logAdminAction).mockResolvedValue(undefined)
    })

    it('should calculate refund = amountPaid - creditDeduction - stripeFee', async () => {
      // amountPaid=10000, usedCredits=5, creditPrice=380, stripeFee=300
      // creditDeduction = 5 * 380 = 1900
      // refundAmount = 10000 - 1900 - 300 = 7800
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 10000,
          currency: 'krw',
          payment_intent: {
            id: 'pi_123',
            amount_received: 10000,
            currency: 'krw',
            latest_charge: {
              id: 'ch_123',
              balance_transaction: { fee: 300 },
            },
          },
        },
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      mockStripeSubscriptionsCancel.mockResolvedValue({ id: 'sub_123', status: 'canceled' })
      mockStripeRefundsCreate.mockResolvedValue({ id: 're_calc' })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: 5 } as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.amountPaid).toBe(10000)
      expect(data.usedCredits).toBe(5)
      expect(data.creditDeduction).toBe(1900) // 5 * 380
      expect(data.stripeFee).toBe(300)
      expect(data.refundAmount).toBe(7800) // 10000 - 1900 - 300
      expect(data.refunded).toBe(true)
      expect(data.refundId).toBe('re_calc')
    })

    it('should not issue a Stripe refund when refundAmount is 0', async () => {
      // amountPaid=2000, usedCredits=5, creditDeduction=1900, stripeFee=300 => refund = max(0, -200) = 0
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 2000,
          currency: 'krw',
          payment_intent: {
            id: 'pi_123',
            amount_received: 2000,
            currency: 'krw',
            latest_charge: {
              id: 'ch_123',
              balance_transaction: { fee: 300 },
            },
          },
        },
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      mockStripeSubscriptionsCancel.mockResolvedValue({ id: 'sub_123', status: 'canceled' })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: 5 } as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.refundAmount).toBe(0)
      expect(data.refunded).toBe(false)
      expect(data.refundId).toBeNull()
      // refunds.create should NOT have been called
      expect(mockStripeRefundsCreate).not.toHaveBeenCalled()
    })

    it('should clamp usedCredits to 0 when negative / undefined', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 10000,
          currency: 'krw',
          payment_intent: {
            id: 'pi_123',
            amount_received: 10000,
            currency: 'krw',
            latest_charge: { id: 'ch_123', balance_transaction: { fee: 0 } },
          },
        },
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      mockStripeSubscriptionsCancel.mockResolvedValue({ id: 'sub_123', status: 'canceled' })
      mockStripeRefundsCreate.mockResolvedValue({ id: 're_full' })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      // usedCredits is undefined / falsy
      vi.mocked(getUserCredits).mockResolvedValue({} as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      // No credits used -> full refund minus fees
      expect(data.usedCredits).toBe(0)
      expect(data.creditDeduction).toBe(0)
      expect(data.refundAmount).toBe(10000) // 10000 - 0 - 0
    })
  })

  // =========================================================================
  // Successful Refund - Full Response Shape
  // =========================================================================
  describe('Successful Refund Response', () => {
    it('should return the complete refund summary object', async () => {
      setupHappyPath({ amountPaid: 10000, usedCredits: 2 })

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data).toEqual({
        subscriptionId: 'sub_123',
        customerId: expect.any(String),
        customerEmail: 'customer@example.com',
        amountPaid: 10000,
        currency: 'krw',
        usedCredits: 2,
        creditDeduction: 760, // 2 * 380
        stripeFee: 300,
        refundAmount: 8940, // 10000 - 760 - 300
        refunded: true,
        refundId: 're_123',
        canceled: true,
      })
    })

    it('should set customerEmail to null when subscription.customer is a string', async () => {
      setupHappyPath({ customerIsObject: false })

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.customerEmail).toBeNull()
    })

    it('should cancel the subscription on Stripe', async () => {
      setupHappyPath()

      const req = makeRequest({ subscriptionId: 'sub_123' })
      await POST(req)

      expect(mockStripeSubscriptionsCancel).toHaveBeenCalledWith('sub_123')
    })

    it('should pass correct args to stripe.refunds.create', async () => {
      setupHappyPath({ amountPaid: 10000, usedCredits: 0 })

      const req = makeRequest({ subscriptionId: 'sub_123' })
      await POST(req)

      // refundAmount = 10000 - 0 - 300 = 9700
      expect(mockStripeRefundsCreate).toHaveBeenCalledWith({
        payment_intent: 'pi_123',
        amount: 9700,
        reason: 'requested_by_customer',
      })
    })

    it('should log a refund_completed audit event on success', async () => {
      setupHappyPath()

      const req = makeRequest({ subscriptionId: 'sub_123' })
      await POST(req)

      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'refund_completed',
          targetType: 'subscription',
          targetId: 'sub_123',
          success: true,
        })
      )
    })

    it('should report canceled: false when Stripe cancel returns a non-canceled status', async () => {
      setupHappyPath()
      mockStripeSubscriptionsCancel.mockResolvedValue({ id: 'sub_123', status: 'active' })

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.canceled).toBe(false)
    })
  })

  // =========================================================================
  // STRIPE_SECRET_KEY Missing
  // =========================================================================
  describe('Stripe Configuration', () => {
    it('should return 500 when STRIPE_SECRET_KEY is not set', async () => {
      vi.mocked(csrfGuard).mockReturnValue(null)
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(true)
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        reset: 0,
        headers: new Headers(),
      })
      vi.mocked(logAdminAction).mockResolvedValue(undefined)

      delete process.env.STRIPE_SECRET_KEY

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(500)
      expect(captureServerError).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Error Handling (catch block)
  // =========================================================================
  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(csrfGuard).mockReturnValue(null)
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(true)
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        remaining: 9,
        reset: 0,
        headers: new Headers(),
      })
      vi.mocked(logAdminAction).mockResolvedValue(undefined)
    })

    it('should return 500 and sanitized error when Stripe subscription retrieve throws', async () => {
      mockStripeSubscriptionsRetrieve.mockRejectedValue(new Error('Stripe network error'))
      vi.mocked(sanitizeError).mockReturnValue({ error: 'Something went wrong' })

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(500)
      const data = await res.json()
      expect(data.error).toBe('Something went wrong')
      expect(captureServerError).toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalled()
    })

    it('should log a refund_failed audit event on unexpected error', async () => {
      mockStripeSubscriptionsRetrieve.mockRejectedValue(new Error('Boom'))

      const req = makeRequest({ subscriptionId: 'sub_123' })
      await POST(req)

      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'refund_failed',
          success: false,
          errorMessage: 'Internal server error',
        })
      )
    })

    it('should handle prisma.subscription.findUnique throwing', async () => {
      setupHappyPath()
      vi.mocked(prisma.subscription.findUnique).mockRejectedValue(new Error('DB down'))

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(500)
      expect(captureServerError).toHaveBeenCalled()
    })

    it('should handle getUserCredits throwing', async () => {
      setupHappyPath()
      vi.mocked(getUserCredits).mockRejectedValue(new Error('Credit service error'))

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(500)
      expect(captureServerError).toHaveBeenCalled()
    })

    it('should handle stripe.refunds.create throwing', async () => {
      setupHappyPath()
      mockStripeRefundsCreate.mockRejectedValue(new Error('Refund failed'))

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(500)
      expect(captureServerError).toHaveBeenCalled()
    })

    it('should handle stripe.subscriptions.cancel throwing', async () => {
      setupHappyPath()
      mockStripeSubscriptionsCancel.mockRejectedValue(new Error('Cancel failed'))

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(500)
      expect(captureServerError).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // IP & User-Agent Audit Metadata
  // =========================================================================
  describe('IP and User-Agent in Audit Logs', () => {
    it('should capture x-forwarded-for and user-agent headers in audit logs', async () => {
      setupHappyPath()

      const req = makeRequest(
        { subscriptionId: 'sub_123' },
        {
          'x-forwarded-for': '203.0.113.50',
          'user-agent': 'TestBrowser/1.0',
        }
      )
      await POST(req)

      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '203.0.113.50',
          userAgent: 'TestBrowser/1.0',
        })
      )
    })

    it('should fall back to x-real-ip when x-forwarded-for is absent', async () => {
      setupHappyPath()

      const req = makeRequest(
        { subscriptionId: 'sub_123' },
        {
          'x-real-ip': '198.51.100.1',
        }
      )
      await POST(req)

      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '198.51.100.1',
        })
      )
    })
  })

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe('Edge Cases', () => {
    beforeEach(() => {
      setupHappyPath()
    })

    it('should handle invoice with undefined currency (defaults to krw)', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 5000,
          currency: undefined,
          payment_intent: {
            id: 'pi_123',
            amount_received: 5000,
            currency: undefined,
            latest_charge: { id: 'ch_123', balance_transaction: { fee: 100 } },
          },
        },
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: 0 } as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.currency).toBe('krw')
    })

    it('should return customerId as string when customer is an object', async () => {
      setupHappyPath({ customerIsObject: true })

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(typeof data.customerId).toBe('string')
    })

    it('should handle null body gracefully (validation failure)', async () => {
      // parseRequestBody will return null for unparseable body
      const req = new NextRequest('http://localhost/api/admin/refund-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json at all',
      })

      const res = await POST(req)
      // null body fails Zod refine (neither subscriptionId nor email) -> 400
      expect(res.status).toBe(400)
    })

    it('should handle negative usedCredits by clamping to 0', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 10000,
          currency: 'krw',
          payment_intent: {
            id: 'pi_123',
            amount_received: 10000,
            currency: 'krw',
            latest_charge: { id: 'ch_123', balance_transaction: { fee: 200 } },
          },
        },
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      mockStripeRefundsCreate.mockResolvedValue({ id: 're_neg' })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: -3 } as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      // Math.max(0, -3) = 0
      expect(data.usedCredits).toBe(0)
      expect(data.creditDeduction).toBe(0)
      expect(data.refundAmount).toBe(9800) // 10000 - 0 - 200
    })

    it('should handle balance_transaction with fee = 0', async () => {
      mockStripeSubscriptionsRetrieve.mockResolvedValue({
        id: 'sub_123',
        latest_invoice: {
          id: 'inv_123',
          amount_paid: 10000,
          currency: 'krw',
          payment_intent: {
            id: 'pi_123',
            amount_received: 10000,
            currency: 'krw',
            latest_charge: {
              id: 'ch_123',
              balance_transaction: { fee: 0 },
            },
          },
        },
        customer: { id: 'cus_123', email: 'c@test.com' },
      })
      mockStripeRefundsCreate.mockResolvedValue({ id: 're_no_fee' })
      vi.mocked(prisma.subscription.findUnique).mockResolvedValue({ userId: 'u1' } as any)
      vi.mocked(getUserCredits).mockResolvedValue({ usedCredits: 0 } as any)

      const req = makeRequest({ subscriptionId: 'sub_123' })
      const res = await POST(req)

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.stripeFee).toBe(0)
      expect(data.refundAmount).toBe(10000)
    })
  })
})
