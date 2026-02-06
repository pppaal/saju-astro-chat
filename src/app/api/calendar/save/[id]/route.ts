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
import { idParamSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET - 특정 저장된 날짜 상세 조회
export async function GET(request: Request, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = idParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return createValidationErrorResponse(paramValidation.error, {
      route: 'calendar/save/[id]',
    })
  }
  const { id } = paramValidation.data

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        const savedDate = await prisma.savedCalendarDate.findFirst({
          where: {
            id,
            userId: context.userId!,
          },
        })

        if (!savedDate) {
          return apiError(ErrorCodes.NOT_FOUND, 'Not found')
        }

        return apiSuccess({ savedDate })
      } catch (error) {
        logger.error('Failed to fetch saved calendar date:', error)
        return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch')
      }
    },
    createAuthenticatedGuard({
      route: '/api/calendar/save/[id]',
      limit: 60,
      windowSeconds: 60,
    })
  )

  return handler(request as unknown as NextRequest)
}

// DELETE - 특정 저장된 날짜 삭제
export async function DELETE(request: NextRequest, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = idParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return createValidationErrorResponse(paramValidation.error, {
      route: 'calendar/save/[id]',
    })
  }
  const { id } = paramValidation.data

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        const existingDate = await prisma.savedCalendarDate.findFirst({
          where: {
            id,
            userId: context.userId!,
          },
        })

        if (!existingDate) {
          return apiError(ErrorCodes.NOT_FOUND, 'Not found')
        }

        await prisma.savedCalendarDate.delete({
          where: { id },
        })

        return apiSuccess({ success: true })
      } catch (error) {
        logger.error('Failed to delete saved calendar date:', error)
        return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to delete')
      }
    },
    createAuthenticatedGuard({
      route: '/api/calendar/save/[id]',
      limit: 20,
      windowSeconds: 60,
    })
  )

  return handler(request)
}
