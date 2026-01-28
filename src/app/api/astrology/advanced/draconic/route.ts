// src/app/api/astrology/advanced/draconic/route.ts
// 드라코닉 차트 API 엔드포인트

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import {
  calculateNatalChart,
  toChart,
  calculateDraconicChart,
  compareDraconicToNatal,
  getDraconicPlanetMeaning,
} from "@/lib/astrology";
import { HTTP_STATUS } from '@/lib/constants/http';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro-draconic:${ip}`, { limit: 20, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers });
    }
    const tokenCheck = requirePublicToken(request); if (!tokenCheck.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED, headers: limit.headers });
    }

    const body = await request.json();
    const { date, time, latitude, longitude, timeZone, compareToNatal = true } = body ?? {};

    if (!date || !time || latitude === undefined || longitude === undefined || !timeZone) {
      return NextResponse.json(
        { error: "date, time, latitude, longitude, and timeZone are required." },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      );
    }

    const [year, month, day] = String(date).split("-").map(Number);
    const [hour, minute] = String(time).split(":").map(Number);

    if (!year || !month || !day || hour === undefined || minute === undefined) {
      return NextResponse.json(
        { error: "Invalid date or time format." },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      );
    }

    // 출생 차트 계산
    const natalData = await calculateNatalChart({
      year,
      month,
      date: day,
      hour,
      minute,
      latitude,
      longitude,
      timeZone: String(timeZone),
    });

    const natalChart = toChart(natalData);

    // 드라코닉 차트 계산
    const draconicChart = calculateDraconicChart(natalChart);

    // 드라코닉-출생 비교 (선택적)
    let comparison = null;
    if (compareToNatal) {
      comparison = compareDraconicToNatal(natalChart);
    }

    // 행성별 해석
    const planetMeanings = draconicChart.planets.map(planet => ({
      planet: planet.name,
      sign: planet.sign,
      formatted: planet.formatted,
      meaning: getDraconicPlanetMeaning(planet.name, planet.sign),
    }));

    const res = NextResponse.json(
      {
        draconicChart: {
          planets: draconicChart.planets,
          ascendant: draconicChart.ascendant,
          mc: draconicChart.mc,
          houses: draconicChart.houses,
          natalNorthNode: draconicChart.natalNorthNode,
        },
        planetMeanings,
        comparison: comparison ? {
          alignments: comparison.alignments,
          tensions: comparison.tensions,
          summary: comparison.summary,
        } : null,
      },
      { status: HTTP_STATUS.OK }
    );

    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    captureServerError(error, { route: "/api/astrology/advanced/draconic" });
    return NextResponse.json(
      { error: message },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
