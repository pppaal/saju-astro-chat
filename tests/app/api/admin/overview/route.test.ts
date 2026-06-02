/**
 * Tests for Admin Overview API
 * GET /api/admin/overview — lightweight DB aggregates for the /admin page.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 29,
    reset: Date.now() + 60000,
    limit: 30,
    headers: new Headers(),
  }),
}))
vi.mock('@/lib/request-ip', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))
vi.mock('@/lib/telemetry', () => ({ captureServerError: vi.fn() }))
vi.mock('@/lib/metrics', () => ({ recordCounter: vi.fn(), recordTiming: vi.fn() }))
vi.mock('@/lib/auth/publicToken', () => ({ requirePublicToken: vi.fn(() => ({ valid: true })) }))
vi.mock('@/lib/security/csrf', () => ({ csrfGuard: vi.fn(() => null) }))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { count: vi.fn(), findMany: vi.fn() },
    reading: { count: vi.fn(), groupBy: vi.fn() },
    bonusCreditPurchase: { aggregate: vi.fn(), count: vi.fn(), groupBy: vi.fn() },
  },
}))

vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/overview/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'
import { logger } from '@/lib/logger'

function createRequest(): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/admin/overview'))
}

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function setupHappyPath(overrides?: {
  usersTotal?: number
  usersToday?: number
  users7d?: number
  users30d?: number
  readingsTotal?: number
  readingsToday?: number
  activeToday?: number
  bonusOutstanding?: number
  purchaseCount?: number
  purchasesToday?: number
  purchases30d?: number
  payingUsers?: number
}) {
  const o = {
    usersTotal: 250,
    usersToday: 3,
    users7d: 20,
    users30d: 60,
    readingsTotal: 5000,
    readingsToday: 42,
    activeToday: 15,
    bonusOutstanding: 1234,
    purchaseCount: 80,
    purchasesToday: 2,
    purchases30d: 25,
    payingUsers: 40,
    ...overrides,
  }

  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)

  // user.count: 1st call (realUserWhere, no AND) = total; subsequent AND-windowed
  // calls in route order are today, 7d, 30d.
  let windowedUserCalls = 0
  vi.mocked(prisma.user.count).mockImplementation(async (args?: any) => {
    const hasAnd = Array.isArray(args?.where?.AND)
    if (!hasAnd) return o.usersTotal
    windowedUserCalls += 1
    return [o.usersToday, o.users7d, o.users30d][windowedUserCalls - 1] ?? 0
  })

  // reading.count: 1st (no where) = total; 2nd (createdAt) = today
  let readingCalls = 0
  vi.mocked(prisma.reading.count).mockImplementation(async () => {
    readingCalls += 1
    return readingCalls === 1 ? o.readingsTotal : o.readingsToday
  })

  vi.mocked(prisma.reading.groupBy).mockResolvedValue(
    Array.from({ length: o.activeToday }, (_, i) => ({ userId: `u${i}` })) as any
  )

  vi.mocked(prisma.bonusCreditPurchase.aggregate).mockResolvedValue({
    _sum: { remaining: o.bonusOutstanding },
  } as any)

  // bonusCreditPurchase.count order: total purchase, today, 30d
  let bcpCalls = 0
  vi.mocked(prisma.bonusCreditPurchase.count).mockImplementation(async () => {
    bcpCalls += 1
    return [o.purchaseCount, o.purchasesToday, o.purchases30d][bcpCalls - 1] ?? 0
  })

  vi.mocked(prisma.bonusCreditPurchase.groupBy).mockResolvedValue(
    Array.from({ length: o.payingUsers }, (_, i) => ({ userId: `p${i}` })) as any
  )

  vi.mocked(prisma.user.findMany).mockResolvedValue([
    { id: 'u1', email: 'a@b.com', name: 'A', createdAt: new Date('2026-05-01T00:00:00Z') },
    { id: 'u2', email: null, name: null, createdAt: new Date('2026-04-15T00:00:00Z') },
  ] as any)
}

describe('GET /api/admin/overview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  describe('Authentication & Authorization', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      const res = await GET(createRequest())
      expect(res.status).toBe(401)
      expect((await res.json()).error.code).toBe('UNAUTHORIZED')
    })

    it('rejects non-admin users', async () => {
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(false)
      const res = await GET(createRequest())
      expect(res.status).toBe(403)
      expect((await res.json()).error.code).toBe('FORBIDDEN')
    })

    it('allows admin users', async () => {
      setupHappyPath()
      const res = await GET(createRequest())
      expect(res.status).toBe(200)
      expect(isAdminUser).toHaveBeenCalledWith('admin-1')
    })
  })

  describe('Aggregated data', () => {
    beforeEach(() => setupHappyPath())

    it('returns real user counts only for accounts that can log in', async () => {
      const data = (await (await GET(createRequest())).json()).data
      expect(data.users.total).toBe(250)
      expect(data.users.today).toBe(3)
      expect(data.users.last7d).toBe(20)
      expect(data.users.last30d).toBe(60)
      expect(data.users.activeToday).toBe(15)
      expect(data.users.paying).toBe(40)

      // The "real user" filter must exclude shell accounts (OR accounts/passwordHash).
      const firstCall = vi.mocked(prisma.user.count).mock.calls[0][0] as any
      expect(firstCall.where.OR).toEqual([
        { accounts: { some: {} } },
        { passwordHash: { not: null } },
      ])
    })

    it('returns reading totals and outstanding credit liability', async () => {
      const data = (await (await GET(createRequest())).json()).data
      expect(data.readings.total).toBe(5000)
      expect(data.readings.today).toBe(42)
      expect(data.credits.outstanding).toBe(1234)
    })

    it('counts only real purchases (source=purchase)', async () => {
      const data = (await (await GET(createRequest())).json()).data
      expect(data.purchases.total).toBe(80)
      expect(data.purchases.today).toBe(2)
      expect(data.purchases.last30d).toBe(25)
      const purchaseWhere = vi.mocked(prisma.bonusCreditPurchase.count).mock.calls[0][0] as any
      expect(purchaseWhere.where.source).toBe('purchase')
    })

    it('serializes recent signups with ISO dates', async () => {
      const data = (await (await GET(createRequest())).json()).data
      expect(data.recentSignups).toHaveLength(2)
      expect(data.recentSignups[0]).toMatchObject({ id: 'u1', email: 'a@b.com' })
      expect(typeof data.recentSignups[0].createdAt).toBe('string')
      expect(data.recentSignups[1].email).toBeNull()
    })

    it('handles a zeroed-out instance', async () => {
      setupHappyPath({
        usersTotal: 0,
        usersToday: 0,
        users7d: 0,
        users30d: 0,
        readingsTotal: 0,
        readingsToday: 0,
        activeToday: 0,
        bonusOutstanding: 0,
        purchaseCount: 0,
        purchasesToday: 0,
        purchases30d: 0,
        payingUsers: 0,
      })
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as any)
      const res = await GET(createRequest())
      const data = (await res.json()).data
      expect(res.status).toBe(200)
      expect(data.users.total).toBe(0)
      expect(data.recentSignups).toEqual([])
    })
  })

  describe('Error handling', () => {
    it('returns 500 when a query throws', async () => {
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(true)
      vi.mocked(prisma.user.count).mockRejectedValue(new Error('DB down'))
      const res = await GET(createRequest())
      expect(res.status).toBe(500)
      expect((await res.json()).error.code).toBe('INTERNAL_ERROR')
      expect(logger.error).toHaveBeenCalled()
    })
  })
})
