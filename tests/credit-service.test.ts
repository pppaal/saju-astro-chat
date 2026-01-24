/// <reference types="vitest/globals" />
/**
 * Credit Service Tests
 * - Plan configurations
 * - Credit calculations
 * - FIFO bonus credit consumption
 * - Period calculations
 * - Subscription validation
 */

import { vi } from "vitest";
import { PLAN_CONFIG, type PlanType, type FeatureType } from "../src/lib/credits/creditService";

describe("Credit Service: Plan Configuration", () => {
  it("defines all plan types", () => {
    const plans: PlanType[] = ["free", "starter", "pro", "premium"];

    plans.forEach((plan) => {
      expect(PLAN_CONFIG[plan]).toBeDefined();
      expect(PLAN_CONFIG[plan].monthlyCredits).toBeGreaterThanOrEqual(0);
    });
  });

  it("free plan has correct limits", () => {
    const free = PLAN_CONFIG.free;

    expect(free.monthlyCredits).toBe(7);
    expect(free.compatibilityLimit).toBe(0);
    expect(free.followUpLimit).toBe(0);
    expect(free.historyRetention).toBe(7);
  });

  it("premium plan has highest limits", () => {
    const premium = PLAN_CONFIG.premium;

    expect(premium.monthlyCredits).toBe(150);
    expect(premium.compatibilityLimit).toBe(10);
    expect(premium.followUpLimit).toBe(10);
    expect(premium.historyRetention).toBe(365);
  });

  it("plans have increasing credit amounts", () => {
    const plans: PlanType[] = ["free", "starter", "pro", "premium"];
    let prevCredits = 0;

    plans.forEach((plan) => {
      const credits = PLAN_CONFIG[plan].monthlyCredits;
      expect(credits).toBeGreaterThan(prevCredits);
      prevCredits = credits;
    });
  });

  it("plans have increasing compatibility limits", () => {
    expect(PLAN_CONFIG.free.compatibilityLimit).toBe(0);
    expect(PLAN_CONFIG.starter.compatibilityLimit).toBe(2);
    expect(PLAN_CONFIG.pro.compatibilityLimit).toBe(5);
    expect(PLAN_CONFIG.premium.compatibilityLimit).toBe(10);
  });

  it("plans have increasing history retention", () => {
    expect(PLAN_CONFIG.free.historyRetention).toBe(7);
    expect(PLAN_CONFIG.starter.historyRetention).toBe(30);
    expect(PLAN_CONFIG.pro.historyRetention).toBe(90);
    expect(PLAN_CONFIG.premium.historyRetention).toBe(365);
  });

  it("all plans define required features", () => {
    const requiredFeatures: FeatureType[] = [
      "basicSaju",
      "detailedSaju",
      "fullSaju",
      "oneCardTarot",
      "threeCardTarot",
      "allTarotSpreads",
      "pdfReport",
      "adFree",
      "priority",
    ];

    Object.values(PLAN_CONFIG).forEach((config) => {
      requiredFeatures.forEach((feature) => {
        expect(config.features[feature]).toBeDefined();
        expect(typeof config.features[feature]).toBe("boolean");
      });
    });
  });
});

describe("Credit Service: Feature Access", () => {
  it("free plan has basic features only", () => {
    const free = PLAN_CONFIG.free.features;

    expect(free.basicSaju).toBe(true);
    expect(free.oneCardTarot).toBe(true);

    expect(free.detailedSaju).toBe(false);
    expect(free.fullSaju).toBe(false);
    expect(free.threeCardTarot).toBe(false);
    expect(free.pdfReport).toBe(false);
    expect(free.adFree).toBe(false);
    expect(free.priority).toBe(false);
  });

  it("premium plan has all features", () => {
    const premium = PLAN_CONFIG.premium.features;

    expect(premium.basicSaju).toBe(true);
    expect(premium.detailedSaju).toBe(true);
    expect(premium.fullSaju).toBe(true);
    expect(premium.oneCardTarot).toBe(true);
    expect(premium.threeCardTarot).toBe(true);
    expect(premium.allTarotSpreads).toBe(true);
    expect(premium.pdfReport).toBe(true);
    expect(premium.adFree).toBe(true);
    expect(premium.priority).toBe(true);
  });

  it("starter plan has ad-free but not priority", () => {
    const starter = PLAN_CONFIG.starter.features;

    expect(starter.adFree).toBe(true);
    expect(starter.priority).toBe(false);
  });

  it("only premium has priority feature", () => {
    expect(PLAN_CONFIG.free.features.priority).toBe(false);
    expect(PLAN_CONFIG.starter.features.priority).toBe(false);
    expect(PLAN_CONFIG.pro.features.priority).toBe(false);
    expect(PLAN_CONFIG.premium.features.priority).toBe(true);
  });

  it("pro users can access all tarot spreads and pdf reports", () => {
    const pro = PLAN_CONFIG.pro.features;

    expect(pro.allTarotSpreads).toBe(true);
    expect(pro.pdfReport).toBe(true);
  });
});

describe("Credit Service: Credit Calculations", () => {
  const calculateRemainingCredits = (
    monthlyCredits: number,
    usedCredits: number,
    bonusCredits: number
  ): number => {
    return Math.max(0, monthlyCredits - usedCredits + bonusCredits);
  };

  it("calculates remaining credits correctly", () => {
    expect(calculateRemainingCredits(25, 10, 5)).toBe(20); // 25 - 10 + 5 = 20
  });

  it("returns 0 when credits depleted", () => {
    expect(calculateRemainingCredits(7, 10, 0)).toBe(0);
  });

  it("includes bonus credits in calculation", () => {
    expect(calculateRemainingCredits(7, 7, 10)).toBe(10);
  });

  it("calculates compatibility remaining correctly", () => {
    const remaining = Math.max(0, 5 - 3);
    expect(remaining).toBe(2);
  });
});

describe("Credit Service: Credit Consumption Logic", () => {
  // FIFO: Use bonus credits first
  const calculateConsumption = (
    amount: number,
    bonusCredits: number
  ): { fromBonus: number; fromMonthly: number } => {
    const fromBonus = Math.min(bonusCredits, amount);
    const fromMonthly = amount - fromBonus;
    return { fromBonus, fromMonthly };
  };

  it("uses bonus credits first", () => {
    const result = calculateConsumption(3, 10);
    expect(result.fromBonus).toBe(3);
    expect(result.fromMonthly).toBe(0);
  });

  it("uses monthly credits when no bonus", () => {
    const result = calculateConsumption(5, 0);
    expect(result.fromBonus).toBe(0);
    expect(result.fromMonthly).toBe(5);
  });

  it("splits between bonus and monthly when bonus insufficient", () => {
    const result = calculateConsumption(5, 2);
    expect(result.fromBonus).toBe(2);
    expect(result.fromMonthly).toBe(3);
  });

  it("handles exact bonus amount", () => {
    const result = calculateConsumption(10, 10);
    expect(result.fromBonus).toBe(10);
    expect(result.fromMonthly).toBe(0);
  });
});

describe("Credit Service: FIFO Bonus Consumption", () => {
  it("consumes from earliest expiring purchase first", () => {
    const purchases = [
      { id: "1", remaining: 10, expiresAt: new Date("2024-03-01"), createdAt: new Date("2024-01-15") },
      { id: "2", remaining: 5, expiresAt: new Date("2024-02-01"), createdAt: new Date("2024-01-01") },
      { id: "3", remaining: 15, expiresAt: new Date("2024-04-01"), createdAt: new Date("2024-01-20") },
    ];

    // Sort by expiresAt first, then createdAt
    const sorted = purchases.sort((a, b) => {
      const expireDiff = a.expiresAt.getTime() - b.expiresAt.getTime();
      if (expireDiff !== 0) return expireDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    expect(sorted[0].id).toBe("2"); // Earliest expiring
    expect(sorted[1].id).toBe("1");
    expect(sorted[2].id).toBe("3");
  });

  it("calculates consumption correctly across multiple purchases", () => {
    const purchases = [
      { id: "1", remaining: 3 },
      { id: "2", remaining: 5 },
      { id: "3", remaining: 10 },
    ];

    const amountToConsume = 7;
    let remaining = amountToConsume;
    const updates: Array<{ id: string; decrement: number }> = [];

    for (const purchase of purchases) {
      if (remaining <= 0) break;
      const toConsume = Math.min(purchase.remaining, remaining);
      updates.push({ id: purchase.id, decrement: toConsume });
      remaining -= toConsume;
    }

    expect(updates).toEqual([
      { id: "1", decrement: 3 },
      { id: "2", decrement: 4 },
    ]);
    expect(remaining).toBe(0);
  });

  it("handles partial consumption from single purchase", () => {
    const purchases = [{ id: "1", remaining: 10 }];
    const amountToConsume = 3;

    let remaining = amountToConsume;
    const updates: Array<{ id: string; decrement: number }> = [];

    for (const purchase of purchases) {
      if (remaining <= 0) break;
      const toConsume = Math.min(purchase.remaining, remaining);
      updates.push({ id: purchase.id, decrement: toConsume });
      remaining -= toConsume;
    }

    expect(updates).toEqual([{ id: "1", decrement: 3 }]);
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
      { id: "1", remaining: 10, expiresAt: new Date("2024-09-15"), expired: false },
      { id: "2", remaining: 5, expiresAt: new Date("2024-08-15"), expired: false },
    ];
    expect(getValidBonusCredits(purchases)).toBe(15);
  });

  it("excludes expired purchases by date", () => {
    const purchases: BonusPurchase[] = [
      { id: "1", remaining: 10, expiresAt: new Date("2024-09-15"), expired: false },
      { id: "2", remaining: 5, expiresAt: new Date("2024-05-15"), expired: false }, // Past
    ];
    expect(getValidBonusCredits(purchases)).toBe(10);
  });

  it("excludes marked-expired purchases", () => {
    const purchases: BonusPurchase[] = [
      { id: "1", remaining: 10, expiresAt: new Date("2024-09-15"), expired: true },
    ];
    expect(getValidBonusCredits(purchases)).toBe(0);
  });

  it("excludes zero-remaining purchases", () => {
    const purchases: BonusPurchase[] = [
      { id: "1", remaining: 0, expiresAt: new Date("2024-09-15"), expired: false },
    ];
    expect(getValidBonusCredits(purchases)).toBe(0);
  });

  it("identifies purchases needing expiration", () => {
    const purchases: BonusPurchase[] = [
      { id: "valid", remaining: 10, expiresAt: new Date("2024-09-15"), expired: false },
      { id: "expired1", remaining: 5, expiresAt: new Date("2024-06-01"), expired: false },
      { id: "expired2", remaining: 3, expiresAt: new Date("2024-05-15"), expired: false },
    ];

    const expiredIds = identifyExpiredPurchases(purchases);
    expect(expiredIds).toContain("expired1");
    expect(expiredIds).toContain("expired2");
    expect(expiredIds).not.toContain("valid");
  });
});

describe("Credit Service: Period Calculations", () => {
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
    expect(nextPeriod.getDate()).toBe(15);
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

describe("Credit Service: Plan Upgrade Logic", () => {
  const calculateUpgrade = (
    _currentPlan: PlanType,
    newPlan: PlanType
  ): { newPlan: PlanType; newMonthlyCredits: number; resetUsed: boolean } | null => {
    if (!(newPlan in PLAN_CONFIG)) return null;

    const newConfig = PLAN_CONFIG[newPlan];
    return {
      newPlan,
      newMonthlyCredits: newConfig.monthlyCredits,
      resetUsed: true,
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

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const isSubscriptionActive = (subscription: Subscription | null): boolean => {
    if (!subscription) return false;

    const activeStatuses = ["active", "trialing"];
    if (!activeStatuses.includes(subscription.status)) return false;

    if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd) {
      return false;
    }

    return true;
  };

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
      const remaining = credits.monthlyCredits - credits.usedCredits + credits.bonusCredits;
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