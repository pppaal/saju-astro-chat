import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { claimReferralReward } from "@/lib/referral";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// POST: 첫 분석 완료 시 추천 보상 청구
// 이 API는 분석 완료 후 자동 호출됨
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "not_authenticated" },
        { status: 401 }
      );
    }

    const result = await claimReferralReward(session.user.id);

    if (!result.success) {
      // no_pending_reward는 에러가 아님 (이미 처리됐거나 추천 없음)
      if (result.error === "no_pending_reward") {
        return NextResponse.json({ claimed: false, reason: "no_pending_reward" });
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      claimed: true,
      creditsAwarded: result.creditsAwarded,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    logger.error("[Referral claim error]", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
