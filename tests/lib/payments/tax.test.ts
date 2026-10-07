// tests/lib/payments/tax.test.ts
//
// 세금 문구와 실제 결제의 일치 가드.
//
// 이전 버그: /pricing 이 "VAT 포함 / Tax included" 를 **무조건** 렌더했다.
// 국내 원화 가격은 실제로 VAT 포함이라 맞지만, Stripe Tax 를 `exclusive` 로
// 켜면 결제 시 세금이 가산돼 화면의 $9.99 보다 총액이 커진다 — 통화 불일치·
// 환불 수수료와 같은 "표시 ≠ 청구" 사고.

import { describe, it, expect, afterEach, vi } from 'vitest'
import { isAutomaticTaxEnabled, taxBehavior, taxNote, taxSessionParams } from '@/lib/payments/tax'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isAutomaticTaxEnabled', () => {
  it('기본은 꺼짐 — 켜지지 않은 동안 기존 동작과 동일하다', () => {
    expect(isAutomaticTaxEnabled()).toBe(false)
  })

  it("'true' 문자열에만 켜진다(오타로 켜지지 않게)", () => {
    vi.stubEnv('STRIPE_TAX_ENABLED', 'true')
    expect(isAutomaticTaxEnabled()).toBe(true)
    vi.stubEnv('STRIPE_TAX_ENABLED', '1')
    expect(isAutomaticTaxEnabled()).toBe(false)
    vi.stubEnv('STRIPE_TAX_ENABLED', 'TRUE')
    expect(isAutomaticTaxEnabled()).toBe(false)
  })
})

describe('taxBehavior', () => {
  it('기본 inclusive — 화면 금액이 최종 결제액', () => {
    expect(taxBehavior()).toBe('inclusive')
  })

  it("'exclusive' 로 명시해야 가산 모드", () => {
    vi.stubEnv('STRIPE_TAX_BEHAVIOR', 'exclusive')
    expect(taxBehavior()).toBe('exclusive')
  })

  it('모르는 값은 inclusive 로 — 가산인데 포함이라 말하는 쪽이 더 위험하다', () => {
    vi.stubEnv('STRIPE_TAX_BEHAVIOR', 'garbage')
    expect(taxBehavior()).toBe('inclusive')
  })
})

describe('taxNote — 문구가 결제창의 실제 동작을 말한다', () => {
  it('inclusive 는 포함이라고, exclusive 는 가산이라고 말한다', () => {
    expect(taxNote('ko', 'inclusive')).toBe('VAT 포함')
    expect(taxNote('en', 'inclusive')).toBe('Tax included')
    expect(taxNote('ko', 'exclusive')).toContain('별도')
    expect(taxNote('en', 'exclusive')).toContain('added at checkout')
  })

  it('exclusive 일 때 "포함/included" 라고 말하지 않는다 — 이 버그의 핵심', () => {
    expect(taxNote('ko', 'exclusive')).not.toContain('포함')
    expect(taxNote('en', 'exclusive')).not.toContain('included')
  })

  it('인자를 생략하면 현재 설정을 따른다', () => {
    vi.stubEnv('STRIPE_TAX_BEHAVIOR', 'exclusive')
    expect(taxNote('en')).toBe(taxNote('en', 'exclusive'))
  })

  it('언어가 섞이지 않는다', () => {
    for (const behavior of ['inclusive', 'exclusive'] as const) {
      expect(taxNote('en', behavior)).not.toMatch(/[가-힣]/)
      expect(taxNote('ko', behavior)).toMatch(/[가-힣]/)
    }
  })
})

describe('taxSessionParams — Checkout 파라미터', () => {
  it('꺼져 있으면 automatic_tax false + 주소 auto (불필요한 이탈 방지)', () => {
    const p = taxSessionParams()
    expect(p.automatic_tax).toEqual({ enabled: false })
    expect(p.billing_address_collection).toBe('auto')
    expect(p.customer_creation).toBeUndefined()
  })

  it('켜지면 주소를 필수로 받고 Customer 를 만든다', () => {
    vi.stubEnv('STRIPE_TAX_ENABLED', 'true')
    const p = taxSessionParams()
    // automatic_tax 는 고객 소재지 없이는 계산되지 않는다. EU 디지털 서비스는
    // 소재지 증빙 자체가 요구사항이기도 하다.
    expect(p.automatic_tax).toEqual({ enabled: true })
    expect(p.billing_address_collection).toBe('required')
    expect(p.customer_creation).toBe('always')
  })
})
