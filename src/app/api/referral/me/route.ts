import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { getReferralStats, getReferralUrl } from "@/lib/referral";

export const dynamic = "force-dynamic";

// GET: 내 추천 현황 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "not_authenticated" },
        { status: 401 }
      );
    }

    const stats = await getReferralStats(session.user.id);
    const referralUrl = getReferralUrl(stats.referralCode);

    return NextResponse.json({
      ...stats,
      referralUrl,
    });
  } catch (err: any) {
    console.error("[Referral GET error]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
