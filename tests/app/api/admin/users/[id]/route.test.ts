/**
 * Tests for Admin User Detail API
 * GET /api/admin/users/[id] — drill-down on a single user.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 59,
    reset: Date.now() + 60000,
    limit: 60,
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
    user: { findUnique: vi.fn() },
    userCredits: { findUnique: vi.fn() },
    bonusCreditPurchase: { count: vi.fn(), findMany: vi.fn() },
    reading: { count: vi.fn(), findFirst: vi.fn() },
    tarotReading: { count: vi.fn() },
    counselorChatSession: { count: vi.fn() },
  },
}))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/users/[id]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function call(id: string) {
  const req = new NextRequest(new URL(`http://localhost:3000/api/admin/users/${id}`))
  return GET(req, { params: Promise.resolve({ id }) })
}

function setupHappyPath() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: 'u1',
    email: 'a@b.com',
    name: 'Alice',
    role: 'user',
    image: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    passwordHash: null,
    accounts: [{ provider: 'google' }],
  } as any)
  vi.mocked(prisma.userCredits.findUnique).mockResolvedValue({
    plan: 'free',
    monthlyCredits: 10,
    usedCredits: 4,
    bonusCredits: 120,
    totalBonusReceived: 200,
  } as any)
  vi.mocked(prisma.bonusCreditPurchase.count).mockResolvedValue(3)
  vi.mocked(prisma.bonusCreditPurchase.findMany).mockResolvedValue([
    {
      amount: 100,
      remaining: 80,
      source: 'purchase',
      expired: false,
      createdAt: new Date('2026-05-01T00:00:00Z'),
      stripePaymentId: 'pi_1',
    },
  ] as any)
  vi.mocked(prisma.reading.count).mockResolvedValue(12)
  vi.mocked(prisma.tarotReading.count).mockResolvedValue(5)
  vi.mocked(prisma.counselorChatSession.count).mockResolvedValue(2)
  vi.mocked(prisma.reading.findFirst).mockResolvedValue({
    createdAt: new Date('2026-06-01T10:00:00Z'),
  } as any)
}

describe('GET /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    expect((await call('u1')).status).toBe(401)
  })

  it('rejects non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(false)
    expect((await call('u1')).status).toBe(403)
  })

  it('returns 404 when the user does not exist', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await call('ghost')
    expect(res.status).toBe(404)
    expect((await res.json()).error.message).toBe('user_not_found')
  })

  it('returns full drill-down: profile, credits, activity, purchases', async () => {
    setupHappyPath()
    const res = await call('u1')
    const data = (await res.json()).data

    expect(res.status).toBe(200)
    expect(data.user).toMatchObject({
      id: 'u1',
      email: 'a@b.com',
      role: 'user',
      hasPassword: false,
      providers: ['google'],
    })
    expect(data.credits).toMatchObject({
      plan: 'free',
      monthlyRemaining: 6, // 10 - 4
      bonusCredits: 120,
      totalBonusReceived: 200,
    })
    expect(data.activity).toMatchObject({ readings: 12, tarot: 5, counselor: 2, total: 19 })
    expect(typeof data.activity.lastReadingAt).toBe('string')
    expect(data.purchases.paidCount).toBe(3)
    expect(data.purchases.recent[0]).toMatchObject({ amount: 100, remaining: 80, source: 'purchase' })
  })

  it('handles a user with no credits row', async () => {
    setupHappyPath()
    vi.mocked(prisma.userCredits.findUnique).mockResolvedValue(null)
    const data = (await (await call('u1')).json()).data
    expect(data.credits).toBeNull()
  })

  it('returns 500 on db error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('boom'))
    expect((await call('u1')).status).toBe(500)
  })
})
