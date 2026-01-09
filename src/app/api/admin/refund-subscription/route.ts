import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { isAdminEmail } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";
import { getUserCredits } from "@/lib/credits/creditService";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/telemetry";

const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2025-10-29.clover";
const MINI_CREDIT_PRICE_KRW = 633;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

async function resolveSubscription(stripe: Stripe, subscriptionId?: string, email?: string) {
  if (subscriptionId) {
    return stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice.payment_intent", "customer"],
    });
  }

  if (!email) {
    throw new Error("subscriptionId or email is required");
  }

  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) {
    throw new Error("No Stripe customer found for email");
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customer.id,
    limit: 1,
    status: "all",
  });

  const subscription = subscriptions.data[0];
  if (!subscription) {
    throw new Error("No subscription found for customer");
  }

  return stripe.subscriptions.retrieve(subscription.id, {
    expand: ["latest_invoice.payment_intent", "customer"],
  });
}

async function resolveInvoice(stripe: Stripe, subscription: Stripe.Subscription) {
  const latestInvoice = subscription.latest_invoice;
  if (!latestInvoice) return null;
  if (typeof latestInvoice === "string") {
    return stripe.invoices.retrieve(latestInvoice, { expand: ["payment_intent"] });
  }
  return latestInvoice as Stripe.Invoice;
}

async function resolvePaymentIntent(stripe: Stripe, invoice: Stripe.Invoice) {
  const paymentIntent = (invoice as any).payment_intent;
  if (!paymentIntent) return null;
  if (typeof paymentIntent === "string") {
    return stripe.paymentIntents.retrieve(paymentIntent, {
      expand: ["latest_charge"],
    });
  }
  return paymentIntent as Stripe.PaymentIntent;
}

async function resolveCharge(stripe: Stripe, paymentIntent: Stripe.PaymentIntent) {
  const latestCharge = paymentIntent.latest_charge;
  if (!latestCharge) return null;
  if (typeof latestCharge === "string") {
    return stripe.charges.retrieve(latestCharge, {
      expand: ["balance_transaction"],
    });
  }
  return latestCharge as Stripe.Charge;
}

async function resolveStripeFee(stripe: Stripe, charge: Stripe.Charge | null) {
  if (!charge) return 0;
  const balance = charge.balance_transaction;
  if (!balance) return 0;
  if (typeof balance === "string") {
    const tx = await stripe.balanceTransactions.retrieve(balance);
    return tx.fee || 0;
  }
  return (balance as Stripe.BalanceTransaction).fee || 0;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!isAdminEmail(session?.user?.email)) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    const subscriptionId =
      typeof body?.subscriptionId === "string" ? body.subscriptionId.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!subscriptionId && !email) {
      return json({ error: "subscriptionId or email is required" }, 400);
    }

    const stripe = getStripe();
    const subscription = await resolveSubscription(
      stripe,
      subscriptionId || undefined,
      email || undefined
    );

    const invoice = await resolveInvoice(stripe, subscription);
    if (!invoice) {
      return json({ error: "No invoice found for subscription" }, 400);
    }

    const paymentIntent = await resolvePaymentIntent(stripe, invoice);
    if (!paymentIntent) {
      return json({ error: "No payment intent found for invoice" }, 400);
    }

    const charge = await resolveCharge(stripe, paymentIntent);
    const stripeFee = await resolveStripeFee(stripe, charge);

    const amountPaid = invoice.amount_paid ?? paymentIntent.amount_received ?? 0;
    if (amountPaid <= 0) {
      return json({ error: "No paid amount found for subscription" }, 400);
    }

    const currency = (invoice.currency || paymentIntent.currency || "krw").toLowerCase();
    if (currency !== "krw") {
      return json({ error: "Only KRW refunds are supported" }, 400);
    }

    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { userId: true },
    });
    if (!dbSubscription) {
      return json({ error: "Subscription not found in database" }, 404);
    }

    const credits = await getUserCredits(dbSubscription.userId);
    const usedCredits = Math.max(0, credits.usedCredits || 0);
    const creditDeduction = usedCredits * MINI_CREDIT_PRICE_KRW;
    const refundAmount = Math.max(0, amountPaid - creditDeduction - stripeFee);

    let refund: Stripe.Refund | null = null;
    if (refundAmount > 0) {
      refund = await stripe.refunds.create({
        payment_intent: paymentIntent.id,
        amount: refundAmount,
        reason: "requested_by_customer",
      });
    }

    const canceled = await stripe.subscriptions.cancel(subscription.id);

    return json({
      subscriptionId: subscription.id,
      customerId: subscription.customer ? String(subscription.customer) : null,
      customerEmail:
        typeof subscription.customer === "object"
          ? (subscription.customer as Stripe.Customer).email
          : null,
      amountPaid,
      currency,
      usedCredits,
      creditDeduction,
      stripeFee,
      refundAmount,
      refunded: Boolean(refund),
      refundId: refund?.id ?? null,
      canceled: canceled.status === "canceled",
    });
  } catch (err: unknown) {
    logger.error("[AdminRefund] Failed:", err as any);
    captureServerError(err as Error, { route: "/api/admin/refund-subscription" });
    const message = err instanceof Error ? err.message : "Unknown error";
    return json({ error: message }, 500);
  }
}
