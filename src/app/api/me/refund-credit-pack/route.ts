import { NextRequest } from 'next/server'
import Stripe from 'stripe'
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
import { revokeBonusCreditPurchase } from '@/lib/credits/creditService'

export const dynamic = 'force-dynamic'

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2025-10-29.clover'
const STRIPE_FEE_PERCENT = Number(process.env.STRIPE_FEE_PERCENT || '3.5')
const STRIPE_FEE_FIXED_KRW = Number(process.env.STRIPE_FEE_FIXED_KRW || '300')
const REFUND_WINDOW_DAYS = 7

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION })
}

function formulaFee(amount: number): number {
  return Math.round(amount * (STRIPE_FEE_PERCENT / 100)) + STRIPE_FEE_FIXED_KRW
}

// 셀프서비스 환불 — 사용자가 자기 구매(미사용 + 7일 이내) 만 직접 환불.
// 어드민 엔드포인트와 동일한 Stripe partial refund(수수료 차감) 로직 사용.
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    if (!context.userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, 'unauthorized')
    }

    const body = await req.json().catch(() => ({}))
    const purchaseId: string | undefined = body?.purchaseId?.trim()
    if (!purchaseId) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'purchaseId is required')
    }

    // 1) 사용자 본인 구매만 조회 (소유권 + 자격 검증)
    const purchase = await prisma.bonusCreditPurchase.findFirst({
      where: { id: purchaseId, userId: context.userId },
    })
    if (!purchase) {
      return apiError(ErrorCodes.NOT_FOUND, 'purchase_not_found')
    }
    if (purchase.source !== 'purchase') {
      // 추천/프로모션/선물 크레딧은 환불 대상 아님
      return apiError(ErrorCodes.BAD_REQUEST, 'not_refundable_source')
    }
    if (purchase.expired) {
      return apiError(ErrorCodes.BAD_REQUEST, 'already_refunded_or_expired')
    }
    if (purchase.remaining !== purchase.amount) {
      return apiError(
        ErrorCodes.BAD_REQUEST,
        `partially_used (used=${purchase.amount - purchase.remaining}/${purchase.amount})`
      )
    }
    const ageMs = Date.now() - purchase.createdAt.getTime()
    if (ageMs > REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
      return apiError(ErrorCodes.BAD_REQUEST, 'refund_window_expired')
    }
    if (!purchase.stripePaymentId) {
      // 레거시 데이터 — paymentId 없으면 셀프 환불 불가. 어드민 처리 안내.
      return apiError(ErrorCodes.BAD_REQUEST, 'legacy_purchase_contact_support')
    }

    const stripe = getStripe()
    if (!stripe) {
      return apiError(ErrorCodes.INTERNAL_ERROR, 'stripe_not_configured')
    }

    // 2) Stripe 에서 정확한 원금 + 수수료 조회 (실패 시 공식 폴백)
    let originalAmount = 0
    let feeWithheld = 0
    let feeSource: 'balance_transaction' | 'formula' = 'formula'

    try {
      const pi = await stripe.paymentIntents.retrieve(purchase.stripePaymentId, {
        expand: ['latest_charge.balance_transaction'],
      })
      const charge = pi.latest_charge as Stripe.Charge | null
      const balanceTx = charge?.balance_transaction as Stripe.BalanceTransaction | null
      if (balanceTx && typeof balanceTx === 'object') {
        originalAmount = balanceTx.amount
        feeWithheld = balanceTx.fee
        feeSource = 'balance_transaction'
      } else if (pi.amount_received) {
        originalAmount = pi.amount_received
        feeWithheld = formulaFee(originalAmount)
      } else {
        return apiError(ErrorCodes.INTERNAL_ERROR, 'payment_amount_unavailable')
      }
    } catch (err) {
      logger.error('[me/refund-credit-pack] payment intent lookup failed', {
        purchaseId,
        err,
      })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'stripe_lookup_failed')
    }

    const refundAmount = Math.max(0, originalAmount - feeWithheld)
    if (refundAmount <= 0) {
      return apiError(ErrorCodes.BAD_REQUEST, 'refund_amount_zero')
    }

    // 3) Stripe partial refund (수수료 차감)
    let stripeRefundId = ''
    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: purchase.stripePaymentId,
          amount: refundAmount,
          reason: 'requested_by_customer',
          metadata: {
            type: 'credit_pack',
            purchaseId: purchase.id,
            feeWithheldKrw: String(feeWithheld),
            feeSource,
            initiatedBy: 'self',
            userId: context.userId,
          },
        },
        {
          idempotencyKey: `refund_pack_${purchase.id}`,
        }
      )
      stripeRefundId = refund.id
    } catch (err) {
      logger.error('[me/refund-credit-pack] stripe refund failed', {
        purchaseId,
        err,
      })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'stripe_refund_failed')
    }

    // 4) 크레딧 회수 (webhook 도 같이 처리하지만 멱등)
    const revoke = await revokeBonusCreditPurchase(purchase.stripePaymentId)

    logger.info('[me/refund-credit-pack] self-service refund success', {
      purchaseId,
      userId: context.userId,
      originalAmount,
      refundAmount,
      feeWithheld,
      feeSource,
    })

    return apiSuccess({
      success: true,
      refundedKrw: refundAmount,
      feeWithheld,
      originalAmount,
      stripeRefundId,
      creditsRevoked: revoke.reclaimed,
    })
  },
  createAuthenticatedGuard({
    route: '/api/me/refund-credit-pack',
    // 어뷰징 방지 — 분당 5회 (정상 사용자는 한두 번이면 충분)
    limit: 5,
    windowSeconds: 60,
  })
)
