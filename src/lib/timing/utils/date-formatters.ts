/**
 * Date Formatting Utilities
 * @deprecated This file is maintained for backward compatibility.
 * New code should import from '@/lib/utils/date' instead.
 *
 * Re-exports all date utilities from the centralized date utility module.
 */

export {
  formatDateToISO,
  formatDaysArray,
  formatPeriodDates,
  formatCompletePeriod,
  parseISODate,
  isValidISODate,
  formatDateByLocale,
  parseDateComponents,
  parseTimeComponents,
  extractBirthYear,
  extractBirthMonth,
  extractBirthDay,
  formatRelativeDate,
  calculateAge,
  isToday,
  isPast,
  isFuture,
  getDateRange,
  addDays,
  addMonths,
  addYears,
} from '@/lib/utils/date'
