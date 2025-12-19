import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { linkReferrer } from "@/lib/referral";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// POST: OAuth 로그인 후 추천 코드 연결
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "not_authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { referralCode } = body;

    if (!referralCode) {
      return NextResponse.json(
        { error: "missing_referral_code" },
        { status: 400 }
      );
    }

    // 이미 추천인이 연결되어 있는지 확인
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referrerId: true, createdAt: true },
    });

    if (user?.referrerId) {
      return NextResponse.json({
        linked: false,
        reason: "already_linked",
      });
    }

    // 가입 후 24시간 이내에만 추천 코드 연결 가능
    const hoursSinceCreation = user?.createdAt
      ? (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60)
      : 0;

    if (hoursSinceCreation > 24) {
      return NextResponse.json({
        linked: false,
        reason: "too_late",
      });
    }

    const result = await linkReferrer(session.user.id, referralCode);

    if (!result.success) {
      return NextResponse.json({
        linked: false,
        reason: result.error,
      });
    }

    return NextResponse.json({
      linked: true,
      referrerId: result.referrerId,
    });
  } catch (err: any) {
    console.error("[Referral link error]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
