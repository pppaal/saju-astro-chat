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
import {
  destinyMatrixSaveRequestSchema,
  destinyMatrixSaveGetQuerySchema,
} from '@/lib/api/zodValidation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST: Save Destiny Matrix report
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await req.json()

    const validationResult = destinyMatrixSaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[DestinyMatrixSave POST] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const {
      reportType,
      period,
      theme,
      reportData,
      title,
      summary,
      overallScore,
      grade,
      locale = 'ko',
    } = validationResult.data

    try {
      const matrixReport = await prisma.destinyMatrixReport.create({
        data: {
          userId: context.userId!,
          reportType,
          period: period || null,
          theme: theme || null,
          reportData: reportData as Prisma.InputJsonValue,
          title,
          summary: summary || null,
          overallScore: overallScore || null,
          grade: grade || null,
          pdfGenerated: false,
          locale,
        },
      })

      logger.info('Destiny Matrix report saved', {
        userId: context.userId,
        id: matrixReport.id,
        reportType,
      })

      return apiSuccess({
        id: matrixReport.id,
        createdAt: matrixReport.createdAt,
      })
    } catch (err) {
      logger.error('[DestinyMatrixSave POST] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to save Destiny Matrix report')
    }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-matrix/save',
    limit: 20,
    windowSeconds: 60,
  })
)

// GET: Retrieve Destiny Matrix report by ID
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const { searchParams } = new URL(req.url)
    const queryValidation = destinyMatrixSaveGetQuerySchema.safeParse({
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
      const matrixReport = await prisma.destinyMatrixReport.findFirst({
        where: {
          id,
          userId: context.userId!,
        },
      })

      if (!matrixReport) {
        return apiError(ErrorCodes.NOT_FOUND, 'Destiny Matrix report not found')
      }

      return apiSuccess({ result: matrixReport })
    } catch (err) {
      logger.error('[DestinyMatrixSave GET] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve Destiny Matrix report')
    }
  },
  createAuthenticatedGuard({
    route: '/api/destiny-matrix/save',
    limit: 60,
    windowSeconds: 60,
  })
)
