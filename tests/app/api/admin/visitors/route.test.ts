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
vi.mock('@/lib/db/prisma', () => ({
  prisma: { $queryRaw: vi.fn(), $executeRawUnsafe: vi.fn(), user: { count: vi.fn() } },
}))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/visitors/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(days: number | string = 30): NextRequest {
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
      // today
      .mockResolvedValueOnce([
        { today_visits: 8n, today_pageviews: 19n, today_logged_in: 3n, yesterday_visits: 6n },
      ])
      // hourly
      .mockResolvedValueOnce([
        { hour: 9, pageviews: 12n, visits: 7n },
        { hour: 21, pageviews: 30n, visits: 18n },
      ])
      // countries
      .mockResolvedValueOnce([
        { country: 'KR', visits: 30n, pageviews: 80n },
        { country: 'US', visits: 8n, pageviews: 15n },
      ])
      // realtime active
      .mockResolvedValueOnce([{ active: 4n, pageviews: 9n }])
    vi.mocked(prisma.user.count).mockResolvedValue(10)

    const res = await GET(req(30))
    expect(res.status).toBe(200)
    const data = (await res.json()).data
    expect(data.today).toMatchObject({
      visits: 8,
      pageviews: 19,
      loggedInVisits: 3,
      anonymousVisits: 5,
      yesterdayVisits: 6,
    })
    expect(data.realtime).toMatchObject({ active: 4, pageviews: 9 })
    // 전환: signups 10 / visits 40 = 25%
    expect(data.conversion).toMatchObject({ visits: 40, signups: 10, rate: 25 })
    expect(data.hourly).toHaveLength(24)
    expect(data.hourly[9]).toMatchObject({ hour: 9, visits: 7 })
    expect(data.hourly[0]).toMatchObject({ hour: 0, visits: 0 })
    expect(data.countries[0]).toMatchObject({ country: 'KR', visits: 30 })
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

  it('self-heals (creates table) and returns ready-empty when PageView is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    const tableErr = Object.assign(new Error('relation "PageView" does not exist'), {
      code: '42P01',
    })
    vi.mocked(prisma.$queryRaw).mockRejectedValue(tableErr)
    vi.mocked(prisma.$executeRawUnsafe).mockResolvedValue(0 as never)

    const res = await GET(req())
    expect(res.status).toBe(200)
    const data = (await res.json()).data
    // 테이블 생성 성공 → notReady=false(정상 빈 상태), DDL 실행됨
    expect(prisma.$executeRawUnsafe).toHaveBeenCalled()
    expect(data.notReady).toBe(false)
    expect(data.daily).toEqual([])
    expect(data.summary.visits).toBe(0)
  })

  it('stays notReady when self-heal also fails', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    const tableErr = Object.assign(new Error('relation "PageView" does not exist'), {
      code: '42P01',
    })
    vi.mocked(prisma.$queryRaw).mockRejectedValue(tableErr)
    vi.mocked(prisma.$executeRawUnsafe).mockRejectedValue(new Error('no DDL permission'))

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect((await res.json()).data.notReady).toBe(true)
  })

  it('supports days=all (전체 기간) → rangeDays "all"', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as never)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ pageviews: 5n, visits: 3n, logged_in_visits: 1n }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { today_visits: 1n, today_pageviews: 2n, today_logged_in: 0n, yesterday_visits: 0n },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ active: 0n, pageviews: 0n }])
    vi.mocked(prisma.user.count).mockResolvedValue(2)

    const data = (await (await GET(req('all'))).json()).data
    expect(data.rangeDays).toBe('all')
    expect(data.summary.visits).toBe(3)
    expect(data.conversion).toMatchObject({ visits: 3, signups: 2 })
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
      .mockResolvedValueOnce([
        { today_visits: 0n, today_pageviews: 0n, today_logged_in: 0n, yesterday_visits: 0n },
      ])
      .mockResolvedValueOnce([]) // hourly
      .mockResolvedValueOnce([]) // countries
      .mockResolvedValueOnce([{ active: 0n, pageviews: 0n }]) // realtime
    vi.mocked(prisma.user.count).mockResolvedValue(0)

    const data = (await (await GET(req())).json()).data
    expect(data.summary.loginShare).toBe(0)
    expect(data.summary.anonymousVisits).toBe(0)
    expect(data.today.visits).toBe(0)
    expect(data.conversion.rate).toBe(0)
    expect(data.hourly).toHaveLength(24)
    expect(data.daily).toEqual([])
  })
})
