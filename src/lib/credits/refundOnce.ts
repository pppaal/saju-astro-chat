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
  // transactionId(차감된 CONSUME 트랜잭션 id)가 있으면 discriminator 로 포함해,
  // 같은 시간·같은 파라미터의 *서로 다른* 차감이 같은 키로 충돌해 두 번째 환불이
  // 누락되는 것을 막는다(환불 누락 방지). 없으면 기존처럼 시간 버킷으로 rapid
  // 중복만 합친다.
  const bucket = Math.floor(Date.now() / SYNTH_BUCKET_MS)
  // JSON 직렬화로 각 필드를 인용/이스케이프해, free-form 필드(reason/apiRoute/
  // transactionId)에 ':' 가 들어와도 delimiter 경계를 옮겨 서로 다른 환불이 같은
  // 키로 뭉개지지 않도록 한다. (raw ':'-join 은 apiRoute='a',txn='b:c' 와
  // apiRoute='a:b',txn='c' 가 같은 문자열이 돼 두 번째 환불이 조용히 누락됐다.)
  const material = JSON.stringify([
    params.userId,
    params.creditType,
    params.reason,
    params.amount,
    params.apiRoute ?? '',
    params.transactionId ?? '',
    bucket,
  ])
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
  const scopedKey = idempotencyKey ? `refund:${idempotencyKey}` : synthesizeRefundKey(params)
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
    // 일시적 DB 블립일 수 있다 — marker 없이 곧장 환불하면 같은 turn 의 다른
    // 실패 경로도 똑같이 marker 없이 환불해 이중 환불 창이 열린다. 결정 전에
    // create 를 1회만 더 시도해 대부분의 블립을 흡수하고 dedupe 를 보존한다.
    try {
      await prisma.requestIdempotencyLog.create({ data: { scopedKey, expiresAt } })
    } catch (err2) {
      const code2 = (err2 as { code?: string } | undefined)?.code
      if (code2 === 'P2002') {
        logger.info('[refundOnce] already refunded (post-retry), skipping', {
          scopedKey,
          reason: params.reason,
        })
        return false
      }
      // 두 번 다 실패(지속적 DB 장애) — bias toward refunding (드문 이중 환불이
      // 무음 과금보다 낫다는 기존 정책 유지). reconciliation 이 잡도록 크게 로그.
      logger.warn('[refundOnce] claim failed after retry, refunding without dedupe', {
        scopedKey,
        err: err2 instanceof Error ? err2.message : String(err2),
      })
      return refundCredits(params)
    }
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
