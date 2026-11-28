// tests/lib/payments/checkoutCurrency.test.ts
//
// 표시 통화 == 청구 통화 가드.
//
// 이전 버그: /pricing 은 `locale === 'ko' ? pricing.krw : pricing.usd` 로 표시했는데
// /api/checkout 은 팩당 Stripe Price ID 를 하나만 넘겼다. Stripe Price 는 통화가
// 하나뿐이라, 영어 방문자가 `$9.99` 를 보고 결제창에서 `₩12,900` 을 받았다.
// 국경 간 디지털재에서 결제 단계 통화 불일치는 이탈의 최대 원인이고, 조용히
// 일어나므로 테스트로만 잡힌다.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { currencyForLocale, packAmount, type Currency } from '@/lib/config/pricing'

const PACKS = ['starter', 'mini', 'standard', 'plus', 'mega', 'ultimate'] as const
const KRW_ENV = PACKS.map((p) => `STRIPE_PRICE_CREDIT_${p.toUpperCase()}`)
const USD_ENV = PACKS.map((p) => `STRIPE_PRICE_CREDIT_${p.toUpperCase()}_USD`)

/** prices.ts 는 모듈 로드 시 env 를 읽으므로 매번 리셋 후 동적 import 한다. */
async function loadPrices(env: Record<string, string>) {
  vi.resetModules()
  for (const k of [...KRW_ENV, ...USD_ENV]) vi.stubEnv(k, '')
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v)
  return import('@/lib/payments/prices')
}

const allKrw = () => Object.fromEntries(KRW_ENV.map((k) => [k, `price_${k.toLowerCase()}`]))
const allUsd = () => Object.fromEntries(USD_ENV.map((k) => [k, `price_${k.toLowerCase()}`]))

beforeEach(() => {
  vi.resetModules()
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('currencyForLocale — 로케일이 원하는 통화', () => {
  it('ko 는 KRW, 그 외 전부 USD', () => {
    expect(currencyForLocale('ko')).toBe('KRW')
    expect(currencyForLocale('en')).toBe('USD')
    expect(currencyForLocale(undefined)).toBe('USD')
    expect(currencyForLocale(null)).toBe('USD')
    expect(currencyForLocale('ja')).toBe('USD')
  })
})

describe('isCheckoutCurrencySupported — all-or-nothing', () => {
  it('USD Price 가 하나도 없으면 미지원', async () => {
    const { isCheckoutCurrencySupported } = await loadPrices(allKrw())
    expect(isCheckoutCurrencySupported('USD')).toBe(false)
    expect(isCheckoutCurrencySupported('KRW')).toBe(true)
  })

  it('USD Price 가 전 팩에 있으면 지원', async () => {
    const { isCheckoutCurrencySupported } = await loadPrices({ ...allKrw(), ...allUsd() })
    expect(isCheckoutCurrencySupported('USD')).toBe(true)
  })

  it('일부 팩만 USD Price 가 있으면 미지원 — 그리드에 통화가 섞이면 안 된다', async () => {
    const partial = { ...allKrw(), ...allUsd() }
    delete partial.STRIPE_PRICE_CREDIT_MEGA_USD
    const { isCheckoutCurrencySupported } = await loadPrices(partial)
    expect(isCheckoutCurrencySupported('USD')).toBe(false)
  })

  it('starter 가 KRW 에 없으면 USD 에도 요구하지 않는다(설정된 팩만 비교)', async () => {
    const krw = allKrw()
    delete krw.STRIPE_PRICE_CREDIT_STARTER
    const usd = allUsd()
    delete usd.STRIPE_PRICE_CREDIT_STARTER_USD
    const { isCheckoutCurrencySupported } = await loadPrices({ ...krw, ...usd })
    expect(isCheckoutCurrencySupported('USD')).toBe(true)
  })
})

describe('resolveCheckoutCurrency — 실제 청구 통화', () => {
  it('USD 미설정이면 영어 사용자도 KRW (표시도 같이 폴백되므로 불일치 아님)', async () => {
    const { resolveCheckoutCurrency } = await loadPrices(allKrw())
    expect(resolveCheckoutCurrency('en')).toBe('KRW')
    expect(resolveCheckoutCurrency('ko')).toBe('KRW')
  })

  it('USD 설정되면 영어는 USD, 한국어는 그대로 KRW', async () => {
    const { resolveCheckoutCurrency } = await loadPrices({ ...allKrw(), ...allUsd() })
    expect(resolveCheckoutCurrency('en')).toBe('USD')
    expect(resolveCheckoutCurrency('ko')).toBe('KRW')
  })
})

describe('getCreditPackPriceId — 통화별 Price', () => {
  it('통화마다 다른 Price ID 를 준다', async () => {
    const { getCreditPackPriceId } = await loadPrices({ ...allKrw(), ...allUsd() })
    const krw = getCreditPackPriceId('standard', 'KRW')
    const usd = getCreditPackPriceId('standard', 'USD')
    expect(krw).toBeTruthy()
    expect(usd).toBeTruthy()
    expect(krw).not.toBe(usd)
  })

  it('통화 인자를 생략하면 기본 통화(KRW)', async () => {
    const { getCreditPackPriceId } = await loadPrices({ ...allKrw(), ...allUsd() })
    expect(getCreditPackPriceId('mini')).toBe(getCreditPackPriceId('mini', 'KRW'))
  })

  it('그 통화에 Price 가 없으면 null — 다른 통화로 조용히 바꿔치지 않는다', async () => {
    const { getCreditPackPriceId } = await loadPrices(allKrw())
    expect(getCreditPackPriceId('mini', 'USD')).toBeNull()
    expect(getCreditPackPriceId('mini', 'KRW')).toBeTruthy()
  })

  it('getCreditPackFromPriceId 는 팩과 통화를 되돌려준다(웹훅·환불 대조용)', async () => {
    const { getCreditPackPriceId, getCreditPackFromPriceId } = await loadPrices({
      ...allKrw(),
      ...allUsd(),
    })
    const usdId = getCreditPackPriceId('plus', 'USD')!
    expect(getCreditPackFromPriceId(usdId)).toEqual({ pack: 'plus', currency: 'USD' })
    const krwId = getCreditPackPriceId('plus', 'KRW')!
    expect(getCreditPackFromPriceId(krwId)).toEqual({ pack: 'plus', currency: 'KRW' })
  })
})

describe('표시 == 청구 (회귀 가드)', () => {
  // /pricing(PricingPageClient)이 쓰는 식. 서버가 내려준 usdEnabled 로 게이트한다.
  const displayCurrency = (locale: string, usdEnabled: boolean): Currency =>
    locale === 'ko' || !usdEnabled ? 'KRW' : 'USD'

  it('USD 미설정 — 모든 로케일에서 표시와 청구가 같다', async () => {
    const { resolveCheckoutCurrency, isCheckoutCurrencySupported } = await loadPrices(allKrw())
    const usdEnabled = isCheckoutCurrencySupported('USD')
    for (const locale of ['ko', 'en', 'ja']) {
      expect(displayCurrency(locale, usdEnabled)).toBe(resolveCheckoutCurrency(locale))
    }
  })

  it('USD 설정 — 모든 로케일에서 표시와 청구가 같다', async () => {
    const { resolveCheckoutCurrency, isCheckoutCurrencySupported } = await loadPrices({
      ...allKrw(),
      ...allUsd(),
    })
    const usdEnabled = isCheckoutCurrencySupported('USD')
    for (const locale of ['ko', 'en', 'ja']) {
      expect(displayCurrency(locale, usdEnabled)).toBe(resolveCheckoutCurrency(locale))
    }
  })

  it('USD 부분 설정 — 표시가 $ 로 새지 않는다', async () => {
    const partial = { ...allKrw(), ...allUsd() }
    delete partial.STRIPE_PRICE_CREDIT_PLUS_USD
    const { resolveCheckoutCurrency, isCheckoutCurrencySupported } = await loadPrices(partial)
    const usdEnabled = isCheckoutCurrencySupported('USD')
    expect(usdEnabled).toBe(false)
    expect(displayCurrency('en', usdEnabled)).toBe('KRW')
    expect(resolveCheckoutCurrency('en')).toBe('KRW')
  })
})

describe('packAmount — 통화별 금액', () => {
  it('KRW/USD 가 서로 다른 값이고 0 이 아니다', () => {
    for (const pack of PACKS) {
      const krw = packAmount(pack, 'KRW')
      const usd = packAmount(pack, 'USD')
      expect(krw).toBeGreaterThan(0)
      expect(usd).toBeGreaterThan(0)
      expect(krw).not.toBe(usd)
    }
  })
})
