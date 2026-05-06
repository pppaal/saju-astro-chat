// src/app/api/premium-reports/redeem/route.ts
//
// Server-side endpoint the post-checkout `/premium-reports/redeem` page
// calls with `?session_id=cs_xxx`. Responsibilities:
//   1. Authenticate the user.
//   2. Look up the PremiumReportPurchase row by Stripe session id.
//   3. If the row is missing (webhook hasn't fired yet) we ALSO ask Stripe
//      directly whether the session is paid; if yes, create the purchase
//      row inline (idempotent via the unique stripeSessionId).
//   4. Return enough info for the redeem page to invoke /api/destiny-matrix/ai-report.

import Stripe from 'stripe'
import {
  apiError,
  apiSuccess,
  createAuthenticatedGuard,
  withApiMiddleware,
} from '@/lib/api/middleware'
import { ErrorCodes } from '@/lib/api/errorHandler'
import {
  findPurchaseBySessionId,
  isExpired as isPurchaseExpired,
  mapSkuToPeriod,
  markPurchasePaid,
} from '@/lib/payments/premiumReportPurchase'
import {
  getPremiumReportSkuFromPriceId,
  type PremiumReportSku,
} from '@/lib/payments/prices'
import { logger } from '@/lib/logger'

export const runtime = 'nodejs'

let stripeInstance: Stripe | null = null
function getStripe(): Stripe | null {
  if (stripeInstance) return stripeInstance
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  stripeInstance = new Stripe(key)
  return stripeInstance
}

export const GET = withApiMiddleware(
  async (req, context) => {
    const userId = context.userId
    if (!userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, '로그인이 필요합니다.')
    }

    const url = new URL(req.url)
    const sessionId = url.searchParams.get('session_id')
    if (!sessionId || sessionId.length < 4) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'session_id is required')
    }

    let purchase = await findPurchaseBySessionId(sessionId)

    // Fallback path: webhook hasn't created the row yet. Ask Stripe directly.
    if (!purchase) {
      const stripe = getStripe()
      if (!stripe) {
        logger.error('[premium-reports/redeem] STRIPE_SECRET_KEY missing')
        return apiError(ErrorCodes.INTERNAL_ERROR, 'stripe_not_configured')
      }
      let session: Stripe.Checkout.Session
      try {
        session = await stripe.checkout.sessions.retrieve(sessionId, {
          expand: ['line_items'],
        })
      } catch (err) {
        logger.warn('[premium-reports/redeem] stripe session retrieve failed', {
          message: err instanceof Error ? err.message : String(err),
          sessionId,
        })
        return apiError(ErrorCodes.NOT_FOUND, '결제 세션을 찾을 수 없습니다.')
      }

      const sessionUserId = session.metadata?.userId
      const sessionType = session.metadata?.type
      const sessionSku = session.metadata?.reportSku as PremiumReportSku | undefined
      if (sessionType !== 'premium_report' || !sessionUserId || !sessionSku) {
        return apiError(ErrorCodes.BAD_REQUEST, 'invalid_session_metadata')
      }
      if (sessionUserId !== userId) {
        return apiError(ErrorCodes.UNAUTHORIZED, '본인 결제 정보가 아닙니다.')
      }
      if (session.payment_status !== 'paid') {
        return apiError(ErrorCodes.BAD_REQUEST, 'payment_not_completed', {
          paymentStatus: session.payment_status,
        })
      }

      const stripePriceId =
        session.line_items?.data?.[0]?.price?.id ?? undefined
      const skuFromPrice = stripePriceId
        ? getPremiumReportSkuFromPriceId(stripePriceId)
        : null
      const finalSku: PremiumReportSku = skuFromPrice ?? sessionSku
      const stripePaymentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : (session.payment_intent as { id?: string } | null | undefined)?.id

      purchase = await markPurchasePaid({
        userId: sessionUserId,
        sku: finalSku,
        stripeSessionId: session.id,
        stripePriceId,
        stripePaymentId: stripePaymentId ?? undefined,
        amountPaid: session.amount_total ?? undefined,
        currency: session.currency ?? undefined,
      })
    }

    if (!purchase || purchase.userId !== userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, '본인 결제 정보가 아닙니다.')
    }

    interface RedeemResponse {
      status: 'paid' | 'consumed'
      sku: string
      period: ReturnType<typeof mapSkuToPeriod>
      sessionId: string
      consumedReportId: string | null
      paidAt: Date | null
      expiresAt: Date | null
    }

    if (purchase.status === 'consumed') {
      const payload: RedeemResponse = {
        status: 'consumed',
        sku: purchase.sku,
        period: mapSkuToPeriod(purchase.sku as PremiumReportSku),
        sessionId: purchase.stripeSessionId,
        consumedReportId: purchase.consumedReportId ?? null,
        paidAt: purchase.paidAt ?? null,
        expiresAt: purchase.expiresAt ?? null,
      }
      return apiSuccess(payload)
    }
    if (purchase.status !== 'paid' || isPurchaseExpired(purchase)) {
      return apiError(ErrorCodes.BAD_REQUEST, 'purchase_not_redeemable', {
        status: purchase.status,
        expiresAt: purchase.expiresAt,
      })
    }

    const payload: RedeemResponse = {
      status: 'paid',
      sku: purchase.sku,
      period: mapSkuToPeriod(purchase.sku as PremiumReportSku),
      sessionId: purchase.stripeSessionId,
      consumedReportId: null,
      paidAt: purchase.paidAt ?? null,
      expiresAt: purchase.expiresAt ?? null,
    }
    return apiSuccess(payload)
  },
  createAuthenticatedGuard({
    route: '/api/premium-reports/redeem',
    limit: 30,
    windowSeconds: 60,
  })
)
