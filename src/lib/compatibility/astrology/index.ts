/**
 * @file Advanced Astrology Analysis modules index
 *
 * This directory contains modularized components from advancedAstrologyAnalysis.ts:
 * - types.ts: All type definitions and interfaces
 * - element-utils.ts: Element compatibility utility functions
 * - aspect-utils.ts: Aspect calculation utilities
 *
 * Main analysis functions remain in advancedAstrologyAnalysis.ts for backward compatibility.
 */

// Re-export types
export * from './types';

// Re-export element utilities
export {
  isCompatibleElement,
  isNeutralElement,
  isIncompatibleElement,
  getElementForSign,
  calculateEclipticDegree,
  calculateExactAngle,
  getSignFromDegree,
  getDegreeInSign,
} from './element-utils';

// Re-export aspect utilities
export {
  determineAspectType,
  isAspectHarmonious,
  calculateAspectStrength,
  getAspectInterpretation,
  detectAspectPattern,
} from './aspect-utils';

// Note: Main analysis functions remain in ../advancedAstrologyAnalysis.ts
// Import them directly from there to avoid circular dependencies:
// import { analyzeAspects, ... } from '@/lib/compatibility/advancedAstrologyAnalysis';
