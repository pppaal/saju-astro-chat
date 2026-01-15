// src/app/api/iching/changing-line/route.ts
// 변효 해석 API - 백엔드에서 변효 데이터를 가져옴

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { getBackendUrl } from "@/lib/backend-url";
import { logger } from '@/lib/logger';

const BACKEND_URL = getBackendUrl();

interface ChangingLineRequest {
  hexagramNumber: number;
  lineIndex: number; // 0-5 (초효-상효)
  locale?: "ko" | "en";
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`iching-changing:${ip}`, { limit: 60, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: limit.headers }
      );
    }

    const tokenCheck = requirePublicToken(req); if (!tokenCheck.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body: ChangingLineRequest = await req.json();
    const { hexagramNumber, lineIndex, locale = "ko" } = body;

    if (!hexagramNumber || lineIndex === undefined || lineIndex < 0 || lineIndex > 5) {
      return NextResponse.json(
        { error: "Valid hexagramNumber and lineIndex (0-5) required" },
        { status: 400, headers: limit.headers }
      );
    }

    // Call backend to get changing line interpretation
    const backendResponse = await fetch(`${BACKEND_URL}/iching/changing-line`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
      },
      body: JSON.stringify({
        hexagramNumber,
        lineIndex: lineIndex + 1, // Backend uses 1-6
        locale
      })
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      logger.error("[ChangingLine] Backend error:", { status: backendResponse.status, errorText });
      return NextResponse.json(
        { error: "Backend error", detail: errorText },
        { status: backendResponse.status, headers: limit.headers }
      );
    }

    const data = await backendResponse.json();
    return NextResponse.json(data, { headers: limit.headers });

  } catch (err: unknown) {
    logger.error("Changing line API error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
