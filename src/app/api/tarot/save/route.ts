import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  type ApiContext,
  apiSuccess,
  apiError,
  ErrorCodes,
} from '@/lib/api/middleware'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { tarotSaveRequestSchema, tarotQuerySchema } from '@/lib/api/zodValidation'
import {
  buildStoredCardsPayload,
  extractStoredCards,
  extractStoredQuestionContext,
} from '@/lib/tarot/savedReadingPayload'

export const dynamic = 'force-dynamic'

function normalizeTarotSavePayload(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') {
    return raw
  }

  const payload = raw as Record<string, unknown>
  if (!Array.isArray(payload.cards)) {
    return payload
  }

  return {
    ...payload,
    cards: payload.cards.map((card) => {
      if (!card || typeof card !== 'object') {
        return card
      }
      const cardObj = card as Record<string, unknown>
      return {
        ...cardObj,
        cardId: typeof cardObj.cardId === 'number' ? String(cardObj.cardId) : cardObj.cardId,
      }
    }),
  }
}

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await req.json().catch(() => null)
    if (!rawBody || typeof rawBody !== 'object') {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON body')
    }

    const normalizedBody = normalizeTarotSavePayload(rawBody)

    // Validate request body with Zod
    const validationResult = tarotSaveRequestSchema.safeParse(normalizedBody)
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
      questionContext,
      clarifierCard,
      followupTurns,
    } = body

    // clarifierCard / followupTurns 는 신규 컬럼이라 마이그레이션이 아직 적용되지
    // 않은 환경에서도 기본 저장은 살아남도록 "값이 실제로 들어왔을 때만" data 에
    // 포함시킨다. 처음부터 Prisma.JsonNull 로 박아 넣으면 INSERT 가 항상 그 컬럼을
    // 참조해 컬럼이 없는 DB 에선 매 저장이 500 으로 죽는다.
    const createData: Prisma.TarotReadingUncheckedCreateInput = {
      userId: context.userId!,
      question,
      spreadId,
      spreadTitle,
      cards: buildStoredCardsPayload(cards, questionContext),
      overallMessage,
      cardInsights,
      guidance,
      affirmation,
      source,
      counselorSessionId,
      locale,
    }
    if (clarifierCard !== undefined) {
      createData.clarifierCard = clarifierCard
    }
    if (followupTurns !== undefined) {
      createData.followupTurns = followupTurns
    }

    const tarotReading = await prisma.tarotReading.create({ data: createData })

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
    })

    if (!queryValidation.success) {
      logger.warn('[TarotSave] Invalid query parameters', { errors: queryValidation.error.issues })
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_query_parameters')
    }

    const { limit = 10, offset = 0 } = queryValidation.data

    const where = {
      userId: context.userId!,
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
          spreadId: true,
          spreadTitle: true,
          cards: true,
          overallMessage: true,
          guidance: true,
          cardInsights: true,
          source: true,
          clarifierCard: true,
          followupTurns: true,
        },
      }),
      prisma.tarotReading.count({ where }),
    ])

    const normalizedReadings = readings.map((reading) => ({
      ...reading,
      cards: extractStoredCards(reading.cards),
      questionContext: extractStoredQuestionContext(reading.cards),
    }))

    return apiSuccess({
      success: true,
      readings: normalizedReadings,
      total,
      hasMore: offset + normalizedReadings.length < total,
    })
  },
  createAuthenticatedGuard({
    route: '/api/tarot/save',
    limit: 60,
    windowSeconds: 60,
  })
)
