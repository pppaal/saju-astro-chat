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
import { calendarSaveRequestSchema, calendarQuerySchema, dateSchema } from '@/lib/api/zodValidation'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const normalizeQueryParam = (value: string | null): string | undefined => {
  if (!value) {
    return undefined
  }
  const normalized = value.trim()
  if (normalized === '' || normalized === 'null' || normalized === 'undefined') {
    return undefined
  }
  return normalized
}

const toJsonObjectOrArray = (
  value: unknown,
  fallback: Record<string, never> | string[] = {}
): Prisma.InputJsonValue => {
  if (Array.isArray(value)) {
    return value as Prisma.InputJsonValue
  }
  if (value && typeof value === 'object') {
    return value as Prisma.InputJsonValue
  }
  return fallback as Prisma.InputJsonValue
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

// POST - 날짜 저장
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const rawBody = await req.json()

      const validationResult = calendarSaveRequestSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[CalendarSave] validation failed', { errors: validationResult.error.issues })
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
        )
      }

      const body = validationResult.data
      const {
        date,
        year,
        grade,
        score,
        title,
        description,
        summary,
        categories,
        bestTimes,
        sajuFactors,
        astroFactors,
        recommendations,
        warnings,
        birthDate,
        birthTime,
        birthPlace,
        locale = 'ko',
      } = body

      const normalizedSajuFactors = toJsonObjectOrArray(sajuFactors, [])
      const normalizedAstroFactors = toJsonObjectOrArray(astroFactors, [])
      const normalizedRecommendations = toStringArray(recommendations)
      const normalizedWarnings = toStringArray(warnings)

      const savedDate = await prisma.savedCalendarDate.upsert({
        where: {
          userId_date: {
            userId: context.userId!,
            date,
          },
        },
        update: {
          year: year || new Date(date).getFullYear(),
          grade,
          score,
          title,
          description: description || '',
          summary: summary || '',
          categories: categories || [],
          bestTimes: bestTimes && bestTimes.length > 0 ? bestTimes : [],
          sajuFactors: normalizedSajuFactors,
          astroFactors: normalizedAstroFactors,
          recommendations: normalizedRecommendations,
          warnings: normalizedWarnings,
          birthDate: birthDate || '',
          birthTime: birthTime || '',
          birthPlace: birthPlace || '',
          locale,
        },
        create: {
          userId: context.userId!,
          date,
          year: year || new Date(date).getFullYear(),
          grade,
          score,
          title,
          description: description || '',
          summary: summary || '',
          categories: categories || [],
          bestTimes: bestTimes && bestTimes.length > 0 ? bestTimes : [],
          sajuFactors: normalizedSajuFactors,
          astroFactors: normalizedAstroFactors,
          recommendations: normalizedRecommendations,
          warnings: normalizedWarnings,
          birthDate: birthDate || '',
          birthTime: birthTime || '',
          birthPlace: birthPlace || '',
          locale,
        },
      })

      return apiSuccess({ success: true, id: savedDate.id })
    } catch (error) {
      logger.error('Failed to save calendar date:', error)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to save')
    }
  },
  createAuthenticatedGuard({
    route: '/api/calendar/save',
    limit: 30,
    windowSeconds: 60,
  })
)

// DELETE - 저장된 날짜 삭제
export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const { searchParams } = new URL(req.url)
      const rawDate = searchParams.get('date')

      const dateValidation = dateSchema.safeParse(rawDate)
      if (!dateValidation.success) {
        logger.warn('[CalendarSave] Invalid date parameter', { date: rawDate })
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid date format. Expected YYYY-MM-DD')
      }

      const date = dateValidation.data

      await prisma.savedCalendarDate.delete({
        where: {
          userId_date: {
            userId: context.userId!,
            date,
          },
        },
      })

      return apiSuccess({ success: true })
    } catch (error) {
      logger.error('Failed to delete calendar date:', error)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to delete')
    }
  },
  createAuthenticatedGuard({
    route: '/api/calendar/save',
    limit: 20,
    windowSeconds: 60,
  })
)

// GET - 저장된 날짜 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const { searchParams } = new URL(req.url)
      const dateParam = normalizeQueryParam(searchParams.get('date'))
      const yearParam = normalizeQueryParam(searchParams.get('year'))
      const limitQueryParam = normalizeQueryParam(searchParams.get('limit')) ?? '50'

      const queryValidation = calendarQuerySchema.safeParse({
        date: dateParam,
        year: yearParam,
        limit: limitQueryParam,
      })

      if (!queryValidation.success) {
        logger.warn('[CalendarSave] Invalid query parameters', {
          errors: queryValidation.error.issues,
        })
        return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid query parameters')
      }

      const { date, year, limit: limitParam } = queryValidation.data

      const where: Record<string, unknown> = { userId: context.userId! }

      if (date) {
        where.date = date
      } else if (year) {
        where.year = year
      }

      const savedDates = await prisma.savedCalendarDate.findMany({
        where,
        select: {
          id: true,
          date: true,
          year: true,
          grade: true,
          score: true,
          title: true,
          summary: true,
          categories: true,
          createdAt: true,
        },
        orderBy: { date: 'asc' },
        take: Math.min(limitParam, 365),
      })

      return apiSuccess({ savedDates })
    } catch (error) {
      logger.error('Failed to fetch saved calendar dates:', error)
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch')
    }
  },
  createAuthenticatedGuard({
    route: '/api/calendar/save',
    limit: 60,
    windowSeconds: 60,
  })
)
