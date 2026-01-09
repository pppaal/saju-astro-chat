/**
 * Premium Feature Notifications Service
 * 크레딧, 프리미엄 기능, 프로모션 알림 생성
 */

import { DailyNotification, NotificationType } from './dailyTransitNotifications';

export interface CreditStatus {
  plan: string;
  remaining: number;
  total: number;
  bonusCredits: number;
  percentUsed: number;
}

export interface PremiumNotificationOptions {
  creditStatus?: CreditStatus;
  hasActiveSubscription?: boolean;
  lastNotificationDate?: Date;
  userName?: string;
  locale?: string;
}

/**
 * 크레딧 부족 알림 생성 (5개 미만일 때)
 */
export function generateCreditLowNotification(
  creditStatus: CreditStatus,
  userName: string = "회원",
  locale: string = "ko"
): DailyNotification | null {
  const { remaining, plan } = creditStatus;

  // 5개 미만일 때만 알림
  if (remaining >= 5) {
    return null;
  }

  // Free 플랜이면 더 강력한 메시지
  const isFree = plan === "free";

  const messages = {
    ko: {
      title: isFree
        ? `⚠️ 크레딧이 ${remaining}개 남았어요!`
        : `💎 크레딧이 ${remaining}개 남았어요`,
      message: isFree
        ? `크레딧이 부족해요. 프리미엄 플랜으로 업그레이드하고 더 많은 운세를 확인하세요!`
        : `크레딧이 ${remaining}개 남았어요. 추가 크레딧을 구매하거나 더 높은 플랜으로 업그레이드하세요.`,
    },
    en: {
      title: isFree
        ? `⚠️ Only ${remaining} credits left!`
        : `💎 ${remaining} credits remaining`,
      message: isFree
        ? `Running low on credits. Upgrade to Premium and get unlimited readings!`
        : `You have ${remaining} credits left. Buy more credits or upgrade your plan.`,
    },
  };

  const text = locale === "en" ? messages.en : messages.ko;

  return {
    type: "credit_low",
    title: text.title,
    message: text.message,
    emoji: isFree ? "⚠️" : "💎",
    scheduledHour: 20, // 저녁 8시에 알림
    confidence: 5,
    category: isFree ? "caution" : "neutral",
    data: {
      url: "/pricing",
    },
  };
}

/**
 * 크레딧 완전 소진 알림
 */
export function generateCreditDepletedNotification(
  userName: string = "회원",
  locale: string = "ko"
): DailyNotification {
  const messages = {
    ko: {
      title: "🚨 크레딧이 모두 소진되었어요!",
      message: `${userName}님, 이번 달 크레딧을 모두 사용하셨어요. 프리미엄으로 업그레이드하고 계속 이용하세요!`,
    },
    en: {
      title: "🚨 No credits remaining!",
      message: `${userName}, you've used all your credits this month. Upgrade to Premium to continue!`,
    },
  };

  const text = locale === "en" ? messages.en : messages.ko;

  return {
    type: "credit_depleted",
    title: text.title,
    message: text.message,
    emoji: "🚨",
    scheduledHour: 12, // 낮 12시
    confidence: 5,
    category: "caution",
    data: {
      url: "/pricing",
    },
  };
}

/**
 * 운세 캘린더 프리미엄 기능 안내 알림
 */
export function generateCalendarPremiumNotification(
  userName: string = "회원",
  locale: string = "ko"
): DailyNotification {
  const messages = {
    ko: {
      title: "📅 운세 캘린더 프리미엄 기능",
      message: `${userName}님, 1년 운세 캘린더로 중요한 날을 미리 확인하세요! 결혼식, 계약, 여행 날짜 선택에 도움이 됩니다.`,
    },
    en: {
      title: "📅 Premium Destiny Calendar",
      message: `${userName}, check your year-long destiny calendar! Perfect for planning weddings, contracts, and important events.`,
    },
  };

  const text = locale === "en" ? messages.en : messages.ko;

  return {
    type: "premium_feature",
    title: text.title,
    message: text.message,
    emoji: "📅",
    scheduledHour: 10, // 아침 10시
    confidence: 4,
    category: "positive",
    data: {
      url: "/destiny-map",
    },
  };
}

/**
 * 특별 할인 프로모션 알림
 */
export function generatePromotionNotification(
  promotionDetails: {
    title: string;
    discount: number; // 퍼센트
    endDate?: Date;
  },
  locale: string = "ko"
): DailyNotification {
  const { title, discount, endDate } = promotionDetails;

  const endDateStr = endDate
    ? locale === "ko"
      ? endDate.toLocaleDateString("ko-KR")
      : endDate.toLocaleDateString("en-US")
    : "";

  const messages = {
    ko: {
      title: `🎉 ${discount}% 특별 할인!`,
      message: endDateStr
        ? `${title} - ${discount}% 할인! ${endDateStr}까지 제한된 기회!`
        : `${title} - 지금 ${discount}% 할인된 가격으로 만나보세요!`,
    },
    en: {
      title: `🎉 ${discount}% Special Offer!`,
      message: endDateStr
        ? `${title} - ${discount}% off! Limited time until ${endDateStr}!`
        : `${title} - Get ${discount}% off now!`,
    },
  };

  const text = locale === "en" ? messages.en : messages.ko;

  return {
    type: "promotion",
    title: text.title,
    message: text.message,
    emoji: "🎉",
    scheduledHour: 19, // 저녁 7시
    confidence: 5,
    category: "positive",
    data: {
      url: "/pricing",
    },
  };
}

/**
 * 신규 기능 출시 알림
 */
export function generateNewFeatureNotification(
  featureDetails: {
    name: string;
    description: string;
    url?: string;
  },
  locale: string = "ko"
): DailyNotification {
  const { name, description, url } = featureDetails;

  const messages = {
    ko: {
      title: `✨ 새로운 기능: ${name}`,
      message: description,
    },
    en: {
      title: `✨ New Feature: ${name}`,
      message: description,
    },
  };

  const text = locale === "en" ? messages.en : messages.ko;

  return {
    type: "new_feature",
    title: text.title,
    message: text.message,
    emoji: "✨",
    scheduledHour: 11, // 오전 11시
    confidence: 4,
    category: "positive",
    data: {
      url: url || "/",
    },
  };
}

/**
 * 사용자 크레딧 상태를 체크하고 적절한 알림 생성
 */
export function generatePremiumNotifications(
  options: PremiumNotificationOptions
): DailyNotification[] {
  const notifications: DailyNotification[] = [];
  const {
    creditStatus,
    hasActiveSubscription,
    userName = "회원",
    locale = "ko",
  } = options;

  // 1. 크레딧 상태 체크
  if (creditStatus) {
    const { remaining } = creditStatus;

    // 크레딧 완전 소진
    if (remaining === 0) {
      notifications.push(generateCreditDepletedNotification(userName, locale));
    }
    // 크레딧 부족 (5개 미만)
    else if (remaining < 5) {
      const notification = generateCreditLowNotification(creditStatus, userName, locale);
      if (notification) {
        notifications.push(notification);
      }
    }
  }

  // 2. Free 플랜 사용자에게 프리미엄 기능 안내 (구독이 없는 경우)
  if (!hasActiveSubscription && creditStatus?.plan === "free") {
    // 주 1회만 알림 (매주 토요일)
    const today = new Date().getDay();
    if (today === 6) { // 토요일
      notifications.push(generateCalendarPremiumNotification(userName, locale));
    }
  }

  return notifications;
}

/**
 * 프로모션이 활성화되어 있는지 체크하고 알림 생성
 * (환경 변수나 DB에서 프로모션 정보를 가져올 수 있음)
 */
export async function checkActivePromotions(
  locale: string = "ko"
): Promise<DailyNotification | null> {
  // 여기서는 예시로 하드코딩, 실제로는 DB나 환경변수에서 가져와야 함
  const ACTIVE_PROMOTION = process.env.ACTIVE_PROMOTION;

  if (!ACTIVE_PROMOTION) {
    return null;
  }

  try {
    const promotion = JSON.parse(ACTIVE_PROMOTION);
    return generatePromotionNotification(promotion, locale);
  } catch (error) {
    console.error("Failed to parse promotion:", error);
    return null;
  }
}

/**
 * 마지막 알림 이후 시간 체크 (스팸 방지)
 */
export function shouldSendNotification(
  lastNotificationDate?: Date,
  cooldownHours: number = 24
): boolean {
  if (!lastNotificationDate) {
    return true;
  }

  const now = new Date();
  const diffMs = now.getTime() - lastNotificationDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours >= cooldownHours;
}
