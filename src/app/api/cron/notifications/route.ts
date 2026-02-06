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

import { NextRequest, NextResponse } from 'next/server'
import { sendScheduledNotifications } from '@/lib/notifications/pushService'
import { logger } from '@/lib/logger'
import { cronNotificationsTriggerSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Vercel Pro: 최대 60초

/**
 * GET /api/cron/notifications
 * Vercel Cron 또는 외부 스케줄러에서 호출
 */
export async function GET(request: NextRequest) {
  // Vercel Cron 인증
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'CRON_SECRET not configured',
      route: 'cron/notifications',
    })
  }

  // Vercel Cron은 CRON_SECRET 헤더를 자동으로 추가
  // Use timing-safe comparison to prevent timing attacks
  const providedToken = authHeader?.replace('Bearer ', '').trim() ?? ''
  if (!timingSafeCompare(providedToken, cronSecret)) {
    return createErrorResponse({
      code: ErrorCodes.UNAUTHORIZED,
      locale: extractLocale(request),
      route: 'cron/notifications',
    })
  }

  try {
    // 현재 시간 (KST 기준)
    const now = new Date()
    const kstOffset = 9 * 60 // UTC+9
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000)
    const currentHour = kstTime.getUTCHours()

    logger.warn(`[Cron] Running notification job at KST hour: ${currentHour}`)

    const result = await sendScheduledNotifications(currentHour)

    logger.warn(`[Cron] Notification job completed:`, result)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      hour: currentHour,
      ...result,
    })
  } catch (error: unknown) {
    logger.error('[Cron] Notification job failed:', error)

    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'cron/notifications',
      originalError: error instanceof Error ? error : new Error(String(error)),
    })
  }
}

/**
 * POST /api/cron/notifications
 * 수동 트리거 (관리자용)
 */
export async function POST(request: NextRequest) {
  // 관리자 인증 (간단한 API 키 방식)
  const authHeader = request.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET

  // Use timing-safe comparison to prevent timing attacks
  const providedAdminToken = authHeader?.replace('Bearer ', '').trim() ?? ''
  if (!adminSecret || !timingSafeCompare(providedAdminToken, adminSecret)) {
    return createErrorResponse({
      code: ErrorCodes.UNAUTHORIZED,
      locale: extractLocale(request),
      route: 'cron/notifications',
    })
  }

  try {
    const rawBody = await request.json().catch(() => ({}))
    const validationResult = cronNotificationsTriggerSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[cron/notifications] validation failed', {
        errors: validationResult.error.issues,
      })
      return createValidationErrorResponse(validationResult.error, {
        locale: extractLocale(request),
        route: 'cron/notifications',
      })
    }
    const hour = validationResult.data.hour ?? new Date().getHours()

    logger.warn(`[Manual] Running notification job for hour: ${hour}`)

    const result = await sendScheduledNotifications(hour)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      hour,
      ...result,
    })
  } catch (error: unknown) {
    logger.error('[Manual] Notification job failed:', error)

    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'cron/notifications',
      originalError: error instanceof Error ? error : new Error(String(error)),
    })
  }
}
