import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

/**
 * 만료된 멱등/취소-큐 행 정리.
 *
 * RequestIdempotencyLog 는 유료 turn·draw-nonce·refund-claim 마다 한 행씩(분할로
 * 두 행씩) 쌓이고 expiresAt(보통 6h) 이 지나도 자체로는 안 지워진다 — release()/
 * delete() 는 실패 경로에서만 단건 삭제하므로, 정상 처리된 행은 영구 누적된다.
 * 누적되면 핫 머니 경로(create-as-lock claim)의 인덱스/쓰기가 느려진다.
 * PendingCreditRevocation 도 매칭 구매가 끝내 안 온 환불-선도착 행이 만료 후
 * 방치된다. 둘 다 expiresAt 인덱스가 있어 만료분 batch 삭제가 싸다.
 *
 * BonusCreditPurchase.expiresAt 은 *크레딧 풀*이라 여기서 절대 건드리지 않는다
 * (그건 expireBonusCredits 가 expired 플래그로 처리).
 */
export async function sweepExpiredIdempotency(now: Date = new Date()): Promise<{
  idempotencyDeleted: number
  revocationDeleted: number
}> {
  let idempotencyDeleted = 0
  let revocationDeleted = 0

  try {
    const r = await prisma.requestIdempotencyLog.deleteMany({ where: { expiresAt: { lt: now } } })
    idempotencyDeleted = r.count
  } catch (err) {
    logger.error('[sweepExpiredIdempotency] requestIdempotencyLog sweep failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  try {
    const r = await prisma.pendingCreditRevocation.deleteMany({ where: { expiresAt: { lt: now } } })
    revocationDeleted = r.count
  } catch (err) {
    logger.error('[sweepExpiredIdempotency] pendingCreditRevocation sweep failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  return { idempotencyDeleted, revocationDeleted }
}
