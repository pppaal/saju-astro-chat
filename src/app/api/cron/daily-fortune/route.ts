/**
 * /api/cron/daily-fortune — "매일 아침 오늘의 운세 한 줄" 웹 푸시 발송.
 *
 * 보안은 다른 cron 과 동일(withCronAuth): IP 레이트리밋(5/min) → timing-safe
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
import { withCronAuth } from '@/lib/api/middleware/cronGuard'
import { getWebPush } from '@/lib/push/webPush'
import { buildDailyFortuneMessage } from '@/lib/push/dailyFortuneMessage'
import { getNowInTimezone } from '@/lib/datetime/timezone'
import { resolveViewerTimezone } from '@/lib/datetime/resolveTimezone'

export const dynamic = 'force-dynamic'

// 동시 발송 폭 — 푸시 서비스에 한 번에 보내는 요청 수 (p-limit 스타일의
// 단순 배치: BATCH_SIZE 개를 Promise.all 로 보내고 다음 배치로 진행).
const BATCH_SIZE = 10
// 연속 실패 임계 — 이 이상이면 죽은 구독으로 보고 정리.
const MAX_FAIL_COUNT = 5
// 푸시 TTL — 아침 알림이라 12시간 지나면 의미 없음.
const PUSH_TTL_SECONDS = 12 * 60 * 60

async function handle(request: Request): Promise<NextResponse> {
  try {
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

    const subscriptions = await prisma.pushSubscription.findMany({
      select: {
        id: true,
        endpoint: true,
        p256dh: true,
        auth: true,
        locale: true,
        failCount: true,
        user: { select: { profile: { select: { birthDate: true, tzId: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const now = new Date()
    const sentIds: string[] = []
    const pruneIds: string[] = []
    const failIncrementIds: string[] = []
    let failedCount = 0

    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      const batch = subscriptions.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(async (sub) => {
          const locale = sub.locale === 'en' ? 'en' : 'ko'
          // 발송 당일 = *수신자 타임존*의 오늘 날짜. cron 은 22:00 UTC(= KST 아침
          // 07:00)에 돌므로 `now`(UTC 달력)를 그대로 주면 어제 일진으로 작성돼
          // 웹 캘린더(getNowInTimezone 기준)와 다른 날을 설명한다(감사 #4).
          // keyday 푸시(keyDay.ts)와 같은 기준으로 정렬.
          // 수신자 기기 tz 는 저장돼 있지 않다 — 보는 사람 resolver 가 출생 tz(profile.tzId)
          // → 사주 기준 존 순으로 고른다.
          const tz = resolveViewerTimezone(
            { birth: { timezone: sub.user?.profile?.tzId } },
            { context: 'cron/daily-fortune' }
          )
          const t = getNowInTimezone(tz)
          const message = buildDailyFortuneMessage({
            birthDate: sub.user?.profile?.birthDate ?? null,
            date: new Date(Date.UTC(t.year, t.month - 1, t.day)),
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

export const GET = withCronAuth('daily-fortune', handle)
// 일부 cron 서비스는 POST 만 지원.
export const POST = GET
