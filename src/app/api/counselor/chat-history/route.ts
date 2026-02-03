import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { HTTP_STATUS } from '@/lib/constants/http'
import { logger } from '@/lib/logger'
import {
  GetChatHistorySchema,
  PostChatHistorySchema,
  PatchChatHistorySchema,
  type ChatMessage,
} from './validation'

export const dynamic = 'force-dynamic'

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
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      logger.warn('[chat-history GET] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
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
      return NextResponse.json({ error: 'invalid_body' }, { status: HTTP_STATUS.BAD_REQUEST })
    }

    const validation = PostChatHistorySchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      logger.warn('[chat-history POST] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const { sessionId, theme, locale, userMessage, assistantMessage } = validation.data

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
        const existingSession = await prisma.counselorChatSession.findUnique({
          where: { id: sessionId, userId },
        })

        if (!existingSession) {
          return NextResponse.json(
            { error: 'session_not_found' },
            { status: HTTP_STATUS.NOT_FOUND }
          )
        }

        const existingMessages = (existingSession.messages as ChatMessage[]) || []
        const updatedMessages = [...existingMessages, ...newMessages]

        const updated = await prisma.counselorChatSession.update({
          where: { id: sessionId },
          data: {
            messages: updatedMessages,
            messageCount: updatedMessages.length,
            lastMessageAt: now,
          },
        });

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
            theme,
            locale,
            messages: newMessages,
            messageCount: newMessages.length,
            lastMessageAt: now,
          },
        })

        // PersonaMemory 생성 또는 업데이트
        await prisma.personaMemory.upsert({
          where: { userId },
          create: {
            userId,
            sessionCount: 1,
            lastTopics: [theme],
          },
          update: {
            sessionCount: { increment: 1 },
          },
        });

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
      return NextResponse.json({ error: 'invalid_body' }, { status: HTTP_STATUS.BAD_REQUEST })
    }

    const validation = PatchChatHistorySchema.safeParse(body)
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      logger.warn('[chat-history PATCH] Validation failed', { errors: validation.error.issues })
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const { sessionId, summary, keyTopics } = validation.data

      const updated = await prisma.counselorChatSession.update({
        where: { id: sessionId, userId },
        data: {
          ...(summary && { summary }),
          ...(keyTopics && { keyTopics }),
        },
      });

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
