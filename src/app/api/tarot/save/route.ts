import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  type ApiContext,
  apiSuccess,
  apiError,
  ErrorCodes,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface SaveTarotRequest {
  question: string
  theme?: string
  spreadId: string
  spreadTitle: string
  cards: Array<{
    cardId: string
    name: string
    image: string
    isReversed: boolean
    position: string
  }>
  overallMessage?: string
  cardInsights?: Array<{
    position: string
    card_name: string
    is_reversed: boolean
    interpretation: string
  }>
  guidance?: string
  affirmation?: string
  source?: 'standalone' | 'counselor'
  counselorSessionId?: string
  locale?: string
}

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const body: SaveTarotRequest = await req.json()
    const {
      question,
      theme,
      spreadId,
      spreadTitle,
      cards,
      overallMessage,
      cardInsights,
      guidance,
      affirmation,
      source = 'standalone',
      counselorSessionId,
      locale = 'ko',
    } = body

    // 입력 검증 강화
    if (!question || typeof question !== 'string' || question.length > 1000) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_question')
    }
    if (!spreadId || typeof spreadId !== 'string' || spreadId.length > 100) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_spreadId')
    }
    if (!spreadTitle || typeof spreadTitle !== 'string' || spreadTitle.length > 200) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_spreadTitle')
    }
    if (!cards || !Array.isArray(cards) || cards.length === 0 || cards.length > 20) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_cards')
    }
    if (theme && (typeof theme !== 'string' || theme.length > 100)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_theme')
    }
    if (overallMessage && (typeof overallMessage !== 'string' || overallMessage.length > 5000)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_overallMessage')
    }
    if (guidance && (typeof guidance !== 'string' || guidance.length > 2000)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_guidance')
    }
    if (affirmation && (typeof affirmation !== 'string' || affirmation.length > 500)) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_affirmation')
    }

    const tarotReading = await prisma.tarotReading.create({
      data: {
        userId: context.userId!,
        question,
        theme,
        spreadId,
        spreadTitle,
        cards,
        overallMessage,
        cardInsights,
        guidance,
        affirmation,
        source,
        counselorSessionId,
        locale,
      },
    })

    return apiSuccess({
      success: true,
      readingId: tarotReading.id,
    })
  },
  createAuthenticatedGuard({
    route: '/api/tarot/save',
    limit: 60,
    windowSeconds: 60,
  })
)

export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const { searchParams } = new URL(req.url)
    const limitParam = parseInt(searchParams.get('limit') || '10', 10)
    const offsetParam = parseInt(searchParams.get('offset') || '0', 10)
    const theme = searchParams.get('theme')

    // 입력 검증
    const limit = Math.min(Math.max(1, limitParam), 100) // 1-100
    const offset = Math.max(0, offsetParam)
    if (theme && theme.length > 100) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_theme')
    }

    const where = {
      userId: context.userId!,
      ...(theme && { theme }),
    }

    const [readings, total] = await Promise.all([
      prisma.tarotReading.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          createdAt: true,
          question: true,
          theme: true,
          spreadTitle: true,
          cards: true,
          overallMessage: true,
          source: true,
        },
      }),
      prisma.tarotReading.count({ where }),
    ])

    return apiSuccess({
      success: true,
      readings,
      total,
      hasMore: offset + readings.length < total,
    })
  },
  createAuthenticatedGuard({
    route: '/api/tarot/save',
    limit: 60,
    windowSeconds: 60,
  })
)
