import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { counselorSessionLoadQuerySchema } from '@/lib/api/zodValidation'
import { HTTP_STATUS } from '@/lib/constants/http'

export const dynamic = 'force-dynamic'

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const searchParams = req.nextUrl.searchParams
    const queryValidation = counselorSessionLoadQuerySchema.safeParse({
      theme: searchParams.get('theme') ?? undefined,
      sessionId: searchParams.get('sessionId') ?? undefined,
    })
    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'validation_failed', details: queryValidation.error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    const { theme, sessionId } = queryValidation.data

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
