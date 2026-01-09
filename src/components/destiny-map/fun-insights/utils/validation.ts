/**
 * Input validation utilities for saju and astro data
 * Provides type guards and validators to ensure data safety
 */

import type { ZodiacSign, HouseNumber, FiveElement, HeavenlyStem } from '../types/core';
import type { SajuData, AstroData } from '../types';

// ========== Zodiac Sign Validation ==========

const VALID_ZODIAC_SIGNS: readonly ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
];

/**
 * Validates and normalizes a zodiac sign to standard lowercase format
 *
 * @param sign - Input sign string
 * @returns Normalized zodiac sign or null if invalid
 */
export function normalizeZodiacSign(sign: unknown): ZodiacSign | null {
  if (typeof sign !== 'string' || !sign.trim()) return null;

  const normalized = sign.toLowerCase().trim();

  if (VALID_ZODIAC_SIGNS.includes(normalized as ZodiacSign)) {
    return normalized as ZodiacSign;
  }

  return null;
}

/**
 * Type guard for zodiac sign
 */
export function isValidZodiacSign(sign: unknown): sign is ZodiacSign {
  return normalizeZodiacSign(sign) !== null;
}

// ========== House Number Validation ==========

/**
 * Validates house number is within valid range (1-12)
 *
 * @param house - Input house number
 * @returns Validated house number or null if invalid
 */
export function validateHouseNumber(house: unknown): HouseNumber | null {
  if (typeof house !== 'number') return null;
  if (!Number.isInteger(house)) return null;
  if (house < 1 || house > 12) return null;

  return house as HouseNumber;
}

/**
 * Type guard for house number
 */
export function isValidHouseNumber(house: unknown): house is HouseNumber {
  return validateHouseNumber(house) !== null;
}

// ========== Five Element Validation ==========

const VALID_ELEMENTS: readonly FiveElement[] = ['wood', 'fire', 'earth', 'metal', 'water'];

const ELEMENT_ALIASES: Record<string, FiveElement> = {
  // English
  'wood': 'wood', 'fire': 'fire', 'earth': 'earth', 'metal': 'metal', 'water': 'water',
  // Korean
  '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water',
  // Alternative
  'tree': 'wood', 'soil': 'earth', 'ground': 'earth',
};

/**
 * Validates and normalizes five element
 */
export function normalizeFiveElement(element: unknown): FiveElement | null {
  if (typeof element !== 'string' || !element.trim()) return null;

  const normalized = element.toLowerCase().trim();
  return ELEMENT_ALIASES[normalized] || null;
}

/**
 * Type guard for five element
 */
export function isValidFiveElement(element: unknown): element is FiveElement {
  return normalizeFiveElement(element) !== null;
}

// ========== Heavenly Stem Validation ==========

const VALID_STEMS: readonly HeavenlyStem[] = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

const STEM_ALIASES: Record<string, HeavenlyStem> = {
  // Korean
  '갑': '갑', '을': '을', '병': '병', '정': '정', '무': '무',
  '기': '기', '경': '경', '신': '신', '임': '임', '계': '계',
  // Chinese
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
};

/**
 * Validates and normalizes heavenly stem
 */
export function normalizeHeavenlyStem(stem: unknown): HeavenlyStem | null {
  if (typeof stem !== 'string' || !stem.trim()) return null;

  const trimmed = stem.trim();
  return STEM_ALIASES[trimmed] || null;
}

/**
 * Type guard for heavenly stem
 */
export function isValidHeavenlyStem(stem: unknown): stem is HeavenlyStem {
  return normalizeHeavenlyStem(stem) !== null;
}

// ========== Saju Data Validation ==========

/**
 * Checks if saju data has minimum required fields for analysis
 */
export function validateSajuData(saju: unknown): saju is SajuData {
  if (!saju || typeof saju !== 'object') return false;

  const s = saju as Record<string, unknown>;

  // Minimum requirement: dayMaster or pillars with day
  const hasDayMaster = s.dayMaster && typeof s.dayMaster === 'object';
  const hasPillars = s.pillars && typeof s.pillars === 'object';
  const hasDayPillar = s.dayPillar && typeof s.dayPillar === 'object';

  return !!(hasDayMaster || hasPillars || hasDayPillar);
}

/**
 * Checks if saju has valid five elements data
 */
export function hasFiveElements(saju: SajuData | undefined): boolean {
  if (!saju) return false;

  const elements = saju.fiveElements || saju.elements;
  if (!elements || typeof elements !== 'object') return false;

  const entries = Object.entries(elements);
  return entries.length > 0 && entries.some(([, v]) => typeof v === 'number' && v > 0);
}

/**
 * Checks if saju has advanced analysis data
 */
export function hasAdvancedAnalysis(saju: SajuData | undefined): boolean {
  if (!saju?.advancedAnalysis) return false;

  const aa = saju.advancedAnalysis;
  return !!(aa.sibsin || aa.geokguk || aa.yongsin);
}

/**
 * Checks if saju has sinsal/shinsal data
 */
export function hasSinsalData(saju: SajuData | undefined): boolean {
  if (!saju) return false;

  const sinsal = saju.sinsal || (saju.advancedAnalysis as Record<string, unknown>)?.sinsal;
  if (!sinsal || typeof sinsal !== 'object') return false;

  const s = sinsal as Record<string, unknown>;
  return !!(
    (Array.isArray(s.luckyList) && s.luckyList.length > 0) ||
    (Array.isArray(s.unluckyList) && s.unluckyList.length > 0)
  );
}

// ========== Astro Data Validation ==========

/**
 * Checks if astro data has minimum required fields for analysis
 */
export function validateAstroData(astro: unknown): astro is AstroData {
  if (!astro || typeof astro !== 'object') return false;

  const a = astro as Record<string, unknown>;

  // Minimum: planets or houses
  const hasPlanets = a.planets && (Array.isArray(a.planets) || typeof a.planets === 'object');
  const hasHouses = Array.isArray(a.houses) && a.houses.length > 0;

  return !!(hasPlanets || hasHouses);
}

/**
 * Checks if astro has valid planet data
 */
export function hasPlanetData(astro: AstroData | undefined): boolean {
  if (!astro?.planets) return false;

  if (Array.isArray(astro.planets)) {
    return astro.planets.length > 0;
  }

  return Object.keys(astro.planets).length > 0;
}

/**
 * Checks if astro has aspect data
 */
export function hasAspectData(astro: AstroData | undefined): boolean {
  return Array.isArray(astro?.aspects) && astro.aspects.length > 0;
}

/**
 * Checks if astro has house data
 */
export function hasHouseData(astro: AstroData | undefined): boolean {
  return Array.isArray(astro?.houses) && astro.houses.length > 0;
}

/**
 * Checks if astro has extra points (Chiron, Lilith, etc.)
 */
export function hasExtraPoints(astro: AstroData | undefined): boolean {
  if (!astro) return false;

  return !!(
    astro.extraPoints?.chiron ||
    astro.extraPoints?.lilith ||
    astro.extraPoints?.vertex ||
    astro.extraPoints?.partOfFortune
  );
}

// ========== Combined Validation ==========

/**
 * Validates both saju and astro data for analysis
 * Returns info about what data is available
 */
export function validateAnalysisInput(
  saju: unknown,
  astro: unknown
): {
  isValid: boolean;
  hasSaju: boolean;
  hasAstro: boolean;
  sajuFeatures: {
    fiveElements: boolean;
    advancedAnalysis: boolean;
    sinsal: boolean;
  };
  astroFeatures: {
    planets: boolean;
    aspects: boolean;
    houses: boolean;
    extraPoints: boolean;
  };
} {
  const hasSaju = validateSajuData(saju);
  const hasAstro = validateAstroData(astro);

  const sajuData = hasSaju ? saju as SajuData : undefined;
  const astroData = hasAstro ? astro as AstroData : undefined;

  return {
    isValid: hasSaju || hasAstro,
    hasSaju,
    hasAstro,
    sajuFeatures: {
      fiveElements: hasFiveElements(sajuData),
      advancedAnalysis: hasAdvancedAnalysis(sajuData),
      sinsal: hasSinsalData(sajuData),
    },
    astroFeatures: {
      planets: hasPlanetData(astroData),
      aspects: hasAspectData(astroData),
      houses: hasHouseData(astroData),
      extraPoints: hasExtraPoints(astroData),
    },
  };
}
