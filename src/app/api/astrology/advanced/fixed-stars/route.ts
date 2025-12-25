// src/app/api/astrology/advanced/fixed-stars/route.ts
// 항성 (Fixed Stars) 분석 API 엔드포인트

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import {
  calculateNatalChart,
  toChart,
  findFixedStarConjunctions,
  getAllFixedStars,
} from "@/lib/astrology";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro-fixed-stars:${ip}`, { limit: 20, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: 429, headers: limit.headers });
    }
    if (!requirePublicToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body = await request.json();
    const { date, time, latitude, longitude, timeZone, orb = 1.0 } = body ?? {};

    if (!date || !time || latitude === undefined || longitude === undefined || !timeZone) {
      return NextResponse.json(
        { error: "date, time, latitude, longitude, and timeZone are required." },
        { status: 400, headers: limit.headers }
      );
    }

    const [year, month, day] = String(date).split("-").map(Number);
    const [hour, minute] = String(time).split(":").map(Number);

    if (!year || !month || !day || hour === undefined || minute === undefined) {
      return NextResponse.json(
        { error: "Invalid date or time format." },
        { status: 400, headers: limit.headers }
      );
    }

    // 출생 차트 계산
    const chartData = await calculateNatalChart({
      year,
      month,
      date: day,
      hour,
      minute,
      latitude,
      longitude,
      timeZone: String(timeZone),
    });

    const natalChart = toChart(chartData);

    // 항성 합 찾기
    const conjunctions = findFixedStarConjunctions(natalChart, year, orb);

    // 주요 항성 목록 (등급 2.0 이하)
    const brightStars = getAllFixedStars().filter(s => s.magnitude <= 2.0);

    const response = {
      conjunctions: conjunctions.map(c => ({
        starName: c.star.name,
        starNameKo: c.star.name_ko,
        planet: c.planet,
        orb: c.orb,
        magnitude: c.star.magnitude,
        nature: c.star.nature,
        keywords: c.star.keywords,
        interpretation: c.star.interpretation,
        description: c.description,
      })),
      brightStarsCount: brightStars.length,
      totalConjunctions: conjunctions.length,
    };

    const res = NextResponse.json(response, { status: 200 });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    captureServerError(error, { route: "/api/astrology/advanced/fixed-stars" });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
