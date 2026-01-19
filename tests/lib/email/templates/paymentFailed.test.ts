/**
 * Payment Failed Email Template Tests
 */
import { describe, it, expect } from 'vitest';
import { paymentFailedTemplate } from '@/lib/email/templates/paymentFailed';
import type { SubscriptionTemplateData } from '@/lib/email/types';

describe('paymentFailedTemplate', () => {
  describe('Korean locale', () => {
    it('generates Korean subject', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '김철수',
        planName: 'pro',
      };

      const result = paymentFailedTemplate(data);

      expect(result.subject).toContain('결제 실패');
      expect(result.subject).toContain('DestinyPal');
    });

    it('generates Korean HTML content with user name', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '김철수',
        planName: 'pro',
      };

      const result = paymentFailedTemplate(data);

      expect(result.html).toContain('김철수');
      expect(result.html).toContain('결제가 실패했습니다');
      expect(result.html).toContain('Pro');
    });

    it('uses default name when userName is empty', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '',
        planName: 'starter',
      };

      const result = paymentFailedTemplate(data);

      expect(result.html).toContain('회원');
    });

    it('includes action required section', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'premium',
      };

      const result = paymentFailedTemplate(data);

      expect(result.html).toContain('조치가 필요합니다');
      expect(result.html).toContain('결제 수단을 업데이트');
    });

    it('includes update payment button', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'pro',
      };

      const result = paymentFailedTemplate(data);

      expect(result.html).toContain('href="https://destinypal.me/profile"');
      expect(result.html).toContain('결제 수단 업데이트');
    });

    it('capitalizes plan name correctly', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'starter',
      };

      const result = paymentFailedTemplate(data);

      expect(result.html).toContain('Starter');
    });
  });

  describe('English locale', () => {
    it('generates English subject', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'John',
        planName: 'pro',
      };

      const result = paymentFailedTemplate(data);

      expect(result.subject).toContain('Payment Failed');
      expect(result.subject).toContain('DestinyPal');
    });

    it('generates English HTML content', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'John Doe',
        planName: 'pro',
      };

      const result = paymentFailedTemplate(data);

      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Payment Failed');
      expect(result.html).toContain('Action Required');
    });

    it('uses default name when userName is empty', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: '',
        planName: 'starter',
      };

      const result = paymentFailedTemplate(data);

      expect(result.html).toContain('Member');
    });

    it('includes payment failure reasons', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'Test',
        planName: 'premium',
      };

      const result = paymentFailedTemplate(data);

      expect(result.html).toContain('card may have expired');
      expect(result.html).toContain('card limit');
      expect(result.html).toContain('bank may have blocked');
    });

    it('includes update payment button', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'Test',
        planName: 'pro',
      };

      const result = paymentFailedTemplate(data);

      expect(result.html).toContain('Update Payment Method');
    });
  });

  describe('Template structure', () => {
    it('returns both subject and html', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: 'Test',
        planName: 'pro',
      };

      const result = paymentFailedTemplate(data);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(typeof result.subject).toBe('string');
      expect(typeof result.html).toBe('string');
    });

    it('wraps content in base template', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: 'Test',
        planName: 'pro',
      };

      const result = paymentFailedTemplate(data);

      // Base template should include common elements
      expect(result.html).toContain('<!DOCTYPE html');
      expect(result.html).toContain('</html>');
    });
  });
});
