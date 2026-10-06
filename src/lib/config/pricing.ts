// src/lib/config/pricing.ts
// Centralized pricing configuration - Single source of truth for all pricing-related constants

// ============================================================================
// CURRENCY & LOCALE
// ============================================================================

import { asMajor, type Major } from '@/lib/payments/money'

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

// ============================================================================
// CURRENCY RESOLUTION (SSOT — 표시 통화 == 청구 통화)
// ============================================================================

/**
 * 결제 기본 통화. 통화별 Stripe Price 가 없으면 여기로 폴백한다.
 */
export const DEFAULT_CURRENCY: Currency = 'KRW'

/**
 * 로케일 → 통화. **표시와 청구가 반드시 이 함수 하나만 보게 한다.**
 *
 * 예전 버그: /pricing 은 `locale === 'ko' ? krw : usd` 로 표시했는데
 * /api/checkout 은 팩당 Stripe Price ID 를 하나만 넘겼다. Stripe Price 는 통화가
 * 하나뿐이라, 영어 방문자가 `$9.99` 를 보고 결제창에서 `₩12,900` 을 받았다
 * (국경 간 디지털재 장바구니 이탈의 최대 원인). 표시·청구가 같은 함수를
 * 거치게 해서 구조적으로 어긋날 수 없게 한다 — 실제 청구 통화는
 * `resolveCheckoutCurrency`(prices.ts)가 Price 설정 여부까지 보고 확정한다.
 */
export function currencyForLocale(locale: string | null | undefined): Currency {
  return locale === 'ko' ? 'KRW' : 'USD'
}

/**
 * 팩 정가 — 통화별. 표시와 청구가 같은 값을 읽는다.
 *
 * **반환은 기본 단위(Major)다.** KRW 12900(=₩12,900), USD 9.99(=$9.99).
 * Stripe 금액·환불 수수료는 최소 단위(Minor)라 섞으면 100배 틀린다 —
 * 타입으로 막는다(money.ts). 최소 단위가 필요하면 `toMinor(...)` 를 거친다.
 */
export function packAmount(packId: CreditPackType, currency: Currency): Major {
  const p = CREDIT_PACKS[packId].pricing
  return asMajor(currency === 'KRW' ? p.krw : p.usd)
}

/** 크레딧당 단가 — 통화별, 기본 단위(그리드의 "1크레딧 ≈" 표시용). */
export function packPerCredit(packId: CreditPackType, currency: Currency): Major {
  const p = CREDIT_PACKS[packId]
  return asMajor(currency === 'KRW' ? p.perCreditKrw : p.perCreditUsd)
}

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
