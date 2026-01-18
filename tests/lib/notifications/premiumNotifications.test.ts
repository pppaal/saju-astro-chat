/**
 * Premium Notifications Tests
 * Tests for credit, premium features, and promotion notifications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  generateCreditLowNotification,
  generateCreditDepletedNotification,
  generateCalendarPremiumNotification,
  generatePromotionNotification,
  generateNewFeatureNotification,
  generatePremiumNotifications,
  checkActivePromotions,
  shouldSendNotification,
  CreditStatus,
  PremiumNotificationOptions,
} from "@/lib/notifications/premiumNotifications";

describe("Premium Notifications", () => {
  describe("generateCreditLowNotification", () => {
    const baseCreditStatus: CreditStatus = {
      plan: "free",
      remaining: 3,
      total: 10,
      bonusCredits: 0,
      percentUsed: 70,
    };

    it("returns null when credits >= 5", () => {
      const status = { ...baseCreditStatus, remaining: 5 };
      const result = generateCreditLowNotification(status);
      expect(result).toBeNull();
    });

    it("returns null when credits > 5", () => {
      const status = { ...baseCreditStatus, remaining: 10 };
      const result = generateCreditLowNotification(status);
      expect(result).toBeNull();
    });

    it("returns notification when credits < 5", () => {
      const status = { ...baseCreditStatus, remaining: 4 };
      const result = generateCreditLowNotification(status);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("credit_low");
    });

    it("returns notification when credits = 0", () => {
      const status = { ...baseCreditStatus, remaining: 0 };
      const result = generateCreditLowNotification(status);
      expect(result).not.toBeNull();
    });

    describe("free plan messages", () => {
      it("shows warning emoji for free plan", () => {
        const status = { ...baseCreditStatus, plan: "free", remaining: 2 };
        const result = generateCreditLowNotification(status);
        expect(result?.emoji).toBe("⚠️");
        expect(result?.category).toBe("caution");
      });

      it("generates Korean message for free plan", () => {
        const status = { ...baseCreditStatus, plan: "free", remaining: 3 };
        const result = generateCreditLowNotification(status, "회원", "ko");
        expect(result?.title).toContain("⚠️");
        expect(result?.title).toContain("3개");
        expect(result?.message).toContain("프리미엄 플랜");
      });

      it("generates English message for free plan", () => {
        const status = { ...baseCreditStatus, plan: "free", remaining: 3 };
        const result = generateCreditLowNotification(status, "User", "en");
        expect(result?.title).toContain("⚠️");
        expect(result?.title).toContain("3 credits");
        expect(result?.message).toContain("Upgrade to Premium");
      });
    });

    describe("paid plan messages", () => {
      it("shows diamond emoji for paid plan", () => {
        const status = { ...baseCreditStatus, plan: "premium", remaining: 2 };
        const result = generateCreditLowNotification(status);
        expect(result?.emoji).toBe("💎");
        expect(result?.category).toBe("neutral");
      });

      it("generates Korean message for paid plan", () => {
        const status = { ...baseCreditStatus, plan: "premium", remaining: 3 };
        const result = generateCreditLowNotification(status, "회원", "ko");
        expect(result?.title).toContain("💎");
        expect(result?.message).toContain("추가 크레딧");
      });

      it("generates English message for paid plan", () => {
        const status = { ...baseCreditStatus, plan: "premium", remaining: 3 };
        const result = generateCreditLowNotification(status, "User", "en");
        expect(result?.title).toContain("💎");
        expect(result?.message).toContain("Buy more credits");
      });
    });

    it("has correct notification properties", () => {
      const result = generateCreditLowNotification(baseCreditStatus);
      expect(result).toMatchObject({
        type: "credit_low",
        scheduledHour: 20,
        confidence: 5,
        data: { url: "/pricing" },
      });
    });
  });

  describe("generateCreditDepletedNotification", () => {
    it("generates Korean notification by default", () => {
      const result = generateCreditDepletedNotification();
      expect(result.title).toContain("🚨");
      expect(result.title).toContain("소진");
      expect(result.message).toContain("회원");
      expect(result.message).toContain("프리미엄");
    });

    it("includes userName in Korean message", () => {
      const result = generateCreditDepletedNotification("홍길동", "ko");
      expect(result.message).toContain("홍길동님");
    });

    it("generates English notification", () => {
      const result = generateCreditDepletedNotification("John", "en");
      expect(result.title).toContain("No credits remaining");
      expect(result.message).toContain("John");
      expect(result.message).toContain("Premium");
    });

    it("has correct notification properties", () => {
      const result = generateCreditDepletedNotification();
      expect(result).toMatchObject({
        type: "credit_depleted",
        emoji: "🚨",
        scheduledHour: 12,
        confidence: 5,
        category: "caution",
        data: { url: "/pricing" },
      });
    });
  });

  describe("generateCalendarPremiumNotification", () => {
    it("generates Korean notification by default", () => {
      const result = generateCalendarPremiumNotification();
      expect(result.title).toContain("📅");
      expect(result.title).toContain("운세 캘린더");
      expect(result.message).toContain("회원님");
    });

    it("includes userName in Korean message", () => {
      const result = generateCalendarPremiumNotification("홍길동", "ko");
      expect(result.message).toContain("홍길동님");
    });

    it("generates English notification", () => {
      const result = generateCalendarPremiumNotification("John", "en");
      expect(result.title).toContain("Premium Destiny Calendar");
      expect(result.message).toContain("John");
    });

    it("has correct notification properties", () => {
      const result = generateCalendarPremiumNotification();
      expect(result).toMatchObject({
        type: "premium_feature",
        emoji: "📅",
        scheduledHour: 10,
        confidence: 4,
        category: "positive",
        data: { url: "/destiny-map" },
      });
    });
  });

  describe("generatePromotionNotification", () => {
    const basePromotion = {
      title: "설날 특별 할인",
      discount: 30,
    };

    it("generates Korean notification by default", () => {
      const result = generatePromotionNotification(basePromotion);
      expect(result.title).toContain("🎉");
      expect(result.title).toContain("30%");
      expect(result.message).toContain("설날 특별 할인");
    });

    it("generates English notification", () => {
      const result = generatePromotionNotification(
        { title: "New Year Sale", discount: 30 },
        "en"
      );
      expect(result.title).toContain("30% Special Offer");
      expect(result.message).toContain("New Year Sale");
    });

    it("includes end date in Korean format", () => {
      const promo = {
        ...basePromotion,
        endDate: new Date("2025-02-01"),
      };
      const result = generatePromotionNotification(promo, "ko");
      expect(result.message).toContain("까지");
    });

    it("includes end date in English format", () => {
      const promo = {
        title: "Sale",
        discount: 20,
        endDate: new Date("2025-02-01"),
      };
      const result = generatePromotionNotification(promo, "en");
      expect(result.message).toContain("until");
    });

    it("handles promotion without end date", () => {
      const result = generatePromotionNotification(basePromotion, "ko");
      expect(result.message).toContain("지금");
      expect(result.message).not.toContain("까지");
    });

    it("has correct notification properties", () => {
      const result = generatePromotionNotification(basePromotion);
      expect(result).toMatchObject({
        type: "promotion",
        emoji: "🎉",
        scheduledHour: 19,
        confidence: 5,
        category: "positive",
        data: { url: "/pricing" },
      });
    });
  });

  describe("generateNewFeatureNotification", () => {
    const baseFeature = {
      name: "AI 타로",
      description: "인공지능이 당신의 운세를 분석합니다",
      url: "/tarot",
    };

    it("generates Korean notification by default", () => {
      const result = generateNewFeatureNotification(baseFeature);
      expect(result.title).toContain("✨");
      expect(result.title).toContain("AI 타로");
      expect(result.message).toBe(baseFeature.description);
    });

    it("generates English notification", () => {
      const feature = {
        name: "AI Tarot",
        description: "AI analyzes your fortune",
        url: "/tarot",
      };
      const result = generateNewFeatureNotification(feature, "en");
      expect(result.title).toContain("New Feature: AI Tarot");
    });

    it("uses provided URL", () => {
      const result = generateNewFeatureNotification(baseFeature);
      expect(result.data?.url).toBe("/tarot");
    });

    it("defaults to root URL when not provided", () => {
      const feature = {
        name: "Test",
        description: "Test description",
      };
      const result = generateNewFeatureNotification(feature);
      expect(result.data?.url).toBe("/");
    });

    it("has correct notification properties", () => {
      const result = generateNewFeatureNotification(baseFeature);
      expect(result).toMatchObject({
        type: "new_feature",
        emoji: "✨",
        scheduledHour: 11,
        confidence: 4,
        category: "positive",
      });
    });
  });

  describe("generatePremiumNotifications", () => {
    describe("credit notifications", () => {
      it("returns empty array when no options provided", () => {
        const result = generatePremiumNotifications({});
        expect(result).toEqual([]);
      });

      it("returns credit depleted notification when remaining is 0", () => {
        const options: PremiumNotificationOptions = {
          creditStatus: {
            plan: "free",
            remaining: 0,
            total: 10,
            bonusCredits: 0,
            percentUsed: 100,
          },
        };
        const result = generatePremiumNotifications(options);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("credit_depleted");
      });

      it("returns credit low notification when remaining < 5", () => {
        const options: PremiumNotificationOptions = {
          creditStatus: {
            plan: "free",
            remaining: 3,
            total: 10,
            bonusCredits: 0,
            percentUsed: 70,
          },
        };
        const result = generatePremiumNotifications(options);
        expect(result.some((n) => n.type === "credit_low")).toBe(true);
      });

      it("returns no credit notification when remaining >= 5", () => {
        const options: PremiumNotificationOptions = {
          creditStatus: {
            plan: "free",
            remaining: 5,
            total: 10,
            bonusCredits: 0,
            percentUsed: 50,
          },
        };
        const result = generatePremiumNotifications(options);
        expect(result.filter((n) => n.type === "credit_low")).toHaveLength(0);
        expect(result.filter((n) => n.type === "credit_depleted")).toHaveLength(0);
      });
    });

    describe("premium feature notifications for free users", () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      it("shows calendar notification on Saturday for free users", () => {
        // Set date to Saturday
        vi.setSystemTime(new Date("2025-01-18")); // Saturday

        const options: PremiumNotificationOptions = {
          creditStatus: {
            plan: "free",
            remaining: 10,
            total: 10,
            bonusCredits: 0,
            percentUsed: 0,
          },
          hasActiveSubscription: false,
        };
        const result = generatePremiumNotifications(options);
        expect(result.some((n) => n.type === "premium_feature")).toBe(true);
      });

      it("does not show calendar notification on non-Saturday", () => {
        // Set date to Monday
        vi.setSystemTime(new Date("2025-01-20")); // Monday

        const options: PremiumNotificationOptions = {
          creditStatus: {
            plan: "free",
            remaining: 10,
            total: 10,
            bonusCredits: 0,
            percentUsed: 0,
          },
          hasActiveSubscription: false,
        };
        const result = generatePremiumNotifications(options);
        expect(result.some((n) => n.type === "premium_feature")).toBe(false);
      });

      it("does not show calendar notification to subscribers", () => {
        vi.setSystemTime(new Date("2025-01-18")); // Saturday

        const options: PremiumNotificationOptions = {
          creditStatus: {
            plan: "premium",
            remaining: 10,
            total: 100,
            bonusCredits: 0,
            percentUsed: 0,
          },
          hasActiveSubscription: true,
        };
        const result = generatePremiumNotifications(options);
        expect(result.some((n) => n.type === "premium_feature")).toBe(false);
      });
    });

    it("uses provided userName and locale", () => {
      const options: PremiumNotificationOptions = {
        creditStatus: {
          plan: "free",
          remaining: 0,
          total: 10,
          bonusCredits: 0,
          percentUsed: 100,
        },
        userName: "TestUser",
        locale: "en",
      };
      const result = generatePremiumNotifications(options);
      expect(result[0].message).toContain("TestUser");
    });
  });

  describe("checkActivePromotions", () => {
    const originalEnv = process.env.ACTIVE_PROMOTION;

    afterEach(() => {
      process.env.ACTIVE_PROMOTION = originalEnv;
    });

    it("returns null when no promotion is active", async () => {
      delete process.env.ACTIVE_PROMOTION;
      const result = await checkActivePromotions();
      expect(result).toBeNull();
    });

    it("returns promotion notification when promotion is active", async () => {
      process.env.ACTIVE_PROMOTION = JSON.stringify({
        title: "Test Promotion",
        discount: 25,
      });
      const result = await checkActivePromotions();
      expect(result).not.toBeNull();
      expect(result?.type).toBe("promotion");
      expect(result?.title).toContain("25%");
    });

    it("handles invalid JSON gracefully", async () => {
      process.env.ACTIVE_PROMOTION = "invalid json";
      const result = await checkActivePromotions();
      expect(result).toBeNull();
    });

    it("uses provided locale", async () => {
      process.env.ACTIVE_PROMOTION = JSON.stringify({
        title: "Sale",
        discount: 20,
      });
      const result = await checkActivePromotions("en");
      expect(result?.title).toContain("Special Offer");
    });
  });

  describe("shouldSendNotification", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-01-15T12:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns true when no last notification date", () => {
      const result = shouldSendNotification(undefined);
      expect(result).toBe(true);
    });

    it("returns true when cooldown has passed", () => {
      const lastNotification = new Date("2025-01-14T11:00:00"); // 25 hours ago
      const result = shouldSendNotification(lastNotification, 24);
      expect(result).toBe(true);
    });

    it("returns false when within cooldown period", () => {
      const lastNotification = new Date("2025-01-15T11:00:00"); // 1 hour ago
      const result = shouldSendNotification(lastNotification, 24);
      expect(result).toBe(false);
    });

    it("respects custom cooldown hours", () => {
      const lastNotification = new Date("2025-01-15T10:00:00"); // 2 hours ago
      expect(shouldSendNotification(lastNotification, 1)).toBe(true);
      expect(shouldSendNotification(lastNotification, 3)).toBe(false);
    });

    it("returns true exactly at cooldown boundary", () => {
      const lastNotification = new Date("2025-01-14T12:00:00"); // exactly 24 hours ago
      const result = shouldSendNotification(lastNotification, 24);
      expect(result).toBe(true);
    });
  });

  describe("CreditStatus interface", () => {
    it("defines all required properties", () => {
      const status: CreditStatus = {
        plan: "premium",
        remaining: 50,
        total: 100,
        bonusCredits: 10,
        percentUsed: 50,
      };

      expect(status).toHaveProperty("plan");
      expect(status).toHaveProperty("remaining");
      expect(status).toHaveProperty("total");
      expect(status).toHaveProperty("bonusCredits");
      expect(status).toHaveProperty("percentUsed");
    });
  });

  describe("PremiumNotificationOptions interface", () => {
    it("accepts all optional properties", () => {
      const options: PremiumNotificationOptions = {
        creditStatus: {
          plan: "free",
          remaining: 5,
          total: 10,
          bonusCredits: 0,
          percentUsed: 50,
        },
        hasActiveSubscription: false,
        lastNotificationDate: new Date(),
        userName: "TestUser",
        locale: "ko",
      };

      expect(options.creditStatus).toBeDefined();
      expect(options.hasActiveSubscription).toBe(false);
      expect(options.lastNotificationDate).toBeInstanceOf(Date);
      expect(options.userName).toBe("TestUser");
      expect(options.locale).toBe("ko");
    });

    it("allows empty object", () => {
      const options: PremiumNotificationOptions = {};
      expect(options).toEqual({});
    });
  });

  describe("Notification types", () => {
    it("credit_low type has correct structure", () => {
      const status: CreditStatus = {
        plan: "free",
        remaining: 2,
        total: 10,
        bonusCredits: 0,
        percentUsed: 80,
      };
      const notification = generateCreditLowNotification(status);
      expect(notification?.type).toBe("credit_low");
    });

    it("credit_depleted type has correct structure", () => {
      const notification = generateCreditDepletedNotification();
      expect(notification.type).toBe("credit_depleted");
    });

    it("premium_feature type has correct structure", () => {
      const notification = generateCalendarPremiumNotification();
      expect(notification.type).toBe("premium_feature");
    });

    it("promotion type has correct structure", () => {
      const notification = generatePromotionNotification({
        title: "Test",
        discount: 10,
      });
      expect(notification.type).toBe("promotion");
    });

    it("new_feature type has correct structure", () => {
      const notification = generateNewFeatureNotification({
        name: "Test",
        description: "Test description",
      });
      expect(notification.type).toBe("new_feature");
    });
  });
});
