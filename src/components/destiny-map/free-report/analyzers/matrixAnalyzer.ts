// matrixAnalyzer.ts
// Destiny Fusion Matrix™ 데이터를 활용한 고급 분석
// Main orchestrator - delegates to layer modules and provides specialized analyses

// Re-export all layer analyzers and types from matrix subfolder
export {
  // Main analysis functions
  getMatrixAnalysis,
  getFullMatrixAnalysis,
  getLoveMatrixAnalysis,
  getCareerMatrixAnalysis,
  getTimingOverlayAnalysis,
  getRelationAspectAnalysis,
  getAdvancedAnalysisResult,
  getExtraPointAnalysis,
  // Description helpers
  getElementFusionDescription,
  getSibsinPlanetDescription,
  getLifeCycleDescription,
  // Types
  type MatrixFusion,
  type ElementFusionResult,
  type SibsinPlanetResult,
  type LifeCycleResult,
  type MatrixSynergyResult,
  type ShinsalPlanetResult,
  type AsteroidHouseResult,
  type SibsinHouseResult,
  type MatrixAnalysisResult,
  type LoveMatrixResult,
  type CareerMatrixResult,
  type TimingOverlayResult,
  type RelationAspectResult,
  type AdvancedAnalysisResult,
  type ExtraPointResult,
  type FullMatrixAnalysisResult,
} from './matrix';

// ============================
// Specialized Analysis Types (re-exported from types/specialized.types.ts)
// ============================

export type {
  HealthMatrixResult,
  KarmaMatrixResult,
  CareerAdvancedResult,
  LoveTimingResult,
  ShadowPersonalityResult,
  TimingMatrixResult,
  ExtendedSajuData,
} from './types/specialized.types';

// ============================
// Specialized Analysis Functions (Re-exported)
// ============================

// Import specialized analysis functions from their own files
export { getHealthMatrixAnalysis } from './specialized/health';
export { getKarmaMatrixAnalysis } from './specialized/karma';
export { getCareerAdvancedAnalysis } from './specialized/career';
export { getLoveTimingAnalysis } from './specialized/love';
export { getShadowPersonalityAnalysis } from './specialized/shadow';
export { getTimingMatrixAnalysis } from './specialized/timing';





