// ✅ src/app/api/dates/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // 한국(UTC+9) 기준 시각 계산
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const dateText = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const dateDisplay = `${year}년 ${month}월 ${day}일`;

  // ✅ JSON 응답 반환
  return NextResponse.json({
    timestamp: now.toISOString(),
    year,
    month,
    day,
    dateText,
    dateDisplay,
    timezone: "Asia/Seoul",
  });
}
