import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, extractLocale, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import { deriveCounselorStorageSignals } from '@/app/api/destiny-map/chat-stream/lib/focusDomain'
import {
  GetChatHistorySchema,
  PostChatHistorySchema,
  PatchChatHistorySchema,
  type ChatMessage,
} from './validation'

export const dynamic = 'force-dynamic'

function mergeAndLimit(items: string[], max: number): string[] {
  return [...new Set(items.filter(Boolean))].slice(0, max)
}

function countOccurrences(items: string[]): Record<string, number> {
  return items.reduce(
    (acc, item) => {
      acc[item] = (acc[item] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )
}

async function syncPersonaMemoryTopics(params: {
  userId: string
  memoryTopics: string[]
  incrementSessionCount: boolean
}) {
  const existingMemory = await prisma.personaMemory.findUnique({
    where: { userId: params.userId },
    select: {
      sessionCount: true,
      dominantThemes: true,
      lastTopics: true,
    },
  })

  const existingThemes = (existingMemory?.dominantThemes as string[] | null) || []
  const existingLastTopics = (existingMemory?.lastTopics as string[] | null) || []
  const dominantThemes = Object.entries(
    countOccurrences([...existingThemes, ...params.memoryTopics])
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic)
  const lastTopics = mergeAndLimit([...params.memoryTopics, ...existingLastTopics], 5)

  await prisma.personaMemory.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      sessionCount: 1,
      dominantThemes,
      lastTopics,
    },
    update: {
      dominantThemes,
      lastTopics,
      ...(params.incrementSessionCount
        ? { sessionCount: { increment: 1 } }
        : { sessionCount: existingMemory?.sessionCount || 1 }),
    },
  })
}

// GET: 채팅 세션 히스토리 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    // Validate query parameters with Zod
    const searchParams = req.nextUrl.searchParams
    const validation = GetChatHistorySchema.safeParse({
      theme: searchParams.get('theme'),
      limit: searchParams.get('limit'),
    })

    if (!validation.success) {
      logger.warn('[chat-history GET] Validation failed', { errors: validation.error.issues })
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(req),
        route: 'counselor/chat-history',
      })
    }

    const { theme, limit } = validation.data

      // 병렬 쿼리: 채팅 세션 + 페르소나 메모리 동시 조회 (100-200ms 절약)
      const [chatSessions, personaMemory] = await Promise.all([
        prisma.counselorChatSession.findMany({
          where: {
            userId,
            ...(theme && { theme }),
          },
          orderBy: { updatedAt: 'desc' },
          take: limit,
          select: {
            id: true,
            theme: true,
            summary: true,
            keyTopics: true,
            messageCount: true,
            lastMessageAt: true,
            createdAt: true,
            messages: true,
          },
        }),
        prisma.personaMemory.findUnique({
          where: { userId },
          select: {
            sessionCount: true,
            lastTopics: true,
            recurringIssues: true,
            emotionalTone: true,
          },
        }),
      ]);

    return NextResponse.json({
      success: true,
      sessions: chatSessions,
      persona: personaMemory,
      isReturningUser: (personaMemory?.sessionCount || 0) > 0,
    })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/chat-history',
    limit: 60,
    windowSeconds: 60,
  })
)

// POST: 새 메시지 추가 (세션 생성/업데이트)
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    // Validate request body with Zod
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
        locale: extractLocale(req),
        route: 'counselor/chat-history',
      })
    }

    const validation = PostChatHistorySchema.safeParse(body)
    if (!validation.success) {
      logger.warn('[chat-history POST] Validation failed', { errors: validation.error.issues })
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(req),
        route: 'counselor/chat-history',
      })
    }

    const { sessionId, theme, locale, userMessage, assistantMessage } = validation.data
    const initialSignals = deriveCounselorStorageSignals({
      lastUserMessage: userMessage || null,
      theme,
    })
    const explicitTheme = theme === 'chat' ? null : theme
    const initialSessionTheme = explicitTheme || initialSignals.inferredTheme
    const initialMemoryTopics = explicitTheme ? [explicitTheme] : initialSignals.memoryTopics

      const now = new Date()
      const newMessages: ChatMessage[] = []

      if (userMessage) {
        newMessages.push({
          role: 'user',
          content: userMessage,
          timestamp: now.toISOString(),
        })
      }
      if (assistantMessage) {
        newMessages.push({
          role: 'assistant',
          content: assistantMessage,
          timestamp: now.toISOString(),
        })
      }

      if (sessionId) {
        // 기존 세션 업데이트
        const existingSession = await prisma.counselorChatSession.findFirst({
          where: { id: sessionId, userId },
        })

        if (!existingSession) {
          return createErrorResponse({
            code: ErrorCodes.NOT_FOUND,
            message: 'Session not found',
            locale: extractLocale(req),
            route: 'counselor/chat-history',
          })
        }

        const existingMessages = (existingSession.messages as ChatMessage[]) || []
        const updatedMessages = [...existingMessages, ...newMessages]
        const lastUserContent =
          [...updatedMessages].reverse().find((message) => message.role === 'user')?.content ||
          userMessage ||
          null
        const storageSignals = deriveCounselorStorageSignals({
          lastUserMessage: lastUserContent,
          theme: existingSession.theme || theme,
        })
        const storedTheme =
          existingSession.theme && existingSession.theme !== 'chat'
            ? existingSession.theme
            : explicitTheme || storageSignals.inferredTheme
        const memoryTopics =
          storedTheme !== 'chat' && storedTheme === (explicitTheme || storedTheme)
            ? [storedTheme]
            : storageSignals.memoryTopics

        const updated = await prisma.counselorChatSession.update({
          where: { id: sessionId },
          data: {
            theme: storedTheme,
            messages: updatedMessages,
            messageCount: updatedMessages.length,
            lastMessageAt: now,
          },
        });

        await syncPersonaMemoryTopics({
          userId,
          memoryTopics,
          incrementSessionCount: false,
        })

        return NextResponse.json({
          success: true,
          session: updated,
          action: 'updated',
        })
      } else {
        // 새 세션 생성
        const created = await prisma.counselorChatSession.create({
          data: {
            userId,
            theme: initialSessionTheme,
            locale,
            messages: newMessages,
            messageCount: newMessages.length,
            lastMessageAt: now,
          },
        })

        await syncPersonaMemoryTopics({
          userId,
          memoryTopics: initialMemoryTopics,
          incrementSessionCount: true,
        })

        return NextResponse.json({
          success: true,
          session: created,
          action: 'created',
        })
      }
  },
  createAuthenticatedGuard({
    route: '/api/counselor/chat-history',
    limit: 30,
    windowSeconds: 60,
  })
)

// PATCH: 세션 메타 정보 업데이트 (요약, 주요 주제)
export const PATCH = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    // Validate request body with Zod
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
        locale: extractLocale(req),
        route: 'counselor/chat-history',
      })
    }

    const validation = PatchChatHistorySchema.safeParse(body)
    if (!validation.success) {
      logger.warn('[chat-history PATCH] Validation failed', { errors: validation.error.issues })
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(req),
        route: 'counselor/chat-history',
      })
    }

    const { sessionId, summary, keyTopics } = validation.data

      const existingSession = await prisma.counselorChatSession.findFirst({
        where: { id: sessionId, userId },
        select: { id: true },
      })

      if (!existingSession) {
        return createErrorResponse({
          code: ErrorCodes.NOT_FOUND,
          message: 'Session not found',
          locale: extractLocale(req),
          route: 'counselor/chat-history',
        })
      }

      const updated = await prisma.counselorChatSession.update({
        where: { id: sessionId },
        data: {
          ...(summary && { summary }),
          ...(keyTopics && { keyTopics }),
        },
      });

      if (keyTopics?.length) {
        await syncPersonaMemoryTopics({
          userId,
          memoryTopics: mergeAndLimit(keyTopics, 6),
          incrementSessionCount: false,
        })
      }

    return NextResponse.json({
      success: true,
      session: updated,
    })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/chat-history',
    limit: 30,
    windowSeconds: 60,
  })
)
