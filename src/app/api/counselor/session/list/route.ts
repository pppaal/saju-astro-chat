import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import {
  counselorSessionListQuerySchema,
  counselorSessionDeleteQuerySchema,
  counselorSessionRenameRequestSchema,
  createValidationErrorResponse,
} from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

// GET: List all chat sessions for a user
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const searchParams = req.nextUrl.searchParams
    const queryValidation = counselorSessionListQuerySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      type: searchParams.get('type') ?? undefined,
    })
    if (!queryValidation.success) {
      return createValidationErrorResponse(queryValidation.error, {
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }
    const { limit, type } = queryValidation.data

    // Single query to get user's sessions, optionally scoped to one
    // service type (destiny / compat).
    //
    // We fetch `messages` here just to derive a fallback title for
    // sessions that predate the auto-titler (PR #193). The sidebar
    // shouldn't render the entire conversation, so we strip `messages`
    // before sending and only keep the derived 30-char title.
    const rows = await prisma.counselorChatSession.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        locale: true,
        messageCount: true,
        summary: true,
        keyTopics: true,
        messages: true,
        // 사이드바 부제용 — destiny: meta.profile.name / compat: meta.persons[].name.
        // 사이드바 리스트 응답이 가벼워야 하므로 메시지처럼 통째로 들고 와서
        // 클라가 필요한 필드만 추출 (meta 자체가 수~수십 KB 짜리 큰 값은 아님).
        meta: true,
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true,
      },
    })

    type ChatMsg = { role?: string; content?: string }
    const sessions = rows.map((row) => {
      const { messages, ...rest } = row
      let title = rest.title
      if (!title || !title.trim()) {
        const msgs = Array.isArray(messages) ? (messages as ChatMsg[]) : []
        const firstUser = msgs.find((m) => m && m.role === 'user')?.content
        if (firstUser && typeof firstUser === 'string') {
          const cleaned = firstUser.replace(/\s+/g, ' ').trim()
          title = cleaned.length <= 30 ? cleaned : `${cleaned.slice(0, 29).trim()}…`
        }
      }
      return { ...rest, title }
    })

    return NextResponse.json({ sessions })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/list',
    limit: 60,
    windowSeconds: 60,
  })
)

// DELETE: Delete a specific chat session
export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const searchParams = req.nextUrl.searchParams
    const deleteValidation = counselorSessionDeleteQuerySchema.safeParse({
      sessionId: searchParams.get('sessionId') ?? undefined,
    })
    if (!deleteValidation.success) {
      return createValidationErrorResponse(deleteValidation.error, {
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }
    const { sessionId } = deleteValidation.data

    // Verify ownership and delete
    const chatSession = await prisma.counselorChatSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
    })

    if (!chatSession) {
      return createErrorResponse({
        code: ErrorCodes.NOT_FOUND,
        message: 'Session not found',
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }

    await prisma.counselorChatSession.delete({
      where: { id: sessionId },
    })

    return NextResponse.json({ success: true })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/list',
    limit: 30,
    windowSeconds: 60,
  })
)

// PATCH: rename a chat session. Body: { sessionId, title }
export const PATCH = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid JSON body',
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }

    const validation = counselorSessionRenameRequestSchema.safeParse(rawBody)
    if (!validation.success) {
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }
    const { sessionId, title } = validation.data

    // Verify ownership before update.
    const existing = await prisma.counselorChatSession.findFirst({
      where: { id: sessionId, userId },
      select: { id: true },
    })
    if (!existing) {
      return createErrorResponse({
        code: ErrorCodes.NOT_FOUND,
        message: 'Session not found',
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }

    const updated = await prisma.counselorChatSession.update({
      where: { id: sessionId },
      data: { title },
      select: { id: true, title: true, updatedAt: true },
    })

    return NextResponse.json({ success: true, session: updated })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/list',
    limit: 30,
    windowSeconds: 60,
  })
)
