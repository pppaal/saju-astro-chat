import { DEFAULT_CURRENCY, currencyForLocale, type Currency } from '@/lib/config/pricing'

export type CreditPackKey = 'starter' | 'mini' | 'standard' | 'plus' | 'mega' | 'ultimate'

type CreditPackEntry = {
  id: string
  pack: CreditPackKey
  currency: Currency
}

// Credit pack entries (one-time purchases) — pack→Stripe price-id mapping only.
// Credit quantities live solely in src/lib/config/pricing.ts CREDIT_PACKS (SSOT);
// do not restate them here to avoid drift.
// starter 는 첫구매 1회 한정 미끼 — STRIPE_PRICE_CREDIT_STARTER 가 비어 있으면
// 아래 .filter 로 자동 제외되어, Stripe Price 생성 전까지 결제 불가(graceful).
//
// **통화별로 Price 가 따로 있다.** Stripe Price 는 통화가 하나뿐이라, 하나의 ID로
// KRW·USD 를 동시에 청구할 수 없다. 예전엔 팩당 ID 하나만 두고 /pricing 에서는
// 로케일로 USD 를 표시해, 영어 방문자가 `$9.99` 를 보고 결제창에서 `₩12,900` 을
// 받는 불일치가 있었다. `_USD` 환경변수가 비어 있으면 USD 는 "미지원"으로 보고
// 표시·청구 모두 KRW 로 폴백한다(어긋난 채로 파는 것보다 정직한 실패).
const creditPackEntries = [
  // KRW (기본)
  { id: process.env.STRIPE_PRICE_CREDIT_STARTER || '', pack: 'starter', currency: 'KRW' },
  { id: process.env.STRIPE_PRICE_CREDIT_MINI || '', pack: 'mini', currency: 'KRW' },
  { id: process.env.STRIPE_PRICE_CREDIT_STANDARD || '', pack: 'standard', currency: 'KRW' },
  { id: process.env.STRIPE_PRICE_CREDIT_PLUS || '', pack: 'plus', currency: 'KRW' },
  { id: process.env.STRIPE_PRICE_CREDIT_MEGA || '', pack: 'mega', currency: 'KRW' },
  { id: process.env.STRIPE_PRICE_CREDIT_ULTIMATE || '', pack: 'ultimate', currency: 'KRW' },
  // USD (해외 결제 — 미설정이면 전부 KRW 로 폴백)
  { id: process.env.STRIPE_PRICE_CREDIT_STARTER_USD || '', pack: 'starter', currency: 'USD' },
  { id: process.env.STRIPE_PRICE_CREDIT_MINI_USD || '', pack: 'mini', currency: 'USD' },
  { id: process.env.STRIPE_PRICE_CREDIT_STANDARD_USD || '', pack: 'standard', currency: 'USD' },
  { id: process.env.STRIPE_PRICE_CREDIT_PLUS_USD || '', pack: 'plus', currency: 'USD' },
  { id: process.env.STRIPE_PRICE_CREDIT_MEGA_USD || '', pack: 'mega', currency: 'USD' },
  { id: process.env.STRIPE_PRICE_CREDIT_ULTIMATE_USD || '', pack: 'ultimate', currency: 'USD' },
].filter((p) => p.id) as CreditPackEntry[]

export function getCreditPackPriceId(
  pack: CreditPackKey,
  currency: Currency = DEFAULT_CURRENCY
): string | null {
  const found = creditPackEntries.find((p) => p.pack === pack && p.currency === currency)
  return found?.id ?? null
}

export function getCreditPackFromPriceId(
  priceId: string
): { pack: CreditPackKey; currency: Currency } | null {
  const found = creditPackEntries.find((p) => p.id === priceId)
  return found ? { pack: found.pack, currency: found.currency } : null
}

export function allowedCreditPackIds(): string[] {
  return creditPackEntries.map((p) => p.id)
}

/**
 * 그 통화로 결제가 가능한가 — **기본 통화에 Price 가 있는 팩 전부**가 그 통화에도
 * Price 를 가져야 true.
 *
 * 일부 팩만 USD Price 가 있으면 그리드에 `$9.99` 와 `₩44,900` 이 섞여 보이고,
 * 섞인 채로 결제를 받으면 어떤 팩은 또 표시≠청구가 된다. 그래서 전부 아니면
 * 전부 아님(all-or-nothing)으로 판정한다.
 */
export function isCheckoutCurrencySupported(currency: Currency): boolean {
  if (currency === DEFAULT_CURRENCY) {
    return creditPackEntries.some((p) => p.currency === DEFAULT_CURRENCY)
  }
  const basePacks = creditPackEntries
    .filter((p) => p.currency === DEFAULT_CURRENCY)
    .map((p) => p.pack)
  if (basePacks.length === 0) return false
  return basePacks.every((pack) =>
    creditPackEntries.some((p) => p.pack === pack && p.currency === currency)
  )
}

/**
 * 이 요청에서 실제로 표시하고 청구할 통화. 서버에서만 호출한다(환경변수 의존).
 *
 * 로케일이 원하는 통화에 Price 가 다 있으면 그 통화, 없으면 기본 통화로 폴백.
 * /pricing·모달·checkout 이 모두 이 결과를 쓰므로 표시와 청구가 갈릴 수 없다.
 */
export function resolveCheckoutCurrency(locale: string | null | undefined): Currency {
  const wanted = currencyForLocale(locale)
  return isCheckoutCurrencySupported(wanted) ? wanted : DEFAULT_CURRENCY
}
