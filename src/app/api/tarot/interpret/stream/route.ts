// src/app/api/tarot/interpret/stream/route.ts
// Streaming Tarot Interpretation API - Real-time SSE for first interpretation

import { NextRequest, NextResponse } from "next/server";
import { initializeApiContext, createPublicStreamGuard } from "@/lib/api/middleware";
import { createSSEStreamProxy, createFallbackSSEStream } from "@/lib/streaming";
import { apiClient } from "@/lib/api/ApiClient";
import { logger } from '@/lib/logger';
import { HTTP_STATUS } from '@/lib/constants/http';

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

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: public token auth + rate limiting + credit consumption
    const guardOptions = createPublicStreamGuard({
      route: "tarot-interpret-stream",
      limit: 10,
      windowSeconds: 60,
      requireCredits: true,
      creditType: "reading",
      creditAmount: 1,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) {return error;}

    const body: StreamInterpretRequest = await req.json();
    const { categoryId, spreadId, spreadTitle, cards, userQuestion, language = "ko", counselorId, counselorStyle } = body;

    if (!categoryId || !spreadId || !cards || cards.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: categoryId, spreadId, cards" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Call backend chat-stream endpoint (tarot interpret-stream is not exposed)
    const latestQuestion = userQuestion || "general reading";

    const streamResult = await apiClient.postSSEStream("/api/tarot/chat-stream", {
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
    }, { timeout: 20000 });

    if (!streamResult.ok) {
      logger.error("[TarotInterpretStream] Backend error:", { status: streamResult.status, error: streamResult.error });
      return NextResponse.json(
        { error: "Backend error", detail: streamResult.error },
        { status: streamResult.status || 500 }
      );
    }

    // Relay the SSE stream
    return createSSEStreamProxy({ source: streamResult.response, route: "TarotInterpretStream" });

  } catch (err: unknown) {
    logger.error("Tarot interpret stream error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
