/**
 * Couple Tarot Reading Detail API
 * 특정 커플 타로 리딩 조회
 */
import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { readingIdParamSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'

type RouteContext = {
  params: Promise<{ readingId: string }>
}

// GET - 특정 커플 타로 리딩 조회
export async function GET(request: Request, routeContext: RouteContext) {
  const rawParams = await routeContext.params
  const paramValidation = readingIdParamSchema.safeParse(rawParams)
  if (!paramValidation.success) {
    return createValidationErrorResponse(paramValidation.error, {
      route: 'tarot/couple-reading/[readingId]',
    })
  }
  const { readingId } = paramValidation.data

  const handler = withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        const userId = context.userId!

        const reading = await prisma.tarotReading.findUnique({
          where: { id: readingId },
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
        })

        if (!reading) {
          return apiError(ErrorCodes.NOT_FOUND, '리딩을 찾을 수 없습니다')
        }

        if (!reading.isSharedReading) {
          return apiError(ErrorCodes.BAD_REQUEST, '커플 리딩이 아닙니다')
        }

        const isOwner = reading.userId === userId
        const isSharedWith = reading.sharedWithUserId === userId

        if (!isOwner && !isSharedWith) {
          return apiError(ErrorCodes.FORBIDDEN, '이 리딩에 대한 접근 권한이 없습니다')
        }

        // 파트너 정보 가져오기
        const partnerId = isOwner ? reading.sharedWithUserId : reading.userId
        let partnerInfo = null

        if (partnerId) {
          const partner = await prisma.user.findUnique({
            where: { id: partnerId },
            select: { id: true, name: true, image: true },
          })
          partnerInfo = partner
        }

        // 매치 연결 정보 — status 가 active 가 아니면 (blocked/unmatched)
        // 양쪽 모두 접근 차단. 정보 누설을 줄이기 위해 NOT_FOUND 로 응답한다.
        let connectionInfo = null
        if (reading.matchConnectionId) {
          const connection = await prisma.matchConnection.findUnique({
            where: { id: reading.matchConnectionId },
            select: {
              id: true,
              status: true,
              compatibilityScore: true,
              isSuperLikeMatch: true,
              createdAt: true,
            },
          })
          if (!connection || connection.status !== 'active') {
            logger.warn('[couple-reading/[id]] GET blocked: inactive connection', {
              userId,
              readingId,
              connectionId: reading.matchConnectionId,
              status: connection?.status ?? 'missing',
            })
            return apiError(ErrorCodes.NOT_FOUND, '리딩을 찾을 수 없습니다')
          }
          // status 는 응답에서 제외 (옛 select 와 동일한 shape 유지)
          connectionInfo = {
            id: connection.id,
            compatibilityScore: connection.compatibilityScore,
            isSuperLikeMatch: connection.isSuperLikeMatch,
            createdAt: connection.createdAt,
          }
        }

        return apiSuccess({
          reading: {
            id: reading.id,
            question: reading.question,
            spreadId: reading.spreadId,
            spreadTitle: reading.spreadTitle,
            cards: reading.cards,
            overallMessage: reading.overallMessage,
            cardInsights: reading.cardInsights,
            guidance: reading.guidance,
            affirmation: reading.affirmation,
            createdAt: reading.createdAt,
            isMyReading: isOwner,
            isPaidByMe: reading.paidByUserId === userId,
            creator: reading.user,
            partner: partnerInfo,
            connection: connectionInfo,
          },
        })
      } catch (error) {
        logger.error('[couple-reading/[id]] GET error:', { error: error })
        return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch reading')
      }
    },
    createAuthenticatedGuard({
      route: '/api/tarot/couple-reading/[readingId]',
      limit: 60,
      windowSeconds: 60,
    })
  )

  return handler(request as unknown as NextRequest)
}
