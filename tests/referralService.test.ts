/**
 * Referral Service 테스트
 * - 추천 코드 생성
 * - 추천 코드 유효성 검증
 * - 자기 추천 방지
 * - 추천 보상 로직
 */

import { vi } from "vitest";

// 추천 코드 생성 로직 (실제 구현과 동일)
function generateReferralCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

// 추천 코드 유효성 검증
function isValidReferralCode(code: string): boolean {
  // 8자리 16진수 대문자
  return /^[0-9A-F]{8}$/.test(code);
}

// 추천 보상 계산
const REFERRAL_CREDITS = 3;

interface ReferralReward {
  referrerId: string;
  referredUserId: string;
  creditsAwarded: number;
  status: "pending" | "completed";
}

function calculateReferralReward(
  referrerId: string,
  referredUserId: string
): ReferralReward | { error: string } {
  if (!referrerId || !referredUserId) {
    return { error: "missing_ids" };
  }

  if (referrerId === referredUserId) {
    return { error: "self_referral" };
  }

  return {
    referrerId,
    referredUserId,
    creditsAwarded: REFERRAL_CREDITS,
    status: "completed",
  };
}

// 추천 통계 계산
interface ReferralStats {
  totalReferrals: number;
  totalCreditsEarned: number;
  pendingRewards: number;
}

function calculateReferralStats(rewards: ReferralReward[]): ReferralStats {
  return {
    totalReferrals: rewards.length,
    totalCreditsEarned: rewards
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.creditsAwarded, 0),
    pendingRewards: rewards.filter((r) => r.status === "pending").length,
  };
}

describe("Referral Service: Code Generation", () => {
  it("generates 8-character code", () => {
    const code = generateReferralCode();
    expect(code).toHaveLength(8);
  });

  it("generates uppercase hex code", () => {
    const code = generateReferralCode();
    expect(code).toMatch(/^[0-9A-F]{8}$/);
  });

  it("generates unique codes", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateReferralCode());
    }
    // 100개 중 대부분 유니크해야 함 (확률적으로 충돌 거의 없음)
    expect(codes.size).toBeGreaterThan(95);
  });
});

describe("Referral Service: Code Validation", () => {
  it("validates correct code format", () => {
    expect(isValidReferralCode("ABCD1234")).toBe(true);
    expect(isValidReferralCode("12345678")).toBe(true);
    expect(isValidReferralCode("DEADBEEF")).toBe(true);
  });

  it("rejects lowercase codes", () => {
    expect(isValidReferralCode("abcd1234")).toBe(false);
  });

  it("rejects wrong length", () => {
    expect(isValidReferralCode("ABCD123")).toBe(false);
    expect(isValidReferralCode("ABCD12345")).toBe(false);
    expect(isValidReferralCode("")).toBe(false);
  });

  it("rejects invalid characters", () => {
    expect(isValidReferralCode("GHIJ1234")).toBe(false); // G-Z not valid hex
    expect(isValidReferralCode("ABCD-123")).toBe(false);
    expect(isValidReferralCode("ABCD 123")).toBe(false);
  });
});

describe("Referral Service: Reward Calculation", () => {
  it("calculates reward for valid referral", () => {
    const result = calculateReferralReward("user-1", "user-2");

    expect(result).not.toHaveProperty("error");
    if (!("error" in result)) {
      expect(result.referrerId).toBe("user-1");
      expect(result.referredUserId).toBe("user-2");
      expect(result.creditsAwarded).toBe(REFERRAL_CREDITS);
      expect(result.status).toBe("completed");
    }
  });

  it("rejects self-referral", () => {
    const result = calculateReferralReward("user-1", "user-1");

    expect(result).toHaveProperty("error", "self_referral");
  });

  it("rejects missing referrer ID", () => {
    const result = calculateReferralReward("", "user-2");

    expect(result).toHaveProperty("error", "missing_ids");
  });

  it("rejects missing referred user ID", () => {
    const result = calculateReferralReward("user-1", "");

    expect(result).toHaveProperty("error", "missing_ids");
  });

  it("awards correct credit amount", () => {
    const result = calculateReferralReward("user-1", "user-2");

    if (!("error" in result)) {
      expect(result.creditsAwarded).toBe(3);
    }
  });
});

describe("Referral Service: Statistics", () => {
  it("calculates total referrals", () => {
    const rewards: ReferralReward[] = [
      { referrerId: "a", referredUserId: "b", creditsAwarded: 3, status: "completed" },
      { referrerId: "a", referredUserId: "c", creditsAwarded: 3, status: "completed" },
      { referrerId: "a", referredUserId: "d", creditsAwarded: 3, status: "pending" },
    ];

    const stats = calculateReferralStats(rewards);
    expect(stats.totalReferrals).toBe(3);
  });

  it("calculates total credits from completed rewards only", () => {
    const rewards: ReferralReward[] = [
      { referrerId: "a", referredUserId: "b", creditsAwarded: 3, status: "completed" },
      { referrerId: "a", referredUserId: "c", creditsAwarded: 3, status: "completed" },
      { referrerId: "a", referredUserId: "d", creditsAwarded: 3, status: "pending" },
    ];

    const stats = calculateReferralStats(rewards);
    expect(stats.totalCreditsEarned).toBe(6); // 2 completed * 3 credits
  });

  it("counts pending rewards", () => {
    const rewards: ReferralReward[] = [
      { referrerId: "a", referredUserId: "b", creditsAwarded: 3, status: "completed" },
      { referrerId: "a", referredUserId: "c", creditsAwarded: 3, status: "pending" },
      { referrerId: "a", referredUserId: "d", creditsAwarded: 3, status: "pending" },
    ];

    const stats = calculateReferralStats(rewards);
    expect(stats.pendingRewards).toBe(2);
  });

  it("handles empty rewards list", () => {
    const stats = calculateReferralStats([]);
    expect(stats.totalReferrals).toBe(0);
    expect(stats.totalCreditsEarned).toBe(0);
    expect(stats.pendingRewards).toBe(0);
  });
});

describe("Referral Service: Code Normalization", () => {
  // 코드 정규화 (대소문자 무관 입력 처리)
  const normalizeCode = (code: string): string => {
    return code.trim().toUpperCase();
  };

  it("converts lowercase to uppercase", () => {
    expect(normalizeCode("abcd1234")).toBe("ABCD1234");
  });

  it("trims whitespace", () => {
    expect(normalizeCode("  ABCD1234  ")).toBe("ABCD1234");
  });

  it("handles mixed case", () => {
    expect(normalizeCode("AbCd1234")).toBe("ABCD1234");
  });
});

describe("Referral Service: Link Eligibility", () => {
  interface User {
    id: string;
    referrerId: string | null;
    createdAt: Date;
  }

  // 추천인 연결 가능 여부 확인
  const canLinkReferrer = (user: User): { allowed: boolean; reason?: string } => {
    // 이미 추천인이 있음
    if (user.referrerId) {
      return { allowed: false, reason: "already_has_referrer" };
    }

    // 가입 후 24시간 내에만 연결 가능
    const hoursSinceCreation =
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      return { allowed: false, reason: "link_window_expired" };
    }

    return { allowed: true };
  };

  it("allows linking for new user without referrer", () => {
    const user: User = {
      id: "user-1",
      referrerId: null,
      createdAt: new Date(), // 방금 가입
    };

    expect(canLinkReferrer(user)).toEqual({ allowed: true });
  });

  it("rejects if already has referrer", () => {
    const user: User = {
      id: "user-1",
      referrerId: "referrer-1",
      createdAt: new Date(),
    };

    expect(canLinkReferrer(user)).toEqual({
      allowed: false,
      reason: "already_has_referrer",
    });
  });

  it("rejects if link window expired", () => {
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const user: User = {
      id: "user-1",
      referrerId: null,
      createdAt: twoDaysAgo,
    };

    expect(canLinkReferrer(user)).toEqual({
      allowed: false,
      reason: "link_window_expired",
    });
  });
});
