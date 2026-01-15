import { describe, it, expect } from 'vitest';
import { subscriptionConfirmTemplate } from '@/lib/email/templates/subscriptionConfirm';
import { subscriptionCancelledTemplate } from '@/lib/email/templates/subscriptionCancelled';
import { paymentFailedTemplate } from '@/lib/email/templates/paymentFailed';

describe('Email Templates', () => {
  describe('subscriptionConfirmTemplate', () => {
    it('should generate Korean template', () => {
      const result = subscriptionConfirmTemplate({
        userName: '홍길동',
        planName: 'premium',
        billingCycle: 'monthly',
        nextBillingDate: '2024-02-15',
        locale: 'ko',
      });

      expect(result.subject).toContain('Premium');
      expect(result.subject).toContain('구독 시작');
      expect(result.html).toContain('홍길동');
      expect(result.html).toContain('Premium');
      expect(result.html).toContain('월간');
      expect(result.html).toContain('2024-02-15');
    });

    it('should generate English template', () => {
      const result = subscriptionConfirmTemplate({
        userName: 'John Doe',
        planName: 'premium',
        billingCycle: 'annual',
        nextBillingDate: '2025-01-15',
        locale: 'en',
      });

      expect(result.subject).toContain('Premium');
      expect(result.subject).toContain('Subscription Started');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Premium');
      expect(result.html).toContain('Annual');
      expect(result.html).toContain('2025-01-15');
    });

    it('should use default name when userName is not provided', () => {
      const koResult = subscriptionConfirmTemplate({
        planName: 'basic',
        locale: 'ko',
      });

      const enResult = subscriptionConfirmTemplate({
        planName: 'basic',
        locale: 'en',
      });

      expect(koResult.html).toContain('회원');
      expect(enResult.html).toContain('Member');
    });

    it('should capitalize plan name', () => {
      const result = subscriptionConfirmTemplate({
        planName: 'premium',
        locale: 'ko',
      });

      expect(result.subject).toContain('Premium');
      expect(result.html).toContain('Premium');
    });

    it('should handle missing nextBillingDate', () => {
      const result = subscriptionConfirmTemplate({
        planName: 'premium',
        locale: 'ko',
      });

      expect(result.html).not.toContain('다음 결제일');
    });

    it('should include CTA button', () => {
      const result = subscriptionConfirmTemplate({
        planName: 'premium',
        locale: 'ko',
      });

      expect(result.html).toContain('class="button"');
      expect(result.html).toContain('destinypal.me');
    });
  });

  describe('subscriptionCancelledTemplate', () => {
    it('should generate Korean cancellation template', () => {
      const result = subscriptionCancelledTemplate({
        userName: '홍길동',
        planName: 'premium',
        locale: 'ko',
      });

      expect(result.subject).toContain('취소');
      expect(result.html).toContain('홍길동');
      expect(result.html).toContain('Premium');
      expect(result.html).toContain('취소된 플랜');
      expect(result.html).toContain('무료 플랜');
    });

    it('should generate English cancellation template', () => {
      const result = subscriptionCancelledTemplate({
        userName: 'John Doe',
        planName: 'premium',
        locale: 'en',
      });

      expect(result.subject).toContain('Cancelled');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Premium');
      expect(result.html).toContain('Cancelled Plan');
      expect(result.html).toContain('free plan');
    });

    it('should use default name when userName is not provided', () => {
      const koResult = subscriptionCancelledTemplate({
        planName: 'basic',
        locale: 'ko',
      });

      const enResult = subscriptionCancelledTemplate({
        planName: 'basic',
        locale: 'en',
      });

      expect(koResult.html).toContain('회원');
      expect(enResult.html).toContain('Member');
    });

    it('should list free plan features', () => {
      const koResult = subscriptionCancelledTemplate({
        planName: 'premium',
        locale: 'ko',
      });

      expect(koResult.html).toContain('기본 운명 지도 분석');
      expect(koResult.html).toContain('일일 운세');
    });

    it('should include resubscribe CTA', () => {
      const result = subscriptionCancelledTemplate({
        planName: 'premium',
        locale: 'ko',
      });

      expect(result.html).toContain('pricing');
      expect(result.html).toContain('class="button"');
    });
  });

  describe('paymentFailedTemplate', () => {
    it('should generate Korean payment failed template', () => {
      const result = paymentFailedTemplate({
        userName: '홍길동',
        planName: 'premium',
        locale: 'ko',
      });

      expect(result.subject).toContain('[중요]');
      expect(result.subject).toContain('결제 실패');
      expect(result.html).toContain('홍길동');
      expect(result.html).toContain('결제가 실패했습니다');
      expect(result.html).toContain('조치가 필요합니다');
    });

    it('should generate English payment failed template', () => {
      const result = paymentFailedTemplate({
        userName: 'John Doe',
        planName: 'premium',
        locale: 'en',
      });

      expect(result.subject).toContain('[Important]');
      expect(result.subject).toContain('Payment Failed');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('Payment Failed');
      expect(result.html).toContain('Action Required');
    });

    it('should use default name when userName is not provided', () => {
      const koResult = paymentFailedTemplate({
        planName: 'basic',
        locale: 'ko',
      });

      const enResult = paymentFailedTemplate({
        planName: 'basic',
        locale: 'en',
      });

      expect(koResult.html).toContain('회원');
      expect(enResult.html).toContain('Member');
    });

    it('should list possible failure reasons', () => {
      const koResult = paymentFailedTemplate({
        planName: 'premium',
        locale: 'ko',
      });

      expect(koResult.html).toContain('유효기간');
      expect(koResult.html).toContain('한도');
      expect(koResult.html).toContain('차단');
    });

    it('should have error styling', () => {
      const result = paymentFailedTemplate({
        planName: 'premium',
        locale: 'ko',
      });

      expect(result.html).toContain('#FEF2F2'); // Light red background
      expect(result.html).toContain('#EF4444'); // Red border
    });

    it('should include update payment CTA', () => {
      const result = paymentFailedTemplate({
        planName: 'premium',
        locale: 'ko',
      });

      expect(result.html).toContain('profile');
      expect(result.html).toContain('class="button"');
    });
  });
});
