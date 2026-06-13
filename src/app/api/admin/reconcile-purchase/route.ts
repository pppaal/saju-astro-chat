/**
 * Admin Stripe Purchase Reconcile API
 *
 * POST /api/admin/reconcile-purchase
 * body: { query: string, apply?: boolean }
 *   query  — Stripe payment_intent(pi_…) / checkout session(cs_…) / charge(ch_…)
 *            ID, 또는 구매자 이메일.
 *   apply  — false(기본): 점검만(dry-run). true: 누락분 크레딧 실제 지급.
 *
 * Stripe 엔 결제(checkout.session, payment_status=paid)가 있는데 우리 DB 엔
 * BonusCreditPurchase 행이 없는 "웹훅 누락" 결제를 찾아 웹훅과 동일 로직으로
 * 크레딧을 backfill 한다. CLI(scripts/reconcile-stripe-purchases.ts)의 웹용
 * 버전 — 폰/브라우저에서 바로 복구할 수 있게 한다.
 *
 * 멱등: addBonusCredits 가 stripePaymentId(@unique)로 중복 지급을 막는다.
 * 환불(부분 포함)된 결제는 재지급하지 않고 skip.
 */

import { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { isAdminUser } from '@/lib/auth/admin'
import { logAdminAction } from '@/lib/auth/adminAudit'
import { getStripeOrNull } from '@/lib/stripe/client'
import { CREDIT_PACKS, type CreditPackType } from '@/lib/config/pricing'
import { addBonusCredits } from '@/lib/credits/creditService'

export const dynamic = 'force-dynamic'

const EMAIL_SCAN_DAYS = 180
const EMAIL_SCAN_CAP = 500

function piId(pi: string | Stripe.PaymentIntent | null | undefined): string | null {
  if (!pi) return null
  return typeof pi === 'string' ? pi : pi.id
}

function isRefunded(pi: string | Stripe.PaymentIntent | null | undefined): boolean {
  if (!pi || typeof pi === 'string') return false
  const charge = pi.latest_charge as Stripe.Charge | null
  if (!charge || typeof charge === 'string') return false
  return charge.refunded === true || (charge.amount_refunded ?? 0) > 0
}

interface RowResult {
  sessionId: string
  status:
    | 'ok'
    | 'missing'
    | 'granted'
    | 'refunded'
    | 'unpaid'
    | 'not_credit_pack'
    | 'bad_metadata'
    | 'user_missing'
    | 'grant_failed'
  userId?: string
  email?: string | null
  pack?: string
  credits?: number
  paymentIntentId?: string
  detail?: string
}

// Stripe 입력(pi_/cs_/ch_/email)을 대상 checkout.session 목록으로 해석.
async function resolveSessions(stripe: Stripe, query: string): Promise<Stripe.Checkout.Session[]> {
  const expand = ['data.payment_intent.latest_charge']
  if (query.startsWith('cs_')) {
    const s = await stripe.checkout.sessions.retrieve(query, {
      expand: ['payment_intent.latest_charge'],
    })
    return [s]
  }
  if (query.startsWith('pi_')) {
    const list = await stripe.checkout.sessions.list({ payment_intent: query, limit: 10, expand })
    return list.data
  }
  if (query.startsWith('ch_')) {
    const charge = await stripe.charges.retrieve(query)
    const pi = piId(charge.payment_intent)
    if (!pi) return []
    const list = await stripe.checkout.sessions.list({ payment_intent: pi, limit: 10, expand })
    return list.data
  }
  if (query.includes('@')) {
    const emailLower = query.toLowerCase()
    const gte = Math.floor((Date.now() - EMAIL_SCAN_DAYS * 24 * 60 * 60 * 1000) / 1000)
    const out: Stripe.Checkout.Session[] = []
    let scanned = 0
    for await (const s of stripe.checkout.sessions.list({ created: { gte }, limit: 100, expand })) {
      scanned++
      if (s.customer_details?.email?.toLowerCase() === emailLower) out.push(s)
      if (scanned >= EMAIL_SCAN_CAP) break
    }
    return out
  }
  return []
}

async function reconcileSession(
  session: Stripe.Checkout.Session,
  apply: boolean,
  admin: { email: string; userId: string; ip?: string }
): Promise<RowResult> {
  const meta = session.metadata || {}
  if (meta.type !== 'credit_pack') return { sessionId: session.id, status: 'not_credit_pack' }

  const pi = piId(session.payment_intent)
  if (session.payment_status !== 'paid' || !pi) {
    return { sessionId: session.id, status: 'unpaid', detail: session.payment_status ?? 'unknown' }
  }

  const packKey = meta.creditPack as CreditPackType | undefined
  const userId = meta.userId
  const pack = packKey ? CREDIT_PACKS[packKey] : undefined
  if (!packKey || !userId || !pack) return { sessionId: session.id, status: 'bad_metadata' }

  const existing = await prisma.bonusCreditPurchase.findFirst({
    where: { stripePaymentId: pi },
    select: { id: true },
  })
  if (existing) {
    return { sessionId: session.id, status: 'ok', userId, pack: packKey, paymentIntentId: pi }
  }

  if (isRefunded(session.payment_intent)) {
    return { sessionId: session.id, status: 'refunded', userId, pack: packKey, paymentIntentId: pi }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  })
  if (!user) return { sessionId: session.id, status: 'user_missing', userId, paymentIntentId: pi }

  const base: RowResult = {
    sessionId: session.id,
    status: 'missing',
    userId,
    email: user.email,
    pack: packKey,
    credits: pack.credits,
    paymentIntentId: pi,
  }
  if (!apply) return base

  try {
    // 웹훅과 동일: source='purchase' + stripePaymentId. P2002 = 이미 지급(멱등).
    await addBonusCredits(userId, pack.credits, 'purchase', pi)
    await logAdminAction({
      adminEmail: admin.email,
      adminUserId: admin.userId,
      action: 'reconcile_purchase',
      targetType: 'bonus_credit_purchase',
      targetId: pi,
      metadata: { userId, pack: packKey, credits: pack.credits, sessionId: session.id },
      success: true,
      ipAddress: admin.ip,
    })
    return { ...base, status: 'granted' }
  } catch (err) {
    const code = (err as { code?: string })?.code
    if (code === 'P2002') return { ...base, status: 'ok', detail: 'already credited (P2002)' }
    logger.error('[admin/reconcile-purchase] grant failed', { pi, userId, err })
    return { ...base, status: 'grant_failed', detail: 'grant failed' }
  }
}

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      if (!context.userId || !context.session?.user?.email) {
        return apiError(ErrorCodes.UNAUTHORIZED, 'Unauthorized')
      }
      if (!(await isAdminUser(context.userId, context.session?.user?.email))) {
        logger.warn('[admin/reconcile-purchase] unauthorized', { userId: context.userId })
        return apiError(ErrorCodes.FORBIDDEN, 'Forbidden')
      }

      const body = (await req.json().catch(() => ({}))) as { query?: string; apply?: boolean }
      const query = (body.query || '').trim()
      const apply = body.apply === true
      if (query.length < 3) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'query(결제 ID 또는 이메일)를 입력하세요')
      }

      const stripe = getStripeOrNull()
      if (!stripe) {
        return apiError(ErrorCodes.INTERNAL_ERROR, 'stripe_not_configured')
      }

      let sessions: Stripe.Checkout.Session[]
      try {
        sessions = await resolveSessions(stripe, query)
      } catch (err) {
        logger.error('[admin/reconcile-purchase] stripe lookup failed', { query, err })
        return apiError(ErrorCodes.INTERNAL_ERROR, 'stripe_lookup_failed')
      }

      const admin = { email: context.session.user.email, userId: context.userId, ip: context.ip }
      const results: RowResult[] = []
      for (const s of sessions) {
        results.push(await reconcileSession(s, apply, admin))
      }

      const summary = results.reduce<Record<string, number>>((acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1
        return acc
      }, {})

      return apiSuccess({
        query,
        apply,
        sessionsFound: sessions.length,
        summary,
        results,
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('[admin/reconcile-purchase] error', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/admin/reconcile-purchase',
    limit: 20,
    windowSeconds: 60,
  })
)
