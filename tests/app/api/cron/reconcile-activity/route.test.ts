/**
 * /api/cron/reconcile-activity — 과금↔활동 정합성 cron.
 *
 * 보안(401), 고아 과금 발견 시 Sentry 알림(captureException) + byRoute 집계,
 * 고아 없을 때 무알림, settling 윈도(in-flight 제외) 검증. reconciliation 로직
 * 자체는 findOrphanedCharges 단위 테스트가 핀 — 여기선 cron 배선만.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/credits/reconcileActivity', () => ({
  findOrphanedCharges: vi.fn(),
}))

vi.mock('@/lib/telemetry', () => ({
  captureException: vi.fn(),
}))

import { GET } from '@/app/api/cron/reconcile-activity/route'
import { findOrphanedCharges } from '@/lib/credits/reconcileActivity'
import { captureException } from '@/lib/telemetry'

const SECRET = 'cron-secret-for-test'
const mockFind = findOrphanedCharges as unknown as ReturnType<typeof vi.fn>
const mockCapture = captureException as unknown as ReturnType<typeof vi.fn>

function makeRequest(auth?: string) {
  return new NextRequest('http://localhost:3000/api/cron/reconcile-activity', {
    method: 'GET',
    headers: auth ? { authorization: auth } : {},
  })
}

const orphan = (id: string, apiRoute?: string) => ({
  transactionId: id,
  userId: 'u1',
  createdAt: new Date('2026-06-19T00:00:00Z'),
  amount: -1,
  apiRoute,
  activityType: 'counselor_session' as const,
  activityRef: `ref_${id}`,
})

describe('/api/cron/reconcile-activity', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, CRON_SECRET: SECRET }
    mockFind.mockResolvedValue({ scanned: 0, linked: 0, orphaned: [] })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('잘못된 시크릿이면 401, findOrphanedCharges 호출 안 함', async () => {
    const res = await GET(makeRequest('Bearer wrong'))
    expect(res.status).toBe(401)
    expect(mockFind).not.toHaveBeenCalled()
  })

  it('CRON_SECRET 미설정이면 401', async () => {
    delete process.env.CRON_SECRET
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    expect(res.status).toBe(401)
  })

  it('고아 없으면 200 + 알림 없음', async () => {
    mockFind.mockResolvedValue({ scanned: 5, linked: 5, orphaned: [] })
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.orphanedCount).toBe(0)
    expect(mockCapture).not.toHaveBeenCalled()
  })

  it('고아 발견 시 Sentry 알림 + byRoute 집계', async () => {
    mockFind.mockResolvedValue({
      scanned: 10,
      linked: 8,
      orphaned: [
        orphan('t1', 'counselor/realtime'),
        orphan('t2', 'counselor/realtime'),
        orphan('t3', 'tarot/interpret-stream'),
      ],
    })
    const res = await GET(makeRequest(`Bearer ${SECRET}`))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.orphanedCount).toBe(3)
    expect(body.byRoute).toEqual({ 'counselor/realtime': 2, 'tarot/interpret-stream': 1 })

    expect(mockCapture).toHaveBeenCalledTimes(1)
    const ctx = mockCapture.mock.calls[0][1]
    expect(ctx).toMatchObject({
      scope: 'reconcile-activity-cron',
      orphanedCount: 3,
      byRoute: { 'counselor/realtime': 2, 'tarot/interpret-stream': 1 },
    })
    expect(ctx.sampleTransactionIds).toEqual(['t1', 't2', 't3'])
  })

  it('settling 윈도 — since < until 이고 until 은 현재보다 과거(in-flight 제외)', async () => {
    await GET(makeRequest(`Bearer ${SECRET}`))
    expect(mockFind).toHaveBeenCalledTimes(1)
    const arg = mockFind.mock.calls[0][0]
    expect(arg.since.getTime()).toBeLessThan(arg.until.getTime())
    expect(arg.until.getTime()).toBeLessThan(Date.now())
  })
})
