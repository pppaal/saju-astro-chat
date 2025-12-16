// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const BACKEND_URL = process.env.NEXT_PUBLIC_AI_BACKEND || "http://127.0.0.1:5000";

export async function POST(req: NextRequest) {
  try {
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

    // Validation
    if (!service || !theme || !sectionId || typeof helpful !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: service, theme, sectionId, helpful" },
        { status: 400 }
      );
    }

    // Save to local database
    const feedback = await prisma.sectionFeedback.create({
      data: {
        service,
        theme,
        sectionId,
        helpful,
        dayMaster: dayMaster || null,
        sunSign: sunSign || null,
        locale,
        userHash: userHash || null,
      },
    });

    // Also send to backend RLHF system for AI improvement
    let rlhfResult = null;
    try {
      const rlhfRating = rating ?? (helpful ? 5 : 1); // Convert boolean to rating if not provided
      const rlhfPayload = {
        consultation_data: {
          record_id: recordId || feedback.id,
          theme: theme,
          locale: locale,
          user_prompt: userQuestion || "",
          consultation_summary: consultationSummary || sectionId,
          context_used: contextUsed || "",
        },
        rating: rlhfRating,
        feedback: feedbackText || (helpful ? "Helpful" : "Not helpful"),
        user_id: userHash || "anonymous",
      };

      const rlhfResponse = await fetch(`${BACKEND_URL}/rlhf/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": process.env.ADMIN_API_TOKEN || "",
        },
        body: JSON.stringify(rlhfPayload),
      });

      if (rlhfResponse.ok) {
        rlhfResult = await rlhfResponse.json();
        console.log("[Feedback] RLHF recorded:", rlhfResult.feedback_id);
      }
    } catch (rlhfErr) {
      // RLHF is optional - don't fail the whole request
      console.warn("[Feedback] RLHF backend not available:", rlhfErr);
    }

    return NextResponse.json({
      success: true,
      id: feedback.id,
      rlhfId: rlhfResult?.feedback_id,
      badges: rlhfResult?.new_badges || [],
    });
  } catch (error: any) {
    console.error("[Feedback API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
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
