/**
 * /api/cron/daily-fortune — "매일 아침 오늘의 운세 한 줄" 웹 푸시 발송.
 *
 * 보안은 reset-credits 와 동일: IP 레이트리밋(5/min) → timing-safe
 * CRON_SECRET 검증. VAPID 미설정이면 503 'not_configured' (throw 금지).
 *
 * 동작:
 *   1. 활성 PushSubscription 전체 조회 (+ 유저 생년월일 join)
 *   2. 구독별로 결정론 한 줄 생성 (LLM 없음 — dailyFortuneMessage)
 *   3. web-push 발송 — 10개씩 배치 동시 실행 (외부 p-limit 의존 없이)
 *   4. 410/404(구독 소멸) → 삭제, 기타 실패 → failCount++ (5 이상 삭제)
 *
 * 응답: { success, sent, pruned, failed }
 *
 * Vercel cron: vercel.json — 매일 22:00 UTC (= 한국 아침 07:00 KST).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { getWebPush } from '@/lib/push/webPush'
import { buildDailyFortuneMessage } from '@/lib/push/dailyFortuneMessage'
import { claimDailyOnce } from '@/lib/cron/dailyOnce'

export const dynamic = 'force-dynamic'

// 동시 발송 폭 — 푸시 서비스에 한 번에 보내는 요청 수 (p-limit 스타일의
// 단순 배치: BATCH_SIZE 개를 Promise.all 로 보내고 다음 배치로 진행).
const BATCH_SIZE = 10
// 연속 실패 임계 — 이 이상이면 죽은 구독으로 보고 정리.
const MAX_FAIL_COUNT = 5
// 푸시 TTL — 아침 알림이라 12시간 지나면 의미 없음.
const PUSH_TTL_SECONDS = 12 * 60 * 60

function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    logger.error('[Cron daily-fortune] CRON_SECRET not set - rejecting request')
    return false
  }

  return timingSafeCompare(authHeader ?? '', `Bearer ${cronSecret}`)
}

export async function GET(request: Request) {
  try {
    // 시크릿 brute-force 방지 — IP 당 분당 5회 (인증 전 단계라
    // withApiMiddleware 가드 미사용 라우트).
    const ip = getClientIp(request.headers)
    const rl = await rateLimit(`cron:daily-fortune:${ip}`, { limit: 5, windowSeconds: 60 })
    if (!rl.allowed) {
      return createErrorResponse({
        code: ErrorCodes.RATE_LIMITED,
        locale: extractLocale(request),
        route: 'cron/daily-fortune',
      })
    }

    if (!validateCronSecret(request)) {
      return createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale: extractLocale(request),
        route: 'cron/daily-fortune',
      })
    }

    const webpush = getWebPush()
    if (!webpush) {
      // VAPID env 미설정 — 기능 비활성. 빌드/기동은 깨지지 않고 cron 만 503.
      return createErrorResponse({
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        message: 'not_configured',
        locale: extractLocale(request),
        route: 'cron/daily-fortune',
      })
    }

    // 하루 1회 가드 — Vercel cron 과 GitHub Actions 스케줄러가 같은 날 둘 다
    // 때려도 발송은 한 번만. 첫 선점만 진행하고 이후 호출은 스킵.
    const now = new Date()
    if (!(await claimDailyOnce('daily-fortune', now))) {
      logger.warn('[Cron daily-fortune] already sent today — skipping')
      return NextResponse.json({ success: true, skipped: 'already_sent_today', sent: 0 })
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      select: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
        locale: true,
        failCount: true,
        user: { select: { profile: { select: { birthDate: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    })
    const sentIds: string[] = []
    const pruneIds: string[] = []
    const failIncrementIds: string[] = []
    let failedCount = 0

    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      const batch = subscriptions.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(async (sub) => {
          const locale = sub.locale === 'en' ? 'en' : 'ko'
          const message = buildDailyFortuneMessage({
            birthDate: sub.user?.profile?.birthDate ?? null,
            date: now,
            locale,
          })
          const payload = JSON.stringify({
            title: message.title,
            body: message.body,
            url: '/calendar',
          })

          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              payload,
              { TTL: PUSH_TTL_SECONDS }
            )
            sentIds.push(sub.id)
          } catch (err) {
            const statusCode = (err as { statusCode?: number })?.statusCode
            if (statusCode === 404 || statusCode === 410) {
              // 구독 소멸 (브라우저가 endpoint 폐기) — 즉시 정리.
              pruneIds.push(sub.id)
            } else {
              failedCount += 1
              if (sub.failCount + 1 >= MAX_FAIL_COUNT) {
                pruneIds.push(sub.id)
              } else {
                failIncrementIds.push(sub.id)
              }
            }
          }
        })
      )
    }

    // DB 반영 — 루프 내 행 단위 쿼리 대신 결과별 일괄 쿼리 3개.
    if (sentIds.length > 0) {
      await prisma.pushSubscription.updateMany({
        where: { id: { in: sentIds } },
        data: { lastSentAt: now, failCount: 0 },
      })
    }
    if (failIncrementIds.length > 0) {
      await prisma.pushSubscription.updateMany({
        where: { id: { in: failIncrementIds } },
        data: { failCount: { increment: 1 } },
      })
    }
    if (pruneIds.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: pruneIds } } })
    }

    const summary = {
      sent: sentIds.length,
      pruned: pruneIds.length,
      failed: failedCount,
    }
    logger.warn('[Cron daily-fortune] completed', {
      ...summary,
      total: subscriptions.length,
    })

    return NextResponse.json({ success: true, ...summary })
  } catch (err: unknown) {
    logger.error('[Cron daily-fortune error]', err)
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'cron/daily-fortune',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}

// 일부 cron 서비스는 POST 만 지원.
export async function POST(request: Request) {
  return GET(request)
}
