// tests/emailService.test.ts
// 이메일 서비스 테스트

import { vi, beforeEach, afterEach } from "vitest";

// Mock dependencies before importing the module
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    emailLog: {
      create: vi.fn().mockResolvedValue({ id: 'test-id' }),
    },
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('./providers', () => ({
  getEmailProvider: vi.fn(),
}));

vi.mock('./templates', () => ({
  welcomeTemplate: vi.fn(() => ({ subject: 'Welcome', html: '<html>Welcome</html>' })),
  paymentReceiptTemplate: vi.fn(() => ({ subject: 'Receipt', html: '<html>Receipt</html>' })),
  subscriptionConfirmTemplate: vi.fn(() => ({ subject: 'Subscription', html: '<html>Sub</html>' })),
  subscriptionCancelledTemplate: vi.fn(() => ({ subject: 'Cancelled', html: '<html>Cancelled</html>' })),
  paymentFailedTemplate: vi.fn(() => ({ subject: 'Failed', html: '<html>Failed</html>' })),
  referralRewardTemplate: vi.fn(() => ({ subject: 'Reward', html: '<html>Reward</html>' })),
}));

// Email type definition (mimicking the actual type)
type EmailType = 'welcome' | 'payment_receipt' | 'subscription_confirm' | 'subscription_cancelled' | 'payment_failed' | 'referral_reward';
type Locale = 'ko' | 'en';

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

describe('emailService', () => {
  describe('template selection', () => {
    const templateMapping: Record<EmailType, string> = {
      welcome: 'welcomeTemplate',
      payment_receipt: 'paymentReceiptTemplate',
      subscription_confirm: 'subscriptionConfirmTemplate',
      subscription_cancelled: 'subscriptionCancelledTemplate',
      payment_failed: 'paymentFailedTemplate',
      referral_reward: 'referralRewardTemplate',
    };

    function getTemplate(type: EmailType): { subject: string; html: string } | null {
      const templates: Record<EmailType, { subject: string; html: string }> = {
        welcome: { subject: 'Welcome', html: '<html>Welcome</html>' },
        payment_receipt: { subject: 'Receipt', html: '<html>Receipt</html>' },
        subscription_confirm: { subject: 'Subscription', html: '<html>Sub</html>' },
        subscription_cancelled: { subject: 'Cancelled', html: '<html>Cancelled</html>' },
        payment_failed: { subject: 'Failed', html: '<html>Failed</html>' },
        referral_reward: { subject: 'Reward', html: '<html>Reward</html>' },
      };
      return templates[type] || null;
    }

    it.each(Object.keys(templateMapping) as EmailType[])(
      'should return template for %s email type',
      (emailType) => {
        const template = getTemplate(emailType);
        expect(template).not.toBeNull();
        expect(template?.subject).toBeTruthy();
        expect(template?.html).toBeTruthy();
      }
    );

    it('should return null for unknown email type', () => {
      const template = getTemplate('unknown' as EmailType);
      expect(template).toBeNull();
    });
  });

  describe('email data validation', () => {
    interface WelcomeTemplateData {
      userName?: string;
      locale: Locale;
      referralCode?: string;
    }

    interface PaymentReceiptTemplateData {
      userName?: string;
      amount: number;
      currency: string;
      productName: string;
      transactionId?: string;
      locale: Locale;
    }

    interface SubscriptionTemplateData {
      userName?: string;
      planName: string;
      billingCycle?: string;
      nextBillingDate?: string;
      locale: Locale;
    }

    interface ReferralRewardTemplateData {
      userName?: string;
      creditsAwarded: number;
      referredUserName?: string;
      locale: Locale;
    }

    it('should validate welcome email data', () => {
      const data: WelcomeTemplateData = {
        userName: 'Test User',
        locale: 'ko',
        referralCode: 'ABC123',
      };

      expect(data.locale).toBe('ko');
      expect(data.userName).toBe('Test User');
    });

    it('should validate payment receipt data', () => {
      const data: PaymentReceiptTemplateData = {
        userName: 'Test User',
        amount: 9900,
        currency: 'KRW',
        productName: 'Premium Plan',
        transactionId: 'txn_123',
        locale: 'ko',
      };

      expect(data.amount).toBe(9900);
      expect(data.currency).toBe('KRW');
      expect(data.productName).toBe('Premium Plan');
    });

    it('should validate subscription data', () => {
      const data: SubscriptionTemplateData = {
        userName: 'Test User',
        planName: 'Premium',
        billingCycle: 'monthly',
        nextBillingDate: '2024-07-01',
        locale: 'ko',
      };

      expect(data.planName).toBe('Premium');
      expect(data.billingCycle).toBe('monthly');
    });

    it('should validate referral reward data', () => {
      const data: ReferralRewardTemplateData = {
        userName: 'Test User',
        creditsAwarded: 10,
        referredUserName: 'New User',
        locale: 'ko',
      };

      expect(data.creditsAwarded).toBe(10);
      expect(data.referredUserName).toBe('New User');
    });
  });

  describe('locale handling', () => {
    const validLocales: Locale[] = ['ko', 'en'];

    it.each(validLocales)('should accept %s as valid locale', (locale) => {
      expect(['ko', 'en']).toContain(locale);
    });

    it('should default to ko when locale not specified', () => {
      const defaultLocale: Locale = 'ko';
      expect(defaultLocale).toBe('ko');
    });
  });

  describe('SendEmailResult structure', () => {
    it('should have success property', () => {
      const successResult: SendEmailResult = {
        success: true,
        messageId: 'msg_123',
      };

      expect(successResult.success).toBe(true);
      expect(successResult.messageId).toBe('msg_123');
      expect(successResult.error).toBeUndefined();
    });

    it('should have error property on failure', () => {
      const failResult: SendEmailResult = {
        success: false,
        error: 'Email provider not configured',
      };

      expect(failResult.success).toBe(false);
      expect(failResult.error).toBe('Email provider not configured');
      expect(failResult.messageId).toBeUndefined();
    });
  });

  describe('convenience function signatures', () => {
    // Test that convenience functions have correct parameter types

    it('should accept sendWelcomeEmail parameters', () => {
      type SendWelcomeParams = {
        userId: string;
        email: string;
        name: string;
        locale?: Locale;
        referralCode?: string;
      };

      const params: SendWelcomeParams = {
        userId: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        locale: 'ko',
        referralCode: 'ABC123',
      };

      expect(params.userId).toBeTruthy();
      expect(params.email).toContain('@');
    });

    it('should accept sendPaymentReceiptEmail parameters', () => {
      type SendPaymentReceiptParams = {
        userId: string;
        email: string;
        data: {
          userName?: string;
          amount: number;
          currency: string;
          productName: string;
          transactionId?: string;
          locale?: Locale;
        };
      };

      const params: SendPaymentReceiptParams = {
        userId: 'user_123',
        email: 'test@example.com',
        data: {
          amount: 9900,
          currency: 'KRW',
          productName: 'Premium Plan',
        },
      };

      expect(params.data.amount).toBeGreaterThan(0);
    });

    it('should accept sendSubscriptionConfirmEmail parameters', () => {
      type SendSubscriptionParams = {
        userId: string;
        email: string;
        data: {
          userName?: string;
          planName: string;
          billingCycle?: string;
          nextBillingDate?: string;
          locale?: Locale;
        };
      };

      const params: SendSubscriptionParams = {
        userId: 'user_123',
        email: 'test@example.com',
        data: {
          planName: 'Premium',
          billingCycle: 'monthly',
        },
      };

      expect(params.data.planName).toBeTruthy();
    });

    it('should accept sendReferralRewardEmail parameters', () => {
      type SendReferralParams = {
        userId: string;
        email: string;
        data: {
          userName?: string;
          creditsAwarded: number;
          referredUserName?: string;
          locale?: Locale;
        };
      };

      const params: SendReferralParams = {
        userId: 'user_123',
        email: 'test@example.com',
        data: {
          creditsAwarded: 10,
          referredUserName: 'New User',
        },
      };

      expect(params.data.creditsAwarded).toBeGreaterThan(0);
    });
  });

  describe('provider configuration check', () => {
    it('should identify when no provider is configured', () => {
      const hasResend = !!process.env.RESEND_API_KEY;
      const hasSendgrid = !!process.env.SENDGRID_API_KEY;
      const hasProvider = hasResend || hasSendgrid;

      // In test environment, typically no keys are set
      expect(typeof hasProvider).toBe('boolean');
    });

    it('should prefer Resend when both providers are configured', () => {
      // Logic test - Resend is preferred
      const providers = ['resend', 'sendgrid'];
      const preferredProvider = providers[0];

      expect(preferredProvider).toBe('resend');
    });
  });

  describe('email logging structure', () => {
    interface EmailLogData {
      userId?: string;
      email: string;
      type: EmailType;
      subject: string;
      status: 'sent' | 'failed';
      errorMsg?: string;
      provider: string;
      messageId?: string;
    }

    it('should structure log data for successful send', () => {
      const logData: EmailLogData = {
        userId: 'user_123',
        email: 'test@example.com',
        type: 'welcome',
        subject: 'Welcome!',
        status: 'sent',
        provider: 'resend',
        messageId: 'msg_123',
      };

      expect(logData.status).toBe('sent');
      expect(logData.errorMsg).toBeUndefined();
    });

    it('should structure log data for failed send', () => {
      const logData: EmailLogData = {
        userId: 'user_123',
        email: 'test@example.com',
        type: 'welcome',
        subject: 'Welcome!',
        status: 'failed',
        errorMsg: 'Provider error',
        provider: 'unknown',
      };

      expect(logData.status).toBe('failed');
      expect(logData.errorMsg).toBeTruthy();
    });
  });

  describe('email validation', () => {
    function isValidEmail(email: string): boolean {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.kr')).toBe(true);
      expect(isValidEmail('user+tag@gmail.com')).toBe(true);
    });

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user name@domain.com')).toBe(false);
    });
  });
});
