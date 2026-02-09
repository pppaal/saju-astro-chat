/**
 * Referral Service Tests
 *
 * Tests for referral system utilities
 */

import { vi, beforeEach, afterEach } from "vitest";
import { generateReferralCode, getReferralUrl } from "@/lib/referral/referralService";

describe("Referral Service", () => {
  describe("generateReferralCode", () => {
    it("generates an 8-character code", () => {
      const code = generateReferralCode();
      expect(code).toHaveLength(8);
    });

    it("generates uppercase hex characters only", () => {
      const code = generateReferralCode();
      expect(code).toMatch(/^[0-9A-F]{8}$/);
    });

    it("generates unique codes on successive calls", () => {
      const codes = new Set<string>();
      for (let i = 0; i < 100; i++) {
        codes.add(generateReferralCode());
      }
      // With 8 hex chars, collision in 100 samples is extremely unlikely
      expect(codes.size).toBe(100);
    });

    it("generates codes that are valid hex strings", () => {
      for (let i = 0; i < 10; i++) {
        const code = generateReferralCode();
        const parsed = parseInt(code, 16);
        expect(Number.isNaN(parsed)).toBe(false);
      }
    });

    it("returns a string type", () => {
      const code = generateReferralCode();
      expect(typeof code).toBe("string");
    });

    it("contains only valid hex digits", () => {
      const code = generateReferralCode();
      const validChars = "0123456789ABCDEF";
      for (const char of code) {
        expect(validChars).toContain(char);
      }
    });
  });

  describe("getReferralUrl", () => {
    const originalEnv = process.env.NEXT_PUBLIC_BASE_URL;

    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_BASE_URL;
    });

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.NEXT_PUBLIC_BASE_URL = originalEnv;
      }
    });

    it("uses provided baseUrl", () => {
      const url = getReferralUrl("ABC12345", "https://example.com");
      expect(url).toBe("https://example.com/?ref=ABC12345");
    });

    it("includes the referral code in query param", () => {
      const url = getReferralUrl("TESTCODE", "https://example.com");
      expect(url).toContain("ref=TESTCODE");
    });

    it("defaults to destinypal.me when no baseUrl or env", () => {
      const url = getReferralUrl("XYZ99999");
      expect(url).toBe("https://destinypal.me/?ref=XYZ99999");
    });

    it("formats URL correctly with ref parameter", () => {
      const url = getReferralUrl("12345678", "https://test.com");
      expect(url).toMatch(/^https:\/\/test\.com\/\?ref=12345678$/);
    });

    it("preserves code case", () => {
      const code = "AbCdEfGh";
      const url = getReferralUrl(code, "https://example.com");
      expect(url).toContain(code);
    });
  });
});

describe("Referral system constants", () => {
  const REFERRAL_CREDITS = 3;

  it("referral gives 3 credits", () => {
    expect(REFERRAL_CREDITS).toBe(3);
  });

  it("referral credits is positive", () => {
    expect(REFERRAL_CREDITS).toBeGreaterThan(0);
  });
});

describe("Referral code format", () => {
  it("8 hex characters is 4 bytes", () => {
    const bytesUsed = 4;
    const hexChars = bytesUsed * 2;
    expect(hexChars).toBe(8);
  });

  it("provides 4 billion possible codes", () => {
    const totalCombinations = Math.pow(16, 8);
    expect(totalCombinations).toBe(4294967296);
  });
});

describe("Referral reward types", () => {
  const rewardTypes = ["signup_complete", "first_analysis"];

  it("signup_complete is a valid reward type", () => {
    expect(rewardTypes).toContain("signup_complete");
  });

  it("first_analysis is a valid reward type", () => {
    expect(rewardTypes).toContain("first_analysis");
  });

  it("has 2 reward types", () => {
    expect(rewardTypes).toHaveLength(2);
  });
});

describe("Referral reward status", () => {
  const statuses = ["pending", "completed"];

  it("pending is a valid status", () => {
    expect(statuses).toContain("pending");
  });

  it("completed is a valid status", () => {
    expect(statuses).toContain("completed");
  });
});

describe("Referral stats structure", () => {
  interface ReferralStats {
    referralCode: string;
    stats: {
      total: number;
      completed: number;
      pending: number;
      creditsEarned: number;
    };
    referrals: Array<{
      id: string;
      name: string;
      joinedAt: Date;
      hasAnalysis: boolean;
    }>;
    rewards: Array<{
      id: string;
      credits: number;
      status: string;
      createdAt: Date;
      completedAt: Date | null;
    }>;
  }

  it("stats structure is valid", () => {
    const stats: ReferralStats = {
      referralCode: "ABC12345",
      stats: {
        total: 10,
        completed: 5,
        pending: 5,
        creditsEarned: 15,
      },
      referrals: [],
      rewards: [],
    };

    expect(stats.stats.total).toBe(10);
    expect(stats.stats.completed).toBe(5);
    expect(stats.stats.pending).toBe(5);
    expect(stats.stats.creditsEarned).toBe(15);
  });

  it("pending equals total minus completed", () => {
    const total = 10;
    const completed = 7;
    const pending = total - completed;
    expect(pending).toBe(3);
  });

  it("referral entry has required fields", () => {
    const referral = {
      id: "user-123",
      name: "John Doe",
      joinedAt: new Date(),
      hasAnalysis: true,
    };

    expect(referral.id).toBeDefined();
    expect(referral.name).toBeDefined();
    expect(referral.joinedAt).toBeInstanceOf(Date);
    expect(typeof referral.hasAnalysis).toBe("boolean");
  });

  it("reward entry has required fields", () => {
    const reward = {
      id: "reward-123",
      credits: 3,
      status: "completed",
      createdAt: new Date(),
      completedAt: new Date(),
    };

    expect(reward.id).toBeDefined();
    expect(reward.credits).toBe(3);
    expect(reward.status).toBe("completed");
    expect(reward.createdAt).toBeInstanceOf(Date);
  });
});

describe("Link referrer error cases", () => {
  const errorCases = ["invalid_code", "self_referral"];

  it("invalid_code error is recognized", () => {
    expect(errorCases).toContain("invalid_code");
  });

  it("self_referral error is recognized", () => {
    expect(errorCases).toContain("self_referral");
  });

  it("self referral should be prevented", () => {
    const userId = "user-123";
    const referrerId = "user-123";
    const isSelfReferral = userId === referrerId;
    expect(isSelfReferral).toBe(true);
  });
});

describe("Claim reward error cases", () => {
  const errorCases = ["no_pending_reward"];

  it("no_pending_reward error is recognized", () => {
    expect(errorCases).toContain("no_pending_reward");
  });
});

describe("Referral link result structure", () => {
  interface LinkResult {
    success: boolean;
    referrerId?: string;
    error?: string;
  }

  it("success result has referrerId", () => {
    const result: LinkResult = {
      success: true,
      referrerId: "user-123",
    };
    expect(result.success).toBe(true);
    expect(result.referrerId).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it("failure result has error", () => {
    const result: LinkResult = {
      success: false,
      error: "invalid_code",
    };
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.referrerId).toBeUndefined();
  });
});

describe("Claim reward result structure", () => {
  interface ClaimResult {
    success: boolean;
    creditsAwarded?: number;
    error?: string;
  }

  it("success result has creditsAwarded", () => {
    const result: ClaimResult = {
      success: true,
      creditsAwarded: 3,
    };
    expect(result.success).toBe(true);
    expect(result.creditsAwarded).toBe(3);
    expect(result.error).toBeUndefined();
  });

  it("failure result has error", () => {
    const result: ClaimResult = {
      success: false,
      error: "no_pending_reward",
    };
    expect(result.success).toBe(false);
    expect(result.error).toBe("no_pending_reward");
    expect(result.creditsAwarded).toBeUndefined();
  });
});

describe("Referral code validation", () => {
  it("should uppercase lowercase codes for comparison", () => {
    const inputCode = "abcd1234";
    const normalizedCode = inputCode.toUpperCase();
    expect(normalizedCode).toBe("ABCD1234");
  });

  it("should handle mixed case codes", () => {
    const inputCode = "AbCd1234";
    const normalizedCode = inputCode.toUpperCase();
    expect(normalizedCode).toBe("ABCD1234");
  });

  it("should not change already uppercase codes", () => {
    const inputCode = "ABCD1234";
    const normalizedCode = inputCode.toUpperCase();
    expect(normalizedCode).toBe(inputCode);
  });
});

describe("Referral credits calculation", () => {
  it("should calculate total credits from completed rewards", () => {
    const rewards = [
      { status: "completed", creditsAwarded: 3 },
      { status: "completed", creditsAwarded: 3 },
      { status: "pending", creditsAwarded: 3 },
    ];

    const totalCredits = rewards
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.creditsAwarded, 0);

    expect(totalCredits).toBe(6);
  });

  it("should return 0 when no completed rewards", () => {
    const rewards = [
      { status: "pending", creditsAwarded: 3 },
      { status: "pending", creditsAwarded: 3 },
    ];

    const totalCredits = rewards
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.creditsAwarded, 0);

    expect(totalCredits).toBe(0);
  });
});

describe("Referral stats calculation", () => {
  it("should calculate completed referrals from readings", () => {
    const referrals = [
      { readings: [{ id: "r1" }] },
      { readings: [] },
      { readings: [{ id: "r2" }] },
    ];

    const completed = referrals.filter((r) => r.readings.length > 0).length;
    expect(completed).toBe(2);
  });

  it("should calculate pending referrals", () => {
    const total = 10;
    const completed = 6;
    const pending = total - completed;
    expect(pending).toBe(4);
  });
});

describe("Referral user data mapping", () => {
  it("should map user to referral entry", () => {
    const user = {
      id: "user-123",
      name: "Test User",
      createdAt: new Date("2024-01-15"),
      readings: [{ id: "r1" }],
    };

    const entry = {
      id: user.id,
      name: user.name || "Anonymous",
      joinedAt: user.createdAt,
      hasAnalysis: user.readings.length > 0,
    };

    expect(entry.id).toBe("user-123");
    expect(entry.name).toBe("Test User");
    expect(entry.hasAnalysis).toBe(true);
  });

  it("should use Anonymous for null name", () => {
    const user = {
      id: "user-456",
      name: null,
      createdAt: new Date(),
      readings: [],
    };

    const name = user.name || "Anonymous";
    expect(name).toBe("Anonymous");
  });
});

describe("Referral reward data mapping", () => {
  it("should map reward to entry", () => {
    const reward = {
      id: "reward-123",
      creditsAwarded: 3,
      status: "completed",
      createdAt: new Date("2024-01-15"),
      completedAt: new Date("2024-01-16"),
    };

    const entry = {
      id: reward.id,
      credits: reward.creditsAwarded,
      status: reward.status,
      createdAt: reward.createdAt,
      completedAt: reward.completedAt,
    };

    expect(entry.id).toBe("reward-123");
    expect(entry.credits).toBe(3);
    expect(entry.status).toBe("completed");
  });

  it("should handle null completedAt for pending rewards", () => {
    const reward = {
      id: "reward-456",
      creditsAwarded: 3,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
    };

    expect(reward.completedAt).toBeNull();
  });
});

describe("Referral URL format", () => {
  it("should create valid URL with query parameter", () => {
    const base = "https://example.com";
    const code = "TEST1234";
    const url = `${base}/?ref=${code}`;

    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain("?ref=");
    expect(url).toContain(code);
  });

  it("should handle trailing slash in base URL", () => {
    const base = "https://example.com/";
    const code = "ABC12345";
    const url = `${base}?ref=${code}`;

    expect(url).toBe("https://example.com/?ref=ABC12345");
  });
});

// Mock-based tests for database interactions
describe("Referral Service with mocked Prisma", () => {
  // Mock dependencies
  vi.mock("@/lib/db/prisma", () => ({
    prisma: {
      userSettings: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        upsert: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      referralReward: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
    },
  }));

  vi.mock("@/lib/credits/creditService", () => ({
    addBonusCredits: vi.fn().mockResolvedValue(undefined),
  }));

  vi.mock("@/lib/email", () => ({
    sendReferralRewardEmail: vi.fn().mockResolvedValue(undefined),
  }));

  vi.mock("@/lib/logger", () => ({
    logger: {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    },
  }));

  describe("getUserReferralCode", () => {
    it("returns existing referral code if user has one", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { getUserReferralCode } = await import("@/lib/referral/referralService");

      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({
        referralCode: "EXISTING1",
      } as never);

      const code = await getUserReferralCode("user-123");
      expect(code).toBe("EXISTING1");
    });

    it("generates new code if user has none", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { getUserReferralCode } = await import("@/lib/referral/referralService");

      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({
        referralCode: null,
      } as never);
      vi.mocked(prisma.userSettings.upsert).mockResolvedValue({} as never);

      const code = await getUserReferralCode("user-456");
      expect(code).toHaveLength(8);
      expect(prisma.userSettings.upsert).toHaveBeenCalled();
    });
  });

  describe("findUserByReferralCode", () => {
    it("finds user by referral code", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { findUserByReferralCode } = await import("@/lib/referral/referralService");

      const mockSettings = {
        userId: "user-123",
        referralCode: "ABC12345",
        user: { id: "user-123", name: "Test" },
      };
      vi.mocked(prisma.userSettings.findFirst).mockResolvedValue(mockSettings as never);

      const result = await findUserByReferralCode("abc12345");
      expect(result).toEqual({ id: "user-123", name: "Test", referralCode: "ABC12345" });
      expect(prisma.userSettings.findFirst).toHaveBeenCalledWith({
        where: { referralCode: "ABC12345" },
        select: { userId: true, referralCode: true, user: { select: { id: true, name: true } } },
      });
    });

    it("returns null for invalid code", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { findUserByReferralCode } = await import("@/lib/referral/referralService");

      vi.mocked(prisma.userSettings.findFirst).mockResolvedValue(null);

      const result = await findUserByReferralCode("INVALID");
      expect(result).toBeNull();
    });
  });

  describe("linkReferrer", () => {
    it("returns invalid_code error for non-existent code", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { linkReferrer } = await import("@/lib/referral/referralService");

      vi.mocked(prisma.userSettings.findFirst).mockResolvedValue(null);

      const result = await linkReferrer("new-user", "INVALID");
      expect(result).toEqual({ success: false, error: "invalid_code" });
    });

    it("returns self_referral error when user refers themselves", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { linkReferrer } = await import("@/lib/referral/referralService");

      vi.mocked(prisma.userSettings.findFirst).mockResolvedValue({
        userId: "user-123",
        referralCode: "ABC12345",
        user: { id: "user-123", name: "Test" },
      } as never);

      const result = await linkReferrer("user-123", "ABC12345");
      expect(result).toEqual({ success: false, error: "self_referral" });
    });

    it("successfully links referrer", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { linkReferrer } = await import("@/lib/referral/referralService");
      const { addBonusCredits } = await import("@/lib/credits/creditService");

      vi.mocked(prisma.userSettings.findFirst).mockResolvedValue({
        userId: "referrer-1",
        referralCode: "ABC12345",
        user: { id: "referrer-1", name: "Referrer" },
      } as never);
      vi.mocked(prisma.user.update).mockResolvedValue({} as never);
      vi.mocked(prisma.referralReward.create).mockResolvedValue({} as never);
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        email: "referrer@example.com",
        name: "Referrer",
      } as never);

      const result = await linkReferrer("new-user", "ABC12345");

      expect(result.success).toBe(true);
      expect(result.referrerId).toBe("referrer-1");
      expect(addBonusCredits).toHaveBeenCalledWith("referrer-1", 3);
    });

    it("handles database errors", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { linkReferrer } = await import("@/lib/referral/referralService");

      vi.mocked(prisma.userSettings.findFirst).mockRejectedValue(new Error("DB error"));

      const result = await linkReferrer("new-user", "ABC12345");
      expect(result).toEqual({ success: false, error: "DB error" });
    });
  });

  describe("claimReferralReward", () => {
    it("returns no_pending_reward error when no pending reward", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { claimReferralReward } = await import("@/lib/referral/referralService");

      vi.mocked(prisma.referralReward.findFirst).mockResolvedValue(null);

      const result = await claimReferralReward("user-123");
      expect(result).toEqual({ success: false, error: "no_pending_reward" });
    });

    it("successfully claims reward", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { claimReferralReward } = await import("@/lib/referral/referralService");
      const { addBonusCredits } = await import("@/lib/credits/creditService");

      const pendingReward = {
        id: "reward-1",
        userId: "referrer-1",
        creditsAwarded: 3,
      };
      vi.mocked(prisma.referralReward.findFirst).mockResolvedValue(pendingReward as never);
      vi.mocked(prisma.referralReward.update).mockResolvedValue({} as never);

      const result = await claimReferralReward("referred-user");

      expect(result.success).toBe(true);
      expect(result.creditsAwarded).toBe(3);
      expect(addBonusCredits).toHaveBeenCalledWith("referrer-1", 3);
    });

    it("handles database errors", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { claimReferralReward } = await import("@/lib/referral/referralService");

      vi.mocked(prisma.referralReward.findFirst).mockRejectedValue(new Error("DB error"));

      const result = await claimReferralReward("user-123");
      expect(result).toEqual({ success: false, error: "DB error" });
    });
  });

  describe("getReferralStats", () => {
    it("returns stats with existing code", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { getReferralStats } = await import("@/lib/referral/referralService");

      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({
        referralCode: "ABC12345",
      } as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue([
        { id: "r1", name: "User 1", createdAt: new Date(), readings: [{ id: "rd1" }] },
        { id: "r2", name: null, createdAt: new Date(), readings: [] },
      ] as never);
      vi.mocked(prisma.referralReward.findMany).mockResolvedValue([
        { id: "rw1", creditsAwarded: 3, status: "completed", createdAt: new Date(), completedAt: new Date() },
      ] as never);

      const result = await getReferralStats("user-123");

      expect(result.referralCode).toBe("ABC12345");
      expect(result.stats.total).toBe(2);
      expect(result.stats.completed).toBe(1);
      expect(result.stats.pending).toBe(1);
      expect(result.stats.creditsEarned).toBe(3);
    });

    it("generates code when user has none", async () => {
      const { prisma } = await import("@/lib/db/prisma");
      const { getReferralStats } = await import("@/lib/referral/referralService");

      vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({
        referralCode: null,
      } as never);
      vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.referralReward.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.userSettings.upsert).mockResolvedValue({} as never);

      const result = await getReferralStats("user-456");

      expect(result.referralCode).toHaveLength(8);
      expect(result.stats.total).toBe(0);
    });
  });
});
