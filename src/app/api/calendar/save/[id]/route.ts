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
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

const jsonToStringArray = (value: Prisma.JsonValue | null | undefined): string[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0
    )
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value]
  }
  return []
}

const jsonToFactorArray = (value: Prisma.JsonValue | null | undefined): string[] => {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0
    )
  }
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .flatMap(([key, raw]) => {
        if (raw === null || raw === undefined || raw === false) return []
        if (Array.isArray(raw)) {
          const list = raw.filter(
            (item): item is string => typeof item === 'string' && item.trim().length > 0
          )
          return list.length > 0 ? [`${key}: ${list.join(', ')}`] : []
        }
        if (typeof raw === 'boolean') return raw ? [key] : []
        if (typeof raw === 'number') return [`${key}: ${raw}`]
        if (typeof raw === 'string' && raw.trim().length > 0) return [`${key}: ${raw}`]
        return []
      })
      .slice(0, 20)
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return [value]
  }
  return []
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

        return apiSuccess({
          savedDate: {
            ...savedDate,
            categories: jsonToStringArray(savedDate.categories as Prisma.JsonValue),
            bestTimes: jsonToStringArray(savedDate.bestTimes as Prisma.JsonValue),
            sajuFactors: jsonToFactorArray(savedDate.sajuFactors),
            astroFactors: jsonToFactorArray(savedDate.astroFactors),
            recommendations: jsonToStringArray(savedDate.recommendations),
            warnings: jsonToStringArray(savedDate.warnings),
          },
        })
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
