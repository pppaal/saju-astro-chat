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
import { createHash } from 'crypto'
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

// 같은 리딩의 중복 저장을 막기 위한 *결정적* PK. 같은 사용자가 같은
// 스프레드·카드·해석(overallMessage)을 저장하면 항상 같은 id 로 떨어져,
// DB 유니크 PK 가 두 번째 INSERT 를 원자적으로 거부한다(P2002). 이로써
// 자동저장+수동저장 레이스 / 재시도 / 로컬→서버 마이그레이션 재POST 에서
// 생기던 중복 히스토리 행을 막는다. 클라이언트 변경 불필요.
//
// overallMessage(LLM 고유 출력)를 키에 포함하므로 *서로 다른* 리딩(우연히
// 같은 카드 조합)끼리는 충돌하지 않는다. 해석이 비어 식별이 불안하면 null →
// cuid 자동 생성으로 폴백(오병합 방지가 중복 방지보다 우선).
function deterministicReadingId(
  userId: string,
  spreadId: string,
  cards: unknown,
  overallMessage?: string | null
): string | null {
  const overall = (overallMessage || '').trim()
  if (!overall) return null
  const sig = JSON.stringify({ userId, spreadId, cards, overall })
  return `tr_${createHash('sha256').update(sig).digest('hex').slice(0, 24)}`
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
      readingId: providedReadingId,
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

    // 서버가 발급한 readingId(interpret-stream x-reading-id)가 오면 그 행을
    // upsert 한다 — 차감 시점 안전망이 만든 존재 행(cards/question 만 있고 해석은
    // 비어 있음)을 여기서 채운다. 차감과 기록이 같은 행으로 수렴(중복 차단).
    if (providedReadingId) {
      const existing = await prisma.tarotReading.findUnique({
        where: { id: providedReadingId },
        select: { id: true, userId: true },
      })
      if (existing) {
        // 소유권 가드 — 남의 readingId 면 건드리지도, 정보 누출도 하지 않는다.
        if (existing.userId !== context.userId!) {
          return apiError(ErrorCodes.NOT_FOUND, 'reading not found')
        }
        // 존재 행에 해석을 채운다. create 와 동일하게 P2022(누락 컬럼) 방어로
        // strippable 컬럼만 빼며 재시도해 prod 마이그레이션 지연에도 살아남는다.
        const updateData: Prisma.TarotReadingUncheckedUpdateInput = {
          question,
          spreadTitle,
          cards: createData.cards,
          overallMessage,
          cardInsights,
          guidance,
          affirmation,
          source,
          locale,
        }
        if (counselorSessionId !== undefined) updateData.counselorSessionId = counselorSessionId
        if (clarifierCard !== undefined) updateData.clarifierCard = clarifierCard
        if (followupTurns !== undefined) updateData.followupTurns = followupTurns
        try {
          for (let attempt = 0; attempt < 10; attempt++) {
            try {
              await prisma.tarotReading.update({
                where: { id: providedReadingId },
                data: updateData,
              })
              break
            } catch (err) {
              const e = err as { code?: string; meta?: { column?: unknown } }
              const col = typeof e?.meta?.column === 'string' ? e.meta.column : ''
              const hit =
                e?.code === 'P2022'
                  ? [
                      'overallMessage',
                      'cardInsights',
                      'guidance',
                      'affirmation',
                      'counselorSessionId',
                      'clarifierCard',
                      'followupTurns',
                      'locale',
                      'source',
                    ].find((s) => col.includes(s))
                  : undefined
              if (!hit) throw err
              delete (updateData as Record<string, unknown>)[hit]
            }
          }
        } catch (err) {
          logger.error('[TarotSave] update failed', err instanceof Error ? err : undefined)
          const e = err as { code?: string; meta?: { column?: unknown; constraint?: unknown } }
          const diag = [
            e?.code,
            typeof e?.meta?.column === 'string' ? e.meta.column : undefined,
            typeof e?.meta?.constraint === 'string' ? e.meta.constraint : undefined,
          ]
            .filter(Boolean)
            .join(' ')
          return apiError(ErrorCodes.DATABASE_ERROR, `db ${diag || 'update_failed'}`)
        }
        return apiSuccess({ success: true, readingId: providedReadingId })
      }
      // 안전망 행이 아직 없다(클라가 서버 onComplete 보다 빨랐거나 nonce 없음) →
      // 이 id 로 새로 만든다. 아래 create 경로가 createData.id 로 생성.
      createData.id = providedReadingId
    } else {
      // 레거시 경로(서버 readingId 없음) — 결정적 PK 로 중복 저장 방지. 같은
      // 리딩은 같은 id → 두 번째 INSERT 는 유니크 제약으로 거부되고 아래에서
      // 기존 행을 그대로 돌려준다.
      const dedupeId = deterministicReadingId(
        context.userId!,
        spreadId,
        createData.cards,
        overallMessage
      )
      if (dedupeId) {
        createData.id = dedupeId
      }
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
          // 같은 리딩의 중복 저장 — PK 충돌(P2002). 새 행을 만들지 않고 이미
          // 저장된 행을 그대로 반환해 멱등 보장. id 는 결정적 dedupeId 또는
          // 서버 발급 readingId(둘 다 createData.id 에 실림). (자동저장+수동저장
          // 동시 요청도 DB 유니크 PK 가 원자적으로 막아 check-then-create 레이스
          // 없음. Postgres 는 선행 INSERT 커밋까지 블록 후 P2002 → 아래 조회 성공.)
          if (e?.code === 'P2002' && createData.id) {
            const existing = await prisma.tarotReading.findUnique({
              where: { id: createData.id as string },
            })
            if (existing) {
              logger.info('[TarotSave] duplicate save — returning existing reading', {
                id: createData.id,
              })
              tarotReading = existing
              break
            }
          }
          const col = typeof e?.meta?.column === 'string' ? e.meta.column : ''
          const hit = e?.code === 'P2022' ? STRIPPABLE.find((s) => col.includes(s)) : undefined
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
