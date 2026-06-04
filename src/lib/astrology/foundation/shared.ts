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
import { logger } from '@/lib/logger'

// ============================================================
// Planet List (cached singleton)
// ============================================================

// Cache keyed by the config that actually influences the result. When the
// relevant config (node type) changes, the key changes and the value is
// recomputed — so config edits (and test overrides) take effect instead of
// being frozen at first call.
let planetListCache: { key: string; value: Record<string, number> } | null = null

/**
 * Get the standard planet list with Swiss Ephemeris IDs.
 * Cached, but the cache is keyed on the config that affects the output, so a
 * change to `CALCULATION_STANDARDS.astrology.nodeType` is honored.
 */
export function getPlanetList(): Record<string, number> {
  const nodeType = CALCULATION_STANDARDS.astrology.nodeType
  const key = `node:${nodeType}`
  if (planetListCache && planetListCache.key === key) {
    return planetListCache.value
  }

  const sw = getSwisseph()
  const useTrueNode = nodeType === 'true'
  const meanNodeId = (sw as unknown as { SE_MEAN_NODE?: number }).SE_MEAN_NODE
  const nodeId = useTrueNode ? sw.SE_TRUE_NODE : (meanNodeId ?? sw.SE_TRUE_NODE)
  const nodeLabel = useTrueNode ? 'True Node' : 'Mean Node'
  const value = {
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
  planetListCache = { key, value }
  return value
}

/**
 * Reset cached config-derived singletons (planet list, flags). Intended for
 * tests that mutate CALCULATION_STANDARDS between cases.
 */
export function resetSharedCaches(): void {
  planetListCache = null
  swFlagsCache = null
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

/**
 * Convert a progression / direction TARGET date to Julian Day deterministically.
 *
 * The target date ("which date to progress to", usually today) must NOT be
 * parsed in the host/server timezone — `dayjs('2026-06-04')` resolves to local
 * midnight, so the day-count shifts by the deploy region's UTC offset and the
 * result becomes non-deterministic across regions (up to ~1 day off).
 *
 * Convention (single source of truth for all date-only target inputs): a bare
 * 'YYYY-MM-DD' is anchored to **noon UTC** — farthest from either midnight, so
 * the slow-moving progressed/directed points never flip a calendar day — while
 * an explicit datetime is honored as UTC. Server-location independent.
 */
export function targetDateToJD(targetDate: string): number {
  const trimmed = targetDate.trim()
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T12:00:00` : trimmed
  return isoToJD(iso, 'UTC')
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
 * Sentinel returned when a longitude matches no house cusp (malformed cusps).
 * Distinct from any real house (1-12) so the unknown placement is observable
 * downstream instead of being silently fabricated as a plausible house.
 */
export const UNKNOWN_HOUSE = 0

/**
 * Pure cusp lookup: which 1-12 house does `longitude` fall into, given 12
 * cusps in degrees? Returns `null` when nothing matches (e.g. fewer than 12
 * cusps, NaN cusps, or otherwise malformed input). Handles 360 wrap-around.
 *
 * This is the single source of truth for house inference. Both
 * `findHouseForLongitude` (House[]) and `inferHouseOf` (number[]) delegate
 * here so there is exactly one fallback behavior, not three.
 */
export function matchHouseForCusps(longitude: number, cusps: number[]): number | null {
  if (!Array.isArray(cusps) || cusps.length < 12) {
    return null
  }
  const lon = normalize360(longitude)

  for (let i = 0; i < 12; i++) {
    const cusp = cusps[i]
    const nextCusp = cusps[(i + 1) % 12]
    if (!Number.isFinite(cusp) || !Number.isFinite(nextCusp)) {
      return null
    }

    const start = normalize360(cusp)
    let end = normalize360(nextCusp)
    if (end < start) {
      end += 360
    }
    let testLon = lon
    if (testLon < start) {
      testLon += 360
    }

    if (testLon >= start && testLon < end) {
      return i + 1
    }
  }

  return null
}

/**
 * Resolve a house from raw cusps, logging an observable warning and returning
 * the UNKNOWN_HOUSE sentinel when no cusp matches. Centralizes the previously
 * divergent silent fallbacks (12 in houses.ts, 1 here).
 */
export function resolveHouseOrWarn(
  longitude: number,
  cusps: number[],
  context: string
): number {
  const match = matchHouseForCusps(longitude, cusps)
  if (match !== null) {
    return match
  }
  logger.warn(`[astrology] house inference fell through; cusps may be malformed`, {
    context,
    longitude,
    cuspCount: Array.isArray(cusps) ? cusps.length : 0,
  })
  return UNKNOWN_HOUSE
}

/**
 * Find which house a longitude falls into.
 * @param longitude - The longitude to check
 * @param houses - Array of house objects with cusp property
 * @returns House number (1-12), or UNKNOWN_HOUSE (0) if no cusp matches
 */
export function findHouseForLongitude(longitude: number, houses: House[]): number {
  const cusps = Array.isArray(houses) ? houses.map((h) => h?.cusp) : []
  return resolveHouseOrWarn(longitude, cusps, 'findHouseForLongitude')
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

export function extractSwissLongitude(result: Record<string, unknown>): number {
  const longitude = result.longitude
  if (typeof longitude === 'number' && Number.isFinite(longitude)) {
    return longitude
  }
  throw new Error('Unexpected coordinate system: longitude is not available')
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
