/**
 * /api/cron/daily-fortune — 매일 아침 운세 푸시 cron 테스트.
 *
 * 보안(429/401), VAPID 미설정(503), 발송/prune/failCount 로직을 web-push
 * mock 으로 검증. 메시지 자체는 dailyFortuneMessage 단위 테스트가 핀.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pushSubscription: {
      findMany: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    // 하루 1회 가드(claimDailyOnce)용 — 기본은 선점 성공(첫 실행).
    requestIdempotencyLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

const sendNotification = vi.fn()
vi.mock('@/lib/push/webPush', () => ({
  getWebPush: vi.fn(),
}))

import { GET, POST } from '@/app/api/cron/daily-fortune/route'
import { rateLimit } from '@/lib/rateLimit'
import { prisma } from '@/lib/db/prisma'
import { getWebPush } from '@/lib/push/webPush'

const SECRET = 'cron-secret-for-test'

function makeRequest(auth?: string) {
  return new NextRequest('http://localhost:3000/api/cron/daily-fortune', {
    method: 'GET',
    headers: auth ? { authorization: auth } : {},
  })
}

function makeSub(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sub-1',
    endpoint: 'https://push.example.com/sub-1',
    p256dh: 'p256dh',
    auth: 'auth',
    locale: 'ko',
    failCount: 0,
    user: { profile: { birthDate: '1995-02-09' } },
    ...overrides,
  }
}

describe('/api/cron/daily-fortune', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: SECRET }
    vi.mocked(getWebPush).mockReturnValue({ sendNotification } as never)
    sendNotification.mockResolvedValue({ statusCode: 201 })
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.pushSubscription.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.pushSubscription.deleteMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.requestIdempotencyLog.create).mockResolvedValue({} as never)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('IP 한도 초과면 시크릿이 맞아도 429 + 발송 없음', async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce({ allowed: false } as never)
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(429)
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('잘못된 시크릿은 401', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    expect(res.status).toBe(401)
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('CRON_SECRET 미설정이면 401', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(makeRequest('Bearer anything'))
    expect(res.status).toBe(401)
  })

  it('VAPID 미설정이면 503 not_configured (throw 금지)', async () => {
    vi.mocked(getWebPush).mockReturnValue(null)
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(503)
    expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled()
  })

  it('오늘 이미 발송했으면(하루 1회 가드) 스킵 — 조회/발송 없음', async () => {
    // claimDailyOnce 의 create-as-lock 이 unique 충돌(P2002) → 이미 선점됨.
    vi.mocked(prisma.requestIdempotencyLog.create).mockRejectedValueOnce(
      Object.assign(new Error('unique'), { code: 'P2002' }) as never
    )
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toMatchObject({ success: true, skipped: 'already_sent_today', sent: 0 })
    expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled()
    expect(sendNotification).not.toHaveBeenCalled()
  })

  it('전 구독 발송 성공 — sent 집계 + lastSentAt/failCount 일괄 갱신', async () => {
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([
      makeSub({ id: 'a', endpoint: 'https://push.example.com/a' }),
      makeSub({ id: 'b', endpoint: 'https://push.example.com/b', locale: 'en' }),
      makeSub({ id: 'c', endpoint: 'https://push.example.com/c', user: { profile: null } }),
    ] as never)

    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toMatchObject({ success: true, sent: 3, pruned: 0, failed: 0 })
    expect(sendNotification).toHaveBeenCalledTimes(3)

    // payload 형태: { title, body, url: '/calendar' }
    const payload = JSON.parse(sendNotification.mock.calls[0][1] as string)
    expect(payload.url).toBe('/calendar')
    expect(typeof payload.title).toBe('string')
    expect(payload.body.length).toBeGreaterThan(0)

    expect(prisma.pushSubscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['a', 'b', 'c'] } },
        data: expect.objectContaining({ failCount: 0 }),
      })
    )
    expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled()
  })

  it('410/404 응답 구독은 삭제(pruned), 기타 실패는 failCount++', async () => {
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([
      makeSub({ id: 'ok', endpoint: 'https://push.example.com/ok' }),
      makeSub({ id: 'gone', endpoint: 'https://push.example.com/gone' }),
      makeSub({ id: 'missing', endpoint: 'https://push.example.com/missing' }),
      makeSub({ id: 'flaky', endpoint: 'https://push.example.com/flaky', failCount: 1 }),
    ] as never)
    sendNotification.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint.endsWith('/gone'))
        throw Object.assign(new Error('gone'), { statusCode: 410 })
      if (sub.endpoint.endsWith('/missing'))
        throw Object.assign(new Error('404'), { statusCode: 404 })
      if (sub.endpoint.endsWith('/flaky'))
        throw Object.assign(new Error('5xx'), { statusCode: 500 })
      return { statusCode: 201 }
    })

    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const json = await res.json()

    expect(json).toMatchObject({ sent: 1, pruned: 2, failed: 1 })
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: expect.arrayContaining(['gone', 'missing']) } },
    })
    expect(prisma.pushSubscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['flaky'] } },
        data: { failCount: { increment: 1 } },
      })
    )
  })

  it('failCount 가 임계(5) 에 도달하는 구독은 삭제로 승격', async () => {
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue([
      makeSub({ id: 'dying', failCount: 4 }),
    ] as never)
    sendNotification.mockRejectedValue(Object.assign(new Error('timeout'), { statusCode: 500 }))

    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const json = await res.json()

    expect(json).toMatchObject({ sent: 0, pruned: 1, failed: 1 })
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['dying'] } },
    })
  })

  it('25개 구독은 10개 배치로 순차 발송된다 (동시성 상한)', async () => {
    const subs = Array.from({ length: 25 }, (_, i) =>
      makeSub({ id: `s${i}`, endpoint: `https://push.example.com/s${i}` })
    )
    vi.mocked(prisma.pushSubscription.findMany).mockResolvedValue(subs as never)

    let inFlight = 0
    let maxInFlight = 0
    sendNotification.mockImplementation(async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight -= 1
      return { statusCode: 201 }
    })

    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const json = await res.json()

    expect(json.sent).toBe(25)
    expect(maxInFlight).toBeLessThanOrEqual(10)
  })

  it('POST 도 GET 과 동일하게 동작 (cron 서비스 호환)', async () => {
    const res = await POST(makeRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(200)
  })
})
