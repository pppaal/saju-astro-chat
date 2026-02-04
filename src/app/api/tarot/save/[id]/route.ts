import { NextRequest, NextResponse } from 'next/server'
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
import { idParamSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = idParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 })
  }
  const { id } = paramValidation.data

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        const reading = await prisma.tarotReading.findFirst({
          where: {
            id,
            userId: context.userId!,
          },
        })

        if (!reading) {
          return apiError(ErrorCodes.NOT_FOUND, 'reading_not_found')
        }

        return apiSuccess({
          success: true,
          reading: {
            id: reading.id,
            question: reading.question,
            theme: reading.theme,
            spreadId: reading.spreadId,
            spreadTitle: reading.spreadTitle,
            cards: reading.cards,
            overallMessage: reading.overallMessage,
            cardInsights: reading.cardInsights,
            guidance: reading.guidance,
            affirmation: reading.affirmation,
            source: reading.source,
            locale: reading.locale,
            createdAt: reading.createdAt,
          },
        })
      } catch (error) {
        logger.error('[Tarot Get Error]:', error)
        return apiError(ErrorCodes.DATABASE_ERROR, 'internal_server_error')
      }
    },
    createAuthenticatedGuard({
      route: '/api/tarot/save/[id]',
      limit: 30,
      windowSeconds: 60,
    })
  )

  return handler(request as unknown as NextRequest)
}
