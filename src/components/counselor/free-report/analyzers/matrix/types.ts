/**
 * Matrix Analyzer Types
 *
 * Destiny Fusion Matrix™ 분석 타입 정의
 */

export interface MatrixFusion {
  level: string
  score: number
  icon: string
  color: string
  keyword: { ko: string; en: string }
  description: { ko: string; en: string }
}

export interface ElementFusionResult {
  sajuElement: string
  westElement: string
  fusion: MatrixFusion
}

export interface SibsinPlanetResult {
  sibsin: string
  planet: string
  fusion: MatrixFusion
  planetKeyword: { ko: string; en: string }
  sibsinKeyword: { ko: string; en: string }
}

export interface LifeCycleResult {
  stage: string
  house: number
  fusion: MatrixFusion
  stageInfo: { ko: string; en: string }
  lifeArea: string
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

export interface ShinsalPlanetResult {
  shinsal: string
  shinsalInfo: { ko: string; en: string; effect: string; effectEn: string }
  planet: string
  fusion: MatrixFusion
  category: 'lucky' | 'challenging' | 'special'
}

export interface AsteroidHouseResult {
  asteroid: string
  asteroidInfo: { ko: string; en: string; theme: string; themeEn: string }
  house: number
  fusion: MatrixFusion
  lifeArea: string
}

export interface SibsinHouseResult {
  sibsin: string
  sibsinKeyword: { ko: string; en: string }
  house: number
  houseKeyword: { ko: string; en: string }
  fusion: MatrixFusion
}

export interface TimingOverlayResult {
  timingCycle: string
  transitCycle: string
  fusion: MatrixFusion
  timingInfo: { ko: string; en: string }
  transitInfo: { ko: string; en: string }
  advice?: string
}

export interface RelationAspectResult {
  relation: string
  aspect: string
  fusion: MatrixFusion
  relationInfo: { ko: string; en: string }
  aspectInfo: { ko: string; en: string }
  advice?: string
}

export interface AdvancedAnalysisResult {
  pattern: string
  progression: string
  fusion: MatrixFusion
  patternInfo: { ko: string; en: string }
  progressionInfo: { ko: string; en: string }
  advice?: string
}

export interface ExtraPointResult {
  extraPoint: string
  element?: string
  sibsin?: string
  fusion: MatrixFusion
  pointInfo: { ko: string; en: string; theme: string; themeEn: string }
  advice?: string
}

export interface LoveMatrixResult {
  shinsalLove: ShinsalPlanetResult[]
  asteroidLove: AsteroidHouseResult[]
  loveScore: number
  loveMessage: { ko: string; en: string }
}

export interface CareerMatrixResult {
  sibsinCareer: SibsinHouseResult[]
  careerStrengths: Array<{ area: string; score: number; icon: string }>
  careerScore: number
  careerMessage: { ko: string; en: string }
}

export interface MatrixAnalysisResult {
  elementFusions: ElementFusionResult[]
  sibsinPlanetFusions: SibsinPlanetResult[]
  lifeCycles: LifeCycleResult[]
  synergy: MatrixSynergyResult
  fusionSummary: {
    extreme: number
    amplify: number
    balance: number
    clash: number
    conflict: number
  }
}

export interface FullMatrixAnalysisResult {
  elementFusions: ElementFusionResult[]
  sibsinPlanetFusions: SibsinPlanetResult[]
  lifeCycles: LifeCycleResult[]
  synergy: MatrixSynergyResult
  fusionSummary: {
    extreme: number
    amplify: number
    balance: number
    clash: number
    conflict: number
  }
  timingOverlays?: TimingOverlayResult[]
  relationAspects?: RelationAspectResult[]
  advancedAnalysis?: AdvancedAnalysisResult[]
  extraPoints?: ExtraPointResult[]
  sibsinHouseFusions?: SibsinHouseResult[]
  asteroidHouseFusions?: AsteroidHouseResult[]
}
