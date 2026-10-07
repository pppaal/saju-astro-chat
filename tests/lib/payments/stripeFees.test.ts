// tests/lib/payments/stripeFees.test.ts
//
// Stripe 수수료는 **결제 통화의 최소 단위**로 계산해야 한다.
//
// 이전 버그: 환불 라우트 두 곳이 `Math.round(amount * 0.035) + 300` 을 복붙해
// 갖고 있었고, 그 `300` 은 원화 고정 수수료였다. KRW 는 0-decimal 이라 ₩12,900 =
// 12900 이지만 USD 는 2-decimal 이라 $9.99 = 999 이므로, USD 결제에 `+300` 이
// **$3.00** 으로 붙었다. 작은 팩은 수수료가 결제액을 넘겨 환불이 아예 실패했다
// (refund_amount_zero) — EU·UK 디지털재 법정 청약철회권과 충돌하는 구간.

import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  ZERO_DECIMAL_CURRENCIES,
  minorUnitsPerUnit,
  feePercent,
  feeFixedMinorUnits,
  formulaFeeMinorUnits,
  formatMinorUnits,
  formatFeeDisclosure,
  DISPLAY_FEE_PERCENT,
} from '@/lib/payments/stripeFees'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('minorUnitsPerUnit', () => {
  it('KRW·JPY 는 0-decimal (1), USD·EUR 는 2-decimal (100)', () => {
    expect(minorUnitsPerUnit('krw')).toBe(1)
    expect(minorUnitsPerUnit('KRW')).toBe(1)
    expect(minorUnitsPerUnit('jpy')).toBe(1)
    expect(minorUnitsPerUnit('usd')).toBe(100)
    expect(minorUnitsPerUnit('eur')).toBe(100)
  })

  it('0-decimal 목록에 krw/jpy 가 있다', () => {
    expect(ZERO_DECIMAL_CURRENCIES.has('krw')).toBe(true)
    expect(ZERO_DECIMAL_CURRENCIES.has('jpy')).toBe(true)
    expect(ZERO_DECIMAL_CURRENCIES.has('usd')).toBe(false)
  })
})

describe('feeFixedMinorUnits — 통화별 고정 수수료', () => {
  it('KRW 는 300(=₩300), USD 는 30(=$0.30)', () => {
    expect(feeFixedMinorUnits('KRW')).toBe(300)
    expect(feeFixedMinorUnits('usd')).toBe(30)
  })

  it('원화 고정 수수료가 달러에 새지 않는다 — 이 버그의 핵심', () => {
    expect(feeFixedMinorUnits('USD')).not.toBe(300)
  })

  it('통화별 env 로 덮을 수 있다', () => {
    vi.stubEnv('STRIPE_FEE_FIXED_USD', '50')
    expect(feeFixedMinorUnits('USD')).toBe(50)
    expect(feeFixedMinorUnits('KRW')).toBe(300)
  })

  it('모르는 2-decimal 통화는 0.30 상당', () => {
    expect(feeFixedMinorUnits('EUR')).toBe(30)
  })
})

describe('feePercent', () => {
  it('기본 3.5%, env 로 덮기 가능', () => {
    expect(feePercent()).toBe(DISPLAY_FEE_PERCENT)
    vi.stubEnv('STRIPE_FEE_PERCENT', '2.9')
    expect(feePercent()).toBe(2.9)
  })

  it('쓰레기 env 는 무시하고 기본값', () => {
    vi.stubEnv('STRIPE_FEE_PERCENT', 'abc')
    expect(feePercent()).toBe(DISPLAY_FEE_PERCENT)
  })
})

describe('formulaFeeMinorUnits — 회귀 가드', () => {
  it('KRW ₩10,000 → ₩650 (기존 동작 보존)', () => {
    // round(10000*0.035) + 300 = 350 + 300
    expect(formulaFeeMinorUnits(10000, 'krw')).toBe(650)
  })

  it('USD $9.99 → $0.65, 예전 버그값 $3.35 가 아니다', () => {
    // round(999*0.035) + 30 = 35 + 30 = 65 minor units = $0.65
    expect(formulaFeeMinorUnits(999, 'usd')).toBe(65)
    expect(formulaFeeMinorUnits(999, 'usd')).not.toBe(335)
  })

  it('작은 USD 팩이 환불 가능하다 — 예전엔 수수료가 결제액을 넘겼다', () => {
    const packs: Array<[number, string]> = [
      [199, 'starter $1.99'],
      [499, 'mini $4.99'],
      [999, 'standard $9.99'],
    ]
    for (const [amount, label] of packs) {
      const fee = formulaFeeMinorUnits(amount, 'usd')
      expect(fee, label).toBeLessThan(amount)
      // 수수료는 결제액의 20% 미만이어야 한다(실제론 ~7% 이하).
      expect(fee / amount, label).toBeLessThan(0.2)
    }
  })

  it('0 이하·비수치 금액은 0', () => {
    expect(formulaFeeMinorUnits(0, 'usd')).toBe(0)
    expect(formulaFeeMinorUnits(-100, 'usd')).toBe(0)
    expect(formulaFeeMinorUnits(Number.NaN, 'usd')).toBe(0)
  })
})

describe('formatMinorUnits', () => {
  it('통화별 단위를 맞춰 표기한다', () => {
    expect(formatMinorUnits(12900, 'KRW')).toBe('₩12,900')
    expect(formatMinorUnits(999, 'USD')).toBe('$9.99')
    expect(formatMinorUnits(30, 'USD')).toBe('$0.30')
    expect(formatMinorUnits(300, 'KRW')).toBe('₩300')
  })
})

describe('formatFeeDisclosure — 고지 == 계산', () => {
  it('고지 문구의 고정 수수료가 실제 계산값과 같은 통화·금액이다', () => {
    for (const currency of ['KRW', 'USD']) {
      const expected = formatMinorUnits(feeFixedMinorUnits(currency), currency)
      expect(formatFeeDisclosure(currency, 'ko')).toContain(expected)
      expect(formatFeeDisclosure(currency, 'en')).toContain(expected)
    }
  })

  it('달러 고지에 원화 기호가 새지 않는다', () => {
    expect(formatFeeDisclosure('USD', 'en')).not.toContain('₩')
    expect(formatFeeDisclosure('USD', 'ko')).not.toContain('₩')
    expect(formatFeeDisclosure('USD', 'en')).toContain('$0.30')
  })

  it('env 로 요율을 바꾸면 문구도 따라간다', () => {
    vi.stubEnv('STRIPE_FEE_PERCENT', '2.9')
    expect(formatFeeDisclosure('KRW', 'ko')).toContain('2.9%')
  })
})
