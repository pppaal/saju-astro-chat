import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'

export const dynamic = 'force-dynamic'

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const userId = context.userId!

      // Safe JSON parsing
      let body
      try {
        const text = await req.text()
        if (!text || text.trim() === '') {
          return NextResponse.json({ error: 'empty_body' }, { status: HTTP_STATUS.BAD_REQUEST })
        }
        body = JSON.parse(text)
      } catch {
        return NextResponse.json({ error: 'invalid_json' }, { status: HTTP_STATUS.BAD_REQUEST })
      }

      const { sessionId, theme, locale, messages } = body

      if (!sessionId || !messages || !Array.isArray(messages)) {
        return NextResponse.json({ error: 'invalid_request' }, { status: HTTP_STATUS.BAD_REQUEST })
      }

      // Upsert: create if not exists, update if exists
      const chatSession = await prisma.counselorChatSession.upsert({
        where: { id: sessionId },
        update: {
          messages,
          messageCount: messages.length,
          lastMessageAt: new Date(),
        },
        create: {
          id: sessionId,
          userId,
          theme: theme || 'chat',
          locale: locale || 'ko',
          messages,
          messageCount: messages.length,
          lastMessageAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, sessionId: chatSession.id })
    } catch (error) {
      logger.error('[Counselor Session Save Error]:', error)
      return NextResponse.json(
        { error: 'internal_server_error' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/save',
    limit: 30,
    windowSeconds: 60,
  })
)
