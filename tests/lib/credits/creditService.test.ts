/**
 * Credit Service Tests
 *
 * Tests for credit system and plan configuration
 */

import { vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    userCredits: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    bonusCreditPurchase: {
      findMany: vi.fn(() => []),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn()),
  },
}));

import { PLAN_CONFIG, type PlanType, type FeatureType } from "@/lib/credits/creditService";

describe("PLAN_CONFIG", () => {
  describe("free plan", () => {
    it("has correct monthly credits", () => {
      expect(PLAN_CONFIG.free.monthlyCredits).toBe(7);
    });

    it("has no compatibility limit", () => {
      expect(PLAN_CONFIG.free.compatibilityLimit).toBe(0);
    });

    it("has no follow-up limit", () => {
      expect(PLAN_CONFIG.free.followUpLimit).toBe(0);
    });

    it("has 7 days history retention", () => {
      expect(PLAN_CONFIG.free.historyRetention).toBe(7);
    });

    it("has limited features", () => {
      const features = PLAN_CONFIG.free.features;
      expect(features.basicSaju).toBe(true);
      expect(features.detailedSaju).toBe(false);
      expect(features.fullSaju).toBe(false);
      expect(features.oneCardTarot).toBe(true);
      expect(features.threeCardTarot).toBe(false);
      expect(features.allTarotSpreads).toBe(false);
      expect(features.pdfReport).toBe(false);
      expect(features.adFree).toBe(false);
      expect(features.priority).toBe(false);
    });
  });

  describe("starter plan", () => {
    it("has correct monthly credits", () => {
      expect(PLAN_CONFIG.starter.monthlyCredits).toBe(25);
    });

    it("has compatibility limit of 2", () => {
      expect(PLAN_CONFIG.starter.compatibilityLimit).toBe(2);
    });

    it("has follow-up limit of 2", () => {
      expect(PLAN_CONFIG.starter.followUpLimit).toBe(2);
    });

    it("has 30 days history retention", () => {
      expect(PLAN_CONFIG.starter.historyRetention).toBe(30);
    });

    it("has expanded features", () => {
      const features = PLAN_CONFIG.starter.features;
      expect(features.basicSaju).toBe(true);
      expect(features.detailedSaju).toBe(true);
      expect(features.fullSaju).toBe(false);
      expect(features.oneCardTarot).toBe(true);
      expect(features.threeCardTarot).toBe(true);
      expect(features.allTarotSpreads).toBe(false);
      expect(features.adFree).toBe(true);
    });
  });

  describe("pro plan", () => {
    it("has correct monthly credits", () => {
      expect(PLAN_CONFIG.pro.monthlyCredits).toBe(80);
    });

    it("has compatibility limit of 5", () => {
      expect(PLAN_CONFIG.pro.compatibilityLimit).toBe(5);
    });

    it("has follow-up limit of 5", () => {
      expect(PLAN_CONFIG.pro.followUpLimit).toBe(5);
    });

    it("has 90 days history retention", () => {
      expect(PLAN_CONFIG.pro.historyRetention).toBe(90);
    });

    it("has most features except priority", () => {
      const features = PLAN_CONFIG.pro.features;
      expect(features.basicSaju).toBe(true);
      expect(features.detailedSaju).toBe(true);
      expect(features.fullSaju).toBe(true);
      expect(features.oneCardTarot).toBe(true);
      expect(features.threeCardTarot).toBe(true);
      expect(features.allTarotSpreads).toBe(true);
      expect(features.pdfReport).toBe(true);
      expect(features.adFree).toBe(true);
      expect(features.priority).toBe(false);
    });
  });

  describe("premium plan", () => {
    it("has correct monthly credits", () => {
      expect(PLAN_CONFIG.premium.monthlyCredits).toBe(150);
    });

    it("has compatibility limit of 10", () => {
      expect(PLAN_CONFIG.premium.compatibilityLimit).toBe(10);
    });

    it("has follow-up limit of 10", () => {
      expect(PLAN_CONFIG.premium.followUpLimit).toBe(10);
    });

    it("has 365 days history retention", () => {
      expect(PLAN_CONFIG.premium.historyRetention).toBe(365);
    });

    it("has all features enabled", () => {
      const features = PLAN_CONFIG.premium.features;
      expect(features.basicSaju).toBe(true);
      expect(features.detailedSaju).toBe(true);
      expect(features.fullSaju).toBe(true);
      expect(features.oneCardTarot).toBe(true);
      expect(features.threeCardTarot).toBe(true);
      expect(features.allTarotSpreads).toBe(true);
      expect(features.pdfReport).toBe(true);
      expect(features.adFree).toBe(true);
      expect(features.priority).toBe(true);
    });
  });

  describe("plan comparisons", () => {
    it("credits increase with higher plans", () => {
      expect(PLAN_CONFIG.starter.monthlyCredits).toBeGreaterThan(PLAN_CONFIG.free.monthlyCredits);
      expect(PLAN_CONFIG.pro.monthlyCredits).toBeGreaterThan(PLAN_CONFIG.starter.monthlyCredits);
      expect(PLAN_CONFIG.premium.monthlyCredits).toBeGreaterThan(PLAN_CONFIG.pro.monthlyCredits);
    });

    it("history retention increases with higher plans", () => {
      expect(PLAN_CONFIG.starter.historyRetention).toBeGreaterThan(PLAN_CONFIG.free.historyRetention);
      expect(PLAN_CONFIG.pro.historyRetention).toBeGreaterThan(PLAN_CONFIG.starter.historyRetention);
      expect(PLAN_CONFIG.premium.historyRetention).toBeGreaterThan(PLAN_CONFIG.pro.historyRetention);
    });

    it("compatibility limits increase with higher plans", () => {
      expect(PLAN_CONFIG.starter.compatibilityLimit).toBeGreaterThan(PLAN_CONFIG.free.compatibilityLimit);
      expect(PLAN_CONFIG.pro.compatibilityLimit).toBeGreaterThan(PLAN_CONFIG.starter.compatibilityLimit);
      expect(PLAN_CONFIG.premium.compatibilityLimit).toBeGreaterThan(PLAN_CONFIG.pro.compatibilityLimit);
    });
  });

  describe("feature availability", () => {
    const plans: PlanType[] = ["free", "starter", "pro", "premium"];

    it("basicSaju is available on all plans", () => {
      for (const plan of plans) {
        expect(PLAN_CONFIG[plan].features.basicSaju).toBe(true);
      }
    });

    it("oneCardTarot is available on all plans", () => {
      for (const plan of plans) {
        expect(PLAN_CONFIG[plan].features.oneCardTarot).toBe(true);
      }
    });

    it("fullSaju requires pro or higher", () => {
      expect(PLAN_CONFIG.free.features.fullSaju).toBe(false);
      expect(PLAN_CONFIG.starter.features.fullSaju).toBe(false);
      expect(PLAN_CONFIG.pro.features.fullSaju).toBe(true);
      expect(PLAN_CONFIG.premium.features.fullSaju).toBe(true);
    });

    it("priority is premium only", () => {
      expect(PLAN_CONFIG.free.features.priority).toBe(false);
      expect(PLAN_CONFIG.starter.features.priority).toBe(false);
      expect(PLAN_CONFIG.pro.features.priority).toBe(false);
      expect(PLAN_CONFIG.premium.features.priority).toBe(true);
    });

    it("adFree requires starter or higher", () => {
      expect(PLAN_CONFIG.free.features.adFree).toBe(false);
      expect(PLAN_CONFIG.starter.features.adFree).toBe(true);
      expect(PLAN_CONFIG.pro.features.adFree).toBe(true);
      expect(PLAN_CONFIG.premium.features.adFree).toBe(true);
    });
  });
});

describe("Credit calculation utilities", () => {
  describe("remaining credits calculation", () => {
    it("calculates remaining correctly", () => {
      const calculateRemaining = (monthly: number, used: number, bonus: number) => {
        return Math.max(0, monthly - used + bonus);
      };

      expect(calculateRemaining(7, 0, 0)).toBe(7);
      expect(calculateRemaining(7, 5, 0)).toBe(2);
      expect(calculateRemaining(7, 7, 0)).toBe(0);
      expect(calculateRemaining(7, 10, 0)).toBe(0); // Can't go negative
      expect(calculateRemaining(7, 5, 3)).toBe(5); // Bonus adds to remaining
    });
  });

  describe("feature availability check", () => {
    it("checks if feature is available for plan", () => {
      const canUseFeature = (plan: PlanType, feature: FeatureType): boolean => {
        return PLAN_CONFIG[plan].features[feature];
      };

      expect(canUseFeature("free", "basicSaju")).toBe(true);
      expect(canUseFeature("free", "fullSaju")).toBe(false);
      expect(canUseFeature("premium", "fullSaju")).toBe(true);
    });
  });

  describe("compatibility limit check", () => {
    it("checks if user can use compatibility", () => {
      const canUseCompatibility = (used: number, limit: number): boolean => {
        return used < limit;
      };

      expect(canUseCompatibility(0, 2)).toBe(true);
      expect(canUseCompatibility(1, 2)).toBe(true);
      expect(canUseCompatibility(2, 2)).toBe(false);
      expect(canUseCompatibility(0, 0)).toBe(false); // Free plan
    });
  });

  describe("period calculation", () => {
    it("calculates next period end correctly", () => {
      // Use a fixed date for consistent testing
      const now = new Date(2024, 5, 15); // June 15, 2024
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Should be July 15, 2024
      expect(nextMonth.getMonth()).toBe(6); // July
      expect(nextMonth.getDate()).toBe(15);

      // Calculate difference
      const diffMs = nextMonth.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      expect(diffDays).toBeGreaterThanOrEqual(28);
      expect(diffDays).toBeLessThanOrEqual(31);
    });

    it("handles month boundaries correctly", () => {
      // Test that setting month from December goes to next year
      const december = new Date(2024, 11, 15); // December 15, 2024
      const nextMonth = new Date(december);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      expect(nextMonth.getFullYear()).toBe(2025);
      expect(nextMonth.getMonth()).toBe(0); // January
    });
  });
});

describe("Credit types", () => {
  it("has valid plan types", () => {
    const validPlans: PlanType[] = ["free", "starter", "pro", "premium"];

    for (const plan of validPlans) {
      expect(PLAN_CONFIG[plan]).toBeDefined();
    }
  });

  it("has valid feature types", () => {
    const features: FeatureType[] = [
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

    for (const feature of features) {
      expect(typeof PLAN_CONFIG.free.features[feature]).toBe("boolean");
    }
  });
});

describe("Plan upgrade paths", () => {
  it("identifies valid upgrade paths", () => {
    const planHierarchy: PlanType[] = ["free", "starter", "pro", "premium"];

    const isUpgrade = (from: PlanType, to: PlanType): boolean => {
      return planHierarchy.indexOf(to) > planHierarchy.indexOf(from);
    };

    expect(isUpgrade("free", "starter")).toBe(true);
    expect(isUpgrade("free", "pro")).toBe(true);
    expect(isUpgrade("free", "premium")).toBe(true);
    expect(isUpgrade("starter", "pro")).toBe(true);
    expect(isUpgrade("pro", "premium")).toBe(true);

    // Not upgrades
    expect(isUpgrade("premium", "pro")).toBe(false);
    expect(isUpgrade("starter", "free")).toBe(false);
    expect(isUpgrade("pro", "pro")).toBe(false);
  });

  it("calculates credit difference on upgrade", () => {
    const getUpgradeCredits = (from: PlanType, to: PlanType): number => {
      return PLAN_CONFIG[to].monthlyCredits - PLAN_CONFIG[from].monthlyCredits;
    };

    expect(getUpgradeCredits("free", "starter")).toBe(18); // 25 - 7
    expect(getUpgradeCredits("starter", "pro")).toBe(55); // 80 - 25
    expect(getUpgradeCredits("pro", "premium")).toBe(70); // 150 - 80
  });
});
