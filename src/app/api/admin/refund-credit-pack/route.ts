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
import { isAdminUser } from '@/lib/auth/admin'
import { revokeBonusCreditPurchase } from '@/lib/credits/creditService'
import { getStripeOrNull } from '@/lib/stripe/client'

export const dynamic = 'force-dynamic'

// Stripe 한국 표준 수수료 — balance_transaction 을 못 가져왔을 때 폴백.
// (실제 청구된 수수료가 우선이며, 폴백은 보수적으로 환불액을 약간 적게)
const STRIPE_FEE_PERCENT = Number(process.env.STRIPE_FEE_PERCENT || '3.5')
const STRIPE_FEE_FIXED_KRW = Number(process.env.STRIPE_FEE_FIXED_KRW || '300')

const REFUND_WINDOW_DAYS = 7

function formulaFee(amount: number): number {
  return Math.round(amount * (STRIPE_FEE_PERCENT / 100)) + STRIPE_FEE_FIXED_KRW
}

interface RefundResult {
  success: boolean
  refundedKrw: number
  feeWithheld: number
  originalAmount: number
  stripeRefundId: string
  creditsRevoked: number
  alreadyUsedCredits: number
  feeSource: 'balance_transaction' | 'formula'
}

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    if (!context.userId) {
      return apiError(ErrorCodes.UNAUTHORIZED, 'unauthorized')
    }
    const isAdmin = await isAdminUser(context.userId)
    if (!isAdmin) {
      return apiError(ErrorCodes.FORBIDDEN, 'forbidden')
    }

    const body = await req.json().catch(() => ({}))
    const stripePaymentId: string | undefined = body?.stripePaymentId?.trim()
    const force: boolean = body?.force === true

    if (!stripePaymentId) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'stripePaymentId is required')
    }

    const stripe = getStripeOrNull()
    if (!stripe) {
      return apiError(ErrorCodes.INTERNAL_ERROR, 'stripe_not_configured')
    }

    // 1) 구매 기록 조회. select 명시 — schema 신규 컬럼(acknowledgedAt) prod
    // 미적용 시 default SELECT 가 P2022 로 죽는 회귀 차단.
    const purchase = await prisma.bonusCreditPurchase.findFirst({
      where: { stripePaymentId },
      select: {
        id: true,
        userId: true,
        amount: true,
        remaining: true,
        expired: true,
        createdAt: true,
      },
    })

    if (!purchase) {
      return apiError(ErrorCodes.NOT_FOUND, 'purchase_not_found')
    }

    if (purchase.expired) {
      return apiError(ErrorCodes.BAD_REQUEST, 'already_refunded')
    }

    // 2) 자격 검사 (force 시 우회)
    if (!force) {
      const used = purchase.amount - purchase.remaining
      if (used > 0) {
        return apiError(ErrorCodes.BAD_REQUEST, `partially_used (used=${used}/${purchase.amount})`)
      }
      const ageMs = Date.now() - purchase.createdAt.getTime()
      const windowMs = REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000
      if (ageMs > windowMs) {
        return apiError(ErrorCodes.BAD_REQUEST, 'refund_window_expired')
      }
    }

    // 3) Stripe 에서 정확한 결제 금액 + 수수료 조회
    let originalAmount = 0
    let feeWithheld = 0
    let feeSource: 'balance_transaction' | 'formula' = 'formula'

    try {
      const pi = await stripe.paymentIntents.retrieve(stripePaymentId, {
        expand: ['latest_charge.balance_transaction'],
      })
      const charge = pi.latest_charge as Stripe.Charge | null
      const balanceTx = charge?.balance_transaction as Stripe.BalanceTransaction | null

      if (balanceTx && typeof balanceTx === 'object') {
        // balance_transaction.amount/fee 는 결제 통화의 최소 단위 (KRW 는 1원).
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
      logger.error('[admin/refund-credit-pack] failed to fetch payment intent', {
        stripePaymentId,
        err,
      })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'stripe_lookup_failed')
    }

    const refundAmount = Math.max(0, originalAmount - feeWithheld)
    if (refundAmount <= 0) {
      return apiError(ErrorCodes.BAD_REQUEST, 'refund_amount_zero')
    }

    // 4) Stripe 부분 환불 (수수료만큼 차감)
    let stripeRefundId = ''
    try {
      const refund = await stripe.refunds.create(
        {
          payment_intent: stripePaymentId,
          amount: refundAmount,
          reason: 'requested_by_customer',
          metadata: {
            type: 'credit_pack',
            purchaseId: purchase.id,
            feeWithheldKrw: String(feeWithheld),
            feeSource,
            adminUserId: context.userId,
          },
        },
        {
          idempotencyKey: `refund_pack_${purchase.id}`,
        }
      )
      stripeRefundId = refund.id
    } catch (err) {
      logger.error('[admin/refund-credit-pack] stripe refund failed', {
        stripePaymentId,
        err,
      })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'stripe_refund_failed')
    }

    // 5) 크레딧 회수 (charge.refunded 웹훅도 같이 호출되지만 멱등이라 안전)
    const revoke = await revokeBonusCreditPurchase(stripePaymentId)

    logger.info('[admin/refund-credit-pack] success', {
      stripePaymentId,
      adminUserId: context.userId,
      originalAmount,
      refundAmount,
      feeWithheld,
      feeSource,
      creditsRevoked: revoke.reclaimed,
      alreadyUsedCredits: revoke.alreadyUsed,
    })

    const result: RefundResult = {
      success: true,
      refundedKrw: refundAmount,
      feeWithheld,
      originalAmount,
      stripeRefundId,
      creditsRevoked: revoke.reclaimed,
      alreadyUsedCredits: revoke.alreadyUsed,
      feeSource,
    }
    return apiSuccess(result as unknown as Record<string, unknown>)
  },
  createAuthenticatedGuard({
    route: '/api/admin/refund-credit-pack',
    limit: 20,
    windowSeconds: 60,
  })
)
