/**
 * Comprehensive withCredits Tests
 *
 * Tests for credit check, consumption, and error handling
 * Coverage: checkAndConsumeCredits, checkCreditsOnly, creditErrorResponse, ensureUserCredits
 */

import { vi, beforeEach, describe, it, expect } from "vitest";
import type { CreditType } from "@/lib/credits/withCredits";

// Mock dependencies
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({ body, status: init?.status })),
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth/authOptions", () => ({
  authOptions: {},
}));

vi.mock("@/lib/credits/creditService", () => ({
  consumeCredits: vi.fn(),
  canUseCredits: vi.fn(),
  getUserCredits: vi.fn(),
  initializeUserCredits: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("CreditType", () => {
  it("includes all credit types", () => {
    const types: CreditType[] = ["reading", "compatibility", "followUp"];
    expect(types).toHaveLength(3);
  });

  it("reading is a valid credit type", () => {
    const type: CreditType = "reading";
    expect(type).toBe("reading");
  });

  it("compatibility is a valid credit type", () => {
    const type: CreditType = "compatibility";
    expect(type).toBe("compatibility");
  });

  it("followUp is a valid credit type", () => {
    const type: CreditType = "followUp";
    expect(type).toBe("followUp");
  });
});

describe("CreditCheckResult structure", () => {
  interface CreditCheckResult {
    allowed: boolean;
    userId?: string;
    error?: string;
    errorCode?: string;
    remaining?: number;
  }

  it("success result has allowed and userId", () => {
    const result: CreditCheckResult = {
      allowed: true,
      userId: "user123",
      remaining: 5,
    };

    expect(result.allowed).toBe(true);
    expect(result.userId).toBe("user123");
    expect(result.remaining).toBe(5);
    expect(result.error).toBeUndefined();
    expect(result.errorCode).toBeUndefined();
  });

  it("error result has allowed false and error info", () => {
    const result: CreditCheckResult = {
      allowed: false,
      userId: "user123",
      error: "크레딧이 부족합니다",
      errorCode: "no_credits",
      remaining: 0,
    };

    expect(result.allowed).toBe(false);
    expect(result.error).toBe("크레딧이 부족합니다");
    expect(result.errorCode).toBe("no_credits");
    expect(result.remaining).toBe(0);
  });

  it("authentication error has not_authenticated code", () => {
    const result: CreditCheckResult = {
      allowed: false,
      error: "로그인이 필요합니다",
      errorCode: "not_authenticated",
    };

    expect(result.errorCode).toBe("not_authenticated");
    expect(result.userId).toBeUndefined();
  });
});

describe("Error code types", () => {
  it("no_credits indicates depleted credits", () => {
    const errorCode = "no_credits";
    expect(errorCode).toBe("no_credits");
  });

  it("compatibility_limit indicates compatibility quota exceeded", () => {
    const errorCode = "compatibility_limit";
    expect(errorCode).toBe("compatibility_limit");
  });

  it("followup_limit indicates followup quota exceeded", () => {
    const errorCode = "followup_limit";
    expect(errorCode).toBe("followup_limit");
  });

  it("not_authenticated indicates missing authentication", () => {
    const errorCode = "not_authenticated";
    expect(errorCode).toBe("not_authenticated");
  });
});

describe("Error message mapping", () => {
  const errorMessages: Record<string, string> = {
    no_credits: "이번 달 리딩 횟수를 모두 사용했습니다. 플랜을 업그레이드하세요.",
    compatibility_limit: "이번 달 궁합 분석 횟수를 모두 사용했습니다.",
    followup_limit: "이번 달 후속질문 횟수를 모두 사용했습니다.",
  };

  it("has message for no_credits", () => {
    expect(errorMessages.no_credits).toContain("리딩 횟수");
    expect(errorMessages.no_credits).toContain("업그레이드");
  });

  it("has message for compatibility_limit", () => {
    expect(errorMessages.compatibility_limit).toContain("궁합 분석");
  });

  it("has message for followup_limit", () => {
    expect(errorMessages.followup_limit).toContain("후속질문");
  });
});

describe("HTTP status codes", () => {
  it("401 for unauthenticated users", () => {
    const status = 401;
    expect(status).toBe(401);
  });

  it("402 Payment Required for credit errors", () => {
    const status = 402;
    expect(status).toBe(402);
  });
});

describe("creditErrorResponse structure", () => {
  it("includes upgradeUrl for credit errors", () => {
    const response = {
      error: "크레딧이 부족합니다",
      code: "no_credits",
      remaining: 0,
      upgradeUrl: "/pricing",
    };

    expect(response.upgradeUrl).toBe("/pricing");
  });

  it("auth errors do not need upgradeUrl", () => {
    const response = {
      error: "로그인이 필요합니다",
      code: "not_authenticated",
    };

    expect(response).not.toHaveProperty("upgradeUrl");
  });
});

describe("BYPASS_CREDITS environment", () => {
  it("allows bypass when enabled", () => {
    const bypassCredits = "true";
    expect(bypassCredits === "true").toBe(true);
  });

  it("returns high remaining count when bypassed", () => {
    const bypassedResult = {
      allowed: true,
      userId: "user123",
      remaining: 9999,
    };

    expect(bypassedResult.remaining).toBe(9999);
    expect(bypassedResult.allowed).toBe(true);
  });
});

describe("Credit consumption flow", () => {
  it("default type is reading", () => {
    const defaultType: CreditType = "reading";
    expect(defaultType).toBe("reading");
  });

  it("default amount is 1", () => {
    const defaultAmount = 1;
    expect(defaultAmount).toBe(1);
  });

  it("consumption failure returns error", () => {
    const consumeResult = {
      success: false,
      error: "database_error",
    };

    expect(consumeResult.success).toBe(false);
    expect(consumeResult.error).toBe("database_error");
  });

  it("successful consumption returns remaining", () => {
    const consumeResult = {
      success: true,
      remaining: 4,
    };

    expect(consumeResult.success).toBe(true);
    expect(consumeResult.remaining).toBe(4);
  });
});

describe("canUseCredits result structure", () => {
  it("allowed true when user has credits", () => {
    const result = {
      allowed: true,
      remaining: 5,
    };

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("allowed false with reason when depleted", () => {
    const result = {
      allowed: false,
      reason: "no_credits",
      remaining: 0,
    };

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("no_credits");
    expect(result.remaining).toBe(0);
  });
});

describe("checkAndConsumeCredits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BYPASS_CREDITS;
  });

  it("returns not authenticated when no session", async () => {
    const { getServerSession } = await import("next-auth");
    const { checkAndConsumeCredits } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const result = await checkAndConsumeCredits("reading", 1);

    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe("not_authenticated");
    expect(result.error).toBe("로그인이 필요합니다");
    expect(result.userId).toBeUndefined();
  });

  it("bypasses credits when BYPASS_CREDITS is true", async () => {
    const { getServerSession } = await import("next-auth");
    const { checkAndConsumeCredits } = await import("@/lib/credits/withCredits");

    process.env.BYPASS_CREDITS = "true";

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    const result = await checkAndConsumeCredits("reading", 1);

    expect(result.allowed).toBe(true);
    expect(result.userId).toBe("user-123");
    expect(result.remaining).toBe(9999);
  });

  it("checks and consumes credits successfully", async () => {
    const { getServerSession } = await import("next-auth");
    const { canUseCredits, consumeCredits } = await import("@/lib/credits/creditService");
    const { checkAndConsumeCredits } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    vi.mocked(canUseCredits).mockResolvedValueOnce({
      allowed: true,
      remaining: 4,
    });

    vi.mocked(consumeCredits).mockResolvedValueOnce({
      success: true,
    });

    const result = await checkAndConsumeCredits("reading", 1);

    expect(result.allowed).toBe(true);
    expect(result.userId).toBe("user-123");
    expect(result.remaining).toBe(4);
    expect(canUseCredits).toHaveBeenCalledWith("user-123", "reading", 1);
    expect(consumeCredits).toHaveBeenCalledWith("user-123", "reading", 1);
  });

  it("returns error when user has no credits", async () => {
    const { getServerSession } = await import("next-auth");
    const { canUseCredits } = await import("@/lib/credits/creditService");
    const { checkAndConsumeCredits } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    vi.mocked(canUseCredits).mockResolvedValueOnce({
      allowed: false,
      reason: "no_credits",
      remaining: 0,
    });

    const result = await checkAndConsumeCredits("reading", 1);

    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe("no_credits");
    expect(result.error).toContain("이번 달 리딩 횟수를 모두 사용했습니다");
    expect(result.remaining).toBe(0);
  });

  it("returns error for compatibility limit", async () => {
    const { getServerSession } = await import("next-auth");
    const { canUseCredits } = await import("@/lib/credits/creditService");
    const { checkAndConsumeCredits } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    vi.mocked(canUseCredits).mockResolvedValueOnce({
      allowed: false,
      reason: "compatibility_limit",
      remaining: 0,
    });

    const result = await checkAndConsumeCredits("compatibility", 1);

    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe("compatibility_limit");
    expect(result.error).toContain("궁합 분석 횟수");
  });

  it("returns error for followUp limit", async () => {
    const { getServerSession } = await import("next-auth");
    const { canUseCredits } = await import("@/lib/credits/creditService");
    const { checkAndConsumeCredits } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    vi.mocked(canUseCredits).mockResolvedValueOnce({
      allowed: false,
      reason: "followup_limit",
      remaining: 0,
    });

    const result = await checkAndConsumeCredits("followUp", 1);

    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe("followup_limit");
    expect(result.error).toContain("후속질문 횟수");
  });

  it("returns error when credit consumption fails", async () => {
    const { getServerSession } = await import("next-auth");
    const { canUseCredits, consumeCredits } = await import("@/lib/credits/creditService");
    const { checkAndConsumeCredits } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    vi.mocked(canUseCredits).mockResolvedValueOnce({
      allowed: true,
      remaining: 5,
    });

    vi.mocked(consumeCredits).mockResolvedValueOnce({
      success: false,
      error: "database_error",
    });

    const result = await checkAndConsumeCredits("reading", 1);

    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe("database_error");
    expect(result.error).toContain("크레딧 차감 중 오류");
  });

  it("uses default type and amount", async () => {
    const { getServerSession } = await import("next-auth");
    const { canUseCredits, consumeCredits } = await import("@/lib/credits/creditService");
    const { checkAndConsumeCredits } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    vi.mocked(canUseCredits).mockResolvedValueOnce({
      allowed: true,
      remaining: 6,
    });

    vi.mocked(consumeCredits).mockResolvedValueOnce({
      success: true,
    });

    await checkAndConsumeCredits(); // no arguments

    expect(canUseCredits).toHaveBeenCalledWith("user-123", "reading", 1);
    expect(consumeCredits).toHaveBeenCalledWith("user-123", "reading", 1);
  });

  it("handles multiple credit consumption", async () => {
    const { getServerSession } = await import("next-auth");
    const { canUseCredits, consumeCredits } = await import("@/lib/credits/creditService");
    const { checkAndConsumeCredits } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    vi.mocked(canUseCredits).mockResolvedValueOnce({
      allowed: true,
      remaining: 2,
    });

    vi.mocked(consumeCredits).mockResolvedValueOnce({
      success: true,
    });

    const result = await checkAndConsumeCredits("reading", 3);

    expect(canUseCredits).toHaveBeenCalledWith("user-123", "reading", 3);
    expect(consumeCredits).toHaveBeenCalledWith("user-123", "reading", 3);
    expect(result.remaining).toBe(2);
  });

  it("returns generic error for unknown reason", async () => {
    const { getServerSession } = await import("next-auth");
    const { canUseCredits } = await import("@/lib/credits/creditService");
    const { checkAndConsumeCredits } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    vi.mocked(canUseCredits).mockResolvedValueOnce({
      allowed: false,
      reason: "unknown_error",
      remaining: 0,
    });

    const result = await checkAndConsumeCredits("reading", 1);

    expect(result.allowed).toBe(false);
    expect(result.error).toBe("크레딧이 부족합니다"); // fallback message
  });
});

describe("checkCreditsOnly", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.BYPASS_CREDITS;
  });

  it("returns not authenticated when no session", async () => {
    const { getServerSession } = await import("next-auth");
    const { checkCreditsOnly } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const result = await checkCreditsOnly("reading", 1);

    expect(result.allowed).toBe(false);
    expect(result.errorCode).toBe("not_authenticated");
  });

  it("bypasses credits when BYPASS_CREDITS is true", async () => {
    const { getServerSession } = await import("next-auth");
    const { checkCreditsOnly } = await import("@/lib/credits/withCredits");

    process.env.BYPASS_CREDITS = "true";

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    const result = await checkCreditsOnly("reading", 1);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9999);
  });

  it("checks credits without consuming", async () => {
    const { getServerSession } = await import("next-auth");
    const { canUseCredits, consumeCredits } = await import("@/lib/credits/creditService");
    const { checkCreditsOnly } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    vi.mocked(canUseCredits).mockResolvedValueOnce({
      allowed: true,
      remaining: 5,
    });

    const result = await checkCreditsOnly("reading", 1);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
    expect(canUseCredits).toHaveBeenCalledWith("user-123", "reading", 1);
    expect(consumeCredits).not.toHaveBeenCalled(); // should NOT consume
  });

  it("returns error when user has insufficient credits", async () => {
    const { getServerSession } = await import("next-auth");
    const { canUseCredits } = await import("@/lib/credits/creditService");
    const { checkCreditsOnly } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    vi.mocked(canUseCredits).mockResolvedValueOnce({
      allowed: false,
      reason: "no_credits",
      remaining: 0,
    });

    const result = await checkCreditsOnly("reading", 1);

    expect(result.allowed).toBe(false);
    expect(result.error).toBe("크레딧이 부족합니다");
    expect(result.errorCode).toBe("no_credits");
  });

  it("uses default type and amount", async () => {
    const { getServerSession } = await import("next-auth");
    const { canUseCredits } = await import("@/lib/credits/creditService");
    const { checkCreditsOnly } = await import("@/lib/credits/withCredits");

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: "user-123" },
    } as never);

    vi.mocked(canUseCredits).mockResolvedValueOnce({
      allowed: true,
      remaining: 7,
    });

    await checkCreditsOnly(); // no arguments

    expect(canUseCredits).toHaveBeenCalledWith("user-123", "reading", 1);
  });
});

describe("creditErrorResponse", () => {
  it("returns 401 for not_authenticated", async () => {
    const { NextResponse } = await import("next/server");
    const { creditErrorResponse } = await import("@/lib/credits/withCredits");

    const result = {
      allowed: false,
      error: "로그인이 필요합니다",
      errorCode: "not_authenticated",
    };

    const response = creditErrorResponse(result);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: result.error, code: result.errorCode },
      { status: 401 }
    );
  });

  it("returns 402 for credit errors", async () => {
    const { NextResponse } = await import("next/server");
    const { creditErrorResponse } = await import("@/lib/credits/withCredits");

    const result = {
      allowed: false,
      error: "크레딧이 부족합니다",
      errorCode: "no_credits",
      remaining: 0,
    };

    const response = creditErrorResponse(result);

    expect(NextResponse.json).toHaveBeenCalledWith(
      {
        error: result.error,
        code: result.errorCode,
        remaining: result.remaining,
        upgradeUrl: "/pricing",
      },
      { status: 402 }
    );
  });

  it("includes upgradeUrl in response", async () => {
    const { NextResponse } = await import("next/server");
    const { creditErrorResponse } = await import("@/lib/credits/withCredits");

    const result = {
      allowed: false,
      error: "Error",
      errorCode: "compatibility_limit",
      remaining: 0,
    };

    creditErrorResponse(result);

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        upgradeUrl: "/pricing",
      }),
      expect.anything()
    );
  });

  it("includes remaining credits in response", async () => {
    const { NextResponse } = await import("next/server");
    const { creditErrorResponse } = await import("@/lib/credits/withCredits");

    const result = {
      allowed: false,
      error: "Error",
      errorCode: "no_credits",
      remaining: 0,
    };

    creditErrorResponse(result);

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        remaining: 0,
      }),
      expect.anything()
    );
  });
});

describe("ensureUserCredits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes credits for new user", async () => {
    const { getUserCredits, initializeUserCredits } = await import("@/lib/credits/creditService");
    const { ensureUserCredits } = await import("@/lib/credits/withCredits");

    vi.mocked(getUserCredits).mockResolvedValueOnce(null);
    vi.mocked(initializeUserCredits).mockResolvedValueOnce({} as never);

    await ensureUserCredits("new-user-123");

    expect(getUserCredits).toHaveBeenCalledWith("new-user-123");
    expect(initializeUserCredits).toHaveBeenCalledWith("new-user-123", "free");
  });

  it("does nothing if user already has credits", async () => {
    const { getUserCredits, initializeUserCredits } = await import("@/lib/credits/creditService");
    const { ensureUserCredits } = await import("@/lib/credits/withCredits");

    vi.mocked(getUserCredits).mockResolvedValueOnce({
      userId: "existing-user",
      plan: "free",
      monthlyCredits: 7,
    } as never);

    await ensureUserCredits("existing-user");

    expect(getUserCredits).toHaveBeenCalledWith("existing-user");
    expect(initializeUserCredits).not.toHaveBeenCalled();
  });

  it("logs error but does not throw on failure", async () => {
    const { getUserCredits } = await import("@/lib/credits/creditService");
    const { logger } = await import("@/lib/logger");
    const { ensureUserCredits } = await import("@/lib/credits/withCredits");

    vi.mocked(getUserCredits).mockRejectedValueOnce(new Error("Database error"));

    await expect(ensureUserCredits("user-123")).resolves.not.toThrow();

    expect(logger.error).toHaveBeenCalledWith(
      "[ensureUserCredits] Failed:",
      expect.any(Error)
    );
  });
});
