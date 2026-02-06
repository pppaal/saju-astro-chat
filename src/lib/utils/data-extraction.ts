/**
 * Data Extraction Utilities
 * Consolidates duplicate data extraction patterns across tab components and analyzers
 *
 * Previously duplicated 8+ times across tab files
 */

// ============ Types ============

export interface SajuDataExtended {
  dayMaster?: {
    name?: string
    heavenlyStem?: string
    element?: string
  }
  fourPillars?: {
    day?: {
      heavenlyStem?: string
    }
  }
  daeun?: DaeunItem[]
  bigFortune?: DaeunItem[]
  saeun?: SaeunItem[]
  yearFortune?: SaeunItem[]
  monthPillar?: {
    heavenlyStem?: string
    earthlyBranch?: string
  }
  iljin?: IljinItem[]
  dayPillar?: {
    heavenlyStem?: string
    earthlyBranch?: string
  }
  yongsin?: string[]
  kibsin?: string[]
}

export interface DaeunItem {
  current?: boolean
  isCurrent?: boolean
  age?: number
  startAge?: number
  endAge?: number
  stem?: string
  branch?: string
  ganji?: string
  heavenlyStem?: string
  earthlyBranch?: string
}

export interface SaeunItem {
  year?: number
  current?: boolean
  isCurrent?: boolean
  stem?: string
  branch?: string
  ganji?: string
  heavenlyStem?: string
  earthlyBranch?: string
}

export interface IljinItem {
  date?: string
  stem?: string
  branch?: string
  ganji?: string
  heavenlyStem?: string
  earthlyBranch?: string
}

export interface PlanetData {
  name?: string
  planet?: string
  sign?: string
  house?: number
  longitude?: number
  retrograde?: boolean
}

export interface AstroData {
  planets?: PlanetData[]
  sunSign?: string
  moonSign?: string
  ascendant?: string
  aspects?: unknown[]
}

// ============ Saju Data Extraction ============

/**
 * Extracts the day master name from Saju data
 * Previously duplicated 8+ times across tab files
 */
export function extractDayMaster(saju: SajuDataExtended | null | undefined): string {
  if (!saju) return ''
  return (
    saju.dayMaster?.name ??
    saju.dayMaster?.heavenlyStem ??
    saju.fourPillars?.day?.heavenlyStem ??
    ''
  )
}

/**
 * Extracts the day master element from Saju data
 */
export function extractDayMasterElement(saju: SajuDataExtended | null | undefined): string {
  if (!saju) return ''
  return saju.dayMaster?.element ?? ''
}

/**
 * Finds the current daeun (10-year luck cycle) from the array
 */
export function findCurrentDaeun(saju: SajuDataExtended | null | undefined): DaeunItem | null {
  if (!saju) return null
  const daeun = saju.daeun ?? saju.bigFortune
  if (!Array.isArray(daeun)) return null
  return daeun.find((d) => d.current || d.isCurrent) ?? null
}

/**
 * Finds the current saeun (annual luck) from the array
 */
export function findCurrentSaeun(saju: SajuDataExtended | null | undefined): SaeunItem | null {
  if (!saju) return null
  const saeun = saju.saeun ?? saju.yearFortune
  if (!Array.isArray(saeun)) return null
  return saeun.find((s) => s.current || s.isCurrent) ?? null
}

/**
 * Extracts yongsin (favorable elements) from Saju data
 */
export function extractYongsin(saju: SajuDataExtended | null | undefined): string[] {
  if (!saju) return []
  return saju.yongsin ?? []
}

/**
 * Extracts kibsin (unfavorable elements) from Saju data
 */
export function extractKibsin(saju: SajuDataExtended | null | undefined): string[] {
  if (!saju) return []
  return saju.kibsin ?? []
}

// ============ Astrology Data Extraction ============

/**
 * Finds a planet's sign from the planets array
 * Previously duplicated 12+ times
 */
export function findPlanetSign(
  planets: PlanetData[] | null | undefined,
  planetName: string
): string | undefined {
  if (!planets || !Array.isArray(planets)) return undefined
  const lowerName = planetName.toLowerCase()
  const planet = planets.find(
    (p) =>
      p.name?.toLowerCase() === lowerName ||
      p.planet?.toLowerCase() === lowerName
  )
  return planet?.sign
}

/**
 * Finds a planet's house from the planets array
 */
export function findPlanetHouse(
  planets: PlanetData[] | null | undefined,
  planetName: string
): number | undefined {
  if (!planets || !Array.isArray(planets)) return undefined
  const lowerName = planetName.toLowerCase()
  const planet = planets.find(
    (p) =>
      p.name?.toLowerCase() === lowerName ||
      p.planet?.toLowerCase() === lowerName
  )
  return planet?.house
}

/**
 * Finds a planet's longitude from the planets array
 */
export function findPlanetLongitude(
  planets: PlanetData[] | null | undefined,
  planetName: string
): number | undefined {
  if (!planets || !Array.isArray(planets)) return undefined
  const lowerName = planetName.toLowerCase()
  const planet = planets.find(
    (p) =>
      p.name?.toLowerCase() === lowerName ||
      p.planet?.toLowerCase() === lowerName
  )
  return planet?.longitude
}

/**
 * Checks if a planet is retrograde
 */
export function isPlanetRetrograde(
  planets: PlanetData[] | null | undefined,
  planetName: string
): boolean {
  if (!planets || !Array.isArray(planets)) return false
  const lowerName = planetName.toLowerCase()
  const planet = planets.find(
    (p) =>
      p.name?.toLowerCase() === lowerName ||
      p.planet?.toLowerCase() === lowerName
  )
  return planet?.retrograde ?? false
}

/**
 * Extracts planets array from astro data
 */
export function extractPlanets(astro: AstroData | null | undefined): PlanetData[] {
  if (!astro) return []
  return (astro.planets as PlanetData[]) ?? []
}

/**
 * Extracts the sun sign from astro data
 */
export function extractSunSign(astro: AstroData | null | undefined): string | undefined {
  if (!astro) return undefined
  return astro.sunSign
}

/**
 * Extracts the moon sign from astro data
 */
export function extractMoonSign(astro: AstroData | null | undefined): string | undefined {
  if (!astro) return undefined
  return astro.moonSign
}

/**
 * Extracts the ascendant from astro data
 */
export function extractAscendant(astro: AstroData | null | undefined): string | undefined {
  if (!astro) return undefined
  return astro.ascendant
}

// ============ Combined Extraction ============

/**
 * Extracts all common Saju data in one call
 */
export function extractSajuData(saju: SajuDataExtended | null | undefined) {
  return {
    dayMaster: extractDayMaster(saju),
    dayMasterElement: extractDayMasterElement(saju),
    currentDaeun: findCurrentDaeun(saju),
    currentSaeun: findCurrentSaeun(saju),
    yongsin: extractYongsin(saju),
    kibsin: extractKibsin(saju),
  }
}

/**
 * Extracts all common astrology data in one call
 */
export function extractAstroData(astro: AstroData | null | undefined) {
  const planets = extractPlanets(astro)
  return {
    planets,
    sunSign: extractSunSign(astro),
    moonSign: extractMoonSign(astro),
    ascendant: extractAscendant(astro),
    jupiterSign: findPlanetSign(planets, 'jupiter'),
    jupiterHouse: findPlanetHouse(planets, 'jupiter'),
    saturnSign: findPlanetSign(planets, 'saturn'),
    saturnHouse: findPlanetHouse(planets, 'saturn'),
    marsSign: findPlanetSign(planets, 'mars'),
    venusSign: findPlanetSign(planets, 'venus'),
  }
}

/**
 * Extracts both Saju and Astro data in one call
 */
export function extractAllData(
  saju: SajuDataExtended | null | undefined,
  astro: AstroData | null | undefined
) {
  return {
    saju: extractSajuData(saju),
    astro: extractAstroData(astro),
  }
}
