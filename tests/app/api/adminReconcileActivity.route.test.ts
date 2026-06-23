/**
 * Tests for Admin 과금↔활동 정합성 감사 API
 * GET /api/admin/reconcile-activity?days=&limit= — finds orphaned charges
 * (credits consumed but no matching activity record).
 *
 * Admin route: createAdminGuard (fail-closed). Mocks session + isAdminUser,
 * and stubs findOrphanedCharges so we never touch the DB / network.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 9,
    reset: Date.now() + 60000,
    limit: 10,
    headers: new Headers(),
  }),
}))
vi.mock('@/lib/request-ip', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))
vi.mock('@/lib/telemetry', () => ({ captureServerError: vi.fn() }))
vi.mock('@/lib/metrics', () => ({ recordCounter: vi.fn(), recordTiming: vi.fn() }))
vi.mock('@/lib/auth/publicToken', () => ({ requirePublicToken: vi.fn(() => ({ valid: true })) }))
vi.mock('@/lib/security/csrf', () => ({ csrfGuard: vi.fn(() => null) }))

vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/credits/reconcileActivity', () => ({ findOrphanedCharges: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/reconcile-activity/route'
import { getServerSession } from '@/lib/auth/session'
import { isAdminUser } from '@/lib/auth/admin'
import { findOrphanedCharges } from '@/lib/credits/reconcileActivity'
import { logger } from '@/lib/logger'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/reconcile-activity')
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new NextRequest(url)
}

function cleanResult() {
  return { scanned: 0, linked: 0, orphaned: [] as unknown[] }
}

function setupAdmin() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(findOrphanedCharges).mockResolvedValue(cleanResult() as any)
}

describe('GET /api/admin/reconcile-activity', () => {
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
    expect(findOrphanedCharges).not.toHaveBeenCalled()
  })

  it('rejects non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(false)
    expect((await GET(req())).status).toBe(403)
    expect(findOrphanedCharges).not.toHaveBeenCalled()
  })

  it('returns a clean report with no orphans (defaults: days=7, limit=5000)', async () => {
    setupAdmin()
    vi.mocked(findOrphanedCharges).mockResolvedValue({
      scanned: 42,
      linked: 30,
      orphaned: [],
    } as any)
    const res = await GET(req())
    expect(res.status).toBe(200)
    const data = (await res.json()).data
    expect(data.windowDays).toBe(7)
    expect(data.scanned).toBe(42)
    expect(data.linked).toBe(30)
    expect(data.orphanedCount).toBe(0)
    expect(data.orphaned).toEqual([])
    expect(typeof data.note).toBe('string')
    // 고아 없을 때 warn 로그 안 남김
    expect(logger.warn).not.toHaveBeenCalled()
    const opts = vi.mocked(findOrphanedCharges).mock.calls[0][0] as any
    expect(opts.since).toBeInstanceOf(Date)
    expect(opts.limit).toBe(5000)
  })

  it('serializes orphaned charges and warns when orphans are found', async () => {
    setupAdmin()
    const createdAt = new Date('2026-06-10T12:00:00.000Z')
    vi.mocked(findOrphanedCharges).mockResolvedValue({
      scanned: 10,
      linked: 5,
      orphaned: [
        {
          transactionId: 'tx_1',
          userId: 'u1',
          createdAt,
          amount: 3,
          apiRoute: '/api/counselor/chat',
          activityType: 'counselor_session',
          activityRef: 'sess_1',
        },
        {
          transactionId: 'tx_2',
          userId: 'u2',
          createdAt,
          amount: 5,
          apiRoute: undefined, // null 로 직렬화돼야 함
          activityType: 'tarot_reading',
          activityRef: 'tr_2',
        },
      ],
    } as any)
    const res = await GET(req())
    expect(res.status).toBe(200)
    const data = (await res.json()).data
    expect(data.orphanedCount).toBe(2)
    expect(data.orphaned[0]).toMatchObject({
      transactionId: 'tx_1',
      userId: 'u1',
      amount: 3,
      apiRoute: '/api/counselor/chat',
      activityType: 'counselor_session',
      activityRef: 'sess_1',
    })
    // createdAt 은 ISO 문자열로 직렬화
    expect(data.orphaned[0].createdAt).toBe(createdAt.toISOString())
    // apiRoute 없으면 null
    expect(data.orphaned[1].apiRoute).toBeNull()
    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it('clamps days to MAX_DAYS (90) and limit to MAX_LIMIT (20000)', async () => {
    setupAdmin()
    await GET(req({ days: '9999', limit: '999999' }))
    const data = (await (await GET(req({ days: '9999', limit: '999999' }))).json()).data
    expect(data.windowDays).toBe(90)
    const opts = vi.mocked(findOrphanedCharges).mock.calls[0][0] as any
    expect(opts.limit).toBe(20000)
  })

  it('floors fractional days/limit and enforces the minimum of 1', async () => {
    setupAdmin()
    await GET(req({ days: '0', limit: '0' }))
    const opts = vi.mocked(findOrphanedCharges).mock.calls[0][0] as any
    expect(opts.limit).toBe(1)
    const data = (await (await GET(req({ days: '0.9', limit: '3.7' }))).json()).data
    // Math.max(1, floor(0.9)) = 1
    expect(data.windowDays).toBe(1)
    const opts2 = vi.mocked(findOrphanedCharges).mock.calls[1][0] as any
    expect(opts2.limit).toBe(3)
  })

  it('falls back to defaults when days/limit are non-numeric', async () => {
    setupAdmin()
    const data = (await (await GET(req({ days: 'abc', limit: 'xyz' }))).json()).data
    expect(data.windowDays).toBe(7)
    const opts = vi.mocked(findOrphanedCharges).mock.calls[0][0] as any
    expect(opts.limit).toBe(5000)
  })

  it('honors an explicit valid days param when computing the since window', async () => {
    setupAdmin()
    const before = Date.now()
    await GET(req({ days: '30' }))
    const after = Date.now()
    const opts = vi.mocked(findOrphanedCharges).mock.calls[0][0] as any
    const since = (opts.since as Date).getTime()
    const expectedMin = before - 30 * 24 * 60 * 60 * 1000
    const expectedMax = after - 30 * 24 * 60 * 60 * 1000
    expect(since).toBeGreaterThanOrEqual(expectedMin - 5)
    expect(since).toBeLessThanOrEqual(expectedMax + 5)
  })

  it('returns 500 when the reconciliation query throws', async () => {
    setupAdmin()
    vi.mocked(findOrphanedCharges).mockRejectedValue(new Error('db boom'))
    const res = await GET(req())
    expect(res.status).toBe(500)
    expect((await res.json()).error.message).toBe('Internal server error')
    expect(logger.error).toHaveBeenCalled()
  })
})
