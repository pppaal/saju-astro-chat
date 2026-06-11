/**
 * Tests for Admin Anomaly Detection API
 * GET /api/admin/anomalies?days=N
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
    creditTransaction: { groupBy: vi.fn() },
    bonusCreditPurchase: { groupBy: vi.fn() },
    user: { findMany: vi.fn() },
  },
}))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/anomalies/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(days?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/anomalies')
  if (days !== undefined) url.searchParams.set('days', days)
  return new NextRequest(url)
}

function setupAdmin() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  // CONSUME 는 음수. u1 가장 많이 소비(-50), u2 -10, u3 0(필터됨)
  vi.mocked(prisma.creditTransaction.groupBy).mockResolvedValue([
    { userId: 'u1', _sum: { amount: -50 } },
    { userId: 'u2', _sum: { amount: -10 } },
    { userId: 'u3', _sum: { amount: 0 } },
  ] as any)
  // 무료 지급: u2 200, u1 30
  vi.mocked(prisma.bonusCreditPurchase.groupBy).mockResolvedValue([
    { userId: 'u2', _sum: { amount: 200 } },
    { userId: 'u1', _sum: { amount: 30 } },
  ] as any)
  vi.mocked(prisma.user.findMany).mockResolvedValue([
    { id: 'u1', email: 'a@b.com', name: 'A' },
    { id: 'u2', email: 'c@d.com', name: 'C' },
  ] as any)
}

describe('GET /api/admin/anomalies', () => {
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

  // zod 검증 도입 후: 잘못된 days 는 silent clamp(→30) 대신 422 거부.
  it.each(['999', '0', 'abc'])('rejects invalid days=%s with 422', async (days) => {
    setupAdmin()
    const res = await GET(req(days))
    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('ranks top consumers by absolute consumption and attaches emails', async () => {
    setupAdmin()
    const data = (await (await GET(req('30'))).json()).data
    expect(data.topConsumers).toHaveLength(2) // u3 (0) filtered out
    expect(data.topConsumers[0]).toMatchObject({ userId: 'u1', consumed: 50, email: 'a@b.com' })
    expect(data.topConsumers[1]).toMatchObject({ userId: 'u2', consumed: 10 })
  })

  it('ranks top free-grant receivers and filters via stripePaymentId null', async () => {
    setupAdmin()
    const data = (await (await GET(req())).json()).data
    expect(data.topGranted[0]).toMatchObject({ userId: 'u2', granted: 200 })
    const where = vi.mocked(prisma.bonusCreditPurchase.groupBy).mock.calls[0][0] as any
    expect(where.where.stripePaymentId).toBeNull()
    expect(where.where.createdAt.gte).toBeInstanceOf(Date)
  })

  it('returns 500 on db error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.creditTransaction.groupBy).mockRejectedValue(new Error('boom'))
    expect((await GET(req())).status).toBe(500)
  })
})
