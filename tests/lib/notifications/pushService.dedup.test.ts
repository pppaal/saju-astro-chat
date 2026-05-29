/**
 * Regression: push dedup race (B2).
 *
 * Two overlapping cron invocations (Vercel regional retry, redeploy
 * race) for the same (user, type, day, hour) used to land in
 * `sendScheduledNotifications` simultaneously. The old design:
 *   1. read "isPushAlreadySent" (fails open on DB error)
 *   2. send
 *   3. markPushSent — gated on `result.sent > 0`
 * had two races: both invocations could pass step 1 before either
 * marked, AND any send with zero successful endpoints would never get
 * marked at all (so every retry re-sent).
 *
 * Fix: claim the dedup slot atomically BEFORE sending. The unique
 * constraint on RequestIdempotencyLog.scopedKey is the race winner.
 * The loser short-circuits without sending.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockSendNotification = vi.fn().mockResolvedValue({})
const mockSetVapidDetails = vi.fn()
vi.mock('web-push', () => ({
  default: {
    sendNotification: mockSendNotification,
    setVapidDetails: mockSetVapidDetails,
  },
}))

// In-memory dedup table that mimics a Postgres unique constraint on
// `scopedKey`. The two parallel invocations both contend on this map;
// whichever calls .create first wins, the other gets a P2002.
const dedupTable = new Map<string, { scopedKey: string; expiresAt: Date }>()

const mockRequestIdempotencyLog = {
  create: vi.fn(async ({ data }: { data: { scopedKey: string; expiresAt: Date } }) => {
    if (dedupTable.has(data.scopedKey)) {
      const err = new Error('Unique constraint failed') as Error & { code?: string }
      err.code = 'P2002'
      throw err
    }
    dedupTable.set(data.scopedKey, data)
    return data
  }),
  findUnique: vi.fn(async ({ where }: { where: { scopedKey: string } }) => {
    return dedupTable.get(where.scopedKey) ?? null
  }),
  update: vi.fn(async ({
    where,
    data,
  }: {
    where: { scopedKey: string }
    data: { expiresAt: Date }
  }) => {
    const existing = dedupTable.get(where.scopedKey)
    if (!existing) {
      const err = new Error('Record not found') as Error & { code?: string }
      err.code = 'P2025'
      throw err
    }
    const merged = { ...existing, ...data }
    dedupTable.set(where.scopedKey, merged)
    return merged
  }),
}

const mockPushSubscription = {
  findMany: vi.fn(),
  update: vi.fn().mockResolvedValue({}),
  delete: vi.fn().mockResolvedValue({}),
}

const mockUser = {
  findMany: vi.fn(),
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    requestIdempotencyLog: mockRequestIdempotencyLog,
    pushSubscription: mockPushSubscription,
    user: mockUser,
  },
}))

vi.mock('@/lib/notifications/dailyTransitNotifications', () => ({
  generateDailyNotifications: vi.fn(() => [
    {
      type: 'daily_fortune',
      title: '오늘의 운세',
      message: '좋은 하루입니다',
      emoji: '✨',
      confidence: 4,
      category: 'positive',
    },
  ]),
  getNotificationsForHour: vi.fn((notifications: unknown[]) => notifications),
}))

vi.mock('@/lib/notifications/premiumNotifications', () => ({
  generatePremiumNotifications: vi.fn(() => []),
  checkActivePromotions: vi.fn(() => null),
}))

vi.mock('@/lib/credits/creditService', () => ({
  getUserCredits: vi.fn(),
  getCreditBalance: vi.fn(),
}))

describe('sendScheduledNotifications — B2 dedup race', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    dedupTable.clear()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'test-public-key',
      VAPID_PRIVATE_KEY: 'test-private-key',
      VAPID_SUBJECT: 'mailto:test@example.com',
    }

    // Same user shows up in both parallel invocations.
    mockUser.findMany.mockResolvedValue([
      {
        id: 'user-1',
        name: 'Tester',
        profile: { birthDate: new Date('1990-05-15'), birthTime: '10:30' },
        credits: null,
        subscriptions: [],
      },
    ])

    // One active push subscription for the user.
    mockPushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        endpoint: 'https://push.example.com/sub1',
        p256dh: 'key1',
        auth: 'auth1',
        failCount: 0,
      },
    ])

    mockSendNotification.mockResolvedValue({})
  })

  it('two parallel cron invocations only send one push (atomic claim wins the race)', async () => {
    const { sendScheduledNotifications } = await import('@/lib/notifications/pushService')

    // Fire both invocations concurrently — they share the same dedupTable.
    const [resA, resB] = await Promise.all([
      sendScheduledNotifications(9),
      sendScheduledNotifications(9),
    ])

    // Only one webpush.sendNotification call should have been issued
    // for the (user-1, daily_fortune, hour=9) slot, regardless of which
    // invocation won the race.
    expect(mockSendNotification).toHaveBeenCalledTimes(1)

    // Combined "sent" should equal 1 — winner sent once, loser sent zero.
    expect(resA.sent + resB.sent).toBe(1)

    // Exactly one row claimed the dedup slot.
    expect(dedupTable.size).toBe(1)
  })

  it('a second cron invocation after a successful send is also skipped (mark survives)', async () => {
    const { sendScheduledNotifications } = await import('@/lib/notifications/pushService')

    await sendScheduledNotifications(9)
    expect(mockSendNotification).toHaveBeenCalledTimes(1)

    // Vercel retries 30s later — should still skip.
    mockSendNotification.mockClear()
    await sendScheduledNotifications(9)
    expect(mockSendNotification).not.toHaveBeenCalled()
  })

  it('dedup slot is claimed even if the send call fails (no infinite retry)', async () => {
    // This is the intentional trade-off: a transient send failure consumes
    // the slot so retries don't pile on. Push UX prefers occasional miss
    // over double-send.
    mockSendNotification.mockRejectedValueOnce(new Error('Network blip'))

    const { sendScheduledNotifications } = await import('@/lib/notifications/pushService')
    await sendScheduledNotifications(9)

    // Slot consumed.
    expect(dedupTable.size).toBe(1)

    // Retry shouldn't fire send again.
    mockSendNotification.mockClear()
    await sendScheduledNotifications(9)
    expect(mockSendNotification).not.toHaveBeenCalled()
  })
})
