/**
 * Subscription Cancelled Email Template Tests
 */
import { describe, it, expect } from 'vitest';
import { subscriptionCancelledTemplate } from '@/lib/email/templates/subscriptionCancelled';
import type { SubscriptionTemplateData } from '@/lib/email/types';

describe('subscriptionCancelledTemplate', () => {
  describe('Korean locale', () => {
    it('generates Korean subject', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '김철수',
        planName: 'pro',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.subject).toContain('구독이 취소되었습니다');
      expect(result.subject).toContain('DestinyPal');
    });

    it('generates Korean HTML content with user name', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '김철수',
        planName: 'pro',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.html).toContain('김철수');
      expect(result.html).toContain('구독이 취소되었습니다');
      expect(result.html).toContain('Pro');
    });

    it('uses default name when userName is empty', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '',
        planName: 'starter',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.html).toContain('회원');
    });

    it('includes free plan features section', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'premium',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.html).toContain('무료 플랜에서 이용 가능한 기능');
      expect(result.html).toContain('기본 운명 지도 분석');
      expect(result.html).toContain('일일 운세');
    });

    it('includes resubscribe button', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'pro',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.html).toContain('href="https://destinypal.me/pricing"');
      expect(result.html).toContain('플랜 다시 보기');
    });

    it('capitalizes plan name correctly', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'premium',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.html).toContain('Premium');
    });

    it('mentions switch to free plan', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: '테스트',
        planName: 'pro',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.html).toContain('무료 플랜으로 전환');
    });
  });

  describe('English locale', () => {
    it('generates English subject', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'John',
        planName: 'pro',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.subject).toContain('Subscription Has Been Cancelled');
      expect(result.subject).toContain('DestinyPal');
    });

    it('generates English HTML content', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'John Doe',
        planName: 'pro',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Your Subscription Has Been Cancelled');
    });

    it('uses default name when userName is empty', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: '',
        planName: 'starter',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.html).toContain('Member');
    });

    it('includes free plan features in English', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'Test',
        planName: 'premium',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.html).toContain('Available on Free Plan');
      expect(result.html).toContain('Basic Destiny Map Analysis');
      expect(result.html).toContain('Daily Fortune Check');
    });

    it('includes view plans button', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'Test',
        planName: 'pro',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.html).toContain('View Plans');
    });

    it('mentions switch to free plan', () => {
      const data: SubscriptionTemplateData = {
        locale: 'en',
        userName: 'Test',
        planName: 'pro',
      };

      const result = subscriptionCancelledTemplate(data);

      expect(result.html).toContain('switched to the free plan');
    });
  });

  describe('Template structure', () => {
    it('returns both subject and html', () => {
      const data: SubscriptionTemplateData = {
        locale: 'ko',
        userName: 'Test',
        planName: 'pro',
      };

      const result = subscriptionCancelledTemplate(data);

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

      const result = subscriptionCancelledTemplate(data);

      // Base template should include common elements
      expect(result.html).toContain('<!DOCTYPE html');
      expect(result.html).toContain('</html>');
    });
  });
});
