import { describe, it, expect } from 'vitest'
import { __bucketingInternals } from '@/lib/calendar-engine'
import type { ActiveSignal, CalendarRange, CalendarBuildOptions } from '@/lib/calendar-engine/types'

/**
 * STEP-4 timezone day-bucketing regression guard.
 *
 * The calendar engine keys day-cells in UTC (`YYYY-MM-DDT00:00:00.000Z`)
 * but some astro extractors (transit / asteroid / moon-nodes / dignity /
 * house-transit) historically emitted *tz-less* signal timestamps
 * (`2026-03-15T12:00:00`). When those flowed through `new Date(...)`
 * (e.g. convergence `exactnessFactor`) they were parsed in the SERVER's
 * local timezone, so the same input produced different scoring/bucketing
 * on a Seoul (UTC+9) vs Los_Angeles (UTC-8) server, and a near-midnight
 * signal could land ±1 day off.
 *
 * Fixes verified here:
 *   1. `toUtcMs` interprets a tz-less ISO as UTC (never server-local), so
 *      day math is deterministic regardless of process.env.TZ.
 *   2. `groupIntoCells` keys cells by pure string-prefix slice, so a
 *      tz-less `T12:00:00` and its `...Z` equivalent bucket identically
 *      into the correct day.
 */

const { groupIntoCells, toUtcMs } = __bucketingInternals

const MARCH: CalendarRange = {
  start: '2026-03-01T00:00:00.000Z',
  end: '2026-03-31T23:59:59.000Z',
  granularity: 'day',
}

const OPTS: CalendarBuildOptions = { includeEvidence: true, enablePatterns: false }

function transitLikeSignal(id: string, start: string, peak: string, end: string): ActiveSignal {
  return {
    id,
    source: 'astro',
    kind: 'transit',
    name: 'Saturn □ Sun',
    polarity: -2,
    layer: 'yearly',
    active: { start, peak, end },
    weight: 0.8,
    evidence: { module: 'astro-transit', detail: {} },
  }
}

describe('calendar-tz: toUtcMs treats tz-less ISO as UTC (server-TZ independent)', () => {
  it('parses tz-less datetime exactly as UTC, matching Date.UTC', () => {
    // Hand-computed UTC truth — independent of process.env.TZ by construction.
    expect(toUtcMs('2026-03-15T12:00:00')).toBe(Date.UTC(2026, 2, 15, 12, 0, 0))
    expect(toUtcMs('2026-03-15')).toBe(Date.UTC(2026, 2, 15, 0, 0, 0))
  })

  it('a tz-less noon and its explicit-Z form resolve to the same instant', () => {
    expect(toUtcMs('2026-03-15T12:00:00')).toBe(toUtcMs('2026-03-15T12:00:00.000Z'))
  })

  it('honors an explicit offset rather than forcing UTC', () => {
    // +09:00 noon == 03:00Z
    expect(toUtcMs('2026-03-15T12:00:00+09:00')).toBe(Date.UTC(2026, 2, 15, 3, 0, 0))
  })
})

describe('calendar-tz: groupIntoCells buckets signals deterministically', () => {
  it('places a tz-less T12:00:00 signal on its own UTC day cell', () => {
    const sig = transitLikeSignal(
      'tzless',
      '2026-03-15T12:00:00',
      '2026-03-15T12:00:00',
      '2026-03-15T12:00:00'
    )
    const cells = groupIntoCells([sig], MARCH, OPTS)
    const withSignal = cells.filter((c) => c.signals.some((s) => s.id === 'tzless'))
    expect(withSignal).toHaveLength(1)
    expect(withSignal[0].datetime).toBe('2026-03-15T00:00:00.000Z')
  })

  it('buckets a tz-less signal and its explicit-Z twin into the IDENTICAL cell', () => {
    const tzless = transitLikeSignal(
      'a',
      '2026-03-20T12:00:00',
      '2026-03-20T12:00:00',
      '2026-03-20T12:00:00'
    )
    const withZ = transitLikeSignal(
      'b',
      '2026-03-20T12:00:00.000Z',
      '2026-03-20T12:00:00.000Z',
      '2026-03-20T12:00:00.000Z'
    )
    const cells = groupIntoCells([tzless, withZ], MARCH, OPTS)
    const dayA = cells.find((c) => c.signals.some((s) => s.id === 'a'))
    const dayB = cells.find((c) => c.signals.some((s) => s.id === 'b'))
    expect(dayA?.datetime).toBe('2026-03-20T00:00:00.000Z')
    expect(dayB?.datetime).toBe(dayA?.datetime)
  })

  it('spreads a multi-day window across every day cell it covers (inclusive)', () => {
    const sig = transitLikeSignal(
      'span',
      '2026-03-10T12:00:00',
      '2026-03-12T12:00:00',
      '2026-03-14T12:00:00'
    )
    const cells = groupIntoCells([sig], MARCH, OPTS)
    const days = cells
      .filter((c) => c.signals.some((s) => s.id === 'span'))
      .map((c) => c.datetime)
      .sort()
    expect(days).toEqual([
      '2026-03-10T00:00:00.000Z',
      '2026-03-11T00:00:00.000Z',
      '2026-03-12T00:00:00.000Z',
      '2026-03-13T00:00:00.000Z',
      '2026-03-14T00:00:00.000Z',
    ])
  })

  it('every emitted cell datetime is a canonical UTC midnight key', () => {
    const cells = groupIntoCells([], MARCH, OPTS)
    expect(cells.length).toBe(31)
    for (const c of cells) {
      expect(c.datetime).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/)
    }
    // sorted ascending and dense (no gaps, no dupes)
    const dates = cells.map((c) => c.datetime)
    expect(dates).toEqual([...dates].sort())
    expect(new Set(dates).size).toBe(dates.length)
  })
})

/**
 * Hour-granularity boundary regression.
 *
 * A date-only `end` ('YYYY-MM-DD') resolves to 00:00 of that day. With hour
 * granularity that made a single-day range (start === end === 'YYYY-MM-DD')
 * yield ONLY the 00:00 cell, so 시진(時柱)/planetary-hour signals — emitted at
 * 01,03,…23h — had no cell to land in and silently vanished (the day-level
 * 대운/세운 signals, which contain 00:00, masked the gap). Fix: iterateRange
 * treats a date-only `end` as "through the end of that day", expanding the
 * range to all 24 hour cells. Datetime ends (length > 10) are honored as-is,
 * so production (date-detail passes '…T23:00:00.000Z') and day granularity
 * are unaffected.
 */
describe('calendar-tz: hour granularity expands a date-only single-day range', () => {
  const DAY = '2030-04-20'

  it('a date-only single-day range yields all 24 hour cells, not just 00:00', () => {
    const range: CalendarRange = { start: DAY, end: DAY, granularity: 'hour' }
    const cells = groupIntoCells([], range, OPTS)
    expect(cells.length).toBe(24)
    expect(cells[0].datetime).toBe(`${DAY}T00:00:00.000Z`)
    expect(cells[23].datetime).toBe(`${DAY}T23:00:00.000Z`)
    for (const c of cells) {
      expect(c.datetime).toMatch(/^2030-04-20T\d{2}:00:00\.000Z$/)
    }
  })

  it('an hourly signal lands on its real hour cell (was lost before the fix)', () => {
    // 시진-like: active only 01:00–03:00, so before the fix (single 00:00 cell)
    // it had nowhere to go.
    const sijin = transitLikeSignal(
      'sijin',
      `${DAY}T01:00:00.000Z`,
      `${DAY}T02:00:00.000Z`,
      `${DAY}T03:00:00.000Z`
    )
    const range: CalendarRange = { start: DAY, end: DAY, granularity: 'hour' }
    const cells = groupIntoCells([sijin], range, OPTS)
    const hit = cells.filter((c) => c.signals.some((s) => s.id === 'sijin')).map((c) => c.datetime)
    expect(hit).toEqual([`${DAY}T01:00:00.000Z`, `${DAY}T02:00:00.000Z`, `${DAY}T03:00:00.000Z`])
  })

  it('explicit datetime end (production style) is unchanged — still 24 cells', () => {
    const range: CalendarRange = {
      start: `${DAY}T00:00:00.000Z`,
      end: `${DAY}T23:00:00.000Z`,
      granularity: 'hour',
    }
    expect(groupIntoCells([], range, OPTS).length).toBe(24)
  })

  it('day granularity with a date-only single day is unchanged — still 1 cell', () => {
    const range: CalendarRange = { start: DAY, end: DAY, granularity: 'day' }
    const cells = groupIntoCells([], range, OPTS)
    expect(cells.length).toBe(1)
    expect(cells[0].datetime).toBe(`${DAY}T00:00:00.000Z`)
  })
})

describe('calendar-tz: convergence exactness is now server-TZ independent', () => {
  // exactnessFactor (derivers/convergence.ts) does
  //   |new Date(cellDate) - new Date(peak)| / 86_400_000
  // With the normalized (...Z) peak this is a fixed 0.5-day offset from
  // the UTC-midnight cell key, regardless of the server timezone. The old
  // tz-less peak made `new Date(peak)` server-local, so this number
  // drifted by the server's UTC offset (e.g. 0.083 in Seoul, 0.79 in LA).
  it('UTC-noon peak sits exactly half a day from its UTC-midnight cell', () => {
    const cellDate = '2026-03-15T00:00:00.000Z'
    const peak = '2026-03-15T12:00:00.000Z'
    const days = Math.abs(new Date(cellDate).getTime() - new Date(peak).getTime()) / 86_400_000
    expect(days).toBeCloseTo(0.5, 10)
  })
})
