// src/app/api/admin/push/route.ts
//
// 푸시 진단 + 자가 테스트 — "알림이 안 와요"를 추측 없이 한 번에 좁힌다.
//   GET  : VAPID 설정·CRON_SECRET·구독 수·내 구독 상태를 한눈에.
//   POST : 현재 어드민 본인 구독으로 테스트 푸시 즉시 발송.
// 셋(설정/구독/크론) 중 어디가 끊겼는지 바로 보인다.

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAdminGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { getWebPush } from '@/lib/push/webPush'
import { sendPushToTargets } from '@/lib/push/sender'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const userId = context.userId
    const [total, active, mine] = await Promise.all([
      prisma.pushSubscription.count(),
      prisma.pushSubscription.count({ where: { failCount: { lt: 5 } } }),
      userId
        ? prisma.pushSubscription.findMany({
            where: { userId },
            select: { id: true, locale: true, lastSentAt: true, failCount: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ])

    return apiSuccess({
      vapidConfigured: getWebPush() !== null,
      cronSecretSet: Boolean(process.env.CRON_SECRET),
      subscriptions: { total, active },
      mine,
    })
  },
  createAdminGuard({ route: 'admin/push/diagnostics' })
)

export const POST = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const userId = context.userId
    if (!userId) return apiError(ErrorCodes.UNAUTHORIZED, 'no_user')

    if (getWebPush() === null) {
      return apiError(ErrorCodes.SERVICE_UNAVAILABLE, 'vapid_not_configured')
    }

    const subs = await prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true, failCount: true, locale: true },
    })
    if (subs.length === 0) {
      return apiError(ErrorCodes.NOT_FOUND, 'no_subscription')
    }

    const summary = await sendPushToTargets(
      subs,
      (t) => {
        const ko = subs.find((s) => s.id === t.id)?.locale !== 'en'
        return {
          title: ko ? 'DestinyPal 테스트 알림' : 'DestinyPal test',
          body: ko
            ? '이 알림이 보이면 푸시가 정상 동작합니다 ✓'
            : 'If you see this, push is working ✓',
          url: '/calendar',
          tag: 'test',
        }
      },
      { ttlSeconds: 600, label: 'admin-test' }
    )

    return apiSuccess({ summary })
  },
  createAdminGuard({ route: 'admin/push/test' })
)
