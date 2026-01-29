// Type definitions for compatibility fun-insights

import type {
  TenGodAnalysis,
  ShinsalAnalysis,
  HapAnalysis,
  ConflictAnalysis,
  ComprehensiveSajuCompatibility,
  YongsinAnalysis,
  SeunCompatibility,
  GongmangAnalysis,
  GanHapAnalysis,
  GyeokgukAnalysis,
  TwelveStatesAnalysis,
} from '@/lib/compatibility/advancedSajuAnalysis'

import type {
  AspectAnalysis,
  SynastryAnalysis,
  CompositeChartAnalysis,
  HouseOverlayAnalysis,
  MercuryAspectAnalysis,
  JupiterAspectAnalysis,
  SaturnAspectAnalysis,
  OuterPlanetAnalysis,
  NodeAnalysis,
} from '@/lib/compatibility/advancedAstrologyAnalysis'

import type { CrossAnalysisResult } from '@/lib/compatibility/crossSystemAnalysis'

export interface PersonData {
  name: string
  date: string
  time: string
  city: string
  relation?: string
}

export interface SajuProfile {
  dayMaster: {
    name: string
    element: string
  }
  pillars: {
    year: { stem: string; branch: string }
    month: { stem: string; branch: string }
    day: { stem: string; branch: string }
    time: { stem: string; branch: string }
  }
  elements: {
    wood: number
    fire: number
    earth: number
    metal: number
    water: number
  }
  fiveElements?: Record<string, number>
}

export interface AstrologyProfile {
  sun: { sign: string; element: string }
  moon: { sign: string; element: string }
  venus: { sign: string; element: string }
  mars: { sign: string; element: string }
  ascendant?: { sign: string; element: string }
  mercury?: { sign: string; element: string }
  jupiter?: { sign: string; element: string }
  saturn?: { sign: string; element: string }
  uranus?: { sign: string; element: string }
  neptune?: { sign: string; element: string }
  pluto?: { sign: string; element: string }
  northNode?: { sign: string; element: string }
  southNode?: { sign: string; element: string }
  planets?: Record<string, { sign: string; element: string }>
}

export interface CompatibilityData {
  persons: PersonData[]
  person1Saju?: SajuProfile
  person2Saju?: SajuProfile
  person1Astro?: AstrologyProfile
  person2Astro?: AstrologyProfile

  // Basic Saju Analysis
  sajuAnalysis?: ComprehensiveSajuCompatibility
  tenGods?: TenGodAnalysis
  shinsals?: ShinsalAnalysis
  harmonies?: HapAnalysis
  conflicts?: ConflictAnalysis

  // Extended Saju Analysis
  yongsin?: YongsinAnalysis
  seun?: SeunCompatibility
  gongmang?: GongmangAnalysis
  ganHap?: GanHapAnalysis
  gyeokguk?: GyeokgukAnalysis
  twelveStates?: TwelveStatesAnalysis

  // Basic Astrology Analysis
  aspects?: AspectAnalysis
  synastry?: SynastryAnalysis
  compositeChart?: CompositeChartAnalysis

  // Extended Astrology Analysis
  houseOverlays?: HouseOverlayAnalysis
  mercuryAspects?: MercuryAspectAnalysis
  jupiterAspects?: JupiterAspectAnalysis
  saturnAspects?: SaturnAspectAnalysis
  outerPlanets?: OuterPlanetAnalysis
  nodes?: NodeAnalysis

  // Cross-System Fusion (Saju × Astrology)
  crossSystemAnalysis?: CrossAnalysisResult | null

  // Overall scores
  overallScore?: number
  sajuScore?: number
  astroScore?: number
  crossScore?: number
}

export type TabId =
  | 'overview'
  | 'chemistry'
  | 'harmony'
  | 'fusion'
  | 'synastry'
  | 'deepSaju'
  | 'deepAstro'
  | 'future'

export interface TabProps {
  data: CompatibilityData
  isKo: boolean
  lang: string
}
