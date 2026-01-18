/**
 * @file Advanced Astrology Analysis modules index
 *
 * This directory contains modularized components from advancedAstrologyAnalysis.ts:
 * - types.ts: All type definitions and interfaces
 * - element-utils.ts: Element compatibility utility functions
 * - aspect-utils.ts: Aspect calculation utilities
 * - basic-analysis.ts: Basic aspect and synastry analysis
 * - composite-house.ts: Composite chart and house overlay analysis
 * - planet-analysis.ts: Mercury, Jupiter, Saturn analysis
 * - outer-planets.ts: Uranus, Neptune, Pluto analysis
 * - nodes-lilith.ts: Node and Lilith analysis
 * - davison-progressed.ts: Davison and progressed chart analysis
 * - degree-aspects.ts: Degree-based aspect calculation
 * - comprehensive.ts: Combined comprehensive analysis
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

// Re-export basic analysis
export {
  analyzeAspects,
  analyzeSynastry,
} from './basic-analysis';

// Re-export composite and house analysis
export {
  analyzeCompositeChart,
  analyzeHouseOverlays,
  type CompositeChartAnalysis,
  type HouseOverlayAnalysis,
} from './composite-house';

// Re-export planet analysis
export {
  analyzeMercuryAspects,
  analyzeJupiterAspects,
  analyzeSaturnAspects,
  type MercuryAspectAnalysis,
  type JupiterAspectAnalysis,
  type SaturnAspectAnalysis,
} from './planet-analysis';

// Re-export outer planets analysis
export {
  analyzeOuterPlanets,
  type OuterPlanetAnalysis,
} from './outer-planets';

// Re-export nodes and lilith analysis
export {
  analyzeNodes,
  analyzeLilith,
  type NodeAnalysis,
  type LilithAnalysis,
} from './nodes-lilith';

// Re-export davison and progressed chart analysis
export {
  analyzeDavisonChart,
  analyzeProgressedChart,
  type DavisonChartAnalysis,
  type ProgressedChartAnalysis,
} from './davison-progressed';

// Re-export degree-based aspects
export {
  analyzeDegreeBasedAspects,
  SIGN_START_DEGREES,
  ASPECT_ORBS,
  type DegreeBasedAspect,
  type DegreeAspectAnalysis,
} from './degree-aspects';

// Re-export comprehensive analysis
export {
  performComprehensiveAstrologyAnalysis,
  performExtendedAstrologyAnalysis,
  type ComprehensiveAstrologyCompatibility,
  type ExtendedAstrologyProfile,
  type ExtendedAstrologyCompatibility,
} from './comprehensive';
