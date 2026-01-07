/**
 * Credit Service 테스트
 * - 플랜별 크레딧 설정
 * - 크레딧 잔액 계산
 * - 기능 접근 제어
 * - 크레딧 소비 로직
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Plan configuration (실제 코드와 동일한 구조)
const PLAN_CONFIG = {
  free: {
    monthlyCredits: 7,
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
    monthlyCredits: 25,
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
    monthlyCredits: 80,
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
    monthlyCredits: 150,
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

type PlanType = keyof typeof PLAN_CONFIG;
type FeatureType = keyof typeof PLAN_CONFIG.free.features;

describe("Credit Service: Plan Configuration", () => {
  it("has increasing credits for higher plans", () => {
    expect(PLAN_CONFIG.free.monthlyCredits).toBeLessThan(
      PLAN_CONFIG.starter.monthlyCredits
    );
    expect(PLAN_CONFIG.starter.monthlyCredits).toBeLessThan(
      PLAN_CONFIG.pro.monthlyCredits
    );
    expect(PLAN_CONFIG.pro.monthlyCredits).toBeLessThan(
      PLAN_CONFIG.premium.monthlyCredits
    );
  });

  it("has increasing compatibility limits for higher plans", () => {
    expect(PLAN_CONFIG.free.compatibilityLimit).toBe(0);
    expect(PLAN_CONFIG.starter.compatibilityLimit).toBe(2);
    expect(PLAN_CONFIG.pro.compatibilityLimit).toBe(5);
    expect(PLAN_CONFIG.premium.compatibilityLimit).toBe(10);
  });

  it("has increasing history retention for higher plans", () => {
    expect(PLAN_CONFIG.free.historyRetention).toBe(7);
    expect(PLAN_CONFIG.starter.historyRetention).toBe(30);
    expect(PLAN_CONFIG.pro.historyRetention).toBe(90);
    expect(PLAN_CONFIG.premium.historyRetention).toBe(365);
  });

  it("only premium has priority feature", () => {
    expect(PLAN_CONFIG.free.features.priority).toBe(false);
    expect(PLAN_CONFIG.starter.features.priority).toBe(false);
    expect(PLAN_CONFIG.pro.features.priority).toBe(false);
    expect(PLAN_CONFIG.premium.features.priority).toBe(true);
  });

  it("free plan has most restricted features", () => {
    const freeFeatures = PLAN_CONFIG.free.features;
    expect(freeFeatures.basicSaju).toBe(true);
    expect(freeFeatures.oneCardTarot).toBe(true);
    expect(freeFeatures.detailedSaju).toBe(false);
    expect(freeFeatures.fullSaju).toBe(false);
    expect(freeFeatures.pdfReport).toBe(false);
    expect(freeFeatures.adFree).toBe(false);
  });
});

describe("Credit Service: Balance Calculation", () => {
  interface CreditBalance {
    monthlyCredits: number;
    usedCredits: number;
    bonusCredits: number;
  }

  const calculateRemainingCredits = (balance: CreditBalance): number => {
    const remaining =
      balance.monthlyCredits - balance.usedCredits + balance.bonusCredits;
    return Math.max(0, remaining);
  };

  const calculateTotalCredits = (
    balance: CreditBalance,
    totalBonusReceived?: number
  ): number => {
    const totalBonus = totalBonusReceived ?? balance.bonusCredits;
    return balance.monthlyCredits + totalBonus;
  };

  it("calculates remaining credits correctly", () => {
    expect(
      calculateRemainingCredits({
        monthlyCredits: 25,
        usedCredits: 10,
        bonusCredits: 5,
      })
    ).toBe(20); // 25 - 10 + 5 = 20
  });

  it("returns 0 when credits depleted", () => {
    expect(
      calculateRemainingCredits({
        monthlyCredits: 7,
        usedCredits: 10,
        bonusCredits: 0,
      })
    ).toBe(0);
  });

  it("includes bonus credits in calculation", () => {
    expect(
      calculateRemainingCredits({
        monthlyCredits: 7,
        usedCredits: 7,
        bonusCredits: 10,
      })
    ).toBe(10);
  });

  it("calculates total credits including bonus", () => {
    expect(
      calculateTotalCredits(
        { monthlyCredits: 25, usedCredits: 0, bonusCredits: 15 },
        20
      )
    ).toBe(45); // 25 + 20 = 45
  });
});

describe("Credit Service: Credit Usage Check", () => {
  interface UserCredits {
    plan: PlanType;
    monthlyCredits: number;
    usedCredits: number;
    bonusCredits: number;
    compatibilityUsed: number;
    compatibilityLimit: number;
    followUpUsed: number;
    followUpLimit: number;
  }

  type UsageType = "reading" | "compatibility" | "followUp";

  const canUseCredits = (
    credits: UserCredits,
    type: UsageType,
    amount: number = 1
  ): { allowed: boolean; reason?: string; remaining?: number } => {
    if (type === "reading") {
      const remaining =
        credits.monthlyCredits - credits.usedCredits + credits.bonusCredits;
      if (remaining >= amount) {
        return { allowed: true, remaining: remaining - amount };
      }
      return { allowed: false, reason: "no_credits", remaining };
    }

    if (type === "compatibility") {
      const remaining = credits.compatibilityLimit - credits.compatibilityUsed;
      if (remaining >= amount) {
        return { allowed: true, remaining: remaining - amount };
      }
      return { allowed: false, reason: "compatibility_limit", remaining };
    }

    if (type === "followUp") {
      const remaining = credits.followUpLimit - credits.followUpUsed;
      if (remaining >= amount) {
        return { allowed: true, remaining: remaining - amount };
      }
      return { allowed: false, reason: "followup_limit", remaining };
    }

    return { allowed: false, reason: "invalid_type" };
  };

  it("allows reading when credits available", () => {
    const credits: UserCredits = {
      plan: "starter",
      monthlyCredits: 25,
      usedCredits: 10,
      bonusCredits: 0,
      compatibilityUsed: 0,
      compatibilityLimit: 2,
      followUpUsed: 0,
      followUpLimit: 2,
    };

    const result = canUseCredits(credits, "reading");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(14);
  });

  it("rejects reading when no credits", () => {
    const credits: UserCredits = {
      plan: "free",
      monthlyCredits: 7,
      usedCredits: 7,
      bonusCredits: 0,
      compatibilityUsed: 0,
      compatibilityLimit: 0,
      followUpUsed: 0,
      followUpLimit: 0,
    };

    const result = canUseCredits(credits, "reading");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("no_credits");
  });

  it("uses bonus credits when monthly depleted", () => {
    const credits: UserCredits = {
      plan: "starter",
      monthlyCredits: 25,
      usedCredits: 25,
      bonusCredits: 10,
      compatibilityUsed: 0,
      compatibilityLimit: 2,
      followUpUsed: 0,
      followUpLimit: 2,
    };

    const result = canUseCredits(credits, "reading");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it("rejects compatibility when limit reached", () => {
    const credits: UserCredits = {
      plan: "starter",
      monthlyCredits: 25,
      usedCredits: 0,
      bonusCredits: 0,
      compatibilityUsed: 2,
      compatibilityLimit: 2,
      followUpUsed: 0,
      followUpLimit: 2,
    };

    const result = canUseCredits(credits, "compatibility");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("compatibility_limit");
  });

  it("allows compatibility when under limit", () => {
    const credits: UserCredits = {
      plan: "pro",
      monthlyCredits: 80,
      usedCredits: 0,
      bonusCredits: 0,
      compatibilityUsed: 3,
      compatibilityLimit: 5,
      followUpUsed: 0,
      followUpLimit: 5,
    };

    const result = canUseCredits(credits, "compatibility");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });
});

describe("Credit Service: Feature Access", () => {
  const canUseFeature = (plan: PlanType, feature: FeatureType): boolean => {
    const config = PLAN_CONFIG[plan];
    return config?.features[feature] ?? false;
  };

  it("free users can use basic saju", () => {
    expect(canUseFeature("free", "basicSaju")).toBe(true);
  });

  it("free users cannot use detailed saju", () => {
    expect(canUseFeature("free", "detailedSaju")).toBe(false);
  });

  it("starter users get ad-free experience", () => {
    expect(canUseFeature("starter", "adFree")).toBe(true);
  });

  it("pro users can access all tarot spreads", () => {
    expect(canUseFeature("pro", "allTarotSpreads")).toBe(true);
  });

  it("only premium users have priority", () => {
    expect(canUseFeature("free", "priority")).toBe(false);
    expect(canUseFeature("starter", "priority")).toBe(false);
    expect(canUseFeature("pro", "priority")).toBe(false);
    expect(canUseFeature("premium", "priority")).toBe(true);
  });

  it("handles invalid plan gracefully", () => {
    expect(canUseFeature("invalid" as PlanType, "basicSaju")).toBe(false);
  });
});

describe("Credit Service: Credit Consumption Logic", () => {
  interface ConsumeResult {
    fromBonus: number;
    fromMonthly: number;
  }

  // FIFO: Use bonus credits first
  const calculateConsumption = (
    amount: number,
    bonusCredits: number,
    monthlyRemaining: number
  ): ConsumeResult => {
    const fromBonus = Math.min(bonusCredits, amount);
    const fromMonthly = amount - fromBonus;
    return { fromBonus, fromMonthly };
  };

  it("uses bonus credits first", () => {
    const result = calculateConsumption(3, 10, 20);
    expect(result.fromBonus).toBe(3);
    expect(result.fromMonthly).toBe(0);
  });

  it("uses monthly credits when no bonus", () => {
    const result = calculateConsumption(5, 0, 20);
    expect(result.fromBonus).toBe(0);
    expect(result.fromMonthly).toBe(5);
  });

  it("splits between bonus and monthly when bonus insufficient", () => {
    const result = calculateConsumption(5, 2, 20);
    expect(result.fromBonus).toBe(2);
    expect(result.fromMonthly).toBe(3);
  });

  it("handles exact bonus amount", () => {
    const result = calculateConsumption(10, 10, 20);
    expect(result.fromBonus).toBe(10);
    expect(result.fromMonthly).toBe(0);
  });
});

describe("Credit Service: Period Calculation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const getNextPeriodEnd = (): Date => {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  };

  const isPeriodExpired = (periodEnd: Date | null): boolean => {
    if (!periodEnd) return true;
    return new Date() > periodEnd;
  };

  it("calculates next period end correctly", () => {
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
    const nextPeriod = getNextPeriodEnd();
    expect(nextPeriod.getMonth()).toBe(6); // July (0-indexed)
  });

  it("handles end of year correctly", () => {
    vi.setSystemTime(new Date("2024-12-15T12:00:00Z"));
    const nextPeriod = getNextPeriodEnd();
    expect(nextPeriod.getMonth()).toBe(0); // January
    expect(nextPeriod.getFullYear()).toBe(2025);
  });

  it("identifies expired period", () => {
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
    const pastDate = new Date("2024-06-01T00:00:00Z");
    expect(isPeriodExpired(pastDate)).toBe(true);
  });

  it("identifies active period", () => {
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
    const futureDate = new Date("2024-07-01T00:00:00Z");
    expect(isPeriodExpired(futureDate)).toBe(false);
  });

  it("treats null period as expired", () => {
    expect(isPeriodExpired(null)).toBe(true);
  });
});

describe("Credit Service: Bonus Credit Expiration", () => {
  interface BonusPurchase {
    id: string;
    remaining: number;
    expiresAt: Date;
    expired: boolean;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const getValidBonusCredits = (purchases: BonusPurchase[]): number => {
    const now = new Date();
    return purchases
      .filter((p) => !p.expired && p.expiresAt > now && p.remaining > 0)
      .reduce((sum, p) => sum + p.remaining, 0);
  };

  const identifyExpiredPurchases = (purchases: BonusPurchase[]): string[] => {
    const now = new Date();
    return purchases
      .filter((p) => !p.expired && p.expiresAt <= now && p.remaining > 0)
      .map((p) => p.id);
  };

  it("sums valid bonus credits", () => {
    const purchases: BonusPurchase[] = [
      {
        id: "1",
        remaining: 10,
        expiresAt: new Date("2024-09-15"),
        expired: false,
      },
      {
        id: "2",
        remaining: 5,
        expiresAt: new Date("2024-08-15"),
        expired: false,
      },
    ];
    expect(getValidBonusCredits(purchases)).toBe(15);
  });

  it("excludes expired purchases", () => {
    const purchases: BonusPurchase[] = [
      {
        id: "1",
        remaining: 10,
        expiresAt: new Date("2024-09-15"),
        expired: false,
      },
      {
        id: "2",
        remaining: 5,
        expiresAt: new Date("2024-05-15"),
        expired: false,
      }, // Past
    ];
    expect(getValidBonusCredits(purchases)).toBe(10);
  });

  it("excludes marked-expired purchases", () => {
    const purchases: BonusPurchase[] = [
      {
        id: "1",
        remaining: 10,
        expiresAt: new Date("2024-09-15"),
        expired: true,
      },
    ];
    expect(getValidBonusCredits(purchases)).toBe(0);
  });

  it("excludes zero-remaining purchases", () => {
    const purchases: BonusPurchase[] = [
      {
        id: "1",
        remaining: 0,
        expiresAt: new Date("2024-09-15"),
        expired: false,
      },
    ];
    expect(getValidBonusCredits(purchases)).toBe(0);
  });

  it("identifies purchases needing expiration", () => {
    const purchases: BonusPurchase[] = [
      {
        id: "valid",
        remaining: 10,
        expiresAt: new Date("2024-09-15"),
        expired: false,
      },
      {
        id: "expired1",
        remaining: 5,
        expiresAt: new Date("2024-06-01"),
        expired: false,
      },
      {
        id: "expired2",
        remaining: 3,
        expiresAt: new Date("2024-05-15"),
        expired: false,
      },
    ];

    const expiredIds = identifyExpiredPurchases(purchases);
    expect(expiredIds).toContain("expired1");
    expect(expiredIds).toContain("expired2");
    expect(expiredIds).not.toContain("valid");
  });
});

describe("Credit Service: Plan Upgrade Logic", () => {
  interface UpgradeResult {
    newPlan: PlanType;
    newMonthlyCredits: number;
    resetUsed: boolean;
    newPeriodEnd: Date;
  }

  const calculateUpgrade = (
    currentPlan: PlanType,
    newPlan: PlanType
  ): UpgradeResult | null => {
    const planOrder: PlanType[] = ["free", "starter", "pro", "premium"];
    const currentIndex = planOrder.indexOf(currentPlan);
    const newIndex = planOrder.indexOf(newPlan);

    if (newIndex === -1) return null;

    const newConfig = PLAN_CONFIG[newPlan];
    const now = new Date();
    const newPeriodEnd = new Date(now);
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

    return {
      newPlan,
      newMonthlyCredits: newConfig.monthlyCredits,
      resetUsed: true, // Always reset on upgrade
      newPeriodEnd,
    };
  };

  it("upgrades from free to starter", () => {
    const result = calculateUpgrade("free", "starter");
    expect(result?.newPlan).toBe("starter");
    expect(result?.newMonthlyCredits).toBe(25);
    expect(result?.resetUsed).toBe(true);
  });

  it("upgrades from starter to premium", () => {
    const result = calculateUpgrade("starter", "premium");
    expect(result?.newPlan).toBe("premium");
    expect(result?.newMonthlyCredits).toBe(150);
  });

  it("allows downgrade (same logic)", () => {
    const result = calculateUpgrade("premium", "free");
    expect(result?.newPlan).toBe("free");
    expect(result?.newMonthlyCredits).toBe(7);
  });

  it("handles invalid plan", () => {
    const result = calculateUpgrade("starter", "invalid" as PlanType);
    expect(result).toBeNull();
  });
});

describe("Credit Service: Subscription Validation", () => {
  interface Subscription {
    status: string;
    currentPeriodEnd: Date | null;
  }

  const isSubscriptionActive = (subscription: Subscription | null): boolean => {
    if (!subscription) return false;

    const activeStatuses = ["active", "trialing"];
    if (!activeStatuses.includes(subscription.status)) return false;

    if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd) {
      return false;
    }

    return true;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("validates active subscription", () => {
    const subscription: Subscription = {
      status: "active",
      currentPeriodEnd: new Date("2024-07-15"),
    };
    expect(isSubscriptionActive(subscription)).toBe(true);
  });

  it("validates trialing subscription", () => {
    const subscription: Subscription = {
      status: "trialing",
      currentPeriodEnd: new Date("2024-07-15"),
    };
    expect(isSubscriptionActive(subscription)).toBe(true);
  });

  it("rejects canceled subscription", () => {
    const subscription: Subscription = {
      status: "canceled",
      currentPeriodEnd: new Date("2024-07-15"),
    };
    expect(isSubscriptionActive(subscription)).toBe(false);
  });

  it("rejects expired subscription", () => {
    const subscription: Subscription = {
      status: "active",
      currentPeriodEnd: new Date("2024-06-01"),
    };
    expect(isSubscriptionActive(subscription)).toBe(false);
  });

  it("rejects null subscription", () => {
    expect(isSubscriptionActive(null)).toBe(false);
  });
});
