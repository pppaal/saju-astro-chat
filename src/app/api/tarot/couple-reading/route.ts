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
import { sanitizeHtml } from '@/lib/api/sanitizers'
import { consumeBonusCreditOnceInTx } from '@/lib/credits/creditService'
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

      // 차단/언매치된 connection 의 리딩은 결과에서 제외한다.
      // TarotReading 에 matchConnection 관계가 정의돼 있지 않아 nested where 가
      // 불가하므로 2-step 으로: (1) 이 사용자의 active connection 들의 id 를 모은 뒤
      // (2) reading.matchConnectionId 가 그 안에 있을 때만 통과시킨다.
      const activeConnections = await prisma.matchConnection.findMany({
        where: {
          status: 'active',
          OR: [{ user1Profile: { userId } }, { user2Profile: { userId } }],
          ...(connectionId ? { id: connectionId } : {}),
        },
        select: { id: true },
      })
      const activeConnectionIds = activeConnections.map((c) => c.id)

      if (activeConnectionIds.length === 0) {
        return apiSuccess({ readings: [] })
      }

      const readings = await prisma.tarotReading.findMany({
        where: {
          isSharedReading: true,
          OR: [{ userId }, { sharedWithUserId: userId }],
          matchConnectionId: { in: activeConnectionIds },
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
        overallMessage,
        cardInsights,
        guidance,
        affirmation,
      } = validationResult.data

      // 클라이언트가 보낸 "AI 타로 해석" 텍스트는 서버에서 LLM을 다시 돌리지
      // 않고 그대로 저장 → 파트너에게 노출된다. 누구든 임의 텍스트를 "타로
      // 결과"로 위장해 매치 상대에게 보낼 수 있다는 뜻이라 *최소한* HTML/
      // 스크립트 인젝션은 막아둔다. 텍스트 무결성(진짜 AI 출력인가) 검증은
      // 별도 작업 — 서버사이드 재생성 또는 HMAC 서명이 답.
      const safeOverallMessage = sanitizeHtml(overallMessage, 10000)
      const safeGuidance = guidance ? sanitizeHtml(guidance, 5000) : guidance
      const safeAffirmation = affirmation ? sanitizeHtml(affirmation, 500) : affirmation
      const safeCardInsights = cardInsights
        ? cardInsights.map((c) => ({
            ...c,
            position: sanitizeHtml(c.position, 100),
            card_name: sanitizeHtml(c.card_name, 120),
            interpretation: sanitizeHtml(c.interpretation, 5000),
          }))
        : cardInsights

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

      // 차단/언매치된 connection 에 새 리딩 만드는 것을 차단.
      if (connection.status !== 'active') {
        logger.warn('[Couple reading] POST blocked: inactive connection', {
          userId,
          connectionId,
          status: connection.status,
        })
        return apiError(ErrorCodes.NOT_FOUND, '매치를 찾을 수 없습니다')
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

      // 크레딧 차감을 atomic conditional update 로 막아 race 와 음수 bonus 를 방지한다.
      // 1) compat 한도 안에 있으면 compat 먼저 시도. updateMany 의 where 절에 잔량 조건을 박아 race 가 와도 한쪽만 통과한다.
      // 2) compat 가 race 로 막히거나 한도 초과면 bonus 로 fallback. (옛 코드는 트랜잭션 밖 스냅샷으로 분기를 정해, race 로 compat 가 막히면 bonus 가 남아 있어도 403 으로 떨어지는 문제가 있었다.)
      // 3) bonus 차감은 `consumeBonusCreditOnceInTx` 로 위임 — `UserCredits.bonusCredits` 만 줄이는 게 아니라 FIFO 순서로 `BonusCreditPurchase.remaining` 도 함께 차감해 시스템 invariant 를 유지한다. (이전에 여기 자체 코드가 `bonusCredits` 만 줄여 sum(remaining) > bonusCredits drift 가 누적, 다음 FIFO 차감 시 over-grant 의 원인이 됐다.)
      // 4) 둘 다 실패해야만 INSUFFICIENT 으로 롤백.
      class InsufficientCreditsError extends Error {
        constructor() {
          super('INSUFFICIENT_CREDITS')
          this.name = 'InsufficientCreditsError'
        }
      }
      let result
      try {
        result = await prisma.$transaction(async (tx) => {
          let charged: 'compat' | 'bonus' | null = null

          if (userCredits.compatibilityUsed < userCredits.compatibilityLimit) {
            const compatTry = await tx.userCredits.updateMany({
              where: { userId, compatibilityUsed: { lt: userCredits.compatibilityLimit } },
              data: { compatibilityUsed: { increment: 1 } },
            })
            if (compatTry.count > 0) charged = 'compat'
          }

          if (!charged) {
            // consumeBonusCreditOnceInTx 가 내부에서 CreditTransaction
            // (CONSUME / BONUS / sourceRef=purchase.id) 을 emit 하므로
            // bonus 경로는 여기서 추가 audit 작성 불필요.
            const ok = await consumeBonusCreditOnceInTx(tx, userId)
            if (ok) charged = 'bonus'
          }

          if (!charged) throw new InsufficientCreditsError()

          // compat 경로 감사 로그 — compatibilityUsed 가 inline 으로 +1 됐으므로
          // CreditTransaction 도 같은 트랜잭션 안에서 한 줄.
          if (charged === 'compat') {
            await tx.creditTransaction.create({
              data: {
                userId,
                type: 'CONSUME',
                pool: 'COMPATIBILITY',
                amount: -1,
                reason: 'consume_couple_reading',
                sourceRef: connectionId,
                metadata: { connectionId, source: 'couple-reading' },
              },
            })
          }

          const reading = await tx.tarotReading.create({
            data: {
              userId,
              question: question || '커플 타로',
              spreadId,
              spreadTitle: (spreadTitle || '커플 스프레드') as string,
              cards: cards as Prisma.InputJsonValue,
              overallMessage: safeOverallMessage as string,
              cardInsights: safeCardInsights
                ? (safeCardInsights as Prisma.InputJsonValue)
                : Prisma.DbNull,
              guidance: safeGuidance,
              affirmation: safeAffirmation,
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
      } catch (txErr) {
        if (txErr instanceof InsufficientCreditsError) {
          return apiError(ErrorCodes.FORBIDDEN, '크레딧이 부족합니다. 크레딧을 충전해주세요.')
        }
        throw txErr
      }

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
