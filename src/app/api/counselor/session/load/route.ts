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
      sessionId: searchParams.get('sessionId') ?? undefined,
    })
    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'validation_failed', details: queryValidation.error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    const { sessionId } = queryValidation.data

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
      // Get most recent session for this user
      chatSession = await prisma.counselorChatSession.findFirst({
        where: {
          userId,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    }

    if (!chatSession) {
      return NextResponse.json({ messages: [] })
    }

    // Two response shapes — older callers (destiny Chat / deprecated
    // useChatSession) read the flat fields; compat counselor expects a
    // nested `session` object with `meta` (couple snapshot). Return
    // both so neither side has to change in lockstep.
    return NextResponse.json({
      sessionId: chatSession.id,
      messages: chatSession.messages,
      summary: chatSession.summary,
      keyTopics: chatSession.keyTopics,
      session: {
        id: chatSession.id,
        messages: chatSession.messages,
        summary: chatSession.summary,
        keyTopics: chatSession.keyTopics,
        meta: chatSession.meta,
      },
    })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/load',
    limit: 60,
    windowSeconds: 60,
  })
)
