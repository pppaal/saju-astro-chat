// src/app/api/dream/stream/route.ts
// Streaming Dream Interpretation API - Real-time SSE for fast display

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { initializeApiContext, createPublicStreamGuard } from "@/lib/api/middleware";
import { createSSEStreamProxy, createFallbackSSEStream } from "@/lib/streaming";
import { apiClient } from "@/lib/api/ApiClient";
import { enforceBodySize } from "@/lib/http";
import { cleanStringArray, isRecord } from "@/lib/api";
import { logger } from '@/lib/logger';

interface StreamDreamRequest {
  dreamText: string;
  symbols?: string[];
  emotions?: string[];
  themes?: string[];
  context?: string[];
  locale?: "ko" | "en";
  // Cultural symbols
  koreanTypes?: string[];
  koreanLucky?: string[];
  chinese?: string[];
  islamicTypes?: string[];
  western?: string[];
  hindu?: string[];
  japanese?: string[];
  // Birth data for astrology/saju analysis
  birth?: {
    date: string;
    time: string;
    timezone?: string;
    latitude?: number;
    longitude?: number;
    gender?: string;
  };
  sajuInfluence?: {
    pillars?: Record<string, unknown>;
    dayMaster?: Record<string, unknown>;
    currentDaeun?: Record<string, unknown> | null;
    currentSaeun?: Record<string, unknown> | null;
    currentWolun?: Record<string, unknown> | null;
    todayIljin?: Record<string, unknown> | null;
  };
}

const MAX_STREAM_BODY = 64 * 1024;
const MAX_TEXT_LEN = 4000;
const _MAX_LIST_ITEMS = 20;
const _MAX_LIST_ITEM_LEN = 120;
const STREAM_LOCALES = new Set(["ko", "en"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const MAX_TIMEZONE_LEN = 64;

// cleanStringArray and isRecord imported from @/lib/api

function sanitizeBirth(raw: unknown) {
  if (!isRecord(raw)) {return undefined;}
  const date = typeof raw.date === "string" && DATE_RE.test(raw.date) ? raw.date : undefined;
  const time = typeof raw.time === "string" && TIME_RE.test(raw.time) ? raw.time : undefined;
  const timezone = typeof raw.timezone === "string" ? raw.timezone.trim().slice(0, MAX_TIMEZONE_LEN) : undefined;
  const latNum = Number(raw.latitude);
  const lonNum = Number(raw.longitude);
  const latitude = Number.isFinite(latNum) && latNum >= -90 && latNum <= 90 ? latNum : undefined;
  const longitude = Number.isFinite(lonNum) && lonNum >= -180 && lonNum <= 180 ? lonNum : undefined;
  const gender = typeof raw.gender === "string" ? raw.gender.trim().slice(0, 20) : undefined;

  if (!date && !time && latitude === undefined && longitude === undefined && !timezone && !gender) {
    return undefined;
  }

  return { date, time, timezone, latitude, longitude, gender };
}

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: rate limiting + public token auth + credit consumption
    const guardOptions = createPublicStreamGuard({
      route: "dream-stream",
      limit: 10,
      windowSeconds: 60,
      requireCredits: true,
      creditType: "reading",
      creditAmount: 1,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) {return error;}

    const oversized = enforceBodySize(req, MAX_STREAM_BODY);
    if (oversized) {return oversized;}

    const body = (await req.json().catch(() => null)) as Partial<StreamDreamRequest> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const dreamTextRaw = typeof body.dreamText === "string" ? body.dreamText.trim() : "";
    const dreamText = dreamTextRaw.slice(0, MAX_TEXT_LEN);
    const symbols = cleanStringArray(body.symbols);
    const emotions = cleanStringArray(body.emotions);
    const themes = cleanStringArray(body.themes);
    const contextArray = cleanStringArray(body.context);
    const locale = (typeof body.locale === "string" && STREAM_LOCALES.has(body.locale)
      ? body.locale
      : context.locale) as "ko" | "en";
    const koreanTypes = cleanStringArray(body.koreanTypes);
    const koreanLucky = cleanStringArray(body.koreanLucky);
    const chinese = cleanStringArray(body.chinese);
    const islamicTypes = cleanStringArray(body.islamicTypes);
    const western = cleanStringArray(body.western);
    const hindu = cleanStringArray(body.hindu);
    const japanese = cleanStringArray(body.japanese);
    const birth = sanitizeBirth(body.birth);
    const sajuInfluence = isRecord(body.sajuInfluence) ? body.sajuInfluence : undefined;

    if (!dreamText || dreamText.trim().length < 5) {
      return NextResponse.json(
        { error: "Dream description required (min 5 characters)" },
        { status: 400 }
      );
    }

    // Call backend streaming endpoint using apiClient
    const streamResult = await apiClient.postSSEStream("/api/dream/interpret-stream", {
      dream: dreamText,
      symbols,
      emotions,
      themes,
      context: contextArray,
      locale,
      koreanTypes,
      koreanLucky,
      chinese,
      islamicTypes,
      western,
      hindu,
      japanese,
      birth,
      sajuInfluence
    });

    if (!streamResult.ok) {
      logger.error("[DreamStream] Backend error:", { status: streamResult.status, error: streamResult.error });

      return createFallbackSSEStream({
        content: locale === "ko"
          ? "일시적으로 꿈 해석 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해주세요."
          : "Dream interpretation service temporarily unavailable. Please try again later.",
        done: true,
        error: streamResult.error
      });
    }

    // ======== 기록 저장 (로그인 사용자만) ========
    const session = await getServerSession(authOptions);
    if (session?.user?.id || context.userId) {
      try {
        const userId = session?.user?.id || context.userId;
        const symbolsStr = symbols.slice(0, 5).join(', ');
        await prisma.reading.create({
          data: {
            userId: userId!,
            type: 'dream',
            title: symbolsStr ? `꿈 해석: ${symbolsStr}` : '꿈 해석',
            content: JSON.stringify({
              dreamText: dreamText.slice(0, 500),
              symbols,
              emotions,
              themes,
              context: contextArray,
              koreanTypes,
              koreanLucky,
            }),
          },
        });
      } catch (saveErr) {
        logger.warn('[Dream API] Failed to save reading:', saveErr);
      }
    }

    // Proxy the SSE stream from backend to client
    return createSSEStreamProxy({
      source: streamResult.response,
      route: "DreamStream",
    });

  } catch (err: unknown) {
    logger.error("Dream stream error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
