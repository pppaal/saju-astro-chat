// src/lib/destiny-matrix/types.ts
// Destiny Fusion Matrix™ - Type Definitions

import type {
  FiveElement,
  SibsinKind,
  TwelveStageStandard,
  TwelveStage,
  RelationHit,
} from '../Saju/types'
import type { AspectType, ZodiacKo } from '../astrology/foundation/types'

// Re-export types for use in other modules
export type { TwelveStage, ZodiacKo, AspectType }

// ===========================
// Core Types
// ===========================

export type InteractionLevel = 'extreme' | 'amplify' | 'balance' | 'clash' | 'conflict'

export type InteractionCode = {
  level: InteractionLevel
  score: number // 1-10
  icon: string
  colorCode: 'purple' | 'green' | 'blue' | 'yellow' | 'red'
  keyword: string
  keywordEn: string
  advice?: string // Optional advice text
}

export type WesternElement = 'fire' | 'earth' | 'air' | 'water'

export type PlanetName =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'

export type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12

export type TransitCycle =
  | 'saturnReturn'
  | 'jupiterReturn'
  | 'uranusSquare'
  | 'neptuneSquare'
  | 'plutoTransit'
  | 'nodeReturn'
  | 'eclipse'
  // Retrograde cycles (역행)
  | 'mercuryRetrograde'
  | 'venusRetrograde'
  | 'marsRetrograde'
  | 'jupiterRetrograde'
  | 'saturnRetrograde'

export type LuckCycleType = 'daeun' | 'saeun' | 'wolun' | 'ilun'

export type GeokgukType =
  // 정격 (Regular Patterns) - 8종
  | 'jeonggwan' // 정관격 (正官格)
  | 'pyeongwan' // 편관격 (偏官格/칠살격)
  | 'jeongin' // 정인격 (正印格)
  | 'pyeongin' // 편인격 (偏印格)
  | 'siksin' // 식신격 (食神格)
  | 'sanggwan' // 상관격 (傷官格)
  | 'jeongjae' // 정재격 (正財格)
  | 'pyeonjae' // 편재격 (偏財格)
  // 특수격 (Special Patterns) - 2종
  | 'geonrok' // 건록격 (建祿格)
  | 'yangin' // 양인격 (羊刃格)
  // 종격 (Following Patterns) - 4종
  | 'jonga' // 종아격 (從兒格) - 식상 따름
  | 'jongjae' // 종재격 (從財格) - 재성 따름
  | 'jongsal' // 종살격 (從殺格) - 관성 따름
  | 'jonggang' // 종강격 (從强格) - 비겁 따름
  // 외격 (External Patterns) - 5종
  | 'gokjik' // 곡직격 (曲直格) - 목 일색
  | 'yeomsang' // 염상격 (炎上格) - 화 일색
  | 'gasaek' // 가색격 (稼穡格) - 토 일색
  | 'jonghyeok' // 종혁격 (從革格) - 금 일색
  | 'yunha' // 윤하격 (潤下格) - 수 일색

export type ProgressionType =
  | 'secondary'
  | 'solarArc'
  | 'solarReturn'
  | 'lunarReturn'
  | 'draconic'
  | 'harmonics'

export type BranchRelation =
  | 'samhap'
  | 'yukhap'
  | 'banghap'
  | 'chung'
  | 'hyeong'
  | 'pa'
  | 'hae'
  | 'wonjin'

// Layer 8: Shinsal Types
export type ShinsalKind =
  // 길신 (吉神) - 좋은 신살
  | '천을귀인'
  | '태극귀인'
  | '천덕귀인'
  | '월덕귀인'
  | '문창귀인'
  | '학당귀인'
  | '금여록'
  | '천주귀인'
  | '암록'
  | '건록'
  | '제왕'
  // 흉신 (凶神) - 주의가 필요한 신살
  | '도화'
  | '홍염살'
  | '양인'
  | '백호'
  | '겁살'
  | '재살'
  | '천살'
  | '지살'
  | '년살'
  | '월살'
  | '망신'
  | '고신'
  | '괴강'
  | '현침'
  | '귀문관'
  // 건강 관련 신살
  | '병부'
  | '효신살'
  | '상문살'
  // 특수 신살
  | '역마'
  | '화개'
  | '장성'
  | '반안'
  | '천라지망'
  | '공망'
  | '삼재'
  | '원진'

// Layer 9: Asteroid Types
export type AsteroidName = 'Ceres' | 'Pallas' | 'Juno' | 'Vesta'

// Layer 10: Extra Point Types
export type ExtraPointName =
  | 'Chiron'
  | 'Lilith'
  | 'PartOfFortune'
  | 'Vertex'
  | 'NorthNode'
  | 'SouthNode'

// ===========================
// Matrix Cell Types
// ===========================

export interface MatrixCell {
  interaction: InteractionCode
  sajuBasis?: string
  astroBasis?: string
  advice?: string
}

// ===========================
// Layer 1: Element Core Grid
// ===========================

export type ElementCoreGrid = {
  [sajuElement in FiveElement]: {
    [westElement in WesternElement]: InteractionCode
  }
}

// ===========================
// Layer 2: Sibsin-Planet Matrix
// ===========================

export type SibsinPlanetMatrix = {
  [sibsin in SibsinKind]: {
    [planet in PlanetName]: InteractionCode
  }
}

// ===========================
// Layer 3: Sibsin-House Matrix
// ===========================

export type SibsinHouseMatrix = {
  [sibsin in SibsinKind]: {
    [house in HouseNumber]: InteractionCode
  }
}

// ===========================
// Layer 4: Timing Overlay Matrix
// ===========================

export type TimingCycleRow = 'daeunTransition' | FiveElement | 'shortTerm' | 'wolun' | 'ilun'

export type TimingOverlayMatrix = {
  [row in TimingCycleRow]: {
    [transit in TransitCycle]: InteractionCode
  }
}

// ===========================
// Layer 5: Relations-Aspects Matrix
// ===========================

export type RelationAspectMatrix = {
  [relation in BranchRelation]: {
    [aspect in AspectType]: InteractionCode
  }
}

// ===========================
// Layer 6: TwelveStage-House Matrix
// ===========================

export type TwelveStageHouseMatrix = {
  [stage in TwelveStageStandard]: {
    [house in HouseNumber]: InteractionCode
  }
}

// ===========================
// Layer 7: Advanced Analysis Matrix
// ===========================

export type AdvancedAnalysisRow = GeokgukType | `yongsin_${FiveElement}`

export type AdvancedAnalysisMatrix = {
  [row in AdvancedAnalysisRow]: {
    [progression in ProgressionType]: InteractionCode
  }
}

// ===========================
// Layer 8: Shinsal-Planet Matrix
// ===========================

export type ShinsalPlanetMatrix = {
  [shinsal in ShinsalKind]: {
    [planet in PlanetName]: InteractionCode
  }
}

// ===========================
// Layer 9: Asteroid-House Matrix
// ===========================

export type AsteroidHouseMatrix = {
  [asteroid in AsteroidName]: {
    [house in HouseNumber]: InteractionCode
  }
}

export type AsteroidElementMatrix = {
  [asteroid in AsteroidName]: {
    [element in FiveElement]: InteractionCode
  }
}

// ===========================
// Layer 10: ExtraPoint-Element/Sibsin Matrix
// ===========================

export type ExtraPointElementMatrix = {
  [point in ExtraPointName]: {
    [element in FiveElement]: InteractionCode
  }
}

export type ExtraPointSibsinMatrix = {
  [point in ExtraPointName]: Partial<{
    [sibsin in SibsinKind]: InteractionCode
  }>
}

// ===========================
// Complete Matrix Output
// ===========================

export interface DestinyFusionMatrix {
  layer1_elementCore: ElementCoreGrid
  layer2_sibsinPlanet: SibsinPlanetMatrix
  layer3_sibsinHouse: SibsinHouseMatrix
  layer4_timing: TimingOverlayMatrix
  layer5_relationAspect: RelationAspectMatrix
  layer6_stageHouse: TwelveStageHouseMatrix
  layer7_advanced: AdvancedAnalysisMatrix
  layer8_shinsalPlanet: ShinsalPlanetMatrix
  layer9_asteroidHouse: AsteroidHouseMatrix
  layer10_extraPointElement: ExtraPointElementMatrix

  // Summary
  summary: MatrixSummary
}

// Computed matrix for a specific user/context (sparse cells only)
export interface DestinyFusionMatrixComputed {
  layer1_elementCore: Record<string, MatrixCell>
  layer2_sibsinPlanet: Record<string, MatrixCell>
  layer3_sibsinHouse: Record<string, MatrixCell>
  layer4_timing: Record<string, MatrixCell>
  layer5_relationAspect: Record<string, MatrixCell>
  layer6_stageHouse: Record<string, MatrixCell>
  layer7_advanced: Record<string, MatrixCell>
  layer8_shinsalPlanet: Record<string, MatrixCell>
  layer9_asteroidHouse: Record<string, MatrixCell>
  layer10_extraPointElement: Record<string, MatrixCell>

  summary: MatrixSummary
}

export interface MatrixSummary {
  totalScore: number
  sajuComponentScore?: number
  astroComponentScore?: number
  alignmentScore?: number
  overlapStrength?: number
  timeOverlapWeight?: number
  finalScoreAdjusted?: number
  confidenceScore?: number
  drivers?: string[]
  cautions?: string[]
  calendarSignals?: Array<{
    level: 'high' | 'medium' | 'caution'
    trigger: string
    score: number
  }>
  strengthPoints: MatrixHighlight[]
  balancePoints: MatrixHighlight[]
  cautionPoints: MatrixHighlight[]
  topSynergies: MatrixSynergy[]
  domainScores?: Record<DomainKey, DomainScore>
  overlapTimeline?: MonthlyOverlapPoint[]
  overlapTimelineByDomain?: Record<DomainKey, MonthlyOverlapPoint[]>
}

export type DomainKey = 'career' | 'love' | 'money' | 'health' | 'move'

export type DomainScore = {
  domain: DomainKey
  baseFinalScore: number // 0..10
  finalScoreAdjusted: number // 0..10
  sajuComponentScore: number // 0..1
  astroComponentScore: number // 0..1
  alignmentScore: number // 0..1
  overlapStrength: number // 0..1
  timeOverlapWeight: number // 1.0..1.3
  confidenceScore: number // 0..1
  drivers: string[]
  cautions: string[]
}

export type MonthlyOverlapPoint = {
  month: string // YYYY-MM
  overlapStrength: number // 0..1
  timeOverlapWeight: number // 1.0..1.3
  peakLevel: 'peak' | 'high' | 'normal'
}

export interface MatrixHighlight {
  layer: number
  rowKey: string
  colKey: string
  cell: MatrixCell
}

export interface MatrixSynergy {
  layers: number[]
  description: string
  score: number
}

// ===========================
// Input Types for Calculation
// ===========================

export interface MatrixCalculationInput {
  // Saju data
  dayMasterElement: FiveElement
  pillarElements: FiveElement[]
  sibsinDistribution: Partial<Record<SibsinKind, number>>
  twelveStages: Partial<Record<TwelveStageStandard, number>>
  relations: RelationHit[]
  geokguk?: GeokgukType
  yongsin?: FiveElement
  currentDaeunElement?: FiveElement
  currentSaeunElement?: FiveElement

  // Shinsal data (Layer 8)
  shinsalList?: ShinsalKind[]

  // Astrology data
  dominantWesternElement?: WesternElement
  planetHouses: Partial<Record<PlanetName, HouseNumber>>
  planetSigns: Partial<Record<PlanetName, ZodiacKo>>
  aspects: Array<{
    planet1: PlanetName
    planet2: PlanetName
    type: AspectType
    // Optional precision fields used by GraphRAG evidence pairing.
    angle?: number
    orb?: number
  }>
  activeTransits?: TransitCycle[]

  // Asteroid data (Layer 9)
  asteroidHouses?: Partial<Record<AsteroidName, HouseNumber>>

  // Extra Point data (Layer 10)
  extraPointSigns?: Partial<Record<ExtraPointName, ZodiacKo>>

  // Full raw snapshots for complete downstream grounding
  sajuSnapshot?: Record<string, unknown>
  astrologySnapshot?: Record<string, unknown>
  crossSnapshot?: Record<string, unknown>
  currentDateIso?: string

  // Options
  lang?: 'ko' | 'en'
  // Optional anchor month for deterministic 12-month timeline generation (YYYY-MM)
  startYearMonth?: string
  // Optional profile context used for deterministic evidence traceability in AI reports.
  profileContext?: {
    birthDate?: string
    birthTime?: string
    birthCity?: string
    timezone?: string
    latitude?: number
    longitude?: number
    houseSystem?: string
    analysisAt?: string
  }
}
