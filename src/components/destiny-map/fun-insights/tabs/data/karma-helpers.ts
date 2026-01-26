/**
 * @file KarmaTab helper functions
 * Extracted from KarmaTab.tsx for modularity
 */

import type { SajuDataExtended, PlanetData } from './karma-types';

/**
 * Find a planet's house from the planets array
 */
export function findPlanetHouse(planets: PlanetData[] | undefined, name: string): number | null {
  if (!Array.isArray(planets)) {return null;}
  const planet = planets.find((p) => p.name?.toLowerCase()?.includes(name.toLowerCase()));
  return planet?.house ?? null;
}

/**
 * Analyze five elements balance from saju data
 */
export function analyzeElements(saju: SajuDataExtended | undefined): { strongest: string; weakest: string; balance: Record<string, number> } | null {
  const elements = saju?.fiveElements;
  if (!elements) {return null;}

  const balance: Record<string, number> = {
    wood: (elements.wood as number) || (elements['목'] as number) || 0,
    fire: (elements.fire as number) || (elements['화'] as number) || 0,
    earth: (elements.earth as number) || (elements['토'] as number) || 0,
    metal: (elements.metal as number) || (elements['금'] as number) || 0,
    water: (elements.water as number) || (elements['수'] as number) || 0
  };

  const sorted = Object.entries(balance).sort(([,a], [,b]) => b - a);
  return {
    strongest: sorted[0]?.[0] || 'earth',
    weakest: sorted[sorted.length - 1]?.[0] || 'water',
    balance
  };
}
