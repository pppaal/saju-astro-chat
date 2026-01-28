// src/app/api/astrology/advanced/harmonics/route.ts
// 하모닉 분석 API 엔드포인트

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import {
  calculateNatalChart,
  toChart,
  calculateHarmonicChart,
  analyzeHarmonic,
  generateHarmonicProfile,
  getHarmonicMeaning,
} from "@/lib/astrology";
import { HTTP_STATUS } from '@/lib/constants/http';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro-harmonics:${ip}`, { limit: 20, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers });
    }
    const tokenCheck = requirePublicToken(request); if (!tokenCheck.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: HTTP_STATUS.UNAUTHORIZED, headers: limit.headers });
    }

    const body = await request.json();
    const { date, time, latitude, longitude, timeZone, harmonic, currentAge, fullProfile = false } = body ?? {};

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

    // 하모닉 숫자 검증
    const harmonicNum = Number(harmonic);
    if (harmonic && (!Number.isInteger(harmonicNum) || harmonicNum < 1 || harmonicNum > 144)) {
      return NextResponse.json(
        { error: "Harmonic must be an integer between 1 and 144." },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
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

    const response: Record<string, unknown> = {};

    // 특정 하모닉 분석
    if (harmonicNum) {
      const harmonicChart = calculateHarmonicChart(natalChart, harmonicNum);
      const analysis = analyzeHarmonic(natalChart, harmonicNum);
      const meaning = getHarmonicMeaning(harmonicNum);

      response.harmonicChart = {
        harmonicNumber: harmonicNum,
        planets: harmonicChart.planets,
        ascendant: harmonicChart.ascendant,
        mc: harmonicChart.mc,
      };
      response.analysis = {
        strength: analysis.strength,
        conjunctions: analysis.conjunctions,
        patterns: analysis.patterns,
        interpretation: analysis.interpretation,
      };
      response.meaning = meaning;
    }

    // 전체 프로필 (선택적)
    if (fullProfile || currentAge) {
      const profile = generateHarmonicProfile(natalChart, currentAge);
      response.profile = {
        strongestHarmonics: profile.strongestHarmonics,
        weakestHarmonics: profile.weakestHarmonics,
        overallInterpretation: profile.overallInterpretation,
      };

      if (currentAge && profile.ageHarmonic) {
        response.ageHarmonic = {
          age: currentAge,
          strength: profile.ageHarmonic.strength,
          conjunctions: profile.ageHarmonic.conjunctions,
          patterns: profile.ageHarmonic.patterns,
          interpretation: profile.ageHarmonic.interpretation,
        };
      }
    }

    const res = NextResponse.json(response, { status: HTTP_STATUS.OK });

    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    captureServerError(error, { route: "/api/astrology/advanced/harmonics" });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
