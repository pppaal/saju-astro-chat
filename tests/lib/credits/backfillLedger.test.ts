import { describe, it, expect } from 'vitest'
import {
  cacheBalanceOf,
  computeReconcilePlan,
  summarizeGaps,
  type ReconcilePlan,
} from '../../../scripts/backfill-credit-ledger'

/**
 * Phase 4a 백필의 순수 로직 검증 — gap 계산, 보정 row 구성, 멱등 키, 요약.
 * DB 무관 (스크립트의 순수 함수만 import).
 */
describe('backfill-credit-ledger 순수 로직', () => {
  it('cacheBalance = bonus + (monthly - used)', () => {
    expect(cacheBalanceOf({ userId: 'u', monthlyCredits: 0, usedCredits: 0, bonusCredits: 5 })).toBe(5)
    expect(cacheBalanceOf({ userId: 'u', monthlyCredits: 3, usedCredits: 1, bonusCredits: 4 })).toBe(6)
  })

  it('gap === 0 이면 보정 row 없음 (no-op)', () => {
    const plan = computeReconcilePlan(
      { userId: 'u', monthlyCredits: 0, usedCredits: 0, bonusCredits: 5 },
      5
    )
    expect(plan.gap).toBe(0)
    expect(plan.row).toBeNull()
  })

  it('cache > ledger → 양수 gap, GRANT row', () => {
    const plan = computeReconcilePlan(
      { userId: 'u1', monthlyCredits: 0, usedCredits: 0, bonusCredits: 8 },
      3
    )
    expect(plan.gap).toBe(5)
    expect(plan.row).not.toBeNull()
    expect(plan.row!.type).toBe('GRANT')
    expect(plan.row!.amount).toBe(5)
    expect(plan.row!.pool).toBe('BONUS')
    expect(plan.row!.reason).toBe('backfill_reconcile')
    // 멱등 키는 사용자당 1개 (재실행 시 P2002 로 중복 방지).
    expect(plan.row!.idempotencyKey).toBe('backfill_reconcile:u1')
    // 원래 캐시 구성은 metadata 에 보존.
    expect(plan.row!.metadata).toEqual({
      cacheBonus: 8,
      cacheMonthly: 0,
      usedCredits: 0,
      ledgerSumBefore: 3,
    })
  })

  it('cache < ledger → 음수 gap, EXPIRE row (보정 차감)', () => {
    const plan = computeReconcilePlan(
      { userId: 'u2', monthlyCredits: 0, usedCredits: 0, bonusCredits: 2 },
      6
    )
    expect(plan.gap).toBe(-4)
    expect(plan.row!.type).toBe('EXPIRE')
    expect(plan.row!.amount).toBe(-4)
  })

  it('적용된 보정 row 를 ledgerSum 에 더하면 gap 이 0 이 된다 (게이트 불변식)', () => {
    const u = { userId: 'u3', monthlyCredits: 0, usedCredits: 0, bonusCredits: 7 }
    const before = computeReconcilePlan(u, 2)
    const newLedger = before.ledgerSum + (before.row?.amount ?? 0)
    const after = computeReconcilePlan(u, newLedger)
    expect(after.gap).toBe(0)
    expect(after.row).toBeNull()
  })

  it('summarizeGaps 가 분포를 정확히 집계', () => {
    const plans: ReconcilePlan[] = [
      computeReconcilePlan({ userId: 'a', monthlyCredits: 0, usedCredits: 0, bonusCredits: 5 }, 5), // gap 0
      computeReconcilePlan({ userId: 'b', monthlyCredits: 0, usedCredits: 0, bonusCredits: 8 }, 3), // +5
      computeReconcilePlan({ userId: 'c', monthlyCredits: 0, usedCredits: 0, bonusCredits: 1 }, 4), // -3
    ]
    const s = summarizeGaps(plans)
    expect(s.total).toBe(3)
    expect(s.withGap).toBe(2)
    expect(s.positive).toBe(1)
    expect(s.negative).toBe(1)
    expect(s.gapSum).toBe(2) // +5 -3
    expect(s.absGapSum).toBe(8) // 5 + 3
    expect(s.maxAbsGap).toBe(5)
  })
})
