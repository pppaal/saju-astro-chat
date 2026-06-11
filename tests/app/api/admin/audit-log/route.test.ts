/**
 * Tests for Admin Audit Log API
 * GET /api/admin/audit-log?days=N — admin action history.
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
  prisma: { adminAuditLog: { findMany: vi.fn(), groupBy: vi.fn(), count: vi.fn() } },
}))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/audit-log/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(days?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/audit-log')
  if (days !== undefined) url.searchParams.set('days', days)
  return new NextRequest(url)
}

function setupAdmin() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValue([
    {
      id: 'log1',
      createdAt: new Date('2026-06-01T10:00:00Z'),
      adminEmail: 'admin@example.com',
      action: 'grant_credits',
      targetType: 'user',
      targetId: 'u1',
      metadata: { amount: 100, targetEmail: 't@e.com' },
      success: true,
      errorMessage: null,
    },
  ] as any)
  vi.mocked(prisma.adminAuditLog.groupBy).mockResolvedValue([
    { action: 'grant_credits', _count: { id: 5 } },
    { action: 'refund_credit_pack', _count: { id: 2 } },
  ] as any)
  vi.mocked(prisma.adminAuditLog.count).mockResolvedValue(7)
}

describe('GET /api/admin/audit-log', () => {
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

  it('returns logs, breakdown (sorted desc) and total', async () => {
    setupAdmin()
    const data = (await (await GET(req())).json()).data
    expect(data.totalLogs).toBe(7)
    expect(data.actionBreakdown[0]).toEqual({ action: 'grant_credits', count: 5 })
    expect(data.recentLogs[0]).toMatchObject({ action: 'grant_credits', success: true })
    expect(typeof data.recentLogs[0].createdAt).toBe('string')
  })

  it('defaults to 30 days and accepts a valid days value', async () => {
    setupAdmin()
    expect((await (await GET(req())).json()).data.rangeDays).toBe(30)
    expect((await (await GET(req('7'))).json()).data.rangeDays).toBe(7)
  })

  // zod 검증 도입 후: 잘못된 days 는 silent clamp(→30) 대신 422 거부.
  // 오타가 기본값으로 흡수되면 운영자가 잘못된 기간을 보고 있는 걸 모른다.
  it.each(['999', '0', '-5', 'abc'])('rejects invalid days=%s with 422', async (days) => {
    setupAdmin()
    const res = await GET(req(days))
    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 500 on db error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.adminAuditLog.findMany).mockRejectedValue(new Error('boom'))
    expect((await GET(req())).status).toBe(500)
  })
})
