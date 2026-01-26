import { prisma } from "@/lib/db/prisma";
import {
  PLAN_CONFIG,
  type PlanType,
  type PlanFeatures,
} from "@/lib/config/pricing";

// Re-export for backward compatibility
export { PLAN_CONFIG };
export type { PlanType };
export type FeatureType = keyof PlanFeatures;

// 월간 기간 계산 (다음 달 같은 날)
function getNextPeriodEnd(): Date {
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return nextMonth;
}

// 유저 크레딧 초기화 (신규 가입 시)
export async function initializeUserCredits(userId: string, plan: PlanType = "free") {
  const config = PLAN_CONFIG[plan];
  const now = new Date();

  return prisma.userCredits.create({
    data: {
      userId,
      plan,
      monthlyCredits: config.monthlyCredits,
      usedCredits: 0,
      bonusCredits: 0,
      compatibilityUsed: 0,
      followUpUsed: 0,
      compatibilityLimit: config.compatibilityLimit,
      followUpLimit: config.followUpLimit,
      historyRetention: config.historyRetention,
      periodStart: now,
      periodEnd: getNextPeriodEnd(),
    },
  });
}

// 유저 크레딧 조회 (없으면 생성)
export async function getUserCredits(userId: string) {
  let credits = await prisma.userCredits.findUnique({
    where: { userId },
  });

  // 없으면 free 플랜으로 생성
  if (!credits) {
    credits = await initializeUserCredits(userId, "free");
  }

  // 기간 만료 시 리셋
  if (credits.periodEnd && new Date() > credits.periodEnd) {
    credits = await resetMonthlyCredits(userId);
  }

  return credits;
}

// 크레딧 잔여량 조회
export async function getCreditBalance(userId: string) {
  const credits = await getUserCredits(userId);
  const remaining = credits.monthlyCredits - credits.usedCredits + credits.bonusCredits;
  // totalBonusReceived가 없는 기존 유저는 현재 bonusCredits를 사용
  const totalBonus = (credits as { totalBonusReceived?: number }).totalBonusReceived ?? credits.bonusCredits;
  const totalCredits = credits.monthlyCredits + totalBonus;

  return {
    plan: credits.plan as PlanType,
    monthlyCredits: credits.monthlyCredits,
    usedCredits: credits.usedCredits,
    bonusCredits: credits.bonusCredits,
    totalCredits,
    remainingCredits: Math.max(0, remaining),
    compatibility: {
      used: credits.compatibilityUsed,
      limit: credits.compatibilityLimit,
      remaining: Math.max(0, credits.compatibilityLimit - credits.compatibilityUsed),
    },
    followUp: {
      used: credits.followUpUsed,
      limit: credits.followUpLimit,
      remaining: Math.max(0, credits.followUpLimit - credits.followUpUsed),
    },
    historyRetention: credits.historyRetention,
    periodEnd: credits.periodEnd,
  };
}

// 크레딧 사용 가능 여부 확인
export async function canUseCredits(
  userId: string,
  type: "reading" | "compatibility" | "followUp" = "reading",
  amount: number = 1
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const balance = await getCreditBalance(userId);

  if (type === "reading") {
    if (balance.remainingCredits >= amount) {
      return { allowed: true, remaining: balance.remainingCredits - amount };
    }
    return {
      allowed: false,
      reason: "no_credits",
      remaining: balance.remainingCredits,
    };
  }

  if (type === "compatibility") {
    if (balance.compatibility.remaining >= amount) {
      return { allowed: true, remaining: balance.compatibility.remaining - amount };
    }
    return {
      allowed: false,
      reason: "compatibility_limit",
      remaining: balance.compatibility.remaining,
    };
  }

  if (type === "followUp") {
    if (balance.followUp.remaining >= amount) {
      return { allowed: true, remaining: balance.followUp.remaining - amount };
    }
    return {
      allowed: false,
      reason: "followup_limit",
      remaining: balance.followUp.remaining,
    };
  }

  return { allowed: false, reason: "invalid_type" };
}

// 보너스 크레딧 소비 (FIFO - 먼저 구매한 것부터 사용)
// Optimized to use batch updates instead of N+1 queries
async function consumeBonusCreditsFromPurchases(userId: string, amount: number): Promise<number> {
  if (amount <= 0) {return 0;}

  const now = new Date();

  // 유효한 보너스 구매 건 조회 (먼저 구매한 것부터, 만료 임박한 것부터)
  const validPurchases = await prisma.bonusCreditPurchase.findMany({
    where: {
      userId,
      expired: false,
      expiresAt: { gt: now },
      remaining: { gt: 0 },
    },
    orderBy: [
      { expiresAt: "asc" }, // 만료 임박한 것 먼저
      { createdAt: "asc" }, // 먼저 구매한 것 먼저
    ],
  });

  let remainingToConsume = amount;
  let totalConsumed = 0;

  // Collect updates to batch process
  const updates: Array<{ id: string; decrement: number }> = [];

  for (const purchase of validPurchases) {
    if (remainingToConsume <= 0) {break;}

    const toConsume = Math.min(purchase.remaining, remainingToConsume);
    updates.push({ id: purchase.id, decrement: toConsume });

    totalConsumed += toConsume;
    remainingToConsume -= toConsume;
  }

  // Batch update using transaction (avoids N+1 queries)
  if (updates.length > 0) {
    await prisma.$transaction(
      updates.map(({ id, decrement }) =>
        prisma.bonusCreditPurchase.update({
          where: { id },
          data: { remaining: { decrement } },
        })
      )
    );
  }

  return totalConsumed;
}

// 크레딧 소비
export async function consumeCredits(
  userId: string,
  type: "reading" | "compatibility" | "followUp" = "reading",
  amount: number = 1
): Promise<{ success: boolean; error?: string }> {
  const canUse = await canUseCredits(userId, type, amount);
  if (!canUse.allowed) {
    return { success: false, error: canUse.reason };
  }

  const credits = await getUserCredits(userId);

  // 보너스 크레딧 먼저 사용 (만료 임박한 것부터)
  let fromBonus = 0;
  let fromMonthly = amount;

  if (type === "reading" && credits.bonusCredits > 0) {
    fromBonus = Math.min(credits.bonusCredits, amount);
    fromMonthly = amount - fromBonus;

    // BonusCreditPurchase 테이블에서 FIFO로 차감
    const actualBonusConsumed = await consumeBonusCreditsFromPurchases(userId, fromBonus);
    // 실제 차감된 양과 다르면 조정 (레거시 데이터 대응)
    if (actualBonusConsumed < fromBonus) {
      fromMonthly += (fromBonus - actualBonusConsumed);
      fromBonus = actualBonusConsumed;
    }
  }

  const updateData: Record<string, { increment?: number; decrement?: number }> = {};

  if (type === "reading") {
    if (fromBonus > 0) {
      updateData.bonusCredits = { decrement: fromBonus };
    }
    if (fromMonthly > 0) {
      updateData.usedCredits = { increment: fromMonthly };
    }
  } else if (type === "compatibility") {
    updateData.compatibilityUsed = { increment: amount };
  } else if (type === "followUp") {
    updateData.followUpUsed = { increment: amount };
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.userCredits.update({
      where: { userId },
      data: updateData,
    });
  }

  return { success: true };
}

// 구독 상태 확인 (active 또는 trialing인 경우만 유효)
async function hasActiveSubscription(userId: string): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "trialing"] },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!subscription) {return false;}

  // currentPeriodEnd가 지났으면 만료된 것
  if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd) {
    return false;
  }

  return true;
}

// 월간 크레딧 리셋 (구독이 유효한 경우에만)
export async function resetMonthlyCredits(userId: string) {
  const credits = await prisma.userCredits.findUnique({
    where: { userId },
  });

  if (!credits) {
    return initializeUserCredits(userId, "free");
  }

  // 구독이 유효한지 확인
  const isSubscribed = await hasActiveSubscription(userId);

  if (!isSubscribed) {
    // 구독 만료 → free 플랜으로 다운그레이드
    const freeConfig = PLAN_CONFIG.free;
    const now = new Date();

    return prisma.userCredits.update({
      where: { userId },
      data: {
        plan: "free",
        usedCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        periodStart: now,
        periodEnd: getNextPeriodEnd(),
        monthlyCredits: freeConfig.monthlyCredits,
        compatibilityLimit: freeConfig.compatibilityLimit,
        followUpLimit: freeConfig.followUpLimit,
        historyRetention: freeConfig.historyRetention,
      },
    });
  }

  // 구독 유효 → 현재 플랜 기준으로 리셋
  const config = PLAN_CONFIG[credits.plan as PlanType] || PLAN_CONFIG.free;
  const now = new Date();

  return prisma.userCredits.update({
    where: { userId },
    data: {
      usedCredits: 0,
      compatibilityUsed: 0,
      followUpUsed: 0,
      periodStart: now,
      periodEnd: getNextPeriodEnd(),
      monthlyCredits: config.monthlyCredits,
      compatibilityLimit: config.compatibilityLimit,
      followUpLimit: config.followUpLimit,
      historyRetention: config.historyRetention,
    },
  });
}

// 플랜 업그레이드
export async function upgradePlan(userId: string, newPlan: PlanType) {
  const config = PLAN_CONFIG[newPlan];
  const now = new Date();

  // 기존 크레딧이 있으면 업데이트, 없으면 생성
  const existing = await prisma.userCredits.findUnique({
    where: { userId },
  });

  if (existing) {
    return prisma.userCredits.update({
      where: { userId },
      data: {
        plan: newPlan,
        monthlyCredits: config.monthlyCredits,
        compatibilityLimit: config.compatibilityLimit,
        followUpLimit: config.followUpLimit,
        historyRetention: config.historyRetention,
        // 업그레이드 시 즉시 크레딧 리셋
        usedCredits: 0,
        compatibilityUsed: 0,
        followUpUsed: 0,
        periodStart: now,
        periodEnd: getNextPeriodEnd(),
      },
    });
  }

  return initializeUserCredits(userId, newPlan);
}

// 보너스 크레딧 추가 (크레딧팩 구매 등)
export async function addBonusCredits(
  userId: string,
  amount: number,
  source: "purchase" | "referral" | "promotion" | "gift" = "purchase",
  stripePaymentId?: string
) {
  await getUserCredits(userId);

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 3); // 3개월 후 만료

  // BonusCreditPurchase 테이블에 기록 (만료일 추적용)
  await prisma.bonusCreditPurchase.create({
    data: {
      userId,
      amount,
      remaining: amount,
      expiresAt,
      source,
      stripePaymentId,
    },
  });

  // UserCredits 테이블도 업데이트 (빠른 조회용)
  return prisma.userCredits.update({
    where: { userId },
    data: {
      bonusCredits: { increment: amount },
      totalBonusReceived: { increment: amount },
    },
  });
}

// 유효한 보너스 크레딧 계산 (만료되지 않은 것만)
export async function getValidBonusCredits(userId: string): Promise<number> {
  const now = new Date();

  const validPurchases = await prisma.bonusCreditPurchase.findMany({
    where: {
      userId,
      expired: false,
      expiresAt: { gt: now },
      remaining: { gt: 0 },
    },
    select: { remaining: true },
  });

  return validPurchases.reduce((sum, p) => sum + p.remaining, 0);
}

// 만료된 보너스 크레딧 정리 (cron job용)
export async function expireBonusCredits() {
  const now = new Date();

  // 만료된 구매 건 조회
  const expiredPurchases = await prisma.bonusCreditPurchase.findMany({
    where: {
      expired: false,
      expiresAt: { lte: now },
      remaining: { gt: 0 },
    },
    select: { id: true, userId: true, remaining: true },
  });

  // 각 유저별로 만료된 크레딧 합계
  const userExpiredCredits = new Map<string, number>();
  for (const p of expiredPurchases) {
    userExpiredCredits.set(
      p.userId,
      (userExpiredCredits.get(p.userId) || 0) + p.remaining
    );
  }

  // 트랜잭션으로 처리
  const results = await Promise.allSettled(
    Array.from(userExpiredCredits.entries()).map(([uid, expiredAmount]) =>
      prisma.$transaction([
        // 만료된 구매 건들 업데이트
        prisma.bonusCreditPurchase.updateMany({
          where: {
            userId: uid,
            expired: false,
            expiresAt: { lte: now },
          },
          data: { expired: true },
        }),
        // UserCredits에서 만료된 크레딧 차감
        prisma.userCredits.update({
          where: { userId: uid },
          data: { bonusCredits: { decrement: expiredAmount } },
        }),
      ])
    )
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return {
    totalUsers: userExpiredCredits.size,
    totalCreditsExpired: Array.from(userExpiredCredits.values()).reduce((a, b) => a + b, 0),
    succeeded,
    failed
  };
}

// 기능 사용 가능 여부 확인
export async function canUseFeature(userId: string, feature: FeatureType): Promise<boolean> {
  const credits = await getUserCredits(userId);
  const plan = credits.plan as PlanType;
  const config = PLAN_CONFIG[plan] || PLAN_CONFIG.free;

  return config.features[feature] ?? false;
}

// 전체 유저 월간 리셋 (cron job용)
export async function resetAllExpiredCredits() {
  const now = new Date();

  const expiredUsers = await prisma.userCredits.findMany({
    where: {
      periodEnd: { lte: now },
    },
    select: { userId: true, plan: true },
  });

  const results = await Promise.allSettled(
    expiredUsers.map((user) => resetMonthlyCredits(user.userId))
  );

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return { total: expiredUsers.length, succeeded, failed };
}
