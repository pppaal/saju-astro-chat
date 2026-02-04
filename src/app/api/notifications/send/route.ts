import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { sendNotification } from '@/lib/notifications/sse'
import { logger } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const notificationSendSchema = z.object({
  targetUserId: z.string().min(1).max(200),
  type: z.enum(['like', 'comment', 'reply', 'mention', 'system']),
  title: z.string().min(1).max(200).trim(),
  message: z.string().min(1).max(1000).trim(),
  link: z.string().max(500).optional(),
  avatar: z.string().max(500).optional(),
})

// POST /api/notifications/send
export const POST = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json()

    const validationResult = notificationSendSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Notifications send POST] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { targetUserId, type, title, message, link, avatar } = validationResult.data

    const allowedTargets = new Set(
      [context.userId, context.session?.user?.email].filter(Boolean) as string[]
    )
    if (!allowedTargets.has(targetUserId)) {
      return apiError(ErrorCodes.FORBIDDEN, 'Cannot send to other users')
    }

    try {
      const sent = await sendNotification(targetUserId, {
        type,
        title,
        message,
        link,
        avatar,
      })

      return apiSuccess({
        sent,
        message: sent ? 'Notification sent' : 'User not connected to notification stream',
      })
    } catch (err) {
      logger.error('[Notifications send POST] error', { error: err })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to send notification')
    }
  },
  createAuthenticatedGuard({
    route: '/api/notifications/send',
    limit: 20,
    windowSeconds: 60,
  })
)

// GET /api/notifications/send - Test endpoint
export const GET = withApiMiddleware(
  async (_request: NextRequest, context: ApiContext) => {
    const userEmail = context.session?.user?.email
    if (!userEmail) {
      return apiError(ErrorCodes.UNAUTHORIZED, 'Email not available')
    }

    try {
      const sent = await sendNotification(userEmail, {
        type: 'system',
        title: 'Test Notification',
        message: 'This is a test notification from the system',
        link: '/notifications',
      })

      return apiSuccess({
        sent,
        message: sent ? 'Test notification sent' : 'You are not connected to SSE',
      })
    } catch (err) {
      logger.error('[Notifications send GET] error', { error: err })
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to send test notification')
    }
  },
  createAuthenticatedGuard({
    route: '/api/notifications/send',
    limit: 10,
    windowSeconds: 60,
  })
)
