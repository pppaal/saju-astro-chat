// src/app/api/astrology/advanced/midpoints/route.ts
// 미드포인트 (Midpoints) 분석 API 엔드포인트

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import {
  calculateNatalChart,
  toChart,
  calculateMidpoints,
  findMidpointActivations,
} from "@/lib/astrology";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro-midpoints:${ip}`, { limit: 20, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: 429, headers: limit.headers });
    }
    const tokenCheck = requirePublicToken(request); if (!tokenCheck.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body = await request.json();
    const { date, time, latitude, longitude, timeZone, orb = 1.5 } = body ?? {};

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

    // 미드포인트 계산
    const midpoints = calculateMidpoints(natalChart);

    // 미드포인트 활성화 찾기
    const activations = findMidpointActivations(natalChart, orb);

    const response = {
      midpoints: midpoints.map(mp => ({
        id: mp.id,
        planet1: mp.planet1,
        planet2: mp.planet2,
        longitude: mp.longitude,
        sign: mp.sign,
        degree: mp.degree,
        minute: mp.minute,
        formatted: mp.formatted,
        nameKo: mp.name_ko,
        keywords: mp.keywords,
      })),
      activations: activations.map(a => ({
        midpointId: a.midpoint.id,
        midpointNameKo: a.midpoint.name_ko,
        activator: a.activator,
        aspectType: a.aspectType,
        orb: a.orb,
        description: a.description,
      })),
      totalMidpoints: midpoints.length,
      totalActivations: activations.length,
    };

    const res = NextResponse.json(response, { status: 200 });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    captureServerError(error, { route: "/api/astrology/advanced/midpoints" });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
