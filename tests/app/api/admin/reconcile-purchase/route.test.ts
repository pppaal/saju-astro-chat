/**
 * Tests for Admin Stripe Purchase Reconcile API
 * POST /api/admin/reconcile-purchase — backfill webhook-missed Stripe purchases.
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
import { getStripeOrNull } from '@/lib/stripe/client'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/reconcile-purchase', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// plus 팩(100크레딧) paid checkout session. latest_charge 환불 안 됨.
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

function mockStripe(sessions: unknown[]) {
  vi.mocked(getStripeOrNull).mockReturnValue({
    checkout: {
      sessions: {
        list: vi.fn().mockResolvedValue({ data: sessions }),
        retrieve: vi.fn().mockResolvedValue(sessions[0]),
      },
    },
  } as any)
}

function setupAdmin() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'u1',
    email: 'buyer@example.com',
  } as any)
}

describe('POST /api/admin/reconcile-purchase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    expect((await POST(req({ query: 'pi_1' }))).status).toBe(401)
  })

  it('rejects non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(false)
    expect((await POST(req({ query: 'pi_1' }))).status).toBe(403)
  })

  it('rejects a too-short query', async () => {
    setupAdmin()
    expect((await POST(req({ query: 'p' }))).status).toBe(422)
  })

  it('dry-run flags a missing purchase without granting', async () => {
    setupAdmin()
    mockStripe([paidSession()])
    vi.mocked(prisma.bonusCreditPurchase.findFirst).mockResolvedValue(null) // 우리 DB 엔 없음
    const data = (await (await POST(req({ query: 'pi_1' }))).json()).data
    expect(data.summary.missing).toBe(1)
    expect(data.results[0]).toMatchObject({ status: 'missing', userId: 'u1', credits: 100 })
    expect(addBonusCredits).not.toHaveBeenCalled()
  })

  it('apply grants credits for a missing purchase (webhook-equivalent)', async () => {
    setupAdmin()
    mockStripe([paidSession()])
    vi.mocked(prisma.bonusCreditPurchase.findFirst).mockResolvedValue(null)
    const data = (await (await POST(req({ query: 'pi_1', apply: true }))).json()).data
    expect(data.summary.granted).toBe(1)
    expect(addBonusCredits).toHaveBeenCalledWith('u1', 100, 'purchase', 'pi_1')
  })

  it('reports ok when the purchase already exists in DB', async () => {
    setupAdmin()
    mockStripe([paidSession()])
    vi.mocked(prisma.bonusCreditPurchase.findFirst).mockResolvedValue({ id: 'bcp1' } as any)
    const data = (await (await POST(req({ query: 'pi_1', apply: true }))).json()).data
    expect(data.summary.ok).toBe(1)
    expect(addBonusCredits).not.toHaveBeenCalled()
  })

  it('skips refunded purchases', async () => {
    setupAdmin()
    mockStripe([paidSession({ refunded: true })])
    vi.mocked(prisma.bonusCreditPurchase.findFirst).mockResolvedValue(null)
    const data = (await (await POST(req({ query: 'pi_1', apply: true }))).json()).data
    expect(data.summary.refunded).toBe(1)
    expect(addBonusCredits).not.toHaveBeenCalled()
  })

  it('returns stripe_not_configured when Stripe key is missing', async () => {
    setupAdmin()
    vi.mocked(getStripeOrNull).mockReturnValue(null)
    const res = await POST(req({ query: 'pi_1' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error.message).toBe('stripe_not_configured')
  })
})
