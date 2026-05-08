/**
 * @file Ultra Precision Engine Types
 * 초정밀 타이밍 엔진 타입 정의
 */

import type { PreciseTwelveStage, BranchInteraction } from './advancedTimingEngine';
import type { PredictionGrade } from './index';
import type { LunarPhase } from './precisionEngine';

// ============================================================
// 기본 타입
// ============================================================

export type FiveElement = '목' | '화' | '토' | '금' | '수';
export type TwelveStage = '장생' | '목욕' | '관대' | '건록' | '제왕' | '쇠' | '병' | '사' | '묘' | '절' | '태' | '양';

// ============================================================
// 일진 분석 타입
// ============================================================

export interface DailyPillarAnalysis {
  stem: string;
  branch: string;
  element: FiveElement;
  sibsin: string;
  twelveStage: PreciseTwelveStage;
  branchInteractions: BranchInteraction[];
  score: number;
  description: string;
}

// ============================================================
// 공망 분석 타입
// ============================================================

export interface GongmangAnalysis {
  emptyBranches: string[];      // 공망 지지 2개
  isToday空: boolean;           // 오늘이 공망인지
  affectedAreas: string[];      // 영향받는 영역
  score: number;                // 공망이면 -15~-25
  advice: string;
}

// ============================================================
// 신살 분석 타입
// ============================================================

export interface ShinsalAnalysis {
  active: ShinsalHit[];
  score: number;
  interpretation: string;
}

export interface ShinsalHit {
  name: string;
  type: 'lucky' | 'unlucky' | 'special';
  description: string;
  score: number;
  affectedArea: string;
}

export interface ShinsalRule {
  name: string;
  type: 'lucky' | 'unlucky' | 'special';
  check: (dayBranch: string, targetBranch: string) => boolean;
  score: number;
  description: string;
  affectedArea: string;
}

// ============================================================
// 에너지 흐름 타입
// ============================================================

export interface EnergyFlowAnalysis {
  tonggeun: TonggeunResult[];   // 통근 (지지에 뿌리)
  tuechul: TuechulResult[];     // 투출 (천간에 드러남)
  energyStrength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak';
  dominantElement: FiveElement;
  score: number;
  description: string;
}

export interface TonggeunResult {
  stem: string;
  rootBranch: string;
  strength: number;             // 0-100
  description: string;
}

export interface TuechulResult {
  hiddenStem: string;
  fromBranch: string;
  revealedIn: string;
  significance: string;
}

// ============================================================
// 트랜짓 타입
// ============================================================

export interface TransitIntegration {
  planetaryHour: PlanetaryHour;
  moonPhase: MoonPhaseInfo;
  retrogradeWarnings: string[];
  aspectHighlights: string[];
  score: number;
}

export interface PlanetaryHour {
  planet: string;
  quality: 'beneficial' | 'neutral' | 'challenging';
  bestFor: string[];
}

export interface MoonPhaseInfo {
  phase: string;
  illumination: number;
  quality: 'growing' | 'full' | 'waning' | 'new';
  advice: string;
}

// ============================================================
// 시간대별 조언 타입
// ============================================================

export interface HourlyAdvice {
  hour: number;                 // 0-23
  siGan: string;                // 시간 지지 (子, 丑, 寅...)
  quality: 'excellent' | 'good' | 'neutral' | 'caution';
  activity: string;
}

// ============================================================
// 종합 점수 타입
// ============================================================

export interface UltraPrecisionScore {
  date: Date;
  year: number;
  month: number;
  day: number;

  // 일진 분석
  dailyPillar: DailyPillarAnalysis;

  // 공망 분석
  gongmang: GongmangAnalysis;

  // 신살 분석
  shinsal: ShinsalAnalysis;

  // 통근/투출 분석
  energyFlow: EnergyFlowAnalysis;

  // 트랜짓 통합
  transitIntegration: TransitIntegration;

  // 종합 점수
  totalScore: number;           // 0-100
  confidence: number;           // 0-100
  grade: PredictionGrade;

  // 해석
  dayQuality: 'excellent' | 'good' | 'neutral' | 'caution' | 'avoid';
  themes: string[];
  bestActivities: string[];
  avoidActivities: string[];
  hourlyAdvice: HourlyAdvice[];
}

export interface CalculateDailyScoreInput {
  date: Date;
  dayStem: string;              // 사주 일간
  dayBranch: string;            // 사주 일지
  monthBranch: string;          // 사주 월지
  yearBranch: string;           // 사주 년지
  allStems: string[];           // 모든 천간
  allBranches: string[];        // 모든 지지
  moonPhase?: MoonPhaseInfo;    // 달 위상 (선택)
}

// ============================================================
// 분 단위 정밀 분석 타입 (TIER 5)
// ============================================================

export interface MinutePrecisionResult {
  datetime: Date;
  hour: number;
  minute: number;

  // 시간 지지 (시주)
  hourBranch: string;
  hourStem: string;

  // 행성시 분석
  planetaryHour: {
    planet: string;
    element: FiveElement;
    quality: 'excellent' | 'good' | 'neutral' | 'caution' | 'avoid';
    goodFor: string[];
    startTime: Date;
    endTime: Date;
    percentComplete: number; // 해당 행성시의 진행률
  };

  // 28수 분석
  lunarMansion: {
    name: string;
    nameKo: string;
    element: FiveElement;
    isAuspicious: boolean;
    goodFor: string[];
    badFor: string[];
  };

  // 달 위상
  lunarPhase: {
    phase: LunarPhase;
    phaseName: string;
    influence: 'strong' | 'moderate' | 'weak';
  };

  // 절기 에너지
  solarTerm: {
    nameKo: string;
    element: FiveElement;
    energy: 'yang' | 'yin';
    seasonPhase: 'early' | 'mid' | 'late';
  };

  // 종합 점수
  score: number;
  grade: PredictionGrade;

  // 해당 시간에 최적인 활동
  optimalActivities: string[];
  avoidActivities: string[];

  // 정밀 조언
  advice: string;
}
