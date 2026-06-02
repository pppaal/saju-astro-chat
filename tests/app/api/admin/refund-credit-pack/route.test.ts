/**
 * Tests for Admin Refund Credit Pack API
 * POST /api/admin/refund-credit-pack — refund a Stripe credit-pack purchase
 * (minus fees) and revoke the granted bonus credits.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 19,
    reset: Date.now() + 60000,
    limit: 20,
    headers: new Headers(),
  }),
}))
vi.mock('@/lib/request-ip', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))
vi.mock('@/lib/telemetry', () => ({ captureServerError: vi.fn() }))
vi.mock('@/lib/metrics', () => ({ recordCounter: vi.fn(), recordTiming: vi.fn() }))
vi.mock('@/lib/auth/publicToken', () => ({ requirePublicToken: vi.fn(() => ({ valid: true })) }))
vi.mock('@/lib/security/csrf', () => ({ csrfGuard: vi.fn(() => null) }))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    bonusCreditPurchase: { findFirst: vi.fn() },
    userCredits: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/auth/adminAudit', () => ({ logAdminAction: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/credits/creditService', () => ({ revokeBonusCreditPurchase: vi.fn() }))
vi.mock('@/lib/stripe/client', () => ({ getStripeOrNull: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/admin/refund-credit-pack/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'
import { logAdminAction } from '@/lib/auth/adminAudit'
import { revokeBonusCreditPurchase } from '@/lib/credits/creditService'
import { getStripeOrNull } from '@/lib/stripe/client'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/refund-credit-pack', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  })
}

let stripeMock: {
  paymentIntents: { retrieve: ReturnType<typeof vi.fn> }
  refunds: { create: ReturnType<typeof vi.fn> }
}

function setupHappyPath(overrides?: { used?: number; ageDays?: number }) {
  const { used = 0, ageDays = 1 } = overrides ?? {}
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)

  vi.mocked(prisma.bonusCreditPurchase.findFirst).mockResolvedValue({
    id: 'purchase-1',
    userId: 'user-1',
    amount: 100,
    remaining: 100 - used,
    expired: false,
    createdAt: new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000),
  } as any)

  vi.mocked(prisma.userCredits.findUnique).mockResolvedValue({ userId: 'user-1' } as any)

  stripeMock = {
    paymentIntents: {
      retrieve: vi.fn().mockResolvedValue({
        latest_charge: {
          balance_transaction: { amount: 10000, fee: 350, object: 'balance_transaction' },
        },
        amount_received: 10000,
      }),
    },
    refunds: { create: vi.fn().mockResolvedValue({ id: 're_test_123' }) },
  }
  vi.mocked(getStripeOrNull).mockReturnValue(stripeMock as any)

  vi.mocked(revokeBonusCreditPurchase).mockResolvedValue({
    reclaimed: 100,
    alreadyUsed: 0,
  } as any)
}

describe('POST /api/admin/refund-credit-pack', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  describe('Authentication & Authorization', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      const res = await POST(makeRequest({ stripePaymentId: 'pi_1' }))
      expect(res.status).toBe(401)
    })

    it('rejects non-admin users', async () => {
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(false)
      const res = await POST(makeRequest({ stripePaymentId: 'pi_1' }))
      expect(res.status).toBe(403)
    })
  })

  describe('Input validation & preconditions', () => {
    beforeEach(() => setupHappyPath())

    it('requires stripePaymentId', async () => {
      const res = await POST(makeRequest({}))
      expect(res.status).toBe(422)
      expect((await res.json()).error.message).toContain('stripePaymentId')
    })

    it('returns 500 when Stripe is not configured', async () => {
      vi.mocked(getStripeOrNull).mockReturnValue(null)
      const res = await POST(makeRequest({ stripePaymentId: 'pi_1' }))
      expect(res.status).toBe(500)
      expect((await res.json()).error.message).toBe('stripe_not_configured')
    })

    it('returns 404 when the purchase is not found', async () => {
      vi.mocked(prisma.bonusCreditPurchase.findFirst).mockResolvedValue(null)
      const res = await POST(makeRequest({ stripePaymentId: 'pi_missing' }))
      expect(res.status).toBe(404)
      expect((await res.json()).error.message).toBe('purchase_not_found')
    })

    it('returns 400 when the purchase is already refunded (expired)', async () => {
      vi.mocked(prisma.bonusCreditPurchase.findFirst).mockResolvedValue({
        id: 'p',
        userId: 'user-1',
        amount: 100,
        remaining: 100,
        expired: true,
        createdAt: new Date(),
      } as any)
      const res = await POST(makeRequest({ stripePaymentId: 'pi_1' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error.message).toBe('already_refunded')
    })

    it('returns 400 when the user credits row is missing (deleted user)', async () => {
      vi.mocked(prisma.userCredits.findUnique).mockResolvedValue(null)
      const res = await POST(makeRequest({ stripePaymentId: 'pi_1' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error.message).toContain('user_credits_missing')
    })

    it('returns 400 for a partially used pack without force', async () => {
      setupHappyPath({ used: 20 })
      const res = await POST(makeRequest({ stripePaymentId: 'pi_1' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error.message).toContain('partially_used')
    })

    it('returns 400 when outside the refund window without force', async () => {
      setupHappyPath({ ageDays: 30 })
      const res = await POST(makeRequest({ stripePaymentId: 'pi_1' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error.message).toBe('refund_window_expired')
    })

    it('bypasses eligibility checks when force=true', async () => {
      setupHappyPath({ used: 50, ageDays: 90 })
      const res = await POST(makeRequest({ stripePaymentId: 'pi_1', force: true }))
      expect(res.status).toBe(200)
    })
  })

  describe('Refund execution', () => {
    beforeEach(() => setupHappyPath())

    it('refunds amount minus fee from the balance transaction and revokes credits', async () => {
      const res = await POST(makeRequest({ stripePaymentId: 'pi_1' }))
      const data = (await res.json()).data

      expect(res.status).toBe(200)
      // originalAmount 10000 - fee 350 = 9650
      expect(data).toMatchObject({
        success: true,
        refundedKrw: 9650,
        feeWithheld: 350,
        originalAmount: 10000,
        stripeRefundId: 're_test_123',
        creditsRevoked: 100,
        feeSource: 'balance_transaction',
      })
      expect(stripeMock.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_intent: 'pi_1', amount: 9650 }),
        expect.objectContaining({ idempotencyKey: 'refund_pack_purchase-1' })
      )
      expect(revokeBonusCreditPurchase).toHaveBeenCalledWith('pi_1')
    })

    it('falls back to the fee formula when no balance transaction is present', async () => {
      stripeMock.paymentIntents.retrieve.mockResolvedValue({
        latest_charge: { balance_transaction: null },
        amount_received: 10000,
      })
      const res = await POST(makeRequest({ stripePaymentId: 'pi_1' }))
      const data = (await res.json()).data
      expect(res.status).toBe(200)
      expect(data.feeSource).toBe('formula')
      // formula fee = round(10000 * 3.5%) + 300 = 350 + 300 = 650 → refund 9350
      expect(data.feeWithheld).toBe(650)
      expect(data.refundedKrw).toBe(9350)
    })

    it('returns 500 when the Stripe lookup fails', async () => {
      stripeMock.paymentIntents.retrieve.mockRejectedValue(new Error('stripe down'))
      const res = await POST(makeRequest({ stripePaymentId: 'pi_1' }))
      expect(res.status).toBe(500)
      expect((await res.json()).error.message).toBe('stripe_lookup_failed')
      expect(revokeBonusCreditPurchase).not.toHaveBeenCalled()
    })

    it('returns 500 when the Stripe refund creation fails', async () => {
      stripeMock.refunds.create.mockRejectedValue(new Error('refund failed'))
      const res = await POST(makeRequest({ stripePaymentId: 'pi_1' }))
      expect(res.status).toBe(500)
      expect((await res.json()).error.message).toBe('stripe_refund_failed')
      expect(revokeBonusCreditPurchase).not.toHaveBeenCalled()
    })

    it('writes a successful audit log entry', async () => {
      await POST(makeRequest({ stripePaymentId: 'pi_1' }))
      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'refund_credit_pack', success: true })
      )
    })
  })
})
