/**
 * Visitor Tracking API
 *
 * POST /api/metrics/track - Track a visitor
 * Uses IP address + User-Agent as visitor identifier
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createSimpleGuard } from '@/lib/api/middleware'
import { HTTP_STATUS } from '@/lib/constants/http'
import { logger } from '@/lib/logger'
import { trackVisitor } from '@/lib/metrics/visitor-tracker'
import crypto from 'crypto'

export const POST = withApiMiddleware(
  async (req: NextRequest, context) => {
    try {
      const ip = context.ip || 'unknown'

      // Create visitor ID from IP + User-Agent
      const userAgent = req.headers.get('user-agent') || 'unknown'
      const visitorId = crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex')

      // Track the visitor
      trackVisitor(visitorId)

      return NextResponse.json({ success: true }, { status: HTTP_STATUS.OK })
    } catch (err) {
      logger.error('[Track Visitor API Error]', err)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createSimpleGuard({ route: 'metrics/track', limit: 10, windowSeconds: 60 })
)
