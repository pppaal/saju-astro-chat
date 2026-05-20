// src/lib/config/pricing.ts
// Centralized pricing configuration - Single source of truth for all pricing-related constants

// ============================================================================
// CURRENCY & LOCALE
// ============================================================================

const CURRENCIES = {
  KRW: 'KRW',
  USD: 'USD',
} as const;

export type Currency = keyof typeof CURRENCIES;

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

export type PlanType = 'free' | 'starter' | 'pro' | 'premium';

export interface PlanFeatures {
  basicSaju: boolean;
  detailedSaju: boolean;
  fullSaju: boolean;
  oneCardTarot: boolean;
  threeCardTarot: boolean;
  allTarotSpreads: boolean;
  pdfReport: boolean;
  adFree: boolean;
  priority: boolean;
}

export interface PlanConfig {
  monthlyCredits: number;
  compatibilityLimit: number;
  followUpLimit: number;
  historyRetention: number; // days
  features: PlanFeatures;
}

export interface PlanPricing {
  monthly: {
    krw: number;
    usd: number;
  };
  yearly: {
    krw: number;
    usd: number;
  };
}

export interface Plan {
  id: PlanType;
  config: PlanConfig;
  pricing: PlanPricing;
}

/**
 * Plan configurations with pricing
 * Premium credits increased from 150 to 200 for better value proposition
 */
export const PLANS: Record<PlanType, Plan> = {
  free: {
    id: 'free',
    config: {
      monthlyCredits: 0,
      compatibilityLimit: 0,
      followUpLimit: 0,
      historyRetention: 7,
      features: {
        basicSaju: true,
        detailedSaju: false,
        fullSaju: false,
        oneCardTarot: true,
        threeCardTarot: false,
        allTarotSpreads: false,
        pdfReport: false,
        adFree: false,
        priority: false,
      },
    },
    pricing: {
      monthly: { krw: 0, usd: 0 },
      yearly: { krw: 0, usd: 0 },
    },
  },
  starter: {
    id: 'starter',
    config: {
      monthlyCredits: 25,
      compatibilityLimit: 2,
      followUpLimit: 2,
      historyRetention: 30,
      features: {
        basicSaju: true,
        detailedSaju: true,
        fullSaju: false,
        oneCardTarot: true,
        threeCardTarot: true,
        allTarotSpreads: false,
        pdfReport: false,
        adFree: true,
        priority: false,
      },
    },
    pricing: {
      monthly: { krw: 4900, usd: 4.99 },
      yearly: { krw: 49000, usd: 49.99 },
    },
  },
  pro: {
    id: 'pro',
    config: {
      monthlyCredits: 80,
      compatibilityLimit: 5,
      followUpLimit: 5,
      historyRetention: 90,
      features: {
        basicSaju: true,
        detailedSaju: true,
        fullSaju: true,
        oneCardTarot: true,
        threeCardTarot: true,
        allTarotSpreads: true,
        pdfReport: true,
        adFree: true,
        priority: false,
      },
    },
    pricing: {
      monthly: { krw: 9900, usd: 9.99 },
      yearly: { krw: 99000, usd: 99.99 },
    },
  },
  premium: {
    id: 'premium',
    config: {
      // Increased from 150 to 200 for better value (₩99.5/credit vs ₩124/credit for Pro)
      monthlyCredits: 200,
      compatibilityLimit: 10,
      followUpLimit: 10,
      historyRetention: 365,
      features: {
        basicSaju: true,
        detailedSaju: true,
        fullSaju: true,
        oneCardTarot: true,
        threeCardTarot: true,
        allTarotSpreads: true,
        pdfReport: true,
        adFree: true,
        priority: true,
      },
    },
    pricing: {
      monthly: { krw: 19900, usd: 19.99 },
      yearly: { krw: 199000, usd: 199.99 },
    },
  },
} as const;

// ============================================================================
// CREDIT PACKS (One-time purchases)
// ============================================================================

export type CreditPackType = 'mini' | 'standard' | 'plus' | 'mega' | 'ultimate';

export interface CreditPack {
  id: CreditPackType;
  credits: number;
  pricing: {
    krw: number;
    usd: number;
  };
  /** Per-credit price in KRW (for display and calculations) */
  perCreditKrw: number;
  /** Per-credit price in USD */
  perCreditUsd: number;
  popular?: boolean;
}

export const CREDIT_PACKS: Record<CreditPackType, CreditPack> = {
  mini: {
    id: 'mini',
    credits: 5,
    pricing: { krw: 1900, usd: 1.99 },
    perCreditKrw: 380,
    perCreditUsd: 0.40,
  },
  standard: {
    id: 'standard',
    credits: 15,
    pricing: { krw: 4900, usd: 4.99 },
    perCreditKrw: 327,
    perCreditUsd: 0.33,
  },
  plus: {
    id: 'plus',
    credits: 40,
    pricing: { krw: 9900, usd: 9.99 },
    perCreditKrw: 248,
    perCreditUsd: 0.25,
    popular: true,
  },
  mega: {
    id: 'mega',
    credits: 100,
    pricing: { krw: 19900, usd: 19.99 },
    perCreditKrw: 199,
    perCreditUsd: 0.20,
  },
  ultimate: {
    id: 'ultimate',
    credits: 250,
    pricing: { krw: 39900, usd: 39.99 },
    perCreditKrw: 160,
    perCreditUsd: 0.16,
  },
} as const;

/**
 * Base credit price for refund calculations (mini pack rate)
 */
export const BASE_CREDIT_PRICE_KRW = 380;

/**
 * Bonus credit expiration period in months
 */
export const BONUS_CREDIT_EXPIRATION_MONTHS = 3;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get credit pack discount percentage compared to mini pack
 */
export function getCreditPackDiscount(packId: CreditPackType): number {
  const pack = CREDIT_PACKS[packId];
  const miniRate = CREDIT_PACKS.mini.perCreditKrw;
  return Math.round((1 - pack.perCreditKrw / miniRate) * 100);
}

/**
 * Get all credit pack IDs
 */
export function getAllCreditPackIds(): CreditPackType[] {
  return Object.keys(CREDIT_PACKS) as CreditPackType[];
}

/**
 * Check if plan is paid
 */
export function isPaidPlan(plan: PlanType): boolean {
  return plan !== 'free';
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: Currency, locale: 'ko' | 'en' = 'ko'): string {
  if (amount === 0) {return locale === 'ko' ? '무료' : 'Free';}

  if (currency === 'KRW') {
    return `₩${amount.toLocaleString()}`;
  }
  return `$${amount.toFixed(2)}`;
}

// ============================================================================
// LEGACY COMPATIBILITY - PLAN_CONFIG export for creditService.ts
// ============================================================================

/**
 * @deprecated Use PLANS instead. This export is for backward compatibility.
 */
export const PLAN_CONFIG = {
  free: PLANS.free.config,
  starter: PLANS.starter.config,
  pro: PLANS.pro.config,
  premium: PLANS.premium.config,
} as const;