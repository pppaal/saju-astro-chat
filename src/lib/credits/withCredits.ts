import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import {
  consumeCredits,
  canUseCredits,
  getUserCredits,
  initializeUserCredits,
} from "./creditService";

export type CreditType = "reading" | "compatibility" | "followUp";

interface CreditCheckResult {
  allowed: boolean;
  userId?: string;
  error?: string;
  errorCode?: string;
  remaining?: number;
}

/**
 * 크레딧 체크 및 소비 헬퍼
 * API route에서 사용
 */
export async function checkAndConsumeCredits(
  type: CreditType = "reading",
  amount: number = 1
): Promise<CreditCheckResult> {
  const session = await getServerSession(authOptions);

  // 비로그인 시 free 1회 허용 (별도 로직 필요)
  if (!session?.user?.id) {
    return {
      allowed: false,
      error: "로그인이 필요합니다",
      errorCode: "not_authenticated",
    };
  }

  const userId = session.user.id;

  // 개발/테스트 환경에서 크레딧 우회
  if (process.env.BYPASS_CREDITS === "true") {
    return {
      allowed: true,
      userId,
      remaining: 9999,
    };
  }

  // 크레딧 체크
  const canUse = await canUseCredits(userId, type, amount);
  if (!canUse.allowed) {
    const errorMessages: Record<string, string> = {
      no_credits: "이번 달 리딩 횟수를 모두 사용했습니다. 플랜을 업그레이드하세요.",
      compatibility_limit: "이번 달 궁합 분석 횟수를 모두 사용했습니다.",
      followup_limit: "이번 달 후속질문 횟수를 모두 사용했습니다.",
    };

    return {
      allowed: false,
      userId,
      error: errorMessages[canUse.reason || ""] || "크레딧이 부족합니다",
      errorCode: canUse.reason,
      remaining: canUse.remaining,
    };
  }

  // 크레딧 소비
  const consumeResult = await consumeCredits(userId, type, amount);
  if (!consumeResult.success) {
    return {
      allowed: false,
      userId,
      error: "크레딧 차감 중 오류가 발생했습니다",
      errorCode: consumeResult.error,
    };
  }

  return {
    allowed: true,
    userId,
    remaining: canUse.remaining,
  };
}

/**
 * 크레딧 체크만 (소비 안 함)
 * pre-check용
 */
export async function checkCreditsOnly(
  type: CreditType = "reading",
  amount: number = 1
): Promise<CreditCheckResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      allowed: false,
      error: "로그인이 필요합니다",
      errorCode: "not_authenticated",
    };
  }

  // 개발/테스트 환경에서 크레딧 우회
  if (process.env.BYPASS_CREDITS === "true") {
    return {
      allowed: true,
      userId: session.user.id,
      remaining: 9999,
    };
  }

  const canUse = await canUseCredits(session.user.id, type, amount);
  return {
    allowed: canUse.allowed,
    userId: session.user.id,
    error: canUse.allowed ? undefined : "크레딧이 부족합니다",
    errorCode: canUse.reason,
    remaining: canUse.remaining,
  };
}

/**
 * NextResponse 에러 반환 헬퍼
 */
export function creditErrorResponse(result: CreditCheckResult): NextResponse {
  if (result.errorCode === "not_authenticated") {
    return NextResponse.json(
      { error: result.error, code: result.errorCode },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      error: result.error,
      code: result.errorCode,
      remaining: result.remaining,
      upgradeUrl: "/pricing",
    },
    { status: 402 } // Payment Required
  );
}

/**
 * 유저 가입 시 크레딧 초기화 훅
 * (NextAuth callbacks에서 사용)
 */
export async function ensureUserCredits(userId: string): Promise<void> {
  try {
    const credits = await getUserCredits(userId);
    if (!credits) {
      await initializeUserCredits(userId, "free");
    }
  } catch (err) {
    console.error("[ensureUserCredits] Failed:", err);
  }
}
