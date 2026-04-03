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

type SavedCalendarDetail = {
  date: string
  score: number
  title: string
  description: string | null
  summary: string | null
  categories: Prisma.JsonValue | null
  bestTimes: Prisma.JsonValue | null
  recommendations: Prisma.JsonValue | null
  warnings: Prisma.JsonValue | null
}

const DOMAIN_LABELS: Record<
  string,
  {
    label: string
    score: number
    domain: 'career' | 'love' | 'money' | 'health' | 'move' | 'general'
  }
> = {
  career: { label: '커리어', score: 0.82, domain: 'career' },
  love: { label: '관계', score: 0.8, domain: 'love' },
  wealth: { label: '재정', score: 0.78, domain: 'money' },
  money: { label: '재정', score: 0.78, domain: 'money' },
  health: { label: '건강', score: 0.76, domain: 'health' },
  move: { label: '이동', score: 0.72, domain: 'move' },
  travel: { label: '이동', score: 0.72, domain: 'move' },
  study: { label: '학습', score: 0.7, domain: 'general' },
  general: { label: '전반', score: 0.68, domain: 'general' },
}

const getReliabilityLabel = (score: number): string => {
  if (score >= 85) return '높음'
  if (score >= 65) return '중간'
  return '보수 해석'
}

const buildSavedDatePresentation = (savedDate: SavedCalendarDetail) => {
  const categories = jsonToStringArray(savedDate.categories)
  const bestTimes = jsonToStringArray(savedDate.bestTimes)
  const recommendations = jsonToStringArray(savedDate.recommendations)
  const warnings = jsonToStringArray(savedDate.warnings)
  const focusCategory = categories[0] || 'general'
  const focus = DOMAIN_LABELS[focusCategory] || DOMAIN_LABELS.general
  const summary =
    savedDate.summary?.trim() || savedDate.description?.trim() || savedDate.title.trim()

  const surfaceCards: Array<{
    key: 'action' | 'risk' | 'window' | 'branch'
    label: string
    summary: string
    tag?: string
    details?: string[]
    visual?: { kind: 'branch'; rows: Array<{ label: string; text: string }> }
  }> = []

  if (recommendations.length > 0) {
    surfaceCards.push({
      key: 'action',
      label: '우선 행동',
      summary: recommendations[0],
      tag: focus.label,
      details: recommendations.slice(1, 3),
    })
  }

  if (warnings.length > 0) {
    surfaceCards.push({
      key: 'risk',
      label: '리스크',
      summary: warnings[0],
      tag: getReliabilityLabel(savedDate.score),
      details: warnings.slice(1, 3),
    })
  }

  if (bestTimes.length > 0) {
    surfaceCards.push({
      key: 'window',
      label: '강한 창',
      summary: `${bestTimes[0]}에 움직일 때 체감이 가장 선명합니다.`,
      details: bestTimes.slice(1, 3),
    })
  }

  if (recommendations.length > 1 || warnings.length > 1) {
    surfaceCards.push({
      key: 'branch',
      label: '가능한 전개',
      summary:
        recommendations[0] && warnings[0]
          ? `${focus.label}은 열려 있지만 조건을 놓치면 흐름이 쉽게 꺾입니다.`
          : `${focus.label} 흐름은 실행과 보류 조건을 같이 봐야 합니다.`,
      visual: {
        kind: 'branch',
        rows: [
          ...(recommendations[0] ? [{ label: '진입', text: recommendations[0] }] : []),
          ...(warnings[0] ? [{ label: '중단', text: warnings[0] }] : []),
          ...(bestTimes[0] ? [{ label: '타이밍', text: bestTimes[0] }] : []),
        ].slice(0, 3),
      },
      details: [...recommendations.slice(1, 2), ...warnings.slice(1, 2)].slice(0, 2),
    })
  }

  return {
    daySummary: {
      date: savedDate.date,
      summary,
      focusDomain: focus.label,
      reliability: getReliabilityLabel(savedDate.score),
    },
    surfaceCards,
    timingSignals: bestTimes,
    recommendedActions: recommendations,
    cautions: warnings,
    topDomains: categories
      .map((category) => DOMAIN_LABELS[category] || DOMAIN_LABELS.general)
      .slice(0, 3)
      .map((item) => ({
        domain: item.domain,
        label: item.label,
        score: item.score,
      })),
  }
}

// GET - specific saved date detail
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

        const categories = jsonToStringArray(savedDate.categories as Prisma.JsonValue)
        const bestTimes = jsonToStringArray(savedDate.bestTimes as Prisma.JsonValue)
        const recommendations = jsonToStringArray(savedDate.recommendations)
        const warnings = jsonToStringArray(savedDate.warnings)

        return apiSuccess({
          savedDate: {
            ...savedDate,
            categories,
            bestTimes,
            sajuFactors: savedDate.sajuFactors,
            astroFactors: savedDate.astroFactors,
            recommendations,
            warnings,
            presentation: buildSavedDatePresentation({
              date: savedDate.date,
              score: savedDate.score,
              title: savedDate.title,
              description: savedDate.description,
              summary: savedDate.summary,
              categories: savedDate.categories as Prisma.JsonValue,
              bestTimes: savedDate.bestTimes as Prisma.JsonValue,
              recommendations: savedDate.recommendations as Prisma.JsonValue,
              warnings: savedDate.warnings as Prisma.JsonValue,
            }),
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

// DELETE - delete specific saved date
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
