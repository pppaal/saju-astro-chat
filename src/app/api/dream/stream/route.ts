// src/app/api/dream/stream/route.ts
// Streaming Dream Interpretation API - Real-time SSE for fast display

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";

const BACKEND_URL = process.env.BACKEND_AI_URL || "http://localhost:5000";

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

    const body: StreamDreamRequest = await req.json();
    const {
      dreamText,
      symbols = [],
      emotions = [],
      themes = [],
      context = [],
      locale = "ko",
      koreanTypes = [],
      koreanLucky = [],
      chinese = [],
      islamicTypes = [],
      western = [],
      hindu = [],
      japanese = [],
      birth,
      sajuInfluence
    } = body;

    if (!dreamText || dreamText.trim().length < 5) {
      return NextResponse.json(
        { error: "Dream description required (min 5 characters)" },
        { status: 400, headers: limit.headers }
      );
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
