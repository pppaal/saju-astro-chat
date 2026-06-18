/**
 * scripts/backfill-credit-ledger.ts
 *
 * Ledger SSOT 전환 Phase 4a — 현재 잔액(advisory cache)과 ledger 합을 일치시킨다.
 * 현재 CreditTransaction 은 "도입 이후 delta 만" 정확하므로, 잔액 SSOT 로 쓰려면
 * 각 사용자의 `cacheBalance == SUM(ledger)` 가 성립해야 한다. 어긋난 사용자마다
 * 단일 보정(reconcile) row 를 append 한다.
 *
 *   cacheBalance = bonusCredits + (monthlyCredits - usedCredits)
 *   ledgerSum    = SUM(CreditTransaction.amount where pool in [BONUS, MONTHLY])
 *   gap          = cacheBalance - ledgerSum
 *   gap != 0 → reason='backfill_reconcile' row 1개 (amount=gap, 부호로 GRANT/EXPIRE)
 *
 * 멱등성: reconcile row 는 새 `idempotencyKey`(@unique = `backfill_reconcile:<userId>`)
 * 로 DB 레벨 중복 방지. 여러 번 돌려도 사용자당 보정 row 는 1개. 단, 첫 적용 후
 * 캐시가 더 바뀌면 잔여 gap 이 생길 수 있으므로 재적용 전 dry-run 으로 재확인할 것.
 *
 * 롤백: `reason='backfill_reconcile'` row 삭제.
 *
 * 실행 (기본 dry-run — 아무것도 바꾸지 않고 gap 분포만 출력):
 *   tsx scripts/backfill-credit-ledger.ts
 *   tsx scripts/backfill-credit-ledger.ts --apply        # 실제 보정 row append
 *   tsx scripts/backfill-credit-ledger.ts --apply --lots # 추가로 lotId/expiresAt backfill
 *
 * 필요 env: DATABASE_URL
 */

import { prisma } from '../src/lib/db/prisma'

// ── 순수 로직 (테스트 가능, DB 무관) ────────────────────────────────────────

export interface UserCacheSnapshot {
  userId: string
  monthlyCredits: number
  usedCredits: number
  bonusCredits: number
}

export interface ReconcilePlan {
  userId: string
  cacheBalance: number
  ledgerSum: number
  gap: number
  /** gap != 0 일 때만 채워지는 append 대상 row. gap === 0 이면 null (no-op). */
  row: {
    type: 'GRANT' | 'EXPIRE'
    pool: 'BONUS'
    amount: number
    reason: 'backfill_reconcile'
    idempotencyKey: string
    metadata: {
      cacheBonus: number
      cacheMonthly: number
      usedCredits: number
      ledgerSumBefore: number
    }
  } | null
}

/** 캐시 잔액 = 보너스 + (월간 한도 - 월간 사용). 월간은 현재 동결(보통 0). */
export function cacheBalanceOf(u: UserCacheSnapshot): number {
  return u.bonusCredits + (u.monthlyCredits - u.usedCredits)
}

/**
 * 한 사용자의 보정 계획을 만든다. ledgerSum 은 호출자가 DB 에서 집계해 넘긴다.
 * gap 의 정확한 풀 분해는 불가하므로 보수적으로 BONUS(활성 풀)에 몰고, 원래
 * 캐시 구성(보너스/월간/사용)은 metadata 에 남겨 추적 가능하게 한다.
 */
export function computeReconcilePlan(u: UserCacheSnapshot, ledgerSum: number): ReconcilePlan {
  const cacheBalance = cacheBalanceOf(u)
  const gap = cacheBalance - ledgerSum
  if (gap === 0) {
    return { userId: u.userId, cacheBalance, ledgerSum, gap, row: null }
  }
  return {
    userId: u.userId,
    cacheBalance,
    ledgerSum,
    gap,
    row: {
      type: gap > 0 ? 'GRANT' : 'EXPIRE',
      pool: 'BONUS',
      amount: gap,
      reason: 'backfill_reconcile',
      idempotencyKey: `backfill_reconcile:${u.userId}`,
      metadata: {
        cacheBonus: u.bonusCredits,
        cacheMonthly: u.monthlyCredits,
        usedCredits: u.usedCredits,
        ledgerSumBefore: ledgerSum,
      },
    },
  }
}

/** gap 분포 요약 (dry-run 리포트용). */
export function summarizeGaps(plans: ReconcilePlan[]): {
  total: number
  withGap: number
  positive: number
  negative: number
  gapSum: number
  absGapSum: number
  maxAbsGap: number
} {
  let withGap = 0
  let positive = 0
  let negative = 0
  let gapSum = 0
  let absGapSum = 0
  let maxAbsGap = 0
  for (const p of plans) {
    if (p.gap === 0) continue
    withGap++
    if (p.gap > 0) positive++
    else negative++
    gapSum += p.gap
    absGapSum += Math.abs(p.gap)
    maxAbsGap = Math.max(maxAbsGap, Math.abs(p.gap))
  }
  return { total: plans.length, withGap, positive, negative, gapSum, absGapSum, maxAbsGap }
}

// ── DB I/O (스크립트 실행부) ─────────────────────────────────────────────────

const POOLS = ['BONUS', 'MONTHLY'] as const

async function ledgerSumFor(userId: string): Promise<number> {
  const agg = await prisma.creditTransaction.aggregate({
    where: { userId, pool: { in: POOLS as unknown as ('BONUS' | 'MONTHLY')[] } },
    _sum: { amount: true },
  })
  return agg._sum.amount ?? 0
}

async function buildPlans(): Promise<ReconcilePlan[]> {
  const users = await prisma.userCredits.findMany({
    select: { userId: true, monthlyCredits: true, usedCredits: true, bonusCredits: true },
  })
  const plans: ReconcilePlan[] = []
  for (const u of users) {
    const sum = await ledgerSumFor(u.userId)
    plans.push(computeReconcilePlan(u, sum))
  }
  return plans
}

/** 보정 row append (멱등: idempotencyKey unique). 적용된 user 수 반환. */
async function applyReconcile(plans: ReconcilePlan[]): Promise<number> {
  let applied = 0
  for (const p of plans) {
    if (!p.row) continue
    try {
      await prisma.creditTransaction.create({
        data: {
          userId: p.userId,
          type: p.row.type,
          pool: p.row.pool,
          amount: p.row.amount,
          reason: p.row.reason,
          sourceRef: null,
          idempotencyKey: p.row.idempotencyKey,
          metadata: p.row.metadata,
        },
      })
      applied++
    } catch (err) {
      const code = (err as { code?: string } | null)?.code
      if (code === 'P2002') {
        // 이미 보정됨 (재실행) — skip.
        continue
      }
      throw err
    }
  }
  return applied
}

/**
 * 보너스 lot 정보(lotId/expiresAt)를 기존 GRANT/SIGNUP_BONUS row 에 backfill.
 * sourceRef = purchase.id 인 row 중 lotId 가 비어 있는 것만 채운다 (신규 row 없음).
 * §5 만료를 ledger 안에서 닫기 위한 준비. 반환: 갱신된 row 수.
 */
async function backfillLots(): Promise<number> {
  const purchases = await prisma.bonusCreditPurchase.findMany({
    where: { expired: false },
    select: { id: true, expiresAt: true },
  })
  let updated = 0
  for (const pur of purchases) {
    const res = await prisma.creditTransaction.updateMany({
      where: { sourceRef: pur.id, lotId: null, pool: 'BONUS' },
      data: { lotId: pur.id, expiresAt: pur.expiresAt },
    })
    updated += res.count
  }
  return updated
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply')
  const doLots = args.has('--lots')

  console.log(`[backfill-ledger] mode=${apply ? 'APPLY' : 'DRY-RUN'} lots=${doLots}`)
  const plans = await buildPlans()
  const s = summarizeGaps(plans)
  console.log('[backfill-ledger] gap summary:', s)

  // 상위 gap 사용자 일부 노출 (검토용)
  const worst = plans
    .filter((p) => p.gap !== 0)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
    .slice(0, 20)
  for (const p of worst) {
    console.log(
      `  user=${p.userId} cache=${p.cacheBalance} ledger=${p.ledgerSum} gap=${p.gap} → ${p.row?.type}`
    )
  }

  if (!apply) {
    console.log('[backfill-ledger] DRY-RUN — no writes. Re-run with --apply to append reconcile rows.')
    return
  }

  const appliedReconcile = await applyReconcile(plans)
  console.log(`[backfill-ledger] reconcile rows appended: ${appliedReconcile}`)

  if (doLots) {
    const lotUpdated = await backfillLots()
    console.log(`[backfill-ledger] lot rows backfilled (lotId/expiresAt): ${lotUpdated}`)
  }

  // 게이트: 적용 후 모든 사용자 cacheBalance == ledgerSum 재확인.
  const after = await buildPlans()
  const remaining = after.filter((p) => p.gap !== 0)
  if (remaining.length === 0) {
    console.log('[backfill-ledger] ✅ invariant holds: cacheBalance == ledgerSum for all users')
  } else {
    console.error(
      `[backfill-ledger] ⚠️ ${remaining.length} users still drift after apply (cache changed mid-run?). Re-run dry-run.`
    )
    for (const p of remaining.slice(0, 10)) {
      console.error(`  user=${p.userId} gap=${p.gap}`)
    }
  }
}

// tsx 직접 실행 시에만 main 구동 (테스트 import 시엔 순수 함수만 사용).
const isDirectRun =
  typeof require !== 'undefined' && require.main === module
    ? true
    : import.meta.url === `file://${process.argv[1]}`
if (isDirectRun) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (e) => {
      console.error('[backfill-ledger] fatal:', e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
