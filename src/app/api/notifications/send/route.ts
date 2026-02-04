import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/authOptions'
import { sendNotification } from '@/lib/notifications/sse'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

/**
 * Notification send request schema
 */
const notificationSendSchema = z.object({
  targetUserId: z.string().min(1).max(200),
  type: z.enum(['like', 'comment', 'reply', 'mention', 'system']),
  title: z.string().min(1).max(200).trim(),
  message: z.string().min(1).max(1000).trim(),
  link: z.string().max(500).optional(),
  avatar: z.string().max(500).optional(),
})

/**
 * POST /api/notifications/send
 * Send a notification to a user (for testing or from other API routes)
 */
export async function POST(_request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
  }

  try {
    const ip = getClientIp(_request.headers)
    const limit = await rateLimit(`notify:${session.user.id ?? session.user.email}:${ip}`, {
      limit: 20,
      windowSeconds: 60,
    })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const rawBody = await _request.json()

    // Validate with Zod
    const validationResult = notificationSendSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Notifications send] validation failed', {
        errors: validationResult.error.issues,
      })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const { targetUserId, type, title, message, link, avatar } = validationResult.data

    const allowedTargets = new Set(
      [session.user.id, session.user.email].filter(Boolean) as string[]
    )
    if (!allowedTargets.has(targetUserId)) {
      return NextResponse.json(
        { error: 'Forbidden: cannot send to other users' },
        { status: HTTP_STATUS.FORBIDDEN, headers: limit.headers }
      )
    }

    const sent = await sendNotification(targetUserId, {
      type,
      title,
      message,
      link,
      avatar,
    })

    return NextResponse.json(
      {
        success: sent,
        message: sent ? 'Notification sent' : 'User not connected to notification stream',
      },
      { headers: limit.headers }
    )
  } catch (error) {
    logger.error('Error in send notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}

/**
 * GET /api/notifications/send
 * Test endpoint to send a sample notification
 */
export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
  }

  const ip = getClientIp(_request.headers)
  const limit = await rateLimit(`notify:test:${session.user.id ?? session.user.email}:${ip}`, {
    limit: 10,
    windowSeconds: 60,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
    )
  }

  // Send a test notification to the current user
  const sent = await sendNotification(session.user.email, {
    type: 'system',
    title: 'Test Notification',
    message: 'This is a test notification from the system',
    link: '/notifications',
  })

  return NextResponse.json(
    {
      success: sent,
      message: sent ? 'Test notification sent' : 'You are not connected to SSE',
    },
    { headers: limit.headers }
  )
}
