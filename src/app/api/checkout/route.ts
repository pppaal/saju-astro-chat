import { NextRequest } from 'next/server'
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
  getCreditPackPriceId,
  allowedCreditPackIds,
  type CreditPackKey,
} from '@/lib/payments/prices'
import { checkoutRequestSchema } from '@/lib/api/zodValidation'
import { getStripeOrNull } from '@/lib/stripe/client'
import { isStarterEligible } from '@/lib/credits/starterPack'

export const runtime = 'nodejs'

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
      const creditPack = body.creditPack

      const stripe = getStripeOrNull()
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

      // Idempotency: use client-provided key when reasonable, otherwise generate.
      // ALWAYS namespace by userId — Stripe idempotency keys are account-scoped,
      // so an un-namespaced client key lets user B reuse user A's key and receive
      // A's cached checkout session (metadata.userId=A), crediting the wrong user.
      // The userId prefix makes cross-user collisions impossible.
      const clientIdemKey = req.headers.get('x-idempotency-key')
      const idemSuffix = clientIdemKey && clientIdemKey.length < 128 ? clientIdemKey : randomUUID()
      const idempotencyKey = `chk:${context.userId}:${idemSuffix}`

      // Only one-time credit-pack purchases are offered. Subscriptions were
      // retired, so a request without a creditPack (e.g. a stale client still
      // posting `plan`) is rejected rather than silently opening a sub.
      if (!creditPack) {
        return apiError(ErrorCodes.BAD_REQUEST, 'invalid_request')
      }

      const creditPrice = getCreditPackPriceId(creditPack as CreditPackKey)
      if (!creditPrice || !allowedCreditPackIds().includes(creditPrice)) {
        logger.error('[checkout] credit pack price not allowed', { creditPack })
        recordCounter('stripe_checkout_price_error', 1, { type: 'credit_pack' })
        return apiError(ErrorCodes.BAD_REQUEST, 'invalid_credit_pack')
      }

      // 첫구매 한정 스타터팩 — 계정당 평생 1회. UI(모달)도 자격을 보고 노출하지만,
      // 결제 생성은 클라이언트를 신뢰하지 않고 서버에서 다시 강제한다. 자격 없으면
      // Stripe 세션 자체를 만들지 않음(fail-safe = 거부).
      if (creditPack === 'starter' && !(await isStarterEligible(context.userId!))) {
        logger.warn('[checkout] starter pack not eligible', { userId: context.userId })
        recordCounter('stripe_checkout_starter_ineligible', 1)
        return apiError(ErrorCodes.BAD_REQUEST, 'starter_not_eligible')
      }

      const checkout = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          line_items: [{ price: creditPrice, quantity: 1 }],
          success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}&pack=${creditPack}`,
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
    } catch (e: unknown) {
      const err = e as { raw?: { message?: string }; message?: string; code?: string }
      const msg = err?.raw?.message || err?.message || 'unknown'
      logger.error('Stripe error:', msg)
      recordCounter('stripe_checkout_error', 1, { reason: err?.code || 'unknown' })
      captureServerError(e, { route: '/api/checkout', message: msg })
      // Don't leak the raw Stripe error to the client; log it server-side
      // (above) and return a generic, safe message.
      return apiError(ErrorCodes.BAD_REQUEST, 'Could not start checkout. Please try again.')
    }
  },
  createAuthenticatedGuard({
    route: '/api/checkout',
    limit: 8,
    windowSeconds: 60,
    // NOTE: fail-open(→ per-instance 인메모리 폴백)을 의도적으로 유지한다.
    // 이 라우트는 이미 auth + Stripe 세션 생성으로 보호되며, failClosed 로 하면
    // Redis 미설정/장애 시 정상 결제까지 429 로 막혀 매출·가용성 손실이 난다
    // (LLM 라우트와 달리 per-request 비용이 낮아 fail-closed 이득이 작다).
  })
)
