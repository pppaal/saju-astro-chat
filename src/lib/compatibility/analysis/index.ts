/**
 * @file Advanced Saju Analysis modules
 *
 * This directory contains modularized analysis functions for Saju compatibility.
 * For backward compatibility, all exports are re-exported from the main file.
 *
 * Available modules:
 * - types.ts: Shared types and interfaces
 * - element-utils.ts: Element manipulation utilities
 *
 * The following are still in advancedSajuAnalysis.ts (to be extracted incrementally):
 * - Ten Gods (십성) analysis
 * - Shinsals (신살) analysis
 * - Hap (합) analysis
 * - Conflicts (충) analysis
 * - Yongsin (용신) analysis
 * - Daeun (대운) analysis
 * - Seun (세운) analysis
 * - Gongmang (공망) analysis
 * - GanHap (간합) analysis
 * - Gyeokguk (격국) analysis
 * - Twelve States (십이운성) analysis
 */

// Re-export shared types
export * from './types';

// Re-export element utilities
export * from './element-utils';

// Re-export all analysis functions from main file for backward compatibility
export {
  // Types
  type TenGodAnalysis,
  type ShinsalAnalysis,
  type HapAnalysis,
  type ConflictAnalysis,
  type ComprehensiveSajuCompatibility,
  type YongsinAnalysis,
  type DaeunCompatibility,
  type DaeunPeriod,
  type SeunCompatibility,
  type GongmangAnalysis,
  type GanHapAnalysis,
  type GanHapCombination,
  type GyeokgukAnalysis,
  type TwelveStatesAnalysis,
  type ExtendedSajuCompatibility,

  // Analysis functions
  analyzeTenGods,
  analyzeShinsals,
  analyzeHap,
  analyzeConflicts,
  performComprehensiveSajuAnalysis,
  analyzeYongsinCompatibility,
  analyzeDaeunCompatibility,
  analyzeSeunCompatibility,
  analyzeGongmang,
  analyzeGanHap,
  analyzeGyeokguk,
  analyzeTwelveStates,
  performExtendedSajuAnalysis,
} from '../advancedSajuAnalysis';
