import { describe, it, expect, vi, beforeEach } from 'vitest'

// 첫구매 스타터팩 자격 모듈(money). Stripe Price 설정 여부 + 구매 이력으로
// 자격을 판정한다. 외부 의존(Stripe price 조회, prisma 조회)을 mock 해
// 세 함수의 분기를 모두 잠근다 — 라우트/체크아웃이 공유하는 규칙이라 회귀 가드.
const getCreditPackPriceIdMock = vi.fn()
vi.mock('@/lib/payments/prices', () => ({
  getCreditPackPriceId: (...a: unknown[]) => getCreditPackPriceIdMock(...a),
}))

const findFirstMock = vi.fn()
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    bonusCreditPurchase: {
      findFirst: (...a: unknown[]) => findFirstMock(...a),
    },
  },
}))

import {
  isStarterConfigured,
  hasMadePurchase,
  isStarterEligible,
  STARTER_PACK,
} from '@/lib/credits/starterPack'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('starterPack', () => {
  describe('isStarterConfigured', () => {
    it('true when the Stripe starter price id is set', () => {
      getCreditPackPriceIdMock.mockReturnValue('price_123')
      expect(isStarterConfigured()).toBe(true)
      expect(getCreditPackPriceIdMock).toHaveBeenCalledWith('starter')
    })

    it('false when the starter price id is missing', () => {
      getCreditPackPriceIdMock.mockReturnValue(null)
      expect(isStarterConfigured()).toBe(false)
    })
  })

  describe('hasMadePurchase', () => {
    it('true when a real purchase row exists', async () => {
      findFirstMock.mockResolvedValue({ id: 'p1' })
      await expect(hasMadePurchase('u1')).resolves.toBe(true)
      // source='purchase' 만 '구매'로 친다 (리퍼럴/프로모/기프트 제외).
      expect(findFirstMock).toHaveBeenCalledWith({
        where: { userId: 'u1', source: 'purchase' },
        select: { id: true },
      })
    })

    it('false when no purchase row', async () => {
      findFirstMock.mockResolvedValue(null)
      await expect(hasMadePurchase('u1')).resolves.toBe(false)
    })
  })

  describe('isStarterEligible', () => {
    it('false when not configured — short-circuits before the DB lookup', async () => {
      getCreditPackPriceIdMock.mockReturnValue(null)
      await expect(isStarterEligible('u1')).resolves.toBe(false)
      expect(findFirstMock).not.toHaveBeenCalled()
    })

    it('false when configured but the user already purchased', async () => {
      getCreditPackPriceIdMock.mockReturnValue('price_123')
      findFirstMock.mockResolvedValue({ id: 'p1' })
      await expect(isStarterEligible('u1')).resolves.toBe(false)
    })

    it('true when configured and no prior purchase (first-time buyer)', async () => {
      getCreditPackPriceIdMock.mockReturnValue('price_123')
      findFirstMock.mockResolvedValue(null)
      await expect(isStarterEligible('u1')).resolves.toBe(true)
    })
  })

  it('STARTER_PACK exposes the starter credit pack config', () => {
    expect(STARTER_PACK).toBeDefined()
  })
})
