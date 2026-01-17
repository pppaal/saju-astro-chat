import type { AstroData, PlanetData } from '../types';

export function findPlanetSign(astro: AstroData | null | undefined, planetName: string): string | null {
  if (Array.isArray(astro?.planets)) {
    const planet = astro.planets.find((p: PlanetData) => p?.name?.toLowerCase() === planetName.toLowerCase());
    if (planet?.sign) return planet.sign.toLowerCase();
  }
  // planets가 Record<string, { sign?: string }> 형태인 경우 (union 타입의 두 번째 케이스)
  if (astro?.planets && !Array.isArray(astro.planets)) {
    const planetRecord = astro.planets; // TypeScript가 자동으로 Record<string, { sign?: string }> 타입으로 추론
    if (planetRecord[planetName]?.sign) {
      return planetRecord[planetName].sign.toLowerCase();
    }
  }
  if (astro?.facts) {
    // facts는 이미 Record<string, { sign?: string }> 타입으로 정의됨
    if (astro.facts[planetName]?.sign) {
      return astro.facts[planetName].sign.toLowerCase();
    }
  }
  return null;
}
