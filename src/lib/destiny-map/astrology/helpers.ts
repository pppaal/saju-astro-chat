/**
 * Destiny Map Helpers
 * 운명 지도 헬퍼 함수들
 *
 * Utility functions for the Destiny Map engine:
 * - Input masking for privacy
 * - Timezone resolution
 * - Date/time helpers
 * - Yin/Yang determination
 * - Part of Fortune calculation
 * - Transit calculations
 */

import tzLookup from 'tz-lookup';
import type {
  CombinedInput,
  MaskedInput,
  DateComponents,
  HouseCusp,
  TransitAspect,
  LightPoint,
} from './types';
import type { PlanetData } from '@/lib/astrology';

// ======================================================
// Input Masking (Privacy)
// ======================================================

/**
 * Mask sensitive input data for logging
 * @param input - Combined input to mask
 * @returns Masked input with PII hidden
 */
export function maskInput(input: CombinedInput): MaskedInput {
  const maskName = (val?: string) => (val ? `${val[0] ?? ''}***` : undefined);
  return {
    ...input,
    name: maskName(input.name),
    birthDate: input.birthDate ? '****-**-**' : undefined,
    birthTime: input.birthTime ? '**:**' : undefined,
    latitude: typeof input.latitude === 'number' ? Number(input.latitude.toFixed(3)) : input.latitude,
    longitude: typeof input.longitude === 'number' ? Number(input.longitude.toFixed(3)) : input.longitude,
  };
}

// ======================================================
// Timezone Resolution
// ======================================================

/**
 * Resolve timezone from input or coordinates
 * @param tz - Explicit timezone (if provided)
 * @param latitude - Latitude for lookup
 * @param longitude - Longitude for lookup
 * @returns Resolved timezone string
 */
export function resolveTimezone(tz: string | undefined, latitude: number, longitude: number): string {
  if (tz) return tz;
  try {
    return tzLookup(latitude, longitude);
  } catch {
    return 'Asia/Seoul';
  }
}

// ======================================================
// Date/Time Helpers
// ======================================================

/**
 * Get current date/time in a specific timezone
 * @param tz - Timezone to use (defaults to UTC if not provided)
 * @returns Date components in the specified timezone
 */
export function getNowInTimezone(tz?: string): DateComponents {
  const now = new Date();
  if (!tz) {
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
    };
  }
  try {
    const fmt = (opt: Intl.DateTimeFormatOptions) =>
      Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opt }).format(now));
    return {
      year: fmt({ year: 'numeric' }),
      month: fmt({ month: '2-digit' }),
      day: fmt({ day: '2-digit' }),
      hour: fmt({ hour: '2-digit', hour12: false }),
      minute: fmt({ minute: '2-digit' }),
    };
  } catch {
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
    };
  }
}

// ======================================================
// Yin/Yang Determination (Korean Astrology)
// ======================================================

/**
 * Determine Yin/Yang from Korean stem/branch name
 * 천간/지지 이름으로 음양 판정
 *
 * 양(陽) stems: 갑, 병, 무, 경, 임
 * 양(陽) branches: 자, 인, 진, 오, 신, 술
 *
 * @param name - Korean character for stem or branch
 * @returns '음' (Yin) or '양' (Yang)
 */
export function getYinYangFromName(name: string): '음' | '양' {
  const yangStems = ['갑', '병', '무', '경', '임'];
  const yangBranches = ['자', '인', '진', '오', '신', '술'];
  if (yangStems.includes(name) || yangBranches.includes(name)) return '양';
  return '음';
}

// ======================================================
// Part of Fortune Calculation
// ======================================================

/**
 * Normalize degree to 0-360 range
 */
function normalizeDegree(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Compute Part of Fortune and add to planets array
 * 파트 오브 포춘 계산 및 행성 배열에 추가
 *
 * Formula: Asc + Moon - Sun (day chart) or Asc + Sun - Moon (night chart)
 * This uses the day chart formula as default.
 *
 * @param planets - Array of planets (will be mutated to add PoF)
 * @param houses - Array of house cusps
 * @param ascendant - Ascendant planet data
 */
export function computePoF(
  planets: PlanetData[],
  houses: HouseCusp[],
  ascendant: PlanetData
): void {
  const findPlanet = (name: string) => planets.find((p) => p?.name === name);
  const sunLon = findPlanet('Sun')?.longitude;
  const moonLon = findPlanet('Moon')?.longitude;
  const ascLon = ascendant?.longitude;

  if (typeof sunLon !== 'number' || typeof moonLon !== 'number' || typeof ascLon !== 'number') {
    return;
  }

  const pofLon = normalizeDegree(ascLon + moonLon - sunLon);
  const signNames = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ];
  const signIndex = Math.floor(pofLon / 30) % 12;
  const signName = signNames[signIndex];
  const degInSign = pofLon % 30;
  const degree = Math.floor(degInSign);
  const minute = Math.round((degInSign - degree) * 60);

  // House determination: simple cusp check
  const cusps = houses || [];
  let houseNum = 0;
  if (cusps.length === 12) {
    const cuspDegs = cusps.map((c) => Number(c.cusp) || 0);
    for (let i = 0; i < 12; i++) {
      const start = cuspDegs[i];
      const end = cuspDegs[(i + 1) % 12];
      const inRange = start < end
        ? pofLon >= start && pofLon < end
        : pofLon >= start || pofLon < end;
      if (inRange) {
        houseNum = i + 1;
        break;
      }
    }
  }

  // Add Part of Fortune to planets array
  const pof: PlanetData = {
    name: 'Part of Fortune',
    longitude: pofLon,
    sign: signName,
    degree,
    minute,
    formatted: `${signName} ${degree} deg ${minute.toString().padStart(2, '0')}'`,
    house: houseNum,
  };
  planets.push(pof);
}

// ======================================================
// Transit Calculations
// ======================================================

/**
 * Calculate transit aspects to lights (Sun, Moon, Asc, MC)
 * 트랜짓 행성과 라이트(태양, 달, ASC, MC) 간의 위상 계산
 *
 * @param transitPlanets - Current transit planets
 * @param lights - Light points to check against (Sun, Moon, Asc, MC)
 * @param orb - Orb in degrees (default: 4)
 * @returns Array of transit aspects
 */
export function calcTransitsToLights(
  transitPlanets: PlanetData[],
  lights: LightPoint[],
  orb = 4
): TransitAspect[] {
  const normDiff = (a: number, b: number) => {
    const d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
  };

  const aspectAngles: Record<string, number> = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
  };

  const transits: TransitAspect[] = [];

  for (const tr of transitPlanets) {
    const lon = typeof tr?.longitude === 'number' ? tr.longitude : null;
    const name = tr?.name;
    if (!name || lon === null) continue;

    for (const tgt of lights) {
      const d = normDiff(lon, tgt.longitude);
      for (const [atype, angle] of Object.entries(aspectAngles)) {
        if (Math.abs(d - angle) <= orb) {
          transits.push({
            type: atype,
            from: { name, longitude: lon },
            to: { name: tgt.name, longitude: tgt.longitude },
            orb: Number(d - angle).toFixed(2),
          });
          break;
        }
      }
    }
  }

  return transits;
}

// ======================================================
// Validation Helpers
// ======================================================

/**
 * Validate geographic coordinates
 * @param latitude - Latitude to validate
 * @param longitude - Longitude to validate
 * @throws Error if coordinates are invalid
 */
export function validateCoordinates(latitude: number, longitude: number): void {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    throw new Error('Invalid coordinates range');
  }
}

/**
 * Parse birth date and time strings
 * @param birthDate - Date string in YYYY-MM-DD format
 * @param birthTime - Time string in HH:MM format
 * @returns Parsed date components
 * @throws Error if format is invalid
 */
export function parseBirthDateTime(birthDate: string, birthTime: string): DateComponents {
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime.split(':').map((v) => Number(v) || 0);

  const dateObj = new Date(Date.UTC(year, month - 1, day, hour, minute));
  if (isNaN(dateObj.getTime())) {
    throw new Error('Invalid birth date/time format');
  }

  return { year, month, day, hour, minute };
}

/**
 * Format birth time safely (ensure HH:MM format)
 * @param birthTime - Raw birth time string
 * @returns Formatted time string
 */
export function formatBirthTime(birthTime: string): string {
  const [hh, mmRaw] = birthTime.split(':');
  return `${hh.padStart(2, '0')}:${(mmRaw ?? '00').padStart(2, '0')}`;
}
