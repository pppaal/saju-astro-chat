import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { HTTP_STATUS } from '@/lib/constants/http'

export const dynamic = 'force-dynamic'

// GET: List all chat sessions for a user (optionally filtered by theme)
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

      const searchParams = req.nextUrl.searchParams
      const theme = searchParams.get('theme')
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

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
      });

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
      const sessionId = searchParams.get('sessionId')

      if (!sessionId) {
        return NextResponse.json(
          { error: 'session_id_required' },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

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
      });

    return NextResponse.json({ success: true })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/list',
    limit: 30,
    windowSeconds: 60,
  })
)
