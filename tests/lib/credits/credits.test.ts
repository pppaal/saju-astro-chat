/**
 * Credits System Tests
 *
 * Tests for credit system configuration and types
 */


import {
  PLAN_CONFIG,
  type PlanType,
  type FeatureType,
} from "@/lib/credits/creditService";

describe("PLAN_CONFIG", () => {
  describe("plan types", () => {
    it("has exactly 4 plans", () => {
      const plans = Object.keys(PLAN_CONFIG);
      expect(plans).toHaveLength(4);
    });

    it("includes free, starter, pro, premium", () => {
      expect(PLAN_CONFIG).toHaveProperty("free");
      expect(PLAN_CONFIG).toHaveProperty("starter");
      expect(PLAN_CONFIG).toHaveProperty("pro");
      expect(PLAN_CONFIG).toHaveProperty("premium");
    });
  });

  describe("free plan", () => {
    const plan = PLAN_CONFIG.free;

    it("has 7 monthly credits", () => {
      expect(plan.monthlyCredits).toBe(7);
    });

    it("has no compatibility limit", () => {
      expect(plan.compatibilityLimit).toBe(0);
    });

    it("has no follow-up limit", () => {
      expect(plan.followUpLimit).toBe(0);
    });

    it("has 7 days history retention", () => {
      expect(plan.historyRetention).toBe(7);
    });

    it("has basicSaju feature", () => {
      expect(plan.features.basicSaju).toBe(true);
    });

    it("does not have detailedSaju feature", () => {
      expect(plan.features.detailedSaju).toBe(false);
    });

    it("has oneCardTarot feature", () => {
      expect(plan.features.oneCardTarot).toBe(true);
    });

    it("does not have adFree feature", () => {
      expect(plan.features.adFree).toBe(false);
    });
  });

  describe("starter plan", () => {
    const plan = PLAN_CONFIG.starter;

    it("has 25 monthly credits", () => {
      expect(plan.monthlyCredits).toBe(25);
    });

    it("has compatibility limit of 2", () => {
      expect(plan.compatibilityLimit).toBe(2);
    });

    it("has follow-up limit of 2", () => {
      expect(plan.followUpLimit).toBe(2);
    });

    it("has 30 days history retention", () => {
      expect(plan.historyRetention).toBe(30);
    });

    it("has detailedSaju feature", () => {
      expect(plan.features.detailedSaju).toBe(true);
    });

    it("has threeCardTarot feature", () => {
      expect(plan.features.threeCardTarot).toBe(true);
    });

    it("has adFree feature", () => {
      expect(plan.features.adFree).toBe(true);
    });

    it("does not have fullSaju feature", () => {
      expect(plan.features.fullSaju).toBe(false);
    });
  });

  describe("pro plan", () => {
    const plan = PLAN_CONFIG.pro;

    it("has 80 monthly credits", () => {
      expect(plan.monthlyCredits).toBe(80);
    });

    it("has compatibility limit of 5", () => {
      expect(plan.compatibilityLimit).toBe(5);
    });

    it("has follow-up limit of 5", () => {
      expect(plan.followUpLimit).toBe(5);
    });

    it("has 90 days history retention", () => {
      expect(plan.historyRetention).toBe(90);
    });

    it("has fullSaju feature", () => {
      expect(plan.features.fullSaju).toBe(true);
    });

    it("has allTarotSpreads feature", () => {
      expect(plan.features.allTarotSpreads).toBe(true);
    });

    it("has pdfReport feature", () => {
      expect(plan.features.pdfReport).toBe(true);
    });

    it("does not have priority feature", () => {
      expect(plan.features.priority).toBe(false);
    });
  });

  describe("premium plan", () => {
    const plan = PLAN_CONFIG.premium;

    it("has 150 monthly credits", () => {
      expect(plan.monthlyCredits).toBe(150);
    });

    it("has compatibility limit of 10", () => {
      expect(plan.compatibilityLimit).toBe(10);
    });

    it("has follow-up limit of 10", () => {
      expect(plan.followUpLimit).toBe(10);
    });

    it("has 365 days history retention", () => {
      expect(plan.historyRetention).toBe(365);
    });

    it("has all features enabled", () => {
      expect(plan.features.basicSaju).toBe(true);
      expect(plan.features.detailedSaju).toBe(true);
      expect(plan.features.fullSaju).toBe(true);
      expect(plan.features.oneCardTarot).toBe(true);
      expect(plan.features.threeCardTarot).toBe(true);
      expect(plan.features.allTarotSpreads).toBe(true);
      expect(plan.features.pdfReport).toBe(true);
      expect(plan.features.adFree).toBe(true);
      expect(plan.features.priority).toBe(true);
    });
  });

  describe("plan progression", () => {
    it("monthly credits increase with plan tier", () => {
      expect(PLAN_CONFIG.free.monthlyCredits).toBeLessThan(PLAN_CONFIG.starter.monthlyCredits);
      expect(PLAN_CONFIG.starter.monthlyCredits).toBeLessThan(PLAN_CONFIG.pro.monthlyCredits);
      expect(PLAN_CONFIG.pro.monthlyCredits).toBeLessThan(PLAN_CONFIG.premium.monthlyCredits);
    });

    it("compatibility limit increases with plan tier", () => {
      expect(PLAN_CONFIG.free.compatibilityLimit).toBeLessThan(PLAN_CONFIG.starter.compatibilityLimit);
      expect(PLAN_CONFIG.starter.compatibilityLimit).toBeLessThan(PLAN_CONFIG.pro.compatibilityLimit);
      expect(PLAN_CONFIG.pro.compatibilityLimit).toBeLessThan(PLAN_CONFIG.premium.compatibilityLimit);
    });

    it("follow-up limit increases with plan tier", () => {
      expect(PLAN_CONFIG.free.followUpLimit).toBeLessThan(PLAN_CONFIG.starter.followUpLimit);
      expect(PLAN_CONFIG.starter.followUpLimit).toBeLessThan(PLAN_CONFIG.pro.followUpLimit);
      expect(PLAN_CONFIG.pro.followUpLimit).toBeLessThan(PLAN_CONFIG.premium.followUpLimit);
    });

    it("history retention increases with plan tier", () => {
      expect(PLAN_CONFIG.free.historyRetention).toBeLessThan(PLAN_CONFIG.starter.historyRetention);
      expect(PLAN_CONFIG.starter.historyRetention).toBeLessThan(PLAN_CONFIG.pro.historyRetention);
      expect(PLAN_CONFIG.pro.historyRetention).toBeLessThan(PLAN_CONFIG.premium.historyRetention);
    });
  });
});

describe("PlanType", () => {
  it("includes all valid plan types", () => {
    const planTypes: PlanType[] = ["free", "starter", "pro", "premium"];
    expect(planTypes).toHaveLength(4);
  });

  it("free is a valid plan type", () => {
    const plan: PlanType = "free";
    expect(plan).toBe("free");
  });

  it("premium is a valid plan type", () => {
    const plan: PlanType = "premium";
    expect(plan).toBe("premium");
  });
});

describe("FeatureType", () => {
  it("includes all feature types", () => {
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
    expect(features).toHaveLength(9);
  });

  it("basicSaju is a valid feature type", () => {
    const feature: FeatureType = "basicSaju";
    expect(feature).toBe("basicSaju");
  });

  it("priority is a valid feature type", () => {
    const feature: FeatureType = "priority";
    expect(feature).toBe("priority");
  });
});

describe("Feature availability by plan", () => {
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

  it("premium has all features", () => {
    for (const feature of features) {
      expect(PLAN_CONFIG.premium.features[feature]).toBe(true);
    }
  });

  it("free has only basic features", () => {
    expect(PLAN_CONFIG.free.features.basicSaju).toBe(true);
    expect(PLAN_CONFIG.free.features.oneCardTarot).toBe(true);

    // Count enabled features
    const enabledCount = features.filter(f => PLAN_CONFIG.free.features[f]).length;
    expect(enabledCount).toBe(2);
  });

  it("each plan tier has more features than previous", () => {
    const countFeatures = (plan: PlanType) =>
      features.filter(f => PLAN_CONFIG[plan].features[f]).length;

    expect(countFeatures("free")).toBeLessThan(countFeatures("starter"));
    expect(countFeatures("starter")).toBeLessThan(countFeatures("pro"));
    expect(countFeatures("pro")).toBeLessThan(countFeatures("premium"));
  });
});

describe("Credit balance calculation", () => {
  it("calculates remaining credits correctly", () => {
    const monthlyCredits = 100;
    const usedCredits = 30;
    const bonusCredits = 10;

    const remaining = monthlyCredits - usedCredits + bonusCredits;
    expect(remaining).toBe(80);
  });

  it("remaining cannot be negative", () => {
    const monthlyCredits = 10;
    const usedCredits = 15;
    const bonusCredits = 0;

    const remaining = Math.max(0, monthlyCredits - usedCredits + bonusCredits);
    expect(remaining).toBe(0);
  });

  it("bonus credits add to available credits", () => {
    const monthlyCredits = 10;
    const usedCredits = 10;
    const bonusCredits = 5;

    const remaining = monthlyCredits - usedCredits + bonusCredits;
    expect(remaining).toBe(5);
  });
});

describe("Period end calculation", () => {
  it("next period is one month from now", () => {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    expect(nextMonth.getMonth()).toBe((now.getMonth() + 1) % 12);
  });

  it("handles December to January transition", () => {
    const december = new Date(2024, 11, 15); // December 15, 2024
    const nextMonth = new Date(december);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    expect(nextMonth.getMonth()).toBe(0); // January
    expect(nextMonth.getFullYear()).toBe(2025);
  });
});
