import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'

export const dynamic = 'force-dynamic'

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

type CounselorChatPostBody = {
  sessionId?: string
  theme?: string
  locale?: string
  userMessage?: string
  assistantMessage?: string
}

type CounselorChatPatchBody = {
  sessionId?: string
  summary?: string
  keyTopics?: string[]
}

// GET: 채팅 세션 히스토리 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const userId = context.userId!

      const searchParams = req.nextUrl.searchParams
      const theme = searchParams.get('theme') || undefined
      const limit = parseInt(searchParams.get('limit') || '5')

      // 사용자 채팅 세션 조회
      const chatSessions = await prisma.counselorChatSession.findMany({
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
      })

      // 페르소나 메모리 조회
      const personaMemory = await prisma.personaMemory.findUnique({
        where: { userId },
        select: {
          sessionCount: true,
          lastTopics: true,
          recurringIssues: true,
          emotionalTone: true,
        },
      })

      return NextResponse.json({
        success: true,
        sessions: chatSessions,
        persona: personaMemory,
        isReturningUser: (personaMemory?.sessionCount || 0) > 0,
      })
    } catch (err: unknown) {
      logger.error('[CounselorChatHistory GET error]', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Internal Server Error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
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
    try {
      const userId = context.userId!

      const body = (await req.json().catch(() => null)) as CounselorChatPostBody | null
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'invalid_body' }, { status: HTTP_STATUS.BAD_REQUEST })
      }

      const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
      const theme = typeof body.theme === 'string' ? body.theme : 'chat'
      const locale = typeof body.locale === 'string' ? body.locale : 'ko'
      const userMessage = typeof body.userMessage === 'string' ? body.userMessage : ''
      const assistantMessage =
        typeof body.assistantMessage === 'string' ? body.assistantMessage : ''

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
        })

        return NextResponse.json({
          success: true,
          session: created,
          action: 'created',
        })
      }
    } catch (err: unknown) {
      logger.error('[CounselorChatHistory POST error]', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Internal Server Error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
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
    try {
      const userId = context.userId!

      const body = (await req.json().catch(() => null)) as CounselorChatPatchBody | null
      if (!body || typeof body !== 'object') {
        return NextResponse.json({ error: 'invalid_body' }, { status: HTTP_STATUS.BAD_REQUEST })
      }

      const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
      const summary = typeof body.summary === 'string' ? body.summary : ''
      const keyTopics = Array.isArray(body.keyTopics)
        ? body.keyTopics.filter((topic) => typeof topic === 'string')
        : undefined

      if (!sessionId) {
        return NextResponse.json(
          { error: 'session_id_required' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const updated = await prisma.counselorChatSession.update({
        where: { id: sessionId, userId },
        data: {
          ...(summary && { summary }),
          ...(keyTopics && { keyTopics }),
        },
      })

      return NextResponse.json({
        success: true,
        session: updated,
      })
    } catch (err: unknown) {
      logger.error('[CounselorChatHistory PATCH error]', err)
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Internal Server Error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createAuthenticatedGuard({
    route: '/api/counselor/chat-history',
    limit: 30,
    windowSeconds: 60,
  })
)
