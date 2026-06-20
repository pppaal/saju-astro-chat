import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { createValidationErrorResponse } from '@/lib/api/zodValidation'
import {
  GetChatHistorySchema,
  PostChatHistorySchema,
  PatchChatHistorySchema,
  type ChatMessage,
} from './validation'

export const dynamic = 'force-dynamic'

// Sidebar shows the title in a narrow column on mobile — anything past
// ~30 chars wraps or clips. Trim whitespace, collapse runs of inner
// whitespace, and ellipsize. We keep the cap modest so even an
// unbroken Korean question fits on one line.
const CHAT_TITLE_MAX = 30
function truncateChatTitle(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= CHAT_TITLE_MAX) return cleaned
  return `${cleaned.slice(0, CHAT_TITLE_MAX - 1).trim()}…`
}

// GET: 채팅 세션 히스토리 조회
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    // Validate query parameters with Zod
    const searchParams = req.nextUrl.searchParams
    const validation = GetChatHistorySchema.safeParse({
      limit: searchParams.get('limit'),
    })

    if (!validation.success) {
      logger.warn('[chat-history GET] Validation failed', { errors: validation.error.issues })
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(req),
        route: 'counselor/chat-history',
      })
    }

    const { limit } = validation.data

    const chatSessions = await prisma.counselorChatSession.findMany({
      where: {
        userId,
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      // messages(JSON, 세션당 수십~수백 KB)는 제외 — 이 GET 의 유일한 소비자
      // (useCounselorData)는 id/summary/keyTopics/lastMessageAt 만 읽고, 전체
      // 대화는 /api/counselor/session/load 가 따로 제공한다. 포함 시 사이드바
      // 로드마다 수 MB 직렬화로 200~500ms 낭비.
      select: {
        id: true,
        summary: true,
        keyTopics: true,
        messageCount: true,
        lastMessageAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      sessions: chatSessions,
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

    const { sessionId, locale, userMessage, assistantMessage, type, meta, create } = validation.data
    const sessionType = type ?? 'destiny'

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
        // Default: unknown id → 404 (guards against arbitrary id injection).
        // Opt-in (compat): create the row with the client-supplied id so the
        // charge-time safety-net id and the client's content converge on one
        // row. P2002 = the id belongs to *another* user → keep 404 (no leak).
        if (!create) {
          return createErrorResponse({
            code: ErrorCodes.NOT_FOUND,
            message: 'Session not found',
            locale: extractLocale(req),
            route: 'counselor/chat-history',
          })
        }
        const firstUserContent = newMessages.find((m) => m.role === 'user')?.content?.trim() || ''
        const upsertTitle = firstUserContent ? truncateChatTitle(firstUserContent) : null
        try {
          const createdWithId = await prisma.counselorChatSession.create({
            data: {
              id: sessionId,
              userId,
              locale,
              type: sessionType,
              ...(upsertTitle ? { title: upsertTitle } : {}),
              ...(meta ? { meta: meta as Prisma.InputJsonValue } : {}),
              messages: newMessages,
              messageCount: newMessages.length,
              lastMessageAt: now,
            },
          })
          return NextResponse.json({ success: true, session: createdWithId, action: 'created' })
        } catch (err) {
          if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
            return createErrorResponse({
              code: ErrorCodes.NOT_FOUND,
              message: 'Session not found',
              locale: extractLocale(req),
              route: 'counselor/chat-history',
            })
          }
          throw err
        }
      }

      const existingMessages = (existingSession.messages as ChatMessage[]) || []
      const updatedMessages = [...existingMessages, ...newMessages]

      // Backfill title from the first user turn for rows that
      // predate the auto-titler. Sidebar otherwise shows "Untitled
      // chat" forever — the title only changes on a manual rename.
      const firstUserContent = updatedMessages.find((m) => m.role === 'user')?.content?.trim() || ''
      const backfillTitle =
        !existingSession.title && firstUserContent ? truncateChatTitle(firstUserContent) : undefined

      const updated = await prisma.counselorChatSession.update({
        where: { id: sessionId },
        data: {
          messages: updatedMessages,
          messageCount: updatedMessages.length,
          lastMessageAt: now,
          ...(backfillTitle ? { title: backfillTitle } : {}),
          // Persist the couple/profile snapshot if the client attaches it.
          // The server's existence-only safety-net row is created without
          // meta, so the client's first save is what carries the chart
          // context for past-chat restore — accept it on update too, not
          // just create. (Compat sends meta until it's persisted once.)
          ...(meta ? { meta: meta as Prisma.InputJsonValue } : {}),
        },
      })

      return NextResponse.json({
        success: true,
        session: updated,
        action: 'updated',
      })
    } else {
      // 새 세션 생성 — auto-derive a title from the first user turn
      // so the sidebar shows the question, not "Untitled chat".
      // User can still rename via the pencil action.
      const autoTitle = userMessage ? truncateChatTitle(userMessage) : null
      const created = await prisma.counselorChatSession.create({
        data: {
          userId,
          locale,
          type: sessionType,
          ...(autoTitle ? { title: autoTitle } : {}),
          // Prisma expects Prisma.InputJsonValue for Json columns; the
          // zod parse output is Record<string, unknown> which is
          // structurally compatible but typed loosely.
          ...(meta ? { meta: meta as Prisma.InputJsonValue } : {}),
          messages: newMessages,
          messageCount: newMessages.length,
          lastMessageAt: now,
        },
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
    })

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
