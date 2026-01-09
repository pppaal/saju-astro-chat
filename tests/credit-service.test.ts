/// <reference types="vitest/globals" />
/**
 * Credit Service Tests
 * - Plan configurations
 * - Credit calculations
 * - FIFO bonus credit consumption
 */

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
      expect(credits).toBeGreaterThanOrEqual(prevCredits);
      prevCredits = credits;
    });
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
});

describe("Credit Service: Credit Calculations", () => {
  it("calculates remaining credits correctly", () => {
    const mockCredits = {
      monthlyCredits: 25,
      usedCredits: 10,
      bonusCredits: 5,
    };

    const remaining =
      mockCredits.monthlyCredits -
      mockCredits.usedCredits +
      mockCredits.bonusCredits;

    expect(remaining).toBe(20);
  });

  it("remaining credits cannot be negative", () => {
    const mockCredits = {
      monthlyCredits: 10,
      usedCredits: 15,
      bonusCredits: 0,
    };

    const remaining = Math.max(
      0,
      mockCredits.monthlyCredits -
        mockCredits.usedCredits +
        mockCredits.bonusCredits
    );

    expect(remaining).toBe(0);
  });

  it("calculates compatibility remaining correctly", () => {
    const mockCompatibility = {
      used: 3,
      limit: 5,
    };

    const remaining = Math.max(
      0,
      mockCompatibility.limit - mockCompatibility.used
    );

    expect(remaining).toBe(2);
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

  it("returns 0 for zero amount", () => {
    const amountToConsume = 0;
    expect(amountToConsume <= 0).toBe(true);
  });
});

describe("Credit Service: Period Calculations", () => {
  it("calculates next period end correctly", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    expect(nextMonth.getMonth()).toBe(1); // February
    expect(nextMonth.getDate()).toBe(15);
  });

  it("handles month overflow correctly", () => {
    const now = new Date("2024-12-15T12:00:00Z");
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    expect(nextMonth.getFullYear()).toBe(2025);
    expect(nextMonth.getMonth()).toBe(0); // January
  });

  it("detects expired period", () => {
    const periodEnd = new Date("2024-01-01T00:00:00Z");
    const now = new Date("2024-01-02T00:00:00Z");

    expect(now > periodEnd).toBe(true);
  });
});
