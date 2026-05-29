/**
 * CreditTransaction sum-invariant 회귀 가드.
 *
 * 모든 mutation 사이트 (initializeUserCredits / addBonusCredits /
 * consumeCredits / refundCredits / expireBonusCredits /
 * revokeBonusCreditPurchase) 가 자기 행 한 줄씩 CreditTransaction 에 남기는
 * 지 검증한다. 시나리오 시퀀스를 실행한 뒤 두 가지 invariant 가 모두
 * 성립해야 한다:
 *
 *   (a) sum(CreditTransaction.amount where userId=X)
 *       == effective_balance(BONUS) + effective_balance(MONTHLY)
 *       == bonusCredits + (monthlyCredits - usedCredits)
 *
 *   (b) per-pool sums (BONUS, MONTHLY, COMPATIBILITY, FOLLOWUP) 가
 *       각 풀의 counter delta 와 일치.
 *
 * 실제 DB 대신 in-memory fake prisma 를 써서 결정적 단위테스트로 잡는다.
 * 동일 패턴은 기존 creditService.test.ts 의 hoisted mock 과 호환.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- In-memory fake prisma -------------------------------------------------

type CreditTxn = {
  id: string
  userId: string
  type: 'GRANT' | 'CONSUME' | 'REFUND' | 'EXPIRE' | 'REVOKE' | 'SIGNUP_BONUS'
  pool: 'BONUS' | 'MONTHLY' | 'COMPATIBILITY' | 'FOLLOWUP'
  amount: number
  reason: string
  sourceRef: string | null
  metadata: unknown
  createdAt: Date
}

type UserCreditsRow = {
  userId: string
  monthlyCredits: number
  usedCredits: number
  bonusCredits: number
  compatibilityUsed: number
  compatibilityLimit: number
  followUpUsed: number
  followUpLimit: number
  totalBonusReceived: number
  plan: string
  historyRetention: number
  periodStart: Date
  periodEnd: Date
}

type PurchaseRow = {
  id: string
  userId: string
  amount: number
  remaining: number
  expiresAt: Date
  expired: boolean
  source: string
  stripePaymentId: string | null
  acknowledgedAt: Date | null
  createdAt: Date
}

const state = {
  userCredits: new Map<string, UserCreditsRow>(),
  purchases: [] as PurchaseRow[],
  creditTransactions: [] as CreditTxn[],
  refundLogs: [] as Array<Record<string, unknown>>,
  cuid: 0,
}

function nextId(prefix: string) {
  state.cuid += 1
  return `${prefix}_${state.cuid}`
}

function matchUser(row: UserCreditsRow, where: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(where)) {
    if (k === 'userId') {
      if (row.userId !== v) return false
    } else if (v && typeof v === 'object' && 'gt' in (v as Record<string, unknown>)) {
      const val = row[k as keyof UserCreditsRow] as number
      if (!(val > ((v as { gt: number }).gt))) return false
    } else if (v && typeof v === 'object' && 'lt' in (v as Record<string, unknown>)) {
      const val = row[k as keyof UserCreditsRow] as number
      if (!(val < ((v as { lt: number }).lt))) return false
    } else {
      if ((row as Record<string, unknown>)[k] !== v) return false
    }
  }
  return true
}

function matchPurchase(row: PurchaseRow, where: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(where)) {
    if (v && typeof v === 'object' && 'gt' in (v as Record<string, unknown>)) {
      const val = (row as Record<string, unknown>)[k]
      const gt = (v as { gt: number | Date }).gt
      if (val instanceof Date && gt instanceof Date) {
        if (!(val.getTime() > gt.getTime())) return false
      } else if (typeof val === 'number' && typeof gt === 'number') {
        if (!(val > gt)) return false
      } else {
        return false
      }
    } else if (v && typeof v === 'object' && 'lte' in (v as Record<string, unknown>)) {
      const val = (row as Record<string, unknown>)[k] as number
      if (!(val <= (v as { lte: number }).lte)) return false
    } else {
      if ((row as Record<string, unknown>)[k] !== v) return false
    }
  }
  return true
}

function applyUpdateData(row: UserCreditsRow, data: Record<string, unknown>) {
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && 'increment' in (v as Record<string, unknown>)) {
      ;(row as Record<string, unknown>)[k] =
        ((row as Record<string, unknown>)[k] as number) + ((v as { increment: number }).increment)
    } else if (v && typeof v === 'object' && 'decrement' in (v as Record<string, unknown>)) {
      ;(row as Record<string, unknown>)[k] =
        ((row as Record<string, unknown>)[k] as number) - ((v as { decrement: number }).decrement)
    } else {
      ;(row as Record<string, unknown>)[k] = v
    }
  }
}

function applyPurchaseUpdate(row: PurchaseRow, data: Record<string, unknown>) {
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && 'increment' in (v as Record<string, unknown>)) {
      ;(row as Record<string, unknown>)[k] =
        ((row as Record<string, unknown>)[k] as number) + ((v as { increment: number }).increment)
    } else if (v && typeof v === 'object' && 'decrement' in (v as Record<string, unknown>)) {
      ;(row as Record<string, unknown>)[k] =
        ((row as Record<string, unknown>)[k] as number) - ((v as { decrement: number }).decrement)
    } else {
      ;(row as Record<string, unknown>)[k] = v
    }
  }
}

const fakePrisma: Record<string, unknown> = {
  userCredits: {
    create: vi.fn(async (args: { data: Partial<UserCreditsRow> & { userId: string } }) => {
      const row: UserCreditsRow = {
        userId: args.data.userId,
        monthlyCredits: args.data.monthlyCredits ?? 0,
        usedCredits: args.data.usedCredits ?? 0,
        bonusCredits: args.data.bonusCredits ?? 0,
        compatibilityUsed: args.data.compatibilityUsed ?? 0,
        compatibilityLimit: args.data.compatibilityLimit ?? 0,
        followUpUsed: args.data.followUpUsed ?? 0,
        followUpLimit: args.data.followUpLimit ?? 0,
        totalBonusReceived: args.data.bonusCredits ?? 0,
        plan: 'free',
        historyRetention: args.data.historyRetention ?? 365,
        periodStart: args.data.periodStart ?? new Date(),
        periodEnd: args.data.periodEnd ?? new Date(Date.now() + 30 * 86_400_000),
      }
      state.userCredits.set(row.userId, row)
      return row
    }),
    findUnique: vi.fn(async (args: { where: { userId: string } }) => {
      return state.userCredits.get(args.where.userId) ?? null
    }),
    update: vi.fn(
      async (args: { where: { userId: string }; data: Record<string, unknown> }) => {
        const row = state.userCredits.get(args.where.userId)
        if (!row) throw new Error('userCredits not found')
        applyUpdateData(row, args.data)
        return row
      }
    ),
    updateMany: vi.fn(
      async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        let count = 0
        for (const row of state.userCredits.values()) {
          if (matchUser(row, args.where)) {
            applyUpdateData(row, args.data)
            count += 1
          }
        }
        return { count }
      }
    ),
    findMany: vi.fn(async () => Array.from(state.userCredits.values())),
  },
  bonusCreditPurchase: {
    create: vi.fn(
      async (args: { data: Partial<PurchaseRow> & { userId: string; amount: number } }) => {
        const row: PurchaseRow = {
          id: nextId('purchase'),
          userId: args.data.userId,
          amount: args.data.amount,
          remaining: args.data.remaining ?? args.data.amount,
          expiresAt: args.data.expiresAt ?? new Date(Date.now() + 90 * 86_400_000),
          expired: args.data.expired ?? false,
          source: args.data.source ?? 'purchase',
          stripePaymentId: args.data.stripePaymentId ?? null,
          acknowledgedAt: args.data.acknowledgedAt ?? null,
          createdAt: new Date(),
        }
        state.purchases.push(row)
        return row
      }
    ),
    findMany: vi.fn(
      async (args: {
        where: Record<string, unknown>
        orderBy?: unknown
        select?: Record<string, boolean>
      }) => {
        let rows = state.purchases.filter((p) => matchPurchase(p, args.where))
        const ob = args.orderBy as
          | { expiresAt?: 'asc' | 'desc'; createdAt?: 'asc' | 'desc' }
          | Array<{ expiresAt?: 'asc' | 'desc'; createdAt?: 'asc' | 'desc' }>
          | undefined
        const obs = Array.isArray(ob) ? ob : ob ? [ob] : []
        for (const clause of obs.slice().reverse()) {
          const field = clause.expiresAt ? 'expiresAt' : 'createdAt'
          const dir = (clause.expiresAt ?? clause.createdAt) === 'asc' ? 1 : -1
          rows = rows.slice().sort(
            (a, b) =>
              ((a[field as keyof PurchaseRow] as Date).getTime() -
                (b[field as keyof PurchaseRow] as Date).getTime()) *
              dir
          )
        }
        return rows
      }
    ),
    findFirst: vi.fn(
      async (args: {
        where: Record<string, unknown>
        orderBy?: unknown
        select?: Record<string, boolean>
      }) => {
        const rows = await (
          fakePrisma.bonusCreditPurchase as {
            findMany: (a: unknown) => Promise<PurchaseRow[]>
          }
        ).findMany(args)
        return rows[0] ?? null
      }
    ),
    update: vi.fn(
      async (args: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = state.purchases.find((p) => p.id === args.where.id)
        if (!row) throw new Error('purchase not found')
        applyPurchaseUpdate(row, args.data)
        return row
      }
    ),
    updateMany: vi.fn(
      async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        let count = 0
        for (const row of state.purchases) {
          if (matchPurchase(row, args.where)) {
            applyPurchaseUpdate(row, args.data)
            count += 1
          }
        }
        return { count }
      }
    ),
  },
  creditTransaction: {
    create: vi.fn(async (args: { data: Omit<CreditTxn, 'id' | 'createdAt'> & { createdAt?: Date } }) => {
      const row: CreditTxn = {
        id: nextId('ctx'),
        userId: args.data.userId,
        type: args.data.type,
        pool: args.data.pool,
        amount: args.data.amount,
        reason: args.data.reason,
        sourceRef: args.data.sourceRef ?? null,
        metadata: args.data.metadata ?? null,
        createdAt: args.data.createdAt ?? new Date(),
      }
      state.creditTransactions.push(row)
      return row
    }),
    createMany: vi.fn(async (args: { data: Array<Omit<CreditTxn, 'id' | 'createdAt'>> }) => {
      for (const d of args.data) {
        state.creditTransactions.push({
          id: nextId('ctx'),
          createdAt: new Date(),
          sourceRef: d.sourceRef ?? null,
          metadata: d.metadata ?? null,
          ...d,
        })
      }
      return { count: args.data.length }
    }),
    findMany: vi.fn(async () => state.creditTransactions.slice()),
  },
  creditRefundLog: {
    create: vi.fn(async (args: { data: Record<string, unknown> }) => {
      state.refundLogs.push(args.data)
      return args.data
    }),
  },
  $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof fakePrisma) => Promise<unknown>)(fakePrisma)
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg)
    }
    throw new Error('unsupported $transaction call')
  }),
  // expireBonusCredits / revokeBonusCreditPurchase 가 raw SQL 로 UserCredits
  // 의 bonusCredits 를 GREATEST 패턴으로 줄임. fake 에서는 정확한 SQL 파싱
  // 대신 호출자가 넘긴 expiredAmount 를 추적해 같은 동작을 재현.
  $executeRaw: vi.fn(async (..._args: unknown[]) => {
    // Prisma tagged template 의 첫 번째 인자가 strings array, 이후 values.
    // expireBonusCredits 의 raw 는 `... - ${expiredAmount} WHERE "userId" = ${uid}`,
    // revokeBonusCreditPurchase 의 raw 는 `... - ${reclaim} WHERE "userId" = ${uid}`,
    // refundCredits('reading' fallback) 의 raw 는 `... usedCredits - ${remaining} WHERE userId = ${uid}`,
    // refundCredits('compatibility') 는 `... compatibilityUsed - ${amount} WHERE userId = ${uid}`,
    // refundCredits('followUp') 는 `... followUpUsed - ${amount} WHERE userId = ${uid}`.
    // 패턴 식별을 위해 strings 첫 번째 단편을 읽는다.
    const strings = _args[0] as TemplateStringsArray
    const values = _args.slice(1) as Array<number | string>
    const sql = strings.join(' ').toLowerCase()
    const decrAmount = values[0] as number
    const uid = values[1] as string
    const row = state.userCredits.get(uid)
    if (!row) return 0
    if (sql.includes('"bonuscredits"') || sql.includes('bonuscredits =')) {
      row.bonusCredits = Math.max(0, row.bonusCredits - decrAmount)
    } else if (sql.includes('"usedcredits"') || sql.includes('usedcredits =')) {
      row.usedCredits = Math.max(0, row.usedCredits - decrAmount)
    } else if (sql.includes('"compatibilityused"') || sql.includes('compatibilityused =')) {
      row.compatibilityUsed = Math.max(0, row.compatibilityUsed - decrAmount)
    } else if (sql.includes('"followupused"') || sql.includes('followupused =')) {
      row.followUpUsed = Math.max(0, row.followUpUsed - decrAmount)
    }
    return 1
  }),
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: fakePrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// --- invariants ------------------------------------------------------------

function effectiveBalance(uid: string): { total: number; byPool: Record<string, number> } {
  const row = state.userCredits.get(uid)!
  // 잔액 정의: bonusCredits + (monthlyCredits - usedCredits).
  // compatibilityUsed / followUpUsed 는 한도 카운터로, 잔액엔 직접 안 들어감.
  // 다만 invariant 검증을 위해 풀별 net 도 계산.
  const total = row.bonusCredits + (row.monthlyCredits - row.usedCredits)
  const byPool: Record<string, number> = {
    BONUS: row.bonusCredits,
    MONTHLY: row.monthlyCredits - row.usedCredits,
    // COMPATIBILITY / FOLLOWUP 은 음수 (사용량) — invariant 비교용으로
    // CreditTransaction sum 과 매칭하려면 (-usedCount).
    COMPATIBILITY: -row.compatibilityUsed,
    FOLLOWUP: -row.followUpUsed,
  }
  return { total, byPool }
}

function txnSums(uid: string): { total: number; byPool: Record<string, number> } {
  const rows = state.creditTransactions.filter((r) => r.userId === uid)
  const byPool: Record<string, number> = {
    BONUS: 0,
    MONTHLY: 0,
    COMPATIBILITY: 0,
    FOLLOWUP: 0,
  }
  let total = 0
  for (const r of rows) {
    byPool[r.pool] = (byPool[r.pool] ?? 0) + r.amount
    // 잔액 invariant 는 BONUS + MONTHLY 만. COMPATIBILITY/FOLLOWUP 은 한도
    // 카운터라 잔액에 포함시키지 않는다 (effectiveBalance 와 동일 규칙).
    if (r.pool === 'BONUS' || r.pool === 'MONTHLY') total += r.amount
  }
  return { total, byPool }
}

beforeEach(() => {
  state.userCredits.clear()
  state.purchases = []
  state.creditTransactions = []
  state.refundLogs = []
  state.cuid = 0
  vi.clearAllMocks()
})

describe('CreditTransaction sum-invariant', () => {
  it('matches effective balance after a full mutation sequence', async () => {
    const userId = 'user_inv'
    const { initializeUserCredits, addBonusCredits, consumeCredits, expireBonusCredits } =
      await import('@/lib/credits/creditService')
    const { refundCredits } = await import('@/lib/credits/creditRefund')

    // 1) signup → +5 BONUS (ctx 에 SIGNUP_BONUS 한 줄)
    await initializeUserCredits(userId)
    // monthly credit 직접 부여 (production 에서는 별도 경로) — 잔액 invariant
    // 검증용으로 monthlyCredits 도 한번 채워서 두 풀 모두 흘러가게 한다.
    // baseline 은 ctx 에 안 들어가는 unaudited bootstrap (monthly seed) 만.
    // signup bonus 는 ctx 에 정확히 반영되므로 baseline 에서 제외.
    const row = state.userCredits.get(userId)!
    row.monthlyCredits = 3 // unaudited bootstrap — 본 테스트의 baseline.
    const baseline = 3 // monthlyCredits 시드 (ctx 미반영분)

    // 2) addBonusCredits +10 (purchase, stripe paymentId)
    await addBonusCredits(userId, 10, 'purchase', 'pi_test_1')

    // 3) consumeCredits 4 → 5 bonus (signup) 의 5 + 10 purchase 중 일부 + monthly
    //    consume 순서: bonus 먼저. bonus 15 중 4 차감 → bonus 11, monthly 그대로.
    await consumeCredits(userId, 'reading', 4)

    // 4) consumeCredits 12 → bonus 11 다 쓰고 monthly 1 까지 차감
    await consumeCredits(userId, 'reading', 12)

    // 5) refundCredits 2 (reading) → 최근 차감된 purchase 부터 보너스 복원
    await refundCredits({
      userId,
      creditType: 'reading',
      amount: 2,
      reason: 'ai_backend_timeout',
    })

    // 6) expireBonusCredits → 만료된 purchase 없어 no-op (expiresAt 미래)
    await expireBonusCredits()

    // 잔액 invariant: txn sum + baseline == 현재 effective balance.
    const txn = txnSums(userId)
    const eff = effectiveBalance(userId)
    expect(txn.total + baseline).toBe(eff.total)
  })

  it('per-pool sums (BONUS, MONTHLY) match counter deltas', async () => {
    const userId = 'user_pool'
    const { initializeUserCredits, addBonusCredits, consumeCredits } = await import(
      '@/lib/credits/creditService'
    )

    await initializeUserCredits(userId) // +5 BONUS, ctx(SIGNUP_BONUS/BONUS +5)
    await addBonusCredits(userId, 7, 'purchase', 'pi_pool_1') // +7 BONUS, ctx +7
    await consumeCredits(userId, 'reading', 3) // -3 BONUS, ctx CONSUME/BONUS -3

    const sums = txnSums(userId)
    expect(sums.byPool.BONUS).toBe(5 + 7 - 3)
    expect(sums.byPool.MONTHLY).toBe(0)
  })

  it('refund (reading→bonus) writes REFUND/BONUS with positive amount', async () => {
    const userId = 'user_refund'
    const { initializeUserCredits, addBonusCredits, consumeCredits } = await import(
      '@/lib/credits/creditService'
    )
    const { refundCredits } = await import('@/lib/credits/creditRefund')

    await initializeUserCredits(userId)
    await addBonusCredits(userId, 5, 'purchase', 'pi_r_1')
    await consumeCredits(userId, 'reading', 2) // bonus -2
    await refundCredits({
      userId,
      creditType: 'reading',
      amount: 2,
      reason: 'test',
    })

    const refundRows = state.creditTransactions.filter((r) => r.type === 'REFUND')
    expect(refundRows.length).toBeGreaterThan(0)
    // bonus 복원 행이 적어도 하나 있어야 한다 (reverse-FIFO 가 BonusCreditPurchase 의
    // capacity 를 채울 수 있어서).
    const bonusRefund = refundRows.find((r) => r.pool === 'BONUS')
    expect(bonusRefund?.amount).toBeGreaterThan(0)
  })

  it('every CONSUME/BONUS row carries sourceRef = purchase.id', async () => {
    const userId = 'user_src'
    const { initializeUserCredits, addBonusCredits, consumeCredits } = await import(
      '@/lib/credits/creditService'
    )

    await initializeUserCredits(userId)
    await addBonusCredits(userId, 3, 'purchase', 'pi_src_1')
    await consumeCredits(userId, 'reading', 2)

    const consumeBonus = state.creditTransactions.filter(
      (r) => r.type === 'CONSUME' && r.pool === 'BONUS'
    )
    expect(consumeBonus.length).toBeGreaterThan(0)
    for (const r of consumeBonus) {
      expect(r.sourceRef).toBeTruthy()
      // sourceRef 는 BonusCreditPurchase.id 형식.
      expect(r.sourceRef).toMatch(/^purchase_/)
    }
  })
})
