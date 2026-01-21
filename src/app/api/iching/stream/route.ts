// src/app/api/iching/stream/route.ts
// Streaming I Ching Interpretation API - Real-time SSE for fast display

import { NextRequest, NextResponse } from "next/server";
import { initializeApiContext, createPublicStreamGuard } from "@/lib/api/middleware";
import { createSSEStreamProxy, isSSEResponse } from "@/lib/streaming";
import { getBackendUrl } from "@/lib/backend-url";
import { logger } from '@/lib/logger';
import {
  generateWisdomPrompt,
  getHexagramWisdom,
  type WisdomPromptContext
} from '@/lib/iChing/ichingWisdom';
import {
  calculateNuclearHexagram,
  calculateRelatedHexagrams
} from '@/lib/iChing/iChingPremiumData';

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

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: rate limiting + public token auth
    const guardOptions = createPublicStreamGuard({
      route: "iching-stream",
      limit: 30,
      windowSeconds: 60,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) return error;

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
      locale = context.locale as "ko" | "en",
      themes = {}
    } = body;

    if (!hexagramNumber || !hexagramName) {
      return NextResponse.json(
        { error: "Hexagram data required" },
        { status: 400 }
      );
    }

    // Generate advanced wisdom context using ichingWisdom library
    const changingLineIndices = changingLines.map((cl: ChangingLine) => cl.index + 1);
    const wisdomContext: WisdomPromptContext = {
      hexagramNumber,
      changingLines: changingLineIndices,
      targetHexagram: resultingHexagram?.number,
      userQuestion: question,
      consultationType: 'general'
    };
    const wisdomPrompt = generateWisdomPrompt(wisdomContext);
    const hexagramWisdom = getHexagramWisdom(hexagramNumber);

    // Calculate nuclear and related hexagrams for deeper insight
    const nuclearHexagram = calculateNuclearHexagram(hexagramNumber);
    const relatedHexagrams = calculateRelatedHexagrams(hexagramNumber);

    // Call backend streaming endpoint with enriched data
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
        themes,
        // Enhanced data from advanced iChing library
        wisdomPrompt,
        hexagramWisdom: hexagramWisdom ? {
          keyword: hexagramWisdom.keyword,
          coreWisdom: hexagramWisdom.coreWisdom,
          situationAdvice: hexagramWisdom.situationAdvice,
          warnings: hexagramWisdom.warnings,
          opportunities: hexagramWisdom.opportunities
        } : null,
        nuclearHexagram,
        relatedHexagrams
      })
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      logger.error("[IChingStream] Backend error:", { status: backendResponse.status, errorText });
      return NextResponse.json(
        { error: "Backend error", detail: errorText },
        { status: backendResponse.status }
      );
    }

    // Check if response is SSE
    if (!isSSEResponse(backendResponse)) {
      // Fallback to regular JSON response
      const data = await backendResponse.json();
      return NextResponse.json(data);
    }

    // Proxy the SSE stream from backend to client
    return createSSEStreamProxy({
      source: backendResponse,
      route: "IChingStream",
    });

  } catch (err: unknown) {
    logger.error("I Ching stream error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
