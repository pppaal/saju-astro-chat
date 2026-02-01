// src/app/api/feedback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { withApiMiddleware, createPublicStreamGuard, createSimpleGuard, type ApiContext } from "@/lib/api/middleware";
import { prisma } from "@/lib/db/prisma";
import { guardText, cleanText } from "@/lib/textGuards";
import { apiClient } from "@/lib/api";
import { logger } from '@/lib/logger';

import { parseRequestBody } from '@/lib/api/requestParser';
import { HTTP_STATUS } from '@/lib/constants/http';
type FeedbackBody = {
  service?: string;
  theme?: string;
  sectionId?: string;
  helpful?: boolean;
  dayMaster?: string;
  sunSign?: string;
  locale?: string;
  userHash?: string;
  recordId?: string;
  rating?: number;
  feedbackText?: string;
  userQuestion?: string;
  consultationSummary?: string;
  contextUsed?: string;
};
type RlhfResponse = {
  feedback_id?: string;
  new_badges?: string[];
};
type SectionGroup = {
  sectionId: string;
  _count: { _all: number };
};



function trimValue(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

export const POST = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
      const body = await parseRequestBody<FeedbackBody>(req, { context: 'Feedback' });

      if (!body || typeof body !== "object") {
        return NextResponse.json({ error: "invalid_body" }, { status: HTTP_STATUS.BAD_REQUEST });
      }

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
          { status: HTTP_STATUS.BAD_REQUEST }
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
    let rlhfResult: RlhfResponse | null = null;
    try {
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

      const result = await apiClient.post<RlhfResponse>('/rlhf/feedback', rlhfPayload, { timeout: 8000 });

      if (result.ok && result.data) {
        rlhfResult = result.data;
        logger.warn("[Feedback] RLHF recorded:", rlhfResult.feedback_id);
      }
    } catch (rlhfErr) {
      // RLHF is optional - don't fail the whole request
      logger.warn("[Feedback] RLHF backend not available:", rlhfErr);
    }

      const res = NextResponse.json({
        success: true,
        id: feedback.id,
        rlhfId: rlhfResult?.feedback_id,
        badges: rlhfResult?.new_badges || [],
      });
      res.headers.set("Cache-Control", "no-store");
      return res;
    } catch (error: unknown) {
      logger.error("[Feedback API Error]:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal Server Error" },
        { status: HTTP_STATUS.SERVER_ERROR }
      );
    }
  },
  createPublicStreamGuard({
    route: '/api/feedback',
    limit: 20,
    windowSeconds: 60,
  })
)

// GET: Fetch feedback stats (for admin/analytics)
export const GET = withApiMiddleware(
  async (req: NextRequest, _context: ApiContext) => {
    try {
    const { searchParams } = new URL(req.url);
    const service = searchParams.get("service");
    const theme = searchParams.get("theme");

    const where: { service?: string; theme?: string } = {};
    if (service) {where.service = service;}
    if (theme) {where.theme = theme;}

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
    ]) as [number, number, SectionGroup[], SectionGroup[]];

    const satisfactionRate = total > 0 ? Math.round((positive / total) * 100) : 0;

    // Format section stats
    const positiveMap = new Map<string, number>();
    bySectionPositives.forEach((s) => {
      positiveMap.set(s.sectionId, s._count._all || 0);
    });

    const sectionStats = bySectionTotals.map((s) => {
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
    } catch (error: unknown) {
      logger.error("[Feedback Stats Error]:", error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal Server Error" },
        { status: HTTP_STATUS.SERVER_ERROR }
      );
    }
  },
  createSimpleGuard({
    route: '/api/feedback',
    limit: 60,
    windowSeconds: 60,
  })
)
