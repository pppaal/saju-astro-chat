/**
 * @file Type definitions for Life Prediction Engine
 */

import type { DaeunInfo } from '../daeunTransitSync';
import type {
  FiveElement,
  TwelveStage,
  BranchInteraction,
  PreciseTwelveStage,
} from '../advancedTimingEngine';
import type { PredictionGrade } from '../index';
import type {
  SolarTerm,
  LunarMansion,
  LunarPhase,
  PlanetaryHour,
  CausalFactor,
  EventCategoryScores,
} from '../precisionEngine';

// Re-export commonly used types
export type { DaeunInfo, FiveElement, TwelveStage, BranchInteraction, PreciseTwelveStage, PredictionGrade };
export type { SolarTerm, LunarMansion, LunarPhase, PlanetaryHour, CausalFactor, EventCategoryScores };

// Astrology data type (received from API)
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

// Transit aspect type
export interface TransitAspectForPrediction {
  transitPlanet: string;
  natalPoint: string;
  type: string; // conjunction, trine, square, opposition, sextile
  orb: number;
  isApplying: boolean;
}

// Outer planet position type
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
  // TIER 4: Current transit data
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
  // Astrology data (optional)
  astroChart?: AstroDataForPrediction;
  advancedAstro?: AdvancedAstroForPrediction;
}

// Multi-year trend analysis
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

// Past retrospective analysis (extended version)
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

  // TIER 5: Ultra-precision analysis fields
  solarTerm?: SolarTerm;
  lunarMansion?: LunarMansion;
  lunarDay?: number;
  lunarPhase?: LunarPhase;
  planetaryHours?: PlanetaryHour[];
  causalFactors?: CausalFactor[];
  eventCategoryScores?: EventCategoryScores;
  confidence?: number;

  // Event-specific detailed analysis
  detailedAnalysis?: {
    career: { score: number; factors: string[]; whyHappened: string[] };
    finance: { score: number; factors: string[]; whyHappened: string[] };
    relationship: { score: number; factors: string[]; whyHappened: string[] };
    health: { score: number; factors: string[]; whyHappened: string[] };
    travel: { score: number; factors: string[]; whyHappened: string[] };
    education: { score: number; factors: string[]; whyHappened: string[] };
  };
}

// Event timing analysis
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
  reasons: string[];
}

// Comprehensive prediction result
export interface ComprehensivePrediction {
  input: LifePredictionInput;
  generatedAt: Date;
  multiYearTrend: MultiYearTrend;
  upcomingHighlights: UpcomingHighlight[];
  lifeSync?: import('../daeunTransitSync').LifeSyncAnalysis;
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

// Weekly event timing
export interface WeeklyPeriod {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  score: number;
  grade: PredictionGrade;
  dailyScores: Array<{ date: Date; score: number; dayPillar: string }>;
  themes: string[];
  bestDays: Date[];
  avoidDays: Date[];
}

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
