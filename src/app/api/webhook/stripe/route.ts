import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Plan ID 매핑
function getPlanFromPriceId(priceId: string): { plan: string; billingCycle: string } {
  const priceMap: Record<string, { plan: string; billingCycle: string }> = {
    // 월간
    [process.env.STRIPE_PRICE_BASIC_MONTHLY || ""]: { plan: "basic", billingCycle: "monthly" },
    [process.env.STRIPE_PRICE_PREMIUM_MONTHLY || ""]: { plan: "premium", billingCycle: "monthly" },
    // 연간
    [process.env.STRIPE_PRICE_BASIC_ANNUAL || ""]: { plan: "basic", billingCycle: "annual" },
    [process.env.STRIPE_PRICE_PREMIUM_ANNUAL || ""]: { plan: "premium", billingCycle: "annual" },
  };

  return priceMap[priceId] || { plan: "basic", billingCycle: "monthly" };
}

// 사용자 찾기 (이메일로)
async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function POST(request: Request) {
  if (!webhookSecret) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  console.log(`[Stripe Webhook] Event: ${event.type}`);

  try {
    switch (event.type) {
      // 구독 생성됨
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCreated(subscription);
        break;
      }

      // 구독 업데이트됨
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      // 구독 취소됨
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      // 결제 성공
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      // 결제 실패
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

// 구독 생성 처리
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId);

  if (customer.deleted) {
    console.error("[Stripe Webhook] Customer deleted");
    return;
  }

  const email = (customer as Stripe.Customer).email;
  if (!email) {
    console.error("[Stripe Webhook] Customer has no email");
    return;
  }

  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`[Stripe Webhook] User not found for email: ${email}`);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id || "";
  const { plan, billingCycle } = getPlanFromPriceId(priceId);

  // Stripe Subscription 타입에서 필드 추출
  const sub = subscription as any;
  const periodStart = sub.current_period_start;
  const periodEnd = sub.current_period_end;

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
  });

  console.log(`[Stripe Webhook] Subscription created for user ${user.id}: ${plan} (${billingCycle})`);
}

// 구독 업데이트 처리
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const existing = await (prisma as any).subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existing) {
    // 새 구독이면 생성 처리
    await handleSubscriptionCreated(subscription);
    return;
  }

  const priceId = subscription.items.data[0]?.price.id || "";
  const { plan, billingCycle } = getPlanFromPriceId(priceId);

  // Stripe Subscription 타입에서 필드 추출
  const sub = subscription as any;
  const periodStart = sub.current_period_start;
  const periodEnd = sub.current_period_end;
  const canceledAt = sub.canceled_at;

  await (prisma as any).subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status,
      plan,
      billingCycle,
      stripePriceId: priceId,
      currentPeriodStart: periodStart ? new Date(periodStart * 1000) : null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: canceledAt ? new Date(canceledAt * 1000) : null,
    },
  });

  console.log(`[Stripe Webhook] Subscription updated: ${subscription.id} -> ${subscription.status}`);
}

// 구독 삭제 처리
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const existing = await (prisma as any).subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!existing) {
    console.log(`[Stripe Webhook] Subscription not found: ${subscription.id}`);
    return;
  }

  await (prisma as any).subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: "canceled",
      canceledAt: new Date(),
    },
  });

  console.log(`[Stripe Webhook] Subscription canceled: ${subscription.id}`);
}

// 결제 성공 처리
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const inv = invoice as any;
  const subscriptionId = inv.subscription as string;
  if (!subscriptionId) return;

  const existing = await (prisma as any).subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (existing) {
    // 결제 방법 업데이트
    const paymentMethod = inv.payment_intent
      ? await getPaymentMethodType(inv.payment_intent as string)
      : null;

    await (prisma as any).subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: "active",
        paymentMethod,
      },
    });
  }

  console.log(`[Stripe Webhook] Payment succeeded for subscription: ${subscriptionId}`);
}

// 결제 실패 처리
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const inv = invoice as any;
  const subscriptionId = inv.subscription as string;
  if (!subscriptionId) return;

  const existing = await (prisma as any).subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (existing) {
    await (prisma as any).subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: "past_due",
      },
    });
  }

  console.log(`[Stripe Webhook] Payment failed for subscription: ${subscriptionId}`);
}

// 결제 방법 타입 가져오기
async function getPaymentMethodType(paymentIntentId: string): Promise<string | null> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const paymentMethodId = paymentIntent.payment_method as string;
    if (!paymentMethodId) return null;

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    return paymentMethod.type; // card, kakao_pay, etc.
  } catch {
    return null;
  }
}
