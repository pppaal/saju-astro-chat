/**
 * Natal Chart Calculations
 * 출생 차트 계산 모듈
 */

import {
  calculateNatalChart,
  buildEngineMeta,
  findNatalAspectsPlus,
  resolveOptions,
  type Chart,
  type AstrologyChartFacts,
  type PlanetData,
} from "@/lib/astrology";

import { logger } from "@/lib/logger";

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

export interface HouseCusp {
  cusp: number;
  longitude: number;
  sign?: string;
  [key: string]: unknown;
}

export interface NatalChartResult {
  chart: Chart;
  facts: AstrologyChartFacts;
  aspects: unknown[];
  meta: unknown;
  planets: PlanetData[];
  houses: HouseCusp[];
  ascendant: unknown;
  mc: unknown;
}

/**
 * Calculate natal chart with aspects and metadata
 */
export async function calculateNatal(
  input: NatalChartInput,
  enableDebugLogs = false
): Promise<NatalChartResult> {
  if (enableDebugLogs) {
    logger.debug("[Natal] Calculating natal chart", {
      date: `${input.year}-${input.month}-${input.date}`,
      time: `${input.hour}:${input.minute}`,
    });
  }

  const natalRaw = await calculateNatalChart(input);
  const natalChart = natalRaw as unknown as Chart;
  const astroFacts = natalRaw as unknown as AstrologyChartFacts;
  const astroOptions = resolveOptions();
  const astroAspects = findNatalAspectsPlus(natalChart, {}, astroOptions);
  const astroMeta = natalChart.meta ? buildEngineMeta(natalChart.meta, astroOptions) : null;

  const { planets, houses, ascendant, mc } = natalRaw;

  if (enableDebugLogs) {
    logger.debug("[Natal] Calculated", {
      planets: planets.length,
      houses: houses.length,
      aspects: astroAspects.length,
    });
  }

  return {
    chart: natalChart,
    facts: astroFacts,
    aspects: astroAspects,
    meta: astroMeta,
    planets: planets as unknown as PlanetData[],
    houses: houses as unknown as HouseCusp[],
    ascendant,
    mc,
  };
}

/**
 * Calculate Part of Fortune and add to planets
 * ASC + Moon - Sun (for day chart)
 * ASC + Sun - Moon (for night chart)
 */
export function computePartOfFortune(
  planets: PlanetData[],
  houses: HouseCusp[],
  ascendant: { longitude: number }
): void {
  const sun = planets.find((p) => p.name === "Sun");
  const moon = planets.find((p) => p.name === "Moon");

  if (!sun || !moon || !ascendant) return;

  // Determine if day or night chart
  // Night chart if Sun is below horizon (houses 1-6 from ASC)
  const sunLong = sun.longitude;
  const ascLong = ascendant.longitude;
  const angle = ((sunLong - ascLong + 360) % 360);
  const isNight = angle < 180;

  // Calculate Part of Fortune
  let pofLong: number;
  if (isNight) {
    // Night: ASC + Sun - Moon
    pofLong = (ascLong + sunLong - moon.longitude + 360) % 360;
  } else {
    // Day: ASC + Moon - Sun
    pofLong = (ascLong + moon.longitude - sunLong + 360) % 360;
  }

  // Determine sign
  const signs = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];
  const signIndex = Math.floor(pofLong / 30);
  const degreeInSign = pofLong % 30;

  // Add Part of Fortune to planets
  planets.push({
    name: "Part of Fortune",
    longitude: pofLong,
    latitude: 0,
    distance: 0,
    longitudeSpeed: 0,
    latitudeSpeed: 0,
    distanceSpeed: 0,
    sign: signs[signIndex] || "Aries",
    degree: Math.floor(degreeInSign),
    minute: Math.floor((degreeInSign % 1) * 60),
    retrograde: false,
    formatted: `${signs[signIndex]} ${Math.floor(degreeInSign)}°${Math.floor((degreeInSign % 1) * 60)}'`,
    house: 0, // Will be calculated later if needed
  } as unknown as PlanetData);
}

/**
 * Get current date/time components in specified timezone
 */
export interface DateComponents {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export function getNowInTimezone(tz?: string): DateComponents {
  const now = new Date();

  if (!tz) {
    // Use local time
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
      hour: now.getHours(),
      minute: now.getMinutes(),
    };
  }

  try {
    // Use timezone-aware formatting
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => {
      const part = parts.find((p) => p.type === type);
      return part ? parseInt(part.value, 10) : 0;
    };

    return {
      year: getPart("year"),
      month: getPart("month"),
      day: getPart("day"),
      hour: getPart("hour"),
      minute: getPart("minute"),
    };
  } catch {
    // Fallback to UTC if timezone is invalid
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
    };
  }
}

/**
 * Calculate transit aspects to important natal points (Sun, Moon, ASC, MC)
 */
export interface LightPoint {
  name: string;
  longitude: number;
}

export interface TransitAspect {
  transitPlanet: string;
  natalPoint: string;
  aspect: string;
  orb: number;
}

export function calculateTransitsToLights(
  transitPlanets: PlanetData[],
  lights: LightPoint[],
  maxOrb: number = 4
): TransitAspect[] {
  const transits: TransitAspect[] = [];
  const aspectAngles: Record<string, number> = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
  };

  for (const tp of transitPlanets) {
    for (const light of lights) {
      const diff = Math.abs(((tp.longitude - light.longitude + 180) % 360) - 180);

      for (const [aspectName, angle] of Object.entries(aspectAngles)) {
        const orb = Math.abs(diff - angle);
        if (orb <= maxOrb) {
          transits.push({
            transitPlanet: tp.name,
            natalPoint: light.name,
            aspect: aspectName,
            orb: Number(orb.toFixed(2)),
          });
        }
      }
    }
  }

  return transits;
}
