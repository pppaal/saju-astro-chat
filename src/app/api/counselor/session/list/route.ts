import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, extractLocale, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import {
  counselorSessionListQuerySchema,
  counselorSessionDeleteQuerySchema,
  createValidationErrorResponse,
} from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

// GET: List all chat sessions for a user (optionally filtered by theme)
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const searchParams = req.nextUrl.searchParams
    const queryValidation = counselorSessionListQuerySchema.safeParse({
      theme: searchParams.get('theme') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })
    if (!queryValidation.success) {
      return createValidationErrorResponse(queryValidation.error, {
        locale: extractLocale(req),
        route: 'counselor/session/list',
      })
    }
    const { theme, limit } = queryValidation.data

    // Single query to get user's sessions
    const sessions = await prisma.counselorChatSession.findMany({
      where: {
        userId,
        ...(theme && { theme }),
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        theme: true,
        locale: true,
        messageCount: true,
        summary: true,
        keyTopics: true,
        createdAt: true,
        updatedAt: true,
        lastMessageAt: true,
      },
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
