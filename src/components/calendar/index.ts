/**
 * @file DestinyCalendar module index
 *
 * This directory contains the DestinyCalendar component and its supporting modules:
 * - types.ts: Type definitions
 * - constants.ts: Constants and emoji mappings
 * - cache-utils.ts: LocalStorage caching utilities
 * - utils.ts: Utility functions
 * - DestinyCalendar.tsx: Main component
 */

// Re-export main component
export { default } from './DestinyCalendar';
export { default as DestinyCalendar } from './DestinyCalendar';

// Re-export types
export type {
  EventCategory,
  ImportanceGrade,
  CityHit,
  ImportantDate,
  CalendarData,
  BirthInfo,
  CachedCalendarData,
} from './types';

// Re-export constants
export {
  CATEGORY_EMOJI,
  WEEKDAYS_KO,
  WEEKDAYS_EN,
  ICONS,
  GRADE_EMOJI,
  CATEGORY_LABELS_KO,
  CATEGORY_LABELS_EN,
} from './constants';

// Re-export cache utilities
export {
  getCacheKey,
  getCachedData,
  setCachedData,
  clearOldCache,
} from './cache-utils';

// Re-export utility functions
export {
  extractCityPart,
  parseLocalDate,
  getGradeEmoji,
  getCategoryLabel,
  getScoreClass,
  getDayClassName,
  generateMonthDays,
} from './utils';
