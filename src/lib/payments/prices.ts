export type CreditPackKey = 'mini' | 'standard' | 'plus' | 'mega' | 'ultimate'

type CreditPackEntry = {
  id: string
  pack: CreditPackKey
}

// Credit pack entries (one-time purchases)
// Pack details: mini(5), standard(20), plus(50), mega(120), ultimate(220)
// (실제 수량은 src/lib/config/pricing.ts CREDIT_PACKS 가 단일 출처)
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

export function getCreditPackFromPriceId(priceId: string): { pack: CreditPackKey } | null {
  const found = creditPackEntries.find((p) => p.id === priceId)
  return found ? { pack: found.pack } : null
}

export function allowedCreditPackIds(): string[] {
  return creditPackEntries.map((p) => p.id)
}
