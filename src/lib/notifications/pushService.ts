/**
 * Push Notification Service
 * 푸시 알림 발송 서비스 - web-push 사용
 */

import webpush from 'web-push'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import {
  generateDailyNotifications,
  getNotificationsForHour,
  type DailyNotification,
} from './dailyTransitNotifications'
import {
  generatePremiumNotifications,
  checkActivePromotions,
  type CreditStatus,
} from './premiumNotifications'
import { getUserCredits, getCreditBalance } from '@/lib/credits/creditService'

// Type guard for web-push errors
interface WebPushError extends Error {
  statusCode?: number
}

function isWebPushError(error: unknown): error is WebPushError {
  return error instanceof Error && 'statusCode' in error
}

// VAPID 설정 초기화
let vapidConfigured = false

function initializeVapid() {
  if (vapidConfigured) {
    return true
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@destinypal.me'

  if (!publicKey || !privateKey) {
    logger.warn('[pushService] VAPID keys not configured')
    return false
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidConfigured = true
    return true
  } catch (error) {
    logger.error('[pushService] Failed to set VAPID details:', error)
    return false
  }
}

export interface PushPayload {
  title: string
  message: string
  icon?: string
  badge?: string
  tag?: string
  data?: {
    url?: string
    [key: string]: unknown
  }
  requireInteraction?: boolean
}

// ------------------------------------------------------------------
// Per-(user, type, day, hour) idempotency for scheduled push fanout.
// Cron retries used to re-send the same daily-fortune to the same
// user; reuse the existing RequestIdempotencyLog table with a 25h TTL
// so a second invocation lands on a hit and exits early.
// ------------------------------------------------------------------

const PUSH_DEDUP_TTL_MS = 25 * 60 * 60 * 1000

function pushDedupKey(userId: string, type: string, hour: number): string {
  const today = new Date()
  // Use the UTC date as the namespace, not the local date — the cron
  // schedule lives in UTC, so a UTC day rollover and a local-tz day
  // rollover would disagree and the second send wouldn't dedup
  // against the first.
  const day = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(
    today.getUTCDate()
  ).padStart(2, '0')}`
  return `push:${userId}:${type}:${day}:${String(hour).padStart(2, '0')}`
}

/**
 * Atomic dedup claim — used as the **gate** before sending, not as a
 * post-send marker. Returns true if this invocation won the race (and
 * must send), false if another concurrent invocation already claimed
 * the slot (and we must skip).
 *
 * Implementation uses `create` so the unique constraint on `scopedKey`
 * is the serialization point. P2002 → loser path. Anything else is
 * treated as fail-closed (we return false) so that an unhealthy dedup
 * table can't trigger a thundering-herd of duplicate sends across cron
 * retries.
 *
 * Trade-off (intentional): once we claim the slot, the slot stays
 * claimed for 25h even if the actual `webpush.sendNotification` call
 * later fails. The next cron tick will NOT retry. Push notifications
 * are not critical infrastructure, and double-sending the same daily
 * fortune is a worse UX than occasionally missing one when the send
 * pipeline blips.
 */
async function claimPushSlot(userId: string, type: string, hour: number): Promise<boolean> {
  const scopedKey = pushDedupKey(userId, type, hour)
  const expiresAt = new Date(Date.now() + PUSH_DEDUP_TTL_MS)
  try {
    await prisma.requestIdempotencyLog.create({
      data: { scopedKey, expiresAt },
    })
    return true
  } catch (err) {
    const code = (err as { code?: string } | null)?.code
    if (code === 'P2002') {
      // Unique-constraint collision — another concurrent cron invocation
      // (Vercel regional retry, overlapping schedules) claimed this slot
      // first. We are the loser; skip without sending.
      return false
    }
    // If the existing row is stale (expired), refresh it and treat as
    // a fresh claim. Otherwise it's still live and someone else owns it.
    try {
      const existing = await prisma.requestIdempotencyLog.findUnique({
        where: { scopedKey },
        select: { expiresAt: true },
      })
      if (existing && existing.expiresAt > new Date()) {
        return false
      }
      await prisma.requestIdempotencyLog.update({
        where: { scopedKey },
        data: { expiresAt },
      })
      return true
    } catch (innerErr) {
      // Fail-closed: rather than risk a double-send when the dedup
      // table is unhealthy, skip this notification. Cron retries on a
      // healthy follow-up tick will succeed.
      logger.warn('[pushService] dedup claim failed, skipping send', {
        scopedKey,
        err: err instanceof Error ? err.message : String(err),
        innerErr: innerErr instanceof Error ? innerErr.message : String(innerErr),
      })
      return false
    }
  }
}

/**
 * 단일 사용자에게 푸시 알림 발송
 */
export async function sendPushNotification(
  userId: string,
  payload: PushPayload | DailyNotification
): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
  if (!initializeVapid()) {
    return { success: false, sent: 0, failed: 0, error: 'VAPID not configured' }
  }

  // 사용자의 활성화된 구독 조회
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, isActive: true },
  })

  if (subscriptions.length === 0) {
    return { success: false, sent: 0, failed: 0, error: 'No active subscriptions' }
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
      : payload

  const payloadString = JSON.stringify({
    title: pushPayload.title,
    message: pushPayload.message,
    icon: pushPayload.icon || '/icon-192.png',
    badge: pushPayload.badge || '/badge-72.png',
    tag: pushPayload.tag || 'destinypal',
    data: pushPayload.data || { url: '/notifications' },
    requireInteraction: pushPayload.requireInteraction || false,
  })

  let sent = 0
  let failed = 0

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
      )

      // 성공: 마지막 사용 시간 업데이트, 실패 카운트 리셋
      await prisma.pushSubscription.update({
        where: { id: sub.id },
        data: { lastUsedAt: new Date(), failCount: 0 },
      })

      sent++
    } catch (error: unknown) {
      logger.error(
        `[pushService] Failed to send to ${sub.id}:`,
        error instanceof Error ? error.message : String(error)
      )

      // 410 Gone 또는 404: 구독이 푸시 서비스 측에서 만료/삭제됨.
      // isActive=false 만 두면 행이 영구히 남아, 같은 endpoint 로 재구독
      // 시 (브라우저가 같은 endpoint 를 재발급한 경우) PushSubscription.
      // endpoint 의 unique 인덱스와 충돌해 신규 enroll 이 실패한다. 행을
      // 통째로 삭제해 다음 구독이 깨끗하게 들어오도록 한다. P2025
      // (record not found — 다른 요청이 먼저 지운 경우) 는 멱등으로 무시.
      if (isWebPushError(error) && (error.statusCode === 404 || error.statusCode === 410)) {
        try {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          })
        } catch (deleteErr) {
          const code = (deleteErr as { code?: string } | null)?.code
          if (code !== 'P2025') {
            logger.error(
              `[pushService] Failed to delete gone subscription ${sub.id}:`,
              deleteErr instanceof Error ? deleteErr.message : String(deleteErr)
            )
          }
        }
      } else {
        // 기타 에러: 실패 카운트 증가
        const newFailCount = sub.failCount + 1
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: {
            failCount: newFailCount,
            // 5번 이상 실패하면 비활성화
            isActive: newFailCount < 5,
          },
        })
      }

      failed++
    }
  }

  return { success: sent > 0, sent, failed }
}

/**
 * 특정 시간대의 모든 알림 발송 (스케줄러용)
 */
export async function sendScheduledNotifications(hour: number): Promise<{
  total: number
  sent: number
  failed: number
  errors: string[]
}> {
  if (!initializeVapid()) {
    return { total: 0, sent: 0, failed: 0, errors: ['VAPID not configured'] }
  }

  // 활성 푸시 구독이 있는 사용자 조회
  const users = await prisma.user.findMany({
    where: {
      profile: { birthDate: { not: null } },
      pushSubscriptions: { some: { isActive: true } },
    },
    select: {
      id: true,
      name: true,
      profile: {
        select: {
          birthDate: true,
          birthTime: true,
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
  })

  let totalSent = 0
  let totalFailed = 0
  const errors: string[] = []

  for (const user of users) {
    try {
      // 운세 알림 생성 — PersonaMemory에 캐싱하던 사주/차트 값은 더 이상
      // 저장하지 않는다. 알림은 birthDate 기반의 일반 운세만 발송.
      const fortuneNotifications = generateDailyNotifications(
        {},
        {},
        {
          birthDate: user.profile!.birthDate!,
          birthTime: user.profile?.birthTime || undefined,
          name: user.name || undefined,
        }
      )

      // 프리미엄 알림 생성 (크레딧 부족, 프리미엄 기능 안내)
      let premiumNotifications: DailyNotification[] = []
      if (user.credits) {
        const creditStatus: CreditStatus = {
          plan: user.credits.plan,
          remaining:
            user.credits.monthlyCredits - user.credits.usedCredits + user.credits.bonusCredits,
          total: user.credits.monthlyCredits + user.credits.bonusCredits,
          bonusCredits: user.credits.bonusCredits,
          percentUsed: (user.credits.usedCredits / user.credits.monthlyCredits) * 100 || 0,
        }

        const hasActiveSubscription = user.subscriptions.length > 0

        premiumNotifications = generatePremiumNotifications({
          creditStatus,
          hasActiveSubscription,
          userName: user.name || undefined,
        })
      }

      // 프로모션 알림 체크 (특정 시간에만)
      if (hour === 19) {
        const promotionNotification = await checkActivePromotions()
        if (promotionNotification) {
          premiumNotifications.push(promotionNotification)
        }
      }

      // 모든 알림 합치기
      const allNotifications = [...fortuneNotifications, ...premiumNotifications]

      // 해당 시간의 알림만 필터링
      const hourlyNotifications = getNotificationsForHour(allNotifications, hour)

      for (const notification of hourlyNotifications) {
        // Cron retries (Vercel network blip, redeploy race) used to land
        // here twice for the same (user, hour) and re-send the same daily
        // fortune. We now claim the dedup slot ATOMICALLY before sending:
        // the unique constraint on RequestIdempotencyLog.scopedKey is the
        // race winner, and the loser exits early. Marking-after-send was
        // not safe because (a) two overlapping invocations could both
        // pass the "already sent?" check before either marked, and (b)
        // the post-send mark was gated on `result.sent > 0`, so any
        // notification with zero successful endpoints would never get
        // marked and would re-fire on every retry.
        const claimed = await claimPushSlot(user.id, notification.type, hour)
        if (!claimed) {
          continue
        }
        const result = await sendPushNotification(user.id, notification)
        totalSent += result.sent
        totalFailed += result.failed
      }
    } catch (error: unknown) {
      logger.error(
        `[pushService] Error for user ${user.id}:`,
        error instanceof Error ? error.message : String(error)
      )
      errors.push(`User ${user.id}: ${error instanceof Error ? error.message : String(error)}`)
      totalFailed++
    }
  }

  return {
    total: users.length,
    sent: totalSent,
    failed: totalFailed,
    errors,
  }
}

/**
 * 모든 활성 사용자에게 브로드캐스트 알림
 */
export async function sendBroadcastNotification(
  payload: PushPayload
): Promise<{ totalUsers: number; sent: number; failed: number }> {
  if (!initializeVapid()) {
    return { totalUsers: 0, sent: 0, failed: 0 }
  }

  // 활성 구독이 있는 모든 사용자 ID 조회
  const userIds = await prisma.pushSubscription.findMany({
    where: { isActive: true },
    select: { userId: true },
    distinct: ['userId'],
  })

  let totalSent = 0
  let totalFailed = 0

  for (const { userId } of userIds) {
    const result = await sendPushNotification(userId, payload)
    totalSent += result.sent
    totalFailed += result.failed
  }

  return {
    totalUsers: userIds.length,
    sent: totalSent,
    failed: totalFailed,
  }
}

/**
 * 특정 사용자의 오늘 알림 미리보기
 */
export async function previewUserNotifications(userId: string): Promise<DailyNotification[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      profile: {
        select: {
          birthDate: true,
          birthTime: true,
        },
      },
    },
  })

  if (!user?.profile?.birthDate) {
    return []
  }

  return generateDailyNotifications(
    {},
    {},
    {
      birthDate: user.profile.birthDate,
      birthTime: user.profile.birthTime || undefined,
      name: user.name || undefined,
    }
  )
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
  })
}
