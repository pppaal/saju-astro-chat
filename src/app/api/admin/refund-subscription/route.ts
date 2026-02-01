import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { isAdminUser } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";
import { getUserCredits } from "@/lib/credits/creditService";
import { logger } from "@/lib/logger";
import { captureServerError } from "@/lib/telemetry";
import { sanitizeError } from "@/lib/security/errorSanitizer";
import { rateLimit } from "@/lib/rateLimit";
import { logAdminAction } from "@/lib/auth/adminAudit";
import { csrfGuard } from "@/lib/security/csrf";
import { BASE_CREDIT_PRICE_KRW } from "@/lib/config/pricing";

import { parseRequestBody } from '@/lib/api/requestParser';
import { HTTP_STATUS } from '@/lib/constants/http';
const STRIPE_API_VERSION: Stripe.LatestApiVersion = "2025-10-29.clover";
// Use centralized pricing constant for refund calculations
const MINI_CREDIT_PRICE_KRW = BASE_CREDIT_PRICE_KRW;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
}

function json(data: unknown, status: number = HTTP_STATUS.OK) {
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
  if (!latestInvoice) {return null;}
  if (typeof latestInvoice === "string") {
    return stripe.invoices.retrieve(latestInvoice, { expand: ["payment_intent"] });
  }
  return latestInvoice as Stripe.Invoice;
}

async function resolvePaymentIntent(stripe: Stripe, invoice: Stripe.Invoice) {
  const paymentIntent = invoice.payment_intent;
  if (!paymentIntent) {return null;}
  if (typeof paymentIntent === "string") {
    return stripe.paymentIntents.retrieve(paymentIntent, {
      expand: ["latest_charge"],
    });
  }
  return paymentIntent as Stripe.PaymentIntent;
}

async function resolveCharge(stripe: Stripe, paymentIntent: Stripe.PaymentIntent) {
  const latestCharge = paymentIntent.latest_charge;
  if (!latestCharge) {return null;}
  if (typeof latestCharge === "string") {
    return stripe.charges.retrieve(latestCharge, {
      expand: ["balance_transaction"],
    });
  }
  return latestCharge as Stripe.Charge;
}

async function resolveStripeFee(stripe: Stripe, charge: Stripe.Charge | null) {
  if (!charge) {return 0;}
  const balance = charge.balance_transaction;
  if (!balance) {return 0;}
  if (typeof balance === "string") {
    const tx = await stripe.balanceTransactions.retrieve(balance);
    return tx.fee || 0;
  }
  return (balance as Stripe.BalanceTransaction).fee || 0;
}

export async function POST(req: Request) {
  // 🔒 CSRF Protection (before any logic)
  const csrfError = csrfGuard(req.headers);
  if (csrfError) {
    logger.warn('[AdminRefund] CSRF validation failed');
    return csrfError;
  }

  const session = await getServerSession(authOptions);
  const adminEmail = session?.user?.email || "unknown";
  const adminUserId = session?.user?.id;

  // 🔒 IP와 User-Agent 수집 (감사 로그용)
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userAgent = req.headers.get('user-agent') || undefined;

  try {
    // ✨ NEW: DB 기반 Admin 권한 체크
    if (!adminUserId || !(await isAdminUser(adminUserId))) {
      await logAdminAction({
        adminEmail,
        adminUserId,
        action: "refund_attempt_unauthorized",
        success: false,
        errorMessage: "User is not an admin",
        ipAddress,
        userAgent,
      });
      return json({ error: "Unauthorized" }, HTTP_STATUS.UNAUTHORIZED);
    }

    // Rate limiting for admin actions: max 10 refunds per hour per admin
    const rlKey = `admin-refund:${adminEmail}`;
    const limit = await rateLimit(rlKey, { limit: 10, windowSeconds: 3600 });
    if (!limit.allowed) {
      await logAdminAction({
        adminEmail,
        adminUserId,
        action: "refund_rate_limited",
        metadata: {
          remaining: limit.remaining,
          reset: limit.reset,
        },
        success: false,
        errorMessage: "Rate limit exceeded",
        ipAddress,
        userAgent,
      });
      return json({ error: "Too many refund requests. Please try again later." }, HTTP_STATUS.RATE_LIMITED);
    }

    const body = await parseRequestBody<{ subscriptionId?: string; email?: string }>(req, { context: 'Admin Refund-subscription' });
    const subscriptionId =
      typeof body?.subscriptionId === "string" ? body.subscriptionId.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";

    if (!subscriptionId && !email) {
      return json({ error: "subscriptionId or email is required" }, HTTP_STATUS.BAD_REQUEST);
    }

    const stripe = getStripe();
    const subscription = await resolveSubscription(
      stripe,
      subscriptionId || undefined,
      email || undefined
    );

    const invoice = await resolveInvoice(stripe, subscription);
    if (!invoice) {
      return json({ error: "No invoice found for subscription" }, HTTP_STATUS.BAD_REQUEST);
    }

    const paymentIntent = await resolvePaymentIntent(stripe, invoice);
    if (!paymentIntent) {
      return json({ error: "No payment intent found for invoice" }, HTTP_STATUS.BAD_REQUEST);
    }

    const charge = await resolveCharge(stripe, paymentIntent);
    const stripeFee = await resolveStripeFee(stripe, charge);

    const amountPaid = invoice.amount_paid ?? paymentIntent.amount_received ?? 0;
    if (amountPaid <= 0) {
      return json({ error: "No paid amount found for subscription" }, HTTP_STATUS.BAD_REQUEST);
    }

    const currency = (invoice.currency || paymentIntent.currency || "krw").toLowerCase();
    if (currency !== "krw") {
      return json({ error: "Only KRW refunds are supported" }, HTTP_STATUS.BAD_REQUEST);
    }

    const dbSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { userId: true },
    });
    if (!dbSubscription) {
      return json({ error: "Subscription not found in database" }, HTTP_STATUS.NOT_FOUND);
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

    const customerEmail =
      typeof subscription.customer === "object"
        ? (subscription.customer as Stripe.Customer).email
        : null;

    // ✨ Audit log for successful refund (DB 기반)
    await logAdminAction({
      adminEmail,
      adminUserId,
      action: "refund_completed",
      targetType: "subscription",
      targetId: subscription.id,
      metadata: {
        subscriptionId: subscription.id,
        customerEmail,
        amountPaid,
        refundAmount,
        usedCredits,
        creditDeduction,
        stripeFee,
        refundId: refund?.id ?? null,
        currency,
      },
      success: true,
      ipAddress,
      userAgent,
    });

    return json({
      subscriptionId: subscription.id,
      customerId: subscription.customer ? String(subscription.customer) : null,
      customerEmail,
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
    logger.error("[AdminRefund] Failed:", { error: err });
    captureServerError(err as Error, { route: "/api/admin/refund-subscription" });
    const sanitized = sanitizeError(err, 'internal');

    // ✨ Audit log for failed refund (DB 기반)
    await logAdminAction({
      adminEmail,
      adminUserId,
      action: "refund_failed",
      metadata: {
        error: err instanceof Error ? err.message : "Unknown error",
        body: await req.clone().json().catch(() => null),
      },
      success: false,
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      ipAddress,
      userAgent,
    });

    return json(sanitized, HTTP_STATUS.SERVER_ERROR);
  }
}
