// 🔄 Credit Refund Service - API 실패 시 크레딧 자동 환불
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

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
      // 1. UserCredits 테이블 존재 확인 — 없으면 환불 의미 없음.
      const userCredits = await tx.userCredits.findUnique({
        where: { userId },
        select: { userId: true },
      });

      if (!userCredits) {
        throw new Error(`UserCredits not found for user: ${userId}`);
      }

      // 2. 크레딧 타입별 환불 처리
      // reading: consumeCredits 가 보너스 → 월간 순으로 차감하므로 환불도
      // 반대 순서 (reverse-FIFO bonus 복원 → usedCredits 감소) 로 진행.
      // 이전엔 무조건 usedCredits 만 감소 → 보너스로 결제된 리딩의 환불 시
      // BonusCreditPurchase 풀은 영영 복원되지 않고 다음 달 monthly reset
      // 시점에 환불액이 사라졌다 (silent loss).
      //
      // reverse-FIFO 인 이유: 가장 최근에 차감된 구매분이 가장 가능성 높음
      // (FIFO consumption 이라 만료 임박한 쪽부터 줄어드는데, 그 쪽이 곧
      // 가장 최근 차감과 일치할 확률이 높다). 정확한 추적은 consume 시점에
      // 풀-별 차감 내역을 별도 테이블에 저장해야 하지만, 그 변경은 별도 PR
      // 의 큰 작업 — 본 PR 은 "silent drift" 보다 나은 휴리스틱으로 마감.
      if (creditType === "reading") {
        let remaining = amount;
        const now = new Date();

        if (remaining > 0) {
          // reverse-FIFO: 가장 늦게 만료되는 (== 가장 최근에 추가된) 구매부터.
          // remaining < amount (= 사용 흔적 있음) AND !expired AND 미래 만료.
          // select 명시 — schema 신규 컬럼 prod 미적용 환경 P2022 차단.
          const candidates = await tx.bonusCreditPurchase.findMany({
            where: {
              userId,
              expired: false,
              expiresAt: { gt: now },
              // 구매 amount 만큼 다 차 있는 행은 복원할 여지가 없음.
              // Prisma 는 컬럼 간 비교를 직접 지원하지 않아 client-side 에서
              // 필터 — N 은 보통 한 자릿수라 비용 문제 없음.
            },
            orderBy: { expiresAt: 'desc' },
            select: { id: true, amount: true, remaining: true },
          });

          for (const purchase of candidates) {
            if (remaining <= 0) break;
            const capacity = purchase.amount - purchase.remaining;
            if (capacity <= 0) continue;

            const restore = Math.min(capacity, remaining);
            // 조건부 update — 동시 환불 race 에서 amount 를 초과해 복원하지
            // 못하도록 (현재 remaining + restore <= amount) guard.
            // remaining 이 그 사이 누가 더 줄였어도 OK (capacity 증가).
            const upd = await tx.bonusCreditPurchase.updateMany({
              where: {
                id: purchase.id,
                // remaining 이 그 사이 amount - restore 보다 더 작아야 restore
                // 가능. 즉 remaining <= amount - restore. Prisma 가 컬럼 비교를
                // 직접 못해서 절대값 비교로 가드.
                remaining: { lte: purchase.amount - restore },
                expired: false,
              },
              data: { remaining: { increment: restore } },
            });

            if (upd.count > 0) {
              remaining -= restore;
              // UserCredits.bonusCredits 도 동기 증가 — invariant 유지.
              await tx.userCredits.update({
                where: { userId },
                data: { bonusCredits: { increment: restore } },
              });

              // 감사 로그 — REFUND / BONUS (sourceRef = purchase.id).
              await tx.creditTransaction.create({
                data: {
                  userId,
                  type: 'REFUND',
                  pool: 'BONUS',
                  amount: restore,
                  reason,
                  sourceRef: purchase.id,
                  metadata: {
                    purchaseId: purchase.id,
                    restored: restore,
                    apiRoute: apiRoute ?? null,
                    transactionId: transactionId ?? null,
                  },
                },
              });
            }
          }
        }

        // 남은 분은 usedCredits 감소로 fallback — GREATEST 패턴은 raw SQL 로.
        if (remaining > 0) {
          await tx.$executeRaw`
            UPDATE "UserCredits"
            SET "usedCredits" = GREATEST(0, "usedCredits" - ${remaining})
            WHERE "userId" = ${userId}
          `;
          // 감사 로그 — REFUND / MONTHLY (usedCredits 는 행 단위 추적이
          // 안 되므로 sourceRef 는 호출자가 넘긴 transactionId 사용).
          await tx.creditTransaction.create({
            data: {
              userId,
              type: 'REFUND',
              pool: 'MONTHLY',
              amount: remaining,
              reason,
              sourceRef: transactionId ?? null,
              metadata: {
                restored: remaining,
                apiRoute: apiRoute ?? null,
                transactionId: transactionId ?? null,
              },
            },
          });
        }
      } else if (creditType === "compatibility") {
        // compatibility 사용량 감소 (atomic floor 0)
        await tx.$executeRaw`
          UPDATE "UserCredits"
          SET "compatibilityUsed" = GREATEST(0, "compatibilityUsed" - ${amount})
          WHERE "userId" = ${userId}
        `;
        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'REFUND',
            pool: 'COMPATIBILITY',
            amount,
            reason,
            sourceRef: transactionId ?? null,
            metadata: { restored: amount, apiRoute: apiRoute ?? null },
          },
        });
      } else if (creditType === "followUp") {
        // followUp 사용량 감소 (atomic floor 0)
        await tx.$executeRaw`
          UPDATE "UserCredits"
          SET "followUpUsed" = GREATEST(0, "followUpUsed" - ${amount})
          WHERE "userId" = ${userId}
        `;
        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'REFUND',
            pool: 'FOLLOWUP',
            amount,
            reason,
            sourceRef: transactionId ?? null,
            metadata: { restored: amount, apiRoute: apiRoute ?? null },
          },
        });
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
          metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : {},
        },
      });
    });

    logger.info('[CreditRefund] Success', {
      userId,
      creditType,
      amount,
      reason,
      apiRoute,
    });

    return true;
  } catch (error) {
    logger.error('[CreditRefund] Failed', { error });
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
