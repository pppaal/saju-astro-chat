export type CreditPackKey = 'starter' | 'mini' | 'standard' | 'plus' | 'mega' | 'ultimate'

type CreditPackEntry = {
  id: string
  pack: CreditPackKey
}

// Credit pack entries (one-time purchases). 실제 수량/가격은
// src/lib/config/pricing.ts CREDIT_PACKS 가 단일 출처.
// starter 는 첫구매 1회 한정 미끼 — STRIPE_PRICE_CREDIT_STARTER 가 비어 있으면
// 아래 .filter 로 자동 제외되어, Stripe Price 생성 전까지 결제 불가(graceful).
const creditPackEntries = [
  {
    id: process.env.STRIPE_PRICE_CREDIT_STARTER || '',
    pack: 'starter',
  },
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

export function getCreditPackFromPriceId(priceId: string): { pack: CreditPackKey } | null {
  const found = creditPackEntries.find((p) => p.id === priceId)
  return found ? { pack: found.pack } : null
}

export function allowedCreditPackIds(): string[] {
  return creditPackEntries.map((p) => p.id)
}
