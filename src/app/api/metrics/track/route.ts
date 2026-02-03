/**
 * Visitor Tracking API
 *
 * POST /api/metrics/track - Track a visitor
 * Uses IP address + User-Agent as visitor identifier
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { HTTP_STATUS } from '@/lib/constants/http'
import { logger } from '@/lib/logger'
import { trackVisitor } from '@/lib/metrics/visitor-tracker'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    // Rate limit to prevent spam
    const ip = getClientIp(req.headers)
    const limit = await rateLimit(`track-visitor:${ip}`, {
      limit: 10,
      windowSeconds: 60,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    // Create visitor ID from IP + User-Agent
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const visitorId = crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex')

    // Track the visitor
    trackVisitor(visitorId)

    return NextResponse.json({ success: true }, { status: HTTP_STATUS.OK, headers: limit.headers })
  } catch (err) {
    logger.error('[Track Visitor API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
