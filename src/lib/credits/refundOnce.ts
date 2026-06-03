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

import { createHash } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { refundCredits, type CreditRefundParams } from './creditRefund'

const REFUND_IDEM_TTL_MS = 24 * 60 * 60 * 1000 // 24h

// Coarse time bucket for synthesized keys: refunds with identical params landing
// in the same wall-clock hour collapse to one. Wide enough to swallow retry
// storms, narrow enough that a genuinely-new refund an hour later still goes
// through. (See header note re: synthesized-key tradeoffs.)
const SYNTH_BUCKET_MS = 60 * 60 * 1000 // 1h

/**
 * Build a deterministic dedupe key for the no-idempotency-key path.
 *
 * Derived from the refund's identifying params plus a coarse hourly time bucket,
 * so a rapid double-call with identical params dedupes, while different params
 * (or the same params an hour later) each get their own claim.
 */
function synthesizeRefundKey(params: CreditRefundParams): string {
  const bucket = Math.floor(Date.now() / SYNTH_BUCKET_MS)
  const material = [
    params.userId,
    params.creditType,
    params.reason,
    params.amount,
    params.apiRoute ?? '',
    bucket,
  ].join(':')
  return `synth:${createHash('sha256').update(material).digest('hex').slice(0, 32)}`
}

/**
 * Refund a charged credit at most once for the given idempotency key.
 *
 * @param idempotencyKey  Stable per-turn key (e.g. `compat:<userId>:<turnId>`).
 *   When null/empty we have no turn-level key, so we SYNTHESIZE a deterministic
 *   one from the refund params plus a coarse hourly bucket — liberal retries
 *   with identical params still dedupe within the window instead of skipping
 *   dedup entirely (callers should still pass a key whenever a turnId exists).
 * @returns true if a refund was performed, false if it was skipped as a dupe.
 */
export async function refundCreditsOnce(
  idempotencyKey: string | null | undefined,
  params: CreditRefundParams
): Promise<boolean> {
  // Keyed path: use the caller key verbatim. No-key path: fall back to a
  // synthesized, params-derived key so the previously-undeduped path still
  // collapses rapid double-calls.
  const scopedKey = idempotencyKey
    ? `refund:${idempotencyKey}`
    : synthesizeRefundKey(params)
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
