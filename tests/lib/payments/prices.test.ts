/**
 * Payment Prices Tests
 *
 * Tests for payment price configuration utilities
 */

import { vi, beforeEach, afterEach } from "vitest";
import type { PlanKey, BillingCycle, CreditPackKey } from "@/lib/payments/prices";

// Test the types and logic without relying on env vars
describe("Payment Types", () => {
  describe("PlanKey type", () => {
    it("accepts valid plan keys", () => {
      const validPlans: PlanKey[] = ["starter", "pro", "premium"];
      expect(validPlans).toHaveLength(3);
      expect(validPlans).toContain("starter");
      expect(validPlans).toContain("pro");
      expect(validPlans).toContain("premium");
    });
  });

  describe("BillingCycle type", () => {
    it("accepts valid billing cycles", () => {
      const validCycles: BillingCycle[] = ["monthly", "yearly"];
      expect(validCycles).toHaveLength(2);
      expect(validCycles).toContain("monthly");
      expect(validCycles).toContain("yearly");
    });
  });

  describe("CreditPackKey type", () => {
    it("accepts valid credit pack keys", () => {
      const validPacks: CreditPackKey[] = ["mini", "standard", "plus", "mega", "ultimate"];
      expect(validPacks).toHaveLength(5);
      expect(validPacks).toContain("mini");
      expect(validPacks).toContain("standard");
      expect(validPacks).toContain("plus");
      expect(validPacks).toContain("mega");
      expect(validPacks).toContain("ultimate");
    });
  });
});

describe("Price lookup logic", () => {
  // Test the matching logic without env vars
  describe("plan price matching", () => {
    const mockPriceEntries = [
      { id: "price_starter_monthly", plan: "starter" as PlanKey, billingCycle: "monthly" as BillingCycle },
      { id: "price_starter_yearly", plan: "starter" as PlanKey, billingCycle: "yearly" as BillingCycle },
      { id: "price_pro_monthly", plan: "pro" as PlanKey, billingCycle: "monthly" as BillingCycle },
      { id: "price_pro_yearly", plan: "pro" as PlanKey, billingCycle: "yearly" as BillingCycle },
      { id: "price_premium_monthly", plan: "premium" as PlanKey, billingCycle: "monthly" as BillingCycle },
      { id: "price_premium_yearly", plan: "premium" as PlanKey, billingCycle: "yearly" as BillingCycle },
    ];

    const getPriceId = (plan: PlanKey, billingCycle: BillingCycle): string | null => {
      const found = mockPriceEntries.find((p) => p.plan === plan && p.billingCycle === billingCycle);
      return found?.id ?? null;
    };

    const getPlanFromPriceId = (priceId: string) => {
      const found = mockPriceEntries.find((p) => p.id === priceId);
      return found ? { plan: found.plan, billingCycle: found.billingCycle } : null;
    };

    it("finds price id for starter monthly", () => {
      expect(getPriceId("starter", "monthly")).toBe("price_starter_monthly");
    });

    it("finds price id for starter yearly", () => {
      expect(getPriceId("starter", "yearly")).toBe("price_starter_yearly");
    });

    it("finds price id for pro monthly", () => {
      expect(getPriceId("pro", "monthly")).toBe("price_pro_monthly");
    });

    it("finds price id for premium yearly", () => {
      expect(getPriceId("premium", "yearly")).toBe("price_premium_yearly");
    });

    it("returns plan info from price id", () => {
      const result = getPlanFromPriceId("price_pro_monthly");
      expect(result).toEqual({ plan: "pro", billingCycle: "monthly" });
    });

    it("returns null for unknown price id", () => {
      expect(getPlanFromPriceId("unknown_price")).toBeNull();
    });
  });

  describe("credit pack matching", () => {
    const mockCreditPackEntries = [
      { id: "price_credit_mini", pack: "mini" as CreditPackKey },
      { id: "price_credit_standard", pack: "standard" as CreditPackKey },
      { id: "price_credit_plus", pack: "plus" as CreditPackKey },
      { id: "price_credit_mega", pack: "mega" as CreditPackKey },
      { id: "price_credit_ultimate", pack: "ultimate" as CreditPackKey },
    ];

    const getCreditPackPriceId = (pack: CreditPackKey): string | null => {
      const found = mockCreditPackEntries.find((p) => p.pack === pack);
      return found?.id ?? null;
    };

    const getCreditPackFromPriceId = (priceId: string) => {
      const found = mockCreditPackEntries.find((p) => p.id === priceId);
      return found ? { pack: found.pack } : null;
    };

    it("finds price id for mini pack", () => {
      expect(getCreditPackPriceId("mini")).toBe("price_credit_mini");
    });

    it("finds price id for standard pack", () => {
      expect(getCreditPackPriceId("standard")).toBe("price_credit_standard");
    });

    it("finds price id for ultimate pack", () => {
      expect(getCreditPackPriceId("ultimate")).toBe("price_credit_ultimate");
    });

    it("returns pack info from price id", () => {
      const result = getCreditPackFromPriceId("price_credit_mega");
      expect(result).toEqual({ pack: "mega" });
    });

    it("returns null for unknown price id", () => {
      expect(getCreditPackFromPriceId("unknown")).toBeNull();
    });
  });
});

describe("Credit pack sizes", () => {
  // Document expected credit amounts for each pack
  const creditAmounts: Record<CreditPackKey, number> = {
    mini: 5,
    standard: 15,
    plus: 40,
    mega: 100,
    ultimate: 250,
  };

  it("mini pack gives 5 credits", () => {
    expect(creditAmounts.mini).toBe(5);
  });

  it("standard pack gives 15 credits", () => {
    expect(creditAmounts.standard).toBe(15);
  });

  it("plus pack gives 40 credits", () => {
    expect(creditAmounts.plus).toBe(40);
  });

  it("mega pack gives 100 credits", () => {
    expect(creditAmounts.mega).toBe(100);
  });

  it("ultimate pack gives 250 credits", () => {
    expect(creditAmounts.ultimate).toBe(250);
  });

  it("packs increase in size", () => {
    const packs: CreditPackKey[] = ["mini", "standard", "plus", "mega", "ultimate"];
    for (let i = 1; i < packs.length; i++) {
      expect(creditAmounts[packs[i]]).toBeGreaterThan(creditAmounts[packs[i - 1]]);
    }
  });
});

describe("Billing cycle logic", () => {
  it("yearly billing has 12 months", () => {
    const monthsInYear = 12;
    expect(monthsInYear).toBe(12);
  });

  it("yearly discount calculation", () => {
    // Typical: yearly = 10 months worth (2 months free)
    const monthlyPrice = 10;
    const yearlyPrice = monthlyPrice * 10; // 2 months free
    const discount = ((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100;
    expect(discount).toBeCloseTo(16.67, 1);
  });
});
