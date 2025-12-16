// src/app/api/astrology/advanced/rectification/route.ts
// 출생 시간 교정(Rectification) API 엔드포인트

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import {
  performRectification,
  estimateAscendantByAppearance,
  getAscendantAppearance,
  getSajuHourRange,
  generateRectificationGuide,
  type LifeEvent,
  type LifeEventType,
  type ZodiacKo,
} from "@/lib/astrology";

const VALID_EVENT_TYPES: LifeEventType[] = [
  "marriage", "divorce", "birth_of_child", "death_of_parent_mother",
  "death_of_parent_father", "career_change", "career_peak", "job_loss",
  "major_move", "accident", "surgery", "graduation",
  "major_relationship_start", "major_relationship_end",
  "financial_gain", "financial_loss", "spiritual_awakening", "health_crisis", "other"
];

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro-rectification:${ip}`, { limit: 10, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: 429, headers: limit.headers });
    }
    if (!requirePublicToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body = await request.json();
    const {
      birthDate,
      latitude,
      longitude,
      timeZone,
      events,
      approximateTimeRange,
      appearanceProfile,
      sajuSijin,
    } = body ?? {};

    if (!birthDate || latitude === undefined || longitude === undefined || !timeZone) {
      return NextResponse.json(
        { error: "birthDate, latitude, longitude, and timeZone are required." },
        { status: 400, headers: limit.headers }
      );
    }

    const [year, month, day] = String(birthDate).split("-").map(Number);
    if (!year || !month || !day) {
      return NextResponse.json(
        { error: "birthDate must be YYYY-MM-DD format." },
        { status: 400, headers: limit.headers }
      );
    }

    // 이벤트 파싱 및 검증
    const parsedEvents: LifeEvent[] = [];
    if (Array.isArray(events)) {
      for (const event of events) {
        if (!event.date || !event.type) {
          continue;
        }
        if (!VALID_EVENT_TYPES.includes(event.type)) {
          return NextResponse.json(
            { error: `Invalid event type: ${event.type}. Valid types: ${VALID_EVENT_TYPES.join(", ")}` },
            { status: 400, headers: limit.headers }
          );
        }
        parsedEvents.push({
          date: new Date(event.date),
          type: event.type as LifeEventType,
          description: event.description || "",
          importance: event.importance || "moderate",
        });
      }
    }

    if (parsedEvents.length === 0) {
      return NextResponse.json(
        { error: "At least one life event is required for rectification. Provide events array with date and type." },
        { status: 400, headers: limit.headers }
      );
    }

    // 시간 범위 설정
    let startHour = 0;
    let endHour = 23;
    let intervalMinutes = 30;

    if (approximateTimeRange) {
      startHour = approximateTimeRange.startHour ?? 0;
      endHour = approximateTimeRange.endHour ?? 23;
      intervalMinutes = approximateTimeRange.intervalMinutes ?? 30;
    }

    // 사주 시진으로 범위 좁히기
    if (sajuSijin) {
      const range = getSajuHourRange(sajuSijin);
      if (range) {
        startHour = range.start;
        endHour = range.end === 1 ? 1 : range.end; // 자시 처리
      }
    }

    // 외모/성격으로 ASC 추정
    let estimatedAscSigns: ZodiacKo[] | undefined;
    if (appearanceProfile) {
      estimatedAscSigns = estimateAscendantByAppearance(appearanceProfile);
    }

    // 교정 수행
    const result = await performRectification(
      {
        year,
        month,
        date: day,
        latitude,
        longitude,
        timeZone: String(timeZone),
      },
      parsedEvents,
      {
        startHour,
        endHour,
        intervalMinutes,
        estimatedAscSigns,
      }
    );

    // 가이드 생성
    const guide = generateRectificationGuide(
      !!(approximateTimeRange || sajuSijin),
      parsedEvents.length
    );

    const res = NextResponse.json(
      {
        result: {
          bestCandidate: result.bestCandidate ? {
            time: result.bestCandidate.time.toISOString(),
            ascendantSign: result.bestCandidate.ascendantSign,
            ascendantDegree: result.bestCandidate.ascendantDegree.toFixed(2),
            mcSign: result.bestCandidate.mcSign,
            mcDegree: result.bestCandidate.mcDegree.toFixed(2),
            confidence: result.bestCandidate.confidence,
            matchingEvents: result.bestCandidate.matchingEvents.length,
          } : null,
          confidenceLevel: result.confidenceLevel,
          candidates: result.candidates.slice(0, 5).map(c => ({
            time: c.time.toISOString(),
            ascendantSign: c.ascendantSign,
            confidence: c.confidence,
          })),
          methodology: result.methodology,
          recommendations: result.recommendations,
        },
        guide,
        estimatedAscSigns,
        inputSummary: {
          birthDate,
          eventsCount: parsedEvents.length,
          timeRange: { startHour, endHour, intervalMinutes },
        },
      },
      { status: 200 }
    );

    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: any) {
    captureServerError(error, { route: "/api/astrology/advanced/rectification" });
    return NextResponse.json(
      { error: error?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}

// GET: 가이드라인과 ASC 외모 정보
export async function GET(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro-rectification-get:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429, headers: limit.headers });
    }

    const { searchParams } = new URL(request.url);
    const sign = searchParams.get("sign") as ZodiacKo | null;

    const validSigns: ZodiacKo[] = [
      "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
    ];

    if (sign && validSigns.includes(sign)) {
      const appearance = getAscendantAppearance(sign);
      return NextResponse.json({ sign, appearance }, { status: 200 });
    }

    // 전체 ASC 외모 정보 반환
    const allAppearances = validSigns.reduce((acc, s) => {
      acc[s] = getAscendantAppearance(s);
      return acc;
    }, {} as Record<ZodiacKo, any>);

    const res = NextResponse.json(
      {
        validEventTypes: VALID_EVENT_TYPES,
        ascendantAppearances: allAppearances,
        sajuHours: [
          "자시", "축시", "인시", "묘시", "진시", "사시",
          "오시", "미시", "신시", "유시", "술시", "해시"
        ],
      },
      { status: 200 }
    );

    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;
  } catch (error: any) {
    captureServerError(error, { route: "/api/astrology/advanced/rectification GET" });
    return NextResponse.json(
      { error: error?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
