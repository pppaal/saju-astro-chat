/**
 * Public Metrics API
 *
 * GET /api/metrics/public - Get public visitor statistics
 * Requires Bearer token authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { HTTP_STATUS } from '@/lib/constants/http'
import { logger } from '@/lib/logger'
import { getVisitorStats } from '@/lib/metrics/visitor-tracker'
import { timingSafeCompare } from '@/lib/security/timingSafe'

export async function GET(req: NextRequest) {
  try {
    // Rate limit
    const ip = getClientIp(req.headers)
    const limit = await rateLimit(`public-metrics:${ip}`, {
      limit: 60,
      windowSeconds: 60,
    })

    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    // Verify Bearer token
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '').trim()
    const expectedToken = (
      process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN ||
      process.env.PUBLIC_METRICS_TOKEN ||
      process.env.METRICS_TOKEN
    )?.trim()

    // Use timing-safe comparison to prevent timing attacks
    if (!expectedToken || !token || !timingSafeCompare(token, expectedToken)) {
      logger.warn('[Public Metrics] Auth failed', {
        hasAuthHeader: !!authHeader,
        hasToken: !!token,
        hasExpectedToken: !!expectedToken,
      })
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: HTTP_STATUS.UNAUTHORIZED, headers: limit.headers }
      )
    }

    // Get visitor statistics
    const { todayVisitors, totalVisitors } = await getVisitorStats()

    // Get total members count from database
    let totalMembers = 0
    try {
      const { prisma } = await import('@/lib/db/prisma')
      totalMembers = await prisma.user.count()
    } catch (err) {
      logger.error('[Public Metrics] Failed to count users', err)
    }

    return NextResponse.json(
      {
        todayVisitors,
        totalVisitors,
        totalMembers,
      },
      { headers: limit.headers }
    )
  } catch (err) {
    logger.error('[Public Metrics API Error]', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
