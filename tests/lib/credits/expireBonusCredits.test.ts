/**
 * Regression: expireBonusCredits over-marking (B1).
 *
 * The per-user updateMany used to flip `expired: true` on ANY row past
 * expiresAt, including rows with `remaining: 0` (already consumed,
 * refunded, or revoked). The deduction amount, however, was computed
 * only over `remaining > 0` rows.
 *
 * Net effect: balance was untouched but the audit trail was corrupted,
 * AND `revokeBonusCreditPurchase`'s `purchase.expired` idempotency guard
 * misfired on previously-refunded rows (returning `already_refunded`
 * instead of an idempotent no-op).
 *
 * Fix: `remaining: { gt: 0 }` in the updateMany filter so only rows with
 * actually-unused bonus get flipped.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@/lib/db/prisma'
import { expireBonusCredits } from '@/lib/credits/creditService'

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    bonusCreditPurchase: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}))

describe('expireBonusCredits — B1 over-marking regression', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('only flips rows with remaining > 0 to expired=true', async () => {
    // Two users, mixed remaining values past expiresAt.
    ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      // user1 still has 5 unused → should be expired
      { id: 'p-active', userId: 'user1', remaining: 5 },
    ])

    // Capture the updateMany call args.
    const capturedFilters: Array<Record<string, unknown>> = []
    ;(prisma.bonusCreditPurchase.updateMany as ReturnType<typeof vi.fn>).mockImplementation(
      (args: { where: Record<string, unknown> }) => {
        capturedFilters.push(args.where)
        return Promise.resolve({ count: 1 })
      }
    )
    ;(prisma.$executeRaw as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(1)

    // Simulate $transaction by executing the prisma operations directly.
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (ops: Promise<unknown>[]) => {
        return Promise.all(ops)
      }
    )

    await expireBonusCredits()

    // Critical assertion: the updateMany filter MUST include remaining > 0.
    expect(capturedFilters.length).toBeGreaterThan(0)
    for (const where of capturedFilters) {
      expect(where).toMatchObject({
        userId: 'user1',
        expired: false,
        remaining: { gt: 0 },
      })
      // expiresAt filter still present
      expect(where.expiresAt).toBeDefined()
    }
  })

  it('does not flip already-consumed (remaining=0) purchases for the same user', async () => {
    // The findMany itself already filters remaining > 0, but the bug was
    // in the updateMany — confirm the filter is tight.
    ;(prisma.bonusCreditPurchase.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'p-1', userId: 'user1', remaining: 3 },
    ])

    let updateManyCall: { where: Record<string, unknown>; data: unknown } | null = null
    ;(prisma.bonusCreditPurchase.updateMany as ReturnType<typeof vi.fn>).mockImplementation(
      (args: { where: Record<string, unknown>; data: unknown }) => {
        updateManyCall = args
        return Promise.resolve({ count: 1 })
      }
    )
    ;(prisma.$executeRaw as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(1)
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (ops: Promise<unknown>[]) => {
        return Promise.all(ops)
      }
    )

    await expireBonusCredits()

    // The remaining > 0 filter is what stops 0-remaining rows from
    // being collateral damage. This is the load-bearing assertion.
    expect(updateManyCall).not.toBeNull()
    const where = updateManyCall!.where as Record<string, unknown>
    expect(where.remaining).toEqual({ gt: 0 })
  })
})
