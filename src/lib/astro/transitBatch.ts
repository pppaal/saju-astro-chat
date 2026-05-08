// Batch transit planets — strips out house calculation and house cusps
// since aspects are purely longitude-based. Lets us compute 365 days of
// transit data in a single tight loop instead of paying the heavy
// `calcHouses` cost per date.

import {
  getPlanetList,
  isoToJD,
  extractLongitudeSpeed,
  extractSwissLongitude,
} from './shared'
import { getSwisseph } from './ephe'
export interface TransitPlanetLite {
  name: string
  longitude: number
  speed?: number
  retrograde?: boolean
}
export interface TransitPlanetsLite {
  iso: string
  jdUT: number
  planets: TransitPlanetLite[]
}

/**
 * Compute planet positions only (no houses) for a single date.
 * Faster than calculateTransitChart for batch use cases.
 */
export function calculateTransitPlanetsOnly(
  iso: string,
  timeZone = 'Asia/Seoul'
): TransitPlanetsLite {
  const swisseph = getSwisseph()
  const PLANET_LIST = getPlanetList()
  const SW_FLAGS = swisseph.SEFLG_SPEED
  const ut_jd = isoToJD(iso, timeZone)

  const planets: TransitPlanetLite[] = Object.entries(PLANET_LIST).map(([name, id]) => {
    const res = swisseph.swe_calc_ut(ut_jd, id, SW_FLAGS)
    if ('error' in res) {
      throw new Error(`swe_calc_ut(${name}): ${res.error}`)
    }
    const longitude = extractSwissLongitude(res as unknown as Record<string, unknown>)
    const speed = extractLongitudeSpeed(res as unknown as Record<string, unknown>)
    const retrograde = typeof speed === 'number' ? speed < 0 : undefined
    return { name, longitude, speed, retrograde }
  })
  return { iso, jdUT: ut_jd, planets }
}

/**
 * Batch over many dates. Synchronous (Swiss ephemeris is in-process and
 * fast enough that async wrapping just adds Promise overhead). 365 days
 * for our calendar use case takes ~1-3s on a warm node.
 */
export function calculateTransitPlanetsBatch(
  isoList: string[],
  timeZone = 'Asia/Seoul'
): TransitPlanetsLite[] {
  return isoList.map((iso) => calculateTransitPlanetsOnly(iso, timeZone))
}

// ── Aspect detection (longitude-only) ──
// Mirrors findTransitAspects but operates on plain longitude pairs so we
// don't need to construct full Chart objects per date.
const ASPECT_ANGLES: Record<string, number> = {
  conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180,
}
const ASPECT_ORBS: Record<string, number> = {
  conjunction: 6, opposition: 6, trine: 5, square: 5, sextile: 4,
}
// Trine/sextile: harmonious → +; square/opposition: friction → -;
// conjunction: neutral but amplified by planet identity (Saturn = -, Jupiter = +)
const ASPECT_BASE_SCORE: Record<string, number> = {
  conjunction: 0, sextile: 3, square: -5, trine: 5, opposition: -5,
}
const PLANET_WEIGHT: Record<string, number> = {
  Sun: 1.5, Moon: 1.5, Mercury: 1.0, Venus: 1.0, Mars: 1.2,
  Jupiter: 1.4, Saturn: 1.4, Uranus: 1.0, Neptune: 1.0, Pluto: 1.0,
}
// Conjunction polarity by planet (benefic vs malefic).
const CONJUNCTION_POLARITY: Record<string, number> = {
  Sun: 2, Moon: 2, Mercury: 1, Venus: 4, Mars: -3,
  Jupiter: 5, Saturn: -4, Uranus: -1, Neptune: 0, Pluto: -2,
}

function angleDiff(a: number, b: number): number {
  const d = ((a - b) % 360 + 360) % 360
  return d > 180 ? 360 - d : d
}

export interface NatalLongitudes {
  /** name → longitude, e.g. Sun: 320.5, Moon: 95.2, Ascendant: 145, MC: 35 */
  [name: string]: number
}

/**
 * Score a single day's transit-to-natal aspects. Returns score (0-100,
 * 50 = neutral) plus the 3 tightest hits for narrative use.
 */
export function scoreTransitDay(
  natalLongs: NatalLongitudes,
  transit: TransitPlanetsLite
): {
  score: number
  tightest: Array<{ transitPlanet: string; natalPoint: string; aspect: string; orb: number }>
} {
  const hits: Array<{
    transitPlanet: string
    natalPoint: string
    aspect: string
    orb: number
    contribution: number
  }> = []

  for (const transitPlanet of transit.planets) {
    const tName = transitPlanet.name
    const planetWeight = PLANET_WEIGHT[tName] ?? 1.0
    for (const [natalName, natalLon] of Object.entries(natalLongs)) {
      const diff = angleDiff(transitPlanet.longitude, natalLon)
      for (const [aspectType, targetAngle] of Object.entries(ASPECT_ANGLES)) {
        const orb = Math.abs(diff - targetAngle)
        const maxOrb = ASPECT_ORBS[aspectType]
        if (orb > maxOrb) continue
        const tightness = 1 - orb / maxOrb
        const baseScore =
          aspectType === 'conjunction'
            ? CONJUNCTION_POLARITY[tName] ?? 0
            : ASPECT_BASE_SCORE[aspectType] ?? 0
        const contribution = baseScore * planetWeight * tightness
        hits.push({
          transitPlanet: tName,
          natalPoint: natalName,
          aspect: aspectType,
          orb,
          contribution,
        })
      }
    }
  }

  const total = hits.reduce((s, h) => s + h.contribution, 0)
  // Empirical: typical day total ranges -25..+25 so scale by 2 to spread
  // across 0-100 around neutral 50.
  const score = Math.max(0, Math.min(100, 50 + total * 2))
  const tightest = hits
    .slice()
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 3)
    .map(({ transitPlanet, natalPoint, aspect, orb }) => ({
      transitPlanet,
      natalPoint,
      aspect,
      orb,
    }))
  return { score: Math.round(score), tightest }
}
