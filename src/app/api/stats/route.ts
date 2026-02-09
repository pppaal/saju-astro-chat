import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createSimpleGuard } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'

// Cache the stats for 5 minutes to reduce DB load
let cachedStats: { users: number; subscribers: number; timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export const GET = withApiMiddleware(
  async (_request: NextRequest) => {
    try {
      // Return cached stats if fresh
      if (cachedStats && Date.now() - cachedStats.timestamp < CACHE_TTL) {
        return NextResponse.json({
          users: cachedStats.users,
          subscribers: cachedStats.subscribers,
          cached: true,
        })
      }

      // Query fresh stats from database
      const [userCount, subscriberCount] = await Promise.all([
        prisma.user.count(),
        prisma.subscription.count({
          where: {
            status: {
              in: ['active', 'trialing'],
            },
          },
        }),
      ])

      // Update cache
      cachedStats = {
        users: userCount,
        subscribers: subscriberCount,
        timestamp: Date.now(),
      }

      return NextResponse.json({
        users: userCount,
        subscribers: subscriberCount,
        cached: false,
      })
    } catch (error: unknown) {
      const err = error instanceof Error ? error : undefined
      logger.error('[Stats API Error]', { message: err?.message, stack: err?.stack })
      return NextResponse.json(
        { error: 'Failed to fetch stats', details: err?.message, users: 0, subscribers: 0 },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createSimpleGuard({ route: 'stats', limit: 30, windowSeconds: 60 })
)
