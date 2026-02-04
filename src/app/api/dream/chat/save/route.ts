// src/app/api/dream/chat/save/route.ts
// Dream Chat History Save API - 드림 상담 대화 저장

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
import { type ChatMessage } from '@/lib/api'
import { dreamChatSaveRequestSchema, dreamChatSaveGetQuerySchema } from '@/lib/api/zodValidation'
import { parseRequestBody } from '@/lib/api/requestParser'

// POST: 드림 상담 대화 저장
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await parseRequestBody(req, { context: 'Dream Chat Save' })
    if (!rawBody || typeof rawBody !== 'object') {
      return apiError(ErrorCodes.BAD_REQUEST, 'Invalid request body')
    }

    const validationResult = dreamChatSaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[DreamChatSave POST] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { dreamText, messages, summary, locale = 'ko' } = validationResult.data

    // Build full report from messages
    const fullReport = messages
      .map((m) => `${m.role === 'user' ? '👤' : '🌙'} ${m.content}`)
      .join('\n\n')

    const autoSummary =
      summary || messages.find((m) => m.role === 'assistant')?.content.slice(0, 200) || '드림 상담'

    const userQuestions = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join(' | ')

    try {
      const consultation = await prisma.consultationHistory.create({
        data: {
          userId: context.userId!,
          theme: 'dream',
          summary: autoSummary,
          fullReport,
          jungQuotes: undefined,
          signals: dreamText ? { dreamText: dreamText.slice(0, 1000) } : undefined,
          userQuestion: userQuestions.slice(0, 500),
          locale,
        },
      })

      // Update PersonaMemory (non-blocking, errors don't fail the request)
      try {
        const existing = await prisma.personaMemory.findUnique({
          where: { userId: context.userId! },
        })

        if (existing) {
          const lastTopics = (existing.lastTopics as string[]) || []
          const dominantThemes = (existing.dominantThemes as string[]) || []

          if (!dominantThemes.includes('dream')) {
            dominantThemes.push('dream')
          }

          const updatedTopics = ['dream', ...lastTopics.filter((t) => t !== 'dream')].slice(0, 10)

          await prisma.personaMemory.update({
            where: { userId: context.userId! },
            data: {
              dominantThemes,
              lastTopics: updatedTopics,
              sessionCount: existing.sessionCount + 1,
            },
          })
        } else {
          await prisma.personaMemory.create({
            data: {
              userId: context.userId!,
              dominantThemes: ['dream'],
              lastTopics: ['dream'],
              sessionCount: 1,
            },
          })
        }
      } catch (memoryError) {
        logger.error('[DreamChatSave] PersonaMemory update failed', { error: memoryError })
      }

      return apiSuccess({
        consultationId: consultation.id,
        message: 'Chat history saved',
      })
    } catch (err) {
      logger.error('[DreamChatSave POST] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to save chat history')
    }
  },
  createAuthenticatedGuard({
    route: '/api/dream/chat/save',
    limit: 30,
    windowSeconds: 60,
  })
)

// GET: 이전 드림 상담 기록 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const { searchParams } = new URL(req.url)
    const queryValidation = dreamChatSaveGetQuerySchema.safeParse({
      limit: searchParams.get('limit') || undefined,
    })
    const limitCount = queryValidation.success ? queryValidation.data.limit : 20

    try {
      const consultations = await prisma.consultationHistory.findMany({
        where: {
          userId: context.userId!,
          theme: 'dream',
        },
        orderBy: { createdAt: 'desc' },
        take: limitCount,
        select: {
          id: true,
          createdAt: true,
          summary: true,
          fullReport: true,
          signals: true,
          userQuestion: true,
        },
      })

      const memory = await prisma.personaMemory.findUnique({
        where: { userId: context.userId! },
        select: {
          sessionCount: true,
          dominantThemes: true,
          lastTopics: true,
          keyInsights: true,
          emotionalTone: true,
        },
      })

      return apiSuccess({
        consultations: consultations.map((c) => ({
          id: c.id,
          createdAt: c.createdAt.toISOString(),
          summary: c.summary,
          dreamText: (c.signals as Record<string, unknown>)?.dreamText || null,
          userQuestions: c.userQuestion,
          messages: parseMessagesFromReport(c.fullReport),
        })),
        memory: memory
          ? {
              sessionCount: memory.sessionCount,
              dominantThemes: memory.dominantThemes,
              recentTopics: memory.lastTopics,
              keyInsights: memory.keyInsights,
              emotionalTone: memory.emotionalTone,
            }
          : null,
      })
    } catch (err) {
      logger.error('[DreamChatSave GET] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch history')
    }
  },
  createAuthenticatedGuard({
    route: '/api/dream/chat/save',
    limit: 30,
    windowSeconds: 60,
  })
)

// Helper to parse messages from saved fullReport
function parseMessagesFromReport(fullReport: string): ChatMessage[] {
  if (!fullReport) {
    return []
  }

  const messages: ChatMessage[] = []
  const parts = fullReport.split(/\n\n/)

  for (const part of parts) {
    if (part.startsWith('👤')) {
      messages.push({ role: 'user', content: part.slice(2).trim() })
    } else if (part.startsWith('🌙')) {
      messages.push({ role: 'assistant', content: part.slice(2).trim() })
    }
  }

  return messages
}
