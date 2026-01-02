// src/app/api/iching/stream/route.ts
// Streaming I Ching Interpretation API - Real-time SSE for fast display

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { getBackendUrl } from "@/lib/backend-url";

const BACKEND_URL = getBackendUrl();

interface ChangingLine {
  index: number;
  text: string;
}

interface StreamIChingRequest {
  hexagramNumber: number;
  hexagramName: string;
  hexagramSymbol: string;
  judgment: string;
  image: string;
  coreMeaning?: string;
  changingLines?: ChangingLine[];
  resultingHexagram?: {
    number: number;
    name: string;
    symbol: string;
    judgment?: string;
  };
  question?: string;
  locale?: "ko" | "en";
  themes?: {
    career?: string;
    love?: string;
    health?: string;
    wealth?: string;
    timing?: string;
  };
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`iching-stream:${ip}`, { limit: 30, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429, headers: limit.headers }
      );
    }

    if (!requirePublicToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body: StreamIChingRequest = await req.json();
    const {
      hexagramNumber,
      hexagramName,
      hexagramSymbol,
      judgment,
      image,
      coreMeaning = "",
      changingLines = [],
      resultingHexagram,
      question = "",
      locale = "ko",
      themes = {}
    } = body;

    if (!hexagramNumber || !hexagramName) {
      return NextResponse.json(
        { error: "Hexagram data required" },
        { status: 400, headers: limit.headers }
      );
    }

    // Call backend streaming endpoint
    const backendResponse = await fetch(`${BACKEND_URL}/iching/reading-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
      },
      body: JSON.stringify({
        hexagramNumber,
        hexagramName,
        hexagramSymbol,
        judgment,
        image,
        coreMeaning,
        changingLines,
        resultingHexagram,
        question,
        locale,
        themes
      })
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("[IChingStream] Backend error:", backendResponse.status, errorText);
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
          console.error("[IChingStream] Stream error:", error);
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
    console.error("I Ching stream error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
