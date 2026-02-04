import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/authOptions'
import { registerClient, unregisterClient, drainQueuedNotifications } from '@/lib/notifications/sse'
import { HTTP_STATUS } from '@/lib/constants/http'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Server-Sent Events (SSE) endpoint for real-time notifications
 * GET /api/notifications/stream?userId=user@example.com
 */
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return new Response('Unauthorized', { status: HTTP_STATUS.UNAUTHORIZED })
  }

  const ip = getClientIp(_request.headers)
  const limit = await rateLimit(`notif-stream:${ip}`, { limit: 30, windowSeconds: 60 })
  if (!limit.allowed) {
    return new Response('Too many requests', {
      status: HTTP_STATUS.RATE_LIMITED,
      headers: Object.fromEntries(limit.headers.entries()),
    })
  }

  const userId = session.user.email

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Store the controller for this user
      registerClient(userId, controller)

      // Send initial connection message
      const data = JSON.stringify({
        id: Date.now().toString(),
        type: 'system',
        title: 'Connected',
        message: 'Notification system connected',
        createdAt: Date.now(),
        read: true,
      })
      controller.enqueue(`data: ${data}\n\n`)

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        controller.enqueue(`: heartbeat\n\n`)
      }, 30000) // Every 30 seconds

      // Drain queued notifications from Redis (cross-instance)
      let draining = false
      const drainQueue = async () => {
        if (draining) {
          return
        }
        draining = true
        try {
          const queued = await drainQueuedNotifications(userId, 20)
          for (const item of queued) {
            try {
              controller.enqueue(`data: ${JSON.stringify(item)}\n\n`)
            } catch (_enqueueErr) {
              logger.warn('[notifications/stream] Enqueue failed, stream may be closed', { userId })
            }
          }
        } finally {
          draining = false
        }
      }

      // Initial drain + periodic polling
      void drainQueue()
      const queuePoller = setInterval(() => {
        void drainQueue()
      }, 5000)

      // Cleanup on connection close
      _request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        clearInterval(queuePoller)
        unregisterClient(userId)
        try {
          controller.close()
        } catch {
          // Controller already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  })
}
