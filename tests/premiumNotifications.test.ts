/**
 * Premium Notifications 테스트
 * - 크레딧 부족 알림
 * - 프로모션 알림
 * - 알림 쿨다운 로직
 */

import { vi, beforeEach, afterEach } from "vitest";
import {
  generateCreditLowNotification,
  generateCreditDepletedNotification,
  generateCalendarPremiumNotification,
  generatePromotionNotification,
  generateNewFeatureNotification,
  generatePremiumNotifications,
  shouldSendNotification,
} from "@/lib/notifications/premiumNotifications";

describe("generateCreditLowNotification", () => {
  it("returns null when credits >= 5", () => {
    const creditStatus = {
      plan: "free",
      remaining: 5,
      total: 10,
      bonusCredits: 0,
      percentUsed: 50,
    };

    const notification = generateCreditLowNotification(creditStatus);

    expect(notification).toBeNull();
  });

  it("returns notification when credits < 5", () => {
    const creditStatus = {
      plan: "free",
      remaining: 3,
      total: 10,
      bonusCredits: 0,
      percentUsed: 70,
    };

    const notification = generateCreditLowNotification(creditStatus);

    expect(notification).not.toBeNull();
    expect(notification?.type).toBe("credit_low");
  });

  it("shows warning emoji for free plan", () => {
    const creditStatus = {
      plan: "free",
      remaining: 2,
      total: 10,
      bonusCredits: 0,
      percentUsed: 80,
    };

    const notification = generateCreditLowNotification(creditStatus);

    expect(notification?.emoji).toBe("⚠️");
    expect(notification?.category).toBe("caution");
  });

  it("shows diamond emoji for paid plan", () => {
    const creditStatus = {
      plan: "basic",
      remaining: 3,
      total: 50,
      bonusCredits: 0,
      percentUsed: 94,
    };

    const notification = generateCreditLowNotification(creditStatus);

    expect(notification?.emoji).toBe("💎");
    expect(notification?.category).toBe("neutral");
  });

  it("includes pricing URL", () => {
    const creditStatus = {
      plan: "free",
      remaining: 1,
      total: 10,
      bonusCredits: 0,
      percentUsed: 90,
    };

    const notification = generateCreditLowNotification(creditStatus);

    expect(notification?.data?.url).toBe("/pricing");
  });

  it("uses English for en locale", () => {
    const creditStatus = {
      plan: "free",
      remaining: 2,
      total: 10,
      bonusCredits: 0,
      percentUsed: 80,
    };

    const notification = generateCreditLowNotification(creditStatus, "User", "en");

    expect(notification?.title).toContain("credits left");
  });

  it("uses Korean by default", () => {
    const creditStatus = {
      plan: "free",
      remaining: 2,
      total: 10,
      bonusCredits: 0,
      percentUsed: 80,
    };

    const notification = generateCreditLowNotification(creditStatus);

    expect(notification?.title).toContain("크레딧");
  });
});

describe("generateCreditDepletedNotification", () => {
  it("returns notification with alert emoji", () => {
    const notification = generateCreditDepletedNotification();

    expect(notification.emoji).toBe("🚨");
    expect(notification.type).toBe("credit_depleted");
  });

  it("includes user name in message", () => {
    const notification = generateCreditDepletedNotification("홍길동", "ko");

    expect(notification.message).toContain("홍길동");
  });

  it("scheduled at noon", () => {
    const notification = generateCreditDepletedNotification();

    expect(notification.scheduledHour).toBe(12);
  });

  it("links to pricing page", () => {
    const notification = generateCreditDepletedNotification();

    expect(notification.data?.url).toBe("/pricing");
  });

  it("uses English for en locale", () => {
    const notification = generateCreditDepletedNotification("User", "en");

    expect(notification.title).toContain("No credits remaining");
  });
});

describe("generateCalendarPremiumNotification", () => {
  it("returns calendar feature notification", () => {
    const notification = generateCalendarPremiumNotification();

    expect(notification.type).toBe("premium_feature");
    expect(notification.emoji).toBe("📅");
  });

  it("scheduled at 10 AM", () => {
    const notification = generateCalendarPremiumNotification();

    expect(notification.scheduledHour).toBe(10);
  });

  it("links to destiny-map", () => {
    const notification = generateCalendarPremiumNotification();

    expect(notification.data?.url).toBe("/destiny-map");
  });

  it("is positive category", () => {
    const notification = generateCalendarPremiumNotification();

    expect(notification.category).toBe("positive");
  });
});

describe("generatePromotionNotification", () => {
  it("includes discount percentage", () => {
    const notification = generatePromotionNotification({
      title: "Summer Sale",
      discount: 30,
    });

    expect(notification.title).toContain("30%");
  });

  it("includes end date when provided", () => {
    const endDate = new Date("2024-12-31");
    const notification = generatePromotionNotification({
      title: "Year End Sale",
      discount: 50,
      endDate,
    }, "ko");

    expect(notification.message).toContain("2024");
  });

  it("scheduled at 7 PM", () => {
    const notification = generatePromotionNotification({
      title: "Sale",
      discount: 20,
    });

    expect(notification.scheduledHour).toBe(19);
  });

  it("uses party emoji", () => {
    const notification = generatePromotionNotification({
      title: "Sale",
      discount: 20,
    });

    expect(notification.emoji).toBe("🎉");
  });

  it("type is promotion", () => {
    const notification = generatePromotionNotification({
      title: "Sale",
      discount: 20,
    });

    expect(notification.type).toBe("promotion");
  });
});

describe("generateNewFeatureNotification", () => {
  it("includes feature name in title", () => {
    const notification = generateNewFeatureNotification({
      name: "AI Chat",
      description: "Talk with AI",
    });

    expect(notification.title).toContain("AI Chat");
  });

  it("uses sparkle emoji", () => {
    const notification = generateNewFeatureNotification({
      name: "Feature",
      description: "Description",
    });

    expect(notification.emoji).toBe("✨");
  });

  it("uses provided URL", () => {
    const notification = generateNewFeatureNotification({
      name: "Feature",
      description: "Description",
      url: "/new-feature",
    });

    expect(notification.data?.url).toBe("/new-feature");
  });

  it("defaults to home URL", () => {
    const notification = generateNewFeatureNotification({
      name: "Feature",
      description: "Description",
    });

    expect(notification.data?.url).toBe("/");
  });

  it("scheduled at 11 AM", () => {
    const notification = generateNewFeatureNotification({
      name: "Feature",
      description: "Description",
    });

    expect(notification.scheduledHour).toBe(11);
  });
});

describe("generatePremiumNotifications", () => {
  it("returns depleted notification when remaining is 0", () => {
    const notifications = generatePremiumNotifications({
      creditStatus: {
        plan: "free",
        remaining: 0,
        total: 10,
        bonusCredits: 0,
        percentUsed: 100,
      },
    });

    expect(notifications.some((n) => n.type === "credit_depleted")).toBe(true);
  });

  it("returns low credit notification when remaining < 5", () => {
    const notifications = generatePremiumNotifications({
      creditStatus: {
        plan: "free",
        remaining: 3,
        total: 10,
        bonusCredits: 0,
        percentUsed: 70,
      },
    });

    expect(notifications.some((n) => n.type === "credit_low")).toBe(true);
  });

  it("returns empty array when credits are sufficient", () => {
    const notifications = generatePremiumNotifications({
      creditStatus: {
        plan: "basic",
        remaining: 20,
        total: 50,
        bonusCredits: 0,
        percentUsed: 60,
      },
      hasActiveSubscription: true,
    });

    expect(notifications).toHaveLength(0);
  });

  it("includes calendar promo for free users on Saturday", () => {
    // Mock Saturday
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-13")); // Saturday

    const notifications = generatePremiumNotifications({
      creditStatus: {
        plan: "free",
        remaining: 10,
        total: 10,
        bonusCredits: 0,
        percentUsed: 0,
      },
      hasActiveSubscription: false,
    });

    expect(notifications.some((n) => n.type === "premium_feature")).toBe(true);

    vi.useRealTimers();
  });
});

describe("shouldSendNotification", () => {
  it("returns true when no last notification date", () => {
    expect(shouldSendNotification(undefined)).toBe(true);
  });

  it("returns false within cooldown period", () => {
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);

    expect(shouldSendNotification(oneHourAgo, 24)).toBe(false);
  });

  it("returns true after cooldown period", () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    expect(shouldSendNotification(twoDaysAgo, 24)).toBe(true);
  });

  it("respects custom cooldown hours", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

    expect(shouldSendNotification(threeHoursAgo, 2)).toBe(true);
    expect(shouldSendNotification(threeHoursAgo, 6)).toBe(false);
  });

  it("defaults to 24 hour cooldown", () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);

    expect(shouldSendNotification(twentyFiveHoursAgo)).toBe(true);
    expect(shouldSendNotification(twentyThreeHoursAgo)).toBe(false);
  });
});

describe("CreditStatus Interface", () => {
  interface CreditStatus {
    plan: string;
    remaining: number;
    total: number;
    bonusCredits: number;
    percentUsed: number;
  }

  it("calculates percent used correctly", () => {
    const status: CreditStatus = {
      plan: "basic",
      remaining: 30,
      total: 50,
      bonusCredits: 0,
      percentUsed: 40,
    };

    const calculated = ((status.total - status.remaining) / status.total) * 100;
    expect(calculated).toBe(40);
  });

  it("handles bonus credits", () => {
    const status: CreditStatus = {
      plan: "premium",
      remaining: 100,
      total: 100,
      bonusCredits: 20,
      percentUsed: 0,
    };

    expect(status.remaining + status.bonusCredits).toBe(120);
  });
});

describe("Notification Scheduling", () => {
  it("credit low scheduled at 8 PM", () => {
    const notification = generateCreditLowNotification({
      plan: "free",
      remaining: 2,
      total: 10,
      bonusCredits: 0,
      percentUsed: 80,
    });

    expect(notification?.scheduledHour).toBe(20);
  });

  it("credit depleted scheduled at noon", () => {
    const notification = generateCreditDepletedNotification();
    expect(notification.scheduledHour).toBe(12);
  });

  it("calendar premium scheduled at 10 AM", () => {
    const notification = generateCalendarPremiumNotification();
    expect(notification.scheduledHour).toBe(10);
  });

  it("promotion scheduled at 7 PM", () => {
    const notification = generatePromotionNotification({
      title: "Sale",
      discount: 20,
    });
    expect(notification.scheduledHour).toBe(19);
  });

  it("new feature scheduled at 11 AM", () => {
    const notification = generateNewFeatureNotification({
      name: "Feature",
      description: "Desc",
    });
    expect(notification.scheduledHour).toBe(11);
  });
});

describe("Locale Handling", () => {
  it("defaults to Korean", () => {
    const notification = generateCreditDepletedNotification();
    expect(notification.title).toContain("크레딧");
  });

  it("supports English", () => {
    const notification = generateCreditDepletedNotification("User", "en");
    expect(notification.title).toContain("credits");
  });

  it("falls back to Korean for unknown locale", () => {
    const notification = generateCreditDepletedNotification("User", "fr");
    expect(notification.title).toContain("크레딧");
  });
});
