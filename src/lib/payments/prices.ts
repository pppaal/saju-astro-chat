export type PlanKey = 'premium' | 'basic'
export type BillingCycle = 'monthly' | 'annual'

type PriceEntry = {
  id: string
  plan: PlanKey
  billingCycle: BillingCycle
}

const priceEntries: PriceEntry[] = [
  {
    id: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || process.env.NEXT_PUBLIC_PRICE_MONTHLY || '',
    plan: 'premium',
    billingCycle: 'monthly',
  },
  {
    id: process.env.STRIPE_PRICE_PREMIUM_ANNUAL || '',
    plan: 'premium',
    billingCycle: 'annual',
  },
  {
    id: process.env.STRIPE_PRICE_BASIC_MONTHLY || '',
    plan: 'basic',
    billingCycle: 'monthly',
  },
  {
    id: process.env.STRIPE_PRICE_BASIC_ANNUAL || '',
    plan: 'basic',
    billingCycle: 'annual',
  },
].filter((p) => p.id)

export function getPriceId(plan: PlanKey, billingCycle: BillingCycle): string | null {
  const found = priceEntries.find((p) => p.plan === plan && p.billingCycle === billingCycle)
  return found?.id ?? null
}

export function getPlanFromPriceId(priceId: string): { plan: PlanKey; billingCycle: BillingCycle } | null {
  const found = priceEntries.find((p) => p.id === priceId)
  return found ? { plan: found.plan, billingCycle: found.billingCycle } : null
}

export function allowedPriceIds(): string[] {
  return priceEntries.map((p) => p.id)
}
