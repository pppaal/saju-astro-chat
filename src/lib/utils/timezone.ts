/**
 * Build a Date whose UTC fields hold the wall-clock year / month / day /
 * hour / minute / second that *is currently displayed at the given
 * timezone*. Anything downstream that reads `.getMonth()` / `.getDate()`
 * (and runs on a UTC server) will then see the user's local "today"
 * instead of the server's UTC today.
 *
 * Use when computing "today" / "this month" / "this year" for a user —
 * the production server runs in UTC, so `new Date().getMonth()` etc.
 * return UTC values and silently drift to the next day/month/year for
 * users west of UTC (and just before midnight for users east of UTC).
 */
export function nowInTimezone(timezone: string): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const lookup = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0')
  return new Date(
    Date.UTC(
      lookup('year'),
      lookup('month') - 1,
      lookup('day'),
      // Intl returns '24' for midnight in some locales; coerce back to 0
      // so Date.UTC doesn't roll the day forward.
      lookup('hour') === 24 ? 0 : lookup('hour'),
      lookup('minute'),
      lookup('second')
    )
  )
}

/** Convenience: the user's local year right now at the given timezone. */
export function currentYearInTimezone(timezone: string): number {
  return nowInTimezone(timezone).getUTCFullYear()
}

/** Convenience: the user's local month (0-11) right now at the given timezone. */
export function currentMonthInTimezone(timezone: string): number {
  return nowInTimezone(timezone).getUTCMonth()
}
