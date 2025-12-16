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
const priceEntries = ([
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
].filter((p) => p.id)) as PriceEntry[]

// Credit pack entries (one-time purchases)
// Pack details: mini(3), standard(10), plus(30), mega(60), ultimate(120)
const creditPackEntries = ([
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
].filter((p) => p.id)) as CreditPackEntry[]

export function getPriceId(plan: PlanKey, billingCycle: BillingCycle): string | null {
  const found = priceEntries.find((p) => p.plan === plan && p.billingCycle === billingCycle)
  return found?.id ?? null
}

export function getCreditPackPriceId(pack: CreditPackKey): string | null {
  const found = creditPackEntries.find((p) => p.pack === pack)
  return found?.id ?? null
}

export function getPlanFromPriceId(priceId: string): { plan: PlanKey; billingCycle: BillingCycle } | null {
  const found = priceEntries.find((p) => p.id === priceId)
  return found ? { plan: found.plan, billingCycle: found.billingCycle } : null
}

export function getCreditPackFromPriceId(priceId: string): { pack: CreditPackKey } | null {
  const found = creditPackEntries.find((p) => p.id === priceId)
  return found ? { pack: found.pack } : null
}

export function allowedPriceIds(): string[] {
  return priceEntries.map((p) => p.id)
}

export function allowedCreditPackIds(): string[] {
  return creditPackEntries.map((p) => p.id)
}
