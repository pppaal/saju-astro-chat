import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

      const searchParams = req.nextUrl.searchParams
      const theme = searchParams.get('theme') || 'chat'
      const sessionId = searchParams.get('sessionId')

      let chatSession

      if (sessionId) {
        // Load specific session by ID
        chatSession = await prisma.counselorChatSession.findFirst({
          where: {
            id: sessionId,
            userId,
          },
        })
      } else {
        // Get most recent session for this theme
        chatSession = await prisma.counselorChatSession.findFirst({
          where: {
            userId,
            theme,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        })
      }

      if (!chatSession) {
        return NextResponse.json({ messages: [] })
      }

    return NextResponse.json({
      sessionId: chatSession.id,
      messages: chatSession.messages,
      summary: chatSession.summary,
      keyTopics: chatSession.keyTopics,
    })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/load',
    limit: 60,
    windowSeconds: 60,
  })
)
