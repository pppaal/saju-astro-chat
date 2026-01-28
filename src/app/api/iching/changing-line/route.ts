// src/app/api/iching/changing-line/route.ts
// 변효 해석 API - 백엔드에서 변효 데이터를 가져옴

import { NextRequest, NextResponse } from "next/server";
import { initializeApiContext, createSimpleGuard } from "@/lib/api/middleware";
import { apiClient } from "@/lib/api/ApiClient";
import { logger } from '@/lib/logger';
import { HTTP_STATUS } from '@/lib/constants/http';

interface ChangingLineRequest {
  hexagramNumber: number;
  lineIndex: number; // 0-5 (초효-상효)
  locale?: "ko" | "en";
}

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: public token auth + rate limiting (no credits for iching changing line)
    const guardOptions = createSimpleGuard({
      route: "iching-changing-line",
      limit: 60,
      windowSeconds: 60,
      // No credits needed for I Ching changing line
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) {return error;}

    const body: ChangingLineRequest = await req.json();
    const { hexagramNumber, lineIndex, locale = "ko" } = body;

    if (!hexagramNumber || lineIndex === undefined || lineIndex < 0 || lineIndex > 5) {
      return NextResponse.json(
        { error: "Valid hexagramNumber and lineIndex (0-5) required" },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Call backend to get changing line interpretation
    const response = await apiClient.post('/iching/changing-line', {
      hexagramNumber,
      lineIndex: lineIndex + 1, // Backend uses 1-6
      locale
    }, { timeout: 10000 });

    if (!response.ok) {
      logger.error("[ChangingLine] Backend error:", { status: response.status, error: response.error });
      return NextResponse.json(
        { error: "Backend error", detail: response.error },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(response.data);

  } catch (err: unknown) {
    logger.error("Changing line API error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
