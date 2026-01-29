/**
 * Admin Audit Log Tests
 * Tests for admin action audit logging
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    adminAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  logAdminAction,
  getAdminActionHistory,
  getTargetAuditHistory,
  type AdminAuditParams,
} from "@/lib/auth/adminAudit";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

const mockAdminAuditLogCreate = prisma.adminAuditLog.create as ReturnType<
  typeof vi.fn
>;
const mockAdminAuditLogFindMany = prisma.adminAuditLog.findMany as ReturnType<
  typeof vi.fn
>;
const mockLoggerInfo = logger.info as ReturnType<typeof vi.fn>;
const mockLoggerError = logger.error as ReturnType<typeof vi.fn>;

describe("logAdminAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminAuditLogCreate.mockResolvedValue({} as any);
  });

  it("should log admin action with all parameters", async () => {
    const params: AdminAuditParams = {
      adminEmail: "admin@example.com",
      adminUserId: "user_123",
      action: "refund_subscription",
      targetType: "subscription",
      targetId: "sub_456",
      metadata: { amount: 50000, reason: "User requested" },
      success: true,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0",
    };

    await logAdminAction(params);

    expect(mockAdminAuditLogCreate).toHaveBeenCalledWith({
      data: {
        adminEmail: "admin@example.com",
        adminUserId: "user_123",
        action: "refund_subscription",
        targetType: "subscription",
        targetId: "sub_456",
        metadata: { amount: 50000, reason: "User requested" },
        success: true,
        errorMessage: undefined,
        ipAddress: "127.0.0.1",
        userAgent: "Mozilla/5.0",
      },
    });

    expect(mockLoggerInfo).toHaveBeenCalledWith("[Admin Action]", {
      admin: "admin@example.com",
      action: "refund_subscription",
      target: "subscription:sub_456",
      success: true,
    });
  });

  it("should use default success=true when not provided", async () => {
    const params: AdminAuditParams = {
      adminEmail: "admin@example.com",
      action: "view_users",
    };

    await logAdminAction(params);

    expect(mockAdminAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: true,
        }),
      })
    );
  });

  it("should support legacy 'data' field for metadata", async () => {
    const params: AdminAuditParams = {
      adminEmail: "admin@example.com",
      action: "delete_user",
      data: { userId: "user_789" },
    };

    await logAdminAction(params);

    expect(mockAdminAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: { userId: "user_789" },
        }),
      })
    );
  });

  it("should prefer metadata over data field", async () => {
    const params: AdminAuditParams = {
      adminEmail: "admin@example.com",
      action: "update_user",
      metadata: { new: "metadata" },
      data: { old: "data" },
    };

    await logAdminAction(params);

    expect(mockAdminAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: { new: "metadata" },
        }),
      })
    );
  });

  it("should log error message when success=false", async () => {
    const params: AdminAuditParams = {
      adminEmail: "admin@example.com",
      action: "failed_action",
      success: false,
      errorMessage: "Something went wrong",
    };

    await logAdminAction(params);

    expect(mockAdminAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          success: false,
          errorMessage: "Something went wrong",
        }),
      })
    );
  });

  it("should handle prisma errors gracefully", async () => {
    mockAdminAuditLogCreate.mockRejectedValue(new Error("Database error"));

    const params: AdminAuditParams = {
      adminEmail: "admin@example.com",
      action: "test_action",
    };

    // Should not throw
    await expect(logAdminAction(params)).resolves.toBeUndefined();

    expect(mockLoggerError).toHaveBeenCalledWith(
      "Failed to log admin action",
      expect.objectContaining({
        error: expect.any(Error),
      })
    );
  });

  it("should handle minimal parameters", async () => {
    const params: AdminAuditParams = {
      adminEmail: "admin@example.com",
      action: "login",
    };

    await logAdminAction(params);

    expect(mockAdminAuditLogCreate).toHaveBeenCalledWith({
      data: {
        adminEmail: "admin@example.com",
        adminUserId: undefined,
        action: "login",
        targetType: undefined,
        targetId: undefined,
        metadata: {},
        success: true,
        errorMessage: undefined,
        ipAddress: undefined,
        userAgent: undefined,
      },
    });
  });
});

describe("getAdminActionHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminAuditLogFindMany.mockResolvedValue([] as any);
  });

  it("should query with no filters", async () => {
    await getAdminActionHistory({});

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: "desc" },
      take: 100,
      skip: 0,
    });
  });

  it("should filter by adminEmail", async () => {
    await getAdminActionHistory({ adminEmail: "admin@example.com" });

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith({
      where: { adminEmail: "admin@example.com" },
      orderBy: { createdAt: "desc" },
      take: 100,
      skip: 0,
    });
  });

  it("should filter by action", async () => {
    await getAdminActionHistory({ action: "refund_subscription" });

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith({
      where: { action: "refund_subscription" },
      orderBy: { createdAt: "desc" },
      take: 100,
      skip: 0,
    });
  });

  it("should filter by targetType", async () => {
    await getAdminActionHistory({ targetType: "subscription" });

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith({
      where: { targetType: "subscription" },
      orderBy: { createdAt: "desc" },
      take: 100,
      skip: 0,
    });
  });

  it("should filter by date range (start only)", async () => {
    const startDate = new Date("2024-01-01");

    await getAdminActionHistory({ startDate });

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      skip: 0,
    });
  });

  it("should filter by date range (end only)", async () => {
    const endDate = new Date("2024-12-31");

    await getAdminActionHistory({ endDate });

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          lte: endDate,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      skip: 0,
    });
  });

  it("should filter by date range (both)", async () => {
    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");

    await getAdminActionHistory({ startDate, endDate });

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      skip: 0,
    });
  });

  it("should combine multiple filters", async () => {
    const startDate = new Date("2024-01-01");

    await getAdminActionHistory({
      adminEmail: "admin@example.com",
      action: "refund_subscription",
      targetType: "subscription",
      startDate,
    });

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith({
      where: {
        adminEmail: "admin@example.com",
        action: "refund_subscription",
        targetType: "subscription",
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      skip: 0,
    });
  });

  it("should respect custom limit", async () => {
    await getAdminActionHistory({}, { limit: 50 });

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
      })
    );
  });

  it("should respect custom offset", async () => {
    await getAdminActionHistory({}, { offset: 100 });

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 100,
      })
    );
  });

  it("should respect both limit and offset", async () => {
    await getAdminActionHistory({}, { limit: 25, offset: 50 });

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 25,
        skip: 50,
      })
    );
  });

  it("should return query results", async () => {
    const mockResults = [
      {
        id: "1",
        adminEmail: "admin@example.com",
        action: "test",
        createdAt: new Date(),
      },
    ];
    mockAdminAuditLogFindMany.mockResolvedValue(mockResults as any);

    const results = await getAdminActionHistory({});

    expect(results).toEqual(mockResults);
  });
});

describe("getTargetAuditHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminAuditLogFindMany.mockResolvedValue([] as any);
  });

  it("should query by targetType and targetId", async () => {
    await getTargetAuditHistory("subscription", "sub_123");

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith({
      where: {
        targetType: "subscription",
        targetId: "sub_123",
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return query results", async () => {
    const mockResults = [
      {
        id: "1",
        targetType: "user",
        targetId: "user_456",
        action: "update",
        createdAt: new Date(),
      },
      {
        id: "2",
        targetType: "user",
        targetId: "user_456",
        action: "delete",
        createdAt: new Date(),
      },
    ];
    mockAdminAuditLogFindMany.mockResolvedValue(mockResults as any);

    const results = await getTargetAuditHistory("user", "user_456");

    expect(results).toEqual(mockResults);
  });

  it("should work with different target types", async () => {
    await getTargetAuditHistory("payment", "pay_789");

    expect(mockAdminAuditLogFindMany).toHaveBeenCalledWith({
      where: {
        targetType: "payment",
        targetId: "pay_789",
      },
      orderBy: { createdAt: "desc" },
    });
  });
});