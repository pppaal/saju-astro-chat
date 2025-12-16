import { prisma } from "@/lib/db/prisma";

// 플랜별 설정
export const PLAN_CONFIG = {
  free: {
    monthlyCredits: 1,
    compatibilityLimit: 0,
    followUpLimit: 0,
    historyRetention: 7,
    features: {
      basicSaju: true,
      detailedSaju: false,
      fullSaju: false,
      oneCardTarot: true,
      threeCardTarot: false,
      allTarotSpreads: false,
      pdfReport: false,
      adFree: false,
      priority: false,
    },
  },
  starter: {
    monthlyCredits: 10,
    compatibilityLimit: 2,
    followUpLimit: 2,
    historyRetention: 30,
    features: {
      basicSaju: true,
      detailedSaju: true,
      fullSaju: false,
      oneCardTarot: true,
      threeCardTarot: true,
      allTarotSpreads: false,
      pdfReport: false,
      adFree: true,
      priority: false,
    },
  },
  pro: {
    monthlyCredits: 30,
    compatibilityLimit: 5,
    followUpLimit: 5,
    historyRetention: 90,
    features: {
      basicSaju: true,
      detailedSaju: true,
      fullSaju: true,
      oneCardTarot: true,
      threeCardTarot: true,
      allTarotSpreads: true,
      pdfReport: true,
      adFree: true,
      priority: false,
    },
  },
  premium: {
    monthlyCredits: 50,
    compatibilityLimit: 10,
    followUpLimit: 10,
    historyRetention: 365,
    features: {
      basicSaju: true,
      detailedSaju: true,
      fullSaju: true,
      oneCardTarot: true,
      threeCardTarot: true,
      allTarotSpreads: true,
      pdfReport: true,
      adFree: true,
      priority: true,
    },
  },
} as const;

export type PlanType = keyof typeof PLAN_CONFIG;
export type FeatureType = keyof typeof PLAN_CONFIG.free.features;

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

  return {
    plan: credits.plan as PlanType,
    monthlyCredits: credits.monthlyCredits,
    usedCredits: credits.usedCredits,
    bonusCredits: credits.bonusCredits,
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

  // 보너스 크레딧 먼저 사용
  let fromBonus = 0;
  let fromMonthly = amount;

  if (type === "reading" && credits.bonusCredits > 0) {
    fromBonus = Math.min(credits.bonusCredits, amount);
    fromMonthly = amount - fromBonus;
  }

  const updateData: any = {};

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

  await prisma.userCredits.update({
    where: { userId },
    data: updateData,
  });

  return { success: true };
}

// 월간 크레딧 리셋
export async function resetMonthlyCredits(userId: string) {
  const credits = await prisma.userCredits.findUnique({
    where: { userId },
  });

  if (!credits) {
    return initializeUserCredits(userId, "free");
  }

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
      // 플랜 설정도 업데이트 (플랜 변경 시 반영)
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
export async function addBonusCredits(userId: string, amount: number) {
  const credits = await getUserCredits(userId);

  return prisma.userCredits.update({
    where: { userId },
    data: {
      bonusCredits: { increment: amount },
    },
  });
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
