/**
 * Push Notification Service
 * 푸시 알림 발송 서비스
 */

import { prisma } from "@/lib/db/prisma";
import {
  generateDailyNotifications,
  getNotificationsForHour,
  type DailyNotification,
} from "./dailyTransitNotifications";

// web-push 타입
interface WebPushPayload {
  title: string;
  message: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * web-push 모듈 동적 로드
 */
async function getWebPush() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@destinypal.com";

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[push] VAPID keys not configured; push notifications are disabled");
    return null;
  }

  try {
    // @ts-ignore - web-push is an optional dependency
    const webpush = (await import("web-push")).default;
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    return webpush;
  } catch (error) {
    console.warn("[push] web-push module missing; push disabled", error);
    return null;
  }
}

/**
 * 단일 사용자에게 푸시 알림 발송
 */
export async function sendPushNotification(
  userId: string,
  notification: DailyNotification
): Promise<{ success: boolean; error?: string }> {
  try {
    const webpush = await getWebPush();
    if (!webpush) {
      return { success: false, error: "Web push is not configured" };
    }

    // 사용자 푸시 구독 정보 조회
    const subscription = await prisma.pushSubscription.findUnique({
      where: { userId },
    });

    if (!subscription || !subscription.enabled) {
      return { success: false, error: "No active subscription" };
    }

    const pushSubscription: PushSubscriptionData = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    const payload: WebPushPayload = {
      title: notification.title,
      message: notification.message,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: notification.type,
      data: {
        url: notification.data?.url || "/destiny-map",
        type: notification.type,
        ...notification.data,
      },
      requireInteraction: notification.category === "positive",
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    );

    // 발송 기록 저장
    await prisma.scheduledNotification.create({
      data: {
        userId,
        scheduledFor: new Date(),
        sentAt: new Date(),
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data as any,
        status: "sent",
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error(`Push notification failed for user ${userId}:`, error);

    // 구독이 만료되었거나 무효한 경우 삭제
    if (error.statusCode === 410 || error.statusCode === 404) {
      await prisma.pushSubscription.delete({
        where: { userId },
      }).catch(() => {});
    }

    return { success: false, error: error.message };
  }
}

/**
 * 특정 시간대의 모든 알림 발송 (스케줄러용)
 */
export async function sendScheduledNotifications(
  hour: number
): Promise<{
  total: number;
  sent: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    total: 0,
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // 푸시 구독이 활성화된 사용자들 조회
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        enabled: true,
        dailyFortune: true,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            birthDate: true,
            birthTime: true,
          },
        },
      },
    });

    results.total = subscriptions.length;

    for (const sub of subscriptions) {
      if (!sub.user.birthDate) continue;

      try {
        // 사용자의 사주 데이터 조회 (PersonaMemory에서)
        const memory = await prisma.personaMemory.findUnique({
          where: { userId: sub.userId },
        });

        const sajuProfile = memory?.sajuProfile as any || {};
        const birthChart = memory?.birthChart as any || {};

        // 알림 생성
        const notifications = generateDailyNotifications(
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
            birthDate: sub.user.birthDate || "",
            birthTime: sub.user.birthTime || undefined,
            name: sub.user.name || undefined,
          }
        );

        // 현재 시간대의 알림만 필터링
        const hourNotifications = getNotificationsForHour(notifications, hour);

        for (const notif of hourNotifications) {
          const result = await sendPushNotification(sub.userId, notif);
          if (result.success) {
            results.sent++;
          } else {
            results.failed++;
            if (result.error) {
              results.errors.push(`${sub.userId}: ${result.error}`);
            }
          }
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${sub.userId}: ${error.message}`);
      }
    }

    return results;
  } catch (error: any) {
    console.error("Failed to send scheduled notifications:", error);
    throw error;
  }
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

  const sajuProfile = memory?.sajuProfile as any || {};
  const birthChart = memory?.birthChart as any || {};

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
): Promise<{ success: boolean; error?: string }> {
  const testNotification: DailyNotification = {
    type: "daily_fortune",
    title: "🔔 테스트 알림",
    message: "푸시 알림이 정상적으로 작동합니다!",
    emoji: "🔔",
    scheduledHour: new Date().getHours(),
    confidence: 5,
    category: "positive",
    data: {
      url: "/settings",
    },
  };

  return sendPushNotification(userId, testNotification);
}
