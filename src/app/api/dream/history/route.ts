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
import { dreamHistoryQuerySchema, dreamHistoryDeleteQuerySchema } from '@/lib/api/zodValidation'

export type DreamHistoryItem = {
  id: string
  createdAt: string
  summary: string
  dreamText?: string
  symbols?: string[]
  themes?: { label: string; weight: number }[]
  luckyNumbers?: number[]
}

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const { searchParams } = new URL(req.url)
      const queryValidation = dreamHistoryQuerySchema.safeParse({
        limit: searchParams.get('limit') ?? undefined,
        offset: searchParams.get('offset') ?? undefined,
      })
      if (!queryValidation.success) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Validation failed: ${queryValidation.error.issues.map((e) => e.message).join(', ')}`
        )
      }
      const { limit, offset } = queryValidation.data

      const dreams = await prisma.consultationHistory.findMany({
        where: {
          userId: context.userId!,
          theme: 'dream',
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          createdAt: true,
          summary: true,
          fullReport: true,
          signals: true,
          userQuestion: true,
        },
      })

      const history: DreamHistoryItem[] = dreams.map((dream) => {
        const signals = dream.signals as Record<string, unknown> | null

        return {
          id: dream.id,
          createdAt: dream.createdAt.toISOString(),
          summary: dream.summary || '꿈 해석',
          dreamText: dream.userQuestion || undefined,
          symbols:
            (signals?.dreamSymbols as { label: string }[])?.map((s) => s.label) ||
            (signals?.symbols as string[]) ||
            undefined,
          themes: (signals?.themes as { label: string; weight: number }[]) || undefined,
          luckyNumbers:
            (signals?.luckyElements as { luckyNumbers?: number[] })?.luckyNumbers || undefined,
        }
      })

      const total = await prisma.consultationHistory.count({
        where: {
          userId: context.userId!,
          theme: 'dream',
        },
      })

      return apiSuccess({
        history,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      })
    } catch (error) {
      logger.error('Error fetching dream history:', error)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/dream/history',
    limit: 60,
    windowSeconds: 60,
  })
)

export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const { searchParams } = new URL(req.url)
      const deleteValidation = dreamHistoryDeleteQuerySchema.safeParse({
        id: searchParams.get('id') ?? undefined,
      })
      if (!deleteValidation.success) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Validation failed: ${deleteValidation.error.issues.map((e) => e.message).join(', ')}`
        )
      }
      const { id } = deleteValidation.data

      const deleted = await prisma.consultationHistory.deleteMany({
        where: {
          id,
          userId: context.userId!,
          theme: 'dream',
        },
      })

      if (deleted.count === 0) {
        return apiError(ErrorCodes.NOT_FOUND, 'Dream not found')
      }

      return apiSuccess({ success: true })
    } catch (error) {
      logger.error('Error deleting dream:', error)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Internal server error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/dream/history',
    limit: 20,
    windowSeconds: 60,
  })
)
