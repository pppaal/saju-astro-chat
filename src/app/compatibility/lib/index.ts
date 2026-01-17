/**
 * @file Compatibility page lib module index
 *
 * This directory contains supporting modules for the compatibility page:
 * - types.ts: Type definitions
 * - constants.ts: Constants (icons, translation keys, patterns)
 * - helpers.ts: Utility functions
 */

// Re-export types
export type {
  SavedPerson,
  Relation,
  CityItem,
  PersonForm,
  TimingData,
  GroupAnalysisData,
  SynergyBreakdown,
  ParsedSection,
} from './types';

// Re-export constants
export {
  relationIcons,
  sectionTitleKeys,
  sectionPatterns,
} from './constants';

// Re-export helpers
export {
  makeEmptyPerson,
  parseResultSections,
  extractScore,
} from './helpers';
