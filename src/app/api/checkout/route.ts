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
import { logger } from '@/lib/logger'
import { csrfGuard } from '@/lib/security/csrf'
import {
  getPriceId,
  getCreditPackPriceId,
  allowedPriceIds,
  allowedCreditPackIds,
  type PlanKey,
  type BillingCycle,
  type CreditPackKey,
} from '@/lib/payments/prices'
import { HTTP_STATUS } from '@/lib/constants/http'
import { checkoutRequestSchema } from '@/lib/api/zodValidation'

export const runtime = 'nodejs'

let stripeInstance: Stripe | null = null
function getStripe(): Stripe | null {
  if (stripeInstance) {
    return stripeInstance
  }
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    return null
  }
  stripeInstance = new Stripe(key)
  return stripeInstance
}

function isValidEmail(email?: string | null) {
  if (!email) {
    return false
  }
  if (email.length > 254) {
    return false
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

type CheckoutBody = {
  plan?: PlanKey
  billingCycle?: BillingCycle
  creditPack?: CreditPackKey
}

type SessionUser = {
  id?: string
  email?: string | null
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers)

  try {
    // CSRF protection - validate request origin
    const csrfError = csrfGuard(req.headers)
    if (csrfError) {
      logger.warn('[checkout] CSRF validation failed', { ip })
      recordCounter('checkout_csrf_blocked', 1)
      return csrfError
    }

    const oversized = enforceBodySize(req, 32 * 1024)
    if (oversized) {
      return oversized
    }

    // Rate limit to reduce checkout abuse
    const limit = await rateLimit(`checkout:${ip}`, { limit: 8, windowSeconds: 60 })
    const rateHeaders = new Headers(limit.headers)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: rateHeaders }
      )
    }

    // Authentication required
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'not_authenticated' },
        { status: HTTP_STATUS.UNAUTHORIZED, headers: rateHeaders }
      )
    }
    const sessionUser = session.user as SessionUser

    const base = process.env.NEXT_PUBLIC_BASE_URL // e.g., https://your-domain.com
    if (!base) {
      logger.error('ERR: NEXT_PUBLIC_BASE_URL missing')
      recordCounter('stripe_checkout_config_error', 1, { reason: 'missing_base_url' })
      captureServerError(new Error('NEXT_PUBLIC_BASE_URL missing'), { route: '/api/checkout', ip })
      return NextResponse.json(
        { error: 'missing_base_url' },
        { status: HTTP_STATUS.SERVER_ERROR, headers: rateHeaders }
      )
    }

    const rawBody = await req.json().catch(() => ({}))

    // Validate request body with Zod
    const validationResult = checkoutRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[checkout] validation failed', { errors: validationResult.error.errors })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST, headers: rateHeaders }
      )
    }

    const body = validationResult.data
    const plan = body.plan
    const billingCycle = body.billingCycle
    const creditPack = body.creditPack

    const stripe = getStripe()
    if (!stripe) {
      logger.error('ERR: STRIPE_SECRET_KEY missing')
      recordCounter('stripe_checkout_config_error', 1, { reason: 'missing_secret' })
      captureServerError(new Error('STRIPE_SECRET_KEY missing'), { route: '/api/checkout', ip })
      return NextResponse.json(
        { error: 'missing_secret' },
        { status: HTTP_STATUS.SERVER_ERROR, headers: rateHeaders }
      )
    }

    const email = sessionUser.email ?? ''
    if (!isValidEmail(email)) {
      logger.warn('[checkout] invalid email for session user', { userId: sessionUser.id })
      return NextResponse.json(
        { error: 'invalid_email' },
        { status: HTTP_STATUS.BAD_REQUEST, headers: rateHeaders }
      )
    }

    // Idempotency: use client-provided key when reasonable, otherwise generate
    const clientIdemKey = req.headers.get('x-idempotency-key')
    const idempotencyKey =
      clientIdemKey && clientIdemKey.length < 128 ? clientIdemKey : randomUUID()

    // Handle credit pack purchase (one-time payment)
    if (creditPack) {
      const creditPrice = getCreditPackPriceId(creditPack)
      if (!creditPrice || !allowedCreditPackIds().includes(creditPrice)) {
        logger.error('[checkout] credit pack price not allowed', { creditPack })
        recordCounter('stripe_checkout_price_error', 1, { type: 'credit_pack' })
        return NextResponse.json(
          { error: 'invalid_credit_pack' },
          { status: HTTP_STATUS.BAD_REQUEST, headers: rateHeaders }
        )
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
            userId: sessionUser.id || '',
            source: 'web',
          },
        },
        { idempotencyKey }
      )

      if (!checkout.url) {
        return NextResponse.json(
          { error: 'no_checkout_url' },
          { status: HTTP_STATUS.SERVER_ERROR, headers: rateHeaders }
        )
      }

      return NextResponse.json(
        { url: checkout.url },
        { status: HTTP_STATUS.OK, headers: rateHeaders }
      )
    }

    // Handle subscription purchase
    const selectedPlan = plan || 'premium'
    const selectedBilling = billingCycle || 'monthly'
    const price = getPriceId(selectedPlan, selectedBilling)
    if (!price || !allowedPriceIds().includes(price)) {
      logger.error('[checkout] price not allowed', {
        plan: selectedPlan,
        billingCycle: selectedBilling,
      })
      recordCounter('stripe_checkout_price_error', 1, { type: 'subscription' })
      return NextResponse.json(
        { error: 'invalid_price' },
        { status: HTTP_STATUS.BAD_REQUEST, headers: rateHeaders }
      )
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
          userId: sessionUser.id || '',
          source: 'web',
          plan: selectedPlan,
          billingCycle: selectedBilling,
        },
      },
      { idempotencyKey }
    )

    if (!checkout.url) {
      return NextResponse.json(
        { error: 'no_checkout_url' },
        { status: HTTP_STATUS.SERVER_ERROR, headers: rateHeaders }
      )
    }

    return NextResponse.json(
      { url: checkout.url },
      { status: HTTP_STATUS.OK, headers: rateHeaders }
    )
  } catch (e: unknown) {
    const err = e as { raw?: { message?: string }; message?: string; code?: string }
    const msg = err?.raw?.message || err?.message || 'unknown'
    logger.error('Stripe error:', msg)
    recordCounter('stripe_checkout_error', 1, { reason: err?.code || 'unknown' })
    captureServerError(e, { route: '/api/checkout', message: msg })
    return NextResponse.json(
      { error: 'stripe_error', message: msg },
      { status: HTTP_STATUS.BAD_REQUEST }
    )
  }
}
