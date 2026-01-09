// src/app/api/astrology/advanced/eclipses/route.ts
// 이클립스 (Eclipse) 영향 분석 API 엔드포인트

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import {
  calculateNatalChart,
  toChart,
  findEclipseImpact,
  getUpcomingEclipses,
  checkEclipseSensitivity,
} from "@/lib/astrology";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro-eclipses:${ip}`, { limit: 20, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: 429, headers: limit.headers });
    }
    const tokenCheck = requirePublicToken(request); if (!tokenCheck.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body = await request.json();
    const { date, time, latitude, longitude, timeZone, orb = 3.0 } = body ?? {};

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

    // 이클립스 영향 찾기
    const impacts = findEclipseImpact(natalChart, undefined, orb);

    // 다가오는 이클립스 (4개)
    const upcoming = getUpcomingEclipses(4);

    // 이클립스 민감도 체크
    const sensitivity = checkEclipseSensitivity(natalChart);

    const response = {
      impacts: impacts.map(i => ({
        eclipseDate: i.eclipse.date,
        eclipseType: i.eclipse.type,
        eclipseSign: i.eclipse.sign,
        eclipseDegree: i.eclipse.degree,
        eclipseDescription: i.eclipse.description,
        affectedPoint: i.affectedPoint,
        aspectType: i.aspectType,
        orb: i.orb,
        house: i.house,
        interpretation: i.interpretation,
      })),
      upcoming: upcoming.map(e => ({
        date: e.date,
        type: e.type,
        sign: e.sign,
        degree: e.degree,
        description: e.description,
      })),
      sensitivity: {
        isSensitive: sensitivity.sensitive,
        sensitivePoints: sensitivity.sensitivePoints,
        nodeSign: sensitivity.nodeSign,
      },
      totalImpacts: impacts.length,
    };

    const res = NextResponse.json(response, { status: 200 });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    captureServerError(error, { route: "/api/astrology/advanced/eclipses" });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
