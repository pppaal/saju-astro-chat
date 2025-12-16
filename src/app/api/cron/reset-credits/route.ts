import { NextResponse } from "next/server";
import { resetAllExpiredCredits } from "@/lib/credits/creditService";

// Vercel Cron 또는 외부 cron 서비스용 엔드포인트
// 매일 자정에 실행 권장

export const dynamic = "force-dynamic";

// 보안: CRON_SECRET 환경변수로 인증
function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET이 설정되지 않았으면 개발 환경으로 간주
  if (!cronSecret) {
    console.warn("[Cron] CRON_SECRET not set - allowing request in dev mode");
    return process.env.NODE_ENV === "development";
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  try {
    if (!validateCronSecret(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting monthly credit reset...");
    const result = await resetAllExpiredCredits();
    console.log("[Cron] Credit reset completed:", result);

    return NextResponse.json({
      success: true,
      message: "Monthly credit reset completed",
      ...result,
    });
  } catch (err: any) {
    console.error("[Cron Reset error]", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST도 지원 (일부 cron 서비스는 POST 사용)
export async function POST(request: Request) {
  return GET(request);
}
