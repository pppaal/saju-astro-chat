/**
 * Pricing Configuration Tests
 * 가격 설정 및 A/B 테스트 유틸리티 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPricingVariantForUser,
  PLANS,
  CREDIT_PACKS,
  getPlanConfig,
  getPlanPricing,
  calculateYearlyPrice,
  getCreditPackDiscount,
  getAllPlanIds,
  getAllCreditPackIds,
  isPaidPlan,
  formatPrice,
  getVariantPricing,
  YEARLY_DISCOUNT_MULTIPLIER,
  YEARLY_DISCOUNT_PERCENT,
  BASE_CREDIT_PRICE_KRW,
  BONUS_CREDIT_EXPIRATION_MONTHS,
  type PlanType,
  type CreditPackType,
  type PricingVariant,
} from '@/lib/config/pricing';

describe('PricingConfig', () => {
  describe('PLANS configuration', () => {
    describe('free plan', () => {
      it('should have correct free plan config', () => {
        const free = PLANS.free;
        expect(free.id).toBe('free');
        expect(free.config.monthlyCredits).toBe(7);
        expect(free.pricing.monthly.krw).toBe(0);
        expect(free.pricing.monthly.usd).toBe(0);
      });

      it('should have limited features for free plan', () => {
        const features = PLANS.free.config.features;
        expect(features.basicSaju).toBe(true);
        expect(features.detailedSaju).toBe(false);
        expect(features.pdfReport).toBe(false);
        expect(features.adFree).toBe(false);
      });
    });

    describe('starter plan', () => {
      it('should have correct starter plan config', () => {
        const starter = PLANS.starter;
        expect(starter.id).toBe('starter');
        expect(starter.config.monthlyCredits).toBe(25);
        expect(starter.pricing.monthly.krw).toBe(4900);
        expect(starter.pricing.monthly.usd).toBe(4.99);
      });

      it('should have ad-free for starter', () => {
        expect(PLANS.starter.config.features.adFree).toBe(true);
      });
    });

    describe('pro plan', () => {
      it('should have correct pro plan config', () => {
        const pro = PLANS.pro;
        expect(pro.id).toBe('pro');
        expect(pro.config.monthlyCredits).toBe(80);
        expect(pro.pricing.monthly.krw).toBe(9900);
      });

      it('should have all tarot spreads for pro', () => {
        expect(PLANS.pro.config.features.allTarotSpreads).toBe(true);
      });

      it('should have PDF report for pro', () => {
        expect(PLANS.pro.config.features.pdfReport).toBe(true);
      });
    });

    describe('premium plan', () => {
      it('should have correct premium plan config', () => {
        const premium = PLANS.premium;
        expect(premium.id).toBe('premium');
        expect(premium.config.monthlyCredits).toBe(200);
        expect(premium.pricing.monthly.krw).toBe(19900);
      });

      it('should have priority support for premium', () => {
        expect(PLANS.premium.config.features.priority).toBe(true);
      });

      it('should have 365 days history retention', () => {
        expect(PLANS.premium.config.historyRetention).toBe(365);
      });
    });

    describe('plan progression', () => {
      it('should have increasing credits for higher plans', () => {
        const plans = ['free', 'starter', 'pro', 'premium'] as PlanType[];
        for (let i = 0; i < plans.length - 1; i++) {
          expect(PLANS[plans[i]].config.monthlyCredits)
            .toBeLessThan(PLANS[plans[i + 1]].config.monthlyCredits);
        }
      });

      it('should have increasing prices for higher plans', () => {
        const plans = ['free', 'starter', 'pro', 'premium'] as PlanType[];
        for (let i = 0; i < plans.length - 1; i++) {
          expect(PLANS[plans[i]].pricing.monthly.krw)
            .toBeLessThan(PLANS[plans[i + 1]].pricing.monthly.krw);
        }
      });
    });
  });

  describe('CREDIT_PACKS configuration', () => {
    it('should have mini pack config', () => {
      const mini = CREDIT_PACKS.mini;
      expect(mini.id).toBe('mini');
      expect(mini.credits).toBe(5);
      expect(mini.pricing.krw).toBe(1900);
    });

    it('should have plus pack marked as popular', () => {
      expect(CREDIT_PACKS.plus.popular).toBe(true);
    });

    it('should have decreasing per-credit price for larger packs', () => {
      const packs = ['mini', 'standard', 'plus', 'mega', 'ultimate'] as CreditPackType[];
      for (let i = 0; i < packs.length - 1; i++) {
        expect(CREDIT_PACKS[packs[i]].perCreditKrw)
          .toBeGreaterThan(CREDIT_PACKS[packs[i + 1]].perCreditKrw);
      }
    });

    it('should have correct perCreditKrw calculation', () => {
      for (const pack of Object.values(CREDIT_PACKS)) {
        const calculated = Math.round(pack.pricing.krw / pack.credits);
        // Allow small rounding differences
        expect(Math.abs(pack.perCreditKrw - calculated)).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('getPricingVariantForUser', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return control when A/B test not enabled', () => {
      delete process.env.PRICING_AB_TEST_ENABLED;
      const result = getPricingVariantForUser('user-123');
      expect(result).toBe('control');
    });

    it('should return consistent variant for same user', () => {
      process.env.PRICING_AB_TEST_ENABLED = 'true';
      const result1 = getPricingVariantForUser('user-abc');
      const result2 = getPricingVariantForUser('user-abc');
      expect(result1).toBe(result2);
    });

    it('should return different variants for different users', () => {
      process.env.PRICING_AB_TEST_ENABLED = 'true';
      const variants = new Set<string>();
      // Generate many users to ensure all variants are covered
      for (let i = 0; i < 100; i++) {
        variants.add(getPricingVariantForUser(`user-${i}`));
      }
      expect(variants.size).toBeGreaterThanOrEqual(2);
    });

    it('should only return valid variants', () => {
      process.env.PRICING_AB_TEST_ENABLED = 'true';
      const validVariants: PricingVariant[] = ['control', 'variant_a', 'variant_b'];
      for (let i = 0; i < 50; i++) {
        const result = getPricingVariantForUser(`test-user-${i}`);
        expect(validVariants).toContain(result);
      }
    });
  });

  describe('getPlanConfig', () => {
    it('should return correct config for each plan', () => {
      const plans: PlanType[] = ['free', 'starter', 'pro', 'premium'];
      for (const plan of plans) {
        const config = getPlanConfig(plan);
        expect(config).toEqual(PLANS[plan].config);
      }
    });

    it('should include all required fields', () => {
      const config = getPlanConfig('pro');
      expect(config).toHaveProperty('monthlyCredits');
      expect(config).toHaveProperty('compatibilityLimit');
      expect(config).toHaveProperty('followUpLimit');
      expect(config).toHaveProperty('historyRetention');
      expect(config).toHaveProperty('features');
    });
  });

  describe('getPlanPricing', () => {
    it('should return correct pricing for each plan', () => {
      const plans: PlanType[] = ['free', 'starter', 'pro', 'premium'];
      for (const plan of plans) {
        const pricing = getPlanPricing(plan);
        expect(pricing).toEqual(PLANS[plan].pricing);
      }
    });

    it('should include monthly and yearly pricing', () => {
      const pricing = getPlanPricing('pro');
      expect(pricing).toHaveProperty('monthly');
      expect(pricing).toHaveProperty('yearly');
      expect(pricing.monthly).toHaveProperty('krw');
      expect(pricing.monthly).toHaveProperty('usd');
    });
  });

  describe('calculateYearlyPrice', () => {
    it('should calculate yearly price with discount multiplier', () => {
      const monthly = 10000;
      const yearly = calculateYearlyPrice(monthly);
      expect(yearly).toBe(monthly * YEARLY_DISCOUNT_MULTIPLIER);
    });

    it('should give approximately 17% discount', () => {
      const monthly = 10000;
      const yearly = calculateYearlyPrice(monthly);
      const fullYearly = monthly * 12;
      const discount = ((fullYearly - yearly) / fullYearly) * 100;
      expect(Math.round(discount)).toBe(YEARLY_DISCOUNT_PERCENT);
    });

    it('should handle zero price', () => {
      expect(calculateYearlyPrice(0)).toBe(0);
    });
  });

  describe('getCreditPackDiscount', () => {
    it('should return 0% discount for mini pack', () => {
      expect(getCreditPackDiscount('mini')).toBe(0);
    });

    it('should return positive discount for larger packs', () => {
      const packs: CreditPackType[] = ['standard', 'plus', 'mega', 'ultimate'];
      for (const pack of packs) {
        expect(getCreditPackDiscount(pack)).toBeGreaterThan(0);
      }
    });

    it('should return increasing discount for larger packs', () => {
      const packs: CreditPackType[] = ['mini', 'standard', 'plus', 'mega', 'ultimate'];
      let lastDiscount = -1;
      for (const pack of packs) {
        const discount = getCreditPackDiscount(pack);
        expect(discount).toBeGreaterThanOrEqual(lastDiscount);
        lastDiscount = discount;
      }
    });

    it('should return rounded percentage', () => {
      for (const packId of getAllCreditPackIds()) {
        const discount = getCreditPackDiscount(packId);
        expect(Number.isInteger(discount)).toBe(true);
      }
    });
  });

  describe('getAllPlanIds', () => {
    it('should return all plan types', () => {
      const ids = getAllPlanIds();
      expect(ids).toContain('free');
      expect(ids).toContain('starter');
      expect(ids).toContain('pro');
      expect(ids).toContain('premium');
    });

    it('should return 4 plans', () => {
      expect(getAllPlanIds().length).toBe(4);
    });
  });

  describe('getAllCreditPackIds', () => {
    it('should return all credit pack types', () => {
      const ids = getAllCreditPackIds();
      expect(ids).toContain('mini');
      expect(ids).toContain('standard');
      expect(ids).toContain('plus');
      expect(ids).toContain('mega');
      expect(ids).toContain('ultimate');
    });

    it('should return 5 packs', () => {
      expect(getAllCreditPackIds().length).toBe(5);
    });
  });

  describe('isPaidPlan', () => {
    it('should return false for free plan', () => {
      expect(isPaidPlan('free')).toBe(false);
    });

    it('should return true for paid plans', () => {
      expect(isPaidPlan('starter')).toBe(true);
      expect(isPaidPlan('pro')).toBe(true);
      expect(isPaidPlan('premium')).toBe(true);
    });
  });

  describe('formatPrice', () => {
    describe('KRW formatting', () => {
      it('should format KRW with ₩ symbol', () => {
        expect(formatPrice(9900, 'KRW')).toBe('₩9,900');
      });

      it('should format large KRW amounts with commas', () => {
        expect(formatPrice(199000, 'KRW')).toBe('₩199,000');
      });
    });

    describe('USD formatting', () => {
      it('should format USD with $ symbol', () => {
        expect(formatPrice(9.99, 'USD')).toBe('$9.99');
      });

      it('should show 2 decimal places for USD', () => {
        expect(formatPrice(10, 'USD')).toBe('$10.00');
      });
    });

    describe('free pricing', () => {
      it('should show 무료 for zero KRW in Korean', () => {
        expect(formatPrice(0, 'KRW', 'ko')).toBe('무료');
      });

      it('should show Free for zero KRW in English', () => {
        expect(formatPrice(0, 'KRW', 'en')).toBe('Free');
      });

      it('should show Free for zero USD', () => {
        expect(formatPrice(0, 'USD', 'en')).toBe('Free');
      });
    });
  });

  describe('getVariantPricing', () => {
    it('should return default pricing for control variant', () => {
      const pricing = getVariantPricing('pro', 'control');
      expect(pricing).toEqual(PLANS.pro.pricing);
    });

    it('should return variant pricing when override exists', () => {
      // variant_a has pro pricing override
      const pricing = getVariantPricing('pro', 'variant_a');
      expect(pricing.monthly.krw).toBe(7900);
      expect(pricing.monthly.usd).toBe(7.99);
    });

    it('should return default pricing when no override exists', () => {
      // variant_b doesn't have starter override
      const pricing = getVariantPricing('starter', 'variant_b');
      expect(pricing).toEqual(PLANS.starter.pricing);
    });

    it('should merge partial overrides with defaults', () => {
      const pricing = getVariantPricing('pro', 'variant_a');
      // Yearly prices should be overridden
      expect(pricing.yearly.krw).toBe(79000);
    });

    it('should default to control when no variant specified', () => {
      const pricing = getVariantPricing('premium');
      expect(pricing).toEqual(PLANS.premium.pricing);
    });
  });

  describe('constants', () => {
    it('should have correct yearly discount multiplier', () => {
      expect(YEARLY_DISCOUNT_MULTIPLIER).toBe(10);
    });

    it('should have correct yearly discount percent', () => {
      expect(YEARLY_DISCOUNT_PERCENT).toBe(17);
    });

    it('should have base credit price equal to mini pack rate', () => {
      expect(BASE_CREDIT_PRICE_KRW).toBe(CREDIT_PACKS.mini.perCreditKrw);
    });

    it('should have bonus credit expiration of 3 months', () => {
      expect(BONUS_CREDIT_EXPIRATION_MONTHS).toBe(3);
    });
  });
});
