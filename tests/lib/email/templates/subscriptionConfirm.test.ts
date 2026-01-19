/**
 * Subscription Confirm Email Template Tests
 */
import { describe, it, expect } from 'vitest';
import { subscriptionConfirmTemplate } from '@/lib/email/templates/subscriptionConfirm';
import type { SubscriptionTemplateData } from '@/lib/email/types';

describe('subscriptionConfirmTemplate', () => {
  describe('Korean locale', () => {
    it('generates Korean subject', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '김철수',
        planName: 'pro',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.subject).toContain('Pro 플랜 구독 시작');
      expect(result.subject).toContain('DestinyPal');
    });

    it('generates Korean HTML content with user name', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '김철수',
        planName: 'pro',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('김철수');
      expect(result.html).toContain('구독이 시작되었습니다');
      expect(result.html).toContain('Pro');
    });

    it('uses default name when userName is empty', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '',
        planName: 'starter',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('회원');
    });

    it('includes Korean features list', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'premium',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('이제 사용 가능한 기능');
      expect(result.html).toContain('무제한 운명 지도 분석');
      expect(result.html).toContain('상담사 AI');
      expect(result.html).toContain('프리미엄 타로 스프레드');
    });

    it('includes counselor button link', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'pro',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('href="https://destinypal.me/destiny-map/counselor"');
      expect(result.html).toContain('상담사와 대화하기');
    });

    it('capitalizes plan name correctly', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'starter',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('Starter');
    });

    it('displays monthly billing cycle', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'pro',
        billingCycle: 'monthly',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('월간');
    });

    it('displays annual billing cycle', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'pro',
        billingCycle: 'annual',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('연간');
    });

    it('includes next billing date when provided', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'pro',
        nextBillingDate: '2024-12-01',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('다음 결제일');
      expect(result.html).toContain('2024-12-01');
    });

    it('does not include next billing date when not provided', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'pro',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).not.toContain('다음 결제일');
    });

    it('includes subscription management notice', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'pro',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('계정 설정에서 관리');
    });
  });

  describe('English locale', () => {
    it('generates English subject', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'John',
        planName: 'pro',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.subject).toContain('Pro Plan Subscription Started');
      expect(result.subject).toContain('DestinyPal');
    });

    it('generates English HTML content', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'John Doe',
        planName: 'pro',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Your Subscription Has Started');
    });

    it('uses default name when userName is empty', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: '',
        planName: 'starter',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('Member');
    });

    it('includes English features list', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'Test',
        planName: 'premium',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('Features Now Available');
      expect(result.html).toContain('Unlimited Destiny Map Analysis');
      expect(result.html).toContain('Counselor AI');
      expect(result.html).toContain('Premium Tarot Spreads');
    });

    it('includes counselor button', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'Test',
        planName: 'pro',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('Chat with Counselor');
    });

    it('displays Monthly billing cycle', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'Test',
        planName: 'pro',
        billingCycle: 'monthly',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('Monthly');
    });

    it('displays Annual billing cycle', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'Test',
        planName: 'pro',
        billingCycle: 'annual',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('Annual');
    });

    it('includes next billing date when provided', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'Test',
        planName: 'pro',
        nextBillingDate: 'December 1, 2024',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('Next Billing Date');
      expect(result.html).toContain('December 1, 2024');
    });

    it('includes subscription management notice', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'Test',
        planName: 'pro',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('manage your subscription');
      expect(result.html).toContain('account settings');
    });
  });

  describe('Template structure', () => {
    it('returns both subject and html', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: 'Test',
        planName: 'pro',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result).toHaveProperty('subject');
      expect(result).toHaveProperty('html');
      expect(typeof result.subject).toBe('string');
      expect(typeof result.html).toBe('string');
    });

    it('wraps content in base template', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'Test',
        planName: 'pro',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('<!DOCTYPE html');
      expect(result.html).toContain('</html>');
    });

    it('includes info box with plan details', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: 'Test',
        planName: 'premium',
        billingCycle: 'annual',
      };

      const result = subscriptionConfirmTemplate(data);

      expect(result.html).toContain('class="info-box"');
      expect(result.html).toContain('Premium');
      expect(result.html).toContain('연간');
    });
  });
});
