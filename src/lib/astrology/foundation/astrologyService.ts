// src/lib/astrology/foundation/astrologyService.ts
import path from "path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
dayjs.extend(utc);
dayjs.extend(timezone);

const swisseph = require("swisseph");

import { Chart } from "./types";
import { formatLongitude } from "./utils";
import { calcHouses, inferHouseOf, mapHouseCupsFormatted } from "./houses";

// --- 기존 public API 타입(하위호환 유지) ---
export interface NatalChartInput {
  year: number;
  month: number;
  date: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timeZone: string;
}

export interface PlanetData {
  name: string;
  longitude: number;
  formatted: string;
  sign: string;
  degree: number;
  minute: number;
  house: number;
  speed?: number;
  retrograde?: boolean;
}

export interface NatalChartData {
  planets: PlanetData[];
  ascendant: PlanetData;
  mc: PlanetData;
  houses: { cusp: number; formatted: string }[];
}

// --- 상수 정의 ---
const PLANET_LIST = {
  Sun: swisseph.SE_SUN,
  Moon: swisseph.SE_MOON,
  Mercury: swisseph.SE_MERCURY,
  Venus: swisseph.SE_VENUS,
  Mars: swisseph.SE_MARS,
  Jupiter: swisseph.SE_JUPITER,
  Saturn: swisseph.SE_SATURN,
  Uranus: swisseph.SE_URANUS,
  Neptune: swisseph.SE_NEPTUNE,
  Pluto: swisseph.SE_PLUTO,
  "True Node": swisseph.SE_TRUE_NODE,
};

// 내부 공통 플래그: 속도 포함
const SW_FLAGS = swisseph.SEFLG_SPEED;

// 모듈 로드 시 1회 ephe 경로 지정(서버리스에서도 콜드스타트 1회)
let EPHE_PATH_SET = false;
function ensureEphePath() {
  if (!EPHE_PATH_SET) {
    const ephePath = path.join(process.cwd(), "public", "ephe");
    swisseph.swe_set_ephe_path(ephePath);
    EPHE_PATH_SET = true;
  }
}

// --- 핵심 로직 함수 ---
export async function calculateNatalChart(input: NatalChartInput): Promise<NatalChartData> {
  ensureEphePath();

  const local = dayjs.tz(
    new Date(input.year, input.month - 1, input.date, input.hour, input.minute),
    input.timeZone
  );
  if (!local.isValid()) throw new Error("Invalid local datetime for given timeZone");
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
    throw new Error(`Swiss Ephemeris Error (swe_utc_to_jd): ${jdResult.error}`);
  }
  const ut_jd = jdResult.julianDayUT;

  // 하우스/ASC/MC
  const housesRes = calcHouses(ut_jd, input.latitude, input.longitude, "Placidus");
  const ascendantInfo = formatLongitude(housesRes.ascendant);
  const mcInfo = formatLongitude(housesRes.mc);

  const ascendant: PlanetData = {
    name: "Ascendant",
    longitude: housesRes.ascendant,
    ...ascendantInfo,
    house: 1,
  };
  const mc: PlanetData = {
    name: "MC",
    longitude: housesRes.mc,
    ...mcInfo,
    house: 10,
  };

  // 행성 계산
  const planets: PlanetData[] = Object.entries(PLANET_LIST).map(([name, planetId]) => {
    const res = swisseph.swe_calc_ut(ut_jd, planetId, SW_FLAGS);
    if ("error" in res) throw new Error(`Swiss Ephemeris Error (swe_calc_ut for ${name}): ${res.error}`);
    if (!("longitude" in res)) throw new Error(`Unexpected coordinate system for ${name}.`);

    const longitude = res.longitude;
    const info = formatLongitude(longitude);
    const houseNum = inferHouseOf(longitude, housesRes.house);
    const speed = res.speed;
    const retrograde = typeof speed === "number" ? speed < 0 : undefined;

    return { name, longitude, ...info, house: houseNum, speed, retrograde };
  });

  return {
    planets,
    ascendant,
    mc,
    houses: housesRes.house.map((cusp: number) => ({ cusp, formatted: formatLongitude(cusp).formatted })),
  };
}

// 옵션: 공통 Chart 형태로 변환하는 헬퍼 (다른 모듈에서 재사용 가능)
export function toChart(n: NatalChartData): Chart {
  return {
    planets: n.planets.map(p => ({
      name: p.name,
      longitude: p.longitude,
      sign: p.sign as any,
      degree: p.degree,
      minute: p.minute,
      formatted: p.formatted,
      house: p.house,
      speed: p.speed,
      retrograde: p.retrograde,
    })),
    ascendant: n.ascendant as any,
    mc: n.mc as any,
    houses: n.houses.map((h, i) => {
      const f = formatLongitude(h.cusp);
      return { index: i + 1, cusp: h.cusp, sign: f.sign, formatted: f.formatted };
    }),
  };
}