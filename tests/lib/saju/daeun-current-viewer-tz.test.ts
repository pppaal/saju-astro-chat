import { describe, it, expect } from 'vitest'
import { pickCurrentDaeun } from '@/app/api/saju/route'
import type { DaeunPillar } from '@/lib/saju/types'

/**
 * Regression: daeWoon.current must be selected with the VIEWER's timezone year,
 * matching how yeonun/wolun/iljin are computed in the route. Previously saju.ts
 * picked `current` using the BIRTH timezone's "now" year, so across a Jan-1
 * boundary a US viewer of a Korean chart could see the daeun "current" pillar one
 * year out of step with the annual cycles on the same screen.
 *
 * `pickCurrentDaeun` is the exact production selector used by the route.
 */

// Daeun starts at age 5, every 10 years: ages 5, 15, 25, 35, ...
const makeList = (): DaeunPillar[] =>
  [5, 15, 25, 35, 45, 55, 65, 75, 85, 95].map((age) => ({
    age,
    heavenlyStem: '甲',
    earthlyBranch: '子',
    sibsin: { cheon: '비견', ji: '비견' },
  }))

describe('pickCurrentDaeun (viewer-tz current selection)', () => {
  const list = makeList()
  // birthYear chosen so the daeun boundary (age 25 -> entered when Korean
  // age >= 25) falls exactly on the year that the two timezones disagree on.
  // Korean age = year - birthYear + 1. With birthYear 2002:
  //   year 2025 -> age 24  -> period starting age 15
  //   year 2026 -> age 25  -> period starting age 25 (boundary crossed)
  const birthYear = 2002
  const fallback = list[0]

  it('Jan-1 boundary: birth-tz still in old year, viewer-tz in new year', () => {
    // Scenario: instant just after Jan 1. In Korea it is already 2026, but for a
    // US viewer it is still 2025 (their local clock has not crossed midnight).
    // The annual cycles in the route use the VIEWER year (2025), so `current`
    // must also use 2025 -> age 24 -> the age-15 period, NOT the age-25 period.
    const viewerYear = 2025
    const current = pickCurrentDaeun(list, viewerYear, birthYear, fallback)
    expect(current.age).toBe(15)
  })

  it('Jan-1 boundary: viewer-tz has crossed into the new year', () => {
    // Same chart, but now the viewer's local year is 2026 -> Korean age 25 ->
    // the age-25 period, agreeing with the viewer-tz annual cycles.
    const viewerYear = 2026
    const current = pickCurrentDaeun(list, viewerYear, birthYear, fallback)
    expect(current.age).toBe(25)
  })

  it('selects the highest entry whose entry age is reached (Korean age rule)', () => {
    // year 2050, birthYear 2002 -> Korean age 49 -> age-45 period.
    expect(pickCurrentDaeun(list, 2050, 2002, fallback).age).toBe(45)
    // Exactly on a boundary year.
    expect(pickCurrentDaeun(list, 2046, 2002, fallback).age).toBe(45)
    expect(pickCurrentDaeun(list, 2045, 2002, fallback).age).toBe(35)
  })

  it('before the first daeun period falls back to the first entry', () => {
    // Korean age 3 (< first entry age 5) -> first entry.
    expect(pickCurrentDaeun(list, 2004, 2002, fallback).age).toBe(5)
  })

  it('returns fallback on invalid birthYear or empty list', () => {
    expect(pickCurrentDaeun(list, 2026, NaN, fallback)).toBe(fallback)
    const empty: DaeunPillar[] = []
    expect(pickCurrentDaeun(empty, 2026, 2002, fallback)).toBe(fallback)
  })
})
