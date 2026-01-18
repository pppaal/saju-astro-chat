/**
 * @file Saju Compatibility Analysis modules index
 *
 * This directory contains modularized components for saju compatibility analysis.
 * All analysis functions and types are exported from here.
 *
 * Modules:
 * - types.ts: All type definitions and interfaces
 * - element-utils.ts: Element utility functions
 * - ten-gods.ts: 십성(十星) 분석
 * - shinsals.ts: 신살(神殺) 분석
 * - harmonies-conflicts.ts: 합(合) 및 충형파해(沖刑破害) 분석
 * - yongsin.ts: 용신/희신 궁합 분석
 * - daeun-seun.ts: 대운/세운 흐름 비교
 * - gongmang.ts: 공망(空亡) 분석
 * - ganhap.ts: 천간합(天干合) 분석
 * - gyeokguk.ts: 격국(格局) 비교
 * - twelve-states.ts: 12운성(十二運星) 분석
 * - comprehensive.ts: 종합 분석
 */

// Re-export all types
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

// Re-export Ten Gods analysis
export { analyzeTenGods } from './ten-gods';

// Re-export Shinsal analysis
export { analyzeShinsals } from './shinsals';

// Re-export Harmonies and Conflicts analysis
export { analyzeHap, analyzeConflicts } from './harmonies-conflicts';

// Re-export Yongsin analysis
export {
  analyzeYongsinCompatibility,
  calculateYongsin,
  calculateHuisin,
} from './yongsin';

// Re-export Daeun and Seun analysis
export {
  analyzeDaeunCompatibility,
  analyzeSeunCompatibility,
} from './daeun-seun';

// Re-export Gongmang analysis
export { analyzeGongmang } from './gongmang';

// Re-export GanHap analysis
export { analyzeGanHap } from './ganhap';

// Re-export Gyeokguk analysis
export { analyzeGyeokguk } from './gyeokguk';

// Re-export Twelve States analysis
export { analyzeTwelveStates } from './twelve-states';

// Re-export Comprehensive analysis
export {
  performComprehensiveSajuAnalysis,
  performExtendedSajuAnalysis,
} from './comprehensive';
