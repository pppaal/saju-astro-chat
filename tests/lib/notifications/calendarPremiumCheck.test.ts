import { describe, it, expect, vi } from 'vitest';
import {
  checkCalendarAccess,
  generateCalendarAccessNotification,
  getCalendarPremiumMessage,
  filterCalendarDataForFree,
  getCalendarUpgradePrompt,
  FREE_CALENDAR_PREVIEW_DAYS,
} from '@/lib/notifications/calendarPremiumCheck';

// Mock premiumNotifications
vi.mock('@/lib/notifications/premiumNotifications', () => ({
  generateCalendarPremiumNotification: vi.fn().mockReturnValue({
    type: 'calendar_premium',
    title: '프리미엄 운세 캘린더',
    message: '운세 캘린더를 이용하려면 프리미엄으로 업그레이드하세요.',
    priority: 'medium',
  }),
}));

describe('calendarPremiumCheck', () => {
  describe('checkCalendarAccess', () => {
    it('should deny access for free plan', () => {
      const result = checkCalendarAccess('free', true);

      expect(result.hasAccess).toBe(false);
      expect(result.plan).toBe('free');
      expect(result.reason).toBe('free_plan');
    });

    it('should deny access when no active subscription', () => {
      const result = checkCalendarAccess('starter', false);

      expect(result.hasAccess).toBe(false);
      expect(result.plan).toBe('starter');
      expect(result.reason).toBe('no_subscription');
    });

    it('should grant access for starter plan with active subscription', () => {
      const result = checkCalendarAccess('starter', true);

      expect(result.hasAccess).toBe(true);
      expect(result.plan).toBe('starter');
      expect(result.reason).toBeUndefined();
    });

    it('should grant access for premium plan with active subscription', () => {
      const result = checkCalendarAccess('premium', true);

      expect(result.hasAccess).toBe(true);
      expect(result.plan).toBe('premium');
    });

    it('should grant access for unlimited plan with active subscription', () => {
      const result = checkCalendarAccess('unlimited', true);

      expect(result.hasAccess).toBe(true);
      expect(result.plan).toBe('unlimited');
    });
  });

  describe('generateCalendarAccessNotification', () => {
    it('should return null when user has access', () => {
      const accessInfo = { hasAccess: true, plan: 'premium' };
      const result = generateCalendarAccessNotification(accessInfo);

      expect(result).toBeNull();
    });

    it('should return notification when user does not have access', () => {
      const accessInfo = { hasAccess: false, plan: 'free', reason: 'free_plan' as const };
      const result = generateCalendarAccessNotification(accessInfo);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('calendar_premium');
    });

    it('should use default userName when not provided', () => {
      const accessInfo = { hasAccess: false, plan: 'free', reason: 'free_plan' as const };
      const result = generateCalendarAccessNotification(accessInfo);

      expect(result).not.toBeNull();
    });

    it('should accept custom userName', () => {
      const accessInfo = { hasAccess: false, plan: 'free', reason: 'free_plan' as const };
      const result = generateCalendarAccessNotification(accessInfo, '홍길동');

      expect(result).not.toBeNull();
    });

    it('should accept custom locale', () => {
      const accessInfo = { hasAccess: false, plan: 'free', reason: 'free_plan' as const };
      const result = generateCalendarAccessNotification(accessInfo, 'Member', 'en');

      expect(result).not.toBeNull();
    });
  });

  describe('getCalendarPremiumMessage', () => {
    it('should return Korean message by default', () => {
      const result = getCalendarPremiumMessage();

      expect(result.title).toBe('프리미엄 운세 캘린더');
      expect(result.description).toContain('1년 운세 캘린더');
      expect(result.features).toHaveLength(5);
      expect(result.features[0]).toBe('365일 운세 분석');
    });

    it('should return Korean message for ko locale', () => {
      const result = getCalendarPremiumMessage('ko');

      expect(result.title).toBe('프리미엄 운세 캘린더');
      expect(result.features).toContain('결혼식, 계약, 여행 최적 날짜 추천');
    });

    it('should return English message for en locale', () => {
      const result = getCalendarPremiumMessage('en');

      expect(result.title).toBe('Premium Destiny Calendar');
      expect(result.description).toContain('year-long destiny calendar');
      expect(result.features).toHaveLength(5);
      expect(result.features[0]).toBe('365-day fortune analysis');
    });

    it('should include all premium features in Korean', () => {
      const result = getCalendarPremiumMessage('ko');

      expect(result.features).toContain('365일 운세 분석');
      expect(result.features).toContain('결혼식, 계약, 여행 최적 날짜 추천');
      expect(result.features).toContain('매일의 행운 시간과 주의 시간');
      expect(result.features).toContain('사주와 점성술 기반 개인 맞춤 추천');
      expect(result.features).toContain('중요한 날짜 저장 및 내보내기');
    });

    it('should include all premium features in English', () => {
      const result = getCalendarPremiumMessage('en');

      expect(result.features).toContain('365-day fortune analysis');
      expect(result.features).toContain('Best dates for weddings, contracts, and travel');
      expect(result.features).toContain('Daily lucky times and caution periods');
      expect(result.features).toContain('Personalized recommendations based on Saju and Astrology');
      expect(result.features).toContain('Save and export your important dates');
    });
  });

  describe('FREE_CALENDAR_PREVIEW_DAYS', () => {
    it('should be 7 days', () => {
      expect(FREE_CALENDAR_PREVIEW_DAYS).toBe(7);
    });
  });

  describe('filterCalendarDataForFree', () => {
    const createDateArray = (startDate: Date, count: number) => {
      return Array.from({ length: count }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        return { date: date.toISOString().split('T')[0], score: 50 + i };
      });
    };

    it('should filter to first 7 days from start date', () => {
      const startDate = new Date('2024-01-01');
      const allDates = createDateArray(startDate, 30);

      const result = filterCalendarDataForFree(allDates, startDate);

      expect(result.length).toBe(7);
      expect(result[0].date).toBe('2024-01-01');
      expect(result[6].date).toBe('2024-01-07');
    });

    it('should use current date as default start date', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allDates = createDateArray(today, 30);

      const result = filterCalendarDataForFree(allDates);

      expect(result.length).toBeLessThanOrEqual(7);
    });

    it('should return empty array when no dates in range', () => {
      const pastDates = [
        { date: '2020-01-01', score: 50 },
        { date: '2020-01-02', score: 51 },
      ];
      const startDate = new Date('2024-01-01');

      const result = filterCalendarDataForFree(pastDates, startDate);

      expect(result.length).toBe(0);
    });

    it('should return less than 7 if not enough dates available', () => {
      const startDate = new Date('2024-01-01');
      const allDates = createDateArray(startDate, 3);

      const result = filterCalendarDataForFree(allDates, startDate);

      expect(result.length).toBe(3);
    });

    it('should exclude past dates', () => {
      const startDate = new Date('2024-01-05');
      const allDates = [
        { date: '2024-01-01', score: 50 },
        { date: '2024-01-02', score: 51 },
        { date: '2024-01-05', score: 52 },
        { date: '2024-01-06', score: 53 },
        { date: '2024-01-10', score: 54 },
      ];

      const result = filterCalendarDataForFree(allDates, startDate);

      // Jan 05, 06, 10 are all within 7 day window from Jan 05
      expect(result.length).toBe(3);
      expect(result[0].date).toBe('2024-01-05');
      expect(result[1].date).toBe('2024-01-06');
      expect(result[2].date).toBe('2024-01-10');
    });

    it('should preserve original data structure', () => {
      const startDate = new Date('2024-01-01');
      const allDates = [
        { date: '2024-01-01', score: 75, grade: 'A', description: 'Good day' },
        { date: '2024-01-02', score: 60, grade: 'B', description: 'Normal day' },
      ];

      const result = filterCalendarDataForFree(allDates, startDate);

      expect(result[0]).toEqual(allDates[0]);
      expect(result[1]).toEqual(allDates[1]);
    });
  });

  describe('getCalendarUpgradePrompt', () => {
    it('should return Korean prompt by default', () => {
      const result = getCalendarUpgradePrompt();

      expect(result.message).toContain('7일만 보이나요?');
      expect(result.message).toContain('프리미엄으로 업그레이드');
      expect(result.cta).toBe('지금 업그레이드');
    });

    it('should return Korean prompt for ko locale', () => {
      const result = getCalendarUpgradePrompt('ko');

      expect(result.message).toContain('1년 운세 캘린더');
      expect(result.cta).toBe('지금 업그레이드');
    });

    it('should return English prompt for en locale', () => {
      const result = getCalendarUpgradePrompt('en');

      expect(result.message).toContain('See only 7 days?');
      expect(result.message).toContain('Upgrade to Premium');
      expect(result.cta).toBe('Upgrade Now');
    });
  });
});
