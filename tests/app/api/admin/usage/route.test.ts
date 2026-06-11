/**
 * Tests for Admin Usage Analytics API
 * GET /api/admin/usage?days=N — service/hour/topic aggregates from real activity.
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
    counselorChatSession: { groupBy: vi.fn() },
    tarotReading: { count: vi.fn() },
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/usage/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

function createRequest(query: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/usage')
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function setupHappyPath() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)

  vi.mocked(prisma.counselorChatSession.groupBy).mockResolvedValue([
    { type: 'love', _count: { id: 30 } },
    { type: 'career', _count: { id: 12 } },
  ] as any)

  vi.mocked(prisma.tarotReading.count).mockResolvedValue(100)

  // $queryRaw is called 4 times in route order: hourly, topTopics, topTarot, daily.
  vi.mocked(prisma.$queryRaw)
    .mockResolvedValueOnce([
      { hour: 9, source: 'counselor', count: 5n },
      { hour: 9, source: 'tarot', count: 2n },
      { hour: 21, source: 'counselor', count: 3n },
    ] as any)
    .mockResolvedValueOnce([
      { topic: '연애', count: 10n },
      { topic: '직장', count: 4n },
    ] as any)
    .mockResolvedValueOnce([{ question: '이직해도 될까?', count: 6n }] as any)
    .mockResolvedValueOnce([
      { day: '2026-05-02', source: 'counselor', count: 1n },
      { day: '2026-05-01', source: 'counselor', count: 5n },
      { day: '2026-05-01', source: 'tarot', count: 2n },
    ] as any)
}

describe('GET /api/admin/usage', () => {
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
    })
  })

  describe('days parameter validation', () => {
    it('defaults to 30 days', async () => {
      setupHappyPath()
      const data = (await (await GET(createRequest())).json()).data
      expect(data.rangeDays).toBe(30)
    })

    it('accepts a valid days value', async () => {
      setupHappyPath()
      const data = (await (await GET(createRequest({ days: '7' }))).json()).data
      expect(data.rangeDays).toBe(7)
    })

    // zod 검증 도입 후: 잘못된 days 는 silent clamp(→30) 대신 422 거부.
    // 오타가 기본값으로 흡수되면 운영자가 잘못된 기간을 보고 있는 걸 모른다.
    // setupHappyPath() 의 $queryRaw Once 큐는 422 가 DB 도달 전에 끊겨
    // 소비되지 않고 다음 테스트로 새므로, 세션/어드민 mock 만 직접 세팅.
    it.each(['400', '0', '-5', 'abc'])('rejects invalid days=%s with 422', async (days) => {
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(true)
      const res = await GET(createRequest({ days }))
      expect(res.status).toBe(422)
      expect((await res.json()).error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('Aggregation', () => {
    beforeEach(() => setupHappyPath())

    it('builds a services list sorted by count desc (tarot + counselor types)', async () => {
      const data = (await (await GET(createRequest())).json()).data
      expect(data.services).toEqual([
        { service: '타로', count: 100 },
        { service: '상담:love', count: 30 },
        { service: '상담:career', count: 12 },
      ])
    })

    it('normalizes hourly buckets to 24 hours, splitting counselor/tarot', async () => {
      const data = (await (await GET(createRequest())).json()).data
      expect(data.hourly).toHaveLength(24)
      expect(data.hourly[9]).toEqual({ hour: 9, counselor: 5, tarot: 2, total: 7 })
      expect(data.hourly[21]).toEqual({ hour: 21, counselor: 3, tarot: 0, total: 3 })
      expect(data.hourly[0]).toEqual({ hour: 0, counselor: 0, tarot: 0, total: 0 })
    })

    it('merges daily rows by date and sorts ascending', async () => {
      const data = (await (await GET(createRequest())).json()).data
      expect(data.daily).toEqual([
        { day: '2026-05-01', counselor: 5, tarot: 2, total: 7 },
        { day: '2026-05-02', counselor: 1, tarot: 0, total: 1 },
      ])
    })

    it('converts bigint counts to numbers for topics and tarot questions', async () => {
      const data = (await (await GET(createRequest())).json()).data
      expect(data.topTopics).toEqual([
        { topic: '연애', count: 10 },
        { topic: '직장', count: 4 },
      ])
      expect(data.topTarotQuestions).toEqual([{ question: '이직해도 될까?', count: 6 }])
      expect(typeof data.topTopics[0].count).toBe('number')
    })

    it('includes a generatedAt timestamp', async () => {
      const data = (await (await GET(createRequest())).json()).data
      expect(typeof data.generatedAt).toBe('string')
    })
  })

  describe('Error handling', () => {
    it('returns 500 when a query throws', async () => {
      vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
      vi.mocked(isAdminUser).mockResolvedValue(true)
      vi.mocked(prisma.counselorChatSession.groupBy).mockRejectedValue(new Error('boom'))
      const res = await GET(createRequest())
      expect(res.status).toBe(500)
      expect((await res.json()).error.code).toBe('INTERNAL_ERROR')
    })
  })
})
