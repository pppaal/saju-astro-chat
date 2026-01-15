/**
 * Push Notification Service
 * 푸시 알림 발송 서비스 - web-push 사용
 */

import webpush from 'web-push';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';
import {
  generateDailyNotifications,
  getNotificationsForHour,
  type DailyNotification,
} from './dailyTransitNotifications';
import {
  generatePremiumNotifications,
  checkActivePromotions,
  type CreditStatus,
} from './premiumNotifications';
import { getUserCredits, getCreditBalance } from '@/lib/credits/creditService';

// Types for persona memory JSON fields (matches SajuData/AstrologyData in dailyTransitNotifications)
interface SajuProfileData {
  dayMaster?: string;
  pillars?: {
    year?: { heavenlyStem?: string; earthlyBranch?: string };
    month?: { heavenlyStem?: string; earthlyBranch?: string };
    day?: { heavenlyStem?: string; earthlyBranch?: string };
    hour?: { heavenlyStem?: string; earthlyBranch?: string };
  };
  unse?: {
    iljin?: unknown;
    monthly?: unknown;
    yearly?: unknown;
  };
}

interface BirthChartData {
  transits?: unknown[];
  planets?: unknown[];
}

// Type guard for web-push errors
interface WebPushError extends Error {
  statusCode?: number;
}

function isWebPushError(error: unknown): error is WebPushError {
  return error instanceof Error && 'statusCode' in error;
}

// VAPID 설정 초기화
let vapidConfigured = false;

function initializeVapid() {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@destinypal.me';

  if (!publicKey || !privateKey) {
    logger.warn('[pushService] VAPID keys not configured');
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (error) {
    logger.error('[pushService] Failed to set VAPID details:', error);
    return false;
  }
}

export interface PushPayload {
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    [key: string]: unknown;
  };
  requireInteraction?: boolean;
}

/**
 * 단일 사용자에게 푸시 알림 발송
 */
export async function sendPushNotification(
  userId: string,
  payload: PushPayload | DailyNotification
): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
  if (!initializeVapid()) {
    return { success: false, sent: 0, failed: 0, error: 'VAPID not configured' };
  }

  // 사용자의 활성화된 구독 조회
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, isActive: true },
  });

  if (subscriptions.length === 0) {
    return { success: false, sent: 0, failed: 0, error: 'No active subscriptions' };
  }

  // DailyNotification을 PushPayload로 변환
  const pushPayload: PushPayload =
    'type' in payload
      ? {
          title: payload.title,
          message: payload.message,
          icon: '/icon-192.png',
          badge: '/badge-72.png',
          tag: payload.type,
          data: payload.data || { url: '/notifications' },
        }
      : payload;

  const payloadString = JSON.stringify({
    title: pushPayload.title,
    message: pushPayload.message,
    icon: pushPayload.icon || '/icon-192.png',
    badge: pushPayload.badge || '/badge-72.png',
    tag: pushPayload.tag || 'destinypal',
    data: pushPayload.data || { url: '/notifications' },
    requireInteraction: pushPayload.requireInteraction || false,
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payloadString
      );

      // 성공: 마지막 사용 시간 업데이트, 실패 카운트 리셋
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date(), failCount: 0 },
      });

      sent++;
    } catch (error: unknown) {
      logger.error(`[pushService] Failed to send to ${sub.id}:`, error instanceof Error ? error.message : String(error));

      // 410 Gone 또는 404: 구독이 만료/삭제됨
      if (isWebPushError(error) && (error.statusCode === 404 || error.statusCode === 410)) {
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { isActive: false },
        });
      } else {
        // 기타 에러: 실패 카운트 증가
        const newFailCount = sub.failCount + 1;
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: {
            failCount: newFailCount,
            // 5번 이상 실패하면 비활성화
            isActive: newFailCount < 5,
          },
        });
      }

      failed++;
    }
  }

  return { success: sent > 0, sent, failed };
}

/**
 * 특정 시간대의 모든 알림 발송 (스케줄러용)
 */
export async function sendScheduledNotifications(hour: number): Promise<{
  total: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  if (!initializeVapid()) {
    return { total: 0, sent: 0, failed: 0, errors: ['VAPID not configured'] };
  }

  // 활성 푸시 구독이 있는 사용자 조회
  const users = await prisma.user.findMany({
    where: {
      birthDate: { not: null },
      pushSubscriptions: { some: { isActive: true } },
    },
    select: {
      id: true,
      name: true,
      birthDate: true,
      birthTime: true,
      personaMemory: {
        select: {
          sajuProfile: true,
          birthChart: true,
        },
      },
      credits: {
        select: {
          plan: true,
          monthlyCredits: true,
          usedCredits: true,
          bonusCredits: true,
        },
      },
      subscriptions: {
        where: {
          status: 'active',
        },
        select: {
          id: true,
        },
      },
    },
    take: 1000, // 배치 크기 제한
  });

  let totalSent = 0;
  let totalFailed = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      const sajuProfile = (user.personaMemory?.sajuProfile as SajuProfileData) || {};
      const birthChart = (user.personaMemory?.birthChart as BirthChartData) || {};

      // 운세 알림 생성
      const fortuneNotifications = generateDailyNotifications(
        {
          dayMaster: sajuProfile.dayMaster,
          pillars: sajuProfile.pillars,
          unse: sajuProfile.unse,
        },
        {
          transits: birthChart.transits,
          planets: birthChart.planets,
        },
        {
          birthDate: user.birthDate!,
          birthTime: user.birthTime || undefined,
          name: user.name || undefined,
        }
      );

      // 프리미엄 알림 생성 (크레딧 부족, 프리미엄 기능 안내)
      let premiumNotifications: DailyNotification[] = [];
      if (user.credits) {
        const creditStatus: CreditStatus = {
          plan: user.credits.plan,
          remaining: user.credits.monthlyCredits - user.credits.usedCredits + user.credits.bonusCredits,
          total: user.credits.monthlyCredits + user.credits.bonusCredits,
          bonusCredits: user.credits.bonusCredits,
          percentUsed: ((user.credits.usedCredits / user.credits.monthlyCredits) * 100) || 0,
        };

        const hasActiveSubscription = user.subscriptions.length > 0;

        premiumNotifications = generatePremiumNotifications({
          creditStatus,
          hasActiveSubscription,
          userName: user.name || undefined,
        });
      }

      // 프로모션 알림 체크 (특정 시간에만)
      if (hour === 19) {
        const promotionNotification = await checkActivePromotions();
        if (promotionNotification) {
          premiumNotifications.push(promotionNotification);
        }
      }

      // 모든 알림 합치기
      const allNotifications = [...fortuneNotifications, ...premiumNotifications];

      // 해당 시간의 알림만 필터링
      const hourlyNotifications = getNotificationsForHour(allNotifications, hour);

      for (const notification of hourlyNotifications) {
        const result = await sendPushNotification(user.id, notification);
        totalSent += result.sent;
        totalFailed += result.failed;
      }
    } catch (error: unknown) {
      logger.error(`[pushService] Error for user ${user.id}:`, error instanceof Error ? error.message : String(error));
      errors.push(`User ${user.id}: ${error instanceof Error ? error.message : String(error)}`);
      totalFailed++;
    }
  }

  return {
    total: users.length,
    sent: totalSent,
    failed: totalFailed,
    errors,
  };
}

/**
 * 모든 활성 사용자에게 브로드캐스트 알림
 */
export async function sendBroadcastNotification(
  payload: PushPayload
): Promise<{ totalUsers: number; sent: number; failed: number }> {
  if (!initializeVapid()) {
    return { totalUsers: 0, sent: 0, failed: 0 };
  }

  // 활성 구독이 있는 모든 사용자 ID 조회
  const userIds = await prisma.pushSubscription.findMany({
    where: { isActive: true },
    select: { userId: true },
    distinct: ['userId'],
  });

  let totalSent = 0;
  let totalFailed = 0;

  for (const { userId } of userIds) {
    const result = await sendPushNotification(userId, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return {
    totalUsers: userIds.length,
    sent: totalSent,
    failed: totalFailed,
  };
}

/**
 * 푸시 구독 저장
 */
export async function savePushSubscription(
  userId: string,
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  userAgent?: string
): Promise<void> {
  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
      isActive: true,
      failCount: 0,
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
      isActive: true,
    },
  });
}

/**
 * 푸시 구독 제거 (비활성화)
 */
export async function removePushSubscription(endpoint: string): Promise<void> {
  await prisma.pushSubscription.updateMany({
    where: { endpoint },
    data: { isActive: false },
  });
}

/**
 * 특정 사용자의 오늘 알림 미리보기
 */
export async function previewUserNotifications(
  userId: string
): Promise<DailyNotification[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      birthDate: true,
      birthTime: true,
      name: true,
    },
  });

  if (!user?.birthDate) {
    return [];
  }

  const memory = await prisma.personaMemory.findUnique({
    where: { userId },
  });

  const sajuProfile = (memory?.sajuProfile as SajuProfileData) || {};
  const birthChart = (memory?.birthChart as BirthChartData) || {};

  return generateDailyNotifications(
    {
      dayMaster: sajuProfile.dayMaster,
      pillars: sajuProfile.pillars,
      unse: sajuProfile.unse,
    },
    {
      transits: birthChart.transits,
      planets: birthChart.planets,
    },
    {
      birthDate: user.birthDate,
      birthTime: user.birthTime || undefined,
      name: user.name || undefined,
    }
  );
}

/**
 * 알림 테스트 발송
 */
export async function sendTestNotification(
  userId: string
): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
  return sendPushNotification(userId, {
    title: '테스트 알림',
    message: '푸시 알림이 정상적으로 작동합니다!',
    icon: '/icon-192.png',
    tag: 'test',
    data: { url: '/profile' },
  });
}
