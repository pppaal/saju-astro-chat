// Core Matrix Types
// Extracted from matrixAnalyzer.ts for better modularity

export interface MatrixFusion {
  level: string
  score: number
  icon: string
  color: string
  keyword: { ko: string; en: string }
  description: { ko: string; en: string }
}

export interface MatrixSynergyResult {
  topStrengths: Array<{
    area: string
    score: number
    icon: string
    description: { ko: string; en: string }
  }>
  topCautions: Array<{
    area: string
    score: number
    icon: string
    description: { ko: string; en: string }
  }>
  overallScore: number
  dominantEnergy: { ko: string; en: string }
}

export interface FusionSummary {
  extreme: number
  amplify: number
  balance: number
  clash: number
  conflict: number
}

// Layer 1: Element Core
export interface ElementFusionResult {
  sajuElement: string
  westElement: string
  fusion: MatrixFusion
}

// Layer 2: Sibsin-Planet
export interface SibsinPlanetResult {
  sibsin: string
  planet: string
  fusion: MatrixFusion
  planetKeyword: { ko: string; en: string }
  sibsinKeyword: { ko: string; en: string }
}

// Layer 3: Sibsin-House
export interface SibsinHouseResult {
  sibsin: string
  sibsinKeyword: { ko: string; en: string }
  house: number
  houseKeyword: { ko: string; en: string }
  fusion: MatrixFusion
}

// Layer 4: Timing Overlay
export interface TimingOverlayResult {
  timingCycle: string
  transitCycle: string
  fusion: MatrixFusion
  timingInfo: { ko: string; en: string }
  transitInfo: { ko: string; en: string }
  advice?: string
}

// Layer 5: Relation-Aspect
export interface RelationAspectResult {
  relation: string
  aspect: string
  fusion: MatrixFusion
  relationInfo: { ko: string; en: string }
  aspectInfo: { ko: string; en: string }
  advice?: string
}

// Layer 6: Twelve Stage-House
export interface LifeCycleResult {
  stage: string
  house: number
  fusion: MatrixFusion
  stageInfo: { ko: string; en: string }
  lifeArea: string
}

// Layer 7: Advanced Analysis (Pattern × Progression)
export interface AdvancedAnalysisResult {
  pattern: string
  progression: string
  fusion: MatrixFusion
  patternInfo: { ko: string; en: string }
  progressionInfo: { ko: string; en: string }
  advice?: string
}

// Layer 8: Shinsal-Planet
export interface ShinsalPlanetResult {
  shinsal: string
  shinsalInfo: { ko: string; en: string; effect: string; effectEn: string }
  planet: string
  fusion: MatrixFusion
  category: 'lucky' | 'challenging' | 'special'
}

// Layer 9: Asteroid-House
export interface AsteroidHouseResult {
  asteroid: string
  asteroidInfo: { ko: string; en: string; theme: string; themeEn: string }
  house: number
  fusion: MatrixFusion
  lifeArea: string
}

// Layer 10: Extra Points
export interface ExtraPointResult {
  extraPoint: string
  element?: string
  sibsin?: string
  fusion: MatrixFusion
  pointInfo: { ko: string; en: string; theme: string; themeEn: string }
  advice?: string
}

// Core Matrix Analysis Result (Layers 1, 2, 3, 6, 8, 9)
export interface MatrixAnalysisResult {
  elementFusions: ElementFusionResult[]
  sibsinPlanetFusions: SibsinPlanetResult[]
  lifeCycles: LifeCycleResult[]
  synergy: MatrixSynergyResult
  fusionSummary: FusionSummary
}

// Full Matrix Analysis Result (All 10 Layers)
export interface FullMatrixAnalysisResult {
  elementFusions: ElementFusionResult[]
  sibsinPlanetFusions: SibsinPlanetResult[]
  lifeCycles: LifeCycleResult[]
  synergy: MatrixSynergyResult
  fusionSummary: FusionSummary
  timingOverlays?: TimingOverlayResult[]
  relationAspects?: RelationAspectResult[]
  advancedAnalysis?: AdvancedAnalysisResult[]
  extraPoints?: ExtraPointResult[]
  sibsinHouseFusions?: SibsinHouseResult[]
  asteroidHouseFusions?: AsteroidHouseResult[]
}
