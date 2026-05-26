// src/lib/config/pricing.ts
// Centralized pricing configuration - Single source of truth for all pricing-related constants

// ============================================================================
// CURRENCY & LOCALE
// ============================================================================

const CURRENCIES = {
  KRW: 'KRW',
  USD: 'USD',
} as const

export type Currency = keyof typeof CURRENCIES

// ============================================================================
// CREDIT PACKS (One-time purchases)
// ============================================================================

export type CreditPackType = 'mini' | 'standard' | 'plus' | 'mega' | 'ultimate'

export interface CreditPack {
  id: CreditPackType
  credits: number
  pricing: {
    krw: number
    usd: number
  }
  /** Per-credit price in KRW (for display and calculations) */
  perCreditKrw: number
  /** Per-credit price in USD */
  perCreditUsd: number
  popular?: boolean
}

export const CREDIT_PACKS: Record<CreditPackType, CreditPack> = {
  mini: {
    id: 'mini',
    credits: 5,
    pricing: { krw: 1900, usd: 1.99 },
    perCreditKrw: 380,
    perCreditUsd: 0.4,
  },
  standard: {
    id: 'standard',
    credits: 20,
    pricing: { krw: 4900, usd: 4.99 },
    perCreditKrw: 245,
    perCreditUsd: 0.25,
  },
  plus: {
    id: 'plus',
    credits: 50,
    pricing: { krw: 9900, usd: 9.99 },
    perCreditKrw: 198,
    perCreditUsd: 0.2,
    popular: true,
  },
  mega: {
    id: 'mega',
    credits: 120,
    pricing: { krw: 19900, usd: 19.99 },
    perCreditKrw: 166,
    perCreditUsd: 0.17,
  },
  ultimate: {
    id: 'ultimate',
    credits: 280,
    pricing: { krw: 39900, usd: 39.99 },
    perCreditKrw: 142,
    perCreditUsd: 0.14,
  },
} as const

/**
 * Base credit price for refund calculations (mini pack rate)
 */
export const BASE_CREDIT_PRICE_KRW = 380

/**
 * Bonus credit expiration period in months
 */
export const BONUS_CREDIT_EXPIRATION_MONTHS = 3

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get credit pack discount percentage compared to mini pack
 */
export function getCreditPackDiscount(packId: CreditPackType): number {
  const pack = CREDIT_PACKS[packId]
  const miniRate = CREDIT_PACKS.mini.perCreditKrw
  return Math.round((1 - pack.perCreditKrw / miniRate) * 100)
}

/**
 * Get all credit pack IDs
 */
export function getAllCreditPackIds(): CreditPackType[] {
  return Object.keys(CREDIT_PACKS) as CreditPackType[]
}

/**
 * Format price for display
 */
export function formatPrice(
  amount: number,
  currency: Currency,
  locale: 'ko' | 'en' = 'ko'
): string {
  if (amount === 0) {
    return locale === 'ko' ? '무료' : 'Free'
  }

  if (currency === 'KRW') {
    return `₩${amount.toLocaleString()}`
  }
  return `$${amount.toFixed(2)}`
}
