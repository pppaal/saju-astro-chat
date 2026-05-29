/**
 * scripts/backfill-credit-transactions.ts
 *
 * 일회성 백필 — 기존 BonusCreditPurchase / CreditRefundLog / AdminAuditLog
 * 행들을 CreditTransaction 으로 옮긴다. deploy 직후 한 번 실행한다.
 *
 * 멱등성: 각 source 행에 대해 CreditTransaction 이 이미 존재하는지 sourceRef
 * 로 확인. 있으면 skip. 같은 백필을 여러 번 돌려도 중복 행이 안 생긴다.
 *
 * 한계 — 과거 CONSUME 이력은 복원 불가능:
 *   - usedCredits / compatibilityUsed / followUpUsed 는 누적 카운터라
 *     "언제 얼마씩 차감됐는지" 정보가 없음.
 *   - BonusCreditPurchase 의 (amount - remaining) 으로 "이 구매에서 몇 개
 *     소진됐는지" 는 알 수 있지만, "언제·왜" 까지는 모름.
 * 따라서 백필은 GRANT / REFUND / (admin) GRANT 만 채운다. CONSUME 의 audit 은
 * deploy 시점 이후의 데이터만 정확. 그 이전에 발생한 CONSUME 은 영영
 * 보고서에 빠지지만, 잔액 (UserCredits) 자체는 정확하다.
 *
 * 실행: `tsx scripts/backfill-credit-transactions.ts`
 */

import { prisma } from '../src/lib/db/prisma'

type Counters = {
  bonusPurchaseGrants: number
  refundRows: number
  adminGrantRows: number
  skipped: number
}

async function backfillBonusPurchaseGrants(counters: Counters): Promise<void> {
  // BonusCreditPurchase → GRANT 한 행.
  // sourceRef 우선순위: stripePaymentId (있으면) → purchase.id.
  const purchases = await prisma.bonusCreditPurchase.findMany({
    select: {
      id: true,
      userId: true,
      amount: true,
      source: true,
      stripePaymentId: true,
      createdAt: true,
      expiresAt: true,
    },
  })

  for (const p of purchases) {
    const sourceRef = p.stripePaymentId ?? p.id
    // 멱등성 — sourceRef + type=GRANT 가 이미 있으면 skip.
    const existing = await prisma.creditTransaction.findFirst({
      where: { sourceRef, type: 'GRANT', userId: p.userId },
      select: { id: true },
    })
    if (existing) {
      counters.skipped += 1
      continue
    }

    await prisma.creditTransaction.create({
      data: {
        userId: p.userId,
        type: 'GRANT',
        pool: 'BONUS',
        amount: p.amount,
        reason: `grant_${p.source}`,
        sourceRef,
        metadata: {
          backfilled: true,
          purchaseId: p.id,
          stripePaymentId: p.stripePaymentId,
          source: p.source,
          expiresAt: p.expiresAt.toISOString(),
        },
        createdAt: p.createdAt,
      },
    })
    counters.bonusPurchaseGrants += 1
  }
}

async function backfillRefundLogs(counters: Counters): Promise<void> {
  // CreditRefundLog → REFUND 한 행.
  // pool 추론: creditType 'reading' 은 정확한 풀(보너스 vs 월간) 분포가
  // 보존돼 있지 않음. 보수적으로 MONTHLY 로 기록 — 이후 합계 검증 시
  // "이전 환불은 MONTHLY 로 합산됐다" 가정만 일관되면 invariant 유지.
  // compatibility / followUp 는 자기 풀 그대로.
  const refunds = await prisma.creditRefundLog.findMany({
    select: {
      id: true,
      userId: true,
      creditType: true,
      amount: true,
      reason: true,
      apiRoute: true,
      transactionId: true,
      createdAt: true,
    },
  })

  for (const r of refunds) {
    const existing = await prisma.creditTransaction.findFirst({
      where: { sourceRef: r.id, type: 'REFUND', userId: r.userId },
      select: { id: true },
    })
    if (existing) {
      counters.skipped += 1
      continue
    }

    const pool =
      r.creditType === 'compatibility'
        ? 'COMPATIBILITY'
        : r.creditType === 'followUp'
          ? 'FOLLOWUP'
          : 'MONTHLY'

    await prisma.creditTransaction.create({
      data: {
        userId: r.userId,
        type: 'REFUND',
        pool,
        amount: r.amount,
        reason: r.reason,
        sourceRef: r.id,
        metadata: {
          backfilled: true,
          refundLogId: r.id,
          creditType: r.creditType,
          apiRoute: r.apiRoute,
          transactionId: r.transactionId,
        },
        createdAt: r.createdAt,
      },
    })
    counters.refundRows += 1
  }
}

async function backfillAdminGrants(counters: Counters): Promise<void> {
  // AdminAuditLog action LIKE 'grant_credit%' → GRANT / BONUS.
  // amount 는 metadata.amount 에서 추출 (운영자가 직접 입력한 값).
  const logs = await prisma.adminAuditLog.findMany({
    where: {
      action: { startsWith: 'grant_credit' },
      success: true,
    },
    select: {
      id: true,
      action: true,
      targetId: true,
      adminEmail: true,
      metadata: true,
      createdAt: true,
    },
  })

  for (const log of logs) {
    if (!log.targetId) continue
    const meta = (log.metadata ?? {}) as Record<string, unknown>
    const amountRaw = meta.amount
    const amount =
      typeof amountRaw === 'number'
        ? amountRaw
        : typeof amountRaw === 'string'
          ? Number(amountRaw)
          : NaN
    if (!Number.isFinite(amount) || amount <= 0) {
      counters.skipped += 1
      continue
    }

    const existing = await prisma.creditTransaction.findFirst({
      where: { sourceRef: log.id, type: 'GRANT', userId: log.targetId },
      select: { id: true },
    })
    if (existing) {
      counters.skipped += 1
      continue
    }

    await prisma.creditTransaction.create({
      data: {
        userId: log.targetId,
        type: 'GRANT',
        pool: 'BONUS',
        amount,
        reason: log.action,
        sourceRef: log.id,
        metadata: {
          backfilled: true,
          adminAuditLogId: log.id,
          adminEmail: log.adminEmail,
          original: meta,
        },
        createdAt: log.createdAt,
      },
    })
    counters.adminGrantRows += 1
  }
}

async function main(): Promise<void> {
  const counters: Counters = {
    bonusPurchaseGrants: 0,
    refundRows: 0,
    adminGrantRows: 0,
    skipped: 0,
  }

  console.log('[backfill] start')
  await backfillBonusPurchaseGrants(counters)
  console.log('[backfill] BonusCreditPurchase →', counters.bonusPurchaseGrants, 'GRANT rows')
  await backfillRefundLogs(counters)
  console.log('[backfill] CreditRefundLog →', counters.refundRows, 'REFUND rows')
  await backfillAdminGrants(counters)
  console.log('[backfill] AdminAuditLog (grant_credit*) →', counters.adminGrantRows, 'GRANT rows')
  console.log('[backfill] skipped (idempotent):', counters.skipped)
  console.log('[backfill] done')
}

main()
  .catch((err) => {
    console.error('[backfill] failed', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
