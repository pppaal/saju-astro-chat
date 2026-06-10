/**
 * Tests for Admin Revenue & Credit-economy API
 * GET /api/admin/revenue?days=N
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
  prisma: {
    bonusCreditPurchase: { findMany: vi.fn(), aggregate: vi.fn() },
    creditTransaction: { aggregate: vi.fn() },
  },
}))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/revenue/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(days?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/revenue')
  if (days !== undefined) url.searchParams.set('days', days)
  return new NextRequest(url)
}

function setupAdmin() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  // 2건: plus 팩(100크레딧=₩9,900) 1건(오늘) + mega(240=₩19,900) 1건
  vi.mocked(prisma.bonusCreditPurchase.findMany).mockResolvedValue([
    { amount: 100, createdAt: new Date() },
    { amount: 240, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  ] as any)
  vi.mocked(prisma.bonusCreditPurchase.aggregate)
    .mockResolvedValueOnce({ _sum: { amount: 1000 } } as any) // issuedPaid
    .mockResolvedValueOnce({ _sum: { amount: 300 } } as any) // issuedFree
    .mockResolvedValueOnce({ _sum: { remaining: 400 } } as any) // outstanding
    .mockResolvedValueOnce({ _sum: { remaining: 50 } } as any) // expiredLost
  vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({ _sum: { amount: -620 } } as any)
}

describe('GET /api/admin/revenue', () => {
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

  it('maps credit packs to KRW and sums window/today revenue', async () => {
    setupAdmin()
    const data = (await (await GET(req('30'))).json()).data
    expect(data.revenue.windowKrw).toBe(9900 + 19900)
    expect(data.revenue.todayKrw).toBe(9900) // only the plus pack is today
    expect(data.revenue.purchaseCount).toBe(2)
    // byPack sorted by krw desc → mega first
    expect(data.revenue.byPack[0]).toMatchObject({ credits: 240, count: 1, krw: 19900 })
    // daily array has one entry per day
    expect(data.revenue.daily).toHaveLength(30)
  })

  it('reports credit economy, consumed as absolute value', async () => {
    setupAdmin()
    const data = (await (await GET(req())).json()).data
    expect(data.credits).toEqual({
      issuedPaid: 1000,
      issuedFree: 300,
      consumed: 620, // abs(-620)
      outstanding: 400,
      expiredLost: 50,
    })
    // refunds 통계는 CreditRefundLog 제거(2026-06-06)로 응답에서 빠짐.
    expect(data.refunds).toBeUndefined()
  })

  it('returns 500 on db error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.bonusCreditPurchase.findMany).mockRejectedValue(new Error('boom'))
    expect((await GET(req())).status).toBe(500)
  })
})
