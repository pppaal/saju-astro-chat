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
import { tarotSaveRequestSchema, tarotQuerySchema } from '@/lib/api/zodValidation'

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
    const rawBody = await req.json()

    // Validate request body with Zod
    const validationResult = tarotSaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[TarotSave] validation failed', { errors: validationResult.error.issues })
      return apiError(ErrorCodes.VALIDATION_ERROR, 'validation_failed', {
        details: validationResult.error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    const body = validationResult.data
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

    // Validate query parameters with Zod
    const queryValidation = tarotQuerySchema.safeParse({
      limit: searchParams.get('limit') || '10',
      offset: searchParams.get('offset') || '0',
      theme: searchParams.get('theme'),
    })

    if (!queryValidation.success) {
      logger.warn('[TarotSave] Invalid query parameters', { errors: queryValidation.error.issues })
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_query_parameters')
    }

    const { limit = 10, offset = 0, theme } = queryValidation.data

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
