/**
 * Destiny Map Astrology Module Index
 * 운명 지도 점성술 모듈 인덱스
 *
 * Central export hub for all destiny map astrology modules.
 * Provides backward compatibility with the original astrologyengine.ts
 */

// ======================================================
// Types (shared across all modules)
// ======================================================
export type {
  // Core types
  CombinedInput,
  CombinedResult,
  SajuData,
  AstrologyData,
  SajuPillars,
  SajuPillar,
  HouseCusp,
  TransitAspect,
  AdvancedSajuAnalysis,
  // Date/time types
  DateComponents,
  MaskedInput,
  LightPoint,
  // Analysis result types
  ElectionalResult,
  MidpointsResult,
  SummaryInput,
  // Re-exported astrology types
  AstrologyChartFacts,
  PlanetData,
  AspectHit,
  ExtraPoint,
  ReturnChart,
  ProgressedChart,
  DraconicChart,
  DraconicComparison,
  HarmonicChart,
  HarmonicProfile,
  FixedStarConjunction,
  Eclipse,
  EclipseImpact,
  MoonPhase,
  VoidOfCourseInfo,
  PlanetaryHour,
  ElectionalAnalysis,
  Midpoint,
  MidpointActivation,
  Asteroid,
  // Re-exported Saju types
  SajuFacts,
  ExtendedAdvancedAnalysis,
  GeokgukResult,
  YongsinResult,
  TonggeunResult,
  TuechulResult,
  HoegukResult,
  DeukryeongResult,
  HyeongchungAnalysis,
  SibsinComprehensiveAnalysis,
  HealthCareerComprehensive,
  ComprehensiveScore,
  UltraAdvancedAnalysis,
} from './types';

// ======================================================
// Helper Functions
// ======================================================
export {
  maskInput,
  resolveTimezone,
  getNowInTimezone,
  getYinYangFromName,
  computePoF,
  calcTransitsToLights,
  validateCoordinates,
  parseBirthDateTime,
  formatBirthTime,
} from './helpers';

// ======================================================
// Cache Manager
// ======================================================
export { CacheManager, generateDestinyMapCacheKey } from './cache-manager';

// ======================================================
// Natal Calculations
// ======================================================
export { calculateNatal } from './natal-calculations';
export { getNowInTimezone as getNowInTimezoneFromNatal } from './natal-calculations';

// ======================================================
// Advanced Points
// ======================================================
export { calculateAdvancedPoints } from './advanced-points';

// ======================================================
// Returns & Progressions
// ======================================================
export {
  calculateSolarReturnChart,
  calculateLunarReturnChart,
  calculateAllProgressions,
} from './returns-progressions';

// ======================================================
// Specialized Charts (Draconic, Harmonics)
// ======================================================
export { calculateAllSpecializedCharts } from './specialized-charts';

// ======================================================
// Asteroids & Stars
// ======================================================
export { calculateAllAsteroidsStars } from './asteroids-stars';

// ======================================================
// Electional & Midpoints
// ======================================================
export {
  calculateElectionalAnalysis,
  calculateMidpointsAnalysis,
} from './electional-midpoints';
export type { ElectionalInput } from './electional-midpoints';

// ======================================================
// Saju Orchestrator
// ======================================================
export { calculateSajuOrchestrated } from './saju-orchestrator';
export type { SajuInput, SajuOrchestrationResult } from './saju-orchestrator';

// ======================================================
// Summary Builder
// ======================================================
export { buildSummary, buildErrorSummary } from './summary-builder';

// ======================================================
// Engine Core (Main Orchestrator)
// ======================================================
export {
  computeDestinyMapRefactored,
  calculateAstrologyData,
  destinyMapCache,
} from './engine-core';

// Alias for backward compatibility
export { computeDestinyMapRefactored as computeDestinyMap } from './engine-core';
