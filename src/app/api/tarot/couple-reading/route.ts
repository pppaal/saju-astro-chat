/**
 * Couple Tarot Reading API
 * 커플 타로 - 매칭된 파트너와 함께 보는 타로
 * 한 사람이 결제하면 둘 다 볼 수 있음
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
import { Prisma } from '@prisma/client'
import { sendPushNotification } from '@/lib/notifications/pushService'
import { logger } from '@/lib/logger'
import {
  coupleTarotReadingPostSchema,
  coupleTarotReadingDeleteSchema,
  coupleTarotReadingQuerySchema,
} from '@/lib/api/zodValidation'

// GET - 커플 타로 리딩 목록 조회 (내가 만들었거나 공유받은 것)
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const userId = context.userId!

      const searchParams = req.nextUrl.searchParams

      const validationResult = coupleTarotReadingQuerySchema.safeParse({
        connectionId: searchParams.get('connectionId'),
      })

      if (!validationResult.success) {
        logger.warn('[Couple reading] GET validation failed', {
          errors: validationResult.error.issues,
        })
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
        )
      }

      const { connectionId } = validationResult.data

      const readings = await prisma.tarotReading.findMany({
        where: {
          isSharedReading: true,
          OR: [{ userId }, { sharedWithUserId: userId }],
          ...(connectionId ? { matchConnectionId: connectionId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })

      const partnerIds = readings
        .map((reading) => (reading.userId === userId ? reading.sharedWithUserId : reading.userId))
        .filter((id): id is string => id !== null)

      const partners = await prisma.user.findMany({
        where: { id: { in: partnerIds } },
        select: { id: true, name: true, image: true },
      })

      const partnerMap = new Map(partners.map((p) => [p.id, p]))

      const readingsWithPartner = readings.map((reading) => {
        const partnerId = reading.userId === userId ? reading.sharedWithUserId : reading.userId
        const partnerInfo = partnerId ? partnerMap.get(partnerId) || null : null

        return {
          ...reading,
          isMyReading: reading.userId === userId,
          isPaidByMe: reading.paidByUserId === userId,
          partner: partnerInfo,
        }
      })

      return apiSuccess({ readings: readingsWithPartner })
    } catch (error) {
      logger.error('[couple-reading] GET error:', { error: error })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to fetch couple readings')
    }
  },
  createAuthenticatedGuard({
    route: '/api/tarot/couple-reading',
    limit: 60,
    windowSeconds: 60,
  })
)

// POST - 커플 타로 리딩 생성
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const userId = context.userId!

      const rawBody = await req.json()

      const validationResult = coupleTarotReadingPostSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[Couple reading] POST validation failed', {
          errors: validationResult.error.issues,
        })
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
        )
      }

      const {
        connectionId,
        spreadId,
        spreadTitle,
        cards,
        question,
        theme,
        overallMessage,
        cardInsights,
        guidance,
        affirmation,
      } = validationResult.data

      // 매치 연결 확인
      const connection = await prisma.matchConnection.findUnique({
        where: { id: connectionId },
        include: {
          user1Profile: { select: { userId: true } },
          user2Profile: { select: { userId: true } },
        },
      })

      if (!connection) {
        return apiError(ErrorCodes.NOT_FOUND, '매치를 찾을 수 없습니다')
      }

      const isUser1 = connection.user1Profile.userId === userId
      const isUser2 = connection.user2Profile.userId === userId

      if (!isUser1 && !isUser2) {
        return apiError(ErrorCodes.FORBIDDEN, '이 매치에 대한 권한이 없습니다')
      }

      const partnerId = isUser1 ? connection.user2Profile.userId : connection.user1Profile.userId

      const userCredits = await prisma.userCredits.findUnique({
        where: { userId },
      })

      if (!userCredits) {
        return apiError(ErrorCodes.BAD_REQUEST, '크레딧 정보를 찾을 수 없습니다')
      }

      const availableCredits =
        userCredits.compatibilityLimit - userCredits.compatibilityUsed + userCredits.bonusCredits

      if (availableCredits < 1) {
        return apiError(ErrorCodes.FORBIDDEN, '크레딧이 부족합니다. 크레딧을 충전해주세요.')
      }

      const result = await prisma.$transaction(async (tx) => {
        if (userCredits.compatibilityUsed < userCredits.compatibilityLimit) {
          await tx.userCredits.update({
            where: { userId },
            data: { compatibilityUsed: { increment: 1 } },
          })
        } else {
          await tx.userCredits.update({
            where: { userId },
            data: { bonusCredits: { decrement: 1 } },
          })
        }

        const reading = await tx.tarotReading.create({
          data: {
            userId,
            question: question || '커플 타로',
            theme: theme || 'love',
            spreadId,
            spreadTitle: (spreadTitle || '커플 스프레드') as string,
            cards: cards as Prisma.InputJsonValue,
            overallMessage: overallMessage as string,
            cardInsights: cardInsights ? (cardInsights as Prisma.InputJsonValue) : Prisma.DbNull,
            guidance,
            affirmation,
            source: 'couple',
            isSharedReading: true,
            sharedWithUserId: partnerId,
            matchConnectionId: connectionId,
            paidByUserId: userId,
            locale: 'ko',
          },
        })

        await tx.matchConnection.update({
          where: { id: connectionId },
          data: { lastInteractionAt: new Date() },
        })

        return reading
      })

      // 파트너에게 푸시 알림 보내기 (비동기로 처리)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      })
      const senderName = user?.name || '파트너'

      sendPushNotification(partnerId, {
        title: '커플 타로가 도착했어요!',
        message: `${senderName}님이 함께 볼 커플 타로를 봤어요. 지금 확인해보세요!`,
        icon: '/icon-192.png',
        tag: 'couple-tarot',
        data: {
          url: `/tarot/couple/${result.id}`,
          type: 'couple-tarot',
          readingId: result.id,
        },
      }).catch((err) => {
        logger.warn('[couple-reading] Failed to send push notification:', { err })
      })

      return apiSuccess({
        success: true,
        readingId: result.id,
        message: '커플 타로가 저장되었습니다. 파트너도 볼 수 있어요!',
      })
    } catch (error) {
      logger.error('[couple-reading] POST error:', { error: error })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to create couple reading')
    }
  },
  createAuthenticatedGuard({
    route: '/api/tarot/couple-reading',
    limit: 5,
    windowSeconds: 60,
  })
)

// DELETE - 커플 타로 리딩 삭제 (결제한 사람만 가능)
export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    try {
      const userId = context.userId!

      const rawBody = await req.json()

      const validationResult = coupleTarotReadingDeleteSchema.safeParse(rawBody)
      if (!validationResult.success) {
        logger.warn('[Couple reading] DELETE validation failed', {
          errors: validationResult.error.issues,
        })
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
        )
      }

      const { readingId } = validationResult.data

      const reading = await prisma.tarotReading.findUnique({
        where: { id: readingId },
      })

      if (!reading) {
        return apiError(ErrorCodes.NOT_FOUND, '리딩을 찾을 수 없습니다')
      }

      if (reading.paidByUserId !== userId) {
        return apiError(ErrorCodes.FORBIDDEN, '결제한 사람만 삭제할 수 있습니다')
      }

      await prisma.tarotReading.delete({
        where: { id: readingId },
      })

      return apiSuccess({ success: true })
    } catch (error) {
      logger.error('[couple-reading] DELETE error:', { error: error })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to delete reading')
    }
  },
  createAuthenticatedGuard({
    route: '/api/tarot/couple-reading',
    limit: 20,
    windowSeconds: 60,
  })
)
