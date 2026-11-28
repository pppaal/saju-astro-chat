import { describe, it, expect } from 'vitest'
import * as datetimeTz from '@/lib/datetime/timezone'

/**
 * STEP-4 timezone-utility consolidation guard.
 *
 * The two non-saju timezone utilities (`lib/datetime/timezone.ts` and
 * `lib/utils/timezone.ts`) were consolidated: `lib/datetime/timezone.ts`
 * is the single canonical implementation. The `lib/utils/timezone.ts`
 * re-export shim had no importer left outside this test and was deleted
 * (knip --production, H7); its contract is now checked on the canonical
 * module directly.
 *
 * Two contracts must hold:
 *  - getNowInTimezone keeps the {year,month,day}-narrowed shape;
 *    isValidTimezone / DEFAULT_TIMEZONE / formatDateString /
 *    getIsoInTimezone / getDateInTimezone present.
 *  - the full-component variant (getNowComponentsInTimezone) returns
 *    year/month/day/hour/minute/second — the shape the old utils/
 *    `getNowInTimezone` alias exposed.
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

describe('calendar-tz: full-component now-primitives (ex utils/ shim surface)', () => {
  it('exposes the now-primitives', () => {
    expect(typeof datetimeTz.getNowComponentsInTimezone).toBe('function')
    expect(typeof datetimeTz.nowInTimezone).toBe('function')
    expect(typeof datetimeTz.currentYearInTimezone).toBe('function')
    expect(typeof datetimeTz.currentMonthInTimezone).toBe('function')
  })

  it('getNowComponentsInTimezone returns the FULL component object (.hour etc.)', () => {
    const now = datetimeTz.getNowComponentsInTimezone('Asia/Seoul')
    for (const k of ['year', 'month', 'day', 'hour', 'minute', 'second']) {
      expect(now).toHaveProperty(k)
      expect(typeof (now as unknown as Record<string, number>)[k]).toBe('number')
    }
  })

  it('nowInTimezone returns a Date carrying local wall-clock in UTC fields', () => {
    const d = datetimeTz.nowInTimezone('Asia/Seoul')
    expect(d).toBeInstanceOf(Date)
    expect(Number.isNaN(d.getTime())).toBe(false)
  })

  it('currentMonthInTimezone is 0-11 and currentYearInTimezone a 4-digit year', () => {
    const m = datetimeTz.currentMonthInTimezone('UTC')
    expect(m).toBeGreaterThanOrEqual(0)
    expect(m).toBeLessThanOrEqual(11)
    expect(datetimeTz.currentYearInTimezone('UTC')).toBeGreaterThanOrEqual(2000)
  })
})
