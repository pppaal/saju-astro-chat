// tests/lib/config/pricing.creditsFrom.test.ts
//
// "Credits from $4.99" — 첫구매 한정이 아닌 최저가 팩의 가격. 기대값도 CREDIT_PACKS(SSOT)에서
// 읽는다(리터럴 금지): 팩 표가 바뀌면 라벨이 따라 바뀌어야 한다.

import { describe, it, expect } from 'vitest'
import {
  CREDIT_PACKS,
  cheapestRegularPack,
  creditsFromLabel,
  getAllCreditPackIds,
} from '@/lib/config/pricing'

function expectedPack() {
  const regular = getAllCreditPackIds()
    .map((id) => CREDIT_PACKS[id])
    .filter((p) => !p.firstPurchaseOnly)
  return [...regular].sort((a, b) => a.pricing.krw - b.pricing.krw)[0]
}

describe('cheapestRegularPack', () => {
  it('첫구매 한정(starter)을 뺀 최저가 팩 — 오늘의 표에선 mini 12크레딧', () => {
    const p = cheapestRegularPack()
    expect(p.id).toBe(expectedPack().id)
    expect(p.firstPurchaseOnly).not.toBe(true)
    expect(p).toBe(CREDIT_PACKS.mini)
    expect(p.credits).toBe(CREDIT_PACKS.mini.credits)
  })

  it('starter 가 더 싸도 제외된다', () => {
    expect(CREDIT_PACKS.starter.firstPurchaseOnly).toBe(true)
    expect(CREDIT_PACKS.starter.pricing.krw).toBeLessThan(cheapestRegularPack().pricing.krw)
    expect(cheapestRegularPack().id).not.toBe('starter')
  })
})

describe('creditsFromLabel', () => {
  it("en = '$' + USD 정가 (오늘 '$4.99')", () => {
    const p = expectedPack()
    expect(creditsFromLabel('en')).toBe(`$${p.pricing.usd.toFixed(2)}`)
    expect(creditsFromLabel('en')).toBe('$4.99')
  })

  it("ko = '₩' + KRW 정가 천 단위 쉼표 (오늘 '₩5,900')", () => {
    const p = expectedPack()
    expect(creditsFromLabel('ko')).toBe(`₩${p.pricing.krw.toLocaleString('en-US')}`)
    expect(creditsFromLabel('ko')).toBe('₩5,900')
  })

  it('ko 가 아니면 모두 USD (currencyForLocale 과 같은 규칙)', () => {
    expect(creditsFromLabel(undefined)).toBe(creditsFromLabel('en'))
    expect(creditsFromLabel('ja')).toBe(creditsFromLabel('en'))
  })
})
