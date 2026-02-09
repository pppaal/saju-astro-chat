/**
 * Public Metrics API
 *
 * GET /api/metrics/public - Get public visitor statistics
 * Requires Bearer token authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createSimpleGuard } from '@/lib/api/middleware'
import { HTTP_STATUS } from '@/lib/constants/http'
import { logger } from '@/lib/logger'
import { getVisitorStats } from '@/lib/metrics/visitor-tracker'
import { timingSafeCompare } from '@/lib/security/timingSafe'

export const GET = withApiMiddleware(
  async (req: NextRequest) => {
    try {
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
        return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED })
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

      return NextResponse.json({
        todayVisitors,
        totalVisitors,
        totalMembers,
      })
    } catch (err) {
      logger.error('[Public Metrics API Error]', err)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createSimpleGuard({ route: 'metrics/public', limit: 60, windowSeconds: 60 })
)
