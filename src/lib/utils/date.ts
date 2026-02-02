/**
 * Centralized Date Utility Functions
 * Common date formatting and parsing functions used across the application
 */

/**
 * Format a Date object to ISO date string (YYYY-MM-DD)
 * @param date - Date to format
 * @returns ISO date string
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format an array of dates to ISO date strings
 * @param dates - Array of dates
 * @returns Array of ISO date strings
 */
export function formatDaysArray(dates: Date[]): string[] {
  return dates.map(formatDateToISO)
}

/**
 * Format a period with start and end dates
 * @param period - Period object with startDate and endDate
 * @returns Object with ISO formatted dates
 */
export function formatPeriodDates(period: { startDate: Date; endDate: Date }): {
  startDate: string
  endDate: string
} {
  return {
    startDate: formatDateToISO(period.startDate),
    endDate: formatDateToISO(period.endDate),
  }
}

/**
 * Format a period with optional specific days
 * @param period - Period with startDate, endDate, and optional specificDays
 * @returns Formatted period object
 */
export function formatCompletePeriod<
  T extends {
    startDate: Date
    endDate: Date
    specificDays?: Date[]
  },
>(
  period: T
): Omit<T, 'startDate' | 'endDate' | 'specificDays'> & {
  startDate: string
  endDate: string
  specificDays?: string[]
} {
  const { startDate, endDate, specificDays, ...rest } = period

  return {
    ...rest,
    startDate: formatDateToISO(startDate),
    endDate: formatDateToISO(endDate),
    ...(specificDays && { specificDays: formatDaysArray(specificDays) }),
  }
}

/**
 * Parse ISO date string to Date object
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Date object
 */
export function parseISODate(dateString: string): Date {
  return new Date(dateString)
}

/**
 * Check if a date string is valid ISO format
 * @param dateString - Date string to validate
 * @returns True if valid ISO date
 */
export function isValidISODate(dateString: string): boolean {
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!isoRegex.test(dateString)) {
    return false
  }

  const date = parseISODate(dateString);
  return !isNaN(date.getTime())
}

/**
 * Format date by locale
 * @param date - Date to format
 * @param locale - Locale string ('ko', 'en', etc.)
 * @returns Formatted date string
 */
export function formatDateByLocale(date: Date, locale: string): string {
  const localeMap: Record<string, string> = {
    ko: 'ko-KR',
    en: 'en-US',
    ja: 'ja-JP',
    zh: 'zh-CN',
    es: 'es-ES',
    ar: 'ar-SA',
  }
  const localeString = localeMap[locale] || 'en-US'
  return date.toLocaleDateString(localeString)
}

/**
 * Format date string for display with relative labels
 * Returns "Today", "Yesterday", or formatted date
 * @param dateStr - ISO date string
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatRelativeDate(
  dateStr: string,
  options?: {
    locale?: string
    labels?: { today?: string; yesterday?: string }
  }
): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (dateStr === todayStr) {
    return options?.labels?.today || 'Today'
  }
  if (dateStr === yesterdayStr) {
    return options?.labels?.yesterday || 'Yesterday'
  }

  const locale = options?.locale || 'en'
  const localeMap: Record<string, string> = {
    ko: 'ko-KR',
    en: 'en-US',
    ja: 'ja-JP',
    zh: 'zh-CN',
    es: 'es-ES',
    ar: 'ar-SA',
  }
  const localeString = localeMap[locale] || 'en-US'

  return date.toLocaleDateString(localeString, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Parse date string (YYYY-MM-DD) into components
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Object with year, month, day as numbers
 */
export function parseDateComponents(dateString: string): {
  year: number
  month: number
  day: number
} {
  const [year, month, day] = dateString.split('-').map(Number);
  return { year, month, day }
}

/**
 * Parse time string (HH:MM) into components
 * @param timeString - Time string in HH:MM format
 * @returns Object with hour, minute as numbers
 */
export function parseTimeComponents(timeString: string): {
  hour: number
  minute: number
} {
  const [hour, minute] = timeString.split(':').map(Number);
  return { hour, minute }
}

/**
 * Extract birth year from date string
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Birth year as number
 */
export function extractBirthYear(dateString: string): number {
  return parseInt(dateString.split('-')[0], 10)
}

/**
 * Extract birth month from date string
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Birth month as number (1-12)
 */
export function extractBirthMonth(dateString: string): number {
  return parseInt(dateString.split('-')[1], 10)
}

/**
 * Extract birth day from date string
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Birth day as number (1-31)
 */
export function extractBirthDay(dateString: string): number {
  return parseInt(dateString.split('-')[2], 10)
}

/**
 * Calculate age from birth date
 * @param birthDate - Birth date string (YYYY-MM-DD) or Date object
 * @returns Age in years
 */
export function calculateAge(birthDate: string | Date): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  return age
}

/**
 * Check if a date is today
 * @param date - Date string or Date object
 * @returns True if date is today
 */
export function isToday(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  )
}

/**
 * Check if a date is in the past
 * @param date - Date string or Date object
 * @returns True if date is in the past
 */
export function isPast(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dateObj.setHours(0, 0, 0, 0);
  return dateObj < today
}

/**
 * Check if a date is in the future
 * @param date - Date string or Date object
 * @returns True if date is in the future
 */
export function isFuture(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dateObj.setHours(0, 0, 0, 0);
  return dateObj > today
}

/**
 * Get date range as array of ISO date strings
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of ISO date strings
 */
export function getDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = []
  const current = new Date(startDate)

  while (current <= endDate) {
    dates.push(formatDateToISO(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Add days to a date
 * @param date - Date to add to
 * @param days - Number of days to add (can be negative)
 * @returns New date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days);
  return result
}

/**
 * Add months to a date
 * @param date - Date to add to
 * @param months - Number of months to add (can be negative)
 * @returns New date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months);
  return result
}

/**
 * Add years to a date
 * @param date - Date to add to
 * @param years - Number of years to add (can be negative)
 * @returns New date
 */
export function addYears(date: Date, years: number): Date {
  const result = new Date(date)
  result.setFullYear(result.getFullYear() + years);
  return result
}
