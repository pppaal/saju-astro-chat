// Idempotent credit refund.
//
// refundCredits() is not idempotent — calling it twice refunds twice. To make
// the billing flow fail-safe ("if anything goes wrong, give the credit back"),
// every failure path in a streaming route may call refund. This wrapper makes
// that safe: a given idempotencyKey (derived from the turn id) refunds AT MOST
// once, so liberal refunding can never double-refund.
//
// Storage: the existing RequestIdempotencyLog table (atomic create; a unique
// `scopedKey` collision => P2002 => already refunded). No migration needed —
// same mechanism the charge-idempotency / draw-nonce stores use.

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { refundCredits, type CreditRefundParams } from './creditRefund'

const REFUND_IDEM_TTL_MS = 24 * 60 * 60 * 1000 // 24h

/**
 * Refund a charged credit at most once for the given idempotency key.
 *
 * @param idempotencyKey  Stable per-turn key (e.g. `compat:<userId>:<turnId>`).
 *   When null/empty we can't dedupe, so we fall back to a single best-effort
 *   refund (callers should pass a key whenever a turnId is available).
 * @returns true if a refund was performed, false if it was skipped as a dupe.
 */
export async function refundCreditsOnce(
  idempotencyKey: string | null | undefined,
  params: CreditRefundParams
): Promise<boolean> {
  if (!idempotencyKey) {
    // No key → no dedupe possible. Better to refund (fail-safe) than to skip.
    return refundCredits(params)
  }

  const scopedKey = `refund:${idempotencyKey}`
  const expiresAt = new Date(Date.now() + REFUND_IDEM_TTL_MS)

  // Claim the refund atomically. First claim wins → perform refund. A unique
  // collision (P2002) means this turn was already refunded → skip.
  try {
    await prisma.requestIdempotencyLog.create({ data: { scopedKey, expiresAt } })
  } catch (err) {
    const code = (err as { code?: string } | undefined)?.code
    if (code === 'P2002') {
      logger.info('[refundOnce] already refunded, skipping', { scopedKey, reason: params.reason })
      return false
    }
    // Couldn't claim the marker (DB hiccup). Bias toward refunding — a rare
    // double-refund is less harmful than silently overcharging. Log loudly.
    logger.warn('[refundOnce] claim failed, refunding without dedupe', {
      scopedKey,
      err: err instanceof Error ? err.message : String(err),
    })
    return refundCredits(params)
  }

  // We own the claim → perform the refund. If it throws, release the claim so
  // a later retry can still refund (never leave a "claimed but not refunded"
  // turn, which would be a silent overcharge).
  try {
    return await refundCredits(params)
  } catch (err) {
    await prisma.requestIdempotencyLog.delete({ where: { scopedKey } }).catch(() => {})
    throw err
  }
}
