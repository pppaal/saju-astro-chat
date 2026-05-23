import type Stripe from 'stripe'
import { CREDIT_PACKS } from '@/lib/config/pricing'

export type PlanKey = 'starter' | 'pro' | 'premium'
export type BillingCycle = 'monthly' | 'yearly'
export type CreditPackKey = 'mini' | 'standard' | 'plus' | 'mega' | 'ultimate'

type PriceEntry = {
  id: string
  plan: PlanKey
  billingCycle: BillingCycle
}

type CreditPackEntry = {
  id: string
  pack: CreditPackKey
}

// Subscription price entries
const priceEntries = [
  {
    id: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    plan: 'starter',
    billingCycle: 'monthly',
  },
  {
    id: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
    plan: 'starter',
    billingCycle: 'yearly',
  },
  {
    id: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    plan: 'pro',
    billingCycle: 'monthly',
  },
  {
    id: process.env.STRIPE_PRICE_PRO_YEARLY || '',
    plan: 'pro',
    billingCycle: 'yearly',
  },
  {
    id: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || process.env.NEXT_PUBLIC_PRICE_MONTHLY || '',
    plan: 'premium',
    billingCycle: 'monthly',
  },
  {
    id: process.env.STRIPE_PRICE_PREMIUM_YEARLY || process.env.STRIPE_PRICE_PREMIUM_ANNUAL || '',
    plan: 'premium',
    billingCycle: 'yearly',
  },
].filter((p) => p.id) as PriceEntry[]

// Credit pack entries (one-time purchases)
// Pack details: mini(5), standard(15), plus(40), mega(100), ultimate(250)
const creditPackEntries = [
  {
    id: process.env.STRIPE_PRICE_CREDIT_MINI || '',
    pack: 'mini',
  },
  {
    id: process.env.STRIPE_PRICE_CREDIT_STANDARD || '',
    pack: 'standard',
  },
  {
    id: process.env.STRIPE_PRICE_CREDIT_PLUS || '',
    pack: 'plus',
  },
  {
    id: process.env.STRIPE_PRICE_CREDIT_MEGA || '',
    pack: 'mega',
  },
  {
    id: process.env.STRIPE_PRICE_CREDIT_ULTIMATE || '',
    pack: 'ultimate',
  },
].filter((p) => p.id) as CreditPackEntry[]

export function getCreditPackPriceId(pack: CreditPackKey): string | null {
  const found = creditPackEntries.find((p) => p.pack === pack)
  return found?.id ?? null
}

export function getPlanFromPriceId(
  priceId: string
): { plan: PlanKey; billingCycle: BillingCycle } | null {
  const found = priceEntries.find((p) => p.id === priceId)
  return found ? { plan: found.plan, billingCycle: found.billingCycle } : null
}

export function getCreditPackFromPriceId(priceId: string): { pack: CreditPackKey } | null {
  const found = creditPackEntries.find((p) => p.id === priceId)
  return found ? { pack: found.pack } : null
}

export function allowedCreditPackIds(): string[] {
  return creditPackEntries.map((p) => p.id)
}

// ── 가격 정합성 검증 ──────────────────────────────────────────────
// Stripe 가 실제로 청구하는 금액(price ID 의 unit_amount, 대시보드 값)이 우리
// CREDIT_PACKS 표시가와 같은지 확인한다. checkout 은 price ID 만 보내므로
// 코드 가격(표시가)과 Stripe 청구가가 따로 관리돼 어긋날 수 있음 — 이 함수가
// 그 드리프트를 잡는다. 확정 불일치만 'mismatch', 조회 실패는 'unverified'.
//
// KRW 는 zero-decimal 이라 unit_amount = 원 그대로, USD 는 센트(=usd×100).
export type CreditPackPriceCheck =
  | { status: 'ok' }
  | { status: 'mismatch'; currency: string; expected: number; actual: number | null }
  | { status: 'unverified'; reason: string }

const priceCheckCache = new Map<CreditPackKey, CreditPackPriceCheck>()

export async function verifyCreditPackPrice(
  stripe: Stripe,
  pack: CreditPackKey
): Promise<CreditPackPriceCheck> {
  // 결정적 결과(ok/mismatch)만 캐시 — 일시적 조회 실패는 매번 재시도(fail-open).
  const cached = priceCheckCache.get(pack)
  if (cached) return cached

  const priceId = getCreditPackPriceId(pack)
  if (!priceId) return { status: 'unverified', reason: 'no_price_id' }

  let result: CreditPackPriceCheck
  try {
    const price = await stripe.prices.retrieve(priceId)
    const currency = price.currency
    const def = CREDIT_PACKS[pack].pricing
    const expected =
      currency === 'krw' ? def.krw : currency === 'usd' ? Math.round(def.usd * 100) : null
    if (expected == null) {
      return { status: 'unverified', reason: `unsupported_currency_${currency}` }
    }
    result =
      price.unit_amount === expected
        ? { status: 'ok' }
        : { status: 'mismatch', currency, expected, actual: price.unit_amount }
  } catch (e) {
    return { status: 'unverified', reason: e instanceof Error ? e.message : 'retrieve_failed' }
  }
  priceCheckCache.set(pack, result)
  return result
}
