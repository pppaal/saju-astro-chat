/**
 * Push Notification Service
 * 푸시 알림 발송 서비스
 * TODO: PushSubscription 모델이 Prisma 스키마에 추가되면 전체 구현 활성화
 */

import { prisma } from "@/lib/db/prisma";
import {
  generateDailyNotifications,
  getNotificationsForHour,
  type DailyNotification,
} from "./dailyTransitNotifications";

/**
 * 단일 사용자에게 푸시 알림 발송
 */
export async function sendPushNotification(
  userId: string,
  notification: DailyNotification
): Promise<{ success: boolean; error?: string }> {
  // PushSubscription 모델이 아직 구현되지 않음
  void userId;
  void notification;
  return { success: false, error: "Push subscription not implemented yet" };
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
  void hour;
  // PushSubscription 모델이 아직 구현되지 않음
  return {
    total: 0,
    sent: 0,
    failed: 0,
    errors: ["Push subscription not implemented yet"],
  };
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

  const sajuProfile = (memory?.sajuProfile as any) || {};
  const birthChart = (memory?.birthChart as any) || {};

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
