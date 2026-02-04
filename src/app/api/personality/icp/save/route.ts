import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma, Prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { icpSaveRequestSchema, personalityIcpSaveGetQuerySchema } from '@/lib/api/zodValidation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST: Save ICP result
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await req.json()

    const validationResult = icpSaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[ICP save POST] validation failed', { errors: validationResult.error.issues })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const {
      primaryStyle,
      secondaryStyle,
      dominanceScore,
      affiliationScore,
      octantScores,
      analysisData,
      answers,
      locale = 'en',
    } = validationResult.data

    try {
      const icpResult = await prisma.iCPResult.create({
        data: {
          userId: context.userId!,
          primaryStyle,
          secondaryStyle,
          dominanceScore,
          affiliationScore,
          octantScores: octantScores as Prisma.InputJsonValue,
          analysisData,
          answers: answers ? (answers as Prisma.InputJsonValue) : Prisma.JsonNull,
          locale,
        },
      })

      logger.info('ICP result saved', { userId: context.userId, id: icpResult.id })

      return apiSuccess({
        id: icpResult.id,
        createdAt: icpResult.createdAt,
      })
    } catch (err) {
      logger.error('[ICP save POST] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to save ICP result')
    }
  },
  createAuthenticatedGuard({
    route: '/api/personality/icp/save',
    limit: 20,
    windowSeconds: 60,
  })
)

// GET: Retrieve ICP result by ID
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const { searchParams } = new URL(req.url)
    const queryValidation = personalityIcpSaveGetQuerySchema.safeParse({
      id: searchParams.get('id') || undefined,
    })

    if (!queryValidation.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Missing or invalid id parameter')
    }

    const { id } = queryValidation.data

    if (!id) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Missing id parameter')
    }

    try {
      const icpResult = await prisma.iCPResult.findFirst({
        where: {
          id,
          userId: context.userId!,
        },
      })

      if (!icpResult) {
        return apiError(ErrorCodes.NOT_FOUND, 'ICP result not found')
      }

      return apiSuccess({ result: icpResult })
    } catch (err) {
      logger.error('[ICP save GET] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve ICP result')
    }
  },
  createAuthenticatedGuard({
    route: '/api/personality/icp/save',
    limit: 60,
    windowSeconds: 60,
  })
)
