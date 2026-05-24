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

// GET /api/me/export — return the signed-in user's own data as a single JSON
// payload so they can download it (the "right to access" companion to account
// deletion). Only the user's own rows are included; auth/secret fields on the
// User record are intentionally excluded.
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const userId = context.userId!
    try {
      const [
        profile,
        circle,
        credits,
        purchases,
        readings,
        tarotReadings,
        consultations,
        counselorSessions,
        compatibilityResults,
        personalityResults,
      ] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            createdAt: true,
            profile: {
              select: {
                profilePhoto: true,
                birthDate: true,
                birthTime: true,
                gender: true,
                birthCity: true,
                tzId: true,
              },
            },
          },
        }),
        prisma.savedPerson.findMany({ where: { userId } }),
        prisma.userCredits.findUnique({ where: { userId } }),
        prisma.bonusCreditPurchase.findMany({ where: { userId } }),
        prisma.reading.findMany({ where: { userId } }),
        prisma.tarotReading.findMany({ where: { userId } }),
        prisma.consultationHistory.findMany({ where: { userId } }),
        prisma.counselorChatSession.findMany({ where: { userId } }),
        prisma.compatibilityResult.findMany({ where: { userId } }),
        prisma.personalityResult.findMany({ where: { userId } }),
      ])

      if (!profile) {
        return apiError(ErrorCodes.NOT_FOUND, 'Account not found')
      }

      return apiSuccess({
        exportedAt: new Date().toISOString(),
        profile,
        circle,
        credits,
        purchases,
        readings,
        tarotReadings,
        consultations,
        counselorSessions,
        compatibilityResults,
        personalityResults,
      })
    } catch (err) {
      logger.error('Error exporting account data:', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/export',
    limit: 10,
    windowSeconds: 60,
  })
)
