/**
 * Life Prediction Types
 * 인생 예측 엔진 타입 정의
 */

import type { FiveElement, TwelveStage, BranchInteraction, PreciseTwelveStage } from '../advancedTimingEngine';
import type { DaeunInfo, LifeSyncAnalysis } from '../daeunTransitSync';

// Re-export imported types for convenience
export type { FiveElement, TwelveStage, BranchInteraction, PreciseTwelveStage };
export type { DaeunInfo, LifeSyncAnalysis };

// ============================================================
// Prediction Grade Type
// ============================================================
export type PredictionGrade = 'S' | 'A' | 'B' | 'C' | 'D';

// ============================================================
// Solar Term Type (절기)
// ============================================================
export interface SolarTerm {
  index: number;
  name: string;
  nameKo: string;
  element: FiveElement;
  startDate: Date;
  endDate: Date;
  energy: 'yang' | 'yin';
}

// ============================================================
// Lunar Mansion Type (28수)
// ============================================================
export interface LunarMansion {
  index: number;
  name: string;
  nameKo: string;
  element: string;
  isAuspicious: boolean;
  goodFor: string[];
  badFor: string[];
}

// ============================================================
// Lunar Phase Type (달 위상)
// ============================================================
export interface LunarPhase {
  phase: string;
  illumination: number;
  isWaxing: boolean;
}

// ============================================================
// Planetary Hour Type (행성 시간)
// ============================================================
export interface PlanetaryHour {
  planet: string;
  startHour: number;
  endHour: number;
}

// ============================================================
// Causal Factor Type (인과 요인)
// ============================================================
export interface CausalFactor {
  factor: string;
  description: string;
  impact: 'major_positive' | 'positive' | 'neutral' | 'negative' | 'major_negative';
  affectedAreas: string[];
}

// ============================================================
// Confidence Factors Type
// ============================================================
export interface ConfidenceFactors {
  birthTimeAccuracy: 'exact' | 'approximate' | 'unknown';
  methodAlignment: number;
  dataCompleteness: number;
}

// ============================================================
// Event Category Scores Type
// ============================================================
export interface EventCategoryScores {
  career: number;
  finance: number;
  relationship: number;
  health: number;
  travel: number;
  education: number;
}

// ============================================================
// 점성술 데이터 타입 (API로부터 전달받음)
// ============================================================
export interface AstroDataForPrediction {
  sun?: { sign?: string; house?: number; longitude?: number };
  moon?: { sign?: string; house?: number; longitude?: number };
  venus?: { sign?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  mars?: { sign?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  jupiter?: { sign?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  saturn?: { sign?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  mercury?: { sign?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  uranus?: { sign?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  neptune?: { sign?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  pluto?: { sign?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  ascendant?: { sign?: string; longitude?: number };
  mc?: { sign?: string; longitude?: number };
  planets?: Array<{ name: string; longitude?: number; sign?: string; house?: number; isRetrograde?: boolean }>;
}

// 트랜짓 애스펙트 타입
export interface TransitAspectForPrediction {
  transitPlanet: string;
  natalPoint: string;
  type: string; // conjunction, trine, square, opposition, sextile
  orb: number;
  isApplying: boolean;
}

// 외행성 위치 타입
export interface OuterPlanetPosition {
  name: string;
  longitude: number;
  sign: string;
  house: number;
  retrograde?: boolean;
}

export interface AdvancedAstroForPrediction {
  electional?: {
    moonPhase?: { phase?: string; illumination?: number };
    voidOfCourse?: { isVoid?: boolean };
    retrograde?: string[];
  };
  solarReturn?: {
    summary?: { theme?: string; keyPlanets?: string[] };
  };
  lunarReturn?: {
    summary?: { theme?: string };
  };
  progressions?: {
    secondary?: { moonPhase?: string };
  };
  eclipses?: {
    impact?: { type?: string; affectedPlanets?: string[] };
  };
  extraPoints?: {
    partOfFortune?: { sign?: string; house?: number };
  };
  // TIER 4: 현재 트랜짓 데이터
  currentTransits?: {
    date?: string;
    aspects?: TransitAspectForPrediction[];
    majorTransits?: TransitAspectForPrediction[];
    themes?: Array<{
      theme: string;
      keywords: string[];
      duration: string;
      transitPlanet: string;
      natalPoint: string;
    }>;
    outerPlanets?: OuterPlanetPosition[];
    summary?: {
      activeCount: number;
      majorCount: number;
      applyingCount: number;
      separatingCount: number;
    };
  };
}

// ============================================================
// 입력 타입
// ============================================================
export interface LifePredictionInput {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour?: number;
  gender: 'male' | 'female';
  dayStem: string;
  dayBranch: string;
  monthBranch: string;
  yearBranch: string;
  allStems: string[];
  allBranches: string[];
  daeunList?: DaeunInfo[];
  yongsin?: FiveElement[];
  kisin?: FiveElement[];
  // 점성술 데이터 (선택적)
  astroChart?: AstroDataForPrediction;
  advancedAstro?: AdvancedAstroForPrediction;
}

// ============================================================
// 다년간 트렌드 분석
// ============================================================
export interface MultiYearTrend {
  startYear: number;
  endYear: number;
  yearlyScores: YearlyScore[];
  overallTrend: 'ascending' | 'descending' | 'stable' | 'volatile';
  peakYears: number[];
  lowYears: number[];
  daeunTransitions: DaeunTransitionPoint[];
  lifeCycles: LifeCyclePhase[];
  summary: string;
}

export interface YearlyScore {
  year: number;
  age: number;
  score: number;
  grade: PredictionGrade;
  yearGanji: { stem: string; branch: string };
  twelveStage: PreciseTwelveStage;
  sibsin: string;
  branchInteractions: BranchInteraction[];
  daeun?: DaeunInfo;
  themes: string[];
  opportunities: string[];
  challenges: string[];
}

export interface DaeunTransitionPoint {
  year: number;
  age: number;
  fromDaeun: DaeunInfo;
  toDaeun: DaeunInfo;
  impact: 'major_positive' | 'positive' | 'neutral' | 'challenging' | 'major_challenging';
  description: string;
}

export interface LifeCyclePhase {
  name: string;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  theme: string;
  energy: 'rising' | 'peak' | 'declining' | 'dormant';
  recommendations: string[];
}

// ============================================================
// 과거 회고 분석
// ============================================================
export interface PastRetrospective {
  targetDate: Date;
  dailyPillar: { stem: string; branch: string };
  score: number;
  grade: PredictionGrade;
  yearGanji: { stem: string; branch: string };
  monthGanji: { stem: string; branch: string };
  twelveStage: PreciseTwelveStage;
  sibsin: string;
  branchInteractions: BranchInteraction[];
  daeun?: DaeunInfo;
  themes: string[];
  whyItHappened: string[];
  lessonsLearned: string[];

  // TIER 5: 초정밀 분석 추가 필드
  solarTerm?: SolarTerm;
  lunarMansion?: LunarMansion;
  lunarDay?: number;
  lunarPhase?: LunarPhase;
  planetaryHours?: PlanetaryHour[];
  causalFactors?: CausalFactor[];
  eventCategoryScores?: EventCategoryScores;
  confidence?: number;

  // 사건별 상세 분석
  detailedAnalysis?: {
    career: { score: number; factors: string[]; whyHappened: string[] };
    finance: { score: number; factors: string[]; whyHappened: string[] };
    relationship: { score: number; factors: string[]; whyHappened: string[] };
    health: { score: number; factors: string[]; whyHappened: string[] };
    travel: { score: number; factors: string[]; whyHappened: string[] };
    education: { score: number; factors: string[]; whyHappened: string[] };
  };
}

// ============================================================
// 이벤트 타이밍 분석
// ============================================================
export type EventType = 'marriage' | 'career' | 'investment' | 'move' | 'study' | 'health' | 'relationship';

export interface EventTimingResult {
  eventType: EventType;
  searchRange: { startYear: number; endYear: number };
  optimalPeriods: OptimalPeriod[];
  avoidPeriods: AvoidPeriod[];
  nextBestWindow: OptimalPeriod | null;
  advice: string;
}

export interface OptimalPeriod {
  startDate: Date;
  endDate: Date;
  score: number;
  grade: PredictionGrade;
  reasons: string[];
  specificDays?: Date[];
}

export interface AvoidPeriod {
  startDate: Date;
  endDate: Date;
  score: number;
  grade: string;
  reasons: string[];
}

// 주간 이벤트 타이밍
export interface WeeklyEventTimingResult {
  eventType: EventType;
  searchRange: { startDate: Date; endDate: Date };
  weeklyPeriods: WeeklyPeriod[];
  bestWeek: WeeklyPeriod | null;
  worstWeek: WeeklyPeriod | null;
  summary: string;
}

export interface WeeklyPeriod {
  startDate: Date;
  endDate: Date;
  weekNumber: number;
  score: number;
  grade: PredictionGrade;
  reasons: string[];
  bestDays: Date[];
}

// ============================================================
// 종합 예측 결과
// ============================================================
export interface ComprehensivePrediction {
  input: LifePredictionInput;
  generatedAt: Date;
  multiYearTrend: MultiYearTrend;
  upcomingHighlights: UpcomingHighlight[];
  lifeSync?: LifeSyncAnalysis;
  confidence: number;
}

export interface UpcomingHighlight {
  type: 'peak' | 'transition' | 'challenge' | 'opportunity';
  date: Date;
  title: string;
  description: string;
  score: number;
  actionItems: string[];
}

// ============================================================
// 보너스 계산 결과
// ============================================================
export interface BonusResult {
  bonus: number;
  reasons: string[];
  penalties: string[];
}

// 이벤트별 유리한 조건 타입
export interface EventFavorableConditions {
  favorableSibsin: string[];
  favorableStages: TwelveStage[];
  favorableElements: FiveElement[];
  avoidSibsin: string[];
  avoidStages: TwelveStage[];
}

// 점성술 이벤트 조건 타입
export interface AstroEventConditions extends EventFavorableConditions {
  beneficSigns: string[];
  beneficPlanets: string[];
  maleficPlanets: string[];
  moonPhaseBonus: Record<string, number>;
  favorableSigns: string[];
  keyPlanets: string[];
  favorableHouses: number[];
  avoidRetrogrades: string[];
}

// 트랜짓 이벤트 조건 타입
export interface TransitEventConditions {
  beneficPlanets: string[];
  maleficPlanets: string[];
  keyNatalPoints: string[];
  beneficAspects: string[];
  maleficAspects: string[];
  favorableHouses: number[];
}

// 신살 타입
export interface ShinsalResult {
  name: string;
  type: 'lucky' | 'unlucky';
  description?: string;
}
