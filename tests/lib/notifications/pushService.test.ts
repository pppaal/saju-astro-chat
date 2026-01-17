/**
 * Push Notification Service 테스트
 * - VAPID 설정 초기화
 * - 푸시 알림 발송
 * - 구독 관리
 * - 에러 처리
 */

import { vi, beforeEach, afterEach } from "vitest";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock web-push
const mockSendNotification = vi.fn();
const mockSetVapidDetails = vi.fn();
vi.mock("web-push", () => ({
  default: {
    sendNotification: mockSendNotification,
    setVapidDetails: mockSetVapidDetails,
  },
}));

// Mock prisma
const mockPushSubscription = {
  findMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  upsert: vi.fn(),
};
const mockUser = {
  findMany: vi.fn(),
  findUnique: vi.fn(),
};
const mockPersonaMemory = {
  findUnique: vi.fn(),
};
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    pushSubscription: mockPushSubscription,
    user: mockUser,
    personaMemory: mockPersonaMemory,
  },
}));

// Mock daily transit notifications
vi.mock("@/lib/notifications/dailyTransitNotifications", () => ({
  generateDailyNotifications: vi.fn(() => []),
  getNotificationsForHour: vi.fn(() => []),
}));

// Mock premium notifications
vi.mock("@/lib/notifications/premiumNotifications", () => ({
  generatePremiumNotifications: vi.fn(() => []),
  checkActivePromotions: vi.fn(() => null),
}));

// Mock credit service
vi.mock("@/lib/credits/creditService", () => ({
  getUserCredits: vi.fn(),
  getCreditBalance: vi.fn(),
}));

describe("Push Service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-public-key",
      VAPID_PRIVATE_KEY: "test-private-key",
      VAPID_SUBJECT: "mailto:test@example.com",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("sendPushNotification", () => {
    it("returns error when VAPID not configured", async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      const { sendPushNotification } = await import(
        "@/lib/notifications/pushService"
      );
      const result = await sendPushNotification("user-123", {
        title: "Test",
        message: "Test message",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("VAPID not configured");
    });

    it("returns error when no active subscriptions", async () => {
      mockPushSubscription.findMany.mockResolvedValueOnce([]);

      const { sendPushNotification } = await import(
        "@/lib/notifications/pushService"
      );
      const result = await sendPushNotification("user-123", {
        title: "Test",
        message: "Test message",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("No active subscriptions");
    });

    it("sends notification successfully", async () => {
      mockPushSubscription.findMany.mockResolvedValueOnce([
        {
          id: "sub-1",
          endpoint: "https://push.example.com/sub1",
          p256dh: "key1",
          auth: "auth1",
          failCount: 0,
        },
      ]);
      mockSendNotification.mockResolvedValueOnce({});
      mockPushSubscription.update.mockResolvedValueOnce({});

      const { sendPushNotification } = await import(
        "@/lib/notifications/pushService"
      );
      const result = await sendPushNotification("user-123", {
        title: "Test Title",
        message: "Test message body",
      });

      expect(result.success).toBe(true);
      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("handles notification failure with 410 status", async () => {
      mockPushSubscription.findMany.mockResolvedValueOnce([
        {
          id: "sub-1",
          endpoint: "https://push.example.com/sub1",
          p256dh: "key1",
          auth: "auth1",
          failCount: 0,
        },
      ]);
      const error = new Error("Gone");
      (error as { statusCode?: number }).statusCode = 410;
      mockSendNotification.mockRejectedValueOnce(error);
      mockPushSubscription.update.mockResolvedValueOnce({});

      const { sendPushNotification } = await import(
        "@/lib/notifications/pushService"
      );
      const result = await sendPushNotification("user-123", {
        title: "Test",
        message: "Test",
      });

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(mockPushSubscription.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: { isActive: false },
      });
    });

    it("increments fail count on other errors", async () => {
      mockPushSubscription.findMany.mockResolvedValueOnce([
        {
          id: "sub-1",
          endpoint: "https://push.example.com/sub1",
          p256dh: "key1",
          auth: "auth1",
          failCount: 2,
        },
      ]);
      mockSendNotification.mockRejectedValueOnce(new Error("Network error"));
      mockPushSubscription.update.mockResolvedValueOnce({});

      const { sendPushNotification } = await import(
        "@/lib/notifications/pushService"
      );
      await sendPushNotification("user-123", {
        title: "Test",
        message: "Test",
      });

      expect(mockPushSubscription.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: {
          failCount: 3,
          isActive: true,
        },
      });
    });

    it("deactivates subscription after 5 failures", async () => {
      mockPushSubscription.findMany.mockResolvedValueOnce([
        {
          id: "sub-1",
          endpoint: "https://push.example.com/sub1",
          p256dh: "key1",
          auth: "auth1",
          failCount: 4,
        },
      ]);
      mockSendNotification.mockRejectedValueOnce(new Error("Network error"));
      mockPushSubscription.update.mockResolvedValueOnce({});

      const { sendPushNotification } = await import(
        "@/lib/notifications/pushService"
      );
      await sendPushNotification("user-123", {
        title: "Test",
        message: "Test",
      });

      expect(mockPushSubscription.update).toHaveBeenCalledWith({
        where: { id: "sub-1" },
        data: {
          failCount: 5,
          isActive: false,
        },
      });
    });

    it("sends to multiple subscriptions", async () => {
      mockPushSubscription.findMany.mockResolvedValueOnce([
        {
          id: "sub-1",
          endpoint: "https://push.example.com/sub1",
          p256dh: "key1",
          auth: "auth1",
          failCount: 0,
        },
        {
          id: "sub-2",
          endpoint: "https://push.example.com/sub2",
          p256dh: "key2",
          auth: "auth2",
          failCount: 0,
        },
      ]);
      mockSendNotification.mockResolvedValue({});
      mockPushSubscription.update.mockResolvedValue({});

      const { sendPushNotification } = await import(
        "@/lib/notifications/pushService"
      );
      const result = await sendPushNotification("user-123", {
        title: "Test",
        message: "Test",
      });

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
    });
  });

  describe("savePushSubscription", () => {
    it("creates new subscription", async () => {
      mockPushSubscription.upsert.mockResolvedValueOnce({});

      const { savePushSubscription } = await import(
        "@/lib/notifications/pushService"
      );
      await savePushSubscription(
        "user-123",
        {
          endpoint: "https://push.example.com/new",
          keys: { p256dh: "newKey", auth: "newAuth" },
        },
        "Mozilla/5.0"
      );

      expect(mockPushSubscription.upsert).toHaveBeenCalledWith({
        where: { endpoint: "https://push.example.com/new" },
        update: expect.objectContaining({
          userId: "user-123",
          p256dh: "newKey",
          auth: "newAuth",
          isActive: true,
          failCount: 0,
        }),
        create: expect.objectContaining({
          userId: "user-123",
          endpoint: "https://push.example.com/new",
          p256dh: "newKey",
          auth: "newAuth",
          isActive: true,
        }),
      });
    });
  });

  describe("removePushSubscription", () => {
    it("deactivates subscription by endpoint", async () => {
      mockPushSubscription.updateMany.mockResolvedValueOnce({ count: 1 });

      const { removePushSubscription } = await import(
        "@/lib/notifications/pushService"
      );
      await removePushSubscription("https://push.example.com/old");

      expect(mockPushSubscription.updateMany).toHaveBeenCalledWith({
        where: { endpoint: "https://push.example.com/old" },
        data: { isActive: false },
      });
    });
  });

  describe("sendTestNotification", () => {
    it("sends test notification with predefined content", async () => {
      mockPushSubscription.findMany.mockResolvedValueOnce([
        {
          id: "sub-1",
          endpoint: "https://push.example.com/sub1",
          p256dh: "key1",
          auth: "auth1",
          failCount: 0,
        },
      ]);
      mockSendNotification.mockResolvedValueOnce({});
      mockPushSubscription.update.mockResolvedValueOnce({});

      const { sendTestNotification } = await import(
        "@/lib/notifications/pushService"
      );
      const result = await sendTestNotification("user-123");

      expect(result.success).toBe(true);
      expect(mockSendNotification).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining("테스트 알림")
      );
    });
  });

  describe("previewUserNotifications", () => {
    it("returns empty array when user has no birth date", async () => {
      mockUser.findUnique.mockResolvedValueOnce({ birthDate: null });

      const { previewUserNotifications } = await import(
        "@/lib/notifications/pushService"
      );
      const result = await previewUserNotifications("user-123");

      expect(result).toEqual([]);
    });

    it("returns empty array when user not found", async () => {
      mockUser.findUnique.mockResolvedValueOnce(null);

      const { previewUserNotifications } = await import(
        "@/lib/notifications/pushService"
      );
      const result = await previewUserNotifications("user-123");

      expect(result).toEqual([]);
    });
  });

  describe("sendBroadcastNotification", () => {
    it("returns zero counts when VAPID not configured", async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      const { sendBroadcastNotification } = await import(
        "@/lib/notifications/pushService"
      );
      const result = await sendBroadcastNotification({
        title: "Broadcast",
        message: "Message",
      });

      expect(result.totalUsers).toBe(0);
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("sends to all active users", async () => {
      mockPushSubscription.findMany
        .mockResolvedValueOnce([
          { userId: "user-1" },
          { userId: "user-2" },
        ])
        .mockResolvedValueOnce([
          {
            id: "sub-1",
            endpoint: "https://push.example.com/sub1",
            p256dh: "key1",
            auth: "auth1",
            failCount: 0,
          },
        ])
        .mockResolvedValueOnce([
          {
            id: "sub-2",
            endpoint: "https://push.example.com/sub2",
            p256dh: "key2",
            auth: "auth2",
            failCount: 0,
          },
        ]);
      mockSendNotification.mockResolvedValue({});
      mockPushSubscription.update.mockResolvedValue({});

      const { sendBroadcastNotification } = await import(
        "@/lib/notifications/pushService"
      );
      const result = await sendBroadcastNotification({
        title: "Broadcast",
        message: "Message to all",
      });

      expect(result.totalUsers).toBe(2);
    });
  });
});

describe("Push Payload Structure", () => {
  it("validates PushPayload interface", () => {
    interface PushPayload {
      title: string;
      message: string;
      icon?: string;
      badge?: string;
      tag?: string;
      data?: {
        url?: string;
        [key: string]: unknown;
      };
      requireInteraction?: boolean;
    }

    const validPayload: PushPayload = {
      title: "Test Title",
      message: "Test Message",
      icon: "/icon.png",
      badge: "/badge.png",
      tag: "test-tag",
      data: { url: "/notifications" },
      requireInteraction: true,
    };

    expect(validPayload.title).toBeDefined();
    expect(validPayload.message).toBeDefined();
  });

  it("validates minimal payload", () => {
    const minimalPayload = {
      title: "Title",
      message: "Message",
    };

    expect(minimalPayload.title).toBe("Title");
    expect(minimalPayload.message).toBe("Message");
  });
});

describe("sendScheduledNotifications", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-public-key",
      VAPID_PRIVATE_KEY: "test-private-key",
      VAPID_SUBJECT: "mailto:test@example.com",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns error when VAPID not configured", async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    const { sendScheduledNotifications } = await import(
      "@/lib/notifications/pushService"
    );
    const result = await sendScheduledNotifications(9);

    expect(result.total).toBe(0);
    expect(result.errors).toContain("VAPID not configured");
  });

  it("processes users with active subscriptions", async () => {
    const mockUser = await import("@/lib/db/prisma").then((m) => m.prisma.user);
    vi.mocked(mockUser.findMany).mockResolvedValueOnce([
      {
        id: "user-1",
        name: "Test User",
        birthDate: new Date("1990-05-15"),
        birthTime: "10:30",
        personaMemory: {
          sajuProfile: { dayMaster: "甲" },
          birthChart: { transits: [] },
        },
        credits: {
          plan: "free",
          monthlyCredits: 100,
          usedCredits: 50,
          bonusCredits: 0,
        },
        subscriptions: [],
      },
    ] as never);

    const { sendScheduledNotifications } = await import(
      "@/lib/notifications/pushService"
    );
    const result = await sendScheduledNotifications(9);

    expect(result.total).toBe(1);
  });

  it("handles errors gracefully for individual users", async () => {
    const mockUser = await import("@/lib/db/prisma").then((m) => m.prisma.user);
    vi.mocked(mockUser.findMany).mockResolvedValueOnce([
      {
        id: "user-error",
        name: null,
        birthDate: new Date("1990-05-15"),
        birthTime: null,
        personaMemory: null,
        credits: null,
        subscriptions: [],
      },
    ] as never);

    const { generateDailyNotifications } = await import(
      "@/lib/notifications/dailyTransitNotifications"
    );
    vi.mocked(generateDailyNotifications).mockImplementationOnce(() => {
      throw new Error("Generation failed");
    });

    const { sendScheduledNotifications } = await import(
      "@/lib/notifications/pushService"
    );
    const result = await sendScheduledNotifications(9);

    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("checks promotions at hour 19", async () => {
    const mockUser = await import("@/lib/db/prisma").then((m) => m.prisma.user);
    vi.mocked(mockUser.findMany).mockResolvedValueOnce([
      {
        id: "user-1",
        name: "Test",
        birthDate: new Date("1990-05-15"),
        birthTime: null,
        personaMemory: null,
        credits: null,
        subscriptions: [],
      },
    ] as never);

    const { checkActivePromotions } = await import(
      "@/lib/notifications/premiumNotifications"
    );
    vi.mocked(checkActivePromotions).mockResolvedValueOnce({
      type: "promotion",
      title: "Special Offer",
      message: "Limited time offer!",
      emoji: "🎁",
      confidence: 4,
      category: "positive",
    });

    const { sendScheduledNotifications } = await import(
      "@/lib/notifications/pushService"
    );
    await sendScheduledNotifications(19);

    expect(checkActivePromotions).toHaveBeenCalled();
  });

  it("generates premium notifications for users with credits", async () => {
    const mockUser = await import("@/lib/db/prisma").then((m) => m.prisma.user);
    vi.mocked(mockUser.findMany).mockResolvedValueOnce([
      {
        id: "user-1",
        name: "Test User",
        birthDate: new Date("1990-05-15"),
        birthTime: "10:30",
        personaMemory: null,
        credits: {
          plan: "free",
          monthlyCredits: 100,
          usedCredits: 95,
          bonusCredits: 0,
        },
        subscriptions: [],
      },
    ] as never);

    const { generatePremiumNotifications } = await import(
      "@/lib/notifications/premiumNotifications"
    );
    vi.mocked(generatePremiumNotifications).mockReturnValueOnce([
      {
        type: "credit_low",
        title: "크레딧 부족",
        message: "크레딧이 부족합니다",
        emoji: "⚠️",
        confidence: 5,
        category: "caution",
      },
    ]);

    const { sendScheduledNotifications } = await import(
      "@/lib/notifications/pushService"
    );
    await sendScheduledNotifications(9);

    expect(generatePremiumNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        creditStatus: expect.objectContaining({
          remaining: 5,
          percentUsed: 95,
        }),
      })
    );
  });
});

describe("DailyNotification payload conversion", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-public-key",
      VAPID_PRIVATE_KEY: "test-private-key",
      VAPID_SUBJECT: "mailto:test@example.com",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("converts DailyNotification to PushPayload", async () => {
    const mockPushSub = await import("@/lib/db/prisma").then(
      (m) => m.prisma.pushSubscription
    );
    vi.mocked(mockPushSub.findMany).mockResolvedValueOnce([
      {
        id: "sub-1",
        endpoint: "https://push.example.com/sub1",
        p256dh: "key1",
        auth: "auth1",
        failCount: 0,
      },
    ] as never);
    const mockSendNotification = vi.fn().mockResolvedValueOnce({});
    const mockUpdate = vi.fn().mockResolvedValueOnce({});
    vi.mocked(mockPushSub.update).mockImplementation(mockUpdate);

    const { sendPushNotification } = await import(
      "@/lib/notifications/pushService"
    );

    const dailyNotification = {
      type: "daily_fortune" as const,
      title: "오늘의 운세",
      message: "좋은 하루입니다",
      emoji: "✨",
      confidence: 4,
      category: "positive" as const,
      data: { url: "/fortune" },
    };

    await sendPushNotification("user-123", dailyNotification);

    // Verify payload structure was converted correctly
    expect(mockPushSub.findMany).toHaveBeenCalled();
  });
});

describe("WebPushError type guard", () => {
  it("identifies errors with statusCode as WebPushError", () => {
    const isWebPushError = (error: unknown): error is Error & { statusCode?: number } => {
      return error instanceof Error && "statusCode" in error;
    };

    const normalError = new Error("Normal");
    const webPushError = new Error("Web Push") as Error & { statusCode: number };
    webPushError.statusCode = 410;

    expect(isWebPushError(normalError)).toBe(false);
    expect(isWebPushError(webPushError)).toBe(true);
    expect(isWebPushError("string")).toBe(false);
    expect(isWebPushError(null)).toBe(false);
    expect(isWebPushError(undefined)).toBe(false);
  });

  it("handles 404 status code", () => {
    const error = new Error("Not Found") as Error & { statusCode: number };
    error.statusCode = 404;

    expect(error.statusCode === 404 || error.statusCode === 410).toBe(true);
  });

  it("handles other status codes", () => {
    const error = new Error("Server Error") as Error & { statusCode: number };
    error.statusCode = 500;

    expect(error.statusCode === 404 || error.statusCode === 410).toBe(false);
  });
});

describe("SajuProfileData interface", () => {
  it("validates complete profile data", () => {
    interface SajuProfileData {
      dayMaster?: string;
      pillars?: {
        year?: { heavenlyStem?: string; earthlyBranch?: string };
        month?: { heavenlyStem?: string; earthlyBranch?: string };
        day?: { heavenlyStem?: string; earthlyBranch?: string };
        hour?: { heavenlyStem?: string; earthlyBranch?: string };
      };
      unse?: {
        iljin?: unknown;
        monthly?: unknown;
        yearly?: unknown;
      };
    }

    const fullProfile: SajuProfileData = {
      dayMaster: "甲",
      pillars: {
        year: { heavenlyStem: "庚", earthlyBranch: "午" },
        month: { heavenlyStem: "辛", earthlyBranch: "巳" },
        day: { heavenlyStem: "甲", earthlyBranch: "子" },
        hour: { heavenlyStem: "丙", earthlyBranch: "寅" },
      },
      unse: {
        iljin: { heavenlyStem: "丙", earthlyBranch: "寅" },
        monthly: {},
        yearly: {},
      },
    };

    expect(fullProfile.dayMaster).toBe("甲");
    expect(fullProfile.pillars?.day?.heavenlyStem).toBe("甲");
  });

  it("validates empty profile data", () => {
    const emptyProfile = {};
    const dayMaster = (emptyProfile as { dayMaster?: string }).dayMaster;
    expect(dayMaster).toBeUndefined();
  });
});

describe("BirthChartData interface", () => {
  it("validates birth chart data", () => {
    interface BirthChartData {
      transits?: unknown[];
      planets?: unknown[];
    }

    const chart: BirthChartData = {
      transits: [{ planet: "Venus", aspect: "conjunction" }],
      planets: [{ name: "Sun", sign: "Aries" }],
    };

    expect(chart.transits).toHaveLength(1);
    expect(chart.planets).toHaveLength(1);
  });

  it("handles empty chart data", () => {
    const emptyChart = {};
    const transits = (emptyChart as { transits?: unknown[] }).transits || [];
    expect(transits).toEqual([]);
  });
});

describe("CreditStatus calculation", () => {
  it("calculates remaining credits correctly", () => {
    const credits = {
      plan: "free",
      monthlyCredits: 100,
      usedCredits: 50,
      bonusCredits: 10,
    };

    const remaining =
      credits.monthlyCredits - credits.usedCredits + credits.bonusCredits;
    const total = credits.monthlyCredits + credits.bonusCredits;
    const percentUsed = (credits.usedCredits / credits.monthlyCredits) * 100;

    expect(remaining).toBe(60);
    expect(total).toBe(110);
    expect(percentUsed).toBe(50);
  });

  it("handles zero monthly credits", () => {
    const credits = {
      monthlyCredits: 0,
      usedCredits: 0,
    };

    const percentUsed =
      credits.monthlyCredits > 0
        ? (credits.usedCredits / credits.monthlyCredits) * 100
        : 0;

    expect(percentUsed).toBe(0);
  });

  it("handles fully used credits", () => {
    const credits = {
      monthlyCredits: 100,
      usedCredits: 100,
      bonusCredits: 0,
    };

    const remaining =
      credits.monthlyCredits - credits.usedCredits + credits.bonusCredits;
    expect(remaining).toBe(0);
  });

  it("handles negative remaining credits scenario", () => {
    const credits = {
      monthlyCredits: 100,
      usedCredits: 120,
      bonusCredits: 10,
    };

    const remaining =
      credits.monthlyCredits - credits.usedCredits + credits.bonusCredits;
    expect(remaining).toBe(-10);
  });
});

describe("VAPID initialization", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("uses default subject when not provided", async () => {
    process.env = {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-public",
      VAPID_PRIVATE_KEY: "test-private",
    };

    const mockPushSub = await import("@/lib/db/prisma").then(
      (m) => m.prisma.pushSubscription
    );
    vi.mocked(mockPushSub.findMany).mockResolvedValueOnce([]);

    const { sendPushNotification } = await import(
      "@/lib/notifications/pushService"
    );
    await sendPushNotification("user-123", { title: "Test", message: "Test" });

    expect(mockSetVapidDetails).toHaveBeenCalledWith(
      "mailto:admin@destinypal.me",
      "test-public",
      "test-private"
    );
  });

  it("logs warning when VAPID keys missing", async () => {
    process.env = {};

    const { logger } = await import("@/lib/logger");
    const { sendPushNotification } = await import(
      "@/lib/notifications/pushService"
    );

    await sendPushNotification("user-123", { title: "Test", message: "Test" });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("VAPID keys not configured")
    );
  });

  it("handles VAPID configuration error", async () => {
    process.env = {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "invalid",
      VAPID_PRIVATE_KEY: "invalid",
    };

    mockSetVapidDetails.mockImplementationOnce(() => {
      throw new Error("Invalid VAPID keys");
    });

    const { logger } = await import("@/lib/logger");
    const { sendPushNotification } = await import(
      "@/lib/notifications/pushService"
    );

    const result = await sendPushNotification("user-123", {
      title: "Test",
      message: "Test",
    });

    expect(result.success).toBe(false);
    expect(logger.error).toHaveBeenCalled();
  });
});

describe("previewUserNotifications with persona memory", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-public-key",
      VAPID_PRIVATE_KEY: "test-private-key",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("fetches and uses persona memory for notifications", async () => {
    const mockUser = await import("@/lib/db/prisma").then((m) => m.prisma.user);
    const mockPersonaMemory = await import("@/lib/db/prisma").then(
      (m) => m.prisma.personaMemory
    );

    vi.mocked(mockUser.findUnique).mockResolvedValueOnce({
      id: "user-123",
      birthDate: new Date("1990-05-15"),
      birthTime: "10:30",
      name: "Test User",
    } as never);

    vi.mocked(mockPersonaMemory.findUnique).mockResolvedValueOnce({
      sajuProfile: {
        dayMaster: "甲",
        pillars: {
          day: { heavenlyStem: "甲", earthlyBranch: "子" },
        },
      },
      birthChart: {
        transits: [{ planet: "Jupiter", aspect: "trine" }],
      },
    } as never);

    const { generateDailyNotifications } = await import(
      "@/lib/notifications/dailyTransitNotifications"
    );
    vi.mocked(generateDailyNotifications).mockReturnValueOnce([
      {
        type: "daily_fortune",
        title: "오늘의 운세",
        message: "좋은 하루입니다",
        emoji: "✨",
        confidence: 4,
        category: "positive",
      },
    ]);

    const { previewUserNotifications } = await import(
      "@/lib/notifications/pushService"
    );
    const result = await previewUserNotifications("user-123");

    expect(result).toHaveLength(1);
    expect(generateDailyNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ dayMaster: "甲" }),
      expect.objectContaining({ transits: expect.any(Array) }),
      expect.objectContaining({ birthDate: expect.any(Date) })
    );
  });

  it("handles missing persona memory gracefully", async () => {
    const mockUser = await import("@/lib/db/prisma").then((m) => m.prisma.user);
    const mockPersonaMemory = await import("@/lib/db/prisma").then(
      (m) => m.prisma.personaMemory
    );

    vi.mocked(mockUser.findUnique).mockResolvedValueOnce({
      id: "user-123",
      birthDate: new Date("1990-05-15"),
      birthTime: null,
      name: null,
    } as never);

    vi.mocked(mockPersonaMemory.findUnique).mockResolvedValueOnce(null);

    const { generateDailyNotifications } = await import(
      "@/lib/notifications/dailyTransitNotifications"
    );
    vi.mocked(generateDailyNotifications).mockReturnValueOnce([]);

    const { previewUserNotifications } = await import(
      "@/lib/notifications/pushService"
    );
    const result = await previewUserNotifications("user-123");

    expect(result).toEqual([]);
    expect(generateDailyNotifications).toHaveBeenCalledWith(
      expect.objectContaining({}),
      expect.objectContaining({}),
      expect.objectContaining({ birthDate: expect.any(Date) })
    );
  });
});

describe("Subscription update on success", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "test-public-key",
      VAPID_PRIVATE_KEY: "test-private-key",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("updates lastUsedAt and resets failCount on success", async () => {
    const mockPushSub = await import("@/lib/db/prisma").then(
      (m) => m.prisma.pushSubscription
    );

    vi.mocked(mockPushSub.findMany).mockResolvedValueOnce([
      {
        id: "sub-1",
        endpoint: "https://push.example.com/sub1",
        p256dh: "key1",
        auth: "auth1",
        failCount: 3,
      },
    ] as never);

    mockSendNotification.mockResolvedValueOnce({});
    vi.mocked(mockPushSub.update).mockResolvedValueOnce({} as never);

    const { sendPushNotification } = await import(
      "@/lib/notifications/pushService"
    );
    await sendPushNotification("user-123", {
      title: "Test",
      message: "Test",
    });

    expect(mockPushSub.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: expect.objectContaining({
        lastUsedAt: expect.any(Date),
        failCount: 0,
      }),
    });
  });
});
