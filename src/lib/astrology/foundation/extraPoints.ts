// src/lib/astrology/foundation/extraPoints.ts
// Chiron, Part of Fortune, Vertex, Lilith 계산

import { ExtraPoint, ExtendedChart, Chart, NatalInput } from "./types";
import { formatLongitude, normalize360 } from "./utils";
import { inferHouseOf } from "./houses";
import { getSwisseph } from "./ephe";

// Swiss Ephemeris 추가 천체 ID
const getExtraBodies = (() => {
  let cache: Record<string, number> | null = null;
  return () => {
    if (cache) {return cache;}
    const swisseph = getSwisseph();
    cache = {
      Chiron: swisseph.SE_CHIRON,
      Lilith: swisseph.SE_MEAN_APOG,  // Mean Black Moon Lilith
      TrueLilith: swisseph.SE_OSCU_APOG,  // Osculating/True Lilith
    };
    return cache;
  };
})();

/**
 * Chiron 계산
 * 상처와 치유의 소행성
 */
export function calculateChiron(ut_jd: number, houseCusps: number[]): ExtraPoint {
  const swisseph = getSwisseph();
  const EXTRA_BODIES = getExtraBodies();
  const SW_FLAGS = swisseph.SEFLG_SPEED;

  const res = swisseph.swe_calc_ut(ut_jd, EXTRA_BODIES.Chiron, SW_FLAGS);
  if ("error" in res) {throw new Error(`Chiron calculation error: ${res.error}`);}

  const longitude = res.longitude;
  const info = formatLongitude(longitude);
  const house = inferHouseOf(longitude, houseCusps);

  return {
    name: "Chiron",
    longitude,
    sign: info.sign,
    degree: info.degree,
    minute: info.minute,
    formatted: info.formatted,
    house,
    description: "상처와 치유의 포인트. 내면의 상처를 통해 다른 이들을 치유하는 능력."
  };
}

/**
 * Black Moon Lilith (평균) 계산
 * 억압된 여성성, 그림자 자아
 */
export function calculateLilith(ut_jd: number, houseCusps: number[]): ExtraPoint {
  const swisseph = getSwisseph();
  const EXTRA_BODIES = getExtraBodies();
  const SW_FLAGS = swisseph.SEFLG_SPEED;

  const res = swisseph.swe_calc_ut(ut_jd, EXTRA_BODIES.Lilith, SW_FLAGS);
  if ("error" in res) {throw new Error(`Lilith calculation error: ${res.error}`);}

  const longitude = res.longitude;
  const info = formatLongitude(longitude);
  const house = inferHouseOf(longitude, houseCusps);

  return {
    name: "Lilith",
    longitude,
    sign: info.sign,
    degree: info.degree,
    minute: info.minute,
    formatted: info.formatted,
    house,
    description: "검은 달 릴리스. 억압된 욕망, 그림자 자아, 본능적 힘."
  };
}

/**
 * Part of Fortune (행운점) 계산
 * 공식: ASC + Moon - Sun (주간 출생)
 *       ASC + Sun - Moon (야간 출생)
 */
export function calculatePartOfFortune(
  ascLon: number,
  sunLon: number,
  moonLon: number,
  isNightChart: boolean,
  houseCusps: number[]
): ExtraPoint {
  let longitude: number;

  if (isNightChart) {
    // 야간 공식: ASC + Sun - Moon
    longitude = normalize360(ascLon + sunLon - moonLon);
  } else {
    // 주간 공식: ASC + Moon - Sun
    longitude = normalize360(ascLon + moonLon - sunLon);
  }

  const info = formatLongitude(longitude);
  const house = inferHouseOf(longitude, houseCusps);

  return {
    name: "Part of Fortune",
    longitude,
    sign: info.sign,
    degree: info.degree,
    minute: info.minute,
    formatted: info.formatted,
    house,
    description: "행운점. 물질적 풍요와 행운이 흐르는 영역."
  };
}

/**
 * Vertex 계산
 * Vertex는 서쪽 지평선과 황도의 교점 (Prime Vertical)
 * Swiss Ephemeris에서 직접 지원하지 않아 수학적 계산 필요
 */
export function calculateVertex(
  ut_jd: number,
  latitude: number,
  longitude: number,
  houseCusps: number[]
): ExtraPoint {
  const swisseph = getSwisseph();

  // Vertex는 일반적으로 ASC의 반대편 (180도)에서 약간 벗어난 위치
  // 정밀 계산: ARMC + 90도 지점의 황도 교점
  // Swiss Ephemeris의 swe_houses는 vertex를 제공하지 않으므로 근사 계산

  // 간단한 방법: Anti-Vertex (ASC) + 180도 기반 추정
  // 실제로는 prime vertical의 서쪽 교점이지만,
  // 대부분의 차트에서 5-8하우스 사이에 위치

  const housesRes = swisseph.swe_houses(ut_jd, latitude, longitude, "P");
  if ("error" in housesRes) {throw new Error(`Vertex calculation error: ${housesRes.error}`);}

  // Vertex는 보통 houses 결과의 vertex 필드에 있음 (있는 경우)
  // 없으면 DESC에서 약간 조정
  const vertex = housesRes.vertex ?? normalize360(housesRes.ascendant + 180);

  const info = formatLongitude(vertex);
  const house = inferHouseOf(vertex, houseCusps);

  return {
    name: "Vertex",
    longitude: vertex,
    sign: info.sign,
    degree: info.degree,
    minute: info.minute,
    formatted: info.formatted,
    house,
    description: "버텍스. 운명적 만남, 카르마적 연결 포인트."
  };
}

/**
 * 태양 위치로 주간/야간 차트 판별
 * 태양이 지평선 위(1-6하우스가 아닌 7-12하우스)면 주간
 */
export function isNightChart(sunHouse: number): boolean {
  // 태양이 1-6하우스에 있으면 야간 차트
  return sunHouse >= 1 && sunHouse <= 6;
}

/**
 * 차트에 모든 추가 포인트 계산하여 확장
 */
export function extendChartWithExtraPoints(
  chart: Chart,
  ut_jd: number,
  latitude: number,
  longitude: number
): ExtendedChart {
  const houseCusps = chart.houses.map(h => h.cusp);

  // Sun과 Moon 찾기
  const sun = chart.planets.find(p => p.name === "Sun");
  const moon = chart.planets.find(p => p.name === "Moon");

  if (!sun || !moon) {
    throw new Error("Sun or Moon not found in chart");
  }

  const nightChart = isNightChart(sun.house);

  return {
    ...chart,
    chiron: calculateChiron(ut_jd, houseCusps),
    lilith: calculateLilith(ut_jd, houseCusps),
    partOfFortune: calculatePartOfFortune(
      chart.ascendant.longitude,
      sun.longitude,
      moon.longitude,
      nightChart,
      houseCusps
    ),
    vertex: calculateVertex(ut_jd, latitude, longitude, houseCusps),
  };
}

/**
 * 개별 추가 포인트만 계산 (기존 차트 없이)
 */
export async function calculateExtraPoints(
  ut_jd: number,
  latitude: number,
  longitude: number,
  ascLon: number,
  sunLon: number,
  moonLon: number,
  sunHouse: number,
  houseCusps: number[]
): Promise<{
  chiron: ExtraPoint;
  lilith: ExtraPoint;
  partOfFortune: ExtraPoint;
  vertex: ExtraPoint;
}> {
  const nightChart = isNightChart(sunHouse);

  return {
    chiron: calculateChiron(ut_jd, houseCusps),
    lilith: calculateLilith(ut_jd, houseCusps),
    partOfFortune: calculatePartOfFortune(ascLon, sunLon, moonLon, nightChart, houseCusps),
    vertex: calculateVertex(ut_jd, latitude, longitude, houseCusps),
  };
}
