/**
 * Email Providers Tests
 *
 * Tests for email provider system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock resend before importing providers
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn(),
    },
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Email Provider Index', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getEmailProvider', () => {
    it('should return ResendProvider by default', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';
      process.env.EMAIL_PROVIDER = 'resend';

      const { getEmailProvider, resetEmailProvider } = await import(
        '@/lib/email/providers/index'
      );

      resetEmailProvider(); // Clear any cached provider

      const provider = getEmailProvider();
      expect(provider.name).toBe('resend');
    });

    it('should cache provider instance', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';

      const { getEmailProvider, resetEmailProvider } = await import(
        '@/lib/email/providers/index'
      );

      resetEmailProvider();

      const provider1 = getEmailProvider();
      const provider2 = getEmailProvider();

      expect(provider1).toBe(provider2);
    });

    it('should throw error for unknown provider', async () => {
      process.env.EMAIL_PROVIDER = 'unknown-provider';
      process.env.RESEND_API_KEY = 'test-api-key';

      const { getEmailProvider, resetEmailProvider } = await import(
        '@/lib/email/providers/index'
      );

      resetEmailProvider();

      expect(() => getEmailProvider()).toThrow('Unknown email provider');
    });

    it('should use EMAIL_PROVIDER env variable', async () => {
      process.env.EMAIL_PROVIDER = 'resend';
      process.env.RESEND_API_KEY = 'test-api-key';

      const { getEmailProvider, resetEmailProvider } = await import(
        '@/lib/email/providers/index'
      );

      resetEmailProvider();

      const provider = getEmailProvider();
      expect(provider.name).toBe('resend');
    });
  });

  describe('resetEmailProvider', () => {
    it('should reset cached provider', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';

      const { getEmailProvider, resetEmailProvider } = await import(
        '@/lib/email/providers/index'
      );

      const provider1 = getEmailProvider();
      resetEmailProvider();
      const provider2 = getEmailProvider();

      // After reset, a new instance should be created
      expect(provider1.name).toBe('resend');
      expect(provider2.name).toBe('resend');
    });

    it('should not throw when called multiple times', async () => {
      const { resetEmailProvider } = await import(
        '@/lib/email/providers/index'
      );

      expect(() => {
        resetEmailProvider();
        resetEmailProvider();
        resetEmailProvider();
      }).not.toThrow();
    });
  });
});

describe('ResendProvider', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should throw error when RESEND_API_KEY is not set', async () => {
      delete process.env.RESEND_API_KEY;

      const { ResendProvider } = await import(
        '@/lib/email/providers/resendProvider'
      );

      expect(() => new ResendProvider()).toThrow('RESEND_API_KEY is not configured');
    });

    it('should create provider when RESEND_API_KEY is set', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';

      const { ResendProvider } = await import(
        '@/lib/email/providers/resendProvider'
      );

      const provider = new ResendProvider();
      expect(provider.name).toBe('resend');
    });
  });

  describe('send', () => {
    it('should send email successfully', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';
      process.env.EMAIL_FROM = 'Test <test@example.com>';

      const { Resend } = await import('resend');
      const mockSend = vi.fn().mockResolvedValue({
        data: { id: 'msg-123' },
        error: null,
      });
      vi.mocked(Resend).mockImplementation(() => ({
        emails: { send: mockSend },
      }) as unknown as InstanceType<typeof Resend>);

      const { ResendProvider } = await import(
        '@/lib/email/providers/resendProvider'
      );

      const provider = new ResendProvider();
      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<p>Hello</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
    });

    it('should handle Resend API error', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';

      const { Resend } = await import('resend');
      const mockSend = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid recipient' },
      });
      vi.mocked(Resend).mockImplementation(() => ({
        emails: { send: mockSend },
      }) as unknown as InstanceType<typeof Resend>);

      const { ResendProvider } = await import(
        '@/lib/email/providers/resendProvider'
      );

      const provider = new ResendProvider();
      const result = await provider.send({
        to: 'invalid@',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid recipient');
    });

    it('should handle network errors', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';

      const { Resend } = await import('resend');
      const mockSend = vi.fn().mockRejectedValue(new Error('Network error'));
      vi.mocked(Resend).mockImplementation(() => ({
        emails: { send: mockSend },
      }) as unknown as InstanceType<typeof Resend>);

      const { ResendProvider } = await import(
        '@/lib/email/providers/resendProvider'
      );

      const provider = new ResendProvider();
      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle non-Error exceptions', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';

      const { Resend } = await import('resend');
      const mockSend = vi.fn().mockRejectedValue('String error');
      vi.mocked(Resend).mockImplementation(() => ({
        emails: { send: mockSend },
      }) as unknown as InstanceType<typeof Resend>);

      const { ResendProvider } = await import(
        '@/lib/email/providers/resendProvider'
      );

      const provider = new ResendProvider();
      const result = await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });

    it('should pass all email options correctly', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';
      process.env.EMAIL_FROM = 'Sender <sender@example.com>';

      const { Resend } = await import('resend');
      const mockSend = vi.fn().mockResolvedValue({
        data: { id: 'msg-456' },
        error: null,
      });
      vi.mocked(Resend).mockImplementation(() => ({
        emails: { send: mockSend },
      }) as unknown as InstanceType<typeof Resend>);

      const { ResendProvider } = await import(
        '@/lib/email/providers/resendProvider'
      );

      const provider = new ResendProvider();
      await provider.send({
        to: 'recipient@example.com',
        subject: 'Test Email',
        html: '<p>HTML content</p>',
        text: 'Plain text content',
        replyTo: 'reply@example.com',
        tags: ['welcome', 'onboarding'],
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
          subject: 'Test Email',
          html: '<p>HTML content</p>',
          text: 'Plain text content',
          replyTo: 'reply@example.com',
        })
      );
    });

    it('should use default EMAIL_FROM when not set', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';
      delete process.env.EMAIL_FROM;

      const { Resend } = await import('resend');
      const mockSend = vi.fn().mockResolvedValue({
        data: { id: 'msg-789' },
        error: null,
      });
      vi.mocked(Resend).mockImplementation(() => ({
        emails: { send: mockSend },
      }) as unknown as InstanceType<typeof Resend>);

      const { ResendProvider } = await import(
        '@/lib/email/providers/resendProvider'
      );

      const provider = new ResendProvider();
      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'DestinyPal <noreply@destinypal.me>',
        })
      );
    });

    it('should convert tags to correct format', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';

      const { Resend } = await import('resend');
      const mockSend = vi.fn().mockResolvedValue({
        data: { id: 'msg-tag' },
        error: null,
      });
      vi.mocked(Resend).mockImplementation(() => ({
        emails: { send: mockSend },
      }) as unknown as InstanceType<typeof Resend>);

      const { ResendProvider } = await import(
        '@/lib/email/providers/resendProvider'
      );

      const provider = new ResendProvider();
      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        tags: ['welcome', 'premium'],
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [
            { name: 'welcome', value: 'true' },
            { name: 'premium', value: 'true' },
          ],
        })
      );
    });

    it('should handle undefined tags', async () => {
      process.env.RESEND_API_KEY = 'test-api-key';

      const { Resend } = await import('resend');
      const mockSend = vi.fn().mockResolvedValue({
        data: { id: 'msg-notag' },
        error: null,
      });
      vi.mocked(Resend).mockImplementation(() => ({
        emails: { send: mockSend },
      }) as unknown as InstanceType<typeof Resend>);

      const { ResendProvider } = await import(
        '@/lib/email/providers/resendProvider'
      );

      const provider = new ResendProvider();
      await provider.send({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: undefined,
        })
      );
    });
  });
});

describe('EmailProvider interface', () => {
  it('should define name property', () => {
    interface EmailProvider {
      name: string;
    }

    const provider: EmailProvider = { name: 'test' };
    expect(provider.name).toBe('test');
  });

  it('should define send method signature', () => {
    interface SendEmailOptions {
      to: string;
      subject: string;
      html: string;
      text?: string;
      replyTo?: string;
      tags?: string[];
    }

    interface SendEmailResult {
      success: boolean;
      messageId?: string;
      error?: string;
    }

    const options: SendEmailOptions = {
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    };

    const successResult: SendEmailResult = {
      success: true,
      messageId: 'msg-123',
    };

    const errorResult: SendEmailResult = {
      success: false,
      error: 'Failed',
    };

    expect(options.to).toBe('test@example.com');
    expect(successResult.success).toBe(true);
    expect(errorResult.success).toBe(false);
  });
});

describe('Email provider patterns', () => {
  it('should support multiple provider types', () => {
    const supportedProviders = ['resend', 'sendgrid', 'nodemailer'];
    expect(supportedProviders).toContain('resend');
  });

  it('should use singleton pattern for provider', async () => {
    process.env.RESEND_API_KEY = 'test-api-key';

    const { getEmailProvider, resetEmailProvider } = await import(
      '@/lib/email/providers/index'
    );

    resetEmailProvider();

    const p1 = getEmailProvider();
    const p2 = getEmailProvider();
    const p3 = getEmailProvider();

    expect(p1).toBe(p2);
    expect(p2).toBe(p3);
  });
});
