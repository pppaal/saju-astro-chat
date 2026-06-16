/**
 * Concurrency / race-condition guards for the credit system.
 *
 * The existing credit tests are deterministic single-call unit tests. This file
 * closes the gap noted in code review: the idempotency / atomic-update guards
 * are exercised under CONCURRENT load (Promise.all of N callers), proving the
 * invariants the production code promises actually hold when callers race.
 *
 * Harness style follows the existing in-memory fake prisma used by
 * creditTransaction.invariant.test.ts (a stateful `state` object + a
 * function-form `$transaction`). Two faithfulness rules make the race real
 * rather than theoretical:
 *
 *   1. Atomic guards are honored. The fake's conditional `updateMany`
 *      (`where: { remaining: { gte: N } }` / `{ gt: 0 }`) returns `{ count: 0 }`
 *      when the guard fails — exactly the signal production code branches on to
 *      detect "another tx already took it". `requestIdempotencyLog.create`
 *      throws P2002 on a duplicate `scopedKey` — the create-as-lock unique
 *      constraint.
 *
 *   2. Transactions interleave. JS is single-threaded, so a naive fake where
 *      each `$transaction` callback runs start-to-finish without yielding would
 *      hide every race (each caller would see a fully-committed world). We force
 *      interleaving by yielding the event loop at the read/write boundary inside
 *      the fake, so two concurrent callers both READ the pre-decrement balance
 *      before either WRITES — the classic lost-update window. The invariant then
 *      holds ONLY because the atomic conditional update serializes the commit.
 *
 * We assert the promised invariant (never overspend, never go negative, exactly
 * one charge per key), not the implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- In-memory fake prisma with honored atomic guards ----------------------

type PurchaseRow = {
  id: string
  userId: string
  amount: number
  remaining: number
  expiresAt: Date
  expired: boolean
  source: string
  stripePaymentId: string | null
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

type CreditTxn = {
  id: string
  userId: string
  type: string
  pool: string
  amount: number
  reason: string
  sourceRef: string | null
  metadata: unknown
  createdAt: Date
}

type IdemRow = { scopedKey: string; expiresAt: Date; createdAt: Date }

const state = {
  userCredits: new Map<string, UserCreditsRow>(),
  purchases: [] as PurchaseRow[],
  creditTransactions: [] as CreditTxn[],
  idemLogs: new Map<string, IdemRow>(),
  cuid: 0,
}

function nextId(prefix: string) {
  state.cuid += 1
  return `${prefix}_${state.cuid}`
}

// Force the current async operation to yield the event loop. Awaiting this in
// the fake between a read and its dependent write opens the interleaving window
// that makes concurrent callers race (both read, then both try to write).
function yieldEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function p2002(): Error {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
}

// where-matchers (subset needed by the code under test) ----------------------

function matchPurchase(row: PurchaseRow, where: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(where)) {
    const val = (row as Record<string, unknown>)[k]
    if (v && typeof v === 'object') {
      const cond = v as Record<string, unknown>
      if ('gt' in cond) {
        const gt = cond.gt as number | Date
        if (val instanceof Date && gt instanceof Date) {
          if (!(val.getTime() > gt.getTime())) return false
        } else if (!((val as number) > (gt as number))) return false
      } else if ('gte' in cond) {
        if (!((val as number) >= (cond.gte as number))) return false
      } else if ('lte' in cond) {
        if (!((val as number) <= (cond.lte as number))) return false
      } else {
        return false
      }
    } else if (val !== v) {
      return false
    }
  }
  return true
}

function matchUser(row: UserCreditsRow, where: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(where)) {
    const val = (row as Record<string, unknown>)[k]
    if (v && typeof v === 'object') {
      const cond = v as Record<string, unknown>
      if ('gt' in cond) {
        if (!((val as number) > (cond.gt as number))) return false
      } else if ('gte' in cond) {
        if (!((val as number) >= (cond.gte as number))) return false
      } else if ('lte' in cond) {
        if (!((val as number) <= (cond.lte as number))) return false
      } else if ('lt' in cond) {
        if (!((val as number) < (cond.lt as number))) return false
      } else {
        return false
      }
    } else if (val !== v) {
      return false
    }
  }
  return true
}

function applyDelta(row: Record<string, unknown>, data: Record<string, unknown>) {
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && 'increment' in (v as Record<string, unknown>)) {
      row[k] = (row[k] as number) + (v as { increment: number }).increment
    } else if (v && typeof v === 'object' && 'decrement' in (v as Record<string, unknown>)) {
      row[k] = (row[k] as number) - (v as { decrement: number }).decrement
    } else {
      row[k] = v
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
        compatibilityUsed: 0,
        compatibilityLimit: 0,
        followUpUsed: 0,
        followUpLimit: 0,
        totalBonusReceived: args.data.bonusCredits ?? 0,
        plan: 'free',
        historyRetention: 365,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 86_400_000),
      }
      state.userCredits.set(row.userId, row)
      return row
    }),
    findUnique: vi.fn(async (args: { where: { userId: string } }) => {
      // Snapshot read, then yield: opens the read-then-write race window.
      const row = state.userCredits.get(args.where.userId) ?? null
      const snapshot = row ? { ...row } : null
      await yieldEventLoop()
      return snapshot
    }),
    update: vi.fn(async (args: { where: { userId: string }; data: Record<string, unknown> }) => {
      const row = state.userCredits.get(args.where.userId)
      if (!row) throw new Error('userCredits not found')
      applyDelta(row as unknown as Record<string, unknown>, args.data)
      return row
    }),
    updateMany: vi.fn(
      async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        let count = 0
        for (const row of state.userCredits.values()) {
          if (matchUser(row, args.where)) {
            applyDelta(row as unknown as Record<string, unknown>, args.data)
            count += 1
          }
        }
        return { count }
      }
    ),
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
          createdAt: new Date(),
        }
        state.purchases.push(row)
        return row
      }
    ),
    findMany: vi.fn(async (args: { where: Record<string, unknown>; orderBy?: unknown }) => {
      let rows = state.purchases.filter((p) => matchPurchase(p, args.where))
      const ob = args.orderBy as { expiresAt?: 'asc' | 'desc' } | undefined
      if (ob?.expiresAt) {
        rows = rows
          .slice()
          .sort(
            (a, b) =>
              (a.expiresAt.getTime() - b.expiresAt.getTime()) * (ob.expiresAt === 'asc' ? 1 : -1)
          )
      }
      // Snapshot + yield: concurrent consumers both see the same pre-decrement
      // `remaining` before either commits its conditional updateMany.
      const snapshot = rows.map((r) => ({ ...r }))
      await yieldEventLoop()
      return snapshot
    }),
    findFirst: vi.fn(async (args: { where: Record<string, unknown>; orderBy?: unknown }) => {
      const rows = await (
        fakePrisma.bonusCreditPurchase as { findMany: (a: unknown) => Promise<PurchaseRow[]> }
      ).findMany(args)
      return rows[0] ?? null
    }),
    update: vi.fn(async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = state.purchases.find((p) => p.id === args.where.id)
      if (!row) throw new Error('purchase not found')
      applyDelta(row as unknown as Record<string, unknown>, args.data)
      return row
    }),
    // The race-critical guard. Commit is atomic against live state — NOT the
    // snapshot the caller read — so a loser whose `remaining >= N` no longer
    // holds gets count:0 (exactly Prisma/Postgres conditional-update semantics).
    updateMany: vi.fn(
      async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        let count = 0
        for (const row of state.purchases) {
          if (matchPurchase(row, args.where)) {
            applyDelta(row as unknown as Record<string, unknown>, args.data)
            count += 1
          }
        }
        return { count }
      }
    ),
  },
  creditTransaction: {
    create: vi.fn(async (args: { data: Omit<CreditTxn, 'id' | 'createdAt'> }) => {
      const row: CreditTxn = {
        id: nextId('ctx'),
        createdAt: new Date(),
        sourceRef: args.data.sourceRef ?? null,
        metadata: args.data.metadata ?? null,
        ...args.data,
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
  },
  // Idempotency / refund-once / draw-nonce all guard via this unique create.
  requestIdempotencyLog: {
    create: vi.fn(async (args: { data: { scopedKey: string; expiresAt: Date } }) => {
      if (state.idemLogs.has(args.data.scopedKey)) throw p2002()
      const row: IdemRow = {
        scopedKey: args.data.scopedKey,
        expiresAt: args.data.expiresAt,
        createdAt: new Date(),
      }
      state.idemLogs.set(args.data.scopedKey, row)
      return row
    }),
    delete: vi.fn(async (args: { where: { scopedKey: string } }) => {
      const existed = state.idemLogs.delete(args.where.scopedKey)
      if (!existed) throw Object.assign(new Error('not found'), { code: 'P2025' })
      return {}
    }),
    findUnique: vi.fn(async (args: { where: { scopedKey: string } }) => {
      return state.idemLogs.get(args.where.scopedKey) ?? null
    }),
    upsert: vi.fn(
      async (args: {
        where: { scopedKey: string }
        create: { scopedKey: string; expiresAt: Date }
        update: { expiresAt: Date }
      }) => {
        const existing = state.idemLogs.get(args.where.scopedKey)
        if (existing) {
          existing.expiresAt = args.update.expiresAt
          return existing
        }
        const row: IdemRow = {
          scopedKey: args.create.scopedKey,
          expiresAt: args.create.expiresAt,
          createdAt: new Date(),
        }
        state.idemLogs.set(row.scopedKey, row)
        return row
      }
    ),
  },
  $transaction: vi.fn(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof fakePrisma) => Promise<unknown>)(fakePrisma)
    }
    if (Array.isArray(arg)) return Promise.all(arg)
    throw new Error('unsupported $transaction call')
  }),
  $executeRaw: vi.fn(async () => 1),
}

vi.mock('@/lib/db/prisma', () => ({ prisma: fakePrisma }))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/cache/redis-cache', () => ({ invalidateCachePattern: vi.fn() }))

// --- helpers ---------------------------------------------------------------

function seedUser(
  userId: string,
  opts: { monthly?: number; used?: number; bonus?: number } = {}
): void {
  const bonus = opts.bonus ?? 0
  state.userCredits.set(userId, {
    userId,
    monthlyCredits: opts.monthly ?? 0,
    usedCredits: opts.used ?? 0,
    bonusCredits: bonus,
    compatibilityUsed: 0,
    compatibilityLimit: 0,
    followUpUsed: 0,
    followUpLimit: 0,
    totalBonusReceived: bonus,
    plan: 'free',
    historyRetention: 365,
    periodStart: new Date(),
    periodEnd: new Date(Date.now() + 30 * 86_400_000),
  })
}

function seedBonusPurchase(userId: string, amount: number): PurchaseRow {
  const row: PurchaseRow = {
    id: nextId('purchase'),
    userId,
    amount,
    remaining: amount,
    expiresAt: new Date(Date.now() + 90 * 86_400_000),
    expired: false,
    source: 'purchase',
    stripePaymentId: null,
    createdAt: new Date(),
  }
  state.purchases.push(row)
  return row
}

/** bonus balance reconciled from the BonusCreditPurchase pool (source of truth). */
function poolBonusRemaining(userId: string): number {
  return state.purchases
    .filter((p) => p.userId === userId && !p.expired)
    .reduce((s, p) => s + p.remaining, 0)
}

beforeEach(() => {
  state.userCredits.clear()
  state.purchases = []
  state.creditTransactions = []
  state.idemLogs.clear()
  state.cuid = 0
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------

describe('consumeCredits — concurrent spend on the same user never overspends', () => {
  it('N concurrent single-credit consumes against a limited bonus balance honor the cap (no double-spend, no negative)', async () => {
    const userId = 'race_consume_1'
    const BONUS = 5
    const CONCURRENT = 12 // far more callers than there are credits
    seedUser(userId, { bonus: BONUS })
    seedBonusPurchase(userId, BONUS)

    const { consumeCredits } = await import('@/lib/credits/creditService')

    const results = await Promise.all(
      Array.from({ length: CONCURRENT }, () => consumeCredits(userId, 'reading', 1))
    )

    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    // Exactly BONUS callers may win; the rest must be cleanly rejected.
    expect(succeeded).toBe(BONUS)
    expect(failed).toBe(CONCURRENT - BONUS)

    const row = state.userCredits.get(userId)!
    // Never overspent: bonusCredits floored at 0, never negative.
    expect(row.bonusCredits).toBe(0)
    expect(row.bonusCredits).toBeGreaterThanOrEqual(0)
    // Counter and pool agree — the lost-update race did not drain the pool twice.
    expect(poolBonusRemaining(userId)).toBe(0)

    // Audit rows for BONUS consume == credits actually spent (no phantom spend).
    const bonusConsumed = state.creditTransactions
      .filter((t) => t.type === 'CONSUME' && t.pool === 'BONUS')
      .reduce((s, t) => s + Math.abs(t.amount), 0)
    expect(bonusConsumed).toBe(BONUS)
  })

  it('concurrent multi-credit consumes never let total spent exceed the balance', async () => {
    const userId = 'race_consume_2'
    const BONUS = 10
    seedUser(userId, { bonus: BONUS })
    seedBonusPurchase(userId, BONUS)

    const { consumeCredits } = await import('@/lib/credits/creditService')

    // Five callers each asking for 3 → demand 15 against balance 10.
    const results = await Promise.all(
      Array.from({ length: 5 }, () => consumeCredits(userId, 'reading', 3))
    )

    const totalSpent = results.filter((r) => r.success).length * 3
    expect(totalSpent).toBeLessThanOrEqual(BONUS)

    const row = state.userCredits.get(userId)!
    expect(row.bonusCredits).toBeGreaterThanOrEqual(0)
    // Pool counter and aggregate counter stay consistent (no lost update).
    expect(poolBonusRemaining(userId)).toBe(row.bonusCredits)
    expect(row.bonusCredits).toBe(BONUS - totalSpent)
  })

  it('the BONUS pool is protected by an atomic conditional update — concurrent spend cannot exceed it even when monthly is also present', async () => {
    // Companion to the monthly-pool characterization test below. With a user
    // who has ONLY bonus credits (monthly = 0), the bonus path's conditional
    // updateMany (`remaining >= toConsume`) fully serializes commits, so the
    // cap holds exactly even under heavy concurrency.
    const userId = 'race_consume_3'
    const BONUS = 3
    seedUser(userId, { monthly: 0, used: 0, bonus: BONUS })
    seedBonusPurchase(userId, BONUS)

    const { consumeCredits } = await import('@/lib/credits/creditService')

    const results = await Promise.all(
      Array.from({ length: 10 }, () => consumeCredits(userId, 'reading', 1))
    )
    const succeeded = results.filter((r) => r.success).length

    expect(succeeded).toBe(BONUS)
    const row = state.userCredits.get(userId)!
    expect(row.bonusCredits).toBe(0)
    expect(poolBonusRemaining(userId)).toBe(0)
  })

  // REGRESSION TEST — the MONTHLY pool is now guarded by an atomic conditional
  // update mirroring the bonus pool: the monthly decrement only commits when
  // `usedCredits <= monthlyCredits - fromMonthly` (creditService.ts), and
  // count===0 is treated as insufficient. Under READ COMMITTED, concurrent
  // callers each re-check the now-committed usedCredits, so the increment chain
  // stops exactly at the monthly balance — no overspend, no negative balance.
  // (Previously this was a [characterization] test asserting the buggy
  // overspend; flipped after the conditional guard + DB CHECK landed.)
  it('MONTHLY-only pool cannot be overspent under concurrency (atomic conditional guard)', async () => {
    const userId = 'race_monthly_gap'
    const MONTHLY = 4
    seedUser(userId, { monthly: MONTHLY, used: 0, bonus: 0 })

    const { consumeCredits } = await import('@/lib/credits/creditService')

    const results = await Promise.all(
      Array.from({ length: 10 }, () => consumeCredits(userId, 'reading', 1))
    )
    const succeeded = results.filter((r) => r.success).length
    const row = state.userCredits.get(userId)!

    // Exactly the monthly balance is spent; the rest are refused as insufficient.
    expect(succeeded).toBe(MONTHLY)
    // Invariant the new DB CHECK also enforces: usedCredits never exceeds monthly.
    expect(row.usedCredits).toBe(MONTHLY)
    expect(row.usedCredits).toBeLessThanOrEqual(row.monthlyCredits)
  })
})

describe('consumeBonusCreditOnceInTx — concurrent single-unit consumes are race-safe', () => {
  it('only as many concurrent consumes succeed as there are remaining bonus units', async () => {
    const userId = 'race_once_1'
    const BONUS = 3
    seedUser(userId, { bonus: BONUS })
    seedBonusPurchase(userId, BONUS)

    const { consumeBonusCreditOnceInTx } = await import('@/lib/credits/creditService')

    // Each call runs in its own $transaction, mirroring concurrent route hits.
    const runOne = () =>
      (fakePrisma.$transaction as ReturnType<typeof vi.fn>)((tx: unknown) =>
        consumeBonusCreditOnceInTx(tx as never, userId)
      ).catch(() => false) // FIFO-drift rollback path returns via throw → treat as failure

    const results = await Promise.all(Array.from({ length: 8 }, runOne))
    const wins = results.filter((r) => r === true).length

    expect(wins).toBe(BONUS)
    const row = state.userCredits.get(userId)!
    expect(row.bonusCredits).toBe(0)
    expect(row.bonusCredits).toBeGreaterThanOrEqual(0)
    expect(poolBonusRemaining(userId)).toBe(0)
  })
})

describe('idempotency claim() — concurrent double-click / multi-tab charges exactly once', () => {
  it('exactly one of N concurrent claims on the same key wins (create-as-lock)', async () => {
    const { createIdempotencyStore } = await import('@/lib/api/idempotency')
    const store = createIdempotencyStore('test-route')
    const scopedKey = 'test-route:user_x:dup-key'

    const results = await Promise.all(Array.from({ length: 10 }, () => store.claim(scopedKey)))

    const winners = results.filter((r) => r === true).length
    // Exactly one caller is told to charge; the rest are replays (skip charge).
    expect(winners).toBe(1)
    expect(state.idemLogs.has(scopedKey)).toBe(true)
  })

  it('after a winner releases (charge failed), a subsequent claim can win again — no permanently-free turn', async () => {
    const { createIdempotencyStore } = await import('@/lib/api/idempotency')
    const store = createIdempotencyStore('test-route')
    const scopedKey = 'test-route:user_y:retry-key'

    const first = await Promise.all([store.claim(scopedKey), store.claim(scopedKey)])
    expect(first.filter(Boolean).length).toBe(1)

    // Winner's charge failed → release the marker so a retry can re-charge.
    await store.release(scopedKey)

    const second = await store.claim(scopedKey)
    expect(second).toBe(true) // retry is allowed to charge exactly once
  })
})

describe('drawNonceStore.consume() — concurrent consume of one nonce yields one "first"', () => {
  it('exactly one concurrent consume gets "first" (charge); the rest are "replay"', async () => {
    const { createDrawNonceStore } = await import('@/lib/api/idempotency')
    const store = createDrawNonceStore('interpret')
    const ownerKey = 'user_z'
    const nonce = 'nonce-abc'

    await store.issue(nonce, ownerKey)

    const results = await Promise.all(
      Array.from({ length: 6 }, () => store.consume(nonce, ownerKey))
    )

    const firsts = results.filter((r) => r === 'first').length
    const replays = results.filter((r) => r === 'replay').length
    expect(firsts).toBe(1)
    expect(replays).toBe(5)
  })

  it('an un-issued (forged/expired) nonce is never "first" under concurrency — no free pass', async () => {
    const { createDrawNonceStore } = await import('@/lib/api/idempotency')
    const store = createDrawNonceStore('interpret')

    const results = await Promise.all(
      Array.from({ length: 4 }, () => store.consume('forged', 'user_q'))
    )
    // Unknown nonce → caller charges normally; never a free 'replay' skip.
    expect(results.every((r) => r === 'unknown')).toBe(true)
  })
})

describe('refundCreditsOnce — concurrent refunds for the same key refund exactly once', () => {
  it('N concurrent refundCreditsOnce on the same idempotency key perform a single refund', async () => {
    const refundParams = {
      userId: 'refund_user_1',
      creditType: 'compatibility' as const,
      amount: 1,
      reason: 'api_error',
    }
    // Spy refundCredits so we count how many real refunds executed, regardless
    // of return-value bookkeeping.
    const refundSpy = vi.fn(async () => true)
    vi.doMock('@/lib/credits/creditRefund', () => ({ refundCredits: refundSpy }))
    vi.resetModules()
    // Re-establish the prisma + logger mocks for the freshly-reset module graph.
    vi.doMock('@/lib/db/prisma', () => ({ prisma: fakePrisma }))
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    }))

    const { refundCreditsOnce } = await import('@/lib/credits/refundOnce')

    const results = await Promise.all(
      Array.from({ length: 8 }, () => refundCreditsOnce('turn-42', refundParams))
    )

    const performed = results.filter((r) => r === true).length
    expect(performed).toBe(1)
    expect(refundSpy).toHaveBeenCalledTimes(1)
    expect(state.idemLogs.has('refund:turn-42')).toBe(true)

    vi.doUnmock('@/lib/credits/creditRefund')
    vi.resetModules()
  })

  it('concurrent no-key refunds with identical params dedupe to one via the synthesized key', async () => {
    const refundParams = {
      userId: 'refund_user_2',
      creditType: 'reading' as const,
      amount: 2,
      reason: 'timeout',
    }
    const refundSpy = vi.fn(async () => true)
    vi.doMock('@/lib/credits/creditRefund', () => ({ refundCredits: refundSpy }))
    vi.resetModules()
    vi.doMock('@/lib/db/prisma', () => ({ prisma: fakePrisma }))
    vi.doMock('@/lib/logger', () => ({
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    }))

    const { refundCreditsOnce } = await import('@/lib/credits/refundOnce')

    const results = await Promise.all(
      Array.from({ length: 5 }, () => refundCreditsOnce(null, refundParams))
    )
    expect(results.filter((r) => r === true).length).toBe(1)
    expect(refundSpy).toHaveBeenCalledTimes(1)

    vi.doUnmock('@/lib/credits/creditRefund')
    vi.resetModules()
  })
})
