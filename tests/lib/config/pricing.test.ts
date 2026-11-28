/**
 * Pricing Configuration Tests
 * 가격 설정 및 A/B 테스트 유틸리티 테스트
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  CREDIT_PACKS,
  getCreditPackDiscount,
  getAllCreditPackIds,
  formatPrice,
  BASE_CREDIT_PRICE_KRW,
  BONUS_CREDIT_EXPIRATION_MONTHS,
  type CreditPackType,
} from '@/lib/config/pricing'

describe('PricingConfig', () => {
  describe('CREDIT_PACKS configuration', () => {
    it('should have mini pack config', () => {
      const mini = CREDIT_PACKS.mini
      expect(mini.id).toBe('mini')
      // 2026-06 가치기반 개편(B안): mini 12크레딧 / ₩5,900.
      expect(mini.credits).toBe(12)
      expect(mini.pricing.krw).toBe(5900)
    })

    it('should have starter as a first-purchase-only pack', () => {
      const starter = CREDIT_PACKS.starter
      expect(starter.id).toBe('starter')
      expect(starter.firstPurchaseOnly).toBe(true)
      expect(starter.credits).toBe(8)
      expect(starter.pricing.krw).toBe(2900)
    })

    it('should mark only starter as firstPurchaseOnly', () => {
      const flagged = getAllCreditPackIds().filter((id) => CREDIT_PACKS[id].firstPurchaseOnly)
      expect(flagged).toEqual(['starter'])
    })

    it('should have plus pack marked as popular', () => {
      expect(CREDIT_PACKS.plus.popular).toBe(true)
    })

    it('should have decreasing per-credit price for larger packs', () => {
      const packs = ['mini', 'standard', 'plus', 'mega', 'ultimate'] as CreditPackType[]
      for (let i = 0; i < packs.length - 1; i++) {
        expect(CREDIT_PACKS[packs[i]].perCreditKrw).toBeGreaterThan(
          CREDIT_PACKS[packs[i + 1]].perCreditKrw
        )
      }
    })

    it('should have correct perCreditKrw calculation', () => {
      for (const pack of Object.values(CREDIT_PACKS)) {
        const calculated = Math.round(pack.pricing.krw / pack.credits)
        // Allow small rounding differences
        expect(Math.abs(pack.perCreditKrw - calculated)).toBeLessThanOrEqual(10)
      }
    })
  })

  describe('getCreditPackDiscount', () => {
    it('should return 0% discount for mini pack', () => {
      expect(getCreditPackDiscount('mini')).toBe(0)
    })

    it('should return positive discount for larger packs', () => {
      const packs: CreditPackType[] = ['standard', 'plus', 'mega', 'ultimate']
      for (const pack of packs) {
        expect(getCreditPackDiscount(pack)).toBeGreaterThan(0)
      }
    })

    it('should return increasing discount for larger packs', () => {
      const packs: CreditPackType[] = ['mini', 'standard', 'plus', 'mega', 'ultimate']
      let lastDiscount = -1
      for (const pack of packs) {
        const discount = getCreditPackDiscount(pack)
        expect(discount).toBeGreaterThanOrEqual(lastDiscount)
        lastDiscount = discount
      }
    })

    it('should return rounded percentage', () => {
      for (const packId of getAllCreditPackIds()) {
        const discount = getCreditPackDiscount(packId)
        expect(Number.isInteger(discount)).toBe(true)
      }
    })
  })

  describe('getAllCreditPackIds', () => {
    it('should return all credit pack types', () => {
      const ids = getAllCreditPackIds()
      expect(ids).toContain('starter')
      expect(ids).toContain('mini')
      expect(ids).toContain('standard')
      expect(ids).toContain('plus')
      expect(ids).toContain('mega')
      expect(ids).toContain('ultimate')
    })

    it('should return 6 packs', () => {
      expect(getAllCreditPackIds().length).toBe(6)
    })
  })

  describe('formatPrice', () => {
    describe('KRW formatting', () => {
      it('should format KRW with ₩ symbol', () => {
        expect(formatPrice(9900, 'KRW')).toBe('₩9,900')
      })

      it('should format large KRW amounts with commas', () => {
        expect(formatPrice(199000, 'KRW')).toBe('₩199,000')
      })
    })

    describe('USD formatting', () => {
      it('should format USD with $ symbol', () => {
        expect(formatPrice(9.99, 'USD')).toBe('$9.99')
      })

      it('should show 2 decimal places for USD', () => {
        expect(formatPrice(10, 'USD')).toBe('$10.00')
      })
    })

    describe('free pricing', () => {
      it('should show 무료 for zero KRW in Korean', () => {
        expect(formatPrice(0, 'KRW', 'ko')).toBe('무료')
      })

      it('should show Free for zero KRW in English', () => {
        expect(formatPrice(0, 'KRW', 'en')).toBe('Free')
      })

      it('should show Free for zero USD', () => {
        expect(formatPrice(0, 'USD', 'en')).toBe('Free')
      })
    })

    // G14 — 숫자 모양은 실행 환경 로케일과 무관('en-US' 묶음 고정). 예전 toLocaleString() 은
    // de-DE 브라우저에서 '₩5.900' 이 돼 서버 렌더 PriceLine 과 하이드레이트가 갈렸다.
    describe('process/browser locale independence', () => {
      afterEach(() => {
        vi.restoreAllMocks()
        vi.resetModules()
      })

      it('기본 로케일이 de-DE 여도 ko · en 출력이 같다 (KRW · USD)', async () => {
        const RealNumberFormat = Intl.NumberFormat
        const realToLocaleString = Number.prototype.toLocaleString
        vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (
          locales?: string | string[],
          options?: Intl.NumberFormatOptions
        ) {
          return new RealNumberFormat(locales ?? 'de-DE', options)
        } as unknown as typeof Intl.NumberFormat)
        vi.spyOn(Number.prototype, 'toLocaleString').mockImplementation(function (
          this: number,
          locales?: string | string[],
          options?: Intl.NumberFormatOptions
        ) {
          return realToLocaleString.call(this, locales ?? 'de-DE', options)
        })
        // 대역이 정말 기본 로케일을 바꾼다(이 조건에서 예전 구현은 '₩5.900').
        expect((5900).toLocaleString()).toBe('5.900')

        vi.resetModules()
        const { formatPrice: fresh } = await import('@/lib/config/pricing')
        for (const locale of ['ko', 'en'] as const) {
          expect(fresh(5900, 'KRW', locale)).toBe('₩5,900')
          expect(fresh(1234567, 'KRW', locale)).toBe('₩1,234,567')
          expect(fresh(4.99, 'USD', locale)).toBe('$4.99')
          expect(fresh(1234.5, 'USD', locale)).toBe('$1,234.50')
        }
      })
    })
  })

  describe('constants', () => {
    it('should have base credit price equal to mini pack rate', () => {
      expect(BASE_CREDIT_PRICE_KRW).toBe(CREDIT_PACKS.mini.perCreditKrw)
    })

    it('should have bonus credit expiration of 3 months', () => {
      expect(BONUS_CREDIT_EXPIRATION_MONTHS).toBe(3)
    })
  })
})
