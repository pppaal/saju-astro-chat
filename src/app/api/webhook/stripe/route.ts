import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware } from '@/lib/api/middleware'
import Stripe from 'stripe'
import { prisma } from '@/lib/db/prisma'
import { captureServerError } from '@/lib/telemetry'
import { recordCounter } from '@/lib/metrics'
import { addBonusCredits, revokeBonusCreditPurchase } from '@/lib/credits/creditService'
import { grantReferralRewardOnFirstPurchase } from '@/lib/referral'
import { CREDIT_PACKS } from '@/lib/config/pricing'
import { sendPaymentReceiptEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { HTTP_STATUS as _HTTP_STATUS } from '@/lib/constants/http'
import { getStripeOrThrow } from '@/lib/stripe/client'

export const dynamic = 'force-dynamic'

const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET

export const POST = withApiMiddleware(
  async (request: NextRequest, context) => {
    const webhookSecret = getWebhookSecret()
    if (!webhookSecret) {
      logger.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured')
      captureServerError(new Error('STRIPE_WEBHOOK_SECRET missing'), {
        route: '/api/webhook/stripe',
        stage: 'config',
      })
      recordCounter('stripe_webhook_config_error', 1, { reason: 'missing_secret' })
      return createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Webhook secret not configured',
        route: 'webhook/stripe',
      })
    }
    const stripe = getStripeOrThrow()

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    const ip = context.ip || 'unknown'

    if (!signature) {
      recordCounter('stripe_webhook_auth_error', 1, { reason: 'missing_signature' })
      captureServerError(new Error('stripe-signature header missing'), {
        route: '/api/webhook/stripe',
        ip,
      })
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Missing stripe-signature header',
        route: 'webhook/stripe',
      })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: unknown) {
      const internalMessage = err instanceof Error ? err.message : 'Unknown error'
      logger.error('[Stripe Webhook] Signature verification failed:', { message: internalMessage })
      recordCounter('stripe_webhook_auth_error', 1, { reason: 'verify_failed' })
      captureServerError(err, { route: '/api/webhook/stripe', stage: 'verify', ip })
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Webhook signature verification failed',
        route: 'webhook/stripe',
      })
    }

    logger.info(`[Stripe Webhook] Event: ${event.type}`, { eventId: event.id, ip })

    // 🔒 타임스탬프 검증: 5분 이상 오래된 이벤트는 거부 (Replay Attack 방지)
    const eventAgeSeconds = Math.floor(Date.now() / 1000) - event.created
    if (eventAgeSeconds > 300) {
      logger.warn(`[Stripe Webhook] Stale event rejected (age: ${eventAgeSeconds}s)`, {
        eventId: event.id,
        type: event.type,
      })
      recordCounter('stripe_webhook_stale_event', 1, { event: event.type })
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Event too old',
        route: 'webhook/stripe',
      })
    }

    // 🔒 멱등성 체크: 원자적으로 처리 시도 (Race Condition 방지)
    try {
      // 먼저 이벤트 레코드를 생성하여 락을 획득 (unique constraint)
      await prisma.stripeEventLog.create({
        data: {
          eventId: event.id,
          type: event.type,
          success: false, // 처리 시작 전 상태
          metadata: {
            livemode: event.livemode,
            apiVersion: event.api_version,
          },
        },
      })
    } catch (err: unknown) {
      // P2002: Unique constraint violation (이미 처리 중이거나 완료)
      if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
        const existingEvent = await prisma.stripeEventLog.findUnique({
          where: { eventId: event.id },
        })

        if (existingEvent?.success) {
          logger.info(`[Stripe Webhook] Event already processed: ${event.id}`, {
            type: event.type,
            processedAt: existingEvent.processedAt,
          })
          recordCounter('stripe_webhook_duplicate', 1, { event: event.type })
          return NextResponse.json({ received: true, duplicate: true })
        }

        // 실패한 이벤트는 재처리 허용하지 않음 (별도 retry 로직 필요)
        logger.warn(`[Stripe Webhook] Event processing in progress or failed: ${event.id}`)
        return NextResponse.json({ received: true, duplicate: true })
      }
      throw err
    }

    try {
      // 이벤트 처리
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          await handleCheckoutCompleted(session)
          break
        }
        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge
          await handleChargeRefunded(charge)
          break
        }
        default:
          // 구독 폐지 — 크레딧팩 일회성 결제(checkout.session.completed)와
          // 환불(charge.refunded)만 처리한다.
          logger.warn(`[Stripe Webhook] Unhandled event type: ${event.type}`)
      }

      // ✅ 성공: 이벤트 처리 완료 기록
      await prisma.stripeEventLog.update({
        where: { eventId: event.id },
        data: {
          success: true,
          errorMsg: null,
          processedAt: new Date(),
        },
      })

      return NextResponse.json({ received: true })
    } catch (err: unknown) {
      const internalMessage = err instanceof Error ? err.message : 'Unknown error'
      logger.error(`[Stripe Webhook] Error handling ${event.type}:`, err)
      recordCounter('stripe_webhook_handler_error', 1, { event: event.type })
      captureServerError(err, { route: '/api/webhook/stripe', event: event.type })

      // ❌ 실패: 이벤트 처리 실패 기록 (재처리 가능하도록)
      try {
        const existingAfter = await prisma.stripeEventLog.findUnique({
          where: { eventId: event.id },
        })
        if (existingAfter?.success) {
          logger.info(`[Stripe Webhook] Event succeeded elsewhere: ${event.id}`, {
            type: event.type,
            processedAt: existingAfter.processedAt,
          })
          return NextResponse.json({ received: true, duplicate: true })
        }

        await prisma.stripeEventLog.upsert({
          where: { eventId: event.id },
          update: {
            success: false,
            errorMsg: internalMessage,
            processedAt: new Date(),
            metadata: {
              livemode: event.livemode,
              apiVersion: event.api_version,
              error: internalMessage,
            },
          },
          create: {
            eventId: event.id,
            type: event.type,
            success: false,
            errorMsg: internalMessage,
            metadata: {
              livemode: event.livemode,
              apiVersion: event.api_version,
              error: internalMessage,
            },
          },
        })
      } catch (logErr) {
        logger.error('[Stripe Webhook] Failed to log error event:', logErr)
      }

      return createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Internal Server Error',
        route: 'webhook/stripe',
        originalError: err instanceof Error ? err : new Error(String(err)),
      })
    }
  },
  { route: 'webhook/stripe', skipCsrf: true }
)

// 크레딧팩 구매 완료 처리 (일회성 결제)
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // 크레딧팩 구매인지 확인
  const metadata = session.metadata
  if (metadata?.type !== 'credit_pack') {
    logger.debug('[Stripe Webhook] Not a credit pack purchase, skipping')
    return
  }

  const creditPack = metadata.creditPack as
    | 'mini'
    | 'standard'
    | 'plus'
    | 'mega'
    | 'ultimate'
    | undefined
  const userId = metadata.userId

  if (!creditPack || !userId) {
    logger.error('[Stripe Webhook] Missing creditPack or userId in metadata')
    return
  }

  // 크레딧 수량 — 단일 진실원(CREDIT_PACKS)에서 파생. webhook 에 별도
  // 하드코딩하면 가격표와 어긋나 잘못된 크레딧이 지급될 수 있음.
  const pack = CREDIT_PACKS[creditPack]
  if (!pack) {
    logger.error(`[Stripe Webhook] Unknown credit pack: ${creditPack}`)
    return
  }
  const creditAmount = pack.credits

  // 사용자 확인
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    logger.error(`[Stripe Webhook] User not found: ${userId}`)
    return
  }

  // Stripe 결제 ID — 환불(charge.refunded) 시 BonusCreditPurchase 를
  // 찾아 잔여 크레딧을 회수하는 매칭 키. 저장 안 하면 환불 보호 불가.
  const paymentIntentId =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
  // 보너스 크레딧 추가 — addBonusCredits 는 BonusCreditPurchase +
  // UserCredits update 를 한 transaction 으로 처리(데이터 일관성 보장)하고,
  // stripePaymentId 에 DB 레벨 unique 가 걸려있어 같은 결제로 두 번째
  // 호출이 오면 P2002 가 발생한다. 그 경우 이미 1차에서 크레딧이 들어갔다는
  // 뜻이므로 silent skip (멱등성). 그 외 에러만 상위로 던져 webhook 이
  // 재시도되도록 한다.
  try {
    await addBonusCredits(userId, creditAmount, 'purchase', paymentIntentId)
    logger.info(
      `[Stripe Webhook] Added ${creditAmount} bonus credits to user ${userId} (${creditPack} pack)`
    )
  } catch (err) {
    const isDuplicate =
      err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'P2002'
    if (isDuplicate) {
      logger.info(
        `[Stripe Webhook] Duplicate purchase webhook ignored: payment=${paymentIntentId} (already credited)`
      )
      recordCounter('stripe_webhook_purchase_duplicate', 1, { pack: creditPack })
      return
    }
    logger.error('[Stripe Webhook] Failed to add bonus credits:', err)
    throw err
  }

  // out-of-order webhook race 처리 — charge.refunded 가 이 webhook 전에
  // 도착해서 PendingCreditRevocation 에 기록돼 있다면 즉시 회수 + 정리.
  // 어느 순서로 도착해도 최종 상태 동일.
  if (paymentIntentId) {
    try {
      const pending = await prisma.pendingCreditRevocation.findUnique({
        where: { stripePaymentIntentId: paymentIntentId },
      })
      if (pending) {
        const revokeResult = await revokeBonusCreditPurchase(paymentIntentId)
        await prisma.pendingCreditRevocation.delete({ where: { id: pending.id } })
        logger.warn(
          `[Stripe Webhook] Applied queued refund after late purchase webhook: payment=${paymentIntentId} reclaimed=${revokeResult.reclaimed}`
        )
        recordCounter('stripe_webhook_late_purchase_revocation_applied', 1)
      }
    } catch (err) {
      logger.error('[Stripe Webhook] Failed to apply queued refund revocation:', err)
    }
  }

  // 결제 완료 이메일 발송
  if (user.email) {
    const productName = `${creditPack.charAt(0).toUpperCase()}${creditPack.slice(1)} (${creditAmount} Credits)`
    sendPaymentReceiptEmail(userId, user.email, {
      userName: user.name || undefined,
      amount: session.amount_total || 0,
      currency: session.currency || 'krw',
      productName,
      transactionId: session.id,
    }).catch((err) => {
      logger.error('[Stripe Webhook] Failed to send payment receipt email:', err)
    })
  }

  // 구매 기록 저장 (선택사항) - CreditPurchase 모델이 스키마에 없음
  // await prisma.creditPurchase.create({
  //   data: {
  //     userId,
  //     pack: creditPack,
  //     credits: creditAmount,
  //     amount: session.amount_total || 0,
  //     currency: session.currency || 'krw',
  //     stripeSessionId: session.id,
  //     status: 'completed',
  //   },
  // }).catch((err) => {
  //   logger.warn('[Stripe Webhook] Could not save credit purchase record:', err.message)
  // })

  logger.info(
    `[Stripe Webhook] Credit pack purchase completed: ${userId} bought ${creditPack} (${creditAmount} credits)`
  )

  // 추천 보상은 피추천자의 '첫 결제' 시점에만 지급(멀티 계정 파밍 방지).
  // pending 보상이 있으면 추천인에게 1회 지급된다.
  try {
    const reward = await grantReferralRewardOnFirstPurchase(userId)
    if (reward.granted) {
      logger.info(
        `[Stripe Webhook] Referral reward granted to ${reward.referrerId} (+${reward.creditsAwarded}) for first purchase by ${userId}` +
          (reward.refereeBonusGranted
            ? ` — referee bonus +${reward.refereeBonusCredits} granted`
            : '')
      )
    }
  } catch (err) {
    logger.error('[Stripe Webhook] Failed to grant referral reward:', err)
  }
}

// 환불 처리 — Stripe 가 환불(전체/부분)을 처리한 charge 가 들어오면 매칭된
// 크레딧팩 구매의 잔여 크레딧을 회수해 사용자가 환불받은 돈으로 계속
// 쓰지 못하게 막는다. 부분 환불도 안전하게 보수적으로(잔여 전부 회수)
// 처리한다 — 부분 환불은 통상 어드민 수동 처리뿐이고, 회수가 과해도
// 다시 발급하면 됨.
async function handleChargeRefunded(charge: Stripe.Charge) {
  // amount_refunded === 0 인 경우(이벤트 노이즈) 스킵.
  if (!charge.amount_refunded || charge.amount_refunded <= 0) {
    return
  }

  const paymentIntentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id

  if (!paymentIntentId) {
    logger.warn('[Stripe Webhook] charge.refunded without payment_intent', { chargeId: charge.id })
    return
  }

  const result = await revokeBonusCreditPurchase(paymentIntentId)
  if (result.revoked) {
    logger.info(
      `[Stripe Webhook] Revoked refunded purchase: payment=${paymentIntentId} reclaimed=${result.reclaimed} alreadyUsed=${result.alreadyUsed}`
    )
    return
  }

  // revoked:false 케이스 — 두 가지:
  //   (a) 매칭 BonusCreditPurchase 가 아직 없음 (Stripe 가 webhook 순서를
  //       못 지켜서 charge.refunded 가 checkout.session.completed 보다
  //       먼저 도착) → PendingCreditRevocation 에 기록해서 purchase webhook
  //       이 도착할 때 즉시 회수되게 함.
  //   (b) 이미 만료/회수된 purchase (중복 webhook). 멱등 — 아무 액션 X.
  // 구분: purchase 존재 여부.
  const existingPurchase = await prisma.bonusCreditPurchase.findFirst({
    where: { stripePaymentId: paymentIntentId },
    select: { id: true },
  })

  if (existingPurchase) {
    // (b) 이미 처리됨 — 멱등.
    logger.info(
      `[Stripe Webhook] Refund webhook for already-revoked purchase: payment=${paymentIntentId}`
    )
    return
  }

  // (a) Purchase webhook 이 늦게 도착할 케이스 — 24h 만료로 큐.
  try {
    await prisma.pendingCreditRevocation.upsert({
      where: { stripePaymentIntentId: paymentIntentId },
      create: {
        stripePaymentIntentId: paymentIntentId,
        refundAmountCents: charge.amount_refunded,
        currency: charge.currency || null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      update: {},
    })
    logger.warn(
      `[Stripe Webhook] Refund arrived before purchase — queued PendingCreditRevocation: payment=${paymentIntentId}`
    )
    recordCounter('stripe_webhook_refund_before_purchase', 1)
  } catch (err) {
    logger.error('[Stripe Webhook] Failed to queue PendingCreditRevocation:', err)
  }
}
