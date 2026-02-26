// src/lib/astrology/foundation/shared.ts
// Shared utilities for astrology calculations - prevents code duplication

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
dayjs.extend(utc)
dayjs.extend(timezone)

import { getSwisseph } from './ephe'
import { NatalInput, PlanetBase, House } from './types'
import { formatLongitude, normalize360 } from './utils'
import { toAstroPlanetId, toAstroPointId } from '../graphIds'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'

// ============================================================
// Planet List (cached singleton)
// ============================================================

let planetListCache: Record<string, number> | null = null

/**
 * Get the standard planet list with Swiss Ephemeris IDs
 * Uses cached value after first call
 */
export function getPlanetList(): Record<string, number> {
  if (planetListCache) {
    return planetListCache
  }

  const sw = getSwisseph()
  const useTrueNode = CALCULATION_STANDARDS.astrology.nodeType === 'true'
  const meanNodeId = (sw as unknown as { SE_MEAN_NODE?: number }).SE_MEAN_NODE
  const nodeId = useTrueNode ? sw.SE_TRUE_NODE : (meanNodeId ?? sw.SE_TRUE_NODE)
  const nodeLabel = useTrueNode ? 'True Node' : 'Mean Node'
  planetListCache = {
    Sun: sw.SE_SUN,
    Moon: sw.SE_MOON,
    Mercury: sw.SE_MERCURY,
    Venus: sw.SE_VENUS,
    Mars: sw.SE_MARS,
    Jupiter: sw.SE_JUPITER,
    Saturn: sw.SE_SATURN,
    Uranus: sw.SE_URANUS,
    Neptune: sw.SE_NEPTUNE,
    Pluto: sw.SE_PLUTO,
    [nodeLabel]: nodeId,
  }
  return planetListCache
}

// ============================================================
// Julian Day Conversion
// ============================================================

/**
 * Convert NatalInput to Julian Day
 * @param natal - Birth data input
 * @returns Julian Day (UT)
 * @throws Error if datetime is invalid or conversion fails
 */
export function natalToJD(natal: NatalInput): number {
  const swisseph = getSwisseph()
  const pad = (v: number) => String(v).padStart(2, '0')

  if (natal.hour < 0 || natal.hour > 23 || natal.minute < 0 || natal.minute > 59) {
    throw new Error(
      `Invalid natal datetime: ${natal.year}-${natal.month}-${natal.date} ${natal.hour}:${natal.minute}`
    )
  }

  const local = dayjs.tz(
    `${natal.year}-${pad(natal.month)}-${pad(natal.date)}T${pad(natal.hour)}:${pad(natal.minute)}:00`,
    natal.timeZone
  )

  if (!local.isValid()) {
    throw new Error(
      `Invalid natal datetime: ${natal.year}-${natal.month}-${natal.date} ${natal.hour}:${natal.minute}`
    )
  }
  if (
    local.year() !== natal.year ||
    local.month() + 1 !== natal.month ||
    local.date() !== natal.date
  ) {
    throw new Error(
      `Invalid natal datetime: ${natal.year}-${natal.month}-${natal.date} ${natal.hour}:${natal.minute}`
    )
  }

  const utcDate = local.utc().toDate()

  const jdResult = swisseph.swe_utc_to_jd(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds(),
    swisseph.SE_GREG_CAL
  )

  if ('error' in jdResult) {
    throw new Error(`JD conversion error: ${jdResult.error}`)
  }

  return jdResult.julianDayUT
}

/**
 * Convert Julian Day to ISO string
 * @param jd - Julian Day (UT)
 * @returns ISO 8601 formatted string
 */
export function jdToISO(jd: number): string {
  const swisseph = getSwisseph()
  const result = swisseph.swe_jdut1_to_utc(jd, swisseph.SE_GREG_CAL)

  if ('error' in result) {
    throw new Error(`JD to UTC error: ${(result as { error: string }).error}`)
  }

  const { year, month, day, hour, minute, second } = result
  const pad = (n: number) => String(Math.floor(n)).padStart(2, '0')

  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}Z`
}

/**
 * Convert ISO string to Julian Day
 * @param iso - ISO datetime string
 * @param timeZone - Timezone string
 * @returns Julian Day (UT)
 */
export function isoToJD(iso: string, timeZone: string): number {
  const swisseph = getSwisseph()

  const local = dayjs.tz(iso, timeZone)
  if (!local.isValid()) {
    throw new Error(`Invalid ISO datetime: ${iso}`)
  }

  const utcDate = local.utc().toDate()

  const jdResult = swisseph.swe_utc_to_jd(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth() + 1,
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes(),
    utcDate.getUTCSeconds(),
    swisseph.SE_GREG_CAL
  )

  if ('error' in jdResult) {
    throw new Error(`JD conversion error: ${jdResult.error}`)
  }

  return jdResult.julianDayUT
}

// ============================================================
// Swiss Ephemeris Error Helpers
// ============================================================

/**
 * Type guard to check if result contains an error
 */
export function isSwissEphError<T>(result: T | { error: string }): result is { error: string } {
  return typeof result === 'object' && result !== null && 'error' in result
}

/**
 * Throw if Swiss Ephemeris result contains error
 * @param result - Swiss Ephemeris function result
 * @param context - Context string for error message
 */
export function throwIfSwissEphError<T>(
  result: T | { error: string },
  context: string
): asserts result is T {
  if (isSwissEphError(result)) {
    throw new Error(`${context}: ${result.error}`)
  }
}

// ============================================================
// Midpoint Calculation
// ============================================================

/**
 * Calculate the midpoint between two longitudes (shorter arc)
 * @param lon1 - First longitude
 * @param lon2 - Second longitude
 * @returns Midpoint longitude (0-360)
 */
export function getMidpoint(lon1: number, lon2: number): number {
  const a = normalize360(lon1)
  const b = normalize360(lon2)

  let diff = b - a
  if (diff < 0) {
    diff += 360
  }

  // Choose shorter arc
  if (diff > 180) {
    // Longer arc, use opposite midpoint
    return normalize360(a + diff / 2 + 180)
  }
  return normalize360(a + diff / 2)
}

// ============================================================
// House Utilities
// ============================================================

/**
 * Find which house a longitude falls into
 * @param longitude - The longitude to check
 * @param houses - Array of house objects with cusp property
 * @returns House number (1-12)
 */
export function findHouseForLongitude(longitude: number, houses: House[]): number {
  const lon = normalize360(longitude)

  for (let i = 0; i < 12; i++) {
    const nextI = (i + 1) % 12
    const cusp = houses[i].cusp
    let nextCusp = houses[nextI].cusp

    if (nextCusp < cusp) {
      nextCusp += 360
    }
    let testLon = lon
    if (testLon < cusp) {
      testLon += 360
    }

    if (testLon >= cusp && testLon < nextCusp) {
      return i + 1
    }
  }

  // Fallback (should not normally reach here)
  return 1
}

/**
 * Create a planet data object with house placement
 */
export function createPlanetData(
  name: string,
  longitude: number,
  houses: House[],
  speed?: number
): PlanetBase {
  const fmt = formatLongitude(longitude)
  const house = findHouseForLongitude(longitude, houses)
  const retrograde = typeof speed === 'number' ? speed < 0 : undefined

  return {
    name,
    longitude,
    sign: fmt.sign,
    degree: fmt.degree,
    minute: fmt.minute,
    formatted: fmt.formatted,
    house,
    speed,
    retrograde,
    graphId:
      name === 'True Node' || name === 'Mean Node' || name === 'North Node'
        ? (toAstroPointId('NorthNode') ?? undefined)
        : (toAstroPlanetId(name) ?? undefined),
  }
}

/**
 * Normalize Swiss Ephemeris speed field across bindings.
 * Some bindings expose `longitudeSpeed` instead of `speed`.
 */
export function extractLongitudeSpeed(result: Record<string, unknown>): number | undefined {
  const longitudeSpeed = result.longitudeSpeed
  if (typeof longitudeSpeed === 'number' && Number.isFinite(longitudeSpeed)) {
    return longitudeSpeed
  }
  const speed = result.speed
  if (typeof speed === 'number' && Number.isFinite(speed)) {
    return speed
  }
  return undefined
}

// ============================================================
// Swiss Ephemeris Flags
// ============================================================

let swFlagsCache: number | null = null

/**
 * Get standard Swiss Ephemeris calculation flags
 */
export function getSwissEphFlags(): number {
  if (swFlagsCache !== null) {
    return swFlagsCache
  }

  const sw = getSwisseph()
  swFlagsCache = sw.SEFLG_SPEED
  return swFlagsCache
}
