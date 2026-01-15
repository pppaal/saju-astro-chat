import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { getUserReferralCode, getReferralUrl } from "@/lib/referral";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

// POST: 추천 코드 발급 (기존 코드 있으면 반환)
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "not_authenticated" },
        { status: 401 }
      );
    }

    const code = await getUserReferralCode(session.user.id);
    const referralUrl = getReferralUrl(code);

    return NextResponse.json({
      code,
      referralUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    logger.error("[Referral create-code error]", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
