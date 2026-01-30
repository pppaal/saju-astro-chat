import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'

export const dynamic = 'force-dynamic'

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
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
    } catch (error) {
      logger.error('[Counselor Session Load Error]:', error)
      return NextResponse.json(
        { error: 'internal_server_error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/load',
    limit: 60,
    windowSeconds: 60,
  })
)
