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

// ============ Cache Key Utilities ============
export {
  generateSafeCacheKey,
  generateSajuCacheKey,
  generateCompatibilityCacheKey,
  generateDaeunCacheKey,
  generateDestinyMapCacheKey,
} from './cacheKey'

// ============ Chat Utilities ============
export {
  clampMessages,
  guardText,
  maskPayload,
  getLastUserMessage,
  filterSystemMessages,
  truncateForPreview,
  buildChatContext,
  validateMessages,
  type ChatMessage,
} from './chat'

// ============ Data Extraction Utilities ============
export {
  // Saju extraction
  extractDayMaster,
  extractDayMasterElement,
  findCurrentDaeun,
  findCurrentSaeun,
  extractYongsin,
  extractKibsin,
  extractSajuData,

  // Astro extraction
  findPlanetSign,
  findPlanetHouse,
  findPlanetLongitude,
  isPlanetRetrograde,
  extractPlanets,
  extractSunSign,
  extractMoonSign,
  extractAscendant,
  extractAstroData,

  // Combined
  extractAllData,

  // Types
  type SajuDataExtended,
  type DaeunItem,
  type SaeunItem,
  type IljinItem,
  type PlanetData,
  type AstroData,
} from './data-extraction'

// ============ Date Range Utilities ============
export {
  getDateRange as getTimeRangeDates,
  getDateRangeWithLabels,
  getTodayRange,
  getYesterdayRange,
  getThisWeekRange,
  getThisMonthRange,
  getLastMonthRange,
  getThisYearRange,
  isInRange,
  getRangeDuration,
  getRangeDays,
  splitRange,
  getHourlyIntervals,
  getDailyIntervals,
  getWeeklyIntervals,
  type TimeRange,
  type DateRange as TimeRangeDates,
  type DateRangeWithLabels,
} from './date-range'
