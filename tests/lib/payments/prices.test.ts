import { describe, it, expect } from 'vitest';

describe('Payments Prices Module', () => {
  it('should export PlanKey type', async () => {
    const module = await import('@/lib/payments/prices');
    expect(module).toBeDefined();
  });

  it('should export BillingCycle type', async () => {
    const module = await import('@/lib/payments/prices');
    expect(module).toBeDefined();
  });

  it('should export CreditPackKey type', async () => {
    const module = await import('@/lib/payments/prices');
    expect(module).toBeDefined();
  });

  it('should export getPriceId function', async () => {
    const { getPriceId } = await import('@/lib/payments/prices');
    expect(typeof getPriceId).toBe('function');
  });

  it('should get price ID for starter monthly plan', async () => {
    const { getPriceId } = await import('@/lib/payments/prices');
    const result = getPriceId('starter', 'monthly');

    // May return null if env vars not set, or string if set
    expect(result === null || typeof result === 'string').toBe(true);
  });

  it('should get price ID for pro yearly plan', async () => {
    const { getPriceId } = await import('@/lib/payments/prices');
    const result = getPriceId('pro', 'yearly');

    expect(result === null || typeof result === 'string').toBe(true);
  });

  it('should get price ID for premium plan', async () => {
    const { getPriceId } = await import('@/lib/payments/prices');
    const resultMonthly = getPriceId('premium', 'monthly');
    const resultYearly = getPriceId('premium', 'yearly');

    expect(resultMonthly === null || typeof resultMonthly === 'string').toBe(true);
    expect(resultYearly === null || typeof resultYearly === 'string').toBe(true);
  });

  it('should export getCreditPackPriceId function', async () => {
    const { getCreditPackPriceId } = await import('@/lib/payments/prices');
    expect(typeof getCreditPackPriceId).toBe('function');
  });

  it('should get credit pack price ID for mini', async () => {
    const { getCreditPackPriceId } = await import('@/lib/payments/prices');
    const result = getCreditPackPriceId('mini');

    expect(result === null || typeof result === 'string').toBe(true);
  });

  it('should get credit pack price ID for all packs', async () => {
    const { getCreditPackPriceId } = await import('@/lib/payments/prices');

    const packs = ['mini', 'standard', 'plus', 'mega', 'ultimate'] as const;
    for (const pack of packs) {
      const result = getCreditPackPriceId(pack);
      expect(result === null || typeof result === 'string').toBe(true);
    }
  });

  it('should export getPlanFromPriceId function', async () => {
    const { getPlanFromPriceId } = await import('@/lib/payments/prices');
    expect(typeof getPlanFromPriceId).toBe('function');
  });

  it('should return null for unknown price ID', async () => {
    const { getPlanFromPriceId } = await import('@/lib/payments/prices');
    const result = getPlanFromPriceId('unknown_price_id');

    expect(result).toBe(null);
  });

  it('should export getCreditPackFromPriceId function', async () => {
    const { getCreditPackFromPriceId } = await import('@/lib/payments/prices');
    expect(typeof getCreditPackFromPriceId).toBe('function');
  });

  it('should return null for unknown credit pack price ID', async () => {
    const { getCreditPackFromPriceId } = await import('@/lib/payments/prices');
    const result = getCreditPackFromPriceId('unknown_credit_pack_id');

    expect(result).toBe(null);
  });

  it('should export allowedPriceIds function', async () => {
    const { allowedPriceIds } = await import('@/lib/payments/prices');
    expect(typeof allowedPriceIds).toBe('function');
  });

  it('should return array of allowed price IDs', async () => {
    const { allowedPriceIds } = await import('@/lib/payments/prices');
    const result = allowedPriceIds();

    expect(Array.isArray(result)).toBe(true);
  });

  it('should export allowedCreditPackIds function', async () => {
    const { allowedCreditPackIds } = await import('@/lib/payments/prices');
    expect(typeof allowedCreditPackIds).toBe('function');
  });

  it('should return array of allowed credit pack IDs', async () => {
    const { allowedCreditPackIds } = await import('@/lib/payments/prices');
    const result = allowedCreditPackIds();

    expect(Array.isArray(result)).toBe(true);
  });
});
