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
import {
  claimBonusPurchaseForRefund,
  rollbackBonusPurchaseRefundClaim,
} from '@/lib/credits/creditService'
import { reverseReferralRewardOnRefund } from '@/lib/referral'
import { getStripeOrNull } from '@/lib/stripe/client'

export const dynamic = 'force-dynamic'

const STRIPE_FEE_PERCENT = Number(process.env.STRIPE_FEE_PERCENT || '3.5')
const STRIPE_FEE_FIXED_KRW = Number(process.env.STRIPE_FEE_FIXED_KRW || '300')
const REFUND_WINDOW_DAYS = 7

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

    // 1) 사용자 본인 구매만 조회 (소유권 + 자격 검증). select 명시 — schema
    // 신규 컬럼 prod 미적용 환경에서 default SELECT 가 죽는 회귀 차단.
    const purchase = await prisma.bonusCreditPurchase.findFirst({
      where: { id: purchaseId, userId: context.userId },
      select: {
        id: true,
        userId: true,
        amount: true,
        remaining: true,
        expired: true,
        expiresAt: true,
        source: true,
        createdAt: true,
        stripePaymentId: true,
      },
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

    const stripe = getStripeOrNull()
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

    // 3) 원자적 claim + 회수 — Stripe 환불 *전에* 수행한다. 직전엔 위 자격검사
    // (remaining===amount) 가 stale read 였고, Stripe 왕복(수초) 동안 사용자가
    // 다른 탭에서 보너스 크레딧을 쓰면 remaining 이 줄어든 채로 L150 revoke 가
    // "회수시점 remaining" 만 거둬, 현금은 전액 환불 + 크레딧 일부는 그대로
    // 남는 누수(TOCTOU)가 있었다. 여기서 조건부 updateMany 로 "아직 완전 미사용"
    // 일 때만 원자적으로 pack 을 만료(expired) 처리해 이후 소비 FIFO 가 이 pack
    // 을 못 고르게 막고, 같은 트랜잭션에서 잔액(bonusCredits)에서 전량 회수한다.
    // count!==1 이면 그 사이 누가 썼거나 이미 환불된 것 → 현금 한 푼 안 움직이고
    // 거부.
    // claim+reclaim/rollback 은 admin/refund-credit-pack 과 공유하는 단일 출처
    // (creditService). me/ 는 "완전 미사용"만 환불하므로 expectedRemaining=amount,
    // source='purchase' 가드.
    const amount = purchase.amount
    const stripePaymentId = purchase.stripePaymentId
    let claimed = false
    try {
      const res = await claimBonusPurchaseForRefund({
        purchaseId: purchase.id,
        ownerUserId: context.userId!,
        amount,
        expectedRemaining: amount,
        reason: 'self_refund',
        initiatedBy: 'self',
        sourceRef: stripePaymentId,
        requireSourcePurchase: true,
      })
      claimed = res.claimed
    } catch (err) {
      logger.error('[me/refund-credit-pack] claim+reclaim failed', { purchaseId, err })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'refund_claim_failed')
    }
    if (!claimed) {
      // 그 사이 일부 사용됐거나 이미 환불됨 — 현금 미이동.
      return apiError(ErrorCodes.BAD_REQUEST, 'partially_used_or_already_refunded')
    }

    // 4) Stripe partial refund (수수료 차감). 이 시점엔 크레딧을 이미 원자적으로
    // 회수했으므로 환불액과 회수량이 항상 일치한다(누수 없음). 환불이 실패하면
    // 사용자가 "크레딧만 뺏기고 현금은 못 받는" 상태가 되지 않도록 위 claim 을
    // 되돌린다(pack 복원 + 잔액 재지급).
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
      logger.error('[me/refund-credit-pack] stripe refund failed — rolling back claim', {
        purchaseId,
        err,
      })
      try {
        await rollbackBonusPurchaseRefundClaim({
          purchaseId: purchase.id,
          ownerUserId: context.userId!,
          reclaimed: amount,
          restoreRemaining: amount,
          restoreExpiresAt: purchase.expiresAt,
          reason: 'self_refund_rollback',
          initiatedBy: 'self',
          sourceRef: stripePaymentId,
        })
      } catch (rollbackErr) {
        // 롤백까지 실패 — 드문 이중 DB 장애. 수동 정합성 복구가 필요하므로
        // 강한 로그를 남긴다(현금은 환불 안 됨, 크레딧은 회수된 상태).
        logger.error('[me/refund-credit-pack] CRITICAL: claim rollback failed', {
          purchaseId,
          userId: context.userId,
          amount,
          stripePaymentId,
          rollbackErr,
        })
      }
      return apiError(ErrorCodes.INTERNAL_ERROR, 'stripe_refund_failed')
    }

    // 추천 보상 역전 — 이 구매가 트리거한 first_purchase 추천 보상이 있으면
    // 추천인+피추천인 referral 크레딧을 회수한다(구매 환불 → 보상 회수, 파밍 차단).
    // anti-fraud 부가 작업이라 실패해도 (이미 완료된) 현금·크레딧 환불을 되돌리지
    // 않는다 — log 후 진행. reverse 함수는 멱등(completed→reversed).
    try {
      await reverseReferralRewardOnRefund(context.userId!, stripePaymentId)
    } catch (err) {
      logger.error('[me/refund-credit-pack] referral reversal failed', { purchaseId, err })
    }

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
      creditsRevoked: amount,
    })
  },
  createAuthenticatedGuard({
    route: '/api/me/refund-credit-pack',
    // 어뷰징 방지 — 분당 5회 (정상 사용자는 한두 번이면 충분)
    limit: 5,
    windowSeconds: 60,
  })
)
