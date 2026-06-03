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

    // 누락 컬럼(P2022) 방어 — 마이그레이션이 prod 에 늦게 닿아 어떤 컬럼이
    // 아직 없으면 INSERT 가 통째로 500 으로 죽어 사용자 리딩이 영영 저장 안 됨.
    // 죽인 컬럼이 "빼도 되는" optional 이면 그 컬럼만 빼고 재시도해서 최소한
    // row 는 만든다. (직전엔 clarifierCard/followupTurns 만 처리 → 다른 컬럼이
    // 원인이면 여전히 500.)
    const STRIPPABLE = [
      'overallMessage',
      'cardInsights',
      'guidance',
      'affirmation',
      'counselorSessionId',
      'clarifierCard',
      'followupTurns',
      'locale',
      'source',
    ]
    let tarotReading
    try {
      for (let attempt = 0; attempt < 10; attempt++) {
        try {
          tarotReading = await prisma.tarotReading.create({ data: createData })
          break
        } catch (err) {
          const e = err as { code?: string; meta?: { column?: unknown } }
          const col = typeof e?.meta?.column === 'string' ? e.meta.column : ''
          const hit =
            e?.code === 'P2022' ? STRIPPABLE.find((s) => col.includes(s)) : undefined
          if (!hit) throw err
          logger.warn('[TarotSave] column missing on DB — stripping & retrying', { column: col })
          delete (createData as Record<string, unknown>)[hit]
        }
      }
      if (!tarotReading) throw new Error('create exhausted retries')
    } catch (err) {
      // 안전한 진단만 응답에 노출 (Prisma 코드 + 컬럼/제약 이름 — PII·시크릿 없음).
      // 클라이언트가 "저장 실패: 500 db P2022 cardInsights" 식으로 화면에 띄워
      // 원인을 한 번에 특정할 수 있게 한다.
      const e = err as { code?: string; meta?: { column?: unknown; constraint?: unknown } }
      logger.error('[TarotSave] create failed', err instanceof Error ? err : undefined)
      const diag = [
        e?.code,
        typeof e?.meta?.column === 'string' ? e.meta.column : undefined,
        typeof e?.meta?.constraint === 'string' ? e.meta.constraint : undefined,
      ]
        .filter(Boolean)
        .join(' ')
      return apiError(ErrorCodes.DATABASE_ERROR, `db ${diag || 'create_failed'}`)
    }

    return apiSuccess({
      success: true,
      readingId: tarotReading!.id,
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

    // clarifierCard / followupTurns 는 신규 컬럼 — 마이그레이션이 아직 적용
    // 안 된 환경에선 select 자체가 P2022(column does not exist)로 죽어 히스토리
    // 전체가 빈 화면이 되던 회귀. 1차로 신규 컬럼 포함 query 시도 → 실패하면
    // 구 컬럼만으로 한 번 더 재시도해서 최소한 옛 리딩은 보이게 한다.
    const baseSelect = {
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
    } as const

    let readings: Array<Record<string, unknown>>
    let total: number
    try {
      ;[readings, total] = await Promise.all([
        prisma.tarotReading.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: { ...baseSelect, clarifierCard: true, followupTurns: true },
        }),
        prisma.tarotReading.count({ where }),
      ])
    } catch (err) {
      // P2022 = "column not found". 마이그레이션 미적용 환경 fallback.
      const code = (err as { code?: string } | null)?.code
      if (code !== 'P2022') throw err
      logger.warn('[TarotSave] new columns missing on DB — falling back', { code })
      ;[readings, total] = await Promise.all([
        prisma.tarotReading.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
          select: baseSelect,
        }),
        prisma.tarotReading.count({ where }),
      ])
    }

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
