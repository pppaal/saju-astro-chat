import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware } from '@/lib/api/middleware'
import Stripe from 'stripe'
import { prisma } from '@/lib/db/prisma'
import { getPlanFromPriceId } from '@/lib/payments/prices'
import { captureServerError } from '@/lib/telemetry'
import { recordCounter } from '@/lib/metrics'
import { upgradePlan, addBonusCredits, type PlanType } from '@/lib/credits/creditService'
import {
  sendPaymentReceiptEmail,
  sendSubscriptionConfirmEmail,
  sendSubscriptionCancelledEmail,
  sendPaymentFailedEmail,
} from '@/lib/email'
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

async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })
}

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
        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionCreated(subscription)
          break
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionUpdated(subscription)
          break
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionDeleted(subscription)
          break
        }
        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice
          await handlePaymentSucceeded(invoice)
          break
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          await handlePaymentFailed(invoice)
          break
        }
        default:
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

  // 크레딧 수량 매핑
  const CREDIT_PACK_AMOUNTS: Record<string, number> = {
    mini: 5,
    standard: 15,
    plus: 40,
    mega: 100,
    ultimate: 250,
  }

  const creditAmount = CREDIT_PACK_AMOUNTS[creditPack]
  if (!creditAmount) {
    logger.error(`[Stripe Webhook] Unknown credit pack: ${creditPack}`)
    return
  }

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
    const packNames: Record<string, string> = {
      mini: 'Mini (5 Credits)',
      standard: 'Standard (15 Credits)',
      plus: 'Plus (40 Credits)',
      mega: 'Mega (100 Credits)',
      ultimate: 'Ultimate (250 Credits)',
    }
    sendPaymentReceiptEmail(userId, user.email, {
      userName: user.name || undefined,
      amount: session.amount_total || 0,
      currency: session.currency || 'krw',
      productName: packNames[creditPack] || `${creditPack} Credit Pack`,
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
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const stripe = getStripe()
  const customerId = subscription.customer as string
  const customer = await stripe.customers.retrieve(customerId)

  if (customer.deleted) {
    logger.error('[Stripe Webhook] Customer deleted')
    return
  }

  const email = (customer as Stripe.Customer).email
  if (!email) {
    logger.error('[Stripe Webhook] Customer has no email')
    return
  }

  const user = await findUserByEmail(email)
  if (!user) {
    logger.error(`[Stripe Webhook] User not found for email: ${email}`)
    return
  }

  const priceId = subscription.items.data[0]?.price.id || ''
  const planInfo = getPlanFromPriceId(priceId)
  if (!planInfo) {
    logger.error('[Stripe Webhook] Price not whitelisted', { priceId })
    return
  }
  const { plan, billingCycle } = planInfo

  const periodStart = subscription.current_period_start
  const periodEnd = subscription.current_period_end

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    update: {
      status: subscription.status,
      plan,
      billingCycle,
      stripePriceId: priceId,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
    create: {
      userId: user.id,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      status: subscription.status,
      plan,
      billingCycle,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  })

  // 크레딧 시스템 업그레이드
  try {
    await upgradePlan(user.id, plan as PlanType)
    logger.info(`[Stripe Webhook] Credits upgraded for user ${user.id}: ${plan}`)
  } catch (creditErr) {
    logger.error(`[Stripe Webhook] Failed to upgrade credits:`, creditErr)
  }

  // 구독 확인 이메일 발송
  if (email) {
    const nextBillingDate = periodEnd
      ? new Date(periodEnd * 1000).toLocaleDateString('ko-KR')
      : undefined
    sendSubscriptionConfirmEmail(user.id, email, {
      userName: user.name || undefined,
      planName: plan,
      billingCycle,
      nextBillingDate,
    }).catch((err) => {
      logger.error('[Stripe Webhook] Failed to send subscription confirm email:', err)
    })
  }

  logger.info(
    `[Stripe Webhook] Subscription created for user ${user.id}: ${plan} (${billingCycle})`
  )
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!existing) {
    await handleSubscriptionCreated(subscription)
    return
  }

  const priceId = subscription.items.data[0]?.price.id || ''
  const planInfo = getPlanFromPriceId(priceId)
  const plan = planInfo?.plan ?? existing.plan
  const billingCycle = planInfo?.billingCycle ?? existing.billingCycle

  const periodStart = subscription.current_period_start
  const periodEnd = subscription.current_period_end
  const canceledAt = subscription.canceled_at

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status,
      plan,
      billingCycle,
      stripePriceId: priceId || existing.stripePriceId,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: canceledAt ? new Date(canceledAt * 1000) : null,
    },
  })

  // 플랜 변경 시 크레딧 업그레이드
  if (existing.plan !== plan && subscription.status === 'active') {
    try {
      await upgradePlan(existing.userId, plan as PlanType)
      logger.info(`[Stripe Webhook] Credits upgraded for plan change: ${existing.plan} -> ${plan}`)
    } catch (creditErr) {
      logger.error(`[Stripe Webhook] Failed to upgrade credits:`, creditErr)
    }
  }

  logger.info(`[Stripe Webhook] Subscription updated: ${subscription.id} -> ${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!existing) {
    logger.warn(`[Stripe Webhook] Subscription not found: ${subscription.id}`)
    return
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: 'canceled',
      canceledAt: new Date(),
    },
  })

  // 구독 취소 시 free 플랜으로 다운그레이드
  try {
    await upgradePlan(existing.userId, 'free')
    logger.info(`[Stripe Webhook] Credits downgraded to free for user ${existing.userId}`)
  } catch (creditErr) {
    logger.error(`[Stripe Webhook] Failed to downgrade credits:`, creditErr)
  }

  // 구독 취소 이메일 발송
  const user = await prisma.user.findUnique({
    where: { id: existing.userId },
    select: { email: true, name: true },
  })
  if (user?.email) {
    sendSubscriptionCancelledEmail(existing.userId, user.email, {
      userName: user.name || undefined,
      planName: existing.plan,
    }).catch((err) => {
      logger.error('[Stripe Webhook] Failed to send subscription cancelled email:', err)
    })
  }

  logger.info(`[Stripe Webhook] Subscription canceled: ${subscription.id}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
  if (!subscriptionId) {
    return
  }

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (existing) {
    const paymentIntentId =
      typeof invoice.payment_intent === 'string'
        ? invoice.payment_intent
        : invoice.payment_intent?.id
    const paymentMethod = paymentIntentId ? await getPaymentMethodType(paymentIntentId) : null

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: 'active',
        paymentMethod,
      },
    })
  }

  logger.info(`[Stripe Webhook] Payment succeeded for subscription: ${subscriptionId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
  if (!subscriptionId) {
    return
  }

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (existing) {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: 'past_due',
      },
    })

    // 결제 실패 이메일 발송
    const user = await prisma.user.findUnique({
      where: { id: existing.userId },
      select: { email: true, name: true },
    })
    if (user?.email) {
      sendPaymentFailedEmail(existing.userId, user.email, {
        userName: user.name || undefined,
        planName: existing.plan,
      }).catch((err) => {
        logger.error('[Stripe Webhook] Failed to send payment failed email:', err)
      })
    }
  }

  logger.warn(`[Stripe Webhook] Payment failed for subscription: ${subscriptionId}`)
}

async function getPaymentMethodType(paymentIntentId: string): Promise<string | null> {
  try {
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const paymentMethodId = paymentIntent.payment_method as string
    if (!paymentMethodId) {
      return null
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
    return paymentMethod.type // card, kakao_pay, etc.
  } catch {
    return null
  }
}
