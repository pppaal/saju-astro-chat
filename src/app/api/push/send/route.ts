import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { sendPushNotification, sendTestNotification } from '@/lib/notifications/pushService'
import { logger } from '@/lib/logger'
import { pushSendRequestSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

export const POST = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    try {
      const rawBody = await request.json()

      const validationResult = pushSendRequestSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[push/send] validation failed', { errors: validationResult.error.issues })
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
        )
      }

      const { targetUserId, title, message, icon, url, tag, test } = validationResult.data

      // 테스트 알림 발송
      if (test) {
        const result = await sendTestNotification(context.userId!)
        return apiSuccess({
          success: result.success,
          sent: result.sent,
          failed: result.failed,
          error: result.error,
        } as Record<string, unknown>)
      }

      // 일반 알림 발송
      const userId = targetUserId || context.userId!

      // 본인에게만 발송 가능 (관리자 기능은 추후 추가)
      if (targetUserId && targetUserId !== context.userId) {
        return apiError(ErrorCodes.FORBIDDEN, 'Cannot send to other users')
      }

      const result = await sendPushNotification(userId, {
        title,
        message,
        icon: icon || '/icon-192.png',
        tag: tag || 'destinypal',
        data: { url: url || '/notifications' },
      })

      return apiSuccess({
        success: result.success,
        sent: result.sent,
        failed: result.failed,
        error: result.error,
      } as Record<string, unknown>)
    } catch (error) {
      logger.error('Error sending push notification:', error)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/push/send',
    limit: 10,
    windowSeconds: 60,
  })
)
