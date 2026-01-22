/**
 * Date Formatting Utilities
 * Common date formatting functions for prediction API
 */

/**
 * Format a Date object to ISO date string (YYYY-MM-DD)
 * @param date - Date to format
 * @returns ISO date string
 */
export function formatDateToISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format an array of dates to ISO date strings
 * @param dates - Array of dates
 * @returns Array of ISO date strings
 */
export function formatDaysArray(dates: Date[]): string[] {
  return dates.map(formatDateToISO);
}

/**
 * Format a period with start and end dates
 * @param period - Period object with startDate and endDate
 * @returns Object with ISO formatted dates
 */
export function formatPeriodDates(period: {
  startDate: Date;
  endDate: Date;
}): {
  startDate: string;
  endDate: string;
} {
  return {
    startDate: formatDateToISO(period.startDate),
    endDate: formatDateToISO(period.endDate),
  };
}

/**
 * Format a period with optional specific days
 * @param period - Period with startDate, endDate, and optional specificDays
 * @returns Formatted period object
 */
export function formatCompletePeriod<T extends {
  startDate: Date;
  endDate: Date;
  specificDays?: Date[];
}>(period: T): Omit<T, 'startDate' | 'endDate' | 'specificDays'> & {
  startDate: string;
  endDate: string;
  specificDays?: string[];
} {
  const { startDate, endDate, specificDays, ...rest } = period;

  return {
    ...rest,
    startDate: formatDateToISO(startDate),
    endDate: formatDateToISO(endDate),
    ...(specificDays && { specificDays: formatDaysArray(specificDays) }),
  };
}

/**
 * Parse ISO date string to Date object
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Date object
 */
export function parseISODate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Check if a date string is valid ISO format
 * @param dateString - Date string to validate
 * @returns True if valid ISO date
 */
export function isValidISODate(dateString: string): boolean {
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(dateString)) return false;

  const date = parseISODate(dateString);
  return !isNaN(date.getTime());
}

/**
 * Format date by locale
 * @param date - Date to format
 * @param locale - Locale string ('ko' or 'en')
 * @returns Formatted date string
 */
export function formatDateByLocale(date: Date, locale: string): string {
  const localeString = locale === 'ko' ? 'ko-KR' : 'en-US';
  return date.toLocaleDateString(localeString);
}

/**
 * Parse date string (YYYY-MM-DD) into components
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Object with year, month, day as numbers
 */
export function parseDateComponents(dateString: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateString.split("-").map(Number);
  return { year, month, day };
}

/**
 * Parse time string (HH:MM) into components
 * @param timeString - Time string in HH:MM format
 * @returns Object with hour, minute as numbers
 */
export function parseTimeComponents(timeString: string): { hour: number; minute: number } {
  const [hour, minute] = timeString.split(":").map(Number);
  return { hour, minute };
}

/**
 * Extract birth year from date string
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Birth year as number
 */
export function extractBirthYear(dateString: string): number {
  return parseInt(dateString.split("-")[0], 10);
}

/**
 * Extract birth month from date string
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Birth month as number (1-12)
 */
export function extractBirthMonth(dateString: string): number {
  return parseInt(dateString.split("-")[1], 10);
}

/**
 * Extract birth day from date string
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Birth day as number (1-31)
 */
export function extractBirthDay(dateString: string): number {
  return parseInt(dateString.split("-")[2], 10);
}
