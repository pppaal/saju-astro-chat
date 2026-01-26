// src/lib/config/pricing.ts
// Centralized pricing configuration - Single source of truth for all pricing-related constants

// ============================================================================
// A/B TEST FEATURE FLAGS
// ============================================================================

/**
 * Pricing A/B test variants
 * Use environment variable or default to 'control'
 */
export type PricingVariant = 'control' | 'variant_a' | 'variant_b';

export const PRICING_VARIANT: PricingVariant =
  (process.env.NEXT_PUBLIC_PRICING_VARIANT as PricingVariant) || 'control';

/**
 * Get pricing variant for a user (for server-side A/B testing)
 * Uses userId hash for consistent assignment
 */
export function getPricingVariantForUser(userId: string): PricingVariant {
  // If no A/B test is active, return control
  if (!process.env.PRICING_AB_TEST_ENABLED) {
    return 'control';
  }

  // Simple hash-based assignment for consistent user experience
  const hash = userId.split('').reduce((acc, char) => {
    return ((acc << 5) - acc) + char.charCodeAt(0);
  }, 0);

  const bucket = Math.abs(hash) % 100;

  // 33% control, 33% variant_a, 34% variant_b
  if (bucket < 33) {return 'control';}
  if (bucket < 66) {return 'variant_a';}
  return 'variant_b';
}

// ============================================================================
// CURRENCY & LOCALE
// ============================================================================

export const CURRENCIES = {
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
 * Yearly discount multiplier (10 months = 17% discount)
 */
export const YEARLY_DISCOUNT_MULTIPLIER = 10;
export const YEARLY_DISCOUNT_PERCENT = 17;

/**
 * Plan configurations with pricing
 * Premium credits increased from 150 to 200 for better value proposition
 */
export const PLANS: Record<PlanType, Plan> = {
  free: {
    id: 'free',
    config: {
      monthlyCredits: 7,
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
 * Get plan config by plan type
 */
export function getPlanConfig(plan: PlanType): PlanConfig {
  return PLANS[plan].config;
}

/**
 * Get plan pricing by plan type
 */
export function getPlanPricing(plan: PlanType): PlanPricing {
  return PLANS[plan].pricing;
}

/**
 * Calculate yearly price from monthly (with discount)
 */
export function calculateYearlyPrice(monthlyPrice: number): number {
  return monthlyPrice * YEARLY_DISCOUNT_MULTIPLIER;
}

/**
 * Get credit pack discount percentage compared to mini pack
 */
export function getCreditPackDiscount(packId: CreditPackType): number {
  const pack = CREDIT_PACKS[packId];
  const miniRate = CREDIT_PACKS.mini.perCreditKrw;
  return Math.round((1 - pack.perCreditKrw / miniRate) * 100);
}

/**
 * Get all plan IDs
 */
export function getAllPlanIds(): PlanType[] {
  return Object.keys(PLANS) as PlanType[];
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

// ============================================================================
// A/B TEST VARIANT OVERRIDES
// ============================================================================

/**
 * Variant-specific pricing overrides
 * Use these for A/B testing different price points
 */
export const PRICING_VARIANTS: Record<PricingVariant, Partial<Record<PlanType, Partial<PlanPricing>>>> = {
  control: {}, // No overrides - use default PLANS
  variant_a: {
    // Example: Test lower Pro price
    pro: {
      monthly: { krw: 7900, usd: 7.99 },
      yearly: { krw: 79000, usd: 79.99 },
    },
  },
  variant_b: {
    // Example: Test higher Premium value with more credits
    // (handled via config override, not pricing)
  },
};

/**
 * Get pricing for a specific variant
 */
export function getVariantPricing(plan: PlanType, variant: PricingVariant = 'control'): PlanPricing {
  const override = PRICING_VARIANTS[variant]?.[plan];
  if (override) {
    return {
      monthly: { ...PLANS[plan].pricing.monthly, ...override.monthly },
      yearly: { ...PLANS[plan].pricing.yearly, ...override.yearly },
    };
  }
  return PLANS[plan].pricing;
}