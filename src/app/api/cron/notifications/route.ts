/**
 * Cron Job for Push Notifications
 * 매 시간 실행되어 예약된 알림을 발송합니다.
 *
 * Vercel Cron: vercel.json에 다음 추가
 * {
 *   "crons": [{
 *     "path": "/api/cron/notifications",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { sendScheduledNotifications } from "@/lib/notifications/pushService";
import { logger } from '@/lib/logger';

import { parseRequestBody } from '@/lib/api/requestParser';
import { HTTP_STATUS } from '@/lib/constants/http';
export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Pro: 최대 60초

/**
 * GET /api/cron/notifications
 * Vercel Cron 또는 외부 스케줄러에서 호출
 */
export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: HTTP_STATUS.SERVER_ERROR });
  }

  // Vercel Cron은 CRON_SECRET 헤더를 자동으로 추가
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  try {
    // 현재 시간 (KST 기준)
    const now = new Date();
    const kstOffset = 9 * 60; // UTC+9
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
    const currentHour = kstTime.getUTCHours();

    logger.warn(`[Cron] Running notification job at KST hour: ${currentHour}`);

    const result = await sendScheduledNotifications(currentHour);

    logger.warn(`[Cron] Notification job completed:`, result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      hour: currentHour,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("[Cron] Notification job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}

/**
 * POST /api/cron/notifications
 * 수동 트리거 (관리자용)
 */
export async function POST(request: NextRequest) {
  // 관리자 인증 (간단한 API 키 방식)
  const authHeader = request.headers.get("authorization");
  const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const hour = body.hour ?? new Date().getHours();

    logger.warn(`[Manual] Running notification job for hour: ${hour}`);

    const result = await sendScheduledNotifications(hour);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      hour,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error("[Manual] Notification job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
