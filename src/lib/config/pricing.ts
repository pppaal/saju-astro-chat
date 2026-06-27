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

export type CreditPackType = 'starter' | 'mini' | 'standard' | 'plus' | 'mega' | 'ultimate'

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
  /**
   * First-purchase-only impulse pack. Eligibility (no prior purchase) is
   * enforced server-side at checkout creation; this pack is excluded from the
   * regular /pricing grid and surfaced only in the credit-depleted modal.
   */
  firstPurchaseOnly?: boolean
}

// 가치기반(value-based) 가격 — 2026-06 개편(B안, ~3배 인상). 시장 앵커: 오프라인
// 사주 ₩30,000~100,000/회, 포스텔러 프리미엄 리딩 ₩10,000~22,000/건, 헬로우봇
// 구독 ₩26,000/월. 엔진 실비는 reading당 ₩15~19(Haiku+캐시, 마진 86~90%)라
// 인상 후에도 여유가 큼. per-credit 위계: 큰 팩일수록 쌈(mini→ultimate 단조감소).
// starter 는 첫구매 1회 한정 미끼(grid 미노출, 모달 전용).
export const CREDIT_PACKS: Record<CreditPackType, CreditPack> = {
  starter: {
    id: 'starter',
    credits: 8,
    pricing: { krw: 2900, usd: 1.99 },
    perCreditKrw: 363,
    perCreditUsd: 0.25,
    firstPurchaseOnly: true,
  },
  mini: {
    id: 'mini',
    credits: 12,
    pricing: { krw: 5900, usd: 4.99 },
    perCreditKrw: 492,
    perCreditUsd: 0.42,
  },
  standard: {
    id: 'standard',
    credits: 30,
    pricing: { krw: 12900, usd: 9.99 },
    perCreditKrw: 430,
    perCreditUsd: 0.33,
  },
  plus: {
    id: 'plus',
    credits: 70,
    pricing: { krw: 24900, usd: 19.99 },
    perCreditKrw: 356,
    perCreditUsd: 0.29,
    popular: true,
  },
  mega: {
    id: 'mega',
    credits: 140,
    pricing: { krw: 44900, usd: 34.99 },
    perCreditKrw: 321,
    perCreditUsd: 0.25,
  },
  ultimate: {
    id: 'ultimate',
    credits: 280,
    pricing: { krw: 79900, usd: 59.99 },
    perCreditKrw: 285,
    perCreditUsd: 0.21,
  },
} as const

/**
 * Base per-credit price for display + admin revenue estimates (mini pack rate).
 * 실제 환불은 원결제액 기준이라 이 값을 쓰지 않음 — 표시/추정 전용.
 * 2026-06 가치기반 개편으로 mini 단가 ₩190 → ₩492.
 */
export const BASE_CREDIT_PRICE_KRW = 492

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
