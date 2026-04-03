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

const normalizeBirthField = (value?: string | null): string => value?.trim() || ''

const cleanText = (value: unknown, max = 220): string => {
  if (typeof value !== 'string') return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

const compactLines = (input: unknown, maxItems = 4, maxText = 220): string[] => {
  if (!Array.isArray(input)) return []
  return Array.from(
    new Set(
      input
        .map((item) => cleanText(item, maxText))
        .filter((item): item is string => item.length > 0)
    )
  ).slice(0, maxItems)
}

const compactBranchLines = (input: unknown): string[] => {
  if (!Array.isArray(input)) return []
  return input
    .flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const branch = item as {
        summary?: unknown
        nextMove?: unknown
        entryConditions?: unknown
        abortConditions?: unknown
      }
      return [
        cleanText(branch.summary, 180),
        cleanText(branch.nextMove, 180),
        ...compactLines(branch.entryConditions, 2, 160),
        ...compactLines(branch.abortConditions, 2, 160),
      ]
    })
    .filter(Boolean)
    .slice(0, 6)
}

function buildSavedInterpretationSnapshot(rawBody: unknown) {
  if (!rawBody || typeof rawBody !== 'object') return null
  const input = rawBody as {
    summary?: unknown
    recommendations?: unknown
    warnings?: unknown
    canonicalCore?: {
      singleSubjectView?: {
        directAnswer?: unknown
        actionAxis?: { nowAction?: unknown; whyThisFirst?: unknown }
        riskAxis?: { warning?: unknown; hardStops?: unknown }
        timingState?: { whyNow?: unknown; whyNotYet?: unknown }
        branches?: unknown
        entryConditions?: unknown
        abortConditions?: unknown
        nextMove?: unknown
      }
      personModel?: {
        domainStateGraph?: unknown
        eventOutlook?: unknown
      }
    }
    presentation?: {
      daySummary?: { summary?: unknown }
    }
  }

  const singleSubjectView = input.canonicalCore?.singleSubjectView
  const personModel = input.canonicalCore?.personModel

  const domainStateLines = Array.isArray(personModel?.domainStateGraph)
    ? personModel.domainStateGraph.flatMap((item) => {
        if (!item || typeof item !== 'object') return []
        const state = item as { thesis?: unknown; firstMove?: unknown; holdMove?: unknown }
        return [
          cleanText(state.thesis, 180),
          cleanText(state.firstMove, 180),
          cleanText(state.holdMove, 180),
        ]
      })
    : []

  const eventLines = Array.isArray(personModel?.eventOutlook)
    ? personModel.eventOutlook.flatMap((item) => {
        if (!item || typeof item !== 'object') return []
        const event = item as {
          summary?: unknown
          nextMove?: unknown
          entryConditions?: unknown
          abortConditions?: unknown
        }
        return [
          cleanText(event.summary, 180),
          cleanText(event.nextMove, 180),
          ...compactLines(event.entryConditions, 2, 160),
          ...compactLines(event.abortConditions, 2, 160),
        ]
      })
    : []

  const summary =
    cleanText(singleSubjectView?.directAnswer, 240) ||
    cleanText(input.presentation?.daySummary?.summary, 240) ||
    cleanText(input.summary, 240)

  const recommendations = Array.from(
    new Set(
      [
        cleanText(singleSubjectView?.actionAxis?.nowAction, 180),
        cleanText(singleSubjectView?.nextMove, 180),
        ...compactBranchLines(singleSubjectView?.branches),
        ...domainStateLines,
        ...eventLines,
        ...compactLines(input.recommendations, 4, 180),
      ].filter(Boolean)
    )
  ).slice(0, 6)

  const warnings = Array.from(
    new Set(
      [
        cleanText(singleSubjectView?.riskAxis?.warning, 180),
        ...compactLines(singleSubjectView?.riskAxis?.hardStops, 3, 160),
        ...compactLines(singleSubjectView?.abortConditions, 3, 160),
        ...compactLines(input.warnings, 4, 180),
      ].filter(Boolean)
    )
  ).slice(0, 6)

  return {
    summary,
    recommendations,
    warnings,
  }
}

const hasProfileConflict = (
  existing: {
    birthDate: string | null
    birthTime: string | null
    birthPlace: string | null
  },
  incoming: {
    birthDate?: string
    birthTime?: string
    birthPlace?: string
  }
): boolean => {
  const existingBirthDate = normalizeBirthField(existing.birthDate)
  const existingBirthTime = normalizeBirthField(existing.birthTime)
  const existingBirthPlace = normalizeBirthField(existing.birthPlace)
  const incomingBirthDate = normalizeBirthField(incoming.birthDate)
  const incomingBirthTime = normalizeBirthField(incoming.birthTime)
  const incomingBirthPlace = normalizeBirthField(incoming.birthPlace)

  const birthDateConflict =
    existingBirthDate.length > 0 &&
    incomingBirthDate.length > 0 &&
    existingBirthDate !== incomingBirthDate
  const birthTimeConflict =
    existingBirthTime.length > 0 &&
    incomingBirthTime.length > 0 &&
    existingBirthTime !== incomingBirthTime
  const birthPlaceConflict =
    existingBirthPlace.length > 0 &&
    incomingBirthPlace.length > 0 &&
    existingBirthPlace !== incomingBirthPlace

  return birthDateConflict || birthTimeConflict || birthPlaceConflict
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

      const savedInterpretation = buildSavedInterpretationSnapshot(rawBody)

      const normalizedSajuFactors = toJsonObjectOrArray(sajuFactors, [])
      const normalizedAstroFactors = toJsonObjectOrArray(astroFactors, [])
      const normalizedRecommendations = savedInterpretation?.recommendations?.length
        ? savedInterpretation.recommendations
        : toStringArray(recommendations)
      const normalizedWarnings = savedInterpretation?.warnings?.length
        ? savedInterpretation.warnings
        : toStringArray(warnings)
      const normalizedBirthDate = normalizeBirthField(birthDate)
      const normalizedBirthTime = normalizeBirthField(birthTime)
      const normalizedBirthPlace = normalizeBirthField(birthPlace)

      const existingDate = await prisma.savedCalendarDate.findUnique({
        where: {
          userId_date: {
            userId: context.userId!,
            date,
          },
        },
        select: {
          birthDate: true,
          birthTime: true,
          birthPlace: true,
        },
      })

      if (
        existingDate &&
        hasProfileConflict(existingDate, {
          birthDate: normalizedBirthDate,
          birthTime: normalizedBirthTime,
          birthPlace: normalizedBirthPlace,
        })
      ) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          'A different birth profile is already saved for this date'
        )
      }

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
          summary: savedInterpretation?.summary || summary || '',
          categories: categories || [],
          bestTimes: bestTimes && bestTimes.length > 0 ? bestTimes : [],
          sajuFactors: normalizedSajuFactors,
          astroFactors: normalizedAstroFactors,
          recommendations: normalizedRecommendations,
          warnings: normalizedWarnings,
          birthDate: normalizedBirthDate,
          birthTime: normalizedBirthTime,
          birthPlace: normalizedBirthPlace,
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
          summary: savedInterpretation?.summary || summary || '',
          categories: categories || [],
          bestTimes: bestTimes && bestTimes.length > 0 ? bestTimes : [],
          sajuFactors: normalizedSajuFactors,
          astroFactors: normalizedAstroFactors,
          recommendations: normalizedRecommendations,
          warnings: normalizedWarnings,
          birthDate: normalizedBirthDate,
          birthTime: normalizedBirthTime,
          birthPlace: normalizedBirthPlace,
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
