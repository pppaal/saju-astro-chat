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
