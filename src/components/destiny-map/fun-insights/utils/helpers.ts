import type { AstroData, PlanetData } from '../types';

export function findPlanetSign(astro: AstroData | null | undefined, planetName: string): string | null {
  if (Array.isArray(astro?.planets)) {
    const planet = astro.planets.find((p: PlanetData) => p?.name?.toLowerCase() === planetName.toLowerCase());
    if (planet?.sign) return planet.sign.toLowerCase();
  }
  if (astro?.planets && !Array.isArray(astro.planets)) {
    const planetRecord = astro.planets as unknown as Record<string, { sign?: string }>;
    if (planetRecord[planetName]?.sign) {
      return planetRecord[planetName].sign.toLowerCase();
    }
  }
  if (astro?.facts) {
    const facts = astro.facts as Record<string, { sign?: string }>;
    if (facts[planetName]?.sign) {
      return facts[planetName].sign.toLowerCase();
    }
  }
  return null;
}
