/**
 * astrology/planetPosition.ts - 행성 위치 계산
 */

import type { PlanetName, PlanetPosition } from './types';
import { ZODIAC_SIGNS } from './constants';
import { getDaysSinceJ2000 } from './helpers';

/**
 * 행성 별자리 및 황경 근사 계산 (평균 공전 주기 기반)
 */
export function getPlanetPosition(date: Date, planet: PlanetName): PlanetPosition {
  const daysSinceJ2000 = getDaysSinceJ2000(date);

  let longitude: number;

  switch (planet) {
    case "sun":
      longitude = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
      break;
    case "moon":
      longitude = (218.32 + 13.176396 * daysSinceJ2000) % 360;
      break;
    case "mercury":
      longitude = (280.46 + 0.9856474 * daysSinceJ2000) % 360;
      longitude = (longitude + Math.sin(daysSinceJ2000 * 0.0712) * 23) % 360;
      break;
    case "venus":
      longitude = (181.98 + 1.6021 * daysSinceJ2000) % 360;
      break;
    case "mars":
      longitude = (355.43 + 0.5240 * daysSinceJ2000) % 360;
      break;
    case "jupiter":
      longitude = (34.35 + 0.0831 * daysSinceJ2000) % 360;
      break;
    case "saturn":
      longitude = (49.94 + 0.0335 * daysSinceJ2000) % 360;
      break;
  }

  if (longitude < 0) { longitude += 360; }

  const signIndex = Math.floor(longitude / 30) % 12;
  const degree = longitude % 30;

  return { sign: ZODIAC_SIGNS[signIndex], longitude, degree };
}

/**
 * 기존 호환성을 위한 래퍼
 */
export function getPlanetSign(date: Date, planet: "mercury" | "venus" | "mars"): string {
  return getPlanetPosition(date, planet).sign;
}
