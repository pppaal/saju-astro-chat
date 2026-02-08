import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      const userId = context.userId!

      // Get or create referral code from UserSettings
      let userSettings = await prisma.userSettings.findUnique({
        where: { userId },
        select: { referralCode: true },
      })

      if (!userSettings?.referralCode) {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase()
        userSettings = await prisma.userSettings.upsert({
          where: { userId },
          create: { userId, referralCode: code },
          update: { referralCode: code },
          select: { referralCode: true },
        })
      }

      const [totalReferrals, pendingCount, completedStats] = await Promise.all([
        prisma.user.count({
          where: { referrerId: userId },
        }),
        prisma.referralReward.count({
          where: { userId, status: 'pending' },
        }),
        prisma.referralReward.aggregate({
          where: { userId, status: 'completed' },
          _count: true,
          _sum: { creditsAwarded: true },
        }),
      ])

      return apiSuccess({
        referralCode: userSettings.referralCode,
        totalReferrals,
        pendingRewards: pendingCount,
        completedRewards: completedStats._count,
        totalCreditsEarned: completedStats._sum.creditsAwarded || 0,
      })
    } catch (err) {
      logger.error('Referral stats error:', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch referral stats')
    }
  },
  createAuthenticatedGuard({
    route: '/api/referral/stats',
    limit: 60,
    windowSeconds: 60,
  })
)
