// src/app/api/astrology/advanced/electional/route.ts
// 택일 점성학 API 엔드포인트

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import {
  calculateNatalChart,
  toChart,
  analyzeElection,
  getMoonPhaseName,
  getElectionalGuidelines,
  type ElectionalEventType,
} from "@/lib/astrology";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro-electional:${ip}`, { limit: 20, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: 429, headers: limit.headers });
    }
    if (!requirePublicToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body = await request.json();
    const { date, time, latitude, longitude, timeZone, eventType } = body ?? {};

    if (!date || !time || latitude === undefined || longitude === undefined || !timeZone || !eventType) {
      return NextResponse.json(
        { error: "date, time, latitude, longitude, timeZone, and eventType are required." },
        { status: 400, headers: limit.headers }
      );
    }

    // 유효한 이벤트 타입 확인
    const validEventTypes: ElectionalEventType[] = [
      "business_start", "signing_contracts", "marriage", "engagement", "first_date",
      "surgery", "dental", "start_treatment", "long_journey", "moving_house",
      "investment", "buying_property", "major_purchase", "creative_start",
      "publishing", "starting_studies", "exam", "lawsuit", "court_appearance"
    ];

    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Valid types: ${validEventTypes.join(", ")}` },
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

    // 차트 계산
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

    const chart = toChart(chartData);
    const dateTime = new Date(year, month - 1, day, hour, minute);

    // 택일 분석
    const analysis = analyzeElection(chart, eventType as ElectionalEventType, dateTime);

    // 추가 정보

    // 이벤트 가이드라인
    const guidelines = getElectionalGuidelines(eventType as ElectionalEventType);

    const res = NextResponse.json(
      {
        analysis: {
          score: analysis.score,
          moonPhase: analysis.moonPhase,
          moonPhaseName: getMoonPhaseName(analysis.moonPhase),
          moonSign: analysis.moonSign,
          voidOfCourse: analysis.voidOfCourse,
          retrogradePlanets: analysis.retrogradePlanets,
          beneficAspects: analysis.beneficAspects,
          maleficAspects: analysis.maleficAspects,
          recommendations: analysis.recommendations,
          warnings: analysis.warnings,
        },
        guidelines,
        eventType,
        dateTime: dateTime.toISOString(),
      },
      { status: 200 }
    );

    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    captureServerError(error, { route: "/api/astrology/advanced/electional" });
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
