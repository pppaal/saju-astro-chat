import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { randomUUID } from 'crypto'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { captureServerError } from '@/lib/telemetry'
import { recordCounter } from '@/lib/metrics'
import { logger } from '@/lib/logger'
import {
  getPriceId,
  getCreditPackPriceId,
  allowedPriceIds,
  allowedCreditPackIds,
  type PlanKey,
  type BillingCycle,
  type CreditPackKey,
} from '@/lib/payments/prices'
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

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const base = process.env.NEXT_PUBLIC_BASE_URL
      if (!base) {
        logger.error('ERR: NEXT_PUBLIC_BASE_URL missing')
        recordCounter('stripe_checkout_config_error', 1, { reason: 'missing_base_url' })
        captureServerError(new Error('NEXT_PUBLIC_BASE_URL missing'), { route: '/api/checkout' })
        return apiError(ErrorCodes.INTERNAL_ERROR, 'missing_base_url')
      }

      const rawBody = await req.json().catch(() => ({}))

      const validationResult = checkoutRequestSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[checkout] validation failed', { errors: validationResult.error.issues })
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
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
        captureServerError(new Error('STRIPE_SECRET_KEY missing'), { route: '/api/checkout' })
        return apiError(ErrorCodes.INTERNAL_ERROR, 'missing_secret')
      }

      const email = context.session?.user?.email ?? ''
      if (!isValidEmail(email)) {
        logger.warn('[checkout] invalid email for session user', { userId: context.userId })
        return apiError(ErrorCodes.BAD_REQUEST, 'invalid_email')
      }

      // Idempotency: use client-provided key when reasonable, otherwise generate
      const clientIdemKey = req.headers.get('x-idempotency-key')
      const idempotencyKey =
        clientIdemKey && clientIdemKey.length < 128 ? clientIdemKey : randomUUID()

      // Handle credit pack purchase (one-time payment)
      if (creditPack) {
        const creditPrice = getCreditPackPriceId(creditPack as CreditPackKey)
        if (!creditPrice || !allowedCreditPackIds().includes(creditPrice)) {
          logger.error('[checkout] credit pack price not allowed', { creditPack })
          recordCounter('stripe_checkout_price_error', 1, { type: 'credit_pack' })
          return apiError(ErrorCodes.BAD_REQUEST, 'invalid_credit_pack')
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
              userId: context.userId || '',
              source: 'web',
            },
          },
          { idempotencyKey }
        )

        if (!checkout.url) {
          return apiError(ErrorCodes.INTERNAL_ERROR, 'no_checkout_url')
        }

        return apiSuccess({ url: checkout.url })
      }

      // Handle subscription purchase
      const selectedPlan = (plan || 'premium') as PlanKey
      const selectedBilling = (billingCycle || 'monthly') as BillingCycle
      const price = getPriceId(selectedPlan, selectedBilling)
      if (!price || !allowedPriceIds().includes(price)) {
        logger.error('[checkout] price not allowed', {
          plan: selectedPlan,
          billingCycle: selectedBilling,
        })
        recordCounter('stripe_checkout_price_error', 1, { type: 'subscription' })
        return apiError(ErrorCodes.BAD_REQUEST, 'invalid_price')
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
            userId: context.userId || '',
            source: 'web',
            plan: selectedPlan,
            billingCycle: selectedBilling,
          },
        },
        { idempotencyKey }
      )

      if (!checkout.url) {
        return apiError(ErrorCodes.INTERNAL_ERROR, 'no_checkout_url')
      }

      return apiSuccess({ url: checkout.url })
    } catch (e: unknown) {
      const err = e as { raw?: { message?: string }; message?: string; code?: string }
      const msg = err?.raw?.message || err?.message || 'unknown'
      logger.error('Stripe error:', msg)
      recordCounter('stripe_checkout_error', 1, { reason: err?.code || 'unknown' })
      captureServerError(e, { route: '/api/checkout', message: msg })
      return apiError(ErrorCodes.BAD_REQUEST, `stripe_error: ${msg}`)
    }
  },
  createAuthenticatedGuard({
    route: '/api/checkout',
    limit: 8,
    windowSeconds: 60,
  })
)
