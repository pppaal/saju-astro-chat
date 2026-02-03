import { NextRequest } from 'next/server'
import { savePushSubscription, removePushSubscription } from '@/lib/notifications/pushService'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  parseJsonBody,
  apiError,
  apiSuccess,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { pushSubscribeSchema, pushUnsubscribeSchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

/**
 * POST /api/push/subscribe
 * Save user's push notification subscription
 */
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await parseJsonBody<PushSubscription>(req)

    // Validate with Zod
    const validationResult = pushSubscribeSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Push subscribe] validation failed', { errors: validationResult.error.issues })
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid subscription', {
        details: validationResult.error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    const subscription = validationResult.data
    const userAgent = req.headers.get('user-agent') || undefined

    // Store subscription in database
    await savePushSubscription(
      context.userId!,
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      userAgent
    )

    return apiSuccess({ success: true, message: 'Subscription saved successfully' })
  },
  createAuthenticatedGuard({ route: 'push/subscribe', limit: 20 })
)

/**
 * DELETE /api/push/subscribe
 * Remove user's push notification subscription
 */
export const DELETE = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    const rawBody = await parseJsonBody<{ endpoint: string }>(req)

    // Validate with Zod
    const deleteValidation = pushUnsubscribeSchema.safeParse(rawBody)
    if (!deleteValidation.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Endpoint required')
    }

    await removePushSubscription(deleteValidation.data.endpoint)

    return apiSuccess({ success: true, message: 'Subscription removed successfully' })
  },
  createAuthenticatedGuard({ route: 'push/unsubscribe', limit: 20 })
)
