/**
 * Thin re-export shim — the canonical timezone implementation now lives
 * in `@/lib/datetime/timezone`.
 *
 * This file used to hold the "now in a timezone" primitives, but the two
 * non-saju timezone utilities (this one and datetime/timezone.ts) were
 * consolidated into a single source of truth under `lib/datetime/`.
 * Several OUT-OF-SCOPE callers still import from `@/lib/utils/timezone`
 * (e.g. `src/lib/destiny-map/astrology/helpers.ts`, the solar-return and
 * convergence API routes), so this shim is kept to avoid touching their
 * imports. New code should import from `@/lib/datetime` instead.
 *
 * IMPORTANT: the historical `getNowInTimezone` exported from THIS module
 * returned the FULL component object (year/month/day/hour/minute/second).
 * `destiny-map/astrology/helpers.ts` destructures `.hour`/`.minute` off
 * it, so the shim re-exports the full-component variant under that name —
 * NOT the {year,month,day}-narrowed `getNowInTimezone` from datetime/,
 * which is a different (intentionally narrower) public surface.
 */

export {
  // full-component shape — preserves the previous utils/ contract
  getNowComponentsInTimezone as getNowInTimezone,
  nowInTimezone,
  getDateInTimezone,
  currentYearInTimezone,
  currentMonthInTimezone,
  type TzNowComponents,
} from '@/lib/datetime/timezone'
