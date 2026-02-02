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
    const subscription = await parseJsonBody<PushSubscription>(req)

    // Validate subscription object
    if (!subscription?.endpoint || !subscription?.keys) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid subscription: missing endpoint or keys')
    }

    if (!subscription.keys.p256dh || !subscription.keys.auth) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid subscription: missing p256dh or auth keys'
      )
    }

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
    );

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
    const body = await parseJsonBody<{ endpoint: string }>(req)

    if (!body?.endpoint) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Endpoint required')
    }

    await removePushSubscription(body.endpoint);

    return apiSuccess({ success: true, message: 'Subscription removed successfully' })
  },
  createAuthenticatedGuard({ route: 'push/unsubscribe', limit: 20 })
)
