/**
 * Additional branch-coverage tests for Admin Stripe Purchase Reconcile API
 * POST /api/admin/reconcile-purchase.
 *
 * Complements tests/app/api/admin/reconcile-purchase/route.test.ts (which covers
 * auth + the happy paths). Here we exercise the resolveSessions ID-prefix
 * branches (cs_/pi_/ch_/email) and the remaining reconcileSession statuses
 * (not_credit_pack / unpaid / bad_metadata / user_missing / grant_failed / P2002)
 * plus the stripe_lookup_failed and outer error paths.
 *
 * Everything is mocked — no DB / Stripe / network.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({ getServerSession: vi.fn() }))
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
    user: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/auth/adminAudit', () => ({ logAdminAction: vi.fn() }))
vi.mock('@/lib/credits/creditService', () => ({ addBonusCredits: vi.fn() }))
vi.mock('@/lib/stripe/client', () => ({ getStripeOrNull: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/admin/reconcile-purchase/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'
import { addBonusCredits } from '@/lib/credits/creditService'
import { logAdminAction } from '@/lib/auth/adminAudit'
import { getStripeOrNull } from '@/lib/stripe/client'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/reconcile-purchase', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function paidSession(over?: Partial<{ refunded: boolean; userId: string; pack: string }>) {
  return {
    id: 'cs_1',
    payment_status: 'paid',
    payment_intent: {
      id: 'pi_1',
      latest_charge: {
        refunded: over?.refunded ?? false,
        amount_refunded: over?.refunded ? 9900 : 0,
      },
    },
    metadata: {
      type: 'credit_pack',
      creditPack: over?.pack ?? 'plus',
      userId: over?.userId ?? 'u1',
    },
    customer_details: { email: 'buyer@example.com' },
  }
}

/**
 * Build a stripe stub whose checkout.sessions.list / retrieve and charges.retrieve
 * are individually controllable so we can drive each resolveSessions branch.
 */
function buildStripe(opts?: {
  listData?: unknown[]
  retrieveSession?: unknown
  chargeRetrieve?: unknown
  listAsyncIterable?: unknown[]
}) {
  const listFn = vi.fn().mockImplementation(() => {
    const data = opts?.listData ?? []
    // checkout.sessions.list returns an object that is BOTH awaitable ({data})
    // AND async-iterable (auto-pagination). The email branch uses for-await.
    const iterable = opts?.listAsyncIterable
    if (iterable) {
      return {
        data,
        [Symbol.asyncIterator]: async function* () {
          for (const s of iterable) yield s
        },
        then: (resolve: (v: unknown) => void) => resolve({ data }),
      }
    }
    return Promise.resolve({ data })
  })
  const stripe = {
    checkout: {
      sessions: {
        list: listFn,
        retrieve: vi.fn().mockResolvedValue(opts?.retrieveSession ?? null),
      },
    },
    charges: {
      retrieve: vi.fn().mockResolvedValue(opts?.chargeRetrieve ?? null),
    },
  }
  vi.mocked(getStripeOrNull).mockReturnValue(stripe as any)
  return stripe
}

function setupAdmin() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'u1',
    email: 'buyer@example.com',
  } as any)
  vi.mocked(prisma.bonusCreditPurchase.findFirst).mockResolvedValue(null)
}

describe('POST /api/admin/reconcile-purchase — resolveSessions branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  it('resolves a cs_ checkout session via retrieve', async () => {
    setupAdmin()
    const stripe = buildStripe({ retrieveSession: paidSession() })
    const res = await POST(req({ query: 'cs_abc123' }))
    expect(res.status).toBe(200)
    const data = (await res.json()).data
    expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith('cs_abc123', expect.any(Object))
    expect(data.sessionsFound).toBe(1)
    expect(data.summary.missing).toBe(1)
  })

  it('resolves a pi_ payment intent via list', async () => {
    setupAdmin()
    const stripe = buildStripe({ listData: [paidSession()] })
    const res = await POST(req({ query: 'pi_xyz789' }))
    expect(res.status).toBe(200)
    const listArg = stripe.checkout.sessions.list.mock.calls[0][0] as any
    expect(listArg.payment_intent).toBe('pi_xyz789')
    expect((await res.json()).data.sessionsFound).toBe(1)
  })

  it('resolves a ch_ charge by following its payment_intent', async () => {
    setupAdmin()
    const stripe = buildStripe({
      chargeRetrieve: { id: 'ch_1', payment_intent: 'pi_from_charge' },
      listData: [paidSession()],
    })
    const res = await POST(req({ query: 'ch_charge1' }))
    expect(res.status).toBe(200)
    expect(stripe.charges.retrieve).toHaveBeenCalledWith('ch_charge1')
    const listArg = stripe.checkout.sessions.list.mock.calls[0][0] as any
    expect(listArg.payment_intent).toBe('pi_from_charge')
    expect((await res.json()).data.sessionsFound).toBe(1)
  })

  it('returns no sessions for a ch_ charge with no payment_intent', async () => {
    setupAdmin()
    buildStripe({ chargeRetrieve: { id: 'ch_1', payment_intent: null } })
    const res = await POST(req({ query: 'ch_orphan' }))
    expect(res.status).toBe(200)
    expect((await res.json()).data.sessionsFound).toBe(0)
  })

  it('resolves sessions by email, filtering on customer email (case-insensitive)', async () => {
    setupAdmin()
    const match = { ...paidSession(), customer_details: { email: 'Buyer@Example.com' } }
    const noMatch = {
      ...paidSession(),
      id: 'cs_other',
      customer_details: { email: 'someone@else.com' },
    }
    buildStripe({ listAsyncIterable: [match, noMatch] })
    const res = await POST(req({ query: 'buyer@example.com' }))
    expect(res.status).toBe(200)
    const data = (await res.json()).data
    // Only the matching-email session is reconciled
    expect(data.sessionsFound).toBe(1)
    expect(data.results[0].sessionId).toBe('cs_1')
  })

  it('returns zero sessions for an unrecognized query format', async () => {
    setupAdmin()
    buildStripe({})
    const res = await POST(req({ query: 'random-string' }))
    expect(res.status).toBe(200)
    const data = (await res.json()).data
    expect(data.sessionsFound).toBe(0)
    expect(data.results).toEqual([])
  })

  it('returns stripe_lookup_failed when the Stripe lookup throws', async () => {
    setupAdmin()
    const stripe = buildStripe({})
    stripe.checkout.sessions.retrieve.mockRejectedValue(new Error('stripe down'))
    const res = await POST(req({ query: 'cs_boom' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error.message).toBe('stripe_lookup_failed')
  })
})

describe('POST /api/admin/reconcile-purchase — reconcileSession statuses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  it('flags not_credit_pack when metadata.type is not credit_pack', async () => {
    setupAdmin()
    const s = { ...paidSession(), metadata: { type: 'something_else' } }
    buildStripe({ retrieveSession: s })
    const data = (await (await POST(req({ query: 'cs_1' }))).json()).data
    expect(data.summary.not_credit_pack).toBe(1)
    expect(data.results[0].status).toBe('not_credit_pack')
  })

  it('flags unpaid when payment_status is not paid', async () => {
    setupAdmin()
    const s = { ...paidSession(), payment_status: 'unpaid' }
    buildStripe({ retrieveSession: s })
    const data = (await (await POST(req({ query: 'cs_1' }))).json()).data
    expect(data.summary.unpaid).toBe(1)
    expect(data.results[0]).toMatchObject({ status: 'unpaid', detail: 'unpaid' })
  })

  it('flags unpaid when there is no payment_intent', async () => {
    setupAdmin()
    const s = { ...paidSession(), payment_intent: null }
    buildStripe({ retrieveSession: s })
    const data = (await (await POST(req({ query: 'cs_1' }))).json()).data
    expect(data.summary.unpaid).toBe(1)
  })

  it('flags bad_metadata when the pack key is unknown', async () => {
    setupAdmin()
    const s = paidSession({ pack: 'not_a_real_pack' })
    buildStripe({ retrieveSession: s })
    const data = (await (await POST(req({ query: 'cs_1' }))).json()).data
    expect(data.summary.bad_metadata).toBe(1)
    expect(data.results[0].status).toBe('bad_metadata')
  })

  it('flags bad_metadata when userId is missing', async () => {
    setupAdmin()
    const s = paidSession()
    delete (s.metadata as any).userId
    buildStripe({ retrieveSession: s })
    const data = (await (await POST(req({ query: 'cs_1' }))).json()).data
    expect(data.summary.bad_metadata).toBe(1)
  })

  it('flags user_missing when the user no longer exists', async () => {
    setupAdmin()
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    buildStripe({ retrieveSession: paidSession() })
    const data = (await (await POST(req({ query: 'cs_1' }))).json()).data
    expect(data.summary.user_missing).toBe(1)
    expect(data.results[0]).toMatchObject({ status: 'user_missing', userId: 'u1' })
  })

  it('apply path also writes an admin audit log on grant', async () => {
    setupAdmin()
    buildStripe({ retrieveSession: paidSession() })
    const data = (await (await POST(req({ query: 'cs_1', apply: true }))).json()).data
    expect(data.summary.granted).toBe(1)
    expect(addBonusCredits).toHaveBeenCalledWith('u1', 100, 'purchase', 'pi_1')
    expect(logAdminAction).toHaveBeenCalledTimes(1)
    const auditArg = vi.mocked(logAdminAction).mock.calls[0][0] as any
    expect(auditArg.action).toBe('reconcile_purchase')
    expect(auditArg.success).toBe(true)
  })

  it('treats a P2002 from addBonusCredits as already-credited (ok)', async () => {
    setupAdmin()
    buildStripe({ retrieveSession: paidSession() })
    vi.mocked(addBonusCredits).mockRejectedValue({ code: 'P2002' } as any)
    const data = (await (await POST(req({ query: 'cs_1', apply: true }))).json()).data
    expect(data.summary.ok).toBe(1)
    expect(data.results[0].detail).toContain('P2002')
  })

  it('flags grant_failed when addBonusCredits throws a non-P2002 error', async () => {
    setupAdmin()
    buildStripe({ retrieveSession: paidSession() })
    vi.mocked(addBonusCredits).mockRejectedValue(new Error('insert failed'))
    const data = (await (await POST(req({ query: 'cs_1', apply: true }))).json()).data
    expect(data.summary.grant_failed).toBe(1)
    expect(data.results[0]).toMatchObject({ status: 'grant_failed', detail: 'grant failed' })
    expect(logAdminAction).not.toHaveBeenCalled()
  })

  it('returns 500 when an unexpected error escapes the handler body', async () => {
    setupAdmin()
    // getStripeOrNull throwing is caught by the outer try/catch → Internal error.
    vi.mocked(getStripeOrNull).mockImplementation(() => {
      throw new Error('unexpected')
    })
    const res = await POST(req({ query: 'cs_1' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error.message).toBe('Internal server error')
  })
})
