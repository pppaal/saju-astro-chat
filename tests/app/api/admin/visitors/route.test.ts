/**
 * Tests for Admin Visitors API — GET /api/admin/visitors
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({ getServerSession: vi.fn() }))
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
vi.mock('@/lib/db/prisma', () => ({ prisma: { $queryRaw: vi.fn() } }))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/visitors/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(days = 30): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/visitors?days=${days}`, { method: 'GET' })
}

describe('GET /api/admin/visitors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    expect((await GET(req())).status).toBe(401)
  })

  it('rejects non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never)
    vi.mocked(isAdminUser).mockResolvedValue(false)
    expect((await GET(req())).status).toBe(403)
  })

  it('aggregates visitor data for admins (BigInt-safe)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.$queryRaw)
      // totals
      .mockResolvedValueOnce([{ pageviews: 100n, visits: 40n, logged_in_visits: 15n }])
      // daily
      .mockResolvedValueOnce([
        { day: '2026-06-10', pageviews: 60n, visits: 25n, logged_in_visits: 10n },
        { day: '2026-06-11', pageviews: 40n, visits: 15n, logged_in_visits: 5n },
      ])
      // top paths
      .mockResolvedValueOnce([{ path: '/tarot', pageviews: 50n, visits: 20n }])
      // referrers
      .mockResolvedValueOnce([{ host: 'google.com', pageviews: 30n, visits: 12n }])
      // devices
      .mockResolvedValueOnce([
        { device: 'mobile', visits: 28n },
        { device: 'desktop', visits: 12n },
      ])

    const res = await GET(req(30))
    expect(res.status).toBe(200)
    const data = (await res.json()).data
    expect(data.summary).toMatchObject({
      pageviews: 100,
      visits: 40,
      loggedInVisits: 15,
      anonymousVisits: 25,
      loginShare: 37.5,
    })
    expect(data.daily).toHaveLength(2)
    expect(data.daily[0]).toMatchObject({ day: '2026-06-10', anonymousVisits: 15 })
    expect(data.topPaths[0]).toMatchObject({ path: '/tarot', visits: 20 })
    expect(data.topReferrers[0]).toMatchObject({ host: 'google.com', visits: 12 })
    expect(data.devices).toHaveLength(2)
  })

  it('returns notReady (not 500) when the PageView table is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    const tableErr = Object.assign(new Error('relation "PageView" does not exist'), {
      code: '42P01',
    })
    vi.mocked(prisma.$queryRaw).mockRejectedValue(tableErr)

    const res = await GET(req())
    expect(res.status).toBe(200)
    const data = (await res.json()).data
    expect(data.notReady).toBe(true)
    expect(data.daily).toEqual([])
    expect(data.summary.visits).toBe(0)
  })

  it('handles empty data without dividing by zero', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ pageviews: 0n, visits: 0n, logged_in_visits: 0n }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const data = (await (await GET(req())).json()).data
    expect(data.summary.loginShare).toBe(0)
    expect(data.summary.anonymousVisits).toBe(0)
    expect(data.daily).toEqual([])
  })
})
