/**
 * Tests for Admin User Search API
 * GET /api/admin/users?q=... — search users by email/name/id.
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

vi.mock('@/lib/db/prisma', () => ({ prisma: { user: { findMany: vi.fn() } } }))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/users/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(q?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/users')
  if (q !== undefined) url.searchParams.set('q', q)
  return new NextRequest(url)
}

function setupAdmin() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  vi.mocked(prisma.user.findMany).mockResolvedValue([
    { id: 'u1', email: 'alice@example.com', name: 'Alice', role: 'user', createdAt: new Date() },
  ] as any)
}

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ADMIN_EMAILS = 'admin@example.com'
  })
  afterEach(() => {
    delete process.env.ADMIN_EMAILS
  })

  it('rejects unauthenticated requests', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)
    expect((await GET(req('alice'))).status).toBe(401)
  })

  it('rejects non-admin users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(false)
    expect((await GET(req('alice'))).status).toBe(403)
  })

  it('rejects queries shorter than 2 chars', async () => {
    setupAdmin()
    const res = await GET(req('a'))
    expect(res.status).toBe(422)
    expect(prisma.user.findMany).not.toHaveBeenCalled()
  })

  it('searches by email/name/id (case-insensitive contains + exact id)', async () => {
    setupAdmin()
    const res = await GET(req('alice'))
    const data = (await res.json()).data
    expect(res.status).toBe(200)
    expect(data.count).toBe(1)
    expect(data.users[0]).toMatchObject({ id: 'u1', email: 'alice@example.com' })

    const where = vi.mocked(prisma.user.findMany).mock.calls[0][0] as any
    expect(where.where.OR).toEqual([
      { email: { contains: 'alice', mode: 'insensitive' } },
      { name: { contains: 'alice', mode: 'insensitive' } },
      { id: 'alice' },
    ])
    expect(where.take).toBe(25)
  })

  it('returns empty list when no matches', async () => {
    setupAdmin()
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as any)
    const data = (await (await GET(req('nobody'))).json()).data
    expect(data.count).toBe(0)
    expect(data.users).toEqual([])
  })

  it('returns 500 on db error', async () => {
    setupAdmin()
    vi.mocked(prisma.user.findMany).mockRejectedValue(new Error('boom'))
    expect((await GET(req('alice'))).status).toBe(500)
  })
})
