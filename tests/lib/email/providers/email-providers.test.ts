/**
 * @file Tests for email providers module
 * 커버리지 향상을 위한 email providers 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

describe('Email Providers Module', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('getEmailProvider', () => {
    it('should export getEmailProvider function', async () => {
      const { getEmailProvider } = await import('@/lib/email/providers');
      expect(getEmailProvider).toBeDefined();
      expect(typeof getEmailProvider).toBe('function');
    });

    it('should export resetEmailProvider function', async () => {
      const { resetEmailProvider } = await import('@/lib/email/providers');
      expect(resetEmailProvider).toBeDefined();
      expect(typeof resetEmailProvider).toBe('function');
    });

    it('should throw error for unknown provider', async () => {
      vi.resetModules();
      process.env.EMAIL_PROVIDER = 'unknown_provider';
      process.env.RESEND_API_KEY = 'test-api-key';

      const { getEmailProvider, resetEmailProvider } = await import('@/lib/email/providers');
      resetEmailProvider();

      expect(() => getEmailProvider()).toThrow('Unknown email provider: unknown_provider');
    });

    it('should default to resend provider', async () => {
      vi.resetModules();
      delete process.env.EMAIL_PROVIDER;
      process.env.RESEND_API_KEY = 'test-api-key';

      const { getEmailProvider, resetEmailProvider } = await import('@/lib/email/providers');
      resetEmailProvider();

      const provider = getEmailProvider();
      expect(provider.name).toBe('resend');
    });

    it('should cache provider instance', async () => {
      vi.resetModules();
      process.env.EMAIL_PROVIDER = 'resend';
      process.env.RESEND_API_KEY = 'test-api-key';

      const { getEmailProvider, resetEmailProvider } = await import('@/lib/email/providers');
      resetEmailProvider();

      const provider1 = getEmailProvider();
      const provider2 = getEmailProvider();
      expect(provider1).toBe(provider2);
    });

    it('should reset provider cache', async () => {
      vi.resetModules();
      process.env.EMAIL_PROVIDER = 'resend';
      process.env.RESEND_API_KEY = 'test-api-key';

      const { getEmailProvider, resetEmailProvider } = await import('@/lib/email/providers');

      resetEmailProvider();
      const provider1 = getEmailProvider();

      resetEmailProvider();
      const provider2 = getEmailProvider();

      // Different instances after reset
      expect(provider1).not.toBe(provider2);
    });
  });

  describe('ResendProvider', () => {
    it('should throw error when RESEND_API_KEY is not configured', async () => {
      vi.resetModules();
      delete process.env.RESEND_API_KEY;

      const { ResendProvider } = await import('@/lib/email/providers/resendProvider');
      expect(() => new ResendProvider()).toThrow('RESEND_API_KEY is not configured');
    });

    it('should have name property set to resend', async () => {
      vi.resetModules();
      process.env.RESEND_API_KEY = 'test-api-key';

      const { ResendProvider } = await import('@/lib/email/providers/resendProvider');
      const provider = new ResendProvider();
      expect(provider.name).toBe('resend');
    });

    it('should implement EmailProvider interface', async () => {
      vi.resetModules();
      process.env.RESEND_API_KEY = 'test-api-key';

      const { ResendProvider } = await import('@/lib/email/providers/resendProvider');
      const provider = new ResendProvider();

      expect(provider.name).toBeDefined();
      expect(typeof provider.send).toBe('function');
    });
  });
});

describe('Email Types', () => {
  it('should export email type definitions', async () => {
    const module = await import('@/lib/email/types');
    expect(module).toBeDefined();
  });
});
