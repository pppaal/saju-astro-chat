/**
 * @file History page lib module index
 *
 * This directory contains supporting modules for the history page:
 * - types.ts: Type definitions
 * - constants.ts: Constants (service config, display settings)
 * - helpers.ts: Utility functions
 */

// Re-export types
export type {
  ServiceRecord,
  DailyHistory,
  DestinyMapContent,
  IChingContent,
  CalendarContent,
  TarotCard,
  TarotCardInsight,
  TarotContent,
  NumerologyContent,
  ServiceConfig,
} from './types';

// Re-export constants
export {
  SERVICE_CONFIG,
  INITIAL_DISPLAY_COUNT,
  ALL_SERVICES_ORDER,
} from './constants';

// Re-export helpers
export {
  formatDate,
  formatServiceName,
  getGradeEmoji,
  getGradeLabel,
  getThemeDisplayName,
  getCategoryDisplay,
} from './helpers';
