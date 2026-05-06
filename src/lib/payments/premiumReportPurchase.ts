// src/lib/payments/premiumReportPurchase.ts
//
// Helpers for the PremiumReportPurchase lifecycle:
//   pending → paid → consumed | expired
//
// Both the Stripe webhook (`checkout.session.completed`) and the
// post-checkout redeem endpoint can call `markPurchasePaid()`. Both paths
// MUST be idempotent — the unique index on `stripeSessionId` is the source
// of truth.

import { prisma } from '@/lib/db/prisma'
import type { PremiumReportSku } from './prices'

/**
 * Default redemption windows. Counted from `paidAt` (i.e. when Stripe
 * confirmed payment), not from purchase creation.
 *   monthly  : 30 days  — bought to cover a month, generation should be soon
 *   yearly   : 60 days  — slightly longer because the report is for the year
 *   lifetime : null     — no expiry
 */
const REDEMPTION_WINDOW_DAYS: Record<PremiumReportSku, number | null> = {
  monthly: 30,
  yearly: 60,
  lifetime: null,
}

export function computeExpiryFromPaidAt(
  sku: PremiumReportSku,
  paidAt: Date
): Date | null {
  const days = REDEMPTION_WINDOW_DAYS[sku]
  if (days === null) return null
  const expiry = new Date(paidAt)
  expiry.setDate(expiry.getDate() + days)
  return expiry
}

export interface MarkPurchasePaidInput {
  userId: string
  sku: PremiumReportSku
  stripeSessionId: string
  stripePriceId?: string
  stripePaymentId?: string
  amountPaid?: number
  currency?: string
  paidAt?: Date
}

/**
 * Idempotent: creates a PremiumReportPurchase row in 'paid' state for the
 * given Stripe session, or returns the existing row when called again.
 * The unique constraint on stripeSessionId guarantees no duplicates even
 * under racing webhook + redeem flows.
 */
export async function markPurchasePaid(input: MarkPurchasePaidInput) {
  const paidAt = input.paidAt ?? new Date()
  const expiresAt = computeExpiryFromPaidAt(input.sku, paidAt)

  return prisma.premiumReportPurchase.upsert({
    where: { stripeSessionId: input.stripeSessionId },
    update: {
      // Only flip to 'paid' if still pending; never downgrade from 'consumed'.
      status: 'paid',
      paidAt,
      expiresAt,
      stripePriceId: input.stripePriceId ?? undefined,
      stripePaymentId: input.stripePaymentId ?? undefined,
      amountPaid: input.amountPaid ?? undefined,
      currency: input.currency ?? undefined,
    },
    create: {
      userId: input.userId,
      sku: input.sku,
      status: 'paid',
      stripeSessionId: input.stripeSessionId,
      stripePriceId: input.stripePriceId,
      stripePaymentId: input.stripePaymentId,
      amountPaid: input.amountPaid,
      currency: input.currency,
      paidAt,
      expiresAt,
    },
  })
}

/**
 * Looks up a purchase by Stripe session id. Used by the redeem endpoint to
 * verify a user actually paid before generating the report.
 */
export function findPurchaseBySessionId(stripeSessionId: string) {
  return prisma.premiumReportPurchase.findUnique({
    where: { stripeSessionId },
  })
}

/**
 * Marks a purchase as consumed and pins it to the generated DestinyMatrixReport.
 * Returns null if the purchase row was already consumed (race) or expired.
 */
export async function markPurchaseConsumed(
  purchaseId: string,
  consumedReportId: string
) {
  const now = new Date()
  const result = await prisma.premiumReportPurchase.updateMany({
    where: {
      id: purchaseId,
      status: 'paid',
    },
    data: {
      status: 'consumed',
      consumedAt: now,
      consumedReportId,
    },
  })
  return result.count > 0
}

export function isExpired(purchase: { expiresAt: Date | null; status: string }): boolean {
  if (purchase.status !== 'paid') return false
  if (!purchase.expiresAt) return false
  return purchase.expiresAt.getTime() < Date.now()
}

export function mapPeriodToSku(period: 'monthly' | 'yearly' | 'comprehensive'): PremiumReportSku {
  if (period === 'monthly') return 'monthly'
  if (period === 'yearly') return 'yearly'
  return 'lifetime'
}

export function mapSkuToPeriod(sku: PremiumReportSku): 'monthly' | 'yearly' | 'comprehensive' {
  if (sku === 'monthly') return 'monthly'
  if (sku === 'yearly') return 'yearly'
  return 'comprehensive'
}
