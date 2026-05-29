// 🔄 Credit Refund Service - API 실패 시 크레딧 자동 환불
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export interface CreditRefundParams {
  userId: string
  creditType: 'reading' | 'compatibility' | 'followUp'
  amount: number
  reason: string
  apiRoute?: string
  errorMessage?: string
  transactionId?: string
  metadata?: Record<string, unknown>
}

/**
 * 크레딧 환불 - API 호출 실패 시 소비된 크레딧 복구
 *
 * @example
 * ```ts
 * // API 호출 실패 시
 * await refundCredits({
 *   userId: 'user_123',
 *   creditType: 'reading',
 *   amount: 1,
 *   reason: 'ai_backend_timeout',
 *   apiRoute: '/api/tarot/chat',
 *   errorMessage: 'OpenAI timeout after 60s',
 * });
 * ```
 */
export async function refundCredits(params: CreditRefundParams): Promise<boolean> {
  try {
    const { userId, creditType, amount, reason, apiRoute, errorMessage, transactionId, metadata } =
      params

    // metadata 직렬화는 트랜잭션 밖에서 먼저 처리 — JSON 변환 실패(circular ref 등)
    // 시 DB 연결을 잡지 않고 즉시 실패하도록.
    const metadataJson = metadata ? JSON.parse(JSON.stringify(metadata)) : {}

    // 트랜잭션으로 원자적 처리
    //
    // 알려진 한계 (Bug #2 — 별도 PR 로 분리): creditType='reading' 환불은
    // 항상 usedCredits 만 감소시킨다. 하지만 consumeCredits 는 보너스 크레딧
    // (BonusCreditPurchase.remaining) 을 먼저 소비하고 부족분만 usedCredits 로
    // 차감한다. 보너스로 결제된 리딩을 환불하면 보너스 풀(remaining 및
    // bonusCredits)이 복구되지 않고, 사용된 적 없는 usedCredits 가 0 쪽으로
    // 줄어든다 (GREATEST(0,...) 로 floor 는 보장되지만 보너스 풀은 그대로).
    // 결과: 환불은 성공으로 기록되지만 사용자에게 돌아간 크레딧이 없을 수
    // 있음. 적절한 수정은 consume 시 어떤 풀에서 차감됐는지 기록하고 같은
    // 풀로 복구하는 것이며, 별도 PR 에서 다룬다.
    await prisma.$transaction(async (tx) => {
      // 1. UserCredits 존재 여부 확인 (없으면 에러 — 환불 대상이 없음)
      const userCredits = await tx.userCredits.findUnique({
        where: { userId },
        select: { userId: true },
      })

      if (!userCredits) {
        throw new Error(`UserCredits not found for user: ${userId}`)
      }

      // 2. 크레딧 타입별 환불 처리 — atomic floor 0
      //
      // 이전엔 findUnique → Math.max(0, current - amount) → update 패턴이라
      // 동시 환불 두 건이 같은 snapshot 을 읽고 같은 값으로 덮어써서 한 건이
      // 사라졌다 (Postgres READ COMMITTED). 같은 트랜잭션 안에서도 SELECT 후
      // UPDATE 사이에 다른 세션이 commit 하면 lost update 발생.
      // expireBonusCredits / revokeBonusCreditPurchase 와 동일한 패턴:
      // GREATEST(0, col - amount) raw SQL 로 한 줄에 처리해서 row-level lock
      // 안에서 atomic 하게 해결.
      if (creditType === 'reading') {
        await tx.$executeRaw`
          UPDATE "UserCredits"
          SET "usedCredits" = GREATEST(0, "usedCredits" - ${amount})
          WHERE "userId" = ${userId}
        `
      } else if (creditType === 'compatibility') {
        await tx.$executeRaw`
          UPDATE "UserCredits"
          SET "compatibilityUsed" = GREATEST(0, "compatibilityUsed" - ${amount})
          WHERE "userId" = ${userId}
        `
      } else if (creditType === 'followUp') {
        await tx.$executeRaw`
          UPDATE "UserCredits"
          SET "followUpUsed" = GREATEST(0, "followUpUsed" - ${amount})
          WHERE "userId" = ${userId}
        `
      }

      // 3. 환불 로그 기록
      await tx.creditRefundLog.create({
        data: {
          userId,
          creditType,
          amount,
          reason,
          apiRoute,
          errorMessage: errorMessage?.substring(0, 500), // 최대 500자
          transactionId,
          metadata: metadataJson,
        },
      })
    })

    logger.info('[CreditRefund] Success', {
      userId,
      creditType,
      amount,
      reason,
      apiRoute,
    })

    return true
  } catch (error) {
    logger.error('[CreditRefund] Failed', { error })
    // 환불 실패는 치명적이므로 에러를 다시 던짐
    throw error
  }
}

/**
 * 사용자의 크레딧 환불 히스토리 조회
 */
export async function getCreditRefundHistory(
  userId: string,
  options: {
    creditType?: 'reading' | 'compatibility' | 'followUp'
    limit?: number
    offset?: number
  } = {}
): Promise<unknown[]> {
  const where: Record<string, unknown> = { userId }

  if (options.creditType) {
    where.creditType = options.creditType
  }

  return prisma.creditRefundLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit || 50,
    skip: options.offset || 0,
  })
}

/**
 * 특정 API 경로의 환불 통계 조회 (관리자용)
 */
export async function getRefundStatsByRoute(
  apiRoute: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalRefunds: number
  totalAmount: number
  byType: Record<string, number>
}> {
  const where: Record<string, unknown> = { apiRoute }

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) {
      ;(where.createdAt as Record<string, unknown>).gte = startDate
    }
    if (endDate) {
      ;(where.createdAt as Record<string, unknown>).lte = endDate
    }
  }

  const refunds = await prisma.creditRefundLog.findMany({
    where,
    select: {
      amount: true,
      creditType: true,
    },
  })

  const byType: Record<string, number> = {
    reading: 0,
    compatibility: 0,
    followUp: 0,
  }

  let totalAmount = 0

  for (const refund of refunds) {
    totalAmount += refund.amount
    byType[refund.creditType] = (byType[refund.creditType] || 0) + refund.amount
  }

  return {
    totalRefunds: refunds.length,
    totalAmount,
    byType,
  }
}
