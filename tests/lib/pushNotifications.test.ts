/**
 * Tests for pushNotifications.ts
 * Browser push notification subscriptions and permissions
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

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock service worker registration
const mockPushSubscription = {
  endpoint: "https://push.example.com/subscription",
  toJSON: () => ({ endpoint: "https://push.example.com/subscription" }),
  unsubscribe: vi.fn(),
};

const mockPushManager = {
  getSubscription: vi.fn(),
  subscribe: vi.fn(),
};

const mockServiceWorkerRegistration = {
  pushManager: mockPushManager,
  showNotification: vi.fn(),
};

const mockServiceWorker = {
  register: vi.fn(),
  ready: Promise.resolve(mockServiceWorkerRegistration),
};

describe("pushNotifications", () => {
  const originalWindow = global.window;
  const originalNavigator = global.navigator;

  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    mockPushManager.getSubscription.mockReset();
    mockPushManager.subscribe.mockReset();
    mockPushSubscription.unsubscribe.mockReset();
    mockServiceWorker.register.mockReset();
    mockServiceWorkerRegistration.showNotification.mockReset();
  });

  afterEach(() => {
    if (originalWindow) {
      global.window = originalWindow;
    }
    if (originalNavigator) {
      global.navigator = originalNavigator;
    }
  });

  describe("isPushNotificationSupported", () => {
    it("returns false when window is undefined", async () => {
      // @ts-expect-error - simulating server-side
      delete global.window;

      const { isPushNotificationSupported } = await import(
        "@/lib/pushNotifications"
      );
      const result = isPushNotificationSupported();

      expect(result).toBe(false);
    });

    it("returns false when serviceWorker is not in navigator", async () => {
      Object.defineProperty(global, "window", {
        value: { PushManager: {}, Notification: {} },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: {},
        writable: true,
      });

      const { isPushNotificationSupported } = await import(
        "@/lib/pushNotifications"
      );
      const result = isPushNotificationSupported();

      expect(result).toBe(false);
    });

    it("returns false when PushManager is not in window", async () => {
      Object.defineProperty(global, "window", {
        value: { Notification: {} },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { isPushNotificationSupported } = await import(
        "@/lib/pushNotifications"
      );
      const result = isPushNotificationSupported();

      expect(result).toBe(false);
    });

    it("returns false when Notification is not in window", async () => {
      Object.defineProperty(global, "window", {
        value: { PushManager: {} },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { isPushNotificationSupported } = await import(
        "@/lib/pushNotifications"
      );
      const result = isPushNotificationSupported();

      expect(result).toBe(false);
    });

    it("returns true when all requirements are met", async () => {
      Object.defineProperty(global, "window", {
        value: { PushManager: {}, Notification: {} },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { isPushNotificationSupported } = await import(
        "@/lib/pushNotifications"
      );
      const result = isPushNotificationSupported();

      expect(result).toBe(true);
    });
  });

  describe("getNotificationPermission", () => {
    it("returns 'denied' when window is undefined", async () => {
      // @ts-expect-error - simulating server-side
      delete global.window;

      const { getNotificationPermission } = await import(
        "@/lib/pushNotifications"
      );
      const result = getNotificationPermission();

      expect(result).toBe("denied");
    });

    it("returns 'denied' when Notification is not in window", async () => {
      Object.defineProperty(global, "window", {
        value: {},
        writable: true,
        configurable: true,
      });

      const { getNotificationPermission } = await import(
        "@/lib/pushNotifications"
      );
      const result = getNotificationPermission();

      expect(result).toBe("denied");
    });

    it("returns current Notification.permission value", async () => {
      // Need to set both window.Notification AND global Notification
      const mockNotification = { permission: "granted" as NotificationPermission };
      Object.defineProperty(global, "window", {
        value: { Notification: mockNotification },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "Notification", {
        value: mockNotification,
        writable: true,
        configurable: true,
      });

      const { getNotificationPermission } = await import(
        "@/lib/pushNotifications"
      );
      const result = getNotificationPermission();

      expect(result).toBe("granted");
    });

    it("returns 'default' when permission not requested", async () => {
      const mockNotification = { permission: "default" as NotificationPermission };
      Object.defineProperty(global, "window", {
        value: { Notification: mockNotification },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "Notification", {
        value: mockNotification,
        writable: true,
        configurable: true,
      });

      const { getNotificationPermission } = await import(
        "@/lib/pushNotifications"
      );
      const result = getNotificationPermission();

      expect(result).toBe("default");
    });
  });

  describe("requestNotificationPermission", () => {
    it("returns 'denied' when push notifications not supported", async () => {
      // @ts-expect-error - simulating server-side
      delete global.window;

      const { requestNotificationPermission } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await requestNotificationPermission();

      expect(result).toBe("denied");
      expect(logger.warn).toHaveBeenCalledWith(
        "Push notifications are not supported"
      );
    });

    it("requests and returns permission", async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue("granted");
      const mockNotification = { requestPermission: mockRequestPermission };

      Object.defineProperty(global, "window", {
        value: {
          PushManager: {},
          Notification: mockNotification,
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });
      Object.defineProperty(global, "Notification", {
        value: mockNotification,
        writable: true,
        configurable: true,
      });

      const { requestNotificationPermission } = await import(
        "@/lib/pushNotifications"
      );
      const result = await requestNotificationPermission();

      expect(mockRequestPermission).toHaveBeenCalled();
      expect(result).toBe("granted");
    });

    it("returns 'denied' when request fails", async () => {
      const mockRequestPermission = vi
        .fn()
        .mockRejectedValue(new Error("User cancelled"));
      const mockNotification = { requestPermission: mockRequestPermission };

      Object.defineProperty(global, "window", {
        value: {
          PushManager: {},
          Notification: mockNotification,
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });
      Object.defineProperty(global, "Notification", {
        value: mockNotification,
        writable: true,
        configurable: true,
      });

      const { requestNotificationPermission } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await requestNotificationPermission();

      expect(result).toBe("denied");
      expect(logger.error).toHaveBeenCalledWith(
        "Error requesting notification permission:",
        expect.any(Error)
      );
    });
  });

  describe("registerServiceWorker", () => {
    it("returns null when push notifications not supported", async () => {
      // @ts-expect-error - simulating server-side
      delete global.window;

      const { registerServiceWorker } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await registerServiceWorker();

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        "Service Workers are not supported"
      );
    });

    it("registers service worker at /sw.js", async () => {
      mockServiceWorker.register.mockResolvedValue(
        mockServiceWorkerRegistration
      );

      Object.defineProperty(global, "window", {
        value: { PushManager: {}, Notification: {} },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { registerServiceWorker } = await import(
        "@/lib/pushNotifications"
      );
      const result = await registerServiceWorker();

      expect(mockServiceWorker.register).toHaveBeenCalledWith("/sw.js", {
        scope: "/",
      });
      expect(result).toBe(mockServiceWorkerRegistration);
    });

    it("returns null when registration fails", async () => {
      mockServiceWorker.register.mockRejectedValue(
        new Error("Registration failed")
      );

      Object.defineProperty(global, "window", {
        value: { PushManager: {}, Notification: {} },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { registerServiceWorker } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await registerServiceWorker();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Service Worker registration failed:",
        expect.any(Error)
      );
    });
  });

  describe("sendSubscriptionToServer", () => {
    it("sends subscription to /api/push/subscribe", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { sendSubscriptionToServer } = await import(
        "@/lib/pushNotifications"
      );
      const result = await sendSubscriptionToServer(
        mockPushSubscription as unknown as PushSubscription
      );

      expect(mockFetch).toHaveBeenCalledWith("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockPushSubscription),
      });
      expect(result).toBe(true);
    });

    it("returns false when server returns error", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const { sendSubscriptionToServer } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await sendSubscriptionToServer(
        mockPushSubscription as unknown as PushSubscription
      );

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "Error sending subscription to server:",
        expect.any(Error)
      );
    });

    it("returns false when fetch throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { sendSubscriptionToServer } = await import(
        "@/lib/pushNotifications"
      );

      const result = await sendSubscriptionToServer(
        mockPushSubscription as unknown as PushSubscription
      );

      expect(result).toBe(false);
    });
  });

  describe("unsubscribeFromPushNotifications", () => {
    it("unsubscribes and returns true", async () => {
      mockPushSubscription.unsubscribe.mockResolvedValue(true);
      mockPushManager.getSubscription.mockResolvedValue(mockPushSubscription);

      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { unsubscribeFromPushNotifications } = await import(
        "@/lib/pushNotifications"
      );
      const result = await unsubscribeFromPushNotifications();

      expect(mockPushSubscription.unsubscribe).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it("returns true when no subscription exists", async () => {
      mockPushManager.getSubscription.mockResolvedValue(null);

      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { unsubscribeFromPushNotifications } = await import(
        "@/lib/pushNotifications"
      );
      const result = await unsubscribeFromPushNotifications();

      expect(result).toBe(true);
    });

    it("returns false when unsubscribe fails", async () => {
      mockPushManager.getSubscription.mockRejectedValue(
        new Error("Failed to get subscription")
      );

      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { unsubscribeFromPushNotifications } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await unsubscribeFromPushNotifications();

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "Error unsubscribing from push notifications:",
        expect.any(Error)
      );
    });
  });

  describe("getPushSubscription", () => {
    it("returns current subscription", async () => {
      mockPushManager.getSubscription.mockResolvedValue(mockPushSubscription);

      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { getPushSubscription } = await import("@/lib/pushNotifications");
      const result = await getPushSubscription();

      expect(result).toBe(mockPushSubscription);
    });

    it("returns null when no subscription", async () => {
      mockPushManager.getSubscription.mockResolvedValue(null);

      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { getPushSubscription } = await import("@/lib/pushNotifications");
      const result = await getPushSubscription();

      expect(result).toBeNull();
    });

    it("returns null on error", async () => {
      mockPushManager.getSubscription.mockRejectedValue(new Error("Error"));

      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { getPushSubscription } = await import("@/lib/pushNotifications");
      const { logger } = await import("@/lib/logger");

      const result = await getPushSubscription();

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Error getting push subscription:",
        expect.any(Error)
      );
    });
  });

  describe("showLocalNotification", () => {
    it("does nothing when push not supported", async () => {
      // @ts-expect-error - simulating server-side
      delete global.window;

      const { showLocalNotification } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      await showLocalNotification("Test");

      expect(logger.warn).toHaveBeenCalledWith(
        "Notifications are not supported"
      );
    });

    it("shows notification with default options", async () => {
      mockServiceWorkerRegistration.showNotification.mockResolvedValue(
        undefined
      );
      const mockNotification = { permission: "granted" as NotificationPermission };

      Object.defineProperty(global, "window", {
        value: {
          PushManager: {},
          Notification: mockNotification,
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });
      Object.defineProperty(global, "Notification", {
        value: mockNotification,
        writable: true,
        configurable: true,
      });

      const { showLocalNotification } = await import(
        "@/lib/pushNotifications"
      );
      await showLocalNotification("Test Title");

      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        "Test Title",
        expect.objectContaining({
          icon: "/icon-192.png",
          badge: "/badge-72.png",
        })
      );
    });

    it("merges custom options with defaults", async () => {
      mockServiceWorkerRegistration.showNotification.mockResolvedValue(
        undefined
      );
      const mockNotification = { permission: "granted" as NotificationPermission };

      Object.defineProperty(global, "window", {
        value: {
          PushManager: {},
          Notification: mockNotification,
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });
      Object.defineProperty(global, "Notification", {
        value: mockNotification,
        writable: true,
        configurable: true,
      });

      const { showLocalNotification } = await import(
        "@/lib/pushNotifications"
      );
      await showLocalNotification("Test", { body: "Test body", tag: "test" });

      expect(mockServiceWorkerRegistration.showNotification).toHaveBeenCalledWith(
        "Test",
        expect.objectContaining({
          icon: "/icon-192.png",
          badge: "/badge-72.png",
          body: "Test body",
          tag: "test",
        })
      );
    });

    it("requests permission if not granted", async () => {
      const mockRequestPermission = vi.fn().mockResolvedValue("granted");
      let currentPermission: NotificationPermission = "default";
      const mockNotification = {
        get permission() { return currentPermission; },
        requestPermission: mockRequestPermission,
      };

      Object.defineProperty(global, "window", {
        value: {
          PushManager: {},
          Notification: mockNotification,
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });
      Object.defineProperty(global, "Notification", {
        value: mockNotification,
        writable: true,
        configurable: true,
      });

      const { showLocalNotification } = await import(
        "@/lib/pushNotifications"
      );

      // Need to update Notification.permission after request
      mockRequestPermission.mockImplementation(() => {
        currentPermission = "granted";
        return Promise.resolve("granted");
      });

      await showLocalNotification("Test");

      expect(mockRequestPermission).toHaveBeenCalled();
    });
  });

  describe("initializePushNotifications", () => {
    const vapidKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

    it("returns false when push not supported", async () => {
      // @ts-expect-error - simulating server-side
      delete global.window;

      const { initializePushNotifications } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await initializePushNotifications(vapidKey);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        "Push notifications are not supported"
      );
    });

    it("returns false when service worker registration fails", async () => {
      mockServiceWorker.register.mockRejectedValue(new Error("Failed"));

      Object.defineProperty(global, "window", {
        value: { PushManager: {}, Notification: { permission: "granted" } },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { initializePushNotifications } = await import(
        "@/lib/pushNotifications"
      );
      const result = await initializePushNotifications(vapidKey);

      expect(result).toBe(false);
    });

    it("returns false when permission is denied", async () => {
      mockServiceWorker.register.mockResolvedValue(
        mockServiceWorkerRegistration
      );
      const mockNotification = { permission: "denied" as NotificationPermission };

      Object.defineProperty(global, "window", {
        value: { PushManager: {}, Notification: mockNotification },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });
      Object.defineProperty(global, "Notification", {
        value: mockNotification,
        writable: true,
        configurable: true,
      });

      const { initializePushNotifications } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await initializePushNotifications(vapidKey);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        "Notification permission denied"
      );
    });

    it("returns false when permission is default (not requested yet)", async () => {
      mockServiceWorker.register.mockResolvedValue(
        mockServiceWorkerRegistration
      );
      const mockNotification = { permission: "default" as NotificationPermission };

      Object.defineProperty(global, "window", {
        value: { PushManager: {}, Notification: mockNotification },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });
      Object.defineProperty(global, "Notification", {
        value: mockNotification,
        writable: true,
        configurable: true,
      });

      const { initializePushNotifications } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await initializePushNotifications(vapidKey);

      expect(result).toBe(false);
      expect(logger.debug).toHaveBeenCalledWith(
        "Notification permission not yet requested"
      );
    });

    it("returns false on error", async () => {
      mockServiceWorker.register.mockResolvedValue(
        mockServiceWorkerRegistration
      );
      mockPushManager.getSubscription.mockRejectedValue(new Error("Push manager error"));
      const mockNotification = { permission: "granted" as NotificationPermission };

      Object.defineProperty(global, "window", {
        value: {
          PushManager: {},
          Notification: mockNotification,
          atob: () => {
            throw new Error("Invalid base64");
          },
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });
      Object.defineProperty(global, "Notification", {
        value: mockNotification,
        writable: true,
        configurable: true,
      });

      const { initializePushNotifications } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await initializePushNotifications(vapidKey);

      // When subscribeToPushNotifications fails, it returns null and logs error
      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        "Error subscribing to push notifications:",
        expect.any(Error)
      );
    });
  });

  describe("subscribeToPushNotifications", () => {
    const vapidKey = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";

    it("returns null when service worker registration fails", async () => {
      mockServiceWorker.register.mockRejectedValue(new Error("Failed"));

      Object.defineProperty(global, "window", {
        value: {
          PushManager: {},
          Notification: { permission: "granted" },
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { subscribeToPushNotifications } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await subscribeToPushNotifications(vapidKey);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Error subscribing to push notifications:",
        expect.any(Error)
      );
    });

    it("returns null when permission not granted", async () => {
      mockServiceWorker.register.mockResolvedValue(
        mockServiceWorkerRegistration
      );
      const mockRequestPermission = vi.fn().mockResolvedValue("denied");

      Object.defineProperty(global, "window", {
        value: {
          PushManager: {},
          Notification: {
            permission: "default",
            requestPermission: mockRequestPermission,
          },
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });

      const { subscribeToPushNotifications } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await subscribeToPushNotifications(vapidKey);

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Error subscribing to push notifications:",
        expect.any(Error)
      );
    });

    it("returns existing subscription if already subscribed", async () => {
      mockServiceWorker.register.mockResolvedValue(
        mockServiceWorkerRegistration
      );
      mockPushManager.getSubscription.mockResolvedValue(mockPushSubscription);
      const mockRequestPermission = vi.fn().mockResolvedValue("granted");
      const mockNotification = {
        permission: "granted" as NotificationPermission,
        requestPermission: mockRequestPermission,
      };

      Object.defineProperty(global, "window", {
        value: {
          PushManager: {},
          Notification: mockNotification,
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });
      Object.defineProperty(global, "Notification", {
        value: mockNotification,
        writable: true,
        configurable: true,
      });

      const { subscribeToPushNotifications } = await import(
        "@/lib/pushNotifications"
      );
      const { logger } = await import("@/lib/logger");

      const result = await subscribeToPushNotifications(vapidKey);

      expect(result).toBe(mockPushSubscription);
      expect(mockPushManager.subscribe).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        "Already subscribed to push notifications"
      );
    });

    it("creates new subscription when not subscribed", async () => {
      mockServiceWorker.register.mockResolvedValue(
        mockServiceWorkerRegistration
      );
      mockPushManager.getSubscription.mockResolvedValue(null);
      mockPushManager.subscribe.mockResolvedValue(mockPushSubscription);
      const mockRequestPermission = vi.fn().mockResolvedValue("granted");
      const mockNotification = {
        permission: "granted" as NotificationPermission,
        requestPermission: mockRequestPermission,
      };

      Object.defineProperty(global, "window", {
        value: {
          PushManager: {},
          Notification: mockNotification,
          atob: (str: string) => Buffer.from(str, "base64").toString("binary"),
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(global, "navigator", {
        value: { serviceWorker: mockServiceWorker },
        writable: true,
      });
      Object.defineProperty(global, "Notification", {
        value: mockNotification,
        writable: true,
        configurable: true,
      });

      const { subscribeToPushNotifications } = await import(
        "@/lib/pushNotifications"
      );
      const result = await subscribeToPushNotifications(vapidKey);

      expect(mockPushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      });
      expect(result).toBe(mockPushSubscription);
    });
  });
});
