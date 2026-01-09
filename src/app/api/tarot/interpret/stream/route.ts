// src/app/api/tarot/interpret/stream/route.ts
// Streaming Tarot Interpretation API - Real-time SSE for first interpretation

import { NextResponse } from "next/server";
import { getBackendUrl as pickBackendUrl } from "@/lib/backend-url";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { enforceBodySize } from "@/lib/http";
import { checkAndConsumeCredits, creditErrorResponse } from "@/lib/credits/withCredits";

interface CardInput {
  name: string;
  isReversed: boolean;
  position: string;
}

interface StreamInterpretRequest {
  categoryId: string;
  spreadId: string;
  spreadTitle: string;
  cards: CardInput[];
  userQuestion?: string;
  language?: "ko" | "en";
  counselorId?: string;
  counselorStyle?: string;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`tarot-interpret-stream:${ip}`, { limit: 10, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429, headers: limit.headers }
      );
    }

    const tokenCheck = requirePublicToken(req); if (!tokenCheck.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const oversized = enforceBodySize(req, 256 * 1024, limit.headers);
    if (oversized) return oversized;

    const body: StreamInterpretRequest = await req.json();
    const { categoryId, spreadId, spreadTitle, cards, userQuestion, language = "ko", counselorId, counselorStyle } = body;

    if (!categoryId || !spreadId || !cards || cards.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: categoryId, spreadId, cards" },
        { status: 400, headers: limit.headers }
      );
    }

    const creditResult = await checkAndConsumeCredits("reading", 1);
    if (!creditResult.allowed) {
      const res = creditErrorResponse(creditResult);
      limit.headers.forEach((value, key) => res.headers.set(key, value));
      return res;
    }

    // Call backend chat-stream endpoint (tarot interpret-stream is not exposed)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    const latestQuestion = userQuestion || "general reading";

    const backendResponse = await fetch(`${pickBackendUrl()}/api/tarot/chat-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: latestQuestion }],
        context: {
          category: categoryId,
          spread_title: spreadTitle,
          cards: cards.map(c => ({
            name: c.name,
            is_reversed: c.isReversed,
            position: c.position
          })),
          overall_message: "",
          guidance: ""
        },
        language,
        counselor_id: counselorId,
        counselor_style: counselorStyle
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("[TarotInterpretStream] Backend error:", backendResponse.status, errorText);
      return NextResponse.json(
        { error: "Backend error", detail: errorText },
        { status: backendResponse.status, headers: limit.headers }
      );
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
          console.error("[TarotInterpretStream] Stream error:", error);
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
    console.error("Tarot interpret stream error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
