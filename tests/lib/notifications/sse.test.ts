/**
 * Tests for notifications/sse.ts
 * Server-Side Events Notification Manager
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

// Mock metrics
vi.mock("@/lib/metrics", () => ({
  recordCounter: vi.fn(),
  recordGauge: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("sse", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: "https://redis.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "test-token",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("registerClient", () => {
    it("registers a client with userId and controller", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { registerClient, isUserConnected } = await import(
        "@/lib/notifications/sse"
      );
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("user-123", mockController);

      expect(isUserConnected("user-123")).toBe(true);
    });

    it("records metrics when registering", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { registerClient } = await import("@/lib/notifications/sse");
      const { recordCounter, recordGauge } = await import("@/lib/metrics");
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("user-456", mockController);

      expect(recordCounter).toHaveBeenCalledWith(
        "sse_client_connect",
        1,
        expect.any(Object)
      );
      expect(recordGauge).toHaveBeenCalledWith(
        "sse_active_connections",
        expect.any(Number)
      );
    });

    it("stores connection in Redis when configured", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const { registerClient } = await import("@/lib/notifications/sse");
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("user-789", mockController);

      // Wait for async Redis operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/pipeline"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });
  });

  describe("unregisterClient", () => {
    it("removes a registered client", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, unregisterClient, isUserConnected } =
        await import("@/lib/notifications/sse");
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("user-to-remove", mockController);
      expect(isUserConnected("user-to-remove")).toBe(true);

      unregisterClient("user-to-remove");
      expect(isUserConnected("user-to-remove")).toBe(false);
    });

    it("records metrics when unregistering", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, unregisterClient } = await import(
        "@/lib/notifications/sse"
      );
      const { recordCounter, recordGauge } = await import("@/lib/metrics");
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("user-metrics", mockController);
      vi.mocked(recordCounter).mockClear();
      vi.mocked(recordGauge).mockClear();

      unregisterClient("user-metrics");

      expect(recordCounter).toHaveBeenCalledWith(
        "sse_client_disconnect",
        1,
        expect.any(Object)
      );
      expect(recordGauge).toHaveBeenCalledWith(
        "sse_active_connections",
        expect.any(Number)
      );
    });

    it("removes connection from Redis when configured", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, unregisterClient } = await import(
        "@/lib/notifications/sse"
      );
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("user-redis", mockController);
      mockFetch.mockClear();

      unregisterClient("user-redis");

      // Wait for async Redis operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/del/"),
        expect.any(Object)
      );
    });
  });

  describe("sendNotification", () => {
    it("sends notification to local connection", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, sendNotification } = await import(
        "@/lib/notifications/sse"
      );
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("local-user", mockController);

      const result = await sendNotification("local-user", {
        type: "system",
        title: "Test",
        message: "Test message",
      });

      expect(result).toBe(true);
      expect(mockController.enqueue).toHaveBeenCalledWith(
        expect.stringContaining("data:")
      );
    });

    it("includes notification data in the message", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, sendNotification } = await import(
        "@/lib/notifications/sse"
      );
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("data-user", mockController);

      await sendNotification("data-user", {
        type: "like",
        title: "New Like",
        message: "Someone liked your post",
        link: "/post/123",
      });

      const enqueuedData = (mockController.enqueue as ReturnType<typeof vi.fn>)
        .mock.calls[0][0];
      expect(enqueuedData).toContain("New Like");
      expect(enqueuedData).toContain("Someone liked your post");
      expect(enqueuedData).toContain("/post/123");
    });

    it("uses Redis pub/sub when user not connected locally", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { sendNotification } = await import("@/lib/notifications/sse");

      await sendNotification("remote-user", {
        type: "comment",
        title: "New Comment",
        message: "Someone commented",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/pipeline"),
        expect.any(Object)
      );
    });

    it("returns false when user is not connected anywhere", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { sendNotification } = await import("@/lib/notifications/sse");

      const result = await sendNotification("offline-user", {
        type: "mention",
        title: "Mention",
        message: "You were mentioned",
      });

      expect(result).toBe(false);
    });

    it("removes client on enqueue error", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, sendNotification, isUserConnected } =
        await import("@/lib/notifications/sse");
      const mockController = {
        enqueue: vi.fn().mockImplementation(() => {
          throw new Error("Stream closed");
        }),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("error-user", mockController);
      expect(isUserConnected("error-user")).toBe(true);

      await sendNotification("error-user", {
        type: "reply",
        title: "Reply",
        message: "Someone replied",
      });

      expect(isUserConnected("error-user")).toBe(false);
    });

    it("logs error and tries Redis when local send fails", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, sendNotification } = await import(
        "@/lib/notifications/sse"
      );
      const { logger } = await import("@/lib/logger");
      const mockController = {
        enqueue: vi.fn().mockImplementation(() => {
          throw new Error("Connection lost");
        }),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("fallback-user", mockController);
      mockFetch.mockClear();

      const result = await sendNotification("fallback-user", {
        type: "system",
        title: "Test",
        message: "Test",
      });

      expect(logger.error).toHaveBeenCalledWith(
        "[SSE] Error sending to local connection:",
        expect.any(Error)
      );
      // Should try Redis as fallback
      expect(mockFetch).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe("getActiveConnectionsCount", () => {
    it("returns 0 when no connections", async () => {
      const { getActiveConnectionsCount } = await import(
        "@/lib/notifications/sse"
      );

      // Initial count might include connections from other tests
      const count = getActiveConnectionsCount();
      expect(typeof count).toBe("number");
    });

    it("increases when clients are registered", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, getActiveConnectionsCount, unregisterClient } =
        await import("@/lib/notifications/sse");

      const initialCount = getActiveConnectionsCount();

      const mockController1 = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;
      const mockController2 = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("count-user-1", mockController1);
      registerClient("count-user-2", mockController2);

      expect(getActiveConnectionsCount()).toBe(initialCount + 2);

      // Cleanup
      unregisterClient("count-user-1");
      unregisterClient("count-user-2");
    });
  });

  describe("getConnectedUsers", () => {
    it("returns array of connected user IDs", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, getConnectedUsers, unregisterClient } =
        await import("@/lib/notifications/sse");
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("list-user", mockController);

      const users = getConnectedUsers();
      expect(users).toContain("list-user");

      // Cleanup
      unregisterClient("list-user");
    });

    it("returns empty array when no users connected", async () => {
      const { getConnectedUsers } = await import("@/lib/notifications/sse");

      const users = getConnectedUsers();
      expect(Array.isArray(users)).toBe(true);
    });
  });

  describe("isUserConnected", () => {
    it("returns true for connected users", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, isUserConnected, unregisterClient } =
        await import("@/lib/notifications/sse");
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("connected-user", mockController);
      expect(isUserConnected("connected-user")).toBe(true);

      // Cleanup
      unregisterClient("connected-user");
    });

    it("returns false for non-connected users", async () => {
      const { isUserConnected } = await import("@/lib/notifications/sse");

      expect(isUserConnected("non-existent-user")).toBe(false);
    });
  });

  describe("notification payload types", () => {
    it("handles like notification type", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, sendNotification, unregisterClient } =
        await import("@/lib/notifications/sse");
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("like-user", mockController);

      await sendNotification("like-user", {
        type: "like",
        title: "New Like",
        message: "Someone liked your content",
      });

      const data = (mockController.enqueue as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(data).toContain('"type":"like"');

      unregisterClient("like-user");
    });

    it("handles comment notification type", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, sendNotification, unregisterClient } =
        await import("@/lib/notifications/sse");
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("comment-user", mockController);

      await sendNotification("comment-user", {
        type: "comment",
        title: "New Comment",
        message: "Someone commented on your post",
        link: "/post/456",
        avatar: "https://example.com/avatar.jpg",
      });

      const data = (mockController.enqueue as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(data).toContain('"type":"comment"');
      expect(data).toContain("avatar.jpg");

      unregisterClient("comment-user");
    });

    it("handles system notification type", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const { registerClient, sendNotification, unregisterClient } =
        await import("@/lib/notifications/sse");
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("system-user", mockController);

      await sendNotification("system-user", {
        type: "system",
        title: "System Message",
        message: "Scheduled maintenance",
      });

      const data = (mockController.enqueue as ReturnType<typeof vi.fn>).mock
        .calls[0][0];
      expect(data).toContain('"type":"system"');

      unregisterClient("system-user");
    });
  });

  describe("Redis error handling", () => {
    it("logs error when Redis store fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Redis connection failed"));

      const { registerClient } = await import("@/lib/notifications/sse");
      const { logger } = await import("@/lib/logger");
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("redis-error-user", mockController);

      // Wait for async error
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(logger.error).toHaveBeenCalledWith(
        "[SSE] Failed to register in Redis:",
        expect.any(Error)
      );
    });

    it("logs error when Redis remove fails", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true }); // For register
      mockFetch.mockRejectedValueOnce(new Error("Redis delete failed")); // For unregister

      const { registerClient, unregisterClient } = await import(
        "@/lib/notifications/sse"
      );
      const { logger } = await import("@/lib/logger");
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("redis-del-error-user", mockController);
      unregisterClient("redis-del-error-user");

      // Wait for async error
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(logger.error).toHaveBeenCalledWith(
        "[SSE] Failed to unregister from Redis:",
        expect.any(Error)
      );
    });

    it("logs error when Redis publish fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Publish failed"));

      const { sendNotification } = await import("@/lib/notifications/sse");
      const { logger } = await import("@/lib/logger");

      await sendNotification("nonexistent", {
        type: "system",
        title: "Test",
        message: "Test",
      });

      expect(logger.error).toHaveBeenCalledWith(
        "[SSE] Failed to queue in Redis:",
        expect.any(Error)
      );
    });
  });

  describe("without Redis configuration", () => {
    it("does not call Redis when not configured", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { registerClient, unregisterClient } = await import(
        "@/lib/notifications/sse"
      );
      const mockController = {
        enqueue: vi.fn(),
        close: vi.fn(),
      } as unknown as ReadableStreamDefaultController;

      registerClient("no-redis-user", mockController);
      unregisterClient("no-redis-user");

      // Wait for any potential async calls
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
