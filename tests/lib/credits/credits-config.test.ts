import { describe, it, expect } from 'vitest';

describe('Credits Module Exports', () => {
  it('should export PLAN_CONFIG', async () => {
    const { PLAN_CONFIG } = await import('@/lib/credits');

    expect(PLAN_CONFIG).toBeDefined();
    expect(typeof PLAN_CONFIG).toBe('object');
  }, 60000);

  it('should export initializeUserCredits function', async () => {
    const { initializeUserCredits } = await import('@/lib/credits');
    expect(typeof initializeUserCredits).toBe('function');
  });

  it('should export getUserCredits function', async () => {
    const { getUserCredits } = await import('@/lib/credits');
    expect(typeof getUserCredits).toBe('function');
  });

  it('should export getCreditBalance function', async () => {
    const { getCreditBalance } = await import('@/lib/credits');
    expect(typeof getCreditBalance).toBe('function');
  });

  it('should export canUseCredits function', async () => {
    const { canUseCredits } = await import('@/lib/credits');
    expect(typeof canUseCredits).toBe('function');
  });

  it('should export consumeCredits function', async () => {
    const { consumeCredits } = await import('@/lib/credits');
    expect(typeof consumeCredits).toBe('function');
  });

  it('should export resetMonthlyCredits function', async () => {
    const { resetMonthlyCredits } = await import('@/lib/credits');
    expect(typeof resetMonthlyCredits).toBe('function');
  });

  it('should export upgradePlan function', async () => {
    const { upgradePlan } = await import('@/lib/credits');
    expect(typeof upgradePlan).toBe('function');
  });

  it('should export addBonusCredits function', async () => {
    const { addBonusCredits } = await import('@/lib/credits');
    expect(typeof addBonusCredits).toBe('function');
  });

  it('should export canUseFeature function', async () => {
    const { canUseFeature } = await import('@/lib/credits');
    expect(typeof canUseFeature).toBe('function');
  });

  it('should export resetAllExpiredCredits function', async () => {
    const { resetAllExpiredCredits } = await import('@/lib/credits');
    expect(typeof resetAllExpiredCredits).toBe('function');
  });
});

describe('PLAN_CONFIG Structure', () => {
  it('should have free plan', async () => {
    const { PLAN_CONFIG } = await import('@/lib/credits');

    expect(PLAN_CONFIG.free).toBeDefined();
    expect(PLAN_CONFIG.free.monthlyCredits).toBe(7);
  });

  it('should have starter plan', async () => {
    const { PLAN_CONFIG } = await import('@/lib/credits');

    expect(PLAN_CONFIG.starter).toBeDefined();
    expect(PLAN_CONFIG.starter.monthlyCredits).toBe(25);
  });

  it('should have pro plan', async () => {
    const { PLAN_CONFIG } = await import('@/lib/credits');

    expect(PLAN_CONFIG.pro).toBeDefined();
    expect(PLAN_CONFIG.pro.monthlyCredits).toBe(80);
  });

  it('should have premium plan', async () => {
    const { PLAN_CONFIG } = await import('@/lib/credits');

    expect(PLAN_CONFIG.premium).toBeDefined();
    expect(PLAN_CONFIG.premium.monthlyCredits).toBe(200);
  });

  it('should have all required properties in free plan', async () => {
    const { PLAN_CONFIG } = await import('@/lib/credits');

    expect(PLAN_CONFIG.free).toHaveProperty('monthlyCredits');
    expect(PLAN_CONFIG.free).toHaveProperty('compatibilityLimit');
    expect(PLAN_CONFIG.free).toHaveProperty('followUpLimit');
    expect(PLAN_CONFIG.free).toHaveProperty('historyRetention');
    expect(PLAN_CONFIG.free).toHaveProperty('features');
  });

  it('should have all feature flags in plan config', async () => {
    const { PLAN_CONFIG } = await import('@/lib/credits');

    const features = PLAN_CONFIG.free.features;
    expect(features).toHaveProperty('basicSaju');
    expect(features).toHaveProperty('detailedSaju');
    expect(features).toHaveProperty('fullSaju');
    expect(features).toHaveProperty('oneCardTarot');
    expect(features).toHaveProperty('threeCardTarot');
    expect(features).toHaveProperty('allTarotSpreads');
    expect(features).toHaveProperty('pdfReport');
    expect(features).toHaveProperty('adFree');
    expect(features).toHaveProperty('priority');
  });

  it('should have increasing credits from free to premium', async () => {
    const { PLAN_CONFIG } = await import('@/lib/credits');

    expect(PLAN_CONFIG.free.monthlyCredits).toBeLessThan(PLAN_CONFIG.starter.monthlyCredits);
    expect(PLAN_CONFIG.starter.monthlyCredits).toBeLessThan(PLAN_CONFIG.pro.monthlyCredits);
    expect(PLAN_CONFIG.pro.monthlyCredits).toBeLessThan(PLAN_CONFIG.premium.monthlyCredits);
  });

  it('should have increasing compatibility limits', async () => {
    const { PLAN_CONFIG } = await import('@/lib/credits');

    expect(PLAN_CONFIG.free.compatibilityLimit).toBeLessThanOrEqual(PLAN_CONFIG.starter.compatibilityLimit);
    expect(PLAN_CONFIG.starter.compatibilityLimit).toBeLessThanOrEqual(PLAN_CONFIG.pro.compatibilityLimit);
    expect(PLAN_CONFIG.pro.compatibilityLimit).toBeLessThanOrEqual(PLAN_CONFIG.premium.compatibilityLimit);
  });

  it('should enable more features in higher plans', async () => {
    const { PLAN_CONFIG } = await import('@/lib/credits');

    // Free plan should have limited features
    expect(PLAN_CONFIG.free.features.basicSaju).toBe(true);
    expect(PLAN_CONFIG.free.features.detailedSaju).toBe(false);
    expect(PLAN_CONFIG.free.features.pdfReport).toBe(false);

    // Premium should have all features
    expect(PLAN_CONFIG.premium.features.basicSaju).toBe(true);
    expect(PLAN_CONFIG.premium.features.detailedSaju).toBe(true);
    expect(PLAN_CONFIG.premium.features.fullSaju).toBe(true);
    expect(PLAN_CONFIG.premium.features.pdfReport).toBe(true);
    expect(PLAN_CONFIG.premium.features.priority).toBe(true);
  });
});

describe('withCredits Exports', () => {
  it('should export checkAndConsumeCredits function', async () => {
    const { checkAndConsumeCredits } = await import('@/lib/credits');
    expect(typeof checkAndConsumeCredits).toBe('function');
  });

  it('should export checkCreditsOnly function', async () => {
    const { checkCreditsOnly } = await import('@/lib/credits');
    expect(typeof checkCreditsOnly).toBe('function');
  });

  it('should export creditErrorResponse function', async () => {
    const { creditErrorResponse } = await import('@/lib/credits');
    expect(typeof creditErrorResponse).toBe('function');
  });

  it('should export ensureUserCredits function', async () => {
    const { ensureUserCredits } = await import('@/lib/credits');
    expect(typeof ensureUserCredits).toBe('function');
  });
});
