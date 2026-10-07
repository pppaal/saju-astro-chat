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
  resolveCheckoutCurrency,
  type CreditPackKey,
} from '@/lib/payments/prices'
import { currencyForLocale } from '@/lib/config/pricing'
import { taxSessionParams, taxBehavior } from '@/lib/payments/tax'
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

      // 청구 통화는 **서버가** 로케일에서 정한다(클라이언트 입력 무신뢰).
      // /pricing·CreditDepletedModal 도 같은 resolveCheckoutCurrency 결과로
      // 가격을 표시하므로 표시 통화와 청구 통화가 갈릴 수 없다. 통화를 클라가
      // 고르게 하면 KRW 가 USD 환산보다 싸서 통화 쇼핑이 생긴다.
      const currency = resolveCheckoutCurrency(context.locale)
      if (currencyForLocale(context.locale) !== currency) {
        // USD Price 미설정 → KRW 폴백. 표시도 같이 폴백되므로 불일치는 아니지만,
        // 해외 결제를 KRW 로 받고 있다는 뜻이라 관측 가능해야 한다.
        recordCounter('stripe_checkout_currency_fallback', 1, { to: currency })
      }

      const creditPrice = getCreditPackPriceId(creditPack as CreditPackKey, currency)
      if (!creditPrice || !allowedCreditPackIds().includes(creditPrice)) {
        logger.error('[checkout] credit pack price not allowed', { creditPack, currency })
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

      // 세금 — automatic_tax 를 켜면 Stripe 가 고객 소재지로 세율을 계산한다.
      // 꺼져 있으면(기본) 기존 동작 그대로. 켤 때는 청구지 주소를 필수로 받고
      // Customer 를 만들어 영수증·환불에 세금 정보가 붙게 한다. 화면의 세금
      // 문구(taxNote)도 같은 설정에서 나오므로 표시와 청구가 갈리지 않는다.
      const tax = taxSessionParams()

      const checkout = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          line_items: [{ price: creditPrice, quantity: 1 }],
          success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}&pack=${creditPack}`,
          cancel_url: `${base}/pricing`,
          customer_email: email,
          ...tax,
          metadata: {
            type: 'credit_pack',
            creditPack: creditPack,
            userId: context.userId || '',
            source: 'web',
            // 지급 크레딧은 creditPack 으로만 결정되므로(웹훅) 통화는 지급에
            // 영향이 없다. 매출 집계·환불 대조용 기록.
            currency,
            taxBehavior: taxBehavior(),
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
