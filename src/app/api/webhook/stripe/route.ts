import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { prisma } from "@/lib/db/prisma"
import { getPlanFromPriceId, getCreditPackFromPriceId } from "@/lib/payments/prices"
import { getClientIp } from "@/lib/request-ip"
import { captureServerError } from "@/lib/telemetry"
import { recordCounter } from "@/lib/metrics"
import { upgradePlan, addBonusCredits, type PlanType } from "@/lib/credits/creditService"

export const dynamic = "force-dynamic"

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2025-10-29.clover"

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured")
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
  })
}

const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET

async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  })
}

export async function POST(request: Request) {
  const webhookSecret = getWebhookSecret()
  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured")
    captureServerError(new Error("STRIPE_WEBHOOK_SECRET missing"), { route: "/api/webhook/stripe", stage: "config" })
    recordCounter("stripe_webhook_config_error", 1, { reason: "missing_secret" })
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }
  const stripe = getStripe()

  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get("stripe-signature")
  const ip = getClientIp(headersList as unknown as Headers)

  if (!signature) {
    recordCounter("stripe_webhook_auth_error", 1, { reason: "missing_signature" })
    captureServerError(new Error("stripe-signature header missing"), { route: "/api/webhook/stripe", ip })
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[Stripe Webhook] Signature verification failed:", message)
    recordCounter("stripe_webhook_auth_error", 1, { reason: "verify_failed" })
    captureServerError(err, { route: "/api/webhook/stripe", stage: "verify", ip })
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    )
  }

  console.warn(`[Stripe Webhook] Event: ${event.type}`, { ip })

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(subscription)
        break
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentSucceeded(invoice)
        break
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }
      default:
        console.warn(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err)
    recordCounter("stripe_webhook_handler_error", 1, { event: event.type })
    captureServerError(err, { route: "/api/webhook/stripe", event: event.type })
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

// 크레딧팩 구매 완료 처리 (일회성 결제)
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // 크레딧팩 구매인지 확인
  const metadata = session.metadata
  if (metadata?.type !== 'credit_pack') {
    console.log('[Stripe Webhook] Not a credit pack purchase, skipping')
    return
  }

  const creditPack = metadata.creditPack as 'mini' | 'standard' | 'plus' | 'mega' | 'ultimate' | undefined
  const userId = metadata.userId

  if (!creditPack || !userId) {
    console.error('[Stripe Webhook] Missing creditPack or userId in metadata')
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
    console.error(`[Stripe Webhook] Unknown credit pack: ${creditPack}`)
    return
  }

  // 사용자 확인
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    console.error(`[Stripe Webhook] User not found: ${userId}`)
    return
  }

  // 보너스 크레딧 추가
  try {
    await addBonusCredits(userId, creditAmount)
    console.warn(`[Stripe Webhook] Added ${creditAmount} bonus credits to user ${userId} (${creditPack} pack)`)
  } catch (err) {
    console.error('[Stripe Webhook] Failed to add bonus credits:', err)
    throw err
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
  //   console.warn('[Stripe Webhook] Could not save credit purchase record:', err.message)
  // })

  console.warn(`[Stripe Webhook] Credit pack purchase completed: ${userId} bought ${creditPack} (${creditAmount} credits)`)
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const stripe = getStripe()
  const customerId = subscription.customer as string
  const customer = await stripe.customers.retrieve(customerId)

  if (customer.deleted) {
    console.error("[Stripe Webhook] Customer deleted")
    return
  }

  const email = (customer as Stripe.Customer).email
  if (!email) {
    console.error("[Stripe Webhook] Customer has no email")
    return
  }

  const user = await findUserByEmail(email)
  if (!user) {
    console.error(`[Stripe Webhook] User not found for email: ${email}`)
    return
  }

  const priceId = subscription.items.data[0]?.price.id || ""
  const planInfo = getPlanFromPriceId(priceId)
  if (!planInfo) {
    console.error("[Stripe Webhook] Price not whitelisted", { priceId })
    return
  }
  const { plan, billingCycle } = planInfo

  const periodStart = (subscription as any).current_period_start as number | undefined
  const periodEnd = (subscription as any).current_period_end as number | undefined

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
    console.warn(`[Stripe Webhook] Credits upgraded for user ${user.id}: ${plan}`)
  } catch (creditErr) {
    console.error(`[Stripe Webhook] Failed to upgrade credits:`, creditErr)
  }

  console.warn(`[Stripe Webhook] Subscription created for user ${user.id}: ${plan} (${billingCycle})`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!existing) {
    await handleSubscriptionCreated(subscription)
    return
  }

  const priceId = subscription.items.data[0]?.price.id || ""
  const planInfo = getPlanFromPriceId(priceId)
  const plan = planInfo?.plan ?? existing.plan
  const billingCycle = planInfo?.billingCycle ?? existing.billingCycle

  const periodStart = (subscription as any).current_period_start as number | undefined
  const periodEnd = (subscription as any).current_period_end as number | undefined
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
  if (existing.plan !== plan && subscription.status === "active") {
    try {
      await upgradePlan(existing.userId, plan as PlanType)
      console.warn(`[Stripe Webhook] Credits upgraded for plan change: ${existing.plan} -> ${plan}`)
    } catch (creditErr) {
      console.error(`[Stripe Webhook] Failed to upgrade credits:`, creditErr)
    }
  }

  console.warn(`[Stripe Webhook] Subscription updated: ${subscription.id} -> ${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!existing) {
    console.warn(`[Stripe Webhook] Subscription not found: ${subscription.id}`)
    return
  }

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: "canceled",
      canceledAt: new Date(),
    },
  })

  // 구독 취소 시 free 플랜으로 다운그레이드
  try {
    await upgradePlan(existing.userId, "free")
    console.warn(`[Stripe Webhook] Credits downgraded to free for user ${existing.userId}`)
  } catch (creditErr) {
    console.error(`[Stripe Webhook] Failed to downgrade credits:`, creditErr)
  }

  console.warn(`[Stripe Webhook] Subscription canceled: ${subscription.id}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as any
  const subscriptionId = typeof invoiceAny.subscription === "string" ? invoiceAny.subscription : invoiceAny.subscription?.id
  if (!subscriptionId) return

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (existing) {
    const paymentIntentId = typeof invoiceAny.payment_intent === "string"
      ? invoiceAny.payment_intent
      : invoiceAny.payment_intent?.id
    const paymentMethod = paymentIntentId
      ? await getPaymentMethodType(paymentIntentId)
      : null

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: "active",
        paymentMethod,
      },
    })
  }

  console.warn(`[Stripe Webhook] Payment succeeded for subscription: ${subscriptionId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const invoiceAny = invoice as any
  const subscriptionId = typeof invoiceAny.subscription === "string" ? invoiceAny.subscription : invoiceAny.subscription?.id
  if (!subscriptionId) return

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (existing) {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: "past_due",
      },
    })
  }

  console.warn(`[Stripe Webhook] Payment failed for subscription: ${subscriptionId}`)
}

async function getPaymentMethodType(paymentIntentId: string): Promise<string | null> {
  try {
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const paymentMethodId = paymentIntent.payment_method as string
    if (!paymentMethodId) return null

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
    return paymentMethod.type // card, kakao_pay, etc.
  } catch {
    return null
  }
}
