import { NextResponse } from "next/server"
import { headers } from "next/headers"
import Stripe from "stripe"
import { prisma } from "@/lib/db/prisma"
import { getPlanFromPriceId } from "@/lib/payments/prices"
import { getClientIp } from "@/lib/request-ip"
import { captureServerError } from "@/lib/telemetry"
import { recordCounter } from "@/lib/metrics"
import { upgradePlan, type PlanType } from "@/lib/credits/creditService"

export const dynamic = "force-dynamic"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any,
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  })
}

export async function POST(request: Request) {
  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured")
    captureServerError(new Error("STRIPE_WEBHOOK_SECRET missing"), { route: "/api/webhook/stripe", stage: "config" })
    recordCounter("stripe_webhook_config_error", 1, { reason: "missing_secret" })
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    )
  }

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
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message)
    recordCounter("stripe_webhook_auth_error", 1, { reason: "verify_failed" })
    captureServerError(err, { route: "/api/webhook/stripe", stage: "verify", ip })
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    )
  }

  console.log(`[Stripe Webhook] Event: ${event.type}`, { ip })

  try {
    switch (event.type) {
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
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err)
    recordCounter("stripe_webhook_handler_error", 1, { event: event.type })
    captureServerError(err, { route: "/api/webhook/stripe", event: event.type })
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
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

  const sub = subscription as any
  const periodStart = sub.current_period_start
  const periodEnd = sub.current_period_end

  await (prisma as any).subscription.upsert({
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
    console.log(`[Stripe Webhook] Credits upgraded for user ${user.id}: ${plan}`)
  } catch (creditErr) {
    console.error(`[Stripe Webhook] Failed to upgrade credits:`, creditErr)
  }

  console.log(`[Stripe Webhook] Subscription created for user ${user.id}: ${plan} (${billingCycle})`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const existing = await (prisma as any).subscription.findUnique({
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

  const sub = subscription as any
  const periodStart = sub.current_period_start
  const periodEnd = sub.current_period_end
  const canceledAt = sub.canceled_at

  await (prisma as any).subscription.update({
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
      console.log(`[Stripe Webhook] Credits upgraded for plan change: ${existing.plan} -> ${plan}`)
    } catch (creditErr) {
      console.error(`[Stripe Webhook] Failed to upgrade credits:`, creditErr)
    }
  }

  console.log(`[Stripe Webhook] Subscription updated: ${subscription.id} -> ${subscription.status}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const existing = await (prisma as any).subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  })

  if (!existing) {
    console.log(`[Stripe Webhook] Subscription not found: ${subscription.id}`)
    return
  }

  await (prisma as any).subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: "canceled",
      canceledAt: new Date(),
    },
  })

  // 구독 취소 시 free 플랜으로 다운그레이드
  try {
    await upgradePlan(existing.userId, "free")
    console.log(`[Stripe Webhook] Credits downgraded to free for user ${existing.userId}`)
  } catch (creditErr) {
    console.error(`[Stripe Webhook] Failed to downgrade credits:`, creditErr)
  }

  console.log(`[Stripe Webhook] Subscription canceled: ${subscription.id}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const inv = invoice as any
  const subscriptionId = inv.subscription as string
  if (!subscriptionId) return

  const existing = await (prisma as any).subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (existing) {
    const paymentMethod = inv.payment_intent
      ? await getPaymentMethodType(inv.payment_intent as string)
      : null

    await (prisma as any).subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: "active",
        paymentMethod,
      },
    })
  }

  console.log(`[Stripe Webhook] Payment succeeded for subscription: ${subscriptionId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const inv = invoice as any
  const subscriptionId = inv.subscription as string
  if (!subscriptionId) return

  const existing = await (prisma as any).subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (existing) {
    await (prisma as any).subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: "past_due",
      },
    })
  }

  console.log(`[Stripe Webhook] Payment failed for subscription: ${subscriptionId}`)
}

async function getPaymentMethodType(paymentIntentId: string): Promise<string | null> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    const paymentMethodId = paymentIntent.payment_method as string
    if (!paymentMethodId) return null

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
    return paymentMethod.type // card, kakao_pay, etc.
  } catch {
    return null
  }
}
