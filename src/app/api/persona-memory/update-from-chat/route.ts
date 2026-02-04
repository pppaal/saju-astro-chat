// 대화 후 PersonaMemory 자동 업데이트 API
// 채팅 완료 후 프론트엔드에서 호출하여 사용자 컨텍스트 축적

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
import { summarizeConversation } from '@/lib/ai/summarize'
import { logger } from '@/lib/logger'
import { personaMemoryUpdateSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

type ChatMessageForSummary = {
  role: 'user' | 'assistant'
  content: string
}

export const POST = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json().catch(() => null)
    if (!rawBody) {
      return apiError(ErrorCodes.BAD_REQUEST, 'invalid_body')
    }

    const validationResult = personaMemoryUpdateSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Persona memory update] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { sessionId, theme, locale, messages, saju, astro } = validationResult.data
    const userId = context.userId!

    try {
      const filteredMessages = messages.filter(
        (m): m is ChatMessageForSummary => m.role === 'user' || m.role === 'assistant'
      )
      const summary = await summarizeConversation(filteredMessages, theme, locale)

      const existingMemory = await prisma.personaMemory.findUnique({
        where: { userId },
      })

      const existingTopics = (existingMemory?.dominantThemes as string[]) || []
      const existingInsights = (existingMemory?.keyInsights as string[]) || []
      const existingIssues = (existingMemory?.recurringIssues as string[]) || []
      const existingGrowth = (existingMemory?.growthAreas as string[]) || []
      const existingLastTopics = (existingMemory?.lastTopics as string[]) || []

      const _mergedTopics = mergeAndLimit([...existingTopics, ...(summary?.keyTopics || [])], 10)
      const mergedInsights = mergeAndLimit(
        [...existingInsights, ...(summary?.keyInsights || [])],
        10
      )
      const mergedIssues = mergeAndLimit(
        [...existingIssues, ...(summary?.recurringIssues || [])],
        10
      )
      const mergedGrowth = mergeAndLimit([...existingGrowth, ...(summary?.growthAreas || [])], 5)

      const updatedLastTopics = [
        theme,
        ...existingLastTopics.filter((t: string) => t !== theme),
      ].slice(0, 5)

      const topicCounts = countOccurrences([...existingTopics, ...(summary?.keyTopics || [])])
      const dominantThemes = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic]) => topic)

      const updatedMemory = await prisma.personaMemory.upsert({
        where: { userId },
        create: {
          userId,
          sessionCount: 1,
          dominantThemes: dominantThemes,
          keyInsights: mergedInsights,
          emotionalTone: summary?.emotionalTone || 'neutral',
          growthAreas: mergedGrowth,
          lastTopics: updatedLastTopics,
          recurringIssues: mergedIssues,
          ...(saju && { sajuProfile: saju as object }),
          ...(astro && { birthChart: astro as object }),
        },
        update: {
          sessionCount: { increment: 1 },
          dominantThemes: dominantThemes,
          keyInsights: mergedInsights,
          emotionalTone: summary?.emotionalTone || existingMemory?.emotionalTone || 'neutral',
          growthAreas: mergedGrowth,
          lastTopics: updatedLastTopics,
          recurringIssues: mergedIssues,
          ...(saju && { sajuProfile: saju as object }),
          ...(astro && { birthChart: astro as object }),
        },
      })

      if (sessionId && summary) {
        await prisma.counselorChatSession.updateMany({
          where: { id: sessionId, userId },
          data: {
            summary: summary.summary,
            keyTopics: summary.keyTopics,
          },
        })
      }

      return apiSuccess({
        data: {
          sessionCount: updatedMemory.sessionCount,
          dominantThemes: updatedMemory.dominantThemes,
          emotionalTone: updatedMemory.emotionalTone,
          lastTopics: updatedMemory.lastTopics,
        },
        summary: summary?.summary,
      })
    } catch (err) {
      logger.error('[PersonaMemory update-from-chat error]', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal Server Error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/persona-memory/update-from-chat',
    limit: 30,
    windowSeconds: 60,
  })
)

function mergeAndLimit(arr: string[], max: number): string[] {
  return [...new Set(arr)].slice(0, max)
}

function countOccurrences(arr: string[]): Record<string, number> {
  return arr.reduce(
    (acc, item) => {
      acc[item] = (acc[item] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
}
