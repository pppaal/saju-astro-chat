import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { idParamSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: HTTP_STATUS.UNAUTHORIZED })
    }

    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`tarot-save:${ip}`, { limit: 30, windowSeconds: 60 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again soon.' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const rawParams = await params
    const paramValidation = idParamSchema.safeParse(rawParams)
    if (!paramValidation.success) {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    const { id } = paramValidation.data

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'user_not_found' }, { status: HTTP_STATUS.NOT_FOUND })
    }

    const reading = await prisma.tarotReading.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!reading) {
      return NextResponse.json({ error: 'reading_not_found' }, { status: HTTP_STATUS.NOT_FOUND })
    }

    const res = NextResponse.json({
      success: true,
      reading: {
        id: reading.id,
        question: reading.question,
        theme: reading.theme,
        spreadId: reading.spreadId,
        spreadTitle: reading.spreadTitle,
        cards: reading.cards,
        overallMessage: reading.overallMessage,
        cardInsights: reading.cardInsights,
        guidance: reading.guidance,
        affirmation: reading.affirmation,
        source: reading.source,
        locale: reading.locale,
        createdAt: reading.createdAt,
      },
    })
    limit.headers.forEach((value, key) => res.headers.set(key, value))
    return res
  } catch (error) {
    logger.error('[Tarot Get Error]:', error)
    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
