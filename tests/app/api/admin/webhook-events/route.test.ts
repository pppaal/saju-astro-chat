/**
 * Tests for Admin Webhook/Payment-event Monitor API
 * GET /api/admin/webhook-events?days=N
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
  prisma: { stripeEventLog: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() } },
}))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/webhook-events/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(days?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/webhook-events')
  if (days !== undefined) url.searchParams.set('days', days)
  return new NextRequest(url)
}

function setupAdmin() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(prisma.stripeEventLog.count)
    .mockResolvedValueOnce(100) // total
    .mockResolvedValueOnce(3) // failed
  vi.mocked(prisma.stripeEventLog.groupBy).mockResolvedValue([
    { type: 'checkout.session.completed', success: true, _count: { id: 90 } },
    { type: 'checkout.session.completed', success: false, _count: { id: 2 } },
    { type: 'payment_intent.payment_failed', success: false, _count: { id: 1 } },
    { type: 'invoice.paid', success: true, _count: { id: 7 } },
  ] as any)
  vi.mocked(prisma.stripeEventLog.findMany).mockResolvedValue([
    {
      id: 'l1',
      eventId: 'evt_1',
      type: 'payment_intent.payment_failed',
      processedAt: new Date('2026-06-01T10:00:00Z'),
      errorMsg: 'card_declined',
    },
  ] as any)
}

describe('GET /api/admin/webhook-events', () => {
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

  it('returns totals, success rate and per-type breakdown', async () => {
    setupAdmin()
    const data = (await (await GET(req('7'))).json()).data
    expect(data.total).toBe(100)
    expect(data.failed).toBe(3)
    expect(data.successRate).toBe(97) // (100-3)/100
    // checkout.session.completed: 92 total, 2 failed
    const checkout = data.byType.find((t: any) => t.type === 'checkout.session.completed')
    expect(checkout).toEqual({ type: 'checkout.session.completed', total: 92, failed: 2 })
    // sorted by failed desc → first has the most failures
    expect(data.byType[0].failed).toBeGreaterThanOrEqual(data.byType[1].failed)
    expect(data.recentFailures[0]).toMatchObject({ eventId: 'evt_1', errorMsg: 'card_declined' })
  })

  it('defaults to 7 days and clamps invalid values', async () => {
    setupAdmin()
    expect((await (await GET(req())).json()).data.rangeDays).toBe(7)
    vi.clearAllMocks()
    setupAdmin()
    expect((await (await GET(req('999'))).json()).data.rangeDays).toBe(7)
  })

  it('returns 100% success rate when there are no events', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.stripeEventLog.count).mockResolvedValue(0)
    vi.mocked(prisma.stripeEventLog.groupBy).mockResolvedValue([] as any)
    vi.mocked(prisma.stripeEventLog.findMany).mockResolvedValue([] as any)
    const data = (await (await GET(req())).json()).data
    expect(data.successRate).toBe(100)
    expect(data.recentFailures).toEqual([])
  })

  it('returns 500 on db error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.stripeEventLog.count).mockRejectedValue(new Error('boom'))
    expect((await GET(req())).status).toBe(500)
  })
})
