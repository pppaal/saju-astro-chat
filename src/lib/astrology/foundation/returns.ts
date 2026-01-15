// src/lib/astrology/foundation/returns.ts
// Solar Return & Lunar Return 계산

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

import {
  ReturnChart,
  SolarReturnInput,
  LunarReturnInput,
  NatalInput,
  PlanetBase,
} from "./types";
import { formatLongitude, normalize360 } from "./utils";
import { calcHouses, inferHouseOf, mapHouseCupsFormatted } from "./houses";
import { getSwisseph } from "./ephe";
import { getPlanetList, natalToJD, jdToISO, getSwissEphFlags } from "./shared";

/**
 * 특정 경도에 태양이 도달하는 정확한 시간 찾기 (이분법)
 */
function findSunAtLongitude(
  targetLon: number,
  startJD: number,
  endJD: number,
  tolerance: number = 0.0001 // 약 8초 정확도
): number {
  const swisseph = getSwisseph();
  const SW_FLAGS = getSwissEphFlags();
  let low = startJD;
  let high = endJD;

  // 최대 50번 반복 (충분한 정확도)
  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const sunRes = swisseph.swe_calc_ut(mid, swisseph.SE_SUN, SW_FLAGS);
    if ("error" in sunRes) throw new Error(`Sun calc error: ${sunRes.error}`);

    const sunLon = sunRes.longitude;
    const diff = normalize360(sunLon - targetLon);

    // 차이가 180도 이상이면 반대 방향
    const adjustedDiff = diff > 180 ? diff - 360 : diff;

    if (Math.abs(adjustedDiff) < tolerance) {
      return mid;
    }

    // 태양은 항상 순행하므로 단순 비교
    if (adjustedDiff > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * 특정 경도에 달이 도달하는 정확한 시간 찾기 (이분법)
 */
function findMoonAtLongitude(
  targetLon: number,
  startJD: number,
  endJD: number,
  tolerance: number = 0.0001
): number {
  const swisseph = getSwisseph();
  const SW_FLAGS = getSwissEphFlags();
  let low = startJD;
  let high = endJD;

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const moonRes = swisseph.swe_calc_ut(mid, swisseph.SE_MOON, SW_FLAGS);
    if ("error" in moonRes) throw new Error(`Moon calc error: ${moonRes.error}`);

    const moonLon = moonRes.longitude;
    const diff = normalize360(moonLon - targetLon);
    const adjustedDiff = diff > 180 ? diff - 360 : diff;

    if (Math.abs(adjustedDiff) < tolerance) {
      return mid;
    }

    if (adjustedDiff > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Solar Return (태양 회귀) 차트 계산
 * 매년 태양이 출생 시 위치로 돌아오는 정확한 순간의 차트
 */
export async function calculateSolarReturn(
  input: SolarReturnInput
): Promise<ReturnChart> {
  const swisseph = getSwisseph();
  const PLANET_LIST = getPlanetList();
  const SW_FLAGS = getSwissEphFlags();
  const { natal, year } = input;

  // 1. 출생 시 태양 위치 구하기
  const natalJD = natalToJD(natal);
  const natalSunRes = swisseph.swe_calc_ut(natalJD, swisseph.SE_SUN, SW_FLAGS);
  if ("error" in natalSunRes) throw new Error(`Natal Sun error: ${natalSunRes.error}`);
  const natalSunLon = natalSunRes.longitude;

  // 2. 해당 연도의 생일 근처에서 태양이 동일 위치에 오는 시간 찾기
  // 생일 5일 전부터 5일 후까지 검색
  const approxBirthday = dayjs.tz(
    `${year}-${String(natal.month).padStart(2, "0")}-${String(natal.date).padStart(2, "0")}T12:00:00`,
    natal.timeZone
  );
  const startJD = natalToJD({ ...natal, year, hour: 0, minute: 0 }) - 5;
  const endJD = startJD + 10;

  // 3. 정확한 Solar Return 시간 찾기
  const solarReturnJD = findSunAtLongitude(natalSunLon, startJD, endJD);

  // 4. 해당 시간의 차트 계산 (출생지 또는 현재 거주지)
  // 전통적으로 출생지 사용, 현대에는 거주지도 사용
  const housesRes = calcHouses(solarReturnJD, natal.latitude, natal.longitude, "Placidus");
  const ascendantInfo = formatLongitude(housesRes.ascendant);
  const mcInfo = formatLongitude(housesRes.mc);

  // 5. 행성 위치 계산
  const planets: PlanetBase[] = Object.entries(PLANET_LIST).map(([name, planetId]) => {
    const res = swisseph.swe_calc_ut(solarReturnJD, planetId, SW_FLAGS);
    if ("error" in res) throw new Error(`Solar Return calc error for ${name}: ${res.error}`);

    const longitude = res.longitude;
    const info = formatLongitude(longitude);
    const house = inferHouseOf(longitude, housesRes.house);
    const speed = res.speed;
    const retrograde = typeof speed === "number" ? speed < 0 : undefined;

    return { name, longitude, ...info, house, speed, retrograde };
  });

  return {
    planets,
    ascendant: {
      name: "Ascendant",
      longitude: housesRes.ascendant,
      ...ascendantInfo,
      house: 1,
    },
    mc: {
      name: "MC",
      longitude: housesRes.mc,
      ...mcInfo,
      house: 10,
    },
    houses: mapHouseCupsFormatted(housesRes.house),
    returnType: "solar",
    returnYear: year,
    exactReturnTime: jdToISO(solarReturnJD),
  };
}

/**
 * Lunar Return (달 회귀) 차트 계산
 * 매월 달이 출생 시 위치로 돌아오는 정확한 순간의 차트
 */
export async function calculateLunarReturn(
  input: LunarReturnInput
): Promise<ReturnChart> {
  const swisseph = getSwisseph();
  const PLANET_LIST = getPlanetList();
  const SW_FLAGS = getSwissEphFlags();
  const { natal, month, year } = input;

  // 1. 출생 시 달 위치 구하기
  const natalJD = natalToJD(natal);
  const natalMoonRes = swisseph.swe_calc_ut(natalJD, swisseph.SE_MOON, SW_FLAGS);
  if ("error" in natalMoonRes) throw new Error(`Natal Moon error: ${natalMoonRes.error}`);
  const natalMoonLon = natalMoonRes.longitude;

  // 2. 해당 월의 시작부터 끝까지 검색 (달은 약 27.3일 주기)
  const startJD = natalToJD({
    ...natal,
    year,
    month,
    date: 1,
    hour: 0,
    minute: 0,
  });
  const endJD = startJD + 32; // 한 달 + 여유

  // 3. 정확한 Lunar Return 시간 찾기
  const lunarReturnJD = findMoonAtLongitude(natalMoonLon, startJD, endJD);

  // 4. 차트 계산
  const housesRes = calcHouses(lunarReturnJD, natal.latitude, natal.longitude, "Placidus");
  const ascendantInfo = formatLongitude(housesRes.ascendant);
  const mcInfo = formatLongitude(housesRes.mc);

  // 5. 행성 위치
  const planets: PlanetBase[] = Object.entries(PLANET_LIST).map(([name, planetId]) => {
    const res = swisseph.swe_calc_ut(lunarReturnJD, planetId, SW_FLAGS);
    if ("error" in res) throw new Error(`Lunar Return calc error for ${name}: ${res.error}`);

    const longitude = res.longitude;
    const info = formatLongitude(longitude);
    const house = inferHouseOf(longitude, housesRes.house);
    const speed = res.speed;
    const retrograde = typeof speed === "number" ? speed < 0 : undefined;

    return { name, longitude, ...info, house, speed, retrograde };
  });

  return {
    planets,
    ascendant: {
      name: "Ascendant",
      longitude: housesRes.ascendant,
      ...ascendantInfo,
      house: 1,
    },
    mc: {
      name: "MC",
      longitude: housesRes.mc,
      ...mcInfo,
      house: 10,
    },
    houses: mapHouseCupsFormatted(housesRes.house),
    returnType: "lunar",
    returnYear: year,
    returnMonth: month,
    exactReturnTime: jdToISO(lunarReturnJD),
  };
}

/**
 * Solar Return 차트 해석 요약
 */
export function getSolarReturnSummary(chart: ReturnChart): {
  year: number;
  ascSign: string;
  sunHouse: number;
  moonSign: string;
  moonHouse: number;
  theme: string;
} {
  const sun = chart.planets.find(p => p.name === "Sun");
  const moon = chart.planets.find(p => p.name === "Moon");

  const sunHouse = sun?.house || 1;
  const moonHouse = moon?.house || 1;

  // 태양 하우스 기반 연간 테마
  const houseThemes: Record<number, string> = {
    1: "자아 재정립, 새로운 정체성, 개인 프로젝트",
    2: "재정, 가치관, 자존감에 집중하는 해",
    3: "학습, 소통, 단거리 여행이 활발한 해",
    4: "가정, 가족, 뿌리에 집중하는 해",
    5: "창조성, 로맨스, 자녀 관련 이벤트의 해",
    6: "건강, 일상 루틴, 직장 환경 변화의 해",
    7: "파트너십, 결혼, 중요한 관계의 해",
    8: "변환, 공유 자원, 심리적 깊이의 해",
    9: "여행, 고등 교육, 철학적 탐구의 해",
    10: "커리어, 공적 인정, 사회적 지위의 해",
    11: "친구, 그룹 활동, 미래 목표의 해",
    12: "영적 성장, 휴식, 내면 작업의 해",
  };

  return {
    year: chart.returnYear,
    ascSign: chart.ascendant.sign,
    sunHouse,
    moonSign: moon?.sign || "Unknown",
    moonHouse,
    theme: houseThemes[sunHouse] || "다양한 변화가 예상되는 해",
  };
}

/**
 * Lunar Return 차트 해석 요약
 */
export function getLunarReturnSummary(chart: ReturnChart): {
  year: number;
  month: number;
  ascSign: string;
  moonHouse: number;
  sunSign: string;
  theme: string;
} {
  const sun = chart.planets.find(p => p.name === "Sun");
  const moon = chart.planets.find(p => p.name === "Moon");

  const moonHouse = moon?.house || 1;

  // 달 하우스 기반 월간 테마
  const houseThemes: Record<number, string> = {
    1: "자기 표현과 새로운 시작에 집중하는 달",
    2: "재정과 물질적 안정에 신경 쓰는 달",
    3: "소통과 학습이 활발한 달",
    4: "가정과 감정적 안정이 중요한 달",
    5: "창조성과 즐거움을 추구하는 달",
    6: "건강과 일상 관리에 집중하는 달",
    7: "관계와 협력이 중요한 달",
    8: "변화와 내면 탐구의 달",
    9: "확장과 모험을 추구하는 달",
    10: "커리어와 목표에 집중하는 달",
    11: "사회적 활동과 네트워킹의 달",
    12: "휴식과 영적 성찰의 달",
  };

  return {
    year: chart.returnYear,
    month: chart.returnMonth || 1,
    ascSign: chart.ascendant.sign,
    moonHouse,
    sunSign: sun?.sign || "Unknown",
    theme: houseThemes[moonHouse] || "다양한 감정적 변화가 예상되는 달",
  };
}
