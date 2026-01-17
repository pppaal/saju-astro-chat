/**
 * 생애 예측 엔진 타입 정의
 * lifePredictionEngine.ts에서 분리된 타입들
 */

import type {
  FiveElement,
  BranchInteraction,
  PreciseTwelveStage,
} from './advancedTimingEngine';

import type {
  DaeunInfo,
  LifeSyncAnalysis,
} from './daeunTransitSync';

import type {
  SolarTerm,
  LunarMansion,
  LunarPhase,
  PlanetaryHour,
  CausalFactor,
  EventCategoryScores,
} from './precisionEngine';

import type { PredictionGrade } from './index';

// ============================================================
// 점성술 데이터 타입
// ============================================================

/** 점성술 데이터 타입 (API로부터 전달받음) */
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

/** 트랜짓 애스펙트 타입 */
export interface TransitAspectForPrediction {
  transitPlanet: string;
  natalPoint: string;
  type: string; // conjunction, trine, square, opposition, sextile
  orb: number;
  isApplying: boolean;
}

/** 외행성 위치 타입 */
export interface OuterPlanetPosition {
  name: string;
  longitude: number;
  sign: string;
  house: number;
  retrograde?: boolean;
}

/** 고급 점성술 데이터 */
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

/** 생애 예측 입력 */
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
// 다년간 트렌드 분석 타입
// ============================================================

/** 다년간 트렌드 분석 */
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

/** 연간 점수 */
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

/** 대운 전환점 */
export interface DaeunTransitionPoint {
  year: number;
  age: number;
  fromDaeun: DaeunInfo;
  toDaeun: DaeunInfo;
  impact: 'major_positive' | 'positive' | 'neutral' | 'challenging' | 'major_challenging';
  description: string;
}

/** 생애 주기 단계 */
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
// 과거 회고 분석 타입
// ============================================================

/** 과거 회고 분석 (확장된 버전) */
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
// 이벤트 타이밍 분석 타입
// ============================================================

/** 이벤트 타입 */
export type EventType = 'marriage' | 'career' | 'investment' | 'move' | 'study' | 'health' | 'relationship';

/** 이벤트 타이밍 결과 */
export interface EventTimingResult {
  eventType: EventType;
  searchRange: { startYear: number; endYear: number };
  optimalPeriods: OptimalPeriod[];
  avoidPeriods: AvoidPeriod[];
  nextBestWindow: OptimalPeriod | null;
  advice: string;
}

/** 최적 기간 */
export interface OptimalPeriod {
  startDate: Date;
  endDate: Date;
  score: number;
  grade: PredictionGrade;
  reasons: string[];
  specificDays?: Date[];
}

/** 피해야 할 기간 */
export interface AvoidPeriod {
  startDate: Date;
  endDate: Date;
  score: number;
  reasons: string[];
}

// ============================================================
// 종합 예측 결과 타입
// ============================================================

/** 종합 예측 결과 */
export interface ComprehensivePrediction {
  input: LifePredictionInput;
  generatedAt: Date;
  multiYearTrend: MultiYearTrend;
  upcomingHighlights: UpcomingHighlight[];
  lifeSync?: LifeSyncAnalysis;
  confidence: number;
}

/** 다가오는 하이라이트 */
export interface UpcomingHighlight {
  type: 'peak' | 'transition' | 'challenge' | 'opportunity';
  date: Date;
  title: string;
  description: string;
  score: number;
  actionItems: string[];
}

// ============================================================
// 주간 분석 타입
// ============================================================

/** 주간 기간 */
export interface WeeklyPeriod {
  startDate: Date;
  endDate: Date;
  weekNumber: number;
  averageScore: number;
  bestDay: Date;
  bestDayScore: number;
  grade: PredictionGrade;
  summary: string;
  reasons?: string[];
  bestDays?: Date[];
}

/** 주간 이벤트 타이밍 결과 */
export interface WeeklyEventTimingResult {
  eventType: EventType;
  searchWeeks: number;
  searchRange: { startDate: Date; endDate: Date };
  weeklyPeriods: WeeklyPeriod[];
  bestWeek: WeeklyPeriod | null;
  worstWeek: WeeklyPeriod | null;
  overallAdvice: string;
  summary: string;
}

// ============================================================
// 내부 헬퍼 타입
// ============================================================

/** 보너스 계산 결과 */
export interface BonusResult {
  bonus: number;
  reasons: string[];
  penalties: string[];
}

/** 신살 정보 */
export interface ShinsalInfo {
  name: string;
  type: 'lucky' | 'unlucky';
}
