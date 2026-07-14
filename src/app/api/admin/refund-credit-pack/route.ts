import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import {
  withApiMiddleware,
  createAdminGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { logAdminAction } from '@/lib/auth/adminAudit'
import {
  claimBonusPurchaseForRefund,
  rollbackBonusPurchaseRefundClaim,
} from '@/lib/credits/creditService'
import { reverseReferralRewardOnRefund } from '@/lib/referral'
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
    const adminUserId = context.userId!
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
        expiresAt: true,
        createdAt: true,
      },
    })

    if (!purchase) {
      return apiError(ErrorCodes.NOT_FOUND, 'purchase_not_found')
    }

    if (purchase.expired) {
      return apiError(ErrorCodes.BAD_REQUEST, 'already_refunded')
    }

    // BonusCreditPurchase has no cascade from User, so a deleted user
    // leaves the purchase row behind but takes their UserCredits row
    // with it. revokeBonusCreditPurchase below would then update zero
    // UserCredits rows silently and the admin would see a misleading
    // 'success' response while the local DB still believed the bonus
    // was outstanding. Surface the drift explicitly instead.
    const userCreditsExists = await prisma.userCredits.findUnique({
      where: { userId: purchase.userId },
      select: { userId: true },
    })
    if (!userCreditsExists) {
      logger.warn('[admin/refund-credit-pack] user credits missing — likely deleted user', {
        stripePaymentId,
        purchaseUserId: purchase.userId,
      })
      return apiError(
        ErrorCodes.BAD_REQUEST,
        'user_credits_missing — refund the Stripe charge directly in the dashboard'
      )
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

    // 4) 원자적 claim + 회수 — Stripe 환불 *전에*. me/refund-credit-pack 과
    // 동일한 TOCTOU 방어: 직전엔 자격검사(L102)가 stale read 였고 Stripe 왕복
    // (수초) 동안 사용자가 크레딧을 쓰면 L179 revoke 가 줄어든 remaining 만 회수해
    // 현금 전액 환불 + 크레딧 일부 잔존 누수가 났다. 여기서 조건부 updateMany 로
    // "기대한 remaining 그대로"일 때만 원자적으로 pack 을 만료시켜 이후 소비를
    // 막고 같은 트랜잭션에서 회수한다. non-force 는 완전 미사용(remaining===amount)
    // 만, force 는 현재 remaining 을 그대로 회수 대상으로(부분 사용 pack 도 환불).
    // count!==1 이면 그 사이 소비/이미 환불 → 현금 미이동 거부.
    // claim+reclaim/rollback 은 me/refund-credit-pack 과 공유하는 단일 출처
    // (creditService). non-force 는 완전 미사용(expectedRemaining=amount)만, force
    // 는 현재 remaining 을 그대로 회수 대상으로(부분 사용 pack 도 환불). admin 은
    // source 가드 없음(어떤 pack 이든 환불 도구).
    const amount = purchase.amount
    const expectedRemaining = force ? purchase.remaining : amount
    const reclaimed = expectedRemaining
    const alreadyUsed = amount - expectedRemaining
    let claimed = false
    try {
      const res = await claimBonusPurchaseForRefund({
        purchaseId: purchase.id,
        ownerUserId: purchase.userId,
        amount,
        expectedRemaining,
        reason: 'admin_refund',
        initiatedBy: 'admin',
        sourceRef: stripePaymentId,
        actorUserId: adminUserId,
      })
      claimed = res.claimed
    } catch (err) {
      logger.error('[admin/refund-credit-pack] claim+reclaim failed', { stripePaymentId, err })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'refund_claim_failed')
    }
    if (!claimed) {
      return apiError(ErrorCodes.BAD_REQUEST, 'partially_used_or_already_refunded')
    }

    // 5) Stripe 부분 환불. 회수를 이미 원자적으로 끝냈으므로 환불액-회수량이
    // 항상 일치(누수 없음). 환불 실패 시 claim 을 롤백해 "크레딧만 뺏기는" 상태
    // 방지(pack 복원 + 잔액 재지급).
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
            adminUserId,
          },
        },
        {
          idempotencyKey: `refund_pack_${purchase.id}`,
        }
      )
      stripeRefundId = refund.id
    } catch (err) {
      logger.error('[admin/refund-credit-pack] stripe refund failed — rolling back claim', {
        stripePaymentId,
        err,
      })
      try {
        await rollbackBonusPurchaseRefundClaim({
          purchaseId: purchase.id,
          ownerUserId: purchase.userId,
          reclaimed,
          restoreRemaining: expectedRemaining,
          restoreExpiresAt: purchase.expiresAt,
          reason: 'admin_refund_rollback',
          initiatedBy: 'admin',
          sourceRef: stripePaymentId,
          actorUserId: adminUserId,
        })
      } catch (rollbackErr) {
        logger.error('[admin/refund-credit-pack] CRITICAL: claim rollback failed', {
          stripePaymentId,
          purchaseUserId: purchase.userId,
          reclaimed,
          rollbackErr,
        })
      }
      return apiError(ErrorCodes.INTERNAL_ERROR, 'stripe_refund_failed')
    }

    // 추천 보상 역전 — 이 구매(purchase.userId 소유)가 트리거한 first_purchase
    // 추천 보상이 있으면 추천인+피추천인 referral 크레딧을 회수한다. anti-fraud
    // 부가 작업이라 실패해도 (완료된) 환불을 되돌리지 않는다 — log 후 진행.
    try {
      await reverseReferralRewardOnRefund(purchase.userId, stripePaymentId)
    } catch (err) {
      logger.error('[admin/refund-credit-pack] referral reversal failed', {
        stripePaymentId,
        purchaseUserId: purchase.userId,
        err,
      })
    }

    logger.info('[admin/refund-credit-pack] success', {
      stripePaymentId,
      adminUserId,
      originalAmount,
      refundAmount,
      feeWithheld,
      feeSource,
      creditsRevoked: reclaimed,
      alreadyUsedCredits: alreadyUsed,
    })

    // Persistent audit trail. Failures here are swallowed inside
    // logAdminAction; the refund itself has already happened on Stripe.
    await logAdminAction({
      adminEmail: context.session?.user?.email || '',
      adminUserId,
      action: 'refund_credit_pack',
      targetType: 'bonus_credit_purchase',
      targetId: stripePaymentId,
      metadata: {
        originalAmount,
        refundAmount,
        feeWithheld,
        feeSource,
        stripeRefundId,
        creditsRevoked: reclaimed,
        alreadyUsedCredits: alreadyUsed,
      },
      success: true,
      ipAddress: context.ip,
      userAgent: req.headers.get('user-agent') || undefined,
    })

    const result: RefundResult = {
      success: true,
      refundedKrw: refundAmount,
      feeWithheld,
      originalAmount,
      stripeRefundId,
      creditsRevoked: reclaimed,
      alreadyUsedCredits: alreadyUsed,
      feeSource,
    }
    return apiSuccess(result as unknown as Record<string, unknown>)
  },
  createAdminGuard({
    route: '/api/admin/refund-credit-pack',
    limit: 20,
    windowSeconds: 60,
  })
)
