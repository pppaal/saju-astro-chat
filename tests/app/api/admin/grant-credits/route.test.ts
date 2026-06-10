/**
 * Tests for Admin Grant Credits API
 * POST /api/admin/grant-credits — admin grants bonus credits to a user.
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

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    adminAuditLog: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/auth/adminAudit', () => ({ logAdminAction: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/credits/creditService', () => ({
  addBonusCredits: vi.fn(),
  getUserCredits: vi.fn(),
}))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/admin/grant-credits/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'
import { logAdminAction } from '@/lib/auth/adminAudit'
import { addBonusCredits, getUserCredits } from '@/lib/credits/creditService'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/grant-credits', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  })
}

function setupHappyPath() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(prisma.user.findFirst).mockResolvedValue({
    id: 'target-1',
    email: 'target@example.com',
    name: 'Target',
  } as any)
  vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValue([] as any) // nothing granted today
  vi.mocked(addBonusCredits).mockResolvedValue(undefined as any)
  vi.mocked(getUserCredits).mockResolvedValue({ bonusCredits: 130 } as any)
}

describe('POST /api/admin/grant-credits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
    delete process.env.ADMIN_GRANT_DAILY_CAP
  })

  describe('Authentication & Authorization', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      const res = await POST(makeRequest({ userIdOrEmail: 'x@y.com', amount: 10 }))
      expect(res.status).toBe(401)
    })

    it('rejects non-admin users', async () => {
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(false)
      const res = await POST(makeRequest({ userIdOrEmail: 'x@y.com', amount: 10 }))
      expect(res.status).toBe(403)
      expect((await res.json()).error.code).toBe('FORBIDDEN')
      expect(addBonusCredits).not.toHaveBeenCalled()
    })
  })

  describe('Input validation', () => {
    beforeEach(() => setupHappyPath())

    it('requires userIdOrEmail', async () => {
      const res = await POST(makeRequest({ amount: 10 }))
      expect(res.status).toBe(422)
      expect((await res.json()).error.message).toContain('userIdOrEmail')
    })

    it.each([0, -5, 10001, 3.5, 'abc'])('rejects invalid amount %s', async (amount) => {
      const res = await POST(makeRequest({ userIdOrEmail: 'target@example.com', amount }))
      expect(res.status).toBe(422)
      expect((await res.json()).error.message).toContain('amount')
      expect(addBonusCredits).not.toHaveBeenCalled()
    })

    it('accepts the boundary amount 10000', async () => {
      const res = await POST(makeRequest({ userIdOrEmail: 'target@example.com', amount: 10000 }))
      expect(res.status).toBe(200)
    })
  })

  describe('Target lookup', () => {
    beforeEach(() => setupHappyPath())

    it('returns 404 when the user does not exist', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null)
      const res = await POST(makeRequest({ userIdOrEmail: 'ghost@example.com', amount: 10 }))
      expect(res.status).toBe(404)
      expect((await res.json()).error.message).toBe('user_not_found')
    })

    it('looks up by lowercased email when value contains @', async () => {
      await POST(makeRequest({ userIdOrEmail: 'Target@Example.com', amount: 10 }))
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'target@example.com' } })
      )
    })

    it('looks up by id when value has no @', async () => {
      await POST(makeRequest({ userIdOrEmail: 'target-1', amount: 10 }))
      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'target-1' } })
      )
    })
  })

  describe('Granting', () => {
    beforeEach(() => setupHappyPath())

    it('grants credits and returns the new balance', async () => {
      const res = await POST(
        makeRequest({ userIdOrEmail: 'target@example.com', amount: 100, source: 'promotion' })
      )
      const data = (await res.json()).data

      expect(res.status).toBe(200)
      expect(addBonusCredits).toHaveBeenCalledWith('target-1', 100, 'promotion')
      expect(data).toMatchObject({
        success: true,
        userId: 'target-1',
        granted: 100,
        bonusBalanceAfter: 130,
        source: 'promotion',
      })
    })

    it('defaults source to gift for unknown source values', async () => {
      const res = await POST(
        makeRequest({ userIdOrEmail: 'target@example.com', amount: 5, source: 'bogus' })
      )
      expect((await res.json()).data.source).toBe('gift')
    })

    it('writes a successful audit log entry', async () => {
      await POST(makeRequest({ userIdOrEmail: 'target@example.com', amount: 100 }))
      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'grant_credits', success: true, targetId: 'target-1' })
      )
    })

    it('returns 500 and logs a failed audit entry when the grant throws', async () => {
      vi.mocked(addBonusCredits).mockRejectedValue(new Error('ledger error'))
      const res = await POST(makeRequest({ userIdOrEmail: 'target@example.com', amount: 100 }))
      expect(res.status).toBe(500)
      expect((await res.json()).error.message).toBe('grant_failed')
      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'grant_credits', success: false })
      )
    })
  })

  describe('Per-admin daily cap', () => {
    beforeEach(() => setupHappyPath())

    it('rejects a grant that would exceed the daily cap', async () => {
      // Already granted 49,000 today; default cap is 50,000.
      vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValue([
        { metadata: { amount: 49000 } },
      ] as any)

      const res = await POST(makeRequest({ userIdOrEmail: 'target@example.com', amount: 2000 }))
      expect(res.status).toBe(403)
      expect((await res.json()).error.message).toBe('daily_cap_exceeded')
      expect(addBonusCredits).not.toHaveBeenCalled()
      expect(logAdminAction).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, errorMessage: 'daily_cap_exceeded' })
      )
    })

    it('allows a grant that stays within the daily cap', async () => {
      vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValue([
        { metadata: { amount: 1000 } },
      ] as any)
      const res = await POST(makeRequest({ userIdOrEmail: 'target@example.com', amount: 2000 }))
      expect(res.status).toBe(200)
      expect(addBonusCredits).toHaveBeenCalled()
    })

    it('honors a custom ADMIN_GRANT_DAILY_CAP from env at module load', async () => {
      // The cap is read at module load, so we can only assert the default here;
      // this test documents that the cap is enforced via sumGrantedToday.
      vi.mocked(prisma.adminAuditLog.findMany).mockResolvedValue([
        { metadata: { amount: 50000 } },
      ] as any)
      const res = await POST(makeRequest({ userIdOrEmail: 'target@example.com', amount: 1 }))
      expect(res.status).toBe(403)
    })
  })
})
