/**
 * Tests for Admin Purchases API
 * GET /api/admin/purchases?window=today|7d|30d|all — 결제 카드 드릴다운(결제 건 목록).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({ getServerSession: vi.fn() }))
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
    user: { findMany: vi.fn() },
    bonusCreditPurchase: { count: vi.fn(), findMany: vi.fn() },
  },
}))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/purchases/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(window?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/purchases')
  if (window !== undefined) url.searchParams.set('window', window)
  return new NextRequest(url)
}

function setupAdmin() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(prisma.bonusCreditPurchase.count).mockResolvedValue(2)
  vi.mocked(prisma.bonusCreditPurchase.findMany).mockResolvedValue([
    {
      id: 'bcp1',
      userId: 'u1',
      amount: 100,
      createdAt: new Date('2026-06-10T00:00:00Z'),
      stripePaymentId: 'pi_1',
    },
    {
      id: 'bcp2',
      userId: 'u2',
      amount: 240,
      createdAt: new Date('2026-06-09T00:00:00Z'),
      stripePaymentId: 'pi_2',
    },
  ] as any)
  vi.mocked(prisma.user.findMany).mockResolvedValue([
    { id: 'u1', email: 'a@b.com', name: 'A' },
    { id: 'u2', email: null, name: null },
  ] as any)
}

describe('GET /api/admin/purchases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    expect((await GET(req('all'))).status).toBe(401)
  })

  it('rejects non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(false)
    expect((await GET(req('all'))).status).toBe(403)
  })

  it('rejects an invalid window', async () => {
    setupAdmin()
    const res = await GET(req('bogus'))
    expect(res.status).toBe(422)
    expect((await res.json()).error.message).toContain('Invalid window')
  })

  it('returns individual purchases joined with buyer identity', async () => {
    setupAdmin()
    const data = (await (await GET(req('all'))).json()).data
    expect(data.window).toBe('all')
    expect(data.count).toBe(2)
    expect(data.purchases[0]).toMatchObject({
      id: 'bcp1',
      userId: 'u1',
      email: 'a@b.com',
      amount: 100,
    })
    // 이메일 없는 구매자도 userId 로 식별 가능
    expect(data.purchases[1]).toMatchObject({ userId: 'u2', email: null })
    expect(typeof data.purchases[0].createdAt).toBe('string')
    // 실결제만 — stripePaymentId not null 필터
    const where = vi.mocked(prisma.bonusCreditPurchase.findMany).mock.calls[0][0] as any
    expect(where.where.stripePaymentId).toEqual({ not: null })
  })

  it('applies a createdAt window for 7d', async () => {
    setupAdmin()
    await GET(req('7d'))
    const where = vi.mocked(prisma.bonusCreditPurchase.findMany).mock.calls[0][0] as any
    expect(where.where.createdAt.gte).toBeInstanceOf(Date)
  })

  it('does not filter createdAt for window=all', async () => {
    setupAdmin()
    await GET(req('all'))
    const where = vi.mocked(prisma.bonusCreditPurchase.findMany).mock.calls[0][0] as any
    expect(where.where.createdAt).toBeUndefined()
  })

  it('defaults to window=all when param missing', async () => {
    setupAdmin()
    const data = (await (await GET(req())).json()).data
    expect(data.window).toBe('all')
  })

  it('returns 500 on db error', async () => {
    setupAdmin()
    vi.mocked(prisma.bonusCreditPurchase.count).mockRejectedValue(new Error('boom'))
    expect((await GET(req('all'))).status).toBe(500)
  })
})
