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
import { HTTP_STATUS } from '@/lib/constants/http';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro-electional:${ip}`, { limit: 20, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers });
    }
    const tokenCheck = requirePublicToken(request); if (!tokenCheck.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED, headers: limit.headers });
    }

    const body = await request.json();
    const { date, time, latitude, longitude, timeZone, eventType, basicOnly } = body ?? {};

    // basicOnly 모드: eventType 없이 기본 Moon Phase/VOC 정보만 반환
    if (!date || !time || latitude === undefined || longitude === undefined || !timeZone) {
      return NextResponse.json(
        { error: "date, time, latitude, longitude, and timeZone are required." },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      );
    }

    // 유효한 이벤트 타입 확인 (basicOnly가 아닌 경우에만)
    const validEventTypes: ElectionalEventType[] = [
      "business_start", "signing_contracts", "marriage", "engagement", "first_date",
      "surgery", "dental", "start_treatment", "long_journey", "moving_house",
      "investment", "buying_property", "major_purchase", "creative_start",
      "publishing", "starting_studies", "exam", "lawsuit", "court_appearance"
    ];

    if (!basicOnly && !eventType) {
      return NextResponse.json(
        { error: "eventType is required (or set basicOnly: true for basic moon/VOC info)" },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      );
    }

    if (eventType && !validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Valid types: ${validEventTypes.join(", ")}` },
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

    // basicOnly 모드: 기본 Moon Phase/VOC/역행 정보만 반환
    if (basicOnly) {
      // analyzeElection을 general 목적으로 호출하여 기본 정보 추출
      const basicAnalysis = analyzeElection(chart, "business_start" as ElectionalEventType, dateTime);

      const res = NextResponse.json(
        {
          moonPhase: basicAnalysis.moonPhase,
          moonPhaseName: getMoonPhaseName(basicAnalysis.moonPhase),
          moonSign: basicAnalysis.moonSign,
          voidOfCourse: basicAnalysis.voidOfCourse,
          retrogradePlanets: basicAnalysis.retrogradePlanets,
          dateTime: dateTime.toISOString(),
          basicOnly: true,
        },
        { status: HTTP_STATUS.OK }
      );

      limit.headers.forEach((value, key) => res.headers.set(key, value));
      res.headers.set("Cache-Control", "no-store");
      return res;
    }

    // 택일 분석 (full mode)
    const analysis = analyzeElection(chart, eventType as ElectionalEventType, dateTime);

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
      { status: HTTP_STATUS.OK }
    );

    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    captureServerError(error, { route: "/api/astrology/advanced/electional" });
    return NextResponse.json(
      { error: message },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
