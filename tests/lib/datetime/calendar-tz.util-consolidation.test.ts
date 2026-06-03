import { describe, it, expect } from 'vitest'
import * as datetimeTz from '@/lib/datetime/timezone'
import * as utilsTz from '@/lib/utils/timezone'

/**
 * STEP-4 timezone-utility consolidation guard.
 *
 * The two non-saju timezone utilities (`lib/datetime/timezone.ts` and
 * `lib/utils/timezone.ts`) were consolidated: `lib/datetime/timezone.ts`
 * is now the single canonical implementation, and `lib/utils/timezone.ts`
 * is a thin re-export shim kept so OUT-OF-SCOPE callers (destiny-map,
 * solar-return / convergence API routes) don't have to change imports.
 *
 * Two contracts must hold:
 *  - datetime/ keeps its historical surface (getNowInTimezone returns the
 *    {year,month,day}-narrowed shape; isValidTimezone / DEFAULT_TIMEZONE /
 *    formatDateString / getIsoInTimezone / getDateInTimezone present).
 *  - utils/ keeps its historical surface, and CRUCIALLY its
 *    `getNowInTimezone` returns the FULL component object
 *    (year/month/day/hour/minute/second) — destiny-map/astrology/helpers
 *    destructures `.hour`/`.minute` off it.
 */

describe('calendar-tz: datetime/ is the canonical timezone module', () => {
  it('exposes the historical datetime surface', () => {
    expect(typeof datetimeTz.getNowInTimezone).toBe('function')
    expect(typeof datetimeTz.getDateInTimezone).toBe('function')
    expect(typeof datetimeTz.getIsoInTimezone).toBe('function')
    expect(typeof datetimeTz.formatDateString).toBe('function')
    expect(typeof datetimeTz.isValidTimezone).toBe('function')
    expect(datetimeTz.DEFAULT_TIMEZONE).toBe('Asia/Seoul')
  })

  it('getNowInTimezone stays narrowed to {year, month, day}', () => {
    const now = datetimeTz.getNowInTimezone('Asia/Seoul')
    expect(Object.keys(now).sort()).toEqual(['day', 'month', 'year'])
    expect(now.month).toBeGreaterThanOrEqual(1)
    expect(now.month).toBeLessThanOrEqual(12)
  })

  it('formatDateString zero-pads', () => {
    expect(datetimeTz.formatDateString(2026, 3, 5)).toBe('2026-03-05')
  })

  it('isValidTimezone validates IANA names', () => {
    expect(datetimeTz.isValidTimezone('Asia/Seoul')).toBe(true)
    expect(datetimeTz.isValidTimezone('UTC')).toBe(true)
    expect(datetimeTz.isValidTimezone('+09:00')).toBe(false)
    expect(datetimeTz.isValidTimezone('KST')).toBe(false)
  })
})

describe('calendar-tz: utils/ shim preserves its historical contract', () => {
  it('re-exports the now-primitives', () => {
    expect(typeof utilsTz.getNowInTimezone).toBe('function')
    expect(typeof utilsTz.nowInTimezone).toBe('function')
    expect(typeof utilsTz.getDateInTimezone).toBe('function')
    expect(typeof utilsTz.currentYearInTimezone).toBe('function')
    expect(typeof utilsTz.currentMonthInTimezone).toBe('function')
  })

  it('utils.getNowInTimezone returns the FULL component object (.hour etc.)', () => {
    const now = utilsTz.getNowInTimezone('Asia/Seoul')
    // destiny-map/astrology/helpers.ts relies on these fields existing.
    for (const k of ['year', 'month', 'day', 'hour', 'minute', 'second']) {
      expect(now).toHaveProperty(k)
      expect(typeof (now as Record<string, number>)[k]).toBe('number')
    }
  })

  it('utils.nowInTimezone returns a Date carrying local wall-clock in UTC fields', () => {
    const d = utilsTz.nowInTimezone('Asia/Seoul')
    expect(d).toBeInstanceOf(Date)
    expect(Number.isNaN(d.getTime())).toBe(false)
  })

  it('shim and canonical agree on getDateInTimezone', () => {
    expect(utilsTz.getDateInTimezone('UTC')).toBe(datetimeTz.getDateInTimezone('UTC'))
  })
})
