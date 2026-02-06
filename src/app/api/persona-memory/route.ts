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
import type { PersonaMemory } from '@prisma/client'
import { logger } from '@/lib/logger'
import { personaMemoryPostSchema, personaMemoryPatchSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

// GET: 페르소나 기억 조회 (로그인 필요)
export const GET = withApiMiddleware<{ data: PersonaMemory | null; isNewUser: boolean }>(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      const memory = await prisma.personaMemory.findUnique({
        where: { userId: context.userId! },
      })

      return apiSuccess({
        data: memory ?? null,
        isNewUser: !memory,
      })
    } catch (err) {
      logger.error('[PersonaMemory GET] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch persona memory')
    }
  },
  createAuthenticatedGuard({
    route: '/api/persona-memory',
    limit: 60,
    windowSeconds: 60,
  })
)

// POST: 페르소나 기억 생성/업데이트
export const POST = withApiMiddleware<{ data: PersonaMemory; action: string }>(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json()

    const validationResult = personaMemoryPostSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[PersonaMemory POST] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const {
      dominantThemes,
      keyInsights,
      emotionalTone,
      growthAreas,
      lastTopics,
      recurringIssues,
      birthChart,
      sajuProfile,
    } = validationResult.data

    try {
      const existing = await prisma.personaMemory.findUnique({
        where: { userId: context.userId! },
      })

      if (existing) {
        const updated = await prisma.personaMemory.update({
          where: { userId: context.userId! },
          data: {
            dominantThemes: (dominantThemes ?? existing.dominantThemes) as Prisma.InputJsonValue,
            keyInsights: (keyInsights ?? existing.keyInsights) as Prisma.InputJsonValue,
            emotionalTone: emotionalTone ?? existing.emotionalTone,
            growthAreas: (growthAreas ?? existing.growthAreas) as Prisma.InputJsonValue,
            lastTopics: (lastTopics ?? existing.lastTopics) as Prisma.InputJsonValue,
            recurringIssues: (recurringIssues ?? existing.recurringIssues) as Prisma.InputJsonValue,
            birthChart: (birthChart ?? existing.birthChart) as Prisma.InputJsonValue,
            sajuProfile: (sajuProfile ?? existing.sajuProfile) as Prisma.InputJsonValue,
          },
        })

        return apiSuccess({ data: updated, action: 'updated' })
      } else {
        const created = await prisma.personaMemory.create({
          data: {
            userId: context.userId!,
            dominantThemes,
            keyInsights,
            emotionalTone,
            growthAreas,
            lastTopics,
            recurringIssues,
            sessionCount: 0,
            birthChart: birthChart as Prisma.InputJsonValue,
            sajuProfile: sajuProfile as Prisma.InputJsonValue,
          },
        })

        return apiSuccess({ data: created, action: 'created' })
      }
    } catch (err) {
      logger.error('[PersonaMemory POST] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to save persona memory')
    }
  },
  createAuthenticatedGuard({
    route: '/api/persona-memory',
    limit: 30,
    windowSeconds: 60,
  })
)

// PATCH: 페르소나 기억 부분 업데이트 (통찰 추가 등)
export const PATCH = withApiMiddleware<{
  data: PersonaMemory
  action: string
  changed?: boolean
}>(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json()

    const validationResult = personaMemoryPatchSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[PersonaMemory PATCH] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { action, data = {} } = validationResult.data

    try {
      const existing = await prisma.personaMemory.findUnique({
        where: { userId: context.userId! },
      })

      if (!existing) {
        return apiError(ErrorCodes.NOT_FOUND, '페르소나 기억이 없습니다. 먼저 생성해주세요.')
      }

      const updateData: Record<string, unknown> = {}

      switch (action) {
        case 'add_insight': {
          const currentInsights = (existing.keyInsights as string[]) || []
          const insight = data.insight as string | undefined
          if (insight && !currentInsights.includes(insight)) {
            updateData.keyInsights = [...currentInsights, insight]
          }
          break
        }
        case 'add_growth_area': {
          const currentGrowth = (existing.growthAreas as string[]) || []
          const area = data.growthArea as string | undefined
          if (area && !currentGrowth.includes(area)) {
            updateData.growthAreas = [...currentGrowth, area]
          }
          break
        }
        case 'add_recurring_issue': {
          const currentIssues = (existing.recurringIssues as string[]) || []
          const issue = data.recurringIssue as string | undefined
          if (issue && !currentIssues.includes(issue)) {
            updateData.recurringIssues = [...currentIssues, issue]
          }
          break
        }
        case 'update_emotional_tone':
          if (data.emotionalTone) {
            updateData.emotionalTone = data.emotionalTone
          }
          break

        case 'increment_session':
          updateData.sessionCount = existing.sessionCount + 1
          break

        case 'update_birth_chart':
          if (data.birthChart) {
            updateData.birthChart = data.birthChart
          }
          break

        case 'update_saju_profile':
          if (data.sajuProfile) {
            updateData.sajuProfile = data.sajuProfile
          }
          break

        default:
          return apiError(ErrorCodes.BAD_REQUEST, '지원하지 않는 액션입니다.')
      }

      if (Object.keys(updateData).length === 0) {
        return apiSuccess({ data: existing, action, changed: false })
      }

      const updated = await prisma.personaMemory.update({
        where: { userId: context.userId! },
        data: updateData,
      })

      return apiSuccess({ data: updated, action, changed: true })
    } catch (err) {
      logger.error('[PersonaMemory PATCH] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to update persona memory')
    }
  },
  createAuthenticatedGuard({
    route: '/api/persona-memory',
    limit: 30,
    windowSeconds: 60,
  })
)
