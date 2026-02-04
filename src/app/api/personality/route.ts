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
import { Prisma } from '@prisma/client'
import { logger } from '@/lib/logger'
import { personalitySaveRequestSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

// GET: fetch personality result
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      const result = await prisma.personalityResult.findUnique({
        where: { userId: context.userId! },
        select: {
          id: true,
          typeCode: true,
          personaName: true,
          avatarGender: true,
          energyScore: true,
          cognitionScore: true,
          decisionScore: true,
          rhythmScore: true,
          consistencyScore: true,
          analysisData: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (!result) {
        return apiSuccess({ saved: false })
      }

      return apiSuccess({ saved: true, result })
    } catch (err) {
      logger.error('GET /api/personality error:', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'server_error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/personality',
    limit: 60,
    windowSeconds: 60,
  })
)

// POST: store personality result
export const POST = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json().catch(() => null)

    const validationResult = personalitySaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Personality save] validation failed', { errors: validationResult.error.issues })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const {
      typeCode,
      personaName,
      avatarGender,
      energyScore,
      cognitionScore,
      decisionScore,
      rhythmScore,
      consistencyScore,
      analysisData,
      answers,
    } = validationResult.data

    try {
      const result = await prisma.personalityResult.upsert({
        where: { userId: context.userId! },
        create: {
          userId: context.userId!,
          typeCode,
          personaName,
          avatarGender,
          energyScore: Math.round(energyScore),
          cognitionScore: Math.round(cognitionScore),
          decisionScore: Math.round(decisionScore),
          rhythmScore: Math.round(rhythmScore),
          consistencyScore:
            consistencyScore !== null && consistencyScore !== undefined
              ? Math.round(consistencyScore)
              : null,
          analysisData: analysisData as Prisma.InputJsonValue,
          answers: answers ? (answers as Prisma.InputJsonValue) : Prisma.DbNull,
        },
        update: {
          typeCode,
          personaName,
          avatarGender,
          energyScore: Math.round(energyScore),
          cognitionScore: Math.round(cognitionScore),
          decisionScore: Math.round(decisionScore),
          rhythmScore: Math.round(rhythmScore),
          consistencyScore:
            consistencyScore !== null && consistencyScore !== undefined
              ? Math.round(consistencyScore)
              : null,
          analysisData: analysisData as Prisma.InputJsonValue,
          answers: answers ? (answers as Prisma.InputJsonValue) : Prisma.DbNull,
          updatedAt: new Date(),
        },
      })

      return apiSuccess({
        success: true,
        result: {
          id: result.id,
          typeCode: result.typeCode,
          personaName: result.personaName,
        },
      })
    } catch (err) {
      logger.error('POST /api/personality error:', err)
      return apiError(ErrorCodes.DATABASE_ERROR, 'server_error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/personality',
    limit: 30,
    windowSeconds: 60,
  })
)
