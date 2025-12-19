// src/app/api/tarot/chat/stream/route.ts
// Streaming Tarot Chat API - Real-time SSE proxy to backend

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";

function pickBackendUrl() {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.BACKEND_AI_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    "http://localhost:5000";
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[tarot chat-stream] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn("[tarot chat-stream] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
  return url;
}

interface CardContext {
  position: string;
  name: string;
  isReversed?: boolean;
  is_reversed?: boolean;
  meaning: string;
  keywords?: string[];
}

interface TarotContext {
  spread_title: string;
  category: string;
  cards: CardContext[];
  overall_message: string;
  guidance: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface StreamRequest {
  messages: ChatMessage[];
  context: TarotContext;
  language?: "ko" | "en";
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`tarot-chat-stream:${ip}`, { limit: 30, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429, headers: limit.headers }
      );
    }

    if (!requirePublicToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body: StreamRequest = await req.json();
    const { messages, context, language = "ko" } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing messages" },
        { status: 400, headers: limit.headers }
      );
    }

    // Call backend streaming endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const backendResponse = await fetch(`${pickBackendUrl()}/api/tarot/chat-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
      },
      body: JSON.stringify({
        messages,
        context: {
          spread_title: context.spread_title,
          category: context.category,
          cards: context.cards.map(c => ({
            position: c.position,
            name: c.name,
            is_reversed: c.is_reversed ?? c.isReversed ?? false,
            meaning: c.meaning,
            keywords: c.keywords || []
          })),
          overall_message: context.overall_message,
          guidance: context.guidance
        },
        language
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("[TarotChatStream] Backend error:", backendResponse.status, errorText);
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
          console.error("[TarotChatStream] Stream error:", error);
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
    console.error("Tarot chat stream error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
