/**
 * 셀프서비스 환불 — POST /api/me/refund-credit-pack
 *
 * 사용자가 자기 크레딧 팩(미사용 + 7일 이내 + source='purchase')을 직접
 * 환불하는 돈 흐름 라우트인데 커버리지 0% 였다. 자격 분기 전체와 Stripe
 * 멱등키(refund_pack_<purchaseId>) — 더블클릭/재시도 시 중복 환불을
 * Stripe 단에서 막는 핵심 — 를 잠근다. admin/refund-credit-pack 테스트와
 * 같은 mock 구성.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 4,
    reset: Date.now() + 60000,
    limit: 5,
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
    bonusCreditPurchase: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/stripe/client', () => ({ getStripeOrNull: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/me/refund-credit-pack/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'
import { getStripeOrNull } from '@/lib/stripe/client'

// 원자적 claim+reclaim / 롤백 트랜잭션 mock. route 는 prisma.$transaction(cb)
// 를 interactive 형태로 호출하므로 cb(tx) 를 실행해 준다. updateMany 의 count
// 가 claim 성공/실패(TOCTOU)를 가른다.
let txMock: {
  bonusCreditPurchase: { updateMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  $executeRaw: ReturnType<typeof vi.fn>
  creditTransaction: { create: ReturnType<typeof vi.fn> }
}

function setupTx(claimCount = 1) {
  txMock = {
    bonusCreditPurchase: {
      updateMany: vi.fn().mockResolvedValue({ count: claimCount }),
      update: vi.fn().mockResolvedValue({}),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
    creditTransaction: { create: vi.fn().mockResolvedValue({}) },
  }
  vi.mocked(prisma.$transaction).mockImplementation(
    // @ts-expect-error — interactive-transaction callback form
    async (cb: (tx: typeof txMock) => unknown) => cb(txMock)
  )
}

const userSession = { user: { id: 'user-1', email: 'user@example.com' }, expires: '2099-12-31' }

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/me/refund-credit-pack', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  })
}

let stripeMock: {
  paymentIntents: { retrieve: ReturnType<typeof vi.fn> }
  refunds: { create: ReturnType<typeof vi.fn> }
}

type PurchaseOverrides = {
  used?: number
  ageDays?: number
  source?: string
  expired?: boolean
  stripePaymentId?: string | null
}

function setupHappyPath(overrides: PurchaseOverrides = {}) {
  const {
    used = 0,
    ageDays = 1,
    source = 'purchase',
    expired = false,
    stripePaymentId = 'pi_1',
  } = overrides

  vi.mocked(getServerSession).mockResolvedValue(
    userSession as unknown as Awaited<ReturnType<typeof getServerSession>>
  )

  vi.mocked(prisma.bonusCreditPurchase.findFirst).mockResolvedValue({
    id: 'purchase-1',
    userId: 'user-1',
    amount: 100,
    remaining: 100 - used,
    expired,
    expiresAt: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000),
    source,
    createdAt: new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000),
    stripePaymentId,
  } as never)

  // 기본: claim 성공(count 1). TOCTOU 테스트에서 setupTx(0) 로 덮어쓴다.
  setupTx(1)

  // 원금 10,000 / 수수료 350 (balance_transaction 경로)
  stripeMock = {
    paymentIntents: {
      retrieve: vi.fn().mockResolvedValue({
        amount_received: 10000,
        latest_charge: { balance_transaction: { amount: 10000, fee: 350 } },
      }),
    },
    refunds: { create: vi.fn().mockResolvedValue({ id: 're_1' }) },
  }
  vi.mocked(getStripeOrNull).mockReturnValue(stripeMock as never)
}

describe('POST /api/me/refund-credit-pack', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('인증/입력', () => {
    it('비로그인은 401', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)
      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))
      expect(res.status).toBe(401)
    })

    it('purchaseId 누락은 422', async () => {
      setupHappyPath()
      const res = await POST(makeRequest({}))
      expect(res.status).toBe(422)
      expect((await res.json()).error.message).toContain('purchaseId')
    })
  })

  describe('자격(eligibility) 분기', () => {
    it('내 구매가 아니거나 없으면 404 — 조회는 반드시 userId 로 스코프된다', async () => {
      setupHappyPath()
      vi.mocked(prisma.bonusCreditPurchase.findFirst).mockResolvedValue(null)

      const res = await POST(makeRequest({ purchaseId: 'someone-elses' }))

      expect(res.status).toBe(404)
      expect((await res.json()).error.message).toBe('purchase_not_found')
      // 소유권 우회 방지의 핵심: where 에 userId 가 포함되는지 잠근다.
      expect(prisma.bonusCreditPurchase.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'someone-elses', userId: 'user-1' },
        })
      )
    })

    it.each([
      ['referral', 'not_refundable_source'],
      ['promotion', 'not_refundable_source'],
      ['gift', 'not_refundable_source'],
    ])('source=%s 는 환불 불가(%s)', async (source, msg) => {
      setupHappyPath({ source })
      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error.message).toBe(msg)
    })

    it('이미 만료/환불된 구매는 400', async () => {
      setupHappyPath({ expired: true })
      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error.message).toBe('already_refunded_or_expired')
    })

    it('일부 사용한 팩은 400 (used/total 표기)', async () => {
      setupHappyPath({ used: 30 })
      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error.message).toContain('partially_used (used=30/100)')
    })

    it('7일 환불 기한 경과는 400', async () => {
      setupHappyPath({ ageDays: 8 })
      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error.message).toBe('refund_window_expired')
    })

    it('stripePaymentId 없는 레거시 구매는 셀프 환불 불가 안내', async () => {
      setupHappyPath({ stripePaymentId: null })
      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))
      expect(res.status).toBe(400)
      expect((await res.json()).error.message).toBe('legacy_purchase_contact_support')
    })

    it('자격 미달이면 Stripe 환불·크레딧 회수가 절대 실행되지 않는다', async () => {
      setupHappyPath({ used: 30 })
      await POST(makeRequest({ purchaseId: 'purchase-1' }))
      expect(stripeMock.refunds.create).not.toHaveBeenCalled()
      // claim 트랜잭션에도 진입하지 않는다(stale read 단계에서 컷).
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('환불 실행', () => {
    it('balance_transaction 수수료 차감 환불 + 크레딧 회수', async () => {
      setupHappyPath()
      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))
      const data = (await res.json()).data

      expect(res.status).toBe(200)
      expect(data).toMatchObject({
        success: true,
        refundedKrw: 9650, // 10000 - 350
        feeWithheld: 350,
        originalAmount: 10000,
        stripeRefundId: 're_1',
        creditsRevoked: 100,
      })
      // 회수는 Stripe 환불 *전에* 원자적 claim 으로 일어난다. claim 의 조건부
      // updateMany 가 "아직 완전 미사용"(remaining===amount, !expired)을 가드.
      expect(txMock.bonusCreditPurchase.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'purchase-1', expired: false, remaining: 100 }),
          data: expect.objectContaining({ remaining: 0, expired: true }),
        })
      )
      // claim 1회만(롤백 없음).
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    })

    it('TOCTOU 방어 — claim 직전 일부 사용되면(count 0) 환불 거부, Stripe 미호출', async () => {
      setupHappyPath()
      // stale read 는 미사용처럼 보이지만 원자적 claim 시점엔 누가 써서 count 0.
      setupTx(0)
      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))

      expect(res.status).toBe(400)
      expect((await res.json()).error.message).toBe('partially_used_or_already_refunded')
      // 현금 한 푼도 움직이지 않는다.
      expect(stripeMock.refunds.create).not.toHaveBeenCalled()
    })

    it('더블클릭/재시도 방어 — Stripe 멱등키가 purchaseId 에 고정된다', async () => {
      setupHappyPath()
      await POST(makeRequest({ purchaseId: 'purchase-1' }))

      // 같은 구매의 두 번째 시도는 같은 멱등키로 가서 Stripe 가 첫 환불
      // 결과를 재반환한다(이중 환불 불가). 키가 요청별 랜덤으로 바뀌는
      // 회귀가 가장 위험하므로 정확한 값으로 잠근다.
      expect(stripeMock.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent: 'pi_1',
          amount: 9650,
          reason: 'requested_by_customer',
        }),
        { idempotencyKey: 'refund_pack_purchase-1' }
      )
    })

    it('balance_transaction 미확장 시 공식 수수료(3.5% + 300) 폴백', async () => {
      setupHappyPath()
      stripeMock.paymentIntents.retrieve.mockResolvedValue({
        amount_received: 10000,
        latest_charge: null,
      })

      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))
      const data = (await res.json()).data

      expect(res.status).toBe(200)
      // formula: round(10000*0.035) + 300 = 650 → 환불 9350
      expect(data.feeWithheld).toBe(650)
      expect(data.refundedKrw).toBe(9350)
    })

    it('Stripe 미설정이면 500 stripe_not_configured', async () => {
      setupHappyPath()
      vi.mocked(getStripeOrNull).mockReturnValue(null)
      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))
      expect(res.status).toBe(500)
      expect((await res.json()).error.message).toBe('stripe_not_configured')
    })

    it('PaymentIntent 조회 실패는 500 stripe_lookup_failed — 환불 시도 없음', async () => {
      setupHappyPath()
      stripeMock.paymentIntents.retrieve.mockRejectedValue(new Error('boom'))

      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))

      expect(res.status).toBe(500)
      expect((await res.json()).error.message).toBe('stripe_lookup_failed')
      expect(stripeMock.refunds.create).not.toHaveBeenCalled()
    })

    it('Stripe 환불 실패는 500 — claim 을 롤백해 크레딧을 복원한다', async () => {
      setupHappyPath()
      stripeMock.refunds.create.mockRejectedValue(new Error('card_declined'))

      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))

      expect(res.status).toBe(500)
      expect((await res.json()).error.message).toBe('stripe_refund_failed')
      // 회수는 환불 전에 일어나므로, 환불 실패 시 "크레딧만 뺏기는" 상태가 되지
      // 않도록 롤백한다: claim 트랜잭션 + 롤백 트랜잭션 = 2회, pack 복원 update 호출.
      expect(prisma.$transaction).toHaveBeenCalledTimes(2)
      expect(txMock.bonusCreditPurchase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'purchase-1' },
          data: expect.objectContaining({ remaining: 100, expired: false }),
        })
      )
    })

    it('환불액이 0 이하(수수료 ≥ 원금)면 400 refund_amount_zero', async () => {
      setupHappyPath()
      stripeMock.paymentIntents.retrieve.mockResolvedValue({
        amount_received: 300,
        latest_charge: { balance_transaction: { amount: 300, fee: 350 } },
      })

      const res = await POST(makeRequest({ purchaseId: 'purchase-1' }))

      expect(res.status).toBe(400)
      expect((await res.json()).error.message).toBe('refund_amount_zero')
      expect(stripeMock.refunds.create).not.toHaveBeenCalled()
    })
  })
})
