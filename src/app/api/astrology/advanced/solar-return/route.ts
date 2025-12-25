// src/app/api/astrology/advanced/solar-return/route.ts
// Solar Return (태양 회귀) API 엔드포인트

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import {
  calculateSolarReturn,
  getSolarReturnSummary,
} from "@/lib/astrology";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro-solar-return:${ip}`, { limit: 20, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: 429, headers: limit.headers });
    }
    if (!requirePublicToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body = await request.json();
    const { date, time, latitude, longitude, timeZone, year } = body ?? {};

    if (!date || !time || latitude === undefined || longitude === undefined || !timeZone) {
      return NextResponse.json(
        { error: "date, time, latitude, longitude, and timeZone are required." },
        { status: 400, headers: limit.headers }
      );
    }

    const [birthYear, birthMonth, birthDay] = String(date).split("-").map(Number);
    const [hour, minute] = String(time).split(":").map(Number);

    if (!birthYear || !birthMonth || !birthDay || hour === undefined || minute === undefined) {
      return NextResponse.json(
        { error: "Invalid date or time format." },
        { status: 400, headers: limit.headers }
      );
    }

    // 계산할 연도 (기본값: 현재 연도)
    const targetYear = year ?? new Date().getFullYear();

    const chart = await calculateSolarReturn({
      natal: {
        year: birthYear,
        month: birthMonth,
        date: birthDay,
        hour,
        minute,
        latitude,
        longitude,
        timeZone: String(timeZone),
      },
      year: targetYear,
    });

    const summary = getSolarReturnSummary(chart);

    const res = NextResponse.json(
      {
        chart,
        summary,
        year: targetYear,
      },
      { status: 200 }
    );

    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    captureServerError(error, { route: "/api/astrology/advanced/solar-return" });
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
