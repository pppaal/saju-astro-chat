// Central export point for all matrix analyzer types

export type {
  // Core types
  MatrixFusion,
  MatrixSynergyResult,
  FusionSummary,

  // Layer results
  ElementFusionResult,
  SibsinPlanetResult,
  SibsinHouseResult,
  TimingOverlayResult,
  RelationAspectResult,
  LifeCycleResult,
  AdvancedAnalysisResult,
  ShinsalPlanetResult,
  AsteroidHouseResult,
  ExtraPointResult,

  // Composite results
  MatrixAnalysisResult,
  FullMatrixAnalysisResult,
} from './matrix.types';

export type {
  // Domain results
  LoveMatrixResult,
  CareerMatrixResult,
  HealthMatrixResult,
  KarmaMatrixResult,
  CareerAdvancedResult,
  LoveTimingResult,
  ShadowPersonalityResult,
  TimingMatrixResult,
} from './domain.types';
