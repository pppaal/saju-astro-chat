/**
 * Canonical "now in a given timezone" helpers.
 *
 * Production runs on a UTC server, so `new Date().getMonth()` and
 * friends return UTC values. Anything that means "the user's wall
 * clock right now" must go through one of these instead — they read
 * the year / month / day / hour / minute / second that *is currently
 * displayed at the timezone* and shape it the way the caller needs.
 *
 * Three shapes are exposed because callers genuinely need different
 * things:
 *   nowInTimezone(tz)        → a Date whose UTC fields hold the local
 *                              wall clock (cheap to read via getUTC*)
 *   getNowInTimezone(tz?)    → component object {year, month(1-12),
 *                              day, hour, minute, second}
 *   getDateInTimezone(tz?)   → 'YYYY-MM-DD' string
 *
 * All three share one Intl.DateTimeFormat call to avoid the chained
 * single-field Intl calls the old copies were paying for. Behind the
 * scenes there are no longer multiple drifting implementations.
 */

export type TzNowComponents = {
  year: number // YYYY (e.g. 2026)
  month: number // 1-12, **not** 0-11 (this matches the existing
  // get*InTimezone consumers and the Intl format output)
  day: number // 1-31
  hour: number // 0-23
  minute: number // 0-59
  second: number // 0-59
}

function partsFor(timezone: string | undefined): TzNowComponents {
  const tz = timezone || 'UTC'
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const lookup = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  // Intl returns '24' for midnight in some locales; coerce back to 0
  // so Date.UTC doesn't roll the day forward and a downstream "today"
  // check doesn't read tomorrow.
  const hour = lookup('hour')
  return {
    year: lookup('year'),
    month: lookup('month'),
    day: lookup('day'),
    hour: hour === 24 ? 0 : hour,
    minute: lookup('minute'),
    second: lookup('second'),
  }
}

/**
 * Build a Date whose UTC fields hold the local wall clock at the
 * given timezone. Use when downstream code reads `.getUTCMonth()` /
 * `.getUTCDate()` and expects user-local values.
 */
export function nowInTimezone(timezone: string): Date {
  const { year, month, day, hour, minute, second } = partsFor(timezone)
  return new Date(Date.UTC(year, month - 1, day, hour, minute, second))
}

/**
 * Component-shape of "now". `month` is **1-12** so consumers can
 * format `YYYY-MM-DD` strings directly without the off-by-one
 * confusion. Defaults to UTC when no timezone is supplied — pass an
 * explicit IANA name for user-facing values.
 */
export function getNowInTimezone(timezone?: string): TzNowComponents {
  try {
    return partsFor(timezone)
  } catch {
    // Invalid IANA name — fall back to plain UTC rather than throwing
    // so a malformed profile doesn't break the entire request.
    return partsFor('UTC')
  }
}

/** `YYYY-MM-DD` at the given timezone. UTC default, same fallback. */
export function getDateInTimezone(timezone?: string): string {
  const { year, month, day } = getNowInTimezone(timezone)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Convenience: the user's local year right now at the given timezone. */
export function currentYearInTimezone(timezone: string): number {
  return getNowInTimezone(timezone).year
}

/** Convenience: the user's local month (0-11) right now at the given timezone. */
export function currentMonthInTimezone(timezone: string): number {
  return getNowInTimezone(timezone).month - 1
}
