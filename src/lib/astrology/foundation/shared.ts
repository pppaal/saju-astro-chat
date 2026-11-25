// src/lib/astrology/foundation/shared.ts
// Shared utilities for astrology calculations - prevents code duplication

import { getSwisseph } from './ephe'
import { NatalInput, PlanetBase, House } from './types'
import { formatLongitude, normalize360 } from './utils'
import { toAstroPlanetId, toAstroPointId } from '../graphIds'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'
import { logger } from '@/lib/logger'
import { resolveBirthInstant } from '@/lib/datetime/resolveBirthInstant'

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
  if (natal.hour < 0 || natal.hour > 23 || natal.minute < 0 || natal.minute > 59) {
    throw new Error(
      `Invalid natal datetime: ${natal.year}-${natal.month}-${natal.date} ${natal.hour}:${natal.minute}`
    )
  }

  // 출생 instant — 사주(calculateSajuData)와 같은 resolver(OD-3, RFC 5545). 서머타임
  // 공백은 직전 offset, 겹침은 첫 번째. 옛 dayjs.tz 는 겹침 offset 을 *서버의 현재* DST
  // 상태로 골라 서버 날짜에 따라 JD 가 1시간 흔들렸고(ASTRO-7), 공백 시각은 사주와
  // 1시간 다른 순간을 냈다(F4).
  let utcDate: Date
  try {
    utcDate = resolveBirthInstant(
      {
        year: natal.year,
        month: natal.month,
        day: natal.date,
        hour: natal.hour,
        minute: natal.minute,
      },
      natal.timeZone
    ).utc
  } catch {
    throw new Error(
      `Invalid natal datetime: ${natal.year}-${natal.month}-${natal.date} ${natal.hour}:${natal.minute}`
    )
  }

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
 * 'YYYY-MM-DD' + 선택적 [T 또는 공백]HH:mm[:ss[.fff]] + 선택적 'Z' / ±hh:mm(±hhmm).
 * 소수 초는 버린다 — swe_utc_to_jd 에 정수 초만 넘기던 옛 동작과 같다.
 */
const ISO_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?)?(Z|[+-]\d{2}:?\d{2})?$/i

/** ISO 문자열 → UTC instant. 형식·날짜가 틀리면 null. */
function parseIsoInstant(iso: string, timeZone: string): Date | null {
  const m = ISO_DATETIME.exec(iso.trim())
  if (!m) return null
  const wall = {
    year: Number(m[1]),
    month: Number(m[2]),
    day: Number(m[3]),
    hour: Number(m[4] ?? 0),
    minute: Number(m[5] ?? 0),
    second: Number(m[6] ?? 0),
  }
  const suffix = m[7]
  try {
    if (!suffix) {
      // 접미사 없는 벽시계 — 출생 시각과 같은 resolver(RFC 5545 공백·겹침, 서버 시계 무관).
      return resolveBirthInstant(wall, timeZone).utc
    }
    // 절대 순간: 벽시계를 UTC 로 읽고 offset 만큼 되돌린다(timeZone 인자는 무시).
    const asUtc = resolveBirthInstant(wall, 'UTC').utc.getTime()
    if (suffix.toUpperCase() === 'Z') return new Date(asUtc)
    const sign = suffix[0] === '-' ? -1 : 1
    const digits = suffix.slice(1).replace(':', '')
    const offH = Number(digits.slice(0, 2))
    const offM = Number(digits.slice(2, 4))
    if (offH > 23 || offM > 59) return null
    return new Date(asUtc - sign * (offH * 60 + offM) * 60_000)
  } catch {
    return null
  }
}

/**
 * Convert ISO string to Julian Day
 *
 * - 'Z' 또는 ±hh:mm 이 붙은 문자열은 *절대 순간* 이라 그대로 존중한다 —
 *   timeZone 인자는 무시. 옛 구현은 dayjs.tz(iso, tz) 가 접미사를 버리고 UTC
 *   문자열을 tz 의 벽시계로 읽어, 서울 사용자의 '현재 트랜짓' 이 9시간 이르게
 *   계산됐다(감사 ASTRO-4).
 * - 접미사 없는 벽시계 문자열('YYYY-MM-DD[THH:mm[:ss]]')만 timeZone 으로 해석하며,
 *   natalToJD 와 같은 resolveBirthInstant 를 쓴다(OD-3 — 공백은 직전 offset, 겹침은
 *   첫 번째). 옛 dayjs.tz 는 겹침 offset 을 서버의 현재 DST 상태로 골랐다(ASTRO-7·F4).
 *
 * @param iso - ISO datetime string
 * @param timeZone - IANA timezone for offset-less wall-clock strings
 * @returns Julian Day (UT)
 */
export function isoToJD(iso: string, timeZone: string): number {
  const swisseph = getSwisseph()

  const utcDate = parseIsoInstant(iso, timeZone)
  if (!utcDate) {
    throw new Error(`Invalid ISO datetime: ${iso}`)
  }

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
export function resolveHouseOrWarn(longitude: number, cusps: number[], context: string): number {
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
 *
 * 파라미터가 unknown 인 이유: swisseph C 바인딩의 결과 타입은 빌드/버전에
 * 따라 필드 구성이 달라 정적 타입으로 고정할 수 없다. 예전엔 호출부 24곳이
 * 각자 `as unknown as Record<string, unknown>` 로 캐스팅했는데, 검증 없는
 * 캐스트가 흩어지는 대신 이 두 헬퍼가 유일한 경계가 되어 런타임으로
 * 좁힌다. 호출부는 swe_calc_ut 결과를 그대로 넘기면 된다.
 */
export function extractLongitudeSpeed(result: unknown): number | undefined {
  if (typeof result !== 'object' || result === null) return undefined
  const r = result as Record<string, unknown>
  const longitudeSpeed = r.longitudeSpeed
  if (typeof longitudeSpeed === 'number' && Number.isFinite(longitudeSpeed)) {
    return longitudeSpeed
  }
  const speed = r.speed
  if (typeof speed === 'number' && Number.isFinite(speed)) {
    return speed
  }
  return undefined
}

export function extractSwissLongitude(result: unknown): number {
  if (typeof result === 'object' && result !== null) {
    const longitude = (result as Record<string, unknown>).longitude
    if (typeof longitude === 'number' && Number.isFinite(longitude)) {
      return longitude
    }
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
