// 🔄 Credit Refund Service - API 실패 시 크레딧 자동 환불
import { prisma } from "@/lib/db/prisma";

export interface CreditRefundParams {
  userId: string;
  creditType: "reading" | "compatibility" | "followUp";
  amount: number;
  reason: string;
  apiRoute?: string;
  errorMessage?: string;
  transactionId?: string;
  metadata?: Record<string, unknown>;
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
    const { userId, creditType, amount, reason, apiRoute, errorMessage, transactionId, metadata } = params;

    // 트랜잭션으로 원자적 처리
    await prisma.$transaction(async (tx) => {
      // 1. UserCredits 테이블 업데이트
      const userCredits = await tx.userCredits.findUnique({
        where: { userId },
      });

      if (!userCredits) {
        throw new Error(`UserCredits not found for user: ${userId}`);
      }

      // 2. 크레딧 타입별 환불 처리
      const updateData: Record<string, unknown> = {};

      if (creditType === "reading") {
        // usedCredits 감소 (다음 달 리셋 시 영향)
        updateData.usedCredits = Math.max(0, (userCredits.usedCredits || 0) - amount);
      } else if (creditType === "compatibility") {
        // compatibility 사용량 감소
        updateData.compatibilityUsed = Math.max(0, (userCredits.compatibilityUsed || 0) - amount);
      } else if (creditType === "followUp") {
        // followUp 사용량 감소
        updateData.followUpUsed = Math.max(0, (userCredits.followUpUsed || 0) - amount);
      }

      await tx.userCredits.update({
        where: { userId },
        data: updateData,
      });

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
          metadata: metadata || {},
        },
      });
    });

    console.log('[CreditRefund] Success:', {
      userId,
      creditType,
      amount,
      reason,
      apiRoute,
    });

    return true;
  } catch (error) {
    console.error('[CreditRefund] Failed:', error);
    // 환불 실패는 치명적이므로 에러를 다시 던짐
    throw error;
  }
}

/**
 * 사용자의 크레딧 환불 히스토리 조회
 */
export async function getCreditRefundHistory(
  userId: string,
  options: {
    creditType?: "reading" | "compatibility" | "followUp";
    limit?: number;
    offset?: number;
  } = {}
): Promise<unknown[]> {
  const where: Record<string, unknown> = { userId };

  if (options.creditType) {
    where.creditType = options.creditType;
  }

  return prisma.creditRefundLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit || 50,
    skip: options.offset || 0,
  });
}

/**
 * 특정 API 경로의 환불 통계 조회 (관리자용)
 */
export async function getRefundStatsByRoute(
  apiRoute: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalRefunds: number;
  totalAmount: number;
  byType: Record<string, number>;
}> {
  const where: Record<string, unknown> = { apiRoute };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      (where.createdAt as Record<string, unknown>).gte = startDate;
    }
    if (endDate) {
      (where.createdAt as Record<string, unknown>).lte = endDate;
    }
  }

  const refunds = await prisma.creditRefundLog.findMany({
    where,
    select: {
      amount: true,
      creditType: true,
    },
  });

  const byType: Record<string, number> = {
    reading: 0,
    compatibility: 0,
    followUp: 0,
  };

  let totalAmount = 0;

  for (const refund of refunds) {
    totalAmount += refund.amount;
    byType[refund.creditType] = (byType[refund.creditType] || 0) + refund.amount;
  }

  return {
    totalRefunds: refunds.length,
    totalAmount,
    byType,
  };
}
