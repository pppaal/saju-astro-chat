import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { HTTP_STATUS } from '@/lib/constants/http'
import { enforceBodySize } from '@/lib/http'
import { BODY_LIMITS } from '@/lib/constants/api-limits'
import { counselorSessionSaveRequestSchema } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const userId = context.userId!

    const oversized = enforceBodySize(req, BODY_LIMITS.LARGE)
    if (oversized) {
      return oversized
    }

    // Safe JSON parsing
    let rawBody
    try {
      const text = await req.text()
      if (!text || text.trim() === '') {
        return NextResponse.json({ error: 'empty_body' }, { status: HTTP_STATUS.BAD_REQUEST })
      }
      rawBody = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: HTTP_STATUS.BAD_REQUEST })
    }

    // Validate with Zod
    const validationResult = counselorSessionSaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Counselor session save] validation failed', {
        errors: validationResult.error.issues,
      })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const { sessionId, theme = 'chat', messages, locale = 'ko' } = validationResult.data

    if (!sessionId || !messages.length) {
      return NextResponse.json({ error: 'invalid_request' }, { status: HTTP_STATUS.BAD_REQUEST })
    }

    const existing = await prisma.counselorChatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    })

    if (existing && existing.userId !== userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: HTTP_STATUS.FORBIDDEN })
    }

    const chatSession = existing
      ? await prisma.counselorChatSession.update({
          where: { id: sessionId },
          data: {
            messages: messages as never,
            messageCount: messages.length,
            lastMessageAt: new Date(),
          },
        })
      : await prisma.counselorChatSession.create({
          data: {
            id: sessionId,
            userId,
            theme,
            locale,
            messages,
            messageCount: messages.length,
            lastMessageAt: new Date(),
          },
        })

    return NextResponse.json({ success: true, sessionId: chatSession.id })
  },
  createAuthenticatedGuard({
    route: '/api/counselor/session/save',
    limit: 30,
    windowSeconds: 60,
  })
)
