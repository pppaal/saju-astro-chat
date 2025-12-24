import { NextResponse } from "next/server";
import { generateReport } from "@/lib/destiny-map/reportService";
import type { SajuResult, AstrologyResult } from "@/lib/destiny-map/types";
import { recordCounter, recordTiming } from "@/lib/metrics";
import { apiGuard } from "@/lib/apiGuard";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { sendNotification } from "@/lib/notifications/sse";
import { saveConsultation, extractSummary } from "@/lib/consultation/saveConsultation";
import { sanitizeLocaleText, maskTextWithName } from "@/lib/destiny-map/sanitize";
import { enforceBodySize } from "@/lib/http";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const maxDuration = 180;
const enableDebugLogs = process.env.ENABLE_DESTINY_LOGS === "true";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const ALLOWED_LANG = new Set(["ko", "en"]);
const ALLOWED_GENDER = new Set(["male", "female", "other", "prefer_not"]);
const MAX_THEME = 32;
const MAX_PROMPT = 2000;
const MAX_NAME = 80;
const MAX_CITY = 120;
const MAX_TZ = 80;

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
    const oversized = enforceBodySize(request as any, 64 * 1024);
    if (oversized) return oversized;

    const guard = await apiGuard(request, { path: "destiny-map", limit: 60, windowSeconds: 60 });
    if (guard instanceof NextResponse) return guard;

    const body = await request.json().catch(() => null);
    if (enableDebugLogs) {
      console.log("[API] DestinyMap POST received", { theme: body?.theme, lang: body?.lang, hasPrompt: Boolean(body?.prompt) });
    }

    if (!body) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : undefined;
    const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
    const birthTime = typeof body.birthTime === "string" ? body.birthTime.trim() : "";
    const gender = typeof body.gender === "string" && ALLOWED_GENDER.has(body.gender) ? body.gender : "male";
    const city = typeof body.city === "string" ? body.city.trim().slice(0, MAX_CITY) : undefined;
    const latitude = typeof body.latitude === "number" ? body.latitude : Number(body.latitude);
    const longitude = typeof body.longitude === "number" ? body.longitude : Number(body.longitude);
    const theme = typeof body.theme === "string" ? body.theme.trim().slice(0, MAX_THEME) : "life";
    const lang = typeof body.lang === "string" && ALLOWED_LANG.has(body.lang) ? body.lang : "ko";
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, MAX_PROMPT) : undefined;
    const userTimezone = typeof body.userTimezone === "string" ? body.userTimezone.trim().slice(0, MAX_TZ) : undefined;

    if (!birthDate || !birthTime || latitude === undefined || longitude === undefined) {
      console.error("[API] Missing required fields");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!DATE_RE.test(birthDate) || Number.isNaN(Date.parse(birthDate))) {
      return NextResponse.json({ error: "Invalid birthDate" }, { status: 400 });
    }
    if (!TIME_RE.test(birthTime)) {
      return NextResponse.json({ error: "Invalid birthTime" }, { status: 400 });
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: "Invalid latitude" }, { status: 400 });
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Invalid longitude" }, { status: 400 });
    }
    if (userTimezone && (!userTimezone.includes("/") || userTimezone.length < 3)) {
      return NextResponse.json({ error: "Invalid userTimezone" }, { status: 400 });
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
    // Sanitize key text fields for ko/en to avoid garbled characters
    const cleanLang = lang === "ko" ? "ko" : "en";
    report.summary = sanitizeLocaleText(report.summary || "", cleanLang);
    if (report.crossHighlights?.summary) {
      report.crossHighlights.summary = sanitizeLocaleText(report.crossHighlights.summary, cleanLang);
    }
    // Normalize theme interpretation strings
    if (report.themes) {
      Object.keys(report.themes).forEach((key) => {
        const t: any = (report.themes as any)[key];
        if (t?.interpretation && typeof t.interpretation === "string") {
          t.interpretation = sanitizeLocaleText(t.interpretation, cleanLang);
        }
      });
    }
    // Track validation status for response
    const validationFailed = report.meta?.validationPassed === false;
    const validationWarnings = report.meta?.validationWarnings ?? [];

    if (validationFailed) {
      recordTiming("destiny.report.latency_ms", Date.now() - start, { theme, lang, validation: "soft_fail" });
      recordCounter("destiny.report.validation_fail_soft", 1, { theme, lang });
    } else {
      recordTiming("destiny.report.latency_ms", Date.now() - start, { theme, lang });
      recordCounter("destiny.report.success", 1, { theme, lang });
    }

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

    // 로그인 사용자의 경우 상담 기록 자동 저장 (이름 마스킹)
    if (userId && report?.report) {
      try {
        const fullReport = maskTextWithName(cleanseText(report.report), name);
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

    // Five element fallback values - check both saju.fiveElements and saju.facts.fiveElements
    const rawFiveElements =
      report?.raw?.saju?.fiveElements || report?.raw?.saju?.facts?.fiveElements;
    const dynamicFiveElements =
      rawFiveElements && Object.keys(rawFiveElements).length > 0
        ? rawFiveElements
        : undefined;

    const fiveElements = dynamicFiveElements ?? {
      wood: 25,
      fire: 20,
      earth: 20,
      metal: 20,
      water: 15,
    };

    // Get dayMaster from saju data - check both saju.dayMaster and saju.facts.dayMaster
    // Normalize to consistent format: { name: string, element: string }
    const rawDayMaster = report.raw?.saju?.dayMaster || report.raw?.saju?.facts?.dayMaster;
    if (enableDebugLogs) {
      console.log("[API] dayMaster sources:", {
        "saju.dayMaster": report.raw?.saju?.dayMaster,
        "saju.facts.dayMaster": report.raw?.saju?.facts?.dayMaster,
        rawDayMaster,
      });
    }
    // dayMaster should always exist if calculation succeeded - empty object means error occurred
    if (!rawDayMaster || Object.keys(rawDayMaster).length === 0) {
      console.error("[API] dayMaster is missing or empty - saju calculation may have failed");
    }
    // Normalize dayMaster to { name, element } format
    let dayMaster: { name?: string; element?: string } = {};
    if (rawDayMaster) {
      // Handle nested structure: { heavenlyStem: { name, element } }
      if (rawDayMaster.heavenlyStem?.name) {
        dayMaster = {
          name: rawDayMaster.heavenlyStem.name,
          element: rawDayMaster.heavenlyStem.element || rawDayMaster.element,
        };
      } else if (rawDayMaster.name) {
        // Already flat: { name, element }
        dayMaster = {
          name: rawDayMaster.name,
          element: rawDayMaster.element,
        };
      } else if (typeof rawDayMaster === "string") {
        // Raw string name
        dayMaster = { name: rawDayMaster };
      } else {
        dayMaster = rawDayMaster;
      }
    }

    const saju: SajuResult = {
      dayMaster,
      fiveElements,
      pillars: report.raw?.saju?.pillars,
      unse: report.raw?.saju?.unse,
      sinsal: report.raw?.saju?.sinsal,
      advancedAnalysis: report.raw?.saju?.advancedAnalysis,
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
      const maskedReply = maskTextWithName(cleanseText(report?.report) || "", name);
      return NextResponse.json({
        reply: maskedReply || noResultMessage,
        profile: { name, birthDate, birthTime, city, gender },
        saju,
        astrology,
        safety: false,
      });
    }

    // Otherwise return structured report payload
    const maskedSummary = maskTextWithName(cleanseText(report.summary), name);
    const maskedInterpretation = maskTextWithName(cleanseText(report.report), name);

    if (enableDebugLogs) {
      console.log("[API] Report content check:", {
        hasReport: Boolean(report.report),
        reportLength: report.report?.length || 0,
        maskedInterpLength: maskedInterpretation?.length || 0,
        firstChars: maskedInterpretation?.substring(0, 100),
      });
    }

    // Build response payload
    const responsePayload = {
      profile: { name, birthDate, birthTime, city, gender },
      lang,
      summary: maskedSummary,
      themes: {
        [theme]: {
          interpretation: maskedInterpretation,
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
      // 고급 점성술 데이터
      advancedAstrology: {
        extraPoints: report.raw?.extraPoints,
        solarReturn: report.raw?.solarReturn,
        lunarReturn: report.raw?.lunarReturn,
        progressions: report.raw?.progressions,
        draconic: report.raw?.draconic,
        harmonics: report.raw?.harmonics,
        asteroids: report.raw?.asteroids,
        fixedStars: report.raw?.fixedStars,
        eclipses: report.raw?.eclipses,
        electional: report.raw?.electional,
        midpoints: report.raw?.midpoints,
      },
    };

    // Return with warning wrapper if validation failed
    if (validationFailed) {
      return NextResponse.json(
        {
          status: "warning",
          warning: "cross_validation_failed",
          message: "교차 검증에서 일부 신호가 부족합니다. 그래도 보고서를 반환합니다.",
          warnings: validationWarnings,
          ...responsePayload,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error("[DestinyMap API Error]:", err);
    recordCounter("destiny.report.failure", 1);
    return NextResponse.json({ error: err.message ?? "Internal Server Error" }, { status: 500 });
  }
}
