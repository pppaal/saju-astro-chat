/**
 * Tests for Admin Conversion-funnel API
 * GET /api/admin/funnel?days=N
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
    user: { findMany: vi.fn() },
    reading: { findMany: vi.fn() },
    tarotReading: { findMany: vi.fn() },
    counselorChatSession: { findMany: vi.fn() },
    bonusCreditPurchase: { findMany: vi.fn() },
  },
}))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/funnel/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(days?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/funnel')
  if (days !== undefined) url.searchParams.set('days', days)
  return new NextRequest(url)
}

describe('GET /api/admin/funnel', () => {
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
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(false)
    expect((await GET(req())).status).toBe(403)
  })

  it('computes funnel counts and conversion rates with de-duped activation', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    // 코호트 4명
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: 'u1' },
      { id: 'u2' },
      { id: 'u3' },
      { id: 'u4' },
    ] as any)
    // u1,u2 리딩 / u2 타로(중복) / u3 상담 → activated distinct = {u1,u2,u3}=3
    vi.mocked(prisma.reading.findMany).mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }] as any)
    vi.mocked(prisma.tarotReading.findMany).mockResolvedValue([{ userId: 'u2' }] as any)
    vi.mocked(prisma.counselorChatSession.findMany).mockResolvedValue([{ userId: 'u3' }] as any)
    // u1 결제 → paid = 1
    vi.mocked(prisma.bonusCreditPurchase.findMany).mockResolvedValue([{ userId: 'u1' }] as any)

    const data = (await (await GET(req('30'))).json()).data
    expect(data.steps).toHaveLength(3)
    expect(data.steps[0]).toMatchObject({ key: 'signup', count: 4, fromStart: 100 })
    expect(data.steps[1]).toMatchObject({ key: 'activated', count: 3, fromStart: 75 })
    expect(data.steps[2]).toMatchObject({ key: 'paid', count: 1 })
    // 첫결제 fromStart = 1/4 = 25%, fromPrev = 1/3 ≈ 33.3%
    expect(data.steps[2].fromStart).toBe(25)
    expect(data.steps[2].fromPrev).toBeCloseTo(33.3, 1)
  })

  it('returns zeros when no one signed up (and skips activity queries)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any)
    const data = (await (await GET(req())).json()).data
    expect(data.steps.map((s: { count: number }) => s.count)).toEqual([0, 0, 0])
    expect(prisma.reading.findMany).not.toHaveBeenCalled()
  })

  it('returns 500 on db error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('boom'))
    expect((await GET(req())).status).toBe(500)
  })
})
