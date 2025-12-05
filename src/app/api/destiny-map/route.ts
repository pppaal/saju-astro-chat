import { NextResponse } from "next/server";
import { generateReport } from "@/lib/destiny-map/reportService";
import type { SajuResult, AstrologyResult } from "@/lib/destiny-map/types";
import fs from "fs";
import path from "path";
import { recordCounter, recordTiming } from "@/lib/metrics";
import { apiGuard } from "@/lib/apiGuard";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/authOptions";
import { sendNotification } from "@/lib/notifications/sse";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
const enableDebugLogs = process.env.ENABLE_DESTINY_LOGS === "true";

// Basic HTML/script stripping to keep responses safe for UI rendering
function cleanseText(raw: string) {
  if (!raw) return "";
  return raw
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/[{}<>]/g, "")
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
    recordTiming("destiny.report.latency_ms", Date.now() - start, { theme, lang });
    recordCounter("destiny.report.success", 1, { theme, lang });

    if (enableDebugLogs) {
      console.log("[API] Report generated (redacted payload)");
    }

    // Notify user via SSE if logged in
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.email) {
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

    // Five element fallback values
    const dynamicFiveElements =
      report?.raw?.raw?.saju?.fiveElements &&
      Object.keys(report.raw.raw.saju.fiveElements).length > 0
        ? report.raw.raw.saju.fiveElements
        : undefined;

    const fiveElements = dynamicFiveElements ?? {
      wood: 25,
      fire: 20,
      earth: 20,
      metal: 20,
      water: 15,
    };

    const saju: SajuResult = {
      dayMaster: report.raw?.raw?.saju?.dayMaster ?? { name: "Unknown Day Master", element: "unknown" },
      fiveElements,
      pillars: report.raw?.raw?.saju?.pillars,
      unse: report.raw?.raw?.saju?.unse,
    };

    const astrology: AstrologyResult = report.raw?.raw?.astrology ?? { facts: {} };

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
    });
  } catch (err: any) {
    console.error("[DestinyMap API Error]:", err);
    recordCounter("destiny.report.failure", 1);
    return NextResponse.json({ error: err.message ?? "Internal Server Error" }, { status: 500 });
  }
}
