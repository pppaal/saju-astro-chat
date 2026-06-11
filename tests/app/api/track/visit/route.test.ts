/**
 * Tests for Anonymous Visit Beacon — POST /api/track/visit
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 239,
    reset: Date.now() + 60000,
    limit: 240,
    headers: new Headers(),
  }),
}))
vi.mock('@/lib/request-ip', () => ({ getClientIp: vi.fn(() => '203.0.113.7') }))
vi.mock('@/lib/telemetry', () => ({ captureServerError: vi.fn() }))
vi.mock('@/lib/metrics', () => ({ recordCounter: vi.fn(), recordTiming: vi.fn() }))
vi.mock('@/lib/auth/publicToken', () => ({ requirePublicToken: vi.fn(() => ({ valid: true })) }))
vi.mock('@/lib/security/csrf', () => ({ csrfGuard: vi.fn(() => null) }))
vi.mock('@/lib/db/prisma', () => ({ prisma: { pageView: { create: vi.fn() } } }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/track/visit/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

const UA_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36'
const UA_BOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

function req(body: Record<string, unknown>, ua = UA_DESKTOP): NextRequest {
  return new NextRequest('http://localhost:3000/api/track/visit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': ua, host: 'localhost' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/track/visit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(null)
  })

  it('records an anonymous pageview', async () => {
    const res = await POST(req({ path: '/tarot', referrer: 'https://google.com/search' }))
    expect(res.status).toBe(200)
    expect(prisma.pageView.create).toHaveBeenCalledTimes(1)
    const arg = vi.mocked(prisma.pageView.create).mock.calls[0][0].data
    expect(arg).toMatchObject({
      path: '/tarot',
      isLoggedIn: false,
      userId: null,
      device: 'desktop',
      referrerHost: 'google.com',
    })
    expect(typeof arg.visitorId).toBe('string')
    expect((arg.visitorId as string).length).toBe(32)
  })

  it('marks logged-in visits and attaches userId', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-9', email: 'a@b.com' },
      expires: '2099-01-01',
    } as never)
    await POST(req({ path: '/mypage' }))
    const arg = vi.mocked(prisma.pageView.create).mock.calls[0][0].data
    expect(arg).toMatchObject({ path: '/mypage', isLoggedIn: true, userId: 'user-9' })
  })

  it('skips admin paths without writing', async () => {
    const res = await POST(req({ path: '/admin/visitors' }))
    expect(res.status).toBe(200)
    expect(prisma.pageView.create).not.toHaveBeenCalled()
  })

  it('skips API and asset paths', async () => {
    await POST(req({ path: '/api/foo' }))
    await POST(req({ path: '/logo.png' }))
    expect(prisma.pageView.create).not.toHaveBeenCalled()
  })

  it('skips bots', async () => {
    const res = await POST(req({ path: '/tarot' }, UA_BOT))
    expect(res.status).toBe(200)
    expect(prisma.pageView.create).not.toHaveBeenCalled()
  })

  it('drops the query string from the path', async () => {
    await POST(req({ path: '/tarot?utm_source=x#frag' }))
    expect(vi.mocked(prisma.pageView.create).mock.calls[0][0].data.path).toBe('/tarot')
  })

  it('ignores same-origin referrer', async () => {
    await POST(req({ path: '/tarot', referrer: 'http://localhost/home' }))
    expect(vi.mocked(prisma.pageView.create).mock.calls[0][0].data.referrerHost).toBeNull()
  })
})
