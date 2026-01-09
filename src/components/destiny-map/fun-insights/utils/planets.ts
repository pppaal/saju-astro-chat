/**
 * Planet name normalization and extraction utilities
 * Handles various formats: "North Node", "northnode", "Rahu", etc.
 */

import type { StandardPlanetName, AspectType } from '../types/core';
import type { AstroData, PlanetData } from '../types';

// ========== Planet Name Normalization ==========

/**
 * Canonical planet name mappings
 * Maps various input formats to standardized lowercase names
 */
const PLANET_ALIASES: Record<string, StandardPlanetName> = {
  // Standard forms
  'sun': 'sun',
  'moon': 'moon',
  'mercury': 'mercury',
  'venus': 'venus',
  'mars': 'mars',
  'jupiter': 'jupiter',
  'saturn': 'saturn',
  'uranus': 'uranus',
  'neptune': 'neptune',
  'pluto': 'pluto',
  'chiron': 'chiron',
  'lilith': 'lilith',

  // North Node variations
  'north node': 'northnode',
  'northnode': 'northnode',
  'north_node': 'northnode',
  'nn': 'northnode',
  'rahu': 'northnode',           // Vedic name
  'true node': 'northnode',
  'truenode': 'northnode',
  'mean node': 'northnode',
  'meannode': 'northnode',
  'dragon head': 'northnode',
  'dragonhead': 'northnode',
  '용두': 'northnode',           // Korean

  // South Node variations
  'south node': 'southnode',
  'southnode': 'southnode',
  'south_node': 'southnode',
  'sn': 'southnode',
  'ketu': 'southnode',           // Vedic name
  'dragon tail': 'southnode',
  'dragontail': 'southnode',
  '용미': 'southnode',           // Korean

  // Asteroid variations
  'juno': 'juno',
  'ceres': 'ceres',
  'pallas': 'pallas',
  'pallas athena': 'pallas',
  'vesta': 'vesta',

  // Black Moon Lilith variations
  'black moon lilith': 'lilith',
  'blackmoonlilith': 'lilith',
  'bml': 'lilith',
  'mean lilith': 'lilith',
  'meanlilith': 'lilith',

  // Chiron variations
  'chiron wounded healer': 'chiron',
};

/**
 * Normalizes planet name to standard format
 * Handles: "North Node", "north node", "northnode", "Rahu", etc.
 *
 * @param name - Planet name in any format
 * @returns Standardized planet name or null if invalid
 */
export function normalizePlanetName(name: unknown): StandardPlanetName | null {
  if (typeof name !== 'string' || !name.trim()) return null;

  const key = name.toLowerCase().trim();
  return PLANET_ALIASES[key] || null;
}

/**
 * Checks if a string is a valid planet name
 */
export function isValidPlanetName(name: unknown): name is string {
  return normalizePlanetName(name) !== null;
}

// ========== Aspect Type Normalization ==========

const ASPECT_ALIASES: Record<string, AspectType> = {
  'conjunction': 'conjunction',
  'conjunct': 'conjunction',
  'con': 'conjunction',
  '0': 'conjunction',

  'opposition': 'opposition',
  'opposite': 'opposition',
  'opp': 'opposition',
  '180': 'opposition',

  'square': 'square',
  'sqr': 'square',
  '90': 'square',

  'trine': 'trine',
  'tri': 'trine',
  '120': 'trine',

  'sextile': 'sextile',
  'sex': 'sextile',
  '60': 'sextile',
};

/**
 * Normalizes aspect type to standard format
 */
export function normalizeAspectType(type: unknown): AspectType | null {
  if (typeof type !== 'string' || !type.trim()) return null;

  const key = type.toLowerCase().trim();
  return ASPECT_ALIASES[key] || null;
}

// ========== Planet Extraction from Aspect Data ==========

/**
 * Extract planet name from aspect's from/to field
 * Handles both string and object formats: "venus" or { name: "Venus" }
 */
export function extractAspectPlanetName(value: unknown): StandardPlanetName | null {
  if (typeof value === 'string') {
    return normalizePlanetName(value);
  }

  if (value && typeof value === 'object') {
    if ('name' in value) {
      return normalizePlanetName((value as { name?: unknown }).name);
    }
    // Handle objects that might be the planet itself
    if ('sign' in value) {
      return null; // It's planet data, not a name reference
    }
  }

  return null;
}

// ========== Planet Data Extraction ==========

/**
 * Find a planet in the planets array/object by standardized name
 */
export function findPlanet(
  planets: PlanetData[] | Record<string, { sign?: string }> | undefined,
  targetName: StandardPlanetName
): PlanetData | { sign?: string; house?: number } | null {
  if (!planets) return null;

  if (Array.isArray(planets)) {
    return planets.find(p => {
      const normalized = normalizePlanetName(p.name);
      return normalized === targetName;
    }) || null;
  }

  // Handle Record format
  const planet = planets[targetName];
  if (planet) return planet;

  // Try other key formats
  for (const [key, value] of Object.entries(planets)) {
    if (normalizePlanetName(key) === targetName) {
      return value;
    }
  }

  return null;
}

/**
 * Extract planet sign by name
 */
export function extractPlanetSignByName(
  astro: AstroData | undefined,
  planetName: StandardPlanetName
): string | null {
  if (!astro?.planets) return null;

  const planet = findPlanet(astro.planets, planetName);
  if (!planet?.sign) return null;

  return planet.sign.toLowerCase();
}

/**
 * Alias for extractPlanetSignByName for backward compatibility
 */
export function getPlanetSign(
  astro: AstroData | undefined,
  planetName: string
): string | null {
  const normalized = normalizePlanetName(planetName);
  if (!normalized) return null;
  return extractPlanetSignByName(astro, normalized);
}

/**
 * Extract planet house by name
 */
export function extractPlanetHouseByName(
  astro: AstroData | undefined,
  planetName: StandardPlanetName
): number | null {
  if (!astro?.planets) return null;

  const planet = findPlanet(astro.planets, planetName);
  if (!planet || !('house' in planet) || typeof planet.house !== 'number') {
    return null;
  }

  // Validate house number
  if (planet.house >= 1 && planet.house <= 12 && Number.isInteger(planet.house)) {
    return planet.house;
  }

  return null;
}

/**
 * Extract multiple planet signs at once
 */
export function extractMultiplePlanetSigns(
  astro: AstroData | undefined,
  planetNames: StandardPlanetName[]
): Record<StandardPlanetName, string | null> {
  const result: Record<string, string | null> = {};

  for (const name of planetNames) {
    result[name] = extractPlanetSignByName(astro, name);
  }

  return result as Record<StandardPlanetName, string | null>;
}

// ========== Extra Points Extraction ==========

/**
 * Get Chiron data from astro
 */
export function getChironData(astro: AstroData | undefined): { sign?: string; house?: number } | null {
  if (!astro) return null;

  // Check extraPoints
  if (astro.extraPoints?.chiron) {
    return astro.extraPoints.chiron;
  }

  // Check advancedAstrology
  if (astro.advancedAstrology?.chiron) {
    return astro.advancedAstrology.chiron;
  }

  // Check planets array
  return findPlanet(astro.planets, 'chiron');
}

/**
 * Get Lilith data from astro
 */
export function getLilithData(astro: AstroData | undefined): { sign?: string; house?: number } | null {
  if (!astro) return null;

  if (astro.extraPoints?.lilith) {
    return astro.extraPoints.lilith;
  }

  if (astro.advancedAstrology?.lilith) {
    return astro.advancedAstrology.lilith;
  }

  return findPlanet(astro.planets, 'lilith');
}

/**
 * Get Vertex data from astro
 */
export function getVertexData(astro: AstroData | undefined): { sign?: string; house?: number } | null {
  if (!astro) return null;

  if (astro.extraPoints?.vertex) {
    return astro.extraPoints.vertex;
  }

  if (astro.advancedAstrology?.vertex) {
    return astro.advancedAstrology.vertex;
  }

  return null;
}

/**
 * Get Part of Fortune data from astro
 */
export function getPartOfFortuneData(astro: AstroData | undefined): { sign?: string; house?: number } | null {
  if (!astro) return null;

  if (astro.extraPoints?.partOfFortune) {
    return astro.extraPoints.partOfFortune;
  }

  if (astro.advancedAstrology?.partOfFortune) {
    return astro.advancedAstrology.partOfFortune;
  }

  return null;
}
