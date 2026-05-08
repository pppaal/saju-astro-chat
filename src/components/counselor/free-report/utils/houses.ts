/**
 * House extraction and analysis utilities
 */

import type { HouseNumber, ZodiacSign } from '../types/core';
import type { AstroData, PlanetData } from '../types';
import { normalizePlanetName } from './planets';
import { normalizeZodiacSign, validateHouseNumber } from './validation';

// ========== House Sign Extraction ==========

/**
 * Get the zodiac sign on a house cusp
 *
 * @param astro - Astro data containing houses
 * @param house - House number (1-12)
 * @returns Zodiac sign or null if not found
 */
export function getHouseSign(
  astro: AstroData | undefined,
  house: HouseNumber
): ZodiacSign | null {
  if (!astro?.houses || !Array.isArray(astro.houses)) {return null;}

  const houseData = astro.houses.find(h => h.index === house);
  if (!houseData?.sign) {return null;}

  return normalizeZodiacSign(houseData.sign);
}

/**
 * Get all house signs
 */
export function getAllHouseSigns(
  astro: AstroData | undefined
): Record<HouseNumber, ZodiacSign | null> {
  const result: Record<number, ZodiacSign | null> = {};

  for (let i = 1; i <= 12; i++) {
    result[i] = getHouseSign(astro, i as HouseNumber);
  }

  return result as Record<HouseNumber, ZodiacSign | null>;
}

// ========== Planet in House ==========

/**
 * Get all planets in a specific house
 *
 * @param astro - Astro data
 * @param house - House number (1-12)
 * @returns Array of planet names in that house
 */
export function getPlanetsInHouse(
  astro: AstroData | undefined,
  house: HouseNumber
): string[] {
  if (!astro?.planets || !Array.isArray(astro.planets)) {return [];}

  return astro.planets
    .filter((p: PlanetData) => validateHouseNumber(p.house) === house)
    .map((p: PlanetData) => p.name?.toLowerCase())
    .filter((name): name is string => !!name);
}

/**
 * Count planets in a specific house
 */
export function countPlanetsInHouse(
  astro: AstroData | undefined,
  house: HouseNumber
): number {
  return getPlanetsInHouse(astro, house).length;
}

/**
 * Check if any planet is in a specific house
 */
export function hasPlanetInHouse(
  astro: AstroData | undefined,
  house: HouseNumber
): boolean {
  return getPlanetsInHouse(astro, house).length > 0;
}

/**
 * Check if a specific planet is in a specific house
 */
export function isPlanetInHouse(
  astro: AstroData | undefined,
  planetName: string,
  house: HouseNumber
): boolean {
  if (!astro?.planets || !Array.isArray(astro.planets)) {return false;}

  const normalized = normalizePlanetName(planetName);
  if (!normalized) {return false;}

  return astro.planets.some((p: PlanetData) => {
    const pName = normalizePlanetName(p.name);
    return pName === normalized && validateHouseNumber(p.house) === house;
  });
}

// ========== House Analysis ==========

/**
 * Get house for a planet
 *
 * @param astro - Astro data
 * @param planetName - Planet name
 * @returns House number or null
 */
export function getPlanetHouse(
  astro: AstroData | undefined,
  planetName: string
): HouseNumber | null {
  if (!astro?.planets) {return null;}

  const normalized = normalizePlanetName(planetName);
  if (!normalized) {return null;}

  if (Array.isArray(astro.planets)) {
    const planet = astro.planets.find(
      (p: PlanetData) => normalizePlanetName(p.name) === normalized
    );
    return validateHouseNumber(planet?.house);
  }

  return null;
}

/**
 * Get all planets grouped by house
 */
export function getPlanetsByHouse(
  astro: AstroData | undefined
): Record<HouseNumber, string[]> {
  const result: Record<number, string[]> = {};

  for (let i = 1; i <= 12; i++) {
    result[i] = getPlanetsInHouse(astro, i as HouseNumber);
  }

  return result as Record<HouseNumber, string[]>;
}

// ========== Angular Houses ==========

/**
 * Get planets in angular houses (1, 4, 7, 10)
 */
export function getPlanetsInAngularHouses(astro: AstroData | undefined): string[] {
  const angular: HouseNumber[] = [1, 4, 7, 10];
  return angular.flatMap(h => getPlanetsInHouse(astro, h));
}

/**
 * Get planets in succedent houses (2, 5, 8, 11)
 */
export function getPlanetsInSuccedentHouses(astro: AstroData | undefined): string[] {
  const succedent: HouseNumber[] = [2, 5, 8, 11];
  return succedent.flatMap(h => getPlanetsInHouse(astro, h));
}

/**
 * Get planets in cadent houses (3, 6, 9, 12)
 */
export function getPlanetsInCadentHouses(astro: AstroData | undefined): string[] {
  const cadent: HouseNumber[] = [3, 6, 9, 12];
  return cadent.flatMap(h => getPlanetsInHouse(astro, h));
}

// ========== Special House Lookups ==========

/**
 * Get 7th house sign (partnership)
 */
export function getSeventhHouseSign(astro: AstroData | undefined): ZodiacSign | null {
  return getHouseSign(astro, 7);
}

/**
 * Get 10th house sign (career/public image)
 */
export function getTenthHouseSign(astro: AstroData | undefined): ZodiacSign | null {
  return getHouseSign(astro, 10);
}

/**
 * Get Ascendant (1st house cusp) sign
 */
export function getAscendantSign(astro: AstroData | undefined): ZodiacSign | null {
  // Try direct ascendant data first
  if (astro?.ascendant?.sign) {
    return normalizeZodiacSign(astro.ascendant.sign);
  }

  // Fall back to 1st house cusp
  return getHouseSign(astro, 1);
}

/**
 * Get MC (Midheaven/10th house cusp) sign
 */
export function getMcSign(astro: AstroData | undefined): ZodiacSign | null {
  // Try direct MC data first
  if (astro?.mc?.sign) {
    return normalizeZodiacSign(astro.mc.sign);
  }

  // Fall back to 10th house cusp
  return getHouseSign(astro, 10);
}

// ========== House Domain Helpers ==========

/**
 * House domain descriptions
 */
export const HOUSE_DOMAINS: Record<HouseNumber, { ko: string; en: string; keywords: string[] }> = {
  1: { ko: '자아/외모', en: 'Self/Appearance', keywords: ['identity', 'appearance', 'self-expression'] },
  2: { ko: '재물/가치', en: 'Money/Values', keywords: ['money', 'possessions', 'self-worth'] },
  3: { ko: '소통/학습', en: 'Communication/Learning', keywords: ['communication', 'siblings', 'short trips'] },
  4: { ko: '가정/뿌리', en: 'Home/Roots', keywords: ['home', 'family', 'roots', 'mother'] },
  5: { ko: '창작/연애', en: 'Creativity/Romance', keywords: ['creativity', 'romance', 'children', 'fun'] },
  6: { ko: '일/건강', en: 'Work/Health', keywords: ['work', 'health', 'service', 'daily routine'] },
  7: { ko: '파트너십', en: 'Partnership', keywords: ['marriage', 'partnership', 'contracts', 'open enemies'] },
  8: { ko: '변환/공유자원', en: 'Transformation/Shared Resources', keywords: ['transformation', 'death', 'shared resources', 'inheritance'] },
  9: { ko: '철학/해외', en: 'Philosophy/Foreign', keywords: ['higher education', 'travel', 'philosophy', 'religion'] },
  10: { ko: '커리어/명성', en: 'Career/Reputation', keywords: ['career', 'reputation', 'father', 'authority'] },
  11: { ko: '친구/희망', en: 'Friends/Hopes', keywords: ['friends', 'groups', 'hopes', 'humanitarian'] },
  12: { ko: '무의식/영성', en: 'Unconscious/Spirituality', keywords: ['unconscious', 'spirituality', 'hidden', 'isolation'] },
};

/**
 * Get house domain description
 */
export function getHouseDomain(house: HouseNumber, isKo: boolean): string {
  return isKo ? HOUSE_DOMAINS[house].ko : HOUSE_DOMAINS[house].en;
}
