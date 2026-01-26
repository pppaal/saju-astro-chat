/**
 * @file Element compatibility utility functions for astrology analysis
 */

/**
 * Check if two elements are compatible (harmonious)
 */
export function isCompatibleElement(el1: string, el2: string): boolean {
  const compatible: Record<string, string[]> = {
    fire: ['air', 'fire'],
    earth: ['water', 'earth'],
    air: ['fire', 'air'],
    water: ['earth', 'water'],
  };
  return compatible[el1]?.includes(el2) ?? false;
}

/**
 * Check if two elements are neutral
 */
export function isNeutralElement(el1: string, el2: string): boolean {
  return !isCompatibleElement(el1, el2) && !isIncompatibleElement(el1, el2);
}

/**
 * Check if two elements are incompatible (challenging)
 */
export function isIncompatibleElement(el1: string, el2: string): boolean {
  const incompatible: Record<string, string[]> = {
    fire: ['water'],
    water: ['fire'],
    air: ['earth'],
    earth: ['air'],
  };
  return incompatible[el1]?.includes(el2) ?? false;
}

/**
 * Get element for a zodiac sign
 */
export function getElementForSign(sign: string): string {
  const elementMap: Record<string, string> = {
    Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
    Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
    Gemini: 'air', Libra: 'air', Aquarius: 'air',
    Cancer: 'water', Scorpio: 'water', Pisces: 'water',
  };
  return elementMap[sign] || 'unknown';
}

/**
 * Calculate ecliptic degree from sign and degree within sign
 */
export function calculateEclipticDegree(sign: string, degreeInSign: number = 15): number {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const signIndex = signs.indexOf(sign);
  return signIndex >= 0 ? (signIndex * 30) + degreeInSign : 0;
}

/**
 * Calculate exact angle between two degrees
 */
export function calculateExactAngle(degree1: number, degree2: number): number {
  let angle = Math.abs(degree1 - degree2);
  if (angle > 180) {angle = 360 - angle;}
  return angle;
}

/**
 * Get sign from ecliptic degree
 */
export function getSignFromDegree(degree: number): string {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const normalizedDegree = ((degree % 360) + 360) % 360;
  const signIndex = Math.floor(normalizedDegree / 30);
  return signs[signIndex];
}

/**
 * Get degree within sign from ecliptic degree
 */
export function getDegreeInSign(eclipticDegree: number): number {
  return eclipticDegree % 30;
}
