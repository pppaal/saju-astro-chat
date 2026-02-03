import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { HTTP_STATUS } from '@/lib/constants/http'
import {
  counselorSessionListQuerySchema,
  counselorSessionDeleteQuerySchema,
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
      return NextResponse.json(
        { error: 'validation_failed', details: queryValidation.error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
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
      return NextResponse.json(
        { error: 'validation_failed', details: deleteValidation.error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
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
      return NextResponse.json({ error: 'session_not_found' }, { status: HTTP_STATUS.NOT_FOUND })
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
