import { NextResponse } from "next/server";
import { generateReport } from "@/lib/destiny-map/reportService";
import type { SajuResult, AstrologyResult } from "@/lib/destiny-map/types";
import { recordCounter, recordTiming } from "@/lib/metrics";
import { apiGuard } from "@/lib/apiGuard";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { sendNotification } from "@/lib/notifications/sse";
import { saveConsultation, extractSummary } from "@/lib/consultation/saveConsultation";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 180;
const enableDebugLogs = process.env.ENABLE_DESTINY_LOGS === "true";

// Basic HTML/script stripping to keep responses safe for UI rendering
// IMPORTANT: Preserve JSON structure (curly braces) for structured responses
function cleanseText(raw: string) {
  if (!raw) return "";

  // Check if this is a JSON response (starts with { or contains structured keys)
  const isJsonResponse = raw.trim().startsWith("{") ||
                          raw.includes('"lifeTimeline"') ||
                          raw.includes('"categoryAnalysis"');

  if (isJsonResponse) {
    // For JSON responses, only clean dangerous content but preserve structure
    return raw
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
      .replace(/on\w+\s*=/gi, "")  // Remove event handlers like onclick=
      .trim();
  }

  // For non-JSON (markdown/text) responses, do full cleansing
  return raw
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/[<>]/g, "")  // Only remove angle brackets, NOT curly braces
    .replace(/\s{2,}/g, " ")
    .trim();
}

function maskPayload(body: any) {
  if (!body || typeof body !== "object") return body;
  return {
    ...body,
    name: body.name ? `${body.name[0] ?? ""}***` : undefined,
    birthDate: body.birthDate ? "****-**-**" : undefined,
    birthTime: body.birthTime ? "**:**" : undefined,
    latitude: body.latitude ? Number(body.latitude).toFixed(3) : undefined,
    longitude: body.longitude ? Number(body.longitude).toFixed(3) : undefined,
  };
}

/**
 * POST /api/destiny-map
 * Generate a themed destiny-map report using astro + saju inputs.
 */
export async function POST(request: Request) {
  try {
    const guard = await apiGuard(request, { path: "destiny-map", limit: 30, windowSeconds: 60 });
    if (guard instanceof NextResponse) return guard;

    const body = await request.json();
    if (enableDebugLogs) {
      console.log("[API] DestinyMap POST received", { theme: body?.theme, lang: body?.lang, hasPrompt: Boolean(body?.prompt) });
    }

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
      userTimezone,
    } = body;

    if (!birthDate || !birthTime || !latitude || !longitude) {
      console.error("[API] Missing required fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (enableDebugLogs) {
      console.log("[API] Calling generateReport ...");
    }

    const start = Date.now();
    const report = await generateReport({
      // require cross-evidence; downstream will warn if missing
      name,
      birthDate,
      birthTime,
      latitude: Number(latitude),
      longitude: Number(longitude),
      gender,
      theme,
      lang,
      extraPrompt: prompt,
      userTimezone, // 사용자 현재 타임존 (운세 날짜용)
    });
    // cross-section validation for destiny-map
    if (report.meta?.validationPassed === false) {
      recordTiming("destiny.report.latency_ms", Date.now() - start, { theme, lang });
      recordCounter("destiny.report.validation_fail", 1, { theme, lang });
      return NextResponse.json(
        {
          error: "cross_validation_failed",
          message: "??+?? ?? ??? ?????? ??? ?????. ?? ??????.",
          warnings: report.meta?.validationWarnings ?? [],
          report,
        },
        { status: 502 }
      );
    }
    recordTiming("destiny.report.latency_ms", Date.now() - start, { theme, lang });
    recordCounter("destiny.report.success", 1, { theme, lang });

    if (enableDebugLogs) {
      console.log("[API] Report generated (redacted payload)");
    }

    // Notify user via SSE if logged in
    let userId: string | undefined;
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
        userId = session.user.id;
        sendNotification(session.user.email, {
          type: "system",
          title: "Destiny Map Ready!",
          message: `Your ${theme} reading for ${name || "your profile"} has been generated successfully.`,
          link: "/destiny-map/result",
        });
        if (enableDebugLogs) {
          const maskedEmail = `${session.user.email.split("@")[0]?.slice(0, 2) ?? "**"}***@***`;
          console.log("[API] Notification sent (masked):", maskedEmail);
        }
      }
    } catch (notifErr) {
      if (enableDebugLogs) {
        console.warn("[API] Notification send failed:", notifErr);
      }
    }

    // 로그인 사용자의 경우 상담 기록 자동 저장
    if (userId && report?.report) {
      try {
        const fullReport = cleanseText(report.report);
        const summary = extractSummary(fullReport);
        await saveConsultation({
          userId,
          theme,
          summary,
          fullReport,
          signals: {
            saju: report.raw?.raw?.saju,
            astrology: report.raw?.raw?.astrology,
          },
          userQuestion: prompt || null,
          locale: lang,
        });
        if (enableDebugLogs) {
          console.log("[API] Consultation saved for user");
        }
      } catch (saveErr) {
        if (enableDebugLogs) {
          console.warn("[API] Consultation save failed:", saveErr);
        }
      }
    }

    // Five element fallback values - access from report.raw.saju (not report.raw.raw.saju)
    const dynamicFiveElements =
      report?.raw?.saju?.fiveElements &&
      Object.keys(report.raw.saju.fiveElements).length > 0
        ? report.raw.saju.fiveElements
        : undefined;

    const fiveElements = dynamicFiveElements ?? {
      wood: 25,
      fire: 20,
      earth: 20,
      metal: 20,
      water: 15,
    };

    const saju: SajuResult = {
      dayMaster: report.raw?.saju?.dayMaster ?? { name: "Unknown Day Master", element: "unknown" },
      fiveElements,
      pillars: report.raw?.saju?.pillars,
      unse: report.raw?.saju?.unse,
    };

    const astrology: AstrologyResult = report.raw?.astrology ?? { facts: {} };

    // Persist logs for debugging (consider disabling or masking in production)
    if (enableDebugLogs) {
      try {
        const dir = path.join(process.cwd(), "logs");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        const file = path.join(dir, `destinymap-${Date.now()}.json`);
        fs.writeFileSync(file, JSON.stringify({ body: maskPayload(body), report }, null, 2), "utf8");
        console.log("[API] Log saved:", file);
      } catch (err) {
        console.warn("[API] Log save failed:", err);
      }
    }

    const noResultMessage =
      lang === "ko"
        ? "분석 결과를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요."
        : "No result generated.";

    // If prompt was provided, return immediate reply
    if (prompt) {
      return NextResponse.json({
        reply: cleanseText(report?.report) || noResultMessage,
        profile: { name, birthDate, birthTime, city, gender },
        saju,
        astrology,
        safety: false,
      });
    }

    // Otherwise return structured report payload
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
      safety: false,
      // 분석 기준 날짜 정보 (사용자 타임존 기준)
      analysisDate: report.raw?.analysisDate,
      userTimezone: report.raw?.userTimezone,
    });
  } catch (err: any) {
    console.error("[DestinyMap API Error]:", err);
    recordCounter("destiny.report.failure", 1);
    return NextResponse.json({ error: err.message ?? "Internal Server Error" }, { status: 500 });
  }
}
