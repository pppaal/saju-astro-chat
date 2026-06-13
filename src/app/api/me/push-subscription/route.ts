/**
 * /api/me/push-subscription — 웹 푸시 구독 등록/해제.
 *
 * POST   — 브라우저 PushSubscription(endpoint + p256dh/auth) 저장.
 *          endpoint 기준 upsert (브라우저가 키를 갱신해도 1행 유지,
 *          기기 주인이 바뀌면 userId 도 갈아탄다). failCount 리셋.
 * DELETE — body 의 endpoint 로 본인 구독만 삭제.
 *
 * 발송은 /api/cron/daily-fortune (매일 아침 오늘의 운세 한 줄).
 */

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { pushSubscriptionUpsertSchema, pushSubscriptionDeleteSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON')
    }

    const parsed = pushSubscriptionUpsertSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid push subscription payload')
    }

    const { endpoint, keys, locale } = parsed.data
    const userId = context.userId!

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        locale,
      },
      update: {
        userId,
        p256dh: keys.p256dh,
        auth: keys.auth,
        locale,
        failCount: 0,
      },
      select: { id: true, locale: true, createdAt: true },
    })

    logger.info('[push-subscription] upserted', { userId, subscriptionId: subscription.id })
    return apiSuccess({ subscribed: true, locale: subscription.locale })
  },
  createAuthenticatedGuard({
    route: '/api/me/push-subscription',
    limit: 20,
    windowSeconds: 60,
  })
)

export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON')
    }

    const parsed = pushSubscriptionDeleteSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid unsubscribe payload')
    }

    const userId = context.userId!
    // 본인 것만 삭제 — endpoint 가 타인 소유면 count 0 (정보 노출 없음).
    const result = await prisma.pushSubscription.deleteMany({
      where: { endpoint: parsed.data.endpoint, userId },
    })

    logger.info('[push-subscription] deleted', { userId, count: result.count })
    return apiSuccess({ unsubscribed: result.count > 0 })
  },
  createAuthenticatedGuard({
    route: '/api/me/push-subscription',
    limit: 20,
    windowSeconds: 60,
  })
)
