/**
 * Date Range Utilities
 * Consolidates duplicate date range calculation patterns
 *
 * Used in admin metrics, analytics, and report generation
 */

// ============ Types ============

export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | '90d' | '365d'

export interface DateRange {
  start: Date
  end: Date
}

export interface DateRangeWithLabels extends DateRange {
  label: string
  shortLabel: string
}

// ============ Time Range Calculations ============

/**
 * Gets a date range based on a time range preset
 * Previously duplicated in 2+ admin metrics routes
 */
export function getDateRange(timeRange: TimeRange): DateRange {
  const end = new Date()
  const start = new Date()

  switch (timeRange) {
    case '1h':
      start.setHours(start.getHours() - 1)
      break
    case '6h':
      start.setHours(start.getHours() - 6)
      break
    case '24h':
      start.setDate(start.getDate() - 1)
      break
    case '7d':
      start.setDate(start.getDate() - 7)
      break
    case '30d':
      start.setDate(start.getDate() - 30)
      break
    case '90d':
      start.setDate(start.getDate() - 90)
      break
    case '365d':
      start.setDate(start.getDate() - 365)
      break
  }

  return { start, end }
}

/**
 * Gets a date range with human-readable labels
 */
export function getDateRangeWithLabels(timeRange: TimeRange): DateRangeWithLabels {
  const range = getDateRange(timeRange)

  const labels: Record<TimeRange, { label: string; shortLabel: string }> = {
    '1h': { label: 'Last 1 hour', shortLabel: '1시간' },
    '6h': { label: 'Last 6 hours', shortLabel: '6시간' },
    '24h': { label: 'Last 24 hours', shortLabel: '24시간' },
    '7d': { label: 'Last 7 days', shortLabel: '7일' },
    '30d': { label: 'Last 30 days', shortLabel: '30일' },
    '90d': { label: 'Last 90 days', shortLabel: '90일' },
    '365d': { label: 'Last year', shortLabel: '1년' },
  }

  return {
    ...range,
    ...labels[timeRange],
  }
}

// ============ Custom Date Ranges ============

/**
 * Gets date range for today (midnight to now)
 */
export function getTodayRange(): DateRange {
  const end = new Date()
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

/**
 * Gets date range for yesterday
 */
export function getYesterdayRange(): DateRange {
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setDate(start.getDate() - 1)
  return { start, end }
}

/**
 * Gets date range for this week (Monday to now)
 */
export function getThisWeekRange(): DateRange {
  const end = new Date()
  const start = new Date()
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Sunday
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

/**
 * Gets date range for this month
 */
export function getThisMonthRange(): DateRange {
  const end = new Date()
  const start = new Date(end.getFullYear(), end.getMonth(), 1)
  return { start, end }
}

/**
 * Gets date range for last month
 */
export function getLastMonthRange(): DateRange {
  const end = new Date()
  end.setDate(1)
  end.setHours(0, 0, 0, 0)
  const start = new Date(end)
  start.setMonth(start.getMonth() - 1)
  return { start, end }
}

/**
 * Gets date range for this year
 */
export function getThisYearRange(): DateRange {
  const end = new Date()
  const start = new Date(end.getFullYear(), 0, 1)
  return { start, end }
}

// ============ Date Range Helpers ============

/**
 * Checks if a date is within a range
 */
export function isInRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date <= range.end
}

/**
 * Gets the duration of a range in milliseconds
 */
export function getRangeDuration(range: DateRange): number {
  return range.end.getTime() - range.start.getTime()
}

/**
 * Gets the duration of a range in days
 */
export function getRangeDays(range: DateRange): number {
  return Math.ceil(getRangeDuration(range) / (1000 * 60 * 60 * 24))
}

/**
 * Splits a range into intervals
 */
export function splitRange(
  range: DateRange,
  intervalMs: number
): DateRange[] {
  const ranges: DateRange[] = []
  let current = new Date(range.start)

  while (current < range.end) {
    const intervalEnd = new Date(current.getTime() + intervalMs)
    ranges.push({
      start: new Date(current),
      end: intervalEnd < range.end ? intervalEnd : new Date(range.end),
    })
    current = intervalEnd
  }

  return ranges
}

/**
 * Gets hourly intervals for a range
 */
export function getHourlyIntervals(range: DateRange): DateRange[] {
  return splitRange(range, 60 * 60 * 1000)
}

/**
 * Gets daily intervals for a range
 */
export function getDailyIntervals(range: DateRange): DateRange[] {
  return splitRange(range, 24 * 60 * 60 * 1000)
}

/**
 * Gets weekly intervals for a range
 */
export function getWeeklyIntervals(range: DateRange): DateRange[] {
  return splitRange(range, 7 * 24 * 60 * 60 * 1000)
}
