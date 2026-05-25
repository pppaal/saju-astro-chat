import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware } from '@/lib/api/middleware'
import Stripe from 'stripe'
import { prisma } from '@/lib/db/prisma'
import { captureServerError } from '@/lib/telemetry'
import { recordCounter } from '@/lib/metrics'
import { addBonusCredits } from '@/lib/credits/creditService'
import { grantReferralRewardOnFirstPurchase } from '@/lib/referral'
import { CREDIT_PACKS } from '@/lib/config/pricing'
import { sendPaymentReceiptEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { HTTP_STATUS as _HTTP_STATUS } from '@/lib/constants/http'

export const dynamic = 'force-dynamic'

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2025-10-29.clover'

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
  })
}

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
    const stripe = getStripe()

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
        default:
          // 구독 폐지 — 크레딧팩 일회성 결제(checkout.session.completed)만 처리한다.
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

  // 보너스 크레딧 추가
  try {
    await addBonusCredits(userId, creditAmount)
    logger.info(
      `[Stripe Webhook] Added ${creditAmount} bonus credits to user ${userId} (${creditPack} pack)`
    )
  } catch (err) {
    logger.error('[Stripe Webhook] Failed to add bonus credits:', err)
    throw err
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
        `[Stripe Webhook] Referral reward granted to ${reward.referrerId} (+${reward.creditsAwarded}) for first purchase by ${userId}`
      )
    }
  } catch (err) {
    logger.error('[Stripe Webhook] Failed to grant referral reward:', err)
  }
}
