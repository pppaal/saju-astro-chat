/**
 * Regression tests for unified house-inference fallback + polar fallback meta label.
 *
 * Covers review findings:
 *  1. inferHouseOf / findHouseForLongitude / matchHouseForCusps share ONE
 *     fallback: on malformed cusps they no longer fabricate a plausible house
 *     (12 or 1). They return UNKNOWN_HOUSE (0) and emit an observable warning.
 *  2. The Placidus -> WholeSign polar fallback tags the ACTUAL house system
 *     used (WholeSign) on the calcHouses result, so meta is not mislabeled.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { inferHouseOf } from '@/lib/astrology/foundation/houses'
import {
  findHouseForLongitude,
  matchHouseForCusps,
  resolveHouseOrWarn,
  UNKNOWN_HOUSE,
} from '@/lib/astrology/foundation/shared'
import { logger } from '@/lib/logger'
import type { House } from '@/lib/astrology/foundation/types'

const VALID_CUSPS = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]

function toHouses(cusps: number[]): House[] {
  return cusps.map((cusp, i) => ({
    index: i + 1,
    cusp,
    sign: 'Aries' as House['sign'],
    formatted: '',
  }))
}

describe('matchHouseForCusps (single source of truth)', () => {
  it('returns the correct 1-12 house for valid cusps', () => {
    expect(matchHouseForCusps(15, VALID_CUSPS)).toBe(1)
    expect(matchHouseForCusps(100, VALID_CUSPS)).toBe(4)
    expect(matchHouseForCusps(345, VALID_CUSPS)).toBe(12)
  })

  it('returns null (not a fabricated house) when cusps are malformed', () => {
    expect(matchHouseForCusps(15, [])).toBeNull()
    expect(matchHouseForCusps(15, [0, 30, 60])).toBeNull() // < 12 cusps
    const withNaN = [...VALID_CUSPS]
    withNaN[5] = NaN
    expect(matchHouseForCusps(160, withNaN)).toBeNull()
  })
})

describe('unified fallback: inferHouseOf & findHouseForLongitude', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('inferHouseOf and findHouseForLongitude agree on valid cusps', () => {
    for (let i = 0; i < 12; i++) {
      const lon = VALID_CUSPS[i] + 15
      expect(inferHouseOf(lon, VALID_CUSPS)).toBe(i + 1)
      expect(findHouseForLongitude(lon, toHouses(VALID_CUSPS))).toBe(i + 1)
    }
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('inferHouseOf returns UNKNOWN_HOUSE and warns on malformed cusps (was silently 12)', () => {
    const result = inferHouseOf(123, [0, 30, 60]) // too few cusps
    expect(result).toBe(UNKNOWN_HOUSE)
    expect(result).not.toBe(12)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('findHouseForLongitude returns UNKNOWN_HOUSE and warns on malformed cusps (was silently 1)', () => {
    const result = findHouseForLongitude(123, toHouses([0, 30, 60]))
    expect(result).toBe(UNKNOWN_HOUSE)
    expect(result).not.toBe(1)
    expect(warnSpy).toHaveBeenCalledTimes(1)
  })

  it('both helpers share the SAME fallback value (no three divergent defaults)', () => {
    const a = inferHouseOf(50, [])
    const b = findHouseForLongitude(50, [])
    const c = resolveHouseOrWarn(50, [], 'test')
    expect(a).toBe(b)
    expect(b).toBe(c)
    expect(a).toBe(UNKNOWN_HOUSE)
  })
})

describe('Placidus -> WholeSign polar fallback meta label', () => {
  // calcHouses is dynamically imported per-case so the ephemeris mock applies.
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  async function loadCalcHousesWithMock(placidusErrors: boolean) {
    const swMock = {
      swe_houses: vi.fn((_jd: number, _lat: number, _lon: number, hsys: string) => {
        if (hsys === 'P' && placidusErrors) {
          return { error: "Can't calculate houses" }
        }
        // Both 'P' and 'W' return a usable shape.
        return {
          ascendant: 125, // Leo
          mc: 35,
          house: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
        }
      }),
    }
    vi.doMock('@/lib/astrology/foundation/ephe', () => ({
      getSwisseph: () => swMock,
    }))
    const mod = await import('@/lib/astrology/foundation/houses')
    return { calcHouses: mod.calcHouses, swMock }
  }

  it('tags houseSystem=Placidus when Placidus succeeds', async () => {
    const { calcHouses } = await loadCalcHousesWithMock(false)
    const res = calcHouses(2451545, 51.5, -0.1, 'Placidus') as { houseSystem: string }
    expect(res.houseSystem).toBe('Placidus')
  })

  it('tags houseSystem=WholeSign (actual system) when polar Placidus falls back', async () => {
    const { calcHouses, swMock } = await loadCalcHousesWithMock(true)
    const res = calcHouses(2451545, 78.0, 15.0, 'Placidus') as { houseSystem: string }
    // The fallback fired (P errored, W produced cusps) so the label must
    // reflect WholeSign, not the requested Placidus.
    expect(res.houseSystem).toBe('WholeSign')
    // Sanity: 'W' was actually invoked for the fallback.
    expect(swMock.swe_houses).toHaveBeenCalledWith(2451545, 78.0, 15.0, 'W')
  })

  it('tags houseSystem=WholeSign for an explicit WholeSign request', async () => {
    const { calcHouses } = await loadCalcHousesWithMock(false)
    const res = calcHouses(2451545, 51.5, -0.1, 'WholeSign') as { houseSystem: string }
    expect(res.houseSystem).toBe('WholeSign')
  })
})
