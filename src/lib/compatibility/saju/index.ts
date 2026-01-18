/**
 * @file Saju Compatibility Analysis modules index
 *
 * This directory contains modularized components from advancedSajuAnalysis.ts:
 * - types.ts: All type definitions and interfaces
 * - element-utils.ts: Element utility functions
 *
 * Main analysis functions remain in advancedSajuAnalysis.ts for backward compatibility.
 */

// Re-export types
export * from './types';

// Re-export element utilities
export {
  normalizeElement,
  getElementKorean,
  areElementsHarmonious,
  areElementsClashing,
  stemElements,
  getElementFromStem,
  getElementStrength,
} from './element-utils';

// Note: Main analysis functions remain in ../advancedSajuAnalysis.ts
// Import them directly from there to avoid circular dependencies:
// import { analyzeTenGods, ... } from '@/lib/compatibility/advancedSajuAnalysis';
