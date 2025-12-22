// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { guardText, cleanText } from "@/lib/textGuards";
import { enforceBodySize } from "@/lib/http";

const BACKEND_URL =
  process.env.AI_BACKEND_URL ||
  process.env.NEXT_PUBLIC_AI_BACKEND ||
  "http://127.0.0.1:5000";

function validateBackendUrl(url: string) {
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[Feedback API] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn("[Feedback API] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
}

function trimValue(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(req: NextRequest) {
  let limitHeaders: Headers | undefined;
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`feedback:${ip}`, { limit: 20, windowSeconds: 60 });
    limitHeaders = limit.headers;
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "rate_limited", retryAfter: limit.reset },
        { status: 429, headers: limit.headers }
      );
    }
    if (!requirePublicToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const oversized = enforceBodySize(req as any, 256 * 1024, limit.headers);
    if (oversized) return oversized;

    const body = await req.json();

    const {
      service,
      theme,
      sectionId,
      helpful,
      dayMaster,
      sunSign,
      locale = "ko",
      userHash,
      // Extended fields for RLHF
      recordId,
      rating,
      feedbackText,
      userQuestion,
      consultationSummary,
      contextUsed,
    } = body;

    const safeService = trimValue(service, 64);
    const safeTheme = trimValue(theme, 64);
    const safeSectionId = trimValue(sectionId, 80);
    const safeLocale = trimValue(locale, 8) || "ko";
    const safeUserHash = userHash ? trimValue(userHash, 128) : null;
    const safeRecordId = recordId ? trimValue(recordId, 120) : null;
    const safeFeedbackText = feedbackText ? guardText(String(feedbackText), 600) : null;
    const safeUserQuestion = userQuestion ? guardText(String(userQuestion), 600) : null;
    const safeConsultationSummary = consultationSummary ? guardText(String(consultationSummary), 600) : null;
    const safeContextUsed = contextUsed ? guardText(String(contextUsed), 600) : null;
    const safeDayMaster = dayMaster ? trimValue(dayMaster, 32) : null;
    const safeSunSign = sunSign ? trimValue(sunSign, 32) : null;
    const normalizedRating =
      typeof rating === "number" && Number.isFinite(rating) && rating >= 1 && rating <= 5
        ? rating
        : null;

    // Validation
    if (!safeService || !safeTheme || !safeSectionId || typeof helpful !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: service, theme, sectionId, helpful" },
        { status: 400, headers: limit.headers }
      );
    }

    // Save to local database
    const feedback = await prisma.sectionFeedback.create({
      data: {
        service: safeService,
        theme: safeTheme,
        sectionId: safeSectionId,
        helpful,
        dayMaster: safeDayMaster,
        sunSign: safeSunSign,
        locale: safeLocale,
        userHash: safeUserHash,
      },
    });

    // Also send to backend RLHF system for AI improvement
    let rlhfResult = null;
    try {
      validateBackendUrl(BACKEND_URL);
      const rlhfRating = normalizedRating ?? (helpful ? 5 : 1); // Convert boolean to rating if not provided
      const rlhfPayload = {
        consultation_data: {
          record_id: safeRecordId || feedback.id,
          theme: safeTheme,
          locale: safeLocale,
          user_prompt: safeUserQuestion || "",
          consultation_summary: safeConsultationSummary || safeSectionId,
          context_used: safeContextUsed || "",
        },
        rating: rlhfRating,
        feedback: cleanText(safeFeedbackText || (helpful ? "Helpful" : "Not helpful"), 500),
        user_id: safeUserHash || "anonymous",
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const rlhfResponse = await fetch(`${BACKEND_URL}/rlhf/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.ADMIN_API_TOKEN || "",
        },
        body: JSON.stringify(rlhfPayload),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (rlhfResponse.ok) {
        rlhfResult = await rlhfResponse.json();
        console.log("[Feedback] RLHF recorded:", rlhfResult.feedback_id);
      }
    } catch (rlhfErr) {
      // RLHF is optional - don't fail the whole request
      console.warn("[Feedback] RLHF backend not available:", rlhfErr);
    }

    const res = NextResponse.json({
      success: true,
      id: feedback.id,
      rlhfId: rlhfResult?.feedback_id,
      badges: rlhfResult?.new_badges || [],
    });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: any) {
    console.error("[Feedback API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500, headers: limitHeaders }
    );
  }
}

// GET: Fetch feedback stats (for admin/analytics)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service");
    const theme = searchParams.get("theme");

    const where: any = {};
    if (service) where.service = service;
    if (theme) where.theme = theme;

    // Get aggregated stats
    const [total, positive, bySectionTotals, bySectionPositives] = await Promise.all([
      prisma.sectionFeedback.count({ where }),
      prisma.sectionFeedback.count({ where: { ...where, helpful: true } }),
      prisma.sectionFeedback.groupBy({
        by: ["sectionId"],
        where,
        _count: { _all: true },
      }),
      prisma.sectionFeedback.groupBy({
        by: ["sectionId"],
        where: { ...where, helpful: true },
        _count: { _all: true },
      }),
    ]);

    const satisfactionRate = total > 0 ? Math.round((positive / total) * 100) : 0;

    // Format section stats
    const positiveMap = new Map<string, number>();
    bySectionPositives.forEach((s: any) => {
      positiveMap.set(s.sectionId, s._count._all || 0);
    });

    const sectionStats = bySectionTotals.map((s: any) => {
      const pos = positiveMap.get(s.sectionId) || 0;
      const totalCount = s._count._all;
      return {
        sectionId: s.sectionId,
        total: totalCount,
        positive: pos,
        rate: totalCount > 0 ? Math.round((pos / totalCount) * 100) : 0,
      };
    });

    return NextResponse.json({
      total,
      positive,
      negative: total - positive,
      satisfactionRate,
      bySection: sectionStats,
    });
  } catch (error: any) {
    console.error("[Feedback Stats Error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
