/**
 * Tests for Admin Users-by-segment API
 * GET /api/admin/users-by?segment=... — user lists behind overview cards.
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
    user: { count: vi.fn(), findMany: vi.fn() },
    bonusCreditPurchase: { groupBy: vi.fn() },
  },
}))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/users-by/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(segment?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/users-by')
  if (segment !== undefined) url.searchParams.set('segment', segment)
  return new NextRequest(url)
}

function setupAdmin() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(prisma.user.count).mockResolvedValue(250)
  vi.mocked(prisma.user.findMany).mockResolvedValue([
    { id: 'u1', email: 'a@b.com', name: 'A', createdAt: new Date('2026-06-01T00:00:00Z') },
    { id: 'u2', email: null, name: null, createdAt: new Date('2026-05-30T00:00:00Z') },
  ] as any)
  vi.mocked(prisma.bonusCreditPurchase.groupBy).mockResolvedValue([
    { userId: 'u1' },
    { userId: 'u2' },
  ] as any)
}

describe('GET /api/admin/users-by', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    expect((await GET(req('total'))).status).toBe(401)
  })

  it('rejects non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(false)
    expect((await GET(req('total'))).status).toBe(403)
  })

  it('rejects an invalid segment', async () => {
    setupAdmin()
    const res = await GET(req('bogus'))
    expect(res.status).toBe(422)
    expect((await res.json()).error.message).toContain('Invalid segment')
  })

  it('returns total members with real-user filter and ISO dates', async () => {
    setupAdmin()
    const data = (await (await GET(req('total'))).json()).data
    expect(data.segment).toBe('total')
    expect(data.count).toBe(250)
    expect(data.users[0]).toMatchObject({ id: 'u1', email: 'a@b.com' })
    expect(typeof data.users[0].createdAt).toBe('string')
    // real-user filter applied
    const where = vi.mocked(prisma.user.count).mock.calls[0][0] as any
    expect(where.where.AND[0].OR).toEqual([
      { accounts: { some: {} } },
      { passwordHash: { not: null } },
    ])
  })

  it.each(['today', '7d', '30d'])('applies a createdAt window for %s', async (seg) => {
    setupAdmin()
    await GET(req(seg))
    const where = vi.mocked(prisma.user.findMany).mock.calls[0][0] as any
    expect(where.where.AND[1].createdAt.gte).toBeInstanceOf(Date)
    expect(where.take).toBe(100)
  })

  it('returns paying users from purchase groupBy', async () => {
    setupAdmin()
    const data = (await (await GET(req('paying'))).json()).data
    expect(data.segment).toBe('paying')
    expect(data.count).toBe(2) // distinct purchasers
    const gb = vi.mocked(prisma.bonusCreditPurchase.groupBy).mock.calls[0][0] as any
    expect(gb.where.source).toBe('purchase')
  })

  it('returns empty paying list without querying users when nobody paid', async () => {
    setupAdmin()
    vi.mocked(prisma.bonusCreditPurchase.groupBy).mockResolvedValue([] as any)
    const data = (await (await GET(req('paying'))).json()).data
    expect(data.count).toBe(0)
    expect(data.users).toEqual([])
    expect(prisma.user.findMany).not.toHaveBeenCalled()
  })

  it('returns 500 on db error', async () => {
    setupAdmin()
    vi.mocked(prisma.user.count).mockRejectedValue(new Error('boom'))
    expect((await GET(req('total'))).status).toBe(500)
  })
})
