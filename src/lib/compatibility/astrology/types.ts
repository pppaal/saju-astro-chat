/**
 * @file Shared types for advanced astrology analysis
 */

import type { AstrologyProfile } from '../cosmicCompatibility'

export type { AstrologyProfile }

// Basic Aspect Types
export type AspectType =
  | 'conjunction' // 0° - 합
  | 'sextile' // 60° - 육분
  | 'square' // 90° - 사분
  | 'trine' // 120° - 삼분
  | 'opposition' // 180° - 대립

// Extended Aspect Types
export type ExtendedAspectType =
  | AspectType
  | 'quincunx' // 150° - 인콘점트
  | 'semisextile' // 30° - 세미섹스타일
  | 'semisquare' // 45° - 세미스퀘어
  | 'sesquiquadrate' // 135° - 세스퀴스퀘어

export interface Aspect {
  planet1: string
  planet2: string
  type: AspectType
  angle: number
  orb: number
  isHarmonious: boolean
  strength: 'strong' | 'moderate' | 'weak'
  interpretation: string
}

export interface AspectAnalysis {
  majorAspects: Aspect[]
  harmoniousCount: number
  challengingCount: number
  overallHarmony: number // 0-100
  keyInsights: string[]
}

export interface SynastryAnalysis {
  emotionalConnection: number
  intellectualConnection: number
  romanticConnection: number
  compatibilityIndex: number
  strengths: string[]
  challenges: string[]
}

export interface CompositeChartAnalysis {
  compositeSun: string
  compositeMoon: string
  relationshipTheme: string
  strengths: string[]
  growthAreas: string[]
  overallCompatibility: number
}

export interface HouseOverlayAnalysis {
  houseActivations: { house: number; effect: string }[]
  keyHouses: number[]
  interpretation: string
}

export interface ComprehensiveAstrologyCompatibility {
  aspects: AspectAnalysis
  synastry: SynastryAnalysis
  composite: CompositeChartAnalysis
  houseOverlays: HouseOverlayAnalysis
  overallScore: number
  summary: string
}

// Degree-based aspect types
export interface DegreeBasedAspect {
  planet1: string
  planet2: string
  planet1Degree: number
  planet2Degree: number
  exactAngle: number
  aspectType: ExtendedAspectType | null
  orb: number
  isApplying: boolean // 접근 중인지 분리 중인지
  strength: number // 0-100
  interpretation: string
}

export interface DegreeAspectAnalysis {
  aspects: DegreeBasedAspect[]
  dominantAspects: DegreeBasedAspect[]
  aspectPattern: string | null // Grand Trine, T-Square, etc.
  tensionScore: number
  harmonyScore: number
  insights: string[]
}

// Mercury aspect types
export interface MercuryAspectAnalysis {
  communicationStyle: string
  intellectualCompatibility: number
  conflictResolutionStyle: string
  mercuryAspects: DegreeBasedAspect[]
  insights: string[]
}

// Jupiter aspect types
export interface JupiterAspectAnalysis {
  growthAreas: string[]
  sharedPhilosophy: string
  abundanceFlow: number
  jupiterAspects: DegreeBasedAspect[]
  insights: string[]
}

// Saturn aspect types
export interface SaturnAspectAnalysis {
  commitmentLevel: number
  responsibilityDynamics: string
  growthChallenges: string[]
  saturnAspects: DegreeBasedAspect[]
  insights: string[]
}

// Outer planet types
export interface OuterPlanetAnalysis {
  uranusInfluence: {
    changeEnergy: number
    unexpectedEvents: string
    innovationAreas: string[]
  }
  neptuneInfluence: {
    spiritualConnection: number
    illusionRisk: string
    creativeAreas: string[]
  }
  plutoInfluence: {
    transformationPotential: number
    powerDynamics: string
    rebirthAreas: string[]
  }
  generationalThemes: string[]
  overallImpact: string
}

// Node analysis types
export interface NodeAnalysis {
  northNodeConnection: {
    alignment: number
    growthDirection: string
    karmicLesson: string
  }
  southNodeConnection: {
    pastLifeThemes: string[]
    comfortZone: string
    releasePattern: string
  }
  nodeAspects: DegreeBasedAspect[]
  karmicPurpose: string
  evolutionaryPath: string
}

// Lilith analysis types
export interface LilithAnalysis {
  shadowThemes: string[]
  repressedDesires: string
  powerDynamics: string
  lilithAspects: DegreeBasedAspect[]
  integrationPath: string
  transformationPotential: number
}

// Davison chart types
export interface DavisonChartAnalysis {
  davisonSun: { sign: string; degree: number }
  davisonMoon: { sign: string; degree: number }
  davisonAscendant: { sign: string; degree: number }
  relationshipBirthChart: string
  coreEnergy: string
  evolutionPath: string
  keyThemes: string[]
  challengeAreas: string[]
  overallHarmony: number
}

// Progressed chart types
export interface ProgressedChartAnalysis {
  progressedSun: { sign: string; degree: number }
  progressedMoon: { sign: string; degree: number }
  currentPhase: string
  upcomingTransitions: string[]
  relationshipEvolution: string
  growthOpportunities: string[]
  challengePeriods: string[]
  overallOutlook: string
}

// Extended types
export interface ExtendedAstrologyProfile extends Omit<
  AstrologyProfile,
  'mercury' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto' | 'northNode' | 'southNode'
> {
  mercury?: { sign: string; degree: number; element: string }
  jupiter?: { sign: string; degree: number; element: string }
  saturn?: { sign: string; degree: number; element: string }
  uranus?: { sign: string; degree: number; element: string }
  neptune?: { sign: string; degree: number; element: string }
  pluto?: { sign: string; degree: number; element: string }
  northNode?: { sign: string; degree: number }
  southNode?: { sign: string; degree: number }
  lilith?: { sign: string; degree: number }
  birthDateTime?: Date
  birthLocation?: { lat: number; lng: number }
}

export interface ExtendedAstrologyCompatibility extends ComprehensiveAstrologyCompatibility {
  degreeAspects?: DegreeAspectAnalysis
  mercuryAnalysis?: MercuryAspectAnalysis
  jupiterAnalysis?: JupiterAspectAnalysis
  saturnAnalysis?: SaturnAspectAnalysis
  outerPlanets?: OuterPlanetAnalysis
  nodeAnalysis?: NodeAnalysis
  lilithAnalysis?: LilithAnalysis
  davisonChart?: DavisonChartAnalysis
  progressedChart?: ProgressedChartAnalysis
}
