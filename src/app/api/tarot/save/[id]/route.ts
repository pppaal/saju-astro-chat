import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import {
  idParamSchema,
  createValidationErrorResponse,
  tarotSavePatchSchema,
} from '@/lib/api/zodValidation'
import { extractStoredCards, extractStoredQuestionContext } from '@/lib/tarot/savedReadingPayload'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = idParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return createValidationErrorResponse(paramValidation.error, {
      route: 'tarot/save/[id]',
    })
  }
  const { id } = paramValidation.data

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        const reading = await prisma.tarotReading.findFirst({
          where: {
            id,
            userId: context.userId!,
          },
        })

        if (!reading) {
          return apiError(ErrorCodes.NOT_FOUND, 'reading_not_found')
        }

        return apiSuccess({
          success: true,
          reading: {
            id: reading.id,
            question: reading.question,
            spreadId: reading.spreadId,
            spreadTitle: reading.spreadTitle,
            cards: extractStoredCards(reading.cards),
            questionContext: extractStoredQuestionContext(reading.cards),
            overallMessage: reading.overallMessage,
            cardInsights: reading.cardInsights,
            guidance: reading.guidance,
            affirmation: reading.affirmation,
            source: reading.source,
            locale: reading.locale,
            createdAt: reading.createdAt,
            clarifierCard: reading.clarifierCard,
            followupTurns: reading.followupTurns,
          },
        })
      } catch (error) {
        logger.error('[Tarot Get Error]:', error)
        return apiError(ErrorCodes.DATABASE_ERROR, 'internal_server_error')
      }
    },
    createAuthenticatedGuard({
      route: '/api/tarot/save/[id]',
      limit: 30,
      windowSeconds: 60,
    })
  )

  return handler(request as unknown as NextRequest)
}

/**
 * 저장된 리딩에 보충 카드 / followup 채팅을 늦게 채워넣는 PATCH 엔드포인트.
 * 초기 저장 (POST) 후 사용자가 결과 화면에서 "한 장 더 뽑기" 누르거나
 * "이 리딩에 대해 더 묻기" 채팅을 하면 클라이언트가 이 엔드포인트로 부분
 * 업데이트 — 새 리딩을 또 만들지 않게.
 */
export async function PATCH(request: Request, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = idParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return createValidationErrorResponse(paramValidation.error, {
      route: 'tarot/save/[id]',
    })
  }
  const { id } = paramValidation.data

  const handler = withApiMiddleware(
    async (req: NextRequest, context: ApiContext) => {
      const rawBody = await req.json().catch(() => null)
      const bodyValidation = tarotSavePatchSchema.safeParse(rawBody)
      if (!bodyValidation.success) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'validation_failed', {
          details: bodyValidation.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        })
      }

      try {
        const reading = await prisma.tarotReading.findFirst({
          where: { id, userId: context.userId! },
          select: { id: true },
        })
        if (!reading) {
          return apiError(ErrorCodes.NOT_FOUND, 'reading_not_found')
        }

        const updates: Prisma.TarotReadingUpdateInput = {}
        if (bodyValidation.data.clarifierCard !== undefined) {
          updates.clarifierCard = bodyValidation.data.clarifierCard
        }
        if (bodyValidation.data.followupTurns !== undefined) {
          updates.followupTurns = bodyValidation.data.followupTurns
        }

        try {
          await prisma.tarotReading.update({
            where: { id: reading.id },
            data: updates,
          })
        } catch (updateErr) {
          // P2022 — clarifierCard/followupTurns 컬럼이 prod DB 에 아직 없는
          // 환경. PATCH 는 정확히 그 두 컬럼만 갱신하는 거라 시도할 게 없음.
          // 사용자엔 success 로 응답해서 클라가 무한 retry / 에러 토스트 안
          // 띄우게 한다 (Sentry 에는 warn 으로 남겨 마이그레이션 누락 추적).
          const code = (updateErr as { code?: string } | null)?.code
          if (code !== 'P2022') throw updateErr
          logger.warn('[Tarot PATCH] new columns missing on DB — skip patch (migration pending?)', {
            readingId: reading.id,
            fields: Object.keys(updates),
          })
          return apiSuccess({ success: true, updated: [], skipped: 'columns_missing' })
        }

        return apiSuccess({ success: true, updated: Object.keys(updates) })
      } catch (error) {
        logger.error('[Tarot PATCH Error]:', error)
        return apiError(ErrorCodes.DATABASE_ERROR, 'internal_server_error')
      }
    },
    createAuthenticatedGuard({
      route: '/api/tarot/save/[id]',
      limit: 60,
      windowSeconds: 60,
    })
  )

  return handler(request as unknown as NextRequest)
}

export async function DELETE(request: Request, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = idParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return createValidationErrorResponse(paramValidation.error, {
      route: 'tarot/save/[id]',
    })
  }
  const { id } = paramValidation.data

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        const reading = await prisma.tarotReading.findFirst({
          where: {
            id,
            userId: context.userId!,
          },
          select: { id: true },
        })

        if (!reading) {
          return apiError(ErrorCodes.NOT_FOUND, 'reading_not_found')
        }

        await prisma.tarotReading.delete({
          where: {
            id: reading.id,
          },
        })

        return apiSuccess({
          success: true,
          deletedId: reading.id,
        })
      } catch (error) {
        logger.error('[Tarot Delete Error]:', error)
        return apiError(ErrorCodes.DATABASE_ERROR, 'internal_server_error')
      }
    },
    createAuthenticatedGuard({
      route: '/api/tarot/save/[id]',
      limit: 30,
      windowSeconds: 60,
    })
  )

  return handler(request as unknown as NextRequest)
}
