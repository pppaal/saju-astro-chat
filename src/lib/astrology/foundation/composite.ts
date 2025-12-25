// src/lib/astrology/foundation/composite.ts
// 합성 차트 (Composite Chart) 계산
// 두 사람의 차트를 합성하여 관계 자체의 에너지를 나타내는 차트

import { Chart, PlanetBase, House, ZodiacKo } from "./types";
import { formatLongitude, normalize360 } from "./utils";

export interface CompositeInput {
  chartA: Chart;
  chartB: Chart;
}

export interface CompositeChart extends Chart {
  compositeType: "midpoint";
  sourceCharts: {
    chartA: { ascendant: number; mc: number };
    chartB: { ascendant: number; mc: number };
  };
}

/**
 * 두 경도의 미드포인트 계산
 * 짧은 호(shorter arc)의 중간점을 반환
 */
function getMidpoint(lon1: number, lon2: number): number {
  const a = normalize360(lon1);
  const b = normalize360(lon2);

  let diff = b - a;
  if (diff < 0) diff += 360;

  // 짧은 호 선택
  if (diff > 180) {
    // 긴 호이므로 반대쪽 미드포인트 사용
    return normalize360(a + diff / 2 + 180);
  }
  return normalize360(a + diff / 2);
}

/**
 * 합성 행성 생성
 */
function createCompositePlanet(
  name: string,
  planetA: PlanetBase,
  planetB: PlanetBase,
  houses: House[]
): PlanetBase {
  const midLon = getMidpoint(planetA.longitude, planetB.longitude);
  const fmt = formatLongitude(midLon);

  // 하우스 결정
  let house = 1;
  for (let i = 0; i < 12; i++) {
    const nextI = (i + 1) % 12;
    const cusp = houses[i].cusp;
    let nextCusp = houses[nextI].cusp;

    if (nextCusp < cusp) nextCusp += 360;
    let testLon = midLon;
    if (testLon < cusp) testLon += 360;

    if (testLon >= cusp && testLon < nextCusp) {
      house = i + 1;
      break;
    }
  }

  // 속도는 두 행성의 평균
  const avgSpeed =
    planetA.speed !== undefined && planetB.speed !== undefined
      ? (planetA.speed + planetB.speed) / 2
      : undefined;

  return {
    name,
    longitude: midLon,
    sign: fmt.sign,
    degree: fmt.degree,
    minute: fmt.minute,
    formatted: fmt.formatted,
    house,
    speed: avgSpeed,
    retrograde: avgSpeed !== undefined ? avgSpeed < 0 : undefined,
  };
}

/**
 * 합성 차트 계산
 * 두 차트의 각 행성 미드포인트로 새로운 차트를 생성합니다.
 */
export function calculateComposite(input: CompositeInput): CompositeChart {
  const { chartA, chartB } = input;

  // 1. 합성 ASC/MC 계산
  const compositeAscLon = getMidpoint(
    chartA.ascendant.longitude,
    chartB.ascendant.longitude
  );
  const compositeMcLon = getMidpoint(chartA.mc.longitude, chartB.mc.longitude);

  // 2. 하우스 계산 (Whole Sign 기반 단순화)
  const ascFmt = formatLongitude(compositeAscLon);
  const houses: House[] = [];
  const ascSignIndex = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
  ].indexOf(ascFmt.sign);

  for (let i = 0; i < 12; i++) {
    const signIndex = (ascSignIndex + i) % 12;
    const signs: ZodiacKo[] = [
      "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
    ];
    const cusp = signIndex * 30;
    const fmt = formatLongitude(cusp);
    houses.push({
      index: i + 1,
      cusp,
      sign: signs[signIndex],
      formatted: fmt.formatted,
    });
  }

  // 3. ASC/MC 객체 생성
  const mcFmt = formatLongitude(compositeMcLon);
  const ascendant: PlanetBase = {
    name: "Ascendant",
    longitude: compositeAscLon,
    sign: ascFmt.sign,
    degree: ascFmt.degree,
    minute: ascFmt.minute,
    formatted: ascFmt.formatted,
    house: 1,
  };

  const mc: PlanetBase = {
    name: "MC",
    longitude: compositeMcLon,
    sign: mcFmt.sign,
    degree: mcFmt.degree,
    minute: mcFmt.minute,
    formatted: mcFmt.formatted,
    house: 10,
  };

  // 4. 합성 행성 계산
  const planets: PlanetBase[] = [];
  const planetNames = [
    "Sun", "Moon", "Mercury", "Venus", "Mars",
    "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "True Node",
  ];

  for (const name of planetNames) {
    const pA = chartA.planets.find((p) => p.name === name);
    const pB = chartB.planets.find((p) => p.name === name);

    if (pA && pB) {
      planets.push(createCompositePlanet(name, pA, pB, houses));
    }
  }

  return {
    planets,
    ascendant,
    mc,
    houses,
    compositeType: "midpoint",
    sourceCharts: {
      chartA: {
        ascendant: chartA.ascendant.longitude,
        mc: chartA.mc.longitude,
      },
      chartB: {
        ascendant: chartB.ascendant.longitude,
        mc: chartB.mc.longitude,
      },
    },
  };
}

/**
 * 합성 차트 요약
 */
export function getCompositeSummary(composite: CompositeChart): {
  sunSign: ZodiacKo;
  moonSign: ZodiacKo;
  ascSign: ZodiacKo;
  sunHouse: number;
  moonHouse: number;
  emphasis: string[];
} {
  const sun = composite.planets.find((p) => p.name === "Sun");
  const moon = composite.planets.find((p) => p.name === "Moon");

  const emphasis: string[] = [];

  // 하우스별 행성 수 계산
  const houseCounts: Record<number, number> = {};
  for (const p of composite.planets) {
    houseCounts[p.house] = (houseCounts[p.house] || 0) + 1;
  }

  // 3개 이상 행성이 있는 하우스 = 강조점
  for (const [house, count] of Object.entries(houseCounts)) {
    if (count >= 3) {
      emphasis.push(`${house}하우스 강조 (${count}개 행성)`);
    }
  }

  return {
    sunSign: sun?.sign ?? "Aries",
    moonSign: moon?.sign ?? "Aries",
    ascSign: composite.ascendant.sign,
    sunHouse: sun?.house ?? 1,
    moonHouse: moon?.house ?? 1,
    emphasis,
  };
}
