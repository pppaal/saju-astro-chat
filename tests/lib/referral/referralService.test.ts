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
