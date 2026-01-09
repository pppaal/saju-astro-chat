// src/app/api/astrology/advanced/asteroids/route.ts
// 4대 소행성 (Ceres, Pallas, Juno, Vesta) API 엔드포인트

import { NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import {
  calculateNatalChart,
  toChart,
  calculateAllAsteroids,
  interpretAsteroid,
  findAllAsteroidAspects,
  getAsteroidInfo,
} from "@/lib/astrology";

dayjs.extend(utc);
dayjs.extend(timezone);

const swisseph = require("swisseph");

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro-asteroids:${ip}`, { limit: 20, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: 429, headers: limit.headers });
    }
    const tokenCheck = requirePublicToken(request); if (!tokenCheck.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body = await request.json();
    const { date, time, latitude, longitude, timeZone, includeAspects = true } = body ?? {};

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

    const chart = toChart(chartData);

    // Julian Day 계산
    const pad = (v: number) => String(v).padStart(2, "0");
    const local = dayjs.tz(
      `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`,
      timeZone
    );
    const utcDate = local.utc().toDate();

    const jdResult = swisseph.swe_utc_to_jd(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth() + 1,
      utcDate.getUTCDate(),
      utcDate.getUTCHours(),
      utcDate.getUTCMinutes(),
      utcDate.getUTCSeconds(),
      swisseph.SE_GREG_CAL
    );

    if ("error" in jdResult) {
      return NextResponse.json(
        { error: "Failed to calculate Julian Day." },
        { status: 500, headers: limit.headers }
      );
    }

    const jdUT = jdResult.julianDayUT;
    const houseCusps = chart.houses.map(h => h.cusp);

    // 소행성 계산
    const asteroids = calculateAllAsteroids(jdUT, houseCusps);

    // 해석 생성
    const interpretations = {
      Ceres: interpretAsteroid(asteroids.Ceres),
      Pallas: interpretAsteroid(asteroids.Pallas),
      Juno: interpretAsteroid(asteroids.Juno),
      Vesta: interpretAsteroid(asteroids.Vesta),
    };

    // 기본 정보
    const asteroidInfo = {
      Ceres: getAsteroidInfo("Ceres"),
      Pallas: getAsteroidInfo("Pallas"),
      Juno: getAsteroidInfo("Juno"),
      Vesta: getAsteroidInfo("Vesta"),
    };

    // 애스펙트 (선택적)
    let aspects = null;
    if (includeAspects) {
      aspects = findAllAsteroidAspects(asteroids, chart.planets);
    }

    const res = NextResponse.json(
      {
        asteroids: {
          Ceres: {
            ...asteroids.Ceres,
            info: asteroidInfo.Ceres,
            interpretation: interpretations.Ceres,
          },
          Pallas: {
            ...asteroids.Pallas,
            info: asteroidInfo.Pallas,
            interpretation: interpretations.Pallas,
          },
          Juno: {
            ...asteroids.Juno,
            info: asteroidInfo.Juno,
            interpretation: interpretations.Juno,
          },
          Vesta: {
            ...asteroids.Vesta,
            info: asteroidInfo.Vesta,
            interpretation: interpretations.Vesta,
          },
        },
        aspects,
      },
      { status: 200 }
    );

    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    captureServerError(error, { route: "/api/astrology/advanced/asteroids" });
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
