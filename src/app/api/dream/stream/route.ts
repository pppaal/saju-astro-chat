// src/app/api/dream/stream/route.ts
// Streaming Dream Interpretation API - Real-time SSE for fast display

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { enforceBodySize } from "@/lib/http";
import { checkAndConsumeCredits, creditErrorResponse } from "@/lib/credits/withCredits";
import { cleanStringArray, isRecord } from "@/lib/api";
import { getBackendUrl } from "@/lib/backend-url";

const BACKEND_URL = getBackendUrl();

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
const MAX_LIST_ITEMS = 20;
const MAX_LIST_ITEM_LEN = 120;
const STREAM_LOCALES = new Set(["ko", "en"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const MAX_TIMEZONE_LEN = 64;

// cleanStringArray and isRecord imported from @/lib/api

function sanitizeBirth(raw: unknown) {
  if (!isRecord(raw)) return undefined;
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

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`dream-stream:${ip}`, { limit: 10, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429, headers: limit.headers }
      );
    }

    if (!requirePublicToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const oversized = enforceBodySize(req, MAX_STREAM_BODY, limit.headers);
    if (oversized) return oversized;

    const body = (await req.json().catch(() => null)) as Partial<StreamDreamRequest> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "invalid_body" },
        { status: 400, headers: limit.headers }
      );
    }

    const dreamTextRaw = typeof body.dreamText === "string" ? body.dreamText.trim() : "";
    const dreamText = dreamTextRaw.slice(0, MAX_TEXT_LEN);
    const symbols = cleanStringArray(body.symbols);
    const emotions = cleanStringArray(body.emotions);
    const themes = cleanStringArray(body.themes);
    const context = cleanStringArray(body.context);
    const locale = typeof body.locale === "string" && STREAM_LOCALES.has(body.locale)
      ? body.locale
      : "ko";
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
        { status: 400, headers: limit.headers }
      );
    }

    // Check credits and consume (required for dream interpretation)
    const creditResult = await checkAndConsumeCredits("reading", 1);
    if (!creditResult.allowed) {
      const res = creditErrorResponse(creditResult);
      limit.headers.forEach((value, key) => res.headers.set(key, value));
      return res;
    }

    // Call backend streaming endpoint
    const backendResponse = await fetch(`${BACKEND_URL}/api/dream/interpret-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
      },
      body: JSON.stringify({
        dream: dreamText,
        symbols,
        emotions,
        themes,
        context,
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
      })
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("[DreamStream] Backend error:", backendResponse.status, errorText);
      return NextResponse.json(
        { error: "Backend error", detail: errorText },
        { status: backendResponse.status, headers: limit.headers }
      );
    }

    // ======== 기록 저장 (로그인 사용자만) ========
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      try {
        const symbolsStr = symbols.slice(0, 5).join(', ');
        await prisma.reading.create({
          data: {
            userId: session.user.id,
            type: 'dream',
            title: symbolsStr ? `꿈 해석: ${symbolsStr}` : '꿈 해석',
            content: JSON.stringify({
              dreamText: dreamText.slice(0, 500),
              symbols,
              emotions,
              themes,
              context,
              koreanTypes,
              koreanLucky,
            }),
          },
        });
      } catch (saveErr) {
        console.warn('[Dream API] Failed to save reading:', saveErr);
      }
    }

    // Check if response is SSE
    const contentType = backendResponse.headers.get("content-type");
    if (!contentType?.includes("text/event-stream")) {
      // Fallback to regular JSON response
      const data = await backendResponse.json();
      return NextResponse.json(data, { headers: limit.headers });
    }

    // Stream the SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = backendResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Pass through the SSE data
            const text = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(text));
          }
        } catch (error) {
          console.error("[DreamStream] Stream error:", error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        ...Object.fromEntries(limit.headers.entries())
      }
    });

  } catch (err: unknown) {
    console.error("Dream stream error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
