/**
 * Centralized Utility Exports
 *
 * This file re-exports all utility functions from their respective modules
 * for convenient importing. You can import from here or directly from the
 * specific module.
 *
 * @example
 * // Import from centralized location
 * import { formatDateToISO, sanitizeHtml } from '@/lib/utils'
 *
 * // Or import from specific module
 * import { formatDateToISO } from '@/lib/utils/date'
 * import { sanitizeHtml } from '@/lib/api/sanitizers'
 */

// ============ Date Utilities ============
export {
  // Formatting
  formatDateToISO,
  formatDaysArray,
  formatPeriodDates,
  formatCompletePeriod,
  formatDateByLocale,
  formatRelativeDate,

  // Parsing
  parseISODate,
  parseDateComponents,
  parseTimeComponents,
  extractBirthYear,
  extractBirthMonth,
  extractBirthDay,

  // Validation
  isValidISODate,

  // Comparison
  isToday,
  isPast,
  isFuture,

  // Calculation
  calculateAge,
  getDateRange,
  addDays,
  addMonths,
  addYears,
} from './date'

// Note: For backward compatibility, these are also available from:
// '@/lib/prediction/utils/date-formatters'
