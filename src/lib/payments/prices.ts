export type PlanKey = 'starter' | 'pro' | 'premium'
export type BillingCycle = 'monthly' | 'yearly'
export type CreditPackKey = 'mini' | 'standard' | 'plus' | 'mega' | 'ultimate'
export type PremiumReportSku = 'monthly' | 'yearly' | 'lifetime'

type PriceEntry = {
  id: string
  plan: PlanKey
  billingCycle: BillingCycle
}

type CreditPackEntry = {
  id: string
  pack: CreditPackKey
}

type PremiumReportEntry = {
  id: string
  sku: PremiumReportSku
  /** Display amount (KRW). For UI rendering only — Stripe is the source of truth. */
  displayKrw: number
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
// Pack details: mini(5), standard(15), plus(40), mega(100), ultimate(250)
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

// Premium report SKUs (one-time purchases — one purchase = one report generation)
//   monthly  : ₩4,900 — 이번달 운명선
//   yearly   : ₩7,900 — 올해 운명선
//   lifetime : ₩14,900 — 인생 총운 (Comprehensive)
const PREMIUM_REPORT_DISPLAY_KRW: Record<PremiumReportSku, number> = {
  monthly: 4900,
  yearly: 7900,
  lifetime: 14900,
}

const premiumReportEntries = ([
  {
    id: process.env.STRIPE_PRICE_REPORT_MONTHLY || '',
    sku: 'monthly',
    displayKrw: PREMIUM_REPORT_DISPLAY_KRW.monthly,
  },
  {
    id: process.env.STRIPE_PRICE_REPORT_YEARLY || '',
    sku: 'yearly',
    displayKrw: PREMIUM_REPORT_DISPLAY_KRW.yearly,
  },
  {
    id: process.env.STRIPE_PRICE_REPORT_LIFETIME || '',
    sku: 'lifetime',
    displayKrw: PREMIUM_REPORT_DISPLAY_KRW.lifetime,
  },
].filter((p) => p.id)) as PremiumReportEntry[]

export function getPriceId(plan: PlanKey, billingCycle: BillingCycle): string | null {
  const found = priceEntries.find((p) => p.plan === plan && p.billingCycle === billingCycle);
  return found?.id ?? null
}

export function getCreditPackPriceId(pack: CreditPackKey): string | null {
  const found = creditPackEntries.find((p) => p.pack === pack);
  return found?.id ?? null
}

export function getPremiumReportPriceId(sku: PremiumReportSku): string | null {
  const found = premiumReportEntries.find((p) => p.sku === sku)
  return found?.id ?? null
}

export function getPremiumReportSkuFromPriceId(priceId: string): PremiumReportSku | null {
  const found = premiumReportEntries.find((p) => p.id === priceId)
  return found?.sku ?? null
}

export function getPremiumReportDisplayKrw(sku: PremiumReportSku): number {
  return PREMIUM_REPORT_DISPLAY_KRW[sku]
}

export function getPlanFromPriceId(priceId: string): { plan: PlanKey; billingCycle: BillingCycle } | null {
  const found = priceEntries.find((p) => p.id === priceId);
  return found ? { plan: found.plan, billingCycle: found.billingCycle } : null
}

export function getCreditPackFromPriceId(priceId: string): { pack: CreditPackKey } | null {
  const found = creditPackEntries.find((p) => p.id === priceId);
  return found ? { pack: found.pack } : null
}

export function allowedPriceIds(): string[] {
  return priceEntries.map((p) => p.id)
}

export function allowedCreditPackIds(): string[] {
  return creditPackEntries.map((p) => p.id)
}

export function allowedPremiumReportPriceIds(): string[] {
  return premiumReportEntries.map((p) => p.id)
}
