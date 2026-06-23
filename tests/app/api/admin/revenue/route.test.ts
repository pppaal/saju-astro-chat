/**
 * Tests for Admin Revenue & Credit-economy API
 * GET /api/admin/revenue?days=N
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
    bonusCreditPurchase: { findMany: vi.fn(), aggregate: vi.fn() },
    creditTransaction: { aggregate: vi.fn(), findMany: vi.fn() },
  },
}))
vi.mock('@/lib/auth/admin', () => ({ isAdminUser: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/admin/revenue/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { isAdminUser } from '@/lib/auth/admin'

const adminSession = { user: { id: 'admin-1', email: 'admin@example.com' }, expires: '2099-12-31' }

function req(days?: string): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/revenue')
  if (days !== undefined) url.searchParams.set('days', days)
  return new NextRequest(url)
}

function setupAdmin() {
  vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
  vi.mocked(isAdminUser).mockResolvedValue(true)
  // 2건: plus 팩(100크레딧=₩9,900) 1건(오늘) + mega(240=₩19,900) 1건
  vi.mocked(prisma.bonusCreditPurchase.findMany).mockResolvedValue([
    { amount: 100, createdAt: new Date() },
    { amount: 240, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
  ] as any)
  vi.mocked(prisma.bonusCreditPurchase.aggregate)
    .mockResolvedValueOnce({ _sum: { amount: 1000 } } as any) // issuedPaid
    .mockResolvedValueOnce({ _sum: { amount: 300 } } as any) // issuedFree
    .mockResolvedValueOnce({ _sum: { remaining: 400 } } as any) // outstanding
    .mockResolvedValueOnce({ _sum: { remaining: 50 } } as any) // expiredLost
  vi.mocked(prisma.creditTransaction.aggregate).mockResolvedValue({ _sum: { amount: -620 } } as any)
  // 기본: 기간 내 환불 없음
  vi.mocked(prisma.creditTransaction.findMany).mockResolvedValue([] as any)
}

describe('GET /api/admin/revenue', () => {
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

  // zod 검증 도입 후: 잘못된 days 는 silent clamp(→30) 대신 422 거부.
  // setupAdmin() 은 mockResolvedValueOnce 큐를 쌓는데 422 는 DB 도달 전에
  // 끊겨 큐가 다음 테스트로 새므로, 여기선 세션/어드민 mock 만 직접 세팅.
  it.each(['999', '0', 'abc'])('rejects invalid days=%s with 422', async (days) => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    const res = await GET(req(days))
    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('maps credit packs to KRW and sums window/today revenue', async () => {
    setupAdmin()
    const data = (await (await GET(req('30'))).json()).data
    expect(data.revenue.windowKrw).toBe(9900 + 19900)
    expect(data.revenue.todayKrw).toBe(9900) // only the plus pack is today
    expect(data.revenue.purchaseCount).toBe(2)
    // byPack sorted by krw desc → mega first
    expect(data.revenue.byPack[0]).toMatchObject({ credits: 240, count: 1, krw: 19900 })
    // daily array has one entry per day
    expect(data.revenue.daily).toHaveLength(30)
    // R1 회귀: 마지막 버킷은 *오늘* 이어야 하고 오늘 매출이 거기 담겨야 한다.
    // (직전엔 버킷이 어제에서 끝나 오늘 매출이 차트에서 통째로 누락됐다.)
    const todayKey = new Date().toISOString().slice(0, 10)
    const last = data.revenue.daily[data.revenue.daily.length - 1]
    expect(last.date).toBe(todayKey)
    expect(last.krw).toBe(9900)
    // 환불 없음 → 순매출 = 총매출, 환불액 0
    expect(data.revenue.netKrw).toBe(9900 + 19900)
    expect(data.revenue.refundedKrw).toBe(0)
  })

  it('subtracts refunded purchases from net revenue', async () => {
    setupAdmin()
    // mega 팩(240크레딧=₩19,900) 1건이 기간 내 환불됨.
    vi.mocked(prisma.creditTransaction.findMany).mockResolvedValue([
      { sourceRef: 'pi_mega', amount: -240 },
    ] as any)
    // 환불된 결제(pi_mega)의 원구매 = mega 팩 240크레딧
    vi.mocked(prisma.bonusCreditPurchase.findMany)
      .mockResolvedValueOnce([
        { amount: 100, createdAt: new Date() },
        { amount: 240, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      ] as any) // windowPurchases
      .mockResolvedValueOnce([{ amount: 240 }] as any) // refundedPurchases 조회
    const data = (await (await GET(req('30'))).json()).data
    expect(data.revenue.windowKrw).toBe(9900 + 19900) // 총매출 불변
    expect(data.revenue.refundedKrw).toBe(19900)
    expect(data.revenue.netKrw).toBe(9900) // 순매출 = 29,800 − 19,900
    expect(data.refunds).toEqual({ count: 1, krw: 19900, creditsRefunded: 240 })
  })

  it('reports credit economy, consumed as absolute value', async () => {
    setupAdmin()
    const data = (await (await GET(req())).json()).data
    expect(data.credits).toEqual({
      issuedPaid: 1000,
      issuedFree: 300,
      consumed: 620, // abs(-620)
      outstanding: 400,
      expiredLost: 50,
    })
    // refunds 통계는 CreditTransaction(REVOKE/stripe_refund) SSOT 로 재구현.
    expect(data.refunds).toEqual({ count: 0, krw: 0, creditsRefunded: 0 })
  })

  it('returns 500 on db error', async () => {
    vi.mocked(getServerSession).mockResolvedValue(adminSession as any)
    vi.mocked(isAdminUser).mockResolvedValue(true)
    vi.mocked(prisma.bonusCreditPurchase.findMany).mockRejectedValue(new Error('boom'))
    expect((await GET(req())).status).toBe(500)
  })
})
