// src/app/api/feedback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

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
    } = body;

    // Validation
    if (!service || !theme || !sectionId || typeof helpful !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: service, theme, sectionId, helpful" },
        { status: 400 }
      );
    }

    // Save to database
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

    return NextResponse.json({
      success: true,
      id: feedback.id,
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
