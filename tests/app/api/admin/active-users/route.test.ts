/**
 * Tests for Admin Active Users (today) API
 * GET /api/admin/active-users — who is active today (made a reading since midnight).
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
    reading: { groupBy: vi.fn() },
    user: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/active-users/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

function createRequest(): NextRequest {
  return new NextRequest(new URL('http://localhost:3000/api/admin/active-users'))
}

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function setupHappyPath() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(prisma.reading.groupBy).mockResolvedValue([
    { userId: 'u1', _count: { id: 2 }, _max: { createdAt: new Date('2026-06-02T09:00:00Z') } },
    { userId: 'u2', _count: { id: 5 }, _max: { createdAt: new Date('2026-06-02T11:00:00Z') } },
  ] as any)
  vi.mocked(prisma.user.findMany).mockResolvedValue([
    { id: 'u1', email: 'a@b.com', name: 'A' },
    { id: 'u2', email: 'c@d.com', name: null },
  ] as any)
}

describe('GET /api/admin/active-users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  describe('Authentication & Authorization', () => {
    it('rejects unauthenticated requests', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      const res = await GET(createRequest())
      expect(res.status).toBe(401)
    })

    it('rejects non-admin users', async () => {
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(false)
      const res = await GET(createRequest())
      expect(res.status).toBe(403)
      expect((await res.json()).error.code).toBe('FORBIDDEN')
    })

    it('allows admin users', async () => {
      setupHappyPath()
      const res = await GET(createRequest())
      expect(res.status).toBe(200)
      expect(isAdminUser).toHaveBeenCalledWith('admin-1')
    })
  })

  describe('Active users list', () => {
    beforeEach(() => setupHappyPath())

    it('returns users active today with reading counts, sorted by readings desc', async () => {
      const data = (await (await GET(createRequest())).json()).data
      expect(data.count).toBe(2)
      // u2 has 5 readings → first
      expect(data.users[0]).toMatchObject({ id: 'u2', email: 'c@d.com', name: null, readings: 5 })
      expect(data.users[1]).toMatchObject({ id: 'u1', email: 'a@b.com', name: 'A', readings: 2 })
      expect(typeof data.users[0].lastActiveAt).toBe('string')
    })

    it('only counts readings since the start of today', async () => {
      await GET(createRequest())
      const where = vi.mocked(prisma.reading.groupBy).mock.calls[0][0] as any
      const since = new Date(where.where.createdAt.gte)
      expect(since.getHours()).toBe(0)
      expect(since.getMinutes()).toBe(0)
      expect(since.getSeconds()).toBe(0)
    })

    it('returns an empty list when nobody is active and does not query users', async () => {
      vi.mocked(prisma.reading.groupBy).mockResolvedValue([] as any)
      const data = (await (await GET(createRequest())).json()).data
      expect(data.count).toBe(0)
      expect(data.users).toEqual([])
      expect(prisma.user.findMany).not.toHaveBeenCalled()
    })

    it('tolerates a missing user record (orphaned reading)', async () => {
      vi.mocked(prisma.reading.groupBy).mockResolvedValue([
        { userId: 'ghost', _count: { id: 1 }, _max: { createdAt: new Date() } },
      ] as any)
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as any)
      const data = (await (await GET(createRequest())).json()).data
      expect(data.users[0]).toMatchObject({ id: 'ghost', email: null, name: null, readings: 1 })
    })
  })

  describe('Error handling', () => {
    it('returns 500 when the query throws', async () => {
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(true)
      vi.mocked(prisma.reading.groupBy).mockRejectedValue(new Error('DB down'))
      const res = await GET(createRequest())
      expect(res.status).toBe(500)
      expect((await res.json()).error.code).toBe('INTERNAL_ERROR')
    })
  })
})
