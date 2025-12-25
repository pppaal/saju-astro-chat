export function findPlanetSign(astro: any, planetName: string): string | null {
  if (Array.isArray(astro?.planets)) {
    const planet = astro.planets.find((p: any) => p?.name?.toLowerCase() === planetName.toLowerCase());
    if (planet?.sign) return planet.sign.toLowerCase();
  }
  if (astro?.planets?.[planetName]?.sign) {
    return astro.planets[planetName].sign.toLowerCase();
  }
  if (astro?.facts?.[planetName]?.sign) {
    return astro.facts[planetName].sign.toLowerCase();
  }
  return null;
}
