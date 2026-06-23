export type CreditPackKey = 'mini' | 'standard' | 'plus' | 'mega' | 'ultimate'

type CreditPackEntry = {
  id: string
  pack: CreditPackKey
}

// Credit pack entries (one-time purchases) — pack→Stripe price-id mapping only.
// Credit quantities live solely in src/lib/config/pricing.ts CREDIT_PACKS (SSOT);
// do not restate them here to avoid drift.
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
