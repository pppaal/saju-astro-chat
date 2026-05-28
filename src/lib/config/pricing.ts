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

// 모든 팩 크레딧 2배. "질문 1개 = 1 credit" 단순 모델로 통일하면서, 사용자
// 입장 가치는 종전(2메시지/1credit 시도) 과 동일하게 유지하기 위함. 가격(₩/$) 은
// 변경 없음 → per-credit 단가는 절반으로 떨어짐. mega·ultimate 위계 정상
// (큰 팩이 더 쌈).
export const CREDIT_PACKS: Record<CreditPackType, CreditPack> = {
  mini: {
    id: 'mini',
    credits: 10,
    pricing: { krw: 1900, usd: 1.99 },
    perCreditKrw: 190,
    perCreditUsd: 0.2,
  },
  standard: {
    id: 'standard',
    credits: 40,
    pricing: { krw: 4900, usd: 4.99 },
    perCreditKrw: 123,
    perCreditUsd: 0.12,
  },
  plus: {
    id: 'plus',
    credits: 100,
    pricing: { krw: 9900, usd: 9.99 },
    perCreditKrw: 99,
    perCreditUsd: 0.1,
    popular: true,
  },
  mega: {
    id: 'mega',
    credits: 240,
    pricing: { krw: 19900, usd: 19.99 },
    perCreditKrw: 83,
    perCreditUsd: 0.08,
  },
  ultimate: {
    id: 'ultimate',
    credits: 500,
    pricing: { krw: 39900, usd: 39.99 },
    perCreditKrw: 80,
    perCreditUsd: 0.08,
  },
} as const

/**
 * Base credit price for refund calculations (mini pack rate).
 * 팩 크레딧 2배 정책에 맞춰 ₩380 → ₩190.
 */
export const BASE_CREDIT_PRICE_KRW = 190

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
