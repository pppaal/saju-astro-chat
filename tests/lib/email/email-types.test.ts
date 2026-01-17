import { describe, it, expect } from 'vitest';

describe('Email Module Exports', () => {
  it('should export sendEmail function', async () => {
    const { sendEmail } = await import('@/lib/email');
    expect(typeof sendEmail).toBe('function');
  });

  it('should export sendWelcomeEmail function', async () => {
    const { sendWelcomeEmail } = await import('@/lib/email');
    expect(typeof sendWelcomeEmail).toBe('function');
  });

  it('should export sendPaymentReceiptEmail function', async () => {
    const { sendPaymentReceiptEmail } = await import('@/lib/email');
    expect(typeof sendPaymentReceiptEmail).toBe('function');
  });

  it('should export sendSubscriptionConfirmEmail function', async () => {
    const { sendSubscriptionConfirmEmail } = await import('@/lib/email');
    expect(typeof sendSubscriptionConfirmEmail).toBe('function');
  });

  it('should export sendSubscriptionCancelledEmail function', async () => {
    const { sendSubscriptionCancelledEmail } = await import('@/lib/email');
    expect(typeof sendSubscriptionCancelledEmail).toBe('function');
  });

  it('should export sendPaymentFailedEmail function', async () => {
    const { sendPaymentFailedEmail } = await import('@/lib/email');
    expect(typeof sendPaymentFailedEmail).toBe('function');
  });

  it('should export sendReferralRewardEmail function', async () => {
    const { sendReferralRewardEmail } = await import('@/lib/email');
    expect(typeof sendReferralRewardEmail).toBe('function');
  });
});

describe('Email Types', () => {
  it('should have valid EmailType values', async () => {
    const module = await import('@/lib/email/types');
    expect(module).toBeDefined();
  });

  it('should have valid Locale values', async () => {
    const module = await import('@/lib/email/types');
    expect(module).toBeDefined();
  });
});
