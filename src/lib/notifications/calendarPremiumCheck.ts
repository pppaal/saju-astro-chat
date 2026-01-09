/**
 * Destiny Calendar Premium Check Service
 * 운세 캘린더 프리미엄 기능 체크 및 알림 생성
 */

import { DailyNotification } from './dailyTransitNotifications';
import { generateCalendarPremiumNotification } from './premiumNotifications';

export interface CalendarAccessInfo {
  hasAccess: boolean;
  plan: string;
  reason?: 'free_plan' | 'no_subscription' | 'expired_subscription';
}

/**
 * 운세 캘린더 접근 권한 체크
 */
export function checkCalendarAccess(
  plan: string,
  hasActiveSubscription: boolean
): CalendarAccessInfo {
  // Free 플랜은 운세 캘린더 제한적 접근
  if (plan === 'free' || !hasActiveSubscription) {
    return {
      hasAccess: false,
      plan,
      reason: plan === 'free' ? 'free_plan' : 'no_subscription',
    };
  }

  // Starter 이상은 접근 가능
  return {
    hasAccess: true,
    plan,
  };
}

/**
 * Free 사용자가 운세 캘린더를 보려고 할 때 프리미엄 안내 알림 생성
 */
export function generateCalendarAccessNotification(
  accessInfo: CalendarAccessInfo,
  userName: string = '회원',
  locale: string = 'ko'
): DailyNotification | null {
  if (accessInfo.hasAccess) {
    return null;
  }

  return generateCalendarPremiumNotification(userName, locale);
}

/**
 * 운세 캘린더 프리미엄 기능 안내 메시지
 */
export function getCalendarPremiumMessage(
  locale: string = 'ko'
): { title: string; description: string; features: string[] } {
  if (locale === 'en') {
    return {
      title: 'Premium Destiny Calendar',
      description: 'Unlock your year-long destiny calendar and plan your important events wisely.',
      features: [
        '365-day fortune analysis',
        'Best dates for weddings, contracts, and travel',
        'Daily lucky times and caution periods',
        'Personalized recommendations based on Saju and Astrology',
        'Save and export your important dates',
      ],
    };
  }

  return {
    title: '프리미엄 운세 캘린더',
    description: '1년 운세 캘린더를 열어보고 중요한 일정을 현명하게 계획하세요.',
    features: [
      '365일 운세 분석',
      '결혼식, 계약, 여행 최적 날짜 추천',
      '매일의 행운 시간과 주의 시간',
      '사주와 점성술 기반 개인 맞춤 추천',
      '중요한 날짜 저장 및 내보내기',
    ],
  };
}

/**
 * Free 플랜에서 볼 수 있는 운세 캘린더 날짜 수 (미리보기)
 */
export const FREE_CALENDAR_PREVIEW_DAYS = 7;

/**
 * Free 플랜 사용자에게 보여줄 캘린더 데이터 필터링
 */
export function filterCalendarDataForFree<T extends { date: string }>(
  allDates: T[],
  startDate?: Date
): T[] {
  const start = startDate || new Date();
  const previewDates = allDates
    .filter(d => {
      const dateObj = new Date(d.date);
      const diffDays = Math.floor((dateObj.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays < FREE_CALENDAR_PREVIEW_DAYS;
    })
    .slice(0, FREE_CALENDAR_PREVIEW_DAYS);

  return previewDates;
}

/**
 * 프리미엄 업그레이드 유도 문구 생성
 */
export function getCalendarUpgradePrompt(
  locale: string = 'ko'
): { message: string; cta: string } {
  if (locale === 'en') {
    return {
      message: 'See only 7 days? Upgrade to Premium and unlock your full year destiny calendar!',
      cta: 'Upgrade Now',
    };
  }

  return {
    message: '7일만 보이나요? 프리미엄으로 업그레이드하고 1년 운세 캘린더를 확인하세요!',
    cta: '지금 업그레이드',
  };
}
