import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import {
  getCreditBalance,
  canUseCredits,
  canUseFeature,
  PLAN_CONFIG,
  type FeatureType,
} from "@/lib/credits/creditService";

export const dynamic = "force-dynamic";

// GET: 현재 크레딧 상태 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // 비로그인 유저는 free 플랜 정보 반환
      return NextResponse.json({
        isLoggedIn: false,
        plan: "free",
        ...PLAN_CONFIG.free,
        remainingCredits: 0,
        compatibility: { used: 0, limit: 0, remaining: 0 },
        followUp: { used: 0, limit: 0, remaining: 0 },
      });
    }

    const balance = await getCreditBalance(session.user.id);
    const planConfig = PLAN_CONFIG[balance.plan];

    return NextResponse.json({
      isLoggedIn: true,
      plan: balance.plan,
      features: planConfig.features,
      credits: {
        monthly: balance.monthlyCredits,
        used: balance.usedCredits,
        bonus: balance.bonusCredits,
        remaining: balance.remainingCredits,
      },
      compatibility: balance.compatibility,
      followUp: balance.followUp,
      historyRetention: balance.historyRetention,
      periodEnd: balance.periodEnd,
    });
  } catch (err: any) {
    console.error("[Credits GET error]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST: 크레딧 사용 가능 여부 확인 (pre-check)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "not_authenticated", allowed: false },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type = "reading", amount = 1, feature } = body;

    // 기능 체크
    if (feature) {
      const canUse = await canUseFeature(session.user.id, feature as FeatureType);
      return NextResponse.json({
        feature,
        allowed: canUse,
        reason: canUse ? undefined : "feature_not_available",
      });
    }

    // 크레딧 체크
    const result = await canUseCredits(session.user.id, type, amount);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Credits POST error]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
