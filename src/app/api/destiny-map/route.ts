//src/app/api/destiny-map/route.ts

import { NextResponse } from "next/server";
import { generateReport } from "@/lib/destiny-map/reportService";
import type { SajuResult, AstrologyResult } from "@/lib/destiny-map/types";
import fs from "fs";
import path from "path";
import { apiGuard } from "@/lib/apiGuard";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { sendNotification } from "@/lib/notifications/sse";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// 🧼 AI 결과 정화 함수
function cleanseText(raw: string) {
  if (!raw) return "";
  return raw
    // 🔹 의학·질병·폭력 관련 단어 제거
    .replace(/\b(암|질병|호르몬|자궁|당뇨|치매|정신|수술|폭력|죽음|피|혈|병원)\b/gi, "❖")
    // 🔹 HTML 및 JS 코드 제거
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/[{}<>]/g, "")
    // 🔹 공백 정리
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * POST /api/destiny-map
 * 운세·사주 리포트 생성 엔드포인트
 */
export async function POST(request: Request) {
  try {
    const guard = await apiGuard(request, { path: "destiny-map", limit: 30, windowSeconds: 60 });
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    console.log("✅ [API] DestinyMap POST body:", body);

    const {
      name,
      birthDate,
      birthTime,
      gender = "male",
      city,
      latitude,
      longitude,
      theme = "life",
      lang = "ko",
      prompt,
    } = body;

    if (!birthDate || !birthTime || !latitude || !longitude) {
      console.error("❌ Missing required fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("🧮 [API] Calling generateReport ...");

    // 🔮 리포트 실행
    const report = await generateReport({
      name,
      birthDate,
      birthTime,
      latitude: Number(latitude),
      longitude: Number(longitude),
      gender,
      theme,
      lang,
      extraPrompt: prompt,
    });

    console.log("✨ [API] Report generated!");
    console.log(JSON.stringify(report, null, 2));

    // -----------------------------------------------
    // 🔔 알림 전송 (로그인한 사용자에게만)
    // -----------------------------------------------
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        sendNotification(session.user.email, {
          type: "system",
          title: "✨ Destiny Map Ready!",
          message: `Your ${theme} reading for ${name || 'your profile'} has been generated successfully.`,
          link: "/destiny-map/result",
        });
        console.log("🔔 [API] Notification sent to:", session.user.email);
      }
    } catch (notifErr) {
      console.warn("⚠️ [API] Notification send failed:", notifErr);
    }

    // -----------------------------------------------
    // 🪄 fallback values
    // -----------------------------------------------
    const dynamicFiveElements =
      report?.raw?.raw?.saju?.fiveElements &&
      Object.keys(report.raw.raw.saju.fiveElements).length > 0
        ? report.raw.raw.saju.fiveElements
        : undefined;

    const fiveElements = dynamicFiveElements ?? {
      목: 25,
      화: 20,
      토: 20,
      금: 20,
      수: 15,
    };

    const saju: SajuResult = {
      dayMaster: report.raw?.raw?.saju?.dayMaster ?? { name: "알 수 없음", element: "불명" },
      fiveElements,
      pillars: report.raw?.raw?.saju?.pillars,
      unse: report.raw?.raw?.saju?.unse,
    };

    const astrology: AstrologyResult = report.raw?.raw?.astrology ?? { facts: {} };

    // -----------------------------------------------
    // 🗄️ 로그 파일 저장 (logs/ 폴더)
    // -----------------------------------------------
    try {
      const dir = path.join(process.cwd(), "logs");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      const file = path.join(dir, `destinymap-${Date.now()}.json`);
      fs.writeFileSync(file, JSON.stringify({ body, report }, null, 2), "utf8");
      console.log("💾 [API] Log saved:", file);
    } catch (err) {
      console.warn("⚠️ Log save failed:", err);
    }

    // -----------------------------------------------
    // 📣 간단 채팅형 응답
    // -----------------------------------------------
    if (prompt) {
      return NextResponse.json({
        reply:
          cleanseText(report?.report) ||
          (lang === "ko" ? "분석 결과를 처리하지 못했습니다." : "No result generated."),
        profile: { name, birthDate, birthTime, city, gender },
        saju,
        astrology,
      });
    }

    // -----------------------------------------------
    // 📘 리포트 풀데이터 응답
    // -----------------------------------------------
    return NextResponse.json({
      profile: { name, birthDate, birthTime, city, gender },
      lang,
      summary: cleanseText(report.summary),
      themes: {
        [theme]: {
          interpretation: cleanseText(report.report),
          highlights: [],
          raw: { saju, astrology },
        },
      },
      saju,
      astrology,
    });
  } catch (err: any) {
    console.error("[DestinyMap API Error]:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal Server Error" },
      { status: 500 },
    );
  }
}
