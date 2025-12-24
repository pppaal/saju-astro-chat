import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { randomUUID } from 'crypto'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { recordCounter } from '@/lib/metrics'
import { enforceBodySize } from '@/lib/http'
import {
  getPriceId,
  getCreditPackPriceId,
  allowedPriceIds,
  allowedCreditPackIds,
  type PlanKey,
  type BillingCycle,
  type CreditPackKey
} from '@/lib/payments/prices'

export const runtime = 'nodejs'

let stripeInstance: Stripe | null = null
function getStripe(): Stripe | null {
  if (stripeInstance) return stripeInstance
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  stripeInstance = new Stripe(key)
  return stripeInstance
}

function isValidEmail(email?: string | null) {
  if (!email) return false
  if (email.length > 254) return false
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

type CheckoutBody = {
  plan?: PlanKey
  billingCycle?: BillingCycle
  creditPack?: CreditPackKey
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)

  try {
    const oversized = enforceBodySize(req as any, 32 * 1024)
    if (oversized) return oversized

    // Rate limit to reduce checkout abuse
    const limit = await rateLimit(`checkout:${ip}`, { limit: 8, windowSeconds: 60 })
    const rateHeaders = new Headers(limit.headers)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429, headers: rateHeaders })
    }

    // Authentication required
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401, headers: rateHeaders })
    }

    const base = process.env.NEXT_PUBLIC_BASE_URL // e.g., https://your-domain.com
    if (!base) {
      console.error('ERR: NEXT_PUBLIC_BASE_URL missing')
      recordCounter('stripe_checkout_config_error', 1, { reason: 'missing_base_url' })
      captureServerError(new Error('NEXT_PUBLIC_BASE_URL missing'), { route: '/api/checkout', ip })
      return NextResponse.json({ error: 'missing_base_url' }, { status: 500, headers: rateHeaders })
    }

    const body = (await req.json().catch(() => ({}))) as CheckoutBody
    const plan = body.plan
    const billingCycle = body.billingCycle
    const creditPack = body.creditPack

    if (plan && creditPack) {
      return NextResponse.json({ error: 'choose_one_of_plan_or_creditPack' }, { status: 400, headers: rateHeaders })
    }
    if (!plan && !creditPack) {
      return NextResponse.json({ error: 'missing_product' }, { status: 400, headers: rateHeaders })
    }

    const stripe = getStripe()
    if (!stripe) {
      console.error('ERR: STRIPE_SECRET_KEY missing')
      recordCounter('stripe_checkout_config_error', 1, { reason: 'missing_secret' })
      captureServerError(new Error('STRIPE_SECRET_KEY missing'), { route: '/api/checkout', ip })
      return NextResponse.json({ error: 'missing_secret' }, { status: 500, headers: rateHeaders })
    }

    const email = session.user.email ?? ''
    if (!isValidEmail(email)) {
      console.warn('[checkout] invalid email for session user', { userId: (session.user as any)?.id })
      return NextResponse.json({ error: 'invalid_email' }, { status: 400, headers: rateHeaders })
    }

    // Idempotency: use client-provided key when reasonable, otherwise generate
    const clientIdemKey = req.headers.get('x-idempotency-key')
    const idempotencyKey = clientIdemKey && clientIdemKey.length < 128 ? clientIdemKey : randomUUID()

    // Handle credit pack purchase (one-time payment)
    if (creditPack) {
      const creditPrice = getCreditPackPriceId(creditPack)
      if (!creditPrice || !allowedCreditPackIds().includes(creditPrice)) {
        console.error('[checkout] credit pack price not allowed', { creditPack })
        recordCounter('stripe_checkout_price_error', 1, { type: 'credit_pack' })
        return NextResponse.json({ error: 'invalid_credit_pack' }, { status: 400, headers: rateHeaders })
      }

      const checkout = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          line_items: [{ price: creditPrice, quantity: 1 }],
          success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${base}/pricing`,
          customer_email: email,
          metadata: {
            type: 'credit_pack',
            creditPack: creditPack,
            userId: (session.user as any)?.id || '',
            source: 'web',
          },
        },
        { idempotencyKey }
      )

      if (!checkout.url) {
        return NextResponse.json({ error: 'no_checkout_url' }, { status: 500, headers: rateHeaders })
      }

      console.info('[checkout] credit pack session created', {
          userId: (session.user as any)?.id,
          email,
          ip,
          checkoutId: checkout.id,
          creditPack,
        })

      return NextResponse.json({ url: checkout.url }, { status: 200, headers: rateHeaders })
    }

    // Handle subscription purchase
    const selectedPlan = plan || 'premium'
    const selectedBilling = billingCycle || 'monthly'
    const price = getPriceId(selectedPlan, selectedBilling)
    if (!price || !allowedPriceIds().includes(price)) {
      console.error('[checkout] price not allowed', { plan: selectedPlan, billingCycle: selectedBilling })
      recordCounter('stripe_checkout_price_error', 1, { type: 'subscription' })
      return NextResponse.json({ error: 'invalid_price' }, { status: 400, headers: rateHeaders })
    }

    const checkout = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        line_items: [{ price, quantity: 1 }],
        success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/pricing`,
        allow_promotion_codes: true,
        customer_email: email,
        metadata: {
          type: 'subscription',
          productId: `${selectedPlan}-${selectedBilling}`,
          userId: (session.user as any)?.id || '',
          source: 'web',
          plan: selectedPlan,
          billingCycle: selectedBilling,
        },
      },
      { idempotencyKey }
    )

    if (!checkout.url) {
      return NextResponse.json({ error: 'no_checkout_url' }, { status: 500, headers: rateHeaders })
    }

    console.info('[checkout] subscription session created', {
      userId: (session.user as any)?.id,
      email,
        ip,
        checkoutId: checkout.id,
        plan: selectedPlan,
        billingCycle: selectedBilling,
      })

    return NextResponse.json({ url: checkout.url }, { status: 200, headers: rateHeaders })
  } catch (e: any) {
    console.error('Stripe error:', e?.raw?.message || e?.message || e)
    recordCounter('stripe_checkout_error', 1, { reason: e?.code || 'unknown' })
    captureServerError(e, { route: '/api/checkout', message: e?.raw?.message || e?.message || 'unknown' })
    return NextResponse.json(
      { error: 'stripe_error', message: e?.raw?.message || e?.message || 'unknown' },
      { status: 400 }
    )
  }
}
