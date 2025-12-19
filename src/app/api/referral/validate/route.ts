import { NextResponse } from "next/server";
import { findUserByReferralCode } from "@/lib/referral";

export const dynamic = "force-dynamic";

// GET: 추천 코드 유효성 확인
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { valid: false, error: "missing_code" },
        { status: 400 }
      );
    }

    const referrer = await findUserByReferralCode(code);

    if (!referrer) {
      return NextResponse.json({ valid: false, error: "invalid_code" });
    }

    return NextResponse.json({
      valid: true,
      referrerName: referrer.name || "Friend",
    });
  } catch (err: any) {
    console.error("[Referral validate error]", err);
    return NextResponse.json(
      { valid: false, error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}
