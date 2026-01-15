// src/lib/astrology/foundation/astrologyService.ts
import { Chart, ZodiacKo } from "./types";
import { formatLongitude } from "./utils";
import { calcHouses, inferHouseOf } from "./houses";
import { getSwisseph } from "./ephe";
import { getPlanetList, natalToJD } from "./shared";

// --- 출생 차트 public API ---
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
  meta?: {
    jdUT: number;
    isoUTC?: string;
    timeZone?: string;
    latitude?: number;
    longitude?: number;
    houseSystem?: string;
  };
}

// --- 메인 차트 계산 ---
export async function calculateNatalChart(input: NatalChartInput): Promise<NatalChartData> {
  const swisseph = getSwisseph();
  const PLANET_LIST = getPlanetList();
  const SW_FLAGS = swisseph.SEFLG_SPEED;

  const ut_jd = natalToJD(input);

  // Houses / ASC / MC
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

  // Planets
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

// 차트 포맷 변환
export function toChart(n: NatalChartData): Chart {
  return {
    planets: n.planets.map(p => ({
      name: p.name,
      longitude: p.longitude,
      sign: p.sign as ZodiacKo,
      degree: p.degree,
      minute: p.minute,
      formatted: p.formatted,
      house: p.house,
      speed: p.speed,
      retrograde: p.retrograde,
    })),
    ascendant: {
      ...n.ascendant,
      sign: n.ascendant.sign as ZodiacKo,
    },
    mc: {
      ...n.mc,
      sign: n.mc.sign as ZodiacKo,
    },
    houses: n.houses.map((h, i) => {
      const f = formatLongitude(h.cusp);
      return { index: i + 1, cusp: h.cusp, sign: f.sign, formatted: f.formatted };
    }),
  };
}
