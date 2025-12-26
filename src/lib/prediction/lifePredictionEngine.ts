// src/lib/prediction/lifePredictionEngine.ts
// 종합 인생 예측 엔진 - 다년간 트렌드 + 과거 회고 + 이벤트 타이밍

import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
  calculatePreciseTwelveStage,
  analyzeBranchInteractions,
  calculateSibsin,
  type FiveElement,
  type TwelveStage,
  type BranchInteraction,
  type PreciseTwelveStage,
} from './advancedTimingEngine';

import {
  analyzeDaeunTransitSync,
  convertSajuDaeunToInfo as _convertSajuDaeunToInfo,
  type DaeunInfo,
  type LifeSyncAnalysis,
} from './daeunTransitSync';

// Re-export for external use
export const convertSajuDaeunToInfo = _convertSajuDaeunToInfo;

import {
  calculateUltraPrecisionScore,
  calculateDailyPillar,
  type UltraPrecisionScore,
} from './ultraPrecisionEngine';

// TIER 5: 초정밀 분석 엔진
import {
  PrecisionEngine,
  getSolarTermForDate,
  getLunarMansion,
  getLunarPhase,
  calculatePlanetaryHours,
  calculateSecondaryProgression,
  analyzeCausalFactors,
  calculateEventCategoryScores,
  calculateConfidence,
  type SolarTerm,
  type LunarMansion,
  type LunarPhase,
  type PlanetaryHour,
  type CausalFactor,
  type EventCategoryScores,
  type ConfidenceFactors,
  type PastAnalysisDetailed,
} from './precisionEngine';

// TIER 6: 고급 분석 모듈
import { calculateTier6Bonus } from './tier6Analysis';
import { calculateTier7To10Bonus } from './tier7To10Analysis';

// ============================================================
// 타입 정의
// ============================================================

// 점성술 데이터 타입 (API로부터 전달받음)
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

// 다년간 트렌드 분석
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
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
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

// 과거 회고 분석 (확장된 버전)
export interface PastRetrospective {
  targetDate: Date;
  dailyPillar: { stem: string; branch: string };
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
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

// 이벤트 타이밍 분석
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
  grade: 'S' | 'A' | 'B';
  reasons: string[];
  specificDays?: Date[];
}

export interface AvoidPeriod {
  startDate: Date;
  endDate: Date;
  score: number;
  reasons: string[];
}

// 종합 예측 결과
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
// 상수 정의
// ============================================================

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

const STEM_ELEMENT: Record<string, FiveElement> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
};

// 이벤트별 유리한 조건
const EVENT_FAVORABLE_CONDITIONS: Record<EventType, {
  favorableSibsin: string[];
  favorableStages: TwelveStage[];
  favorableElements: FiveElement[];
  avoidSibsin: string[];
  avoidStages: TwelveStage[];
}> = {
  marriage: {
    favorableSibsin: ['정관', '정재', '정인', '식신'],
    favorableStages: ['건록', '제왕', '관대', '장생'],
    favorableElements: ['화', '목'],
    avoidSibsin: ['겁재', '상관', '편관'],
    avoidStages: ['사', '묘', '절'],
  },
  career: {
    favorableSibsin: ['정관', '편관', '정인', '식신'],
    favorableStages: ['건록', '제왕', '관대'],
    favorableElements: ['금', '토'],
    avoidSibsin: ['겁재', '상관'],
    avoidStages: ['사', '묘', '병'],
  },
  investment: {
    favorableSibsin: ['정재', '편재', '식신'],
    favorableStages: ['건록', '제왕', '장생', '관대'],
    favorableElements: ['토', '금'],
    avoidSibsin: ['겁재', '상관', '편인'],
    avoidStages: ['사', '묘', '절', '병'],
  },
  move: {
    favorableSibsin: ['편인', '식신', '편재'],
    favorableStages: ['장생', '관대', '목욕'],
    favorableElements: ['목', '수'],
    avoidSibsin: ['정관'],
    avoidStages: ['묘', '사'],
  },
  study: {
    favorableSibsin: ['정인', '편인', '식신'],
    favorableStages: ['장생', '관대', '목욕', '양'],
    favorableElements: ['수', '목'],
    avoidSibsin: ['편재', '겁재'],
    avoidStages: ['사', '묘'],
  },
  health: {
    favorableSibsin: ['정인', '비견', '식신'],
    favorableStages: ['건록', '제왕', '장생'],
    favorableElements: ['토', '금'],
    avoidSibsin: ['편관', '상관'],
    avoidStages: ['병', '사', '묘'],
  },
  relationship: {
    favorableSibsin: ['정재', '정관', '식신', '비견'],
    favorableStages: ['건록', '관대', '장생'],
    favorableElements: ['화', '목'],
    avoidSibsin: ['겁재', '편관'],
    avoidStages: ['사', '묘', '절'],
  },
};

// 이벤트별 점성 조건 (점성 데이터 활용)
const ASTRO_EVENT_CONDITIONS: Record<EventType, {
  favorableSigns: string[];  // 유리한 별자리
  keyPlanets: string[];      // 중요 행성
  favorableHouses: number[]; // 유리한 하우스
  avoidRetrogrades: string[]; // 역행 피해야 할 행성
  moonPhaseBonus: Record<string, number>; // 달 위상별 보너스
}> = {
  marriage: {
    favorableSigns: ['Libra', 'Taurus', 'Cancer', 'Leo'],
    keyPlanets: ['Venus', 'Moon', 'Jupiter'],
    favorableHouses: [7, 5, 1],
    avoidRetrogrades: ['Venus'],
    moonPhaseBonus: { 'full_moon': 8, 'waxing_gibbous': 5, 'first_quarter': 3 },
  },
  career: {
    favorableSigns: ['Capricorn', 'Leo', 'Aries', 'Virgo'],
    keyPlanets: ['Sun', 'Saturn', 'Jupiter', 'Mars'],
    favorableHouses: [10, 6, 1, 2],
    avoidRetrogrades: ['Mercury', 'Saturn'],
    moonPhaseBonus: { 'waxing_gibbous': 6, 'first_quarter': 4, 'full_moon': 5 },
  },
  investment: {
    favorableSigns: ['Taurus', 'Scorpio', 'Capricorn', 'Virgo'],
    keyPlanets: ['Jupiter', 'Venus', 'Pluto'],
    favorableHouses: [2, 8, 11],
    avoidRetrogrades: ['Mercury', 'Jupiter'],
    moonPhaseBonus: { 'new_moon': 5, 'waxing_crescent': 6, 'first_quarter': 4 },
  },
  move: {
    favorableSigns: ['Sagittarius', 'Cancer', 'Gemini'],
    keyPlanets: ['Moon', 'Mercury', 'Jupiter'],
    favorableHouses: [4, 9, 3],
    avoidRetrogrades: ['Mercury'],
    moonPhaseBonus: { 'new_moon': 7, 'waxing_crescent': 5 },
  },
  study: {
    favorableSigns: ['Gemini', 'Virgo', 'Sagittarius', 'Aquarius'],
    keyPlanets: ['Mercury', 'Jupiter', 'Uranus'],
    favorableHouses: [3, 9, 5],
    avoidRetrogrades: ['Mercury'],
    moonPhaseBonus: { 'waxing_crescent': 6, 'first_quarter': 5, 'waxing_gibbous': 4 },
  },
  health: {
    favorableSigns: ['Virgo', 'Scorpio', 'Capricorn'],
    keyPlanets: ['Sun', 'Mars', 'Saturn'],
    favorableHouses: [6, 1, 8],
    avoidRetrogrades: ['Mars'],
    moonPhaseBonus: { 'waning_gibbous': 5, 'last_quarter': 4, 'new_moon': 6 },
  },
  relationship: {
    favorableSigns: ['Libra', 'Taurus', 'Leo', 'Pisces'],
    keyPlanets: ['Venus', 'Moon', 'Mars'],
    favorableHouses: [5, 7, 11],
    avoidRetrogrades: ['Venus', 'Mars'],
    moonPhaseBonus: { 'full_moon': 7, 'waxing_gibbous': 5, 'first_quarter': 3 },
  },
};

/**
 * 점성 데이터 기반 스코어 보정 계산
 */
function calculateAstroBonus(
  input: LifePredictionInput,
  eventType: EventType
): { bonus: number; reasons: string[]; penalties: string[] } {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  if (!input.astroChart && !input.advancedAstro) {
    return { bonus: 0, reasons: [], penalties: [] };
  }

  const conditions = ASTRO_EVENT_CONDITIONS[eventType];
  const astro = input.astroChart;
  const advanced = input.advancedAstro;

  // 1. 주요 행성 별자리 체크
  if (astro) {
    // 금성 체크 (결혼/연애)
    if (astro.venus?.sign && conditions.favorableSigns.includes(astro.venus.sign)) {
      bonus += 8;
      reasons.push(`금성 ${astro.venus.sign} - ${eventType}에 유리`);
    }

    // 목성 체크 (확장/행운)
    if (astro.jupiter?.sign && conditions.favorableSigns.includes(astro.jupiter.sign)) {
      bonus += 6;
      reasons.push(`목성 ${astro.jupiter.sign} - 행운 지원`);
    }

    // 태양 하우스 체크
    if (astro.sun?.house && conditions.favorableHouses.includes(astro.sun.house)) {
      bonus += 7;
      reasons.push(`태양 ${astro.sun.house}하우스 - 에너지 집중`);
    }

    // 달 하우스 체크
    if (astro.moon?.house && conditions.favorableHouses.includes(astro.moon.house)) {
      bonus += 5;
      reasons.push(`달 ${astro.moon.house}하우스 - 감정 지원`);
    }

    // Part of Fortune 체크
    if (advanced?.extraPoints?.partOfFortune?.house &&
        conditions.favorableHouses.includes(advanced.extraPoints.partOfFortune.house)) {
      bonus += 6;
      reasons.push(`행운점 ${advanced.extraPoints.partOfFortune.house}하우스 - 길운`);
    }
  }

  // 2. 역행 체크
  if (advanced?.electional?.retrograde) {
    for (const retroPlanet of advanced.electional.retrograde) {
      if (conditions.avoidRetrogrades.includes(retroPlanet)) {
        bonus -= 10;
        penalties.push(`${retroPlanet} 역행 - ${eventType} 주의`);
      }
    }
  } else if (astro?.planets) {
    // 기본 차트에서 역행 체크
    for (const planet of astro.planets) {
      if (planet.isRetrograde && conditions.avoidRetrogrades.includes(planet.name)) {
        bonus -= 10;
        penalties.push(`${planet.name} 역행 - ${eventType} 주의`);
      }
    }
  }

  // 3. Void of Course 체크
  if (advanced?.electional?.voidOfCourse?.isVoid) {
    bonus -= 8;
    penalties.push('달 공전 (Void of Course) - 중요 결정 보류 권장');
  }

  // 4. 달 위상 보너스
  if (advanced?.electional?.moonPhase?.phase) {
    const phase = advanced.electional.moonPhase.phase;
    const phaseBonus = conditions.moonPhaseBonus[phase] || 0;
    if (phaseBonus > 0) {
      bonus += phaseBonus;
      const phaseNames: Record<string, string> = {
        'new_moon': '새달', 'waxing_crescent': '초승달', 'first_quarter': '상현달',
        'waxing_gibbous': '차오르는달', 'full_moon': '보름달', 'waning_gibbous': '기우는달',
        'last_quarter': '하현달', 'waning_crescent': '그믐달',
      };
      reasons.push(`${phaseNames[phase] || phase} - ${eventType}에 좋은 시기`);
    }
  }

  // 5. Solar Return 테마 체크
  if (advanced?.solarReturn?.summary?.theme) {
    const theme = advanced.solarReturn.summary.theme.toLowerCase();
    const themeMatches: Record<EventType, string[]> = {
      marriage: ['love', 'partnership', 'relationship', 'commitment'],
      career: ['career', 'success', 'achievement', 'recognition'],
      investment: ['money', 'wealth', 'finance', 'growth'],
      move: ['travel', 'change', 'new beginnings', 'home'],
      study: ['learning', 'education', 'knowledge', 'growth'],
      health: ['health', 'vitality', 'healing', 'wellness'],
      relationship: ['love', 'connection', 'social', 'friendship'],
    };

    if (themeMatches[eventType]?.some(t => theme.includes(t))) {
      bonus += 10;
      reasons.push(`올해 Solar Return 테마: ${eventType}와 일치`);
    }
  }

  // 6. 일식/월식 영향
  if (advanced?.eclipses?.impact) {
    const impact = advanced.eclipses.impact;
    // 일식은 새 시작, 월식은 완성/종료에 유리
    if (impact.type === 'solar' && ['career', 'move', 'study'].includes(eventType)) {
      bonus += 5;
      reasons.push('일식 영향 - 새로운 시작에 유리');
    } else if (impact.type === 'lunar' && ['marriage', 'relationship'].includes(eventType)) {
      bonus += 5;
      reasons.push('월식 영향 - 관계 완성에 유리');
    }
  }

  return { bonus, reasons, penalties };
}

/**
 * TIER 4: 트랜짓 기반 스코어 보정 계산
 * 외행성이 네이탈 차트에 미치는 영향을 분석
 */
function calculateTransitBonus(
  input: LifePredictionInput,
  eventType: EventType,
  targetMonth?: { year: number; month: number }
): { bonus: number; reasons: string[]; penalties: string[] } {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const transits = input.advancedAstro?.currentTransits;
  if (!transits) {
    return { bonus: 0, reasons: [], penalties: [] };
  }

  // 이벤트별 중요 트랜짓 조건
  const TRANSIT_EVENT_CONDITIONS: Record<EventType, {
    beneficPlanets: string[];   // 이 행성의 긍정적 애스펙트가 좋음
    maleficPlanets: string[];   // 이 행성의 부정적 애스펙트는 주의
    keyNatalPoints: string[];   // 중요 네이탈 포인트
    beneficAspects: string[];   // 긍정적 애스펙트 타입
    maleficAspects: string[];   // 부정적 애스펙트 타입
    favorableHouses: number[];  // 트랜짓이 이 하우스에 있으면 유리
  }> = {
    marriage: {
      beneficPlanets: ['Jupiter', 'Venus'],
      maleficPlanets: ['Saturn', 'Uranus'],
      keyNatalPoints: ['Venus', 'Moon', 'Sun', 'Ascendant'],
      beneficAspects: ['conjunction', 'trine', 'sextile'],
      maleficAspects: ['square', 'opposition'],
      favorableHouses: [7, 5, 1],
    },
    career: {
      beneficPlanets: ['Jupiter', 'Saturn'],
      maleficPlanets: ['Neptune', 'Pluto'],
      keyNatalPoints: ['Sun', 'Saturn', 'MC', 'Mars'],
      beneficAspects: ['conjunction', 'trine', 'sextile'],
      maleficAspects: ['square', 'opposition'],
      favorableHouses: [10, 6, 2, 1],
    },
    investment: {
      beneficPlanets: ['Jupiter', 'Pluto'],
      maleficPlanets: ['Neptune', 'Saturn'],
      keyNatalPoints: ['Jupiter', 'Venus', 'Pluto', 'Sun'],
      beneficAspects: ['conjunction', 'trine', 'sextile'],
      maleficAspects: ['square', 'opposition'],
      favorableHouses: [2, 8, 11],
    },
    move: {
      beneficPlanets: ['Jupiter', 'Uranus'],
      maleficPlanets: ['Saturn'],
      keyNatalPoints: ['Moon', 'Mercury', 'Ascendant'],
      beneficAspects: ['conjunction', 'trine', 'sextile'],
      maleficAspects: ['square', 'opposition'],
      favorableHouses: [4, 9, 3],
    },
    study: {
      beneficPlanets: ['Jupiter', 'Mercury'],
      maleficPlanets: ['Neptune', 'Saturn'],
      keyNatalPoints: ['Mercury', 'Jupiter', 'Moon'],
      beneficAspects: ['conjunction', 'trine', 'sextile'],
      maleficAspects: ['square', 'opposition'],
      favorableHouses: [3, 9, 5],
    },
    health: {
      beneficPlanets: ['Jupiter', 'Venus'],
      maleficPlanets: ['Saturn', 'Neptune', 'Pluto'],
      keyNatalPoints: ['Sun', 'Moon', 'Mars', 'Ascendant'],
      beneficAspects: ['conjunction', 'trine', 'sextile'],
      maleficAspects: ['square', 'opposition'],
      favorableHouses: [6, 1, 8],
    },
    relationship: {
      beneficPlanets: ['Jupiter', 'Venus'],
      maleficPlanets: ['Saturn', 'Uranus'],
      keyNatalPoints: ['Venus', 'Moon', 'Mars', 'Ascendant'],
      beneficAspects: ['conjunction', 'trine', 'sextile'],
      maleficAspects: ['square', 'opposition'],
      favorableHouses: [5, 7, 11],
    },
  };

  const conditions = TRANSIT_EVENT_CONDITIONS[eventType];

  // 1. 현재 활성 트랜짓 애스펙트 분석
  const aspects = transits.aspects || [];
  const majorTransits = transits.majorTransits || [];

  for (const aspect of majorTransits) {
    const isBeneficPlanet = conditions.beneficPlanets.includes(aspect.transitPlanet);
    const isMaleficPlanet = conditions.maleficPlanets.includes(aspect.transitPlanet);
    const isKeyNatalPoint = conditions.keyNatalPoints.includes(aspect.natalPoint);
    const isBeneficAspect = conditions.beneficAspects.includes(aspect.type);
    const isMaleficAspect = conditions.maleficAspects.includes(aspect.type);

    // 접근 중인 애스펙트는 영향력 증가
    const applyingMultiplier = aspect.isApplying ? 1.2 : 0.8;

    // 긍정적 행성의 긍정적 애스펙트
    if (isBeneficPlanet && isBeneficAspect && isKeyNatalPoint) {
      const pointBonus = Math.round(12 * applyingMultiplier);
      bonus += pointBonus;
      reasons.push(`${aspect.transitPlanet} ${aspect.type} ${aspect.natalPoint} - ${eventType}에 최적`);
    }
    // 긍정적 행성의 부정적 애스펙트 (도전적이지만 성장)
    else if (isBeneficPlanet && isMaleficAspect && isKeyNatalPoint) {
      const pointBonus = Math.round(4 * applyingMultiplier);
      bonus += pointBonus;
      reasons.push(`${aspect.transitPlanet} ${aspect.type} ${aspect.natalPoint} - 도전적 성장 기회`);
    }
    // 부정적 행성의 부정적 애스펙트
    else if (isMaleficPlanet && isMaleficAspect && isKeyNatalPoint) {
      const penalty = Math.round(-10 * applyingMultiplier);
      bonus += penalty;
      penalties.push(`${aspect.transitPlanet} ${aspect.type} ${aspect.natalPoint} - ${eventType} 도전기`);
    }
    // 부정적 행성의 긍정적 애스펙트 (완화된 영향)
    else if (isMaleficPlanet && isBeneficAspect && isKeyNatalPoint) {
      const pointBonus = Math.round(-2 * applyingMultiplier);
      bonus += pointBonus;
      // 약한 부정적 영향이라 별도 메시지 없음
    }
  }

  // 2. 외행성 하우스 위치 분석
  const outerPlanets = transits.outerPlanets || [];
  for (const planet of outerPlanets) {
    if (conditions.favorableHouses.includes(planet.house)) {
      if (conditions.beneficPlanets.includes(planet.name)) {
        bonus += 8;
        reasons.push(`${planet.name} ${planet.house}하우스 트랜짓 - ${eventType} 지원`);
      } else if (conditions.maleficPlanets.includes(planet.name)) {
        // 악성 행성이 유리한 하우스에 있어도 긴장감
        bonus -= 3;
        penalties.push(`${planet.name} ${planet.house}하우스 - 조심스러운 접근 필요`);
      }
    }

    // 역행 체크
    if (planet.retrograde) {
      if (conditions.beneficPlanets.includes(planet.name)) {
        bonus -= 4;
        penalties.push(`${planet.name} 역행 - 지연 가능`);
      }
    }
  }

  // 3. 목성-토성 트랜짓 특별 분석 (가장 중요한 사회적 행성)
  const jupiterTransit = outerPlanets.find(p => p.name === 'Jupiter');
  const saturnTransit = outerPlanets.find(p => p.name === 'Saturn');

  // 목성이 유리한 하우스에 있고 역행 아닌 경우
  if (jupiterTransit && conditions.favorableHouses.includes(jupiterTransit.house) && !jupiterTransit.retrograde) {
    bonus += 5;
    reasons.push(`목성 순행 ${jupiterTransit.house}하우스 - 확장 에너지`);
  }

  // 토성이 어려운 위치에 있는 경우 (커리어의 경우 6, 10하우스는 오히려 좋음)
  if (saturnTransit) {
    const saturnDifficultHouses = eventType === 'career' ? [12, 8] : [6, 8, 12];
    if (saturnDifficultHouses.includes(saturnTransit.house)) {
      bonus -= 6;
      penalties.push(`토성 ${saturnTransit.house}하우스 - 제한과 구조화 필요`);
    }
  }

  // 4. 트랜짓 테마 분석
  const themes = transits.themes || [];
  for (const themeData of themes) {
    const themeMatches: Record<EventType, string[]> = {
      marriage: ['관계', '사랑', '파트너', '헌신'],
      career: ['커리어', '책임', '성공', '승진'],
      investment: ['확장', '성장', '재물', '권력'],
      move: ['변화', '자유', '혁명', '이동'],
      study: ['사고', '학습', '지식', '성장'],
      health: ['건강', '치유', '에너지', '활력'],
      relationship: ['관계', '연결', '사랑', '조화'],
    };

    if (themeMatches[eventType]?.some(keyword => themeData.theme.includes(keyword))) {
      bonus += 6;
      reasons.push(`트랜짓 테마 "${themeData.theme}" - ${eventType} 연관`);
    }
  }

  // 점수 정규화 (너무 극단적인 값 방지)
  bonus = Math.max(-30, Math.min(30, bonus));

  return { bonus, reasons: reasons.slice(0, 5), penalties: penalties.slice(0, 3) };
}

/**
 * TIER 4+: 월별 트랜짓 정밀 스코어 계산
 * 외행성 이동 추정 + 네이탈 행성과의 실제 애스펙트 계산
 */
function estimateMonthlyTransitScore(
  input: LifePredictionInput,
  eventType: EventType,
  targetYear: number,
  targetMonth: number
): { bonus: number; reasons: string[] } {
  let bonus = 0;
  const reasons: string[] = [];

  const transits = input.advancedAstro?.currentTransits;
  const natalChart = input.astroChart;

  if (!transits?.outerPlanets || transits.outerPlanets.length === 0) {
    return { bonus: 0, reasons: [] };
  }

  // 현재 날짜와 목표 날짜 간의 월 차이
  const currentDate = new Date();
  const monthDiff = (targetYear - currentDate.getFullYear()) * 12 + (targetMonth - (currentDate.getMonth() + 1));

  // 외행성 평균 이동 속도 (도/월) - 순행 기준
  const PLANET_SPEEDS: Record<string, number> = {
    Jupiter: 2.5,   // 약 12년에 360도
    Saturn: 1.0,    // 약 29.5년에 360도
    Uranus: 0.35,   // 약 84년에 360도
    Neptune: 0.18,  // 약 165년에 360도
    Pluto: 0.12,    // 약 248년에 360도
  };

  // 애스펙트 각도 및 오브
  const ASPECT_ANGLES: Record<string, { angle: number; orb: number; type: 'benefic' | 'challenging' | 'neutral' }> = {
    conjunction: { angle: 0, orb: 8, type: 'neutral' },    // 합 - 에너지 집중
    sextile: { angle: 60, orb: 4, type: 'benefic' },       // 60도 - 기회
    square: { angle: 90, orb: 6, type: 'challenging' },    // 90도 - 도전
    trine: { angle: 120, orb: 6, type: 'benefic' },        // 120도 - 조화
    opposition: { angle: 180, orb: 8, type: 'challenging' }, // 180도 - 긴장
  };

  // 이벤트별 중요 네이탈 포인트
  const EVENT_KEY_POINTS: Record<EventType, string[]> = {
    marriage: ['Venus', 'Moon', 'Sun', 'Ascendant', 'Jupiter'],
    career: ['Sun', 'Saturn', 'MC', 'Mars', 'Jupiter'],
    investment: ['Jupiter', 'Venus', 'Pluto', 'Sun', 'Saturn'],
    move: ['Moon', 'Mercury', 'Ascendant', 'Jupiter', 'Uranus'],
    study: ['Mercury', 'Jupiter', 'Moon', 'Sun'],
    health: ['Sun', 'Moon', 'Mars', 'Ascendant', 'Saturn'],
    relationship: ['Venus', 'Moon', 'Mars', 'Ascendant', 'Sun'],
  };

  // 이벤트별 benefic/malefic 행성
  const EVENT_PLANET_EFFECTS: Record<EventType, { benefic: string[]; malefic: string[] }> = {
    marriage: { benefic: ['Jupiter', 'Venus'], malefic: ['Saturn', 'Uranus'] },
    career: { benefic: ['Jupiter', 'Saturn'], malefic: ['Neptune'] },
    investment: { benefic: ['Jupiter', 'Pluto'], malefic: ['Neptune', 'Saturn'] },
    move: { benefic: ['Jupiter', 'Uranus'], malefic: ['Saturn'] },
    study: { benefic: ['Jupiter', 'Mercury'], malefic: ['Neptune'] },
    health: { benefic: ['Jupiter', 'Venus'], malefic: ['Saturn', 'Pluto'] },
    relationship: { benefic: ['Jupiter', 'Venus'], malefic: ['Saturn', 'Uranus'] },
  };

  const keyPoints = EVENT_KEY_POINTS[eventType];
  const planetEffects = EVENT_PLANET_EFFECTS[eventType];

  // 네이탈 행성 경도 맵 구축
  const natalLongitudes: Record<string, number> = {};
  if (natalChart) {
    if (natalChart.sun?.longitude) natalLongitudes['Sun'] = natalChart.sun.longitude;
    if (natalChart.moon?.longitude) natalLongitudes['Moon'] = natalChart.moon.longitude;
    if (natalChart.venus?.longitude) natalLongitudes['Venus'] = natalChart.venus.longitude;
    if (natalChart.mars?.longitude) natalLongitudes['Mars'] = natalChart.mars.longitude;
    if (natalChart.jupiter?.longitude) natalLongitudes['Jupiter'] = natalChart.jupiter.longitude;
    if (natalChart.saturn?.longitude) natalLongitudes['Saturn'] = natalChart.saturn.longitude;
    if (natalChart.mercury?.longitude) natalLongitudes['Mercury'] = natalChart.mercury.longitude;
    if (natalChart.uranus?.longitude) natalLongitudes['Uranus'] = natalChart.uranus.longitude;
    if (natalChart.neptune?.longitude) natalLongitudes['Neptune'] = natalChart.neptune.longitude;
    if (natalChart.pluto?.longitude) natalLongitudes['Pluto'] = natalChart.pluto.longitude;
    if (natalChart.ascendant?.longitude) natalLongitudes['Ascendant'] = natalChart.ascendant.longitude;
    if (natalChart.mc?.longitude) natalLongitudes['MC'] = natalChart.mc.longitude;

    // planets 배열에서도 추출
    if (natalChart.planets) {
      for (const planet of natalChart.planets) {
        if (planet.longitude && planet.name) {
          natalLongitudes[planet.name] = planet.longitude;
        }
      }
    }
  }

  // 각 외행성에 대해 트랜짓-네이탈 애스펙트 계산
  for (const transitPlanet of transits.outerPlanets) {
    const speed = PLANET_SPEEDS[transitPlanet.name] || 1.0;

    // 역행이면 속도 반전 (대략적 추정)
    const effectiveSpeed = transitPlanet.retrograde ? -speed * 0.3 : speed;
    const estimatedMovement = effectiveSpeed * monthDiff;

    // 미래 시점의 예상 경도
    const estimatedTransitLon = ((transitPlanet.longitude + estimatedMovement) % 360 + 360) % 360;

    // 각 네이탈 포인트와의 애스펙트 체크
    for (const natalPointName of keyPoints) {
      const natalLon = natalLongitudes[natalPointName];
      if (natalLon === undefined) continue;

      // 애스펙트 검사
      for (const [aspectName, aspectInfo] of Object.entries(ASPECT_ANGLES)) {
        const angleDiff = Math.abs(estimatedTransitLon - natalLon);
        const normalizedDiff = angleDiff > 180 ? 360 - angleDiff : angleDiff;
        const orbDistance = Math.abs(normalizedDiff - aspectInfo.angle);

        if (orbDistance <= aspectInfo.orb) {
          // 애스펙트 발견!
          const isBeneficPlanet = planetEffects.benefic.includes(transitPlanet.name);
          const isMaleficPlanet = planetEffects.malefic.includes(transitPlanet.name);
          const isBeneficAspect = aspectInfo.type === 'benefic';
          const isChallengingAspect = aspectInfo.type === 'challenging';
          const isConjunction = aspectName === 'conjunction';

          // 오브가 타이트할수록 높은 점수
          const orbMultiplier = 1 - (orbDistance / aspectInfo.orb) * 0.5;

          if (isBeneficPlanet) {
            if (isBeneficAspect || isConjunction) {
              // 좋은 행성의 좋은 애스펙트 = 큰 보너스
              const pointBonus = Math.round(15 * orbMultiplier);
              bonus += pointBonus;
              reasons.push(`${targetMonth}월: ${transitPlanet.name} ${aspectName} 네이탈 ${natalPointName} - 최적`);
            } else if (isChallengingAspect) {
              // 좋은 행성의 도전적 애스펙트 = 작은 보너스 (성장 기회)
              const pointBonus = Math.round(5 * orbMultiplier);
              bonus += pointBonus;
            }
          } else if (isMaleficPlanet) {
            if (isChallengingAspect) {
              // 어려운 행성의 도전적 애스펙트 = 패널티
              const penalty = Math.round(-12 * orbMultiplier);
              bonus += penalty;
              reasons.push(`${targetMonth}월: ${transitPlanet.name} ${aspectName} 네이탈 ${natalPointName} - 주의`);
            } else if (isBeneficAspect) {
              // 어려운 행성의 좋은 애스펙트 = 완화
              const pointBonus = Math.round(3 * orbMultiplier);
              bonus += pointBonus;
            } else if (isConjunction) {
              // 어려운 행성의 합 = 집중적 에너지 (상황에 따라 다름)
              const penalty = Math.round(-6 * orbMultiplier);
              bonus += penalty;
            }
          } else {
            // 중립 행성 (Uranus, Neptune 일부 상황)
            if (isBeneficAspect) {
              bonus += Math.round(4 * orbMultiplier);
            } else if (isChallengingAspect) {
              bonus -= Math.round(4 * orbMultiplier);
            }
          }
        }
      }
    }

    // 목성 리턴 체크 (12년 주기)
    if (transitPlanet.name === 'Jupiter' && natalLongitudes['Jupiter'] !== undefined) {
      const natalJupiterLon = natalLongitudes['Jupiter'];
      const returnDiff = Math.abs(estimatedTransitLon - natalJupiterLon);
      const normalizedReturnDiff = returnDiff > 180 ? 360 - returnDiff : returnDiff;

      if (normalizedReturnDiff <= 10) {
        bonus += 12;
        reasons.push(`${targetMonth}월: 목성 리턴 - 확장과 행운의 시기`);
      }
    }

    // 토성 리턴/스퀘어/오포지션 체크 (29.5년 주기)
    if (transitPlanet.name === 'Saturn' && natalLongitudes['Saturn'] !== undefined) {
      const natalSaturnLon = natalLongitudes['Saturn'];
      const saturnDiff = Math.abs(estimatedTransitLon - natalSaturnLon);
      const normalizedSaturnDiff = saturnDiff > 180 ? 360 - saturnDiff : saturnDiff;

      // 리턴 (0도)
      if (normalizedSaturnDiff <= 10) {
        if (eventType === 'career') {
          bonus += 8;
          reasons.push(`${targetMonth}월: 토성 리턴 - 커리어 성숙기`);
        } else {
          bonus -= 5;
          reasons.push(`${targetMonth}월: 토성 리턴 - 책임과 구조화 필요`);
        }
      }
      // 스퀘어 (90도)
      else if (Math.abs(normalizedSaturnDiff - 90) <= 8) {
        bonus -= 6;
        reasons.push(`${targetMonth}월: 토성 스퀘어 - 도전과 조정 필요`);
      }
      // 오포지션 (180도)
      else if (Math.abs(normalizedSaturnDiff - 180) <= 8) {
        bonus -= 4;
      }
    }
  }

  // 점수 정규화
  return { bonus: Math.max(-25, Math.min(25, bonus)), reasons: reasons.slice(0, 4) };
}

/**
 * TIER 5+: 대운-세운-월운 복합 시너지 분석
 * 세 레이어의 운세가 어떻게 상호작용하는지 분석
 */
function calculateCompoundLuckScore(
  input: LifePredictionInput,
  eventType: EventType,
  targetYear: number,
  targetMonth: number
): { bonus: number; reasons: string[]; penalties: string[] } {
  let bonus = 0;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const age = targetYear - input.birthYear;
  const daeun = input.daeunList?.find(d => age >= d.startAge && age <= d.endAge);

  if (!daeun) {
    return { bonus: 0, reasons: [], penalties: [] };
  }

  // 연운(세운) 간지
  const yearGanji = calculateYearlyGanji(targetYear);
  // 월운 간지
  const monthGanji = calculateMonthlyGanji(targetYear, targetMonth);

  // 대운 십신
  const daeunSibsin = calculateSibsin(input.dayStem, daeun.stem);
  // 세운 십신
  const yearSibsin = calculateSibsin(input.dayStem, yearGanji.stem);
  // 월운 십신
  const monthSibsin = calculateSibsin(input.dayStem, monthGanji.stem);

  // 대운 12운성
  const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
  // 세운 12운성
  const yearStage = calculatePreciseTwelveStage(input.dayStem, yearGanji.branch);
  // 월운 12운성
  const monthStage = calculatePreciseTwelveStage(input.dayStem, monthGanji.branch);

  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];

  // ========================================
  // 1. 삼중 시너지 분석 (대운 + 세운 + 월운)
  // ========================================

  // 세 레이어 모두 유리한 십신이면 대박
  const favorableSibsinCount = [daeunSibsin, yearSibsin, monthSibsin]
    .filter(s => conditions.favorableSibsin.includes(s)).length;
  const avoidSibsinCount = [daeunSibsin, yearSibsin, monthSibsin]
    .filter(s => conditions.avoidSibsin.includes(s)).length;

  if (favorableSibsinCount === 3) {
    bonus += 20;
    reasons.push(`삼중 길신 (대운 ${daeunSibsin} + 세운 ${yearSibsin} + 월운 ${monthSibsin})`);
  } else if (favorableSibsinCount === 2) {
    bonus += 12;
    reasons.push(`이중 길신 조합`);
  }

  if (avoidSibsinCount >= 2) {
    bonus -= 15;
    penalties.push(`복합 흉신 (${avoidSibsinCount}개 레이어)`);
  }

  // 세 레이어 12운성 시너지
  const peakStageCount = [daeunStage, yearStage, monthStage]
    .filter(s => s.energy === 'peak').length;
  const risingStageCount = [daeunStage, yearStage, monthStage]
    .filter(s => s.energy === 'rising').length;
  const dormantStageCount = [daeunStage, yearStage, monthStage]
    .filter(s => s.energy === 'dormant').length;

  if (peakStageCount >= 2) {
    bonus += 15;
    reasons.push(`복합 전성기 (${peakStageCount}개 레이어)`);
  }
  if (risingStageCount >= 2 && peakStageCount >= 1) {
    bonus += 10;
    reasons.push(`상승+전성 시너지`);
  }
  if (dormantStageCount >= 2) {
    bonus -= 12;
    penalties.push(`복합 휴식기 - 중요 결정 보류 권장`);
  }

  // ========================================
  // 2. 대운-세운 천간 관계 분석
  // ========================================
  const daeunYearRelation = analyzeStemRelation(daeun.stem, yearGanji.stem);
  if (daeunYearRelation.type === '합') {
    bonus += 10;
    reasons.push(`대운-세운 천간합 - ${daeunYearRelation.description}`);
  } else if (daeunYearRelation.type === '충') {
    bonus -= 8;
    penalties.push(`대운-세운 천간충 - 변동 예상`);
  }

  // ========================================
  // 3. 대운-세운 지지 관계 분석
  // ========================================
  const daeunYearBranchRelation = analyzeBranchRelation(daeun.branch, yearGanji.branch);
  if (daeunYearBranchRelation.includes('삼합') || daeunYearBranchRelation.includes('육합')) {
    bonus += 8;
    reasons.push(`대운-세운 지지합`);
  } else if (daeunYearBranchRelation.includes('충')) {
    bonus -= 10;
    penalties.push(`대운-세운 지지충 - 큰 변화/갈등`);
  } else if (daeunYearBranchRelation.includes('형')) {
    bonus -= 6;
    penalties.push(`대운-세운 형 - 마찰 주의`);
  }

  // ========================================
  // 4. 세운-월운 관계 분석
  // ========================================
  const yearMonthBranchRelation = analyzeBranchRelation(yearGanji.branch, monthGanji.branch);
  if (yearMonthBranchRelation.includes('합')) {
    bonus += 5;
  } else if (yearMonthBranchRelation.includes('충')) {
    bonus -= 5;
  }

  // ========================================
  // 5. 용신/기신 복합 체크
  // ========================================
  const daeunElement = STEM_ELEMENT[daeun.stem];
  const yearElement = STEM_ELEMENT[yearGanji.stem];
  const monthElement = STEM_ELEMENT[monthGanji.stem];

  const yongsinActiveCount = [daeunElement, yearElement, monthElement]
    .filter(e => input.yongsin?.includes(e)).length;
  const kisinActiveCount = [daeunElement, yearElement, monthElement]
    .filter(e => input.kisin?.includes(e)).length;

  if (yongsinActiveCount >= 2) {
    bonus += 12;
    reasons.push(`복합 용신 활성 (${yongsinActiveCount}개)`);
  }
  if (kisinActiveCount >= 2) {
    bonus -= 10;
    penalties.push(`복합 기신 활성 - 주의 필요`);
  }

  return {
    bonus: Math.max(-30, Math.min(30, bonus)),
    reasons: reasons.slice(0, 4),
    penalties: penalties.slice(0, 3),
  };
}

/**
 * 천간 관계 분석
 */
function analyzeStemRelation(stem1: string, stem2: string): { type: string; description: string } {
  // 천간합 (甲己, 乙庚, 丙辛, 丁壬, 戊癸)
  const stemCombinations: Record<string, string> = {
    '甲己': '토로 변화', '己甲': '토로 변화',
    '乙庚': '금으로 변화', '庚乙': '금으로 변화',
    '丙辛': '수로 변화', '辛丙': '수로 변화',
    '丁壬': '목으로 변화', '壬丁': '목으로 변화',
    '戊癸': '화로 변화', '癸戊': '화로 변화',
  };

  // 천간충 (甲庚, 乙辛, 丙壬, 丁癸)
  const stemClashes = ['甲庚', '庚甲', '乙辛', '辛乙', '丙壬', '壬丙', '丁癸', '癸丁'];

  const combo = stem1 + stem2;
  if (stemCombinations[combo]) {
    return { type: '합', description: stemCombinations[combo] };
  }
  if (stemClashes.includes(combo)) {
    return { type: '충', description: '천간 충돌' };
  }
  return { type: '무관', description: '' };
}

/**
 * 지지 관계 분석 (간단 버전)
 */
function analyzeBranchRelation(branch1: string, branch2: string): string {
  // 육합
  const sixCombos: Record<string, string> = {
    '子丑': '육합', '丑子': '육합', '寅亥': '육합', '亥寅': '육합',
    '卯戌': '육합', '戌卯': '육합', '辰酉': '육합', '酉辰': '육합',
    '巳申': '육합', '申巳': '육합', '午未': '육합', '未午': '육합',
  };

  // 삼합 (부분 - 두 지지만 체크)
  const partialTrines: Record<string, string> = {
    '寅午': '화국 삼합', '午戌': '화국 삼합', '寅戌': '화국 삼합',
    '申子': '수국 삼합', '子辰': '수국 삼합', '申辰': '수국 삼합',
    '巳酉': '금국 삼합', '酉丑': '금국 삼합', '巳丑': '금국 삼합',
    '亥卯': '목국 삼합', '卯未': '목국 삼합', '亥未': '목국 삼합',
  };

  // 충
  const clashes: Record<string, string> = {
    '子午': '충', '午子': '충', '丑未': '충', '未丑': '충',
    '寅申': '충', '申寅': '충', '卯酉': '충', '酉卯': '충',
    '辰戌': '충', '戌辰': '충', '巳亥': '충', '亥巳': '충',
  };

  // 형 (주요)
  const punishments: Record<string, string> = {
    '寅巳': '형', '巳寅': '형', '巳申': '형', '申巳': '형',
    '丑戌': '형', '戌丑': '형', '戌未': '형', '未戌': '형',
    '子卯': '형', '卯子': '형',
  };

  const combo = branch1 + branch2;
  const reverseCombo = branch2 + branch1;

  if (sixCombos[combo] || sixCombos[reverseCombo]) return '육합';
  if (partialTrines[combo] || partialTrines[reverseCombo]) return '삼합';
  if (clashes[combo] || clashes[reverseCombo]) return '충';
  if (punishments[combo] || punishments[reverseCombo]) return '형';

  return '무관';
}

/**
 * TIER 5+: 트랜짓 하우스 오버레이 분석
 * 트랜짓 행성이 네이탈 하우스에 어떤 영향을 미치는지
 */
function calculateTransitHouseOverlay(
  input: LifePredictionInput,
  eventType: EventType
): { bonus: number; reasons: string[] } {
  let bonus = 0;
  const reasons: string[] = [];

  const transits = input.advancedAstro?.currentTransits;
  if (!transits?.outerPlanets) {
    return { bonus: 0, reasons: [] };
  }

  // 이벤트별 중요 하우스
  const EVENT_HOUSES: Record<EventType, { primary: number[]; secondary: number[]; avoid: number[] }> = {
    marriage: { primary: [7], secondary: [5, 1], avoid: [12, 8] },
    career: { primary: [10, 6], secondary: [2, 1], avoid: [12] },
    investment: { primary: [2, 8], secondary: [11], avoid: [12, 6] },
    move: { primary: [4, 9], secondary: [3], avoid: [12] },
    study: { primary: [9, 3], secondary: [5], avoid: [12] },
    health: { primary: [6, 1], secondary: [8], avoid: [12] },
    relationship: { primary: [7, 5], secondary: [11, 1], avoid: [12, 8] },
  };

  const houseConfig = EVENT_HOUSES[eventType];

  for (const planet of transits.outerPlanets) {
    const house = planet.house;

    // 목성이 중요 하우스에 있으면 큰 보너스
    if (planet.name === 'Jupiter') {
      if (houseConfig.primary.includes(house)) {
        bonus += 15;
        reasons.push(`목성 ${house}하우스 트랜짓 - ${eventType} 최적 위치`);
      } else if (houseConfig.secondary.includes(house)) {
        bonus += 8;
        reasons.push(`목성 ${house}하우스 - 지원 에너지`);
      }
    }

    // 토성이 중요 하우스에 있으면
    if (planet.name === 'Saturn') {
      if (houseConfig.primary.includes(house)) {
        // 토성은 구조화, 책임 - 커리어에는 긍정적
        if (eventType === 'career') {
          bonus += 6;
          reasons.push(`토성 ${house}하우스 - 커리어 구조화`);
        } else {
          bonus -= 5;
        }
      } else if (houseConfig.avoid.includes(house)) {
        bonus -= 8;
        reasons.push(`토성 ${house}하우스 - 제한/지연`);
      }
    }

    // 천왕성 (갑작스러운 변화)
    if (planet.name === 'Uranus') {
      if (houseConfig.primary.includes(house)) {
        if (eventType === 'move' || eventType === 'career') {
          bonus += 5; // 변화에 유리한 이벤트
        } else {
          bonus -= 3; // 안정이 필요한 이벤트에는 불리
        }
      }
    }

    // 명왕성 (변형)
    if (planet.name === 'Pluto') {
      if (houseConfig.primary.includes(house)) {
        bonus += 4; // 심오한 변화
        reasons.push(`명왕성 ${house}하우스 - 근본적 변화`);
      }
    }

    // 해왕성 (환상, 혼란)
    if (planet.name === 'Neptune') {
      if (houseConfig.primary.includes(house)) {
        if (eventType === 'relationship' || eventType === 'marriage') {
          bonus -= 5; // 환상에 빠질 수 있음
        }
      }
    }
  }

  return { bonus: Math.max(-20, Math.min(20, bonus)), reasons: reasons.slice(0, 3) };
}

// ============================================================
// 1. 다년간 트렌드 분석
// ============================================================

export function analyzeMultiYearTrend(
  input: LifePredictionInput,
  startYear: number,
  endYear: number
): MultiYearTrend {
  const currentYear = new Date().getFullYear();
  const yearlyScores: YearlyScore[] = [];
  const daeunTransitions: DaeunTransitionPoint[] = [];

  // 대운 리스트 준비
  const daeunList = input.daeunList || [];

  for (let year = startYear; year <= endYear; year++) {
    const age = year - input.birthYear;
    if (age < 0) continue;

    // 해당 연도의 간지
    const yearGanji = calculateYearlyGanji(year);

    // 12운성 계산
    const twelveStage = calculatePreciseTwelveStage(input.dayStem, yearGanji.branch);

    // 십신 계산
    const sibsin = calculateSibsin(input.dayStem, yearGanji.stem);

    // 지지 상호작용
    const allBranches = [input.dayBranch, input.monthBranch, input.yearBranch, yearGanji.branch];
    const branchInteractions = analyzeBranchInteractions(allBranches);

    // 해당 나이의 대운 찾기
    const daeun = daeunList.find(d => age >= d.startAge && age <= d.endAge);

    // 점수 계산
    let score = twelveStage.score;

    // 십신 보정
    const sibsinScores: Record<string, number> = {
      '정관': 15, '정재': 12, '정인': 10, '식신': 8,
      '편관': 5, '편재': 5, '편인': 3, '상관': 0,
      '비견': -3, '겁재': -8,
    };
    score += sibsinScores[sibsin] || 0;

    // 지지 상호작용 보정
    for (const inter of branchInteractions) {
      score += inter.score * 0.3;
    }

    // 대운 보정
    if (daeun) {
      const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
      score += (daeunStage.score - 50) * 0.3;
    }

    // 용신/기신 보정
    const yearElement = STEM_ELEMENT[yearGanji.stem];
    if (input.yongsin?.includes(yearElement)) score += 12;
    if (input.kisin?.includes(yearElement)) score -= 10;

    score = Math.max(0, Math.min(100, score));

    // 등급 결정
    let grade: YearlyScore['grade'];
    if (score >= 85) grade = 'S';
    else if (score >= 70) grade = 'A';
    else if (score >= 55) grade = 'B';
    else if (score >= 40) grade = 'C';
    else if (score >= 25) grade = 'D';
    else grade = 'F';

    // 테마/기회/도전 생성
    const themes: string[] = [];
    const opportunities: string[] = [];
    const challenges: string[] = [];

    // 12운성 기반
    if (twelveStage.energy === 'peak') {
      themes.push('전성기');
      opportunities.push('중요한 결정과 도전의 최적기');
    } else if (twelveStage.energy === 'rising') {
      themes.push('상승기');
      opportunities.push('새로운 시작과 성장');
    } else if (twelveStage.energy === 'declining') {
      themes.push('안정기');
      challenges.push('무리한 확장 자제');
    } else {
      themes.push('준비기');
      challenges.push('내면 성찰과 재충전 필요');
    }

    // 십신 기반
    if (['정관', '정재', '정인'].includes(sibsin)) {
      opportunities.push(`${sibsin}운 - 안정적 발전`);
    } else if (['겁재', '상관'].includes(sibsin)) {
      challenges.push(`${sibsin}운 - 경쟁과 갈등 주의`);
    }

    yearlyScores.push({
      year,
      age,
      score,
      grade,
      yearGanji,
      twelveStage,
      sibsin,
      branchInteractions,
      daeun,
      themes,
      opportunities,
      challenges,
    });

    // 대운 전환점 감지
    if (daeun && age === daeun.startAge && daeunList.indexOf(daeun) > 0) {
      const prevDaeun = daeunList[daeunList.indexOf(daeun) - 1];
      const prevStage = calculatePreciseTwelveStage(input.dayStem, prevDaeun.branch);
      const currStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);

      let impact: DaeunTransitionPoint['impact'];
      const scoreDiff = currStage.score - prevStage.score;
      if (scoreDiff >= 30) impact = 'major_positive';
      else if (scoreDiff >= 10) impact = 'positive';
      else if (scoreDiff <= -30) impact = 'major_challenging';
      else if (scoreDiff <= -10) impact = 'challenging';
      else impact = 'neutral';

      daeunTransitions.push({
        year,
        age,
        fromDaeun: prevDaeun,
        toDaeun: daeun,
        impact,
        description: `${prevDaeun.stem}${prevDaeun.branch} → ${daeun.stem}${daeun.branch} 대운 전환`,
      });
    }
  }

  // 전체 트렌드 분석
  const scores = yearlyScores.map(y => y.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const firstHalfAvg = scores.slice(0, Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(scores.length / 2);
  const secondHalfAvg = scores.slice(Math.floor(scores.length / 2)).reduce((a, b) => a + b, 0) / (scores.length - Math.floor(scores.length / 2));

  let overallTrend: MultiYearTrend['overallTrend'];
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;

  if (variance > 400) {
    overallTrend = 'volatile';
  } else if (secondHalfAvg - firstHalfAvg > 10) {
    overallTrend = 'ascending';
  } else if (firstHalfAvg - secondHalfAvg > 10) {
    overallTrend = 'descending';
  } else {
    overallTrend = 'stable';
  }

  // 피크/로우 연도
  const sortedByScore = [...yearlyScores].sort((a, b) => b.score - a.score);
  const peakYears = sortedByScore.slice(0, 3).map(y => y.year);
  const lowYears = sortedByScore.slice(-3).map(y => y.year);

  // 인생 주기 분석
  const lifeCycles = analyzeLifeCycles(yearlyScores, daeunList);

  // 요약 생성
  const summary = generateTrendSummary(overallTrend, peakYears, lowYears, daeunTransitions, currentYear);

  return {
    startYear,
    endYear,
    yearlyScores,
    overallTrend,
    peakYears,
    lowYears,
    daeunTransitions,
    lifeCycles,
    summary,
  };
}

function analyzeLifeCycles(yearlyScores: YearlyScore[], daeunList: DaeunInfo[]): LifeCyclePhase[] {
  const phases: LifeCyclePhase[] = [];

  // 대운 기반 주기 분석
  for (const daeun of daeunList) {
    const yearsInDaeun = yearlyScores.filter(y => y.daeun === daeun);
    if (yearsInDaeun.length === 0) continue;

    const avgScore = yearsInDaeun.reduce((sum, y) => sum + y.score, 0) / yearsInDaeun.length;

    let energy: LifeCyclePhase['energy'];
    if (avgScore >= 70) energy = 'peak';
    else if (avgScore >= 55) energy = 'rising';
    else if (avgScore >= 40) energy = 'declining';
    else energy = 'dormant';

    const theme = generatePhaseTheme(daeun, energy);
    const recommendations = generatePhaseRecommendations(energy, daeun.element);

    phases.push({
      name: `${daeun.stem}${daeun.branch} 대운`,
      startYear: yearsInDaeun[0].year,
      endYear: yearsInDaeun[yearsInDaeun.length - 1].year,
      startAge: daeun.startAge,
      endAge: daeun.endAge,
      theme,
      energy,
      recommendations,
    });
  }

  return phases;
}

function generatePhaseTheme(daeun: DaeunInfo, energy: LifeCyclePhase['energy']): string {
  const elementThemes: Record<FiveElement, string> = {
    '목': '성장과 확장',
    '화': '열정과 표현',
    '토': '안정과 축적',
    '금': '결실과 정리',
    '수': '지혜와 유연함',
  };

  const energyThemes: Record<LifeCyclePhase['energy'], string> = {
    'peak': '최고조 활동기',
    'rising': '상승 발전기',
    'declining': '안정 수확기',
    'dormant': '휴식 충전기',
  };

  return `${elementThemes[daeun.element]} - ${energyThemes[energy]}`;
}

function generatePhaseRecommendations(energy: LifeCyclePhase['energy'], element: FiveElement): string[] {
  const recommendations: string[] = [];

  switch (energy) {
    case 'peak':
      recommendations.push('중요한 결정과 큰 프로젝트 추진');
      recommendations.push('적극적인 도전과 확장');
      recommendations.push('리더십 발휘와 책임 수용');
      break;
    case 'rising':
      recommendations.push('새로운 시작과 계획 수립');
      recommendations.push('학습과 자기 개발');
      recommendations.push('인맥 확장과 네트워킹');
      break;
    case 'declining':
      recommendations.push('기존 성과의 정리와 보존');
      recommendations.push('무리한 확장보다 안정 추구');
      recommendations.push('후계 양성과 지식 전수');
      break;
    case 'dormant':
      recommendations.push('내면 성찰과 재충전');
      recommendations.push('건강 관리와 휴식');
      recommendations.push('다음 주기를 위한 조용한 준비');
      break;
  }

  // 오행별 추가 조언
  switch (element) {
    case '목':
      recommendations.push('창의적 활동과 새로운 아이디어 개발');
      break;
    case '화':
      recommendations.push('열정을 표현하되 과열 주의');
      break;
    case '토':
      recommendations.push('부동산, 안정적 투자에 유리');
      break;
    case '금':
      recommendations.push('결단력 있는 정리와 선택');
      break;
    case '수':
      recommendations.push('유연한 대응과 지혜로운 판단');
      break;
  }

  return recommendations;
}

function generateTrendSummary(
  trend: MultiYearTrend['overallTrend'],
  peakYears: number[],
  lowYears: number[],
  transitions: DaeunTransitionPoint[],
  currentYear: number
): string {
  let summary = '';

  switch (trend) {
    case 'ascending':
      summary = '전반적으로 상승하는 운세 흐름입니다. ';
      break;
    case 'descending':
      summary = '후반부로 갈수록 안정을 추구해야 하는 흐름입니다. ';
      break;
    case 'stable':
      summary = '안정적인 운세 흐름으로, 꾸준한 노력이 결실을 맺습니다. ';
      break;
    case 'volatile':
      summary = '변동이 큰 운세로, 유연한 대응이 중요합니다. ';
      break;
  }

  // 가까운 피크 연도
  const upcomingPeaks = peakYears.filter(y => y >= currentYear);
  if (upcomingPeaks.length > 0) {
    summary += `${upcomingPeaks[0]}년이 특히 좋은 시기입니다. `;
  }

  // 가까운 대운 전환
  const upcomingTransitions = transitions.filter(t => t.year >= currentYear);
  if (upcomingTransitions.length > 0) {
    const next = upcomingTransitions[0];
    if (next.impact.includes('positive')) {
      summary += `${next.year}년 대운 전환이 긍정적입니다.`;
    } else if (next.impact.includes('challenging')) {
      summary += `${next.year}년 대운 전환 시 신중한 대비가 필요합니다.`;
    }
  }

  return summary;
}

// ============================================================
// 2. 과거 회고 분석 (TIER 5 초정밀 버전)
// ============================================================

export function analyzePastDate(
  input: LifePredictionInput,
  targetDate: Date,
  options: { detailed?: boolean; includeHours?: boolean } = {}
): PastRetrospective {
  const { detailed = true, includeHours = false } = options;

  const year = targetDate.getFullYear();
  const month = targetDate.getMonth() + 1;
  const day = targetDate.getDate();
  const age = year - input.birthYear;

  // 일진 계산
  const dailyPillar = calculateDailyPillar(targetDate);

  // 연/월 간지
  const yearGanji = calculateYearlyGanji(year);
  const monthGanji = calculateMonthlyGanji(year, month);

  // 12운성
  const twelveStage = calculatePreciseTwelveStage(input.dayStem, dailyPillar.branch);

  // 십신
  const sibsin = calculateSibsin(input.dayStem, dailyPillar.stem);

  // 지지 상호작용
  const allBranches = [
    input.dayBranch, input.monthBranch, input.yearBranch,
    yearGanji.branch, monthGanji.branch, dailyPillar.branch,
  ];
  const branchInteractions = analyzeBranchInteractions(allBranches);

  // 대운 찾기
  const daeun = input.daeunList?.find(d => age >= d.startAge && age <= d.endAge);

  // === TIER 5: 절기, 28수, 달 위상 분석 ===
  const solarTerm = getSolarTermForDate(targetDate);
  const lunarMansion = getLunarMansion(targetDate);

  // 음력 일자 추정 (간단한 근사값 - 실제로는 음력 변환 필요)
  const lunarDay = ((day + 10) % 30) + 1; // 근사값
  const lunarPhase = getLunarPhase(lunarDay);

  // 행성시 (선택적)
  const planetaryHours = includeHours ? calculatePlanetaryHours(targetDate) : undefined;

  // 점수 계산 (강화된 버전)
  let score = twelveStage.score;

  const sibsinScores: Record<string, number> = {
    '정관': 15, '정재': 12, '정인': 10, '식신': 8,
    '편관': 5, '편재': 5, '편인': 3, '상관': 0,
    '비견': -3, '겁재': -8,
  };
  score += sibsinScores[sibsin] || 0;

  for (const inter of branchInteractions) {
    score += inter.score * 0.2;
  }

  if (daeun) {
    const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
    score += (daeunStage.score - 50) * 0.25;
  }

  // TIER 5: 절기/28수/달 위상 보정
  if (solarTerm.element === STEM_ELEMENT[input.dayStem]) {
    score += 5; // 절기 오행 일치
  }
  if (lunarMansion.isAuspicious) {
    score += 4; // 길한 28수
  } else {
    score -= 3; // 흉한 28수
  }
  if (lunarPhase === 'full_moon') {
    score += 3; // 보름달 에너지
  } else if (lunarPhase === 'new_moon') {
    score -= 2; // 삭일은 에너지 저하
  }

  // 용신/기신 보정
  const dayElement = STEM_ELEMENT[dailyPillar.stem];
  if (input.yongsin?.includes(dayElement)) score += 10;
  if (input.kisin?.includes(dayElement)) score -= 8;

  score = Math.max(0, Math.min(100, score));

  let grade: PastRetrospective['grade'];
  if (score >= 85) grade = 'S';
  else if (score >= 70) grade = 'A';
  else if (score >= 55) grade = 'B';
  else if (score >= 40) grade = 'C';
  else if (score >= 25) grade = 'D';
  else grade = 'F';

  // === TIER 5: 인과 요인 분석 ===
  const causalFactors = analyzeCausalFactors(
    input.dayStem,
    input.dayBranch,
    dailyPillar.stem,
    dailyPillar.branch,
    daeun?.stem,
    daeun?.branch,
    input.yongsin,
    input.kisin
  );

  // === TIER 5: 사건 유형별 점수 ===
  const yongsinActive = input.yongsin?.includes(dayElement) || false;
  const kisinActive = input.kisin?.includes(dayElement) || false;

  const shinsals = detectShinsals(input, dailyPillar);
  const eventCategoryScores = calculateEventCategoryScores(
    sibsin,
    twelveStage.stage,
    branchInteractions.map(b => ({ type: b.type, score: b.score })),
    shinsals,
    yongsinActive,
    kisinActive
  );

  // === TIER 5: 신뢰도 계산 ===
  const confidenceFactors: ConfidenceFactors = {
    birthTimeAccuracy: input.birthHour !== undefined ? 'exact' : 'unknown',
    methodAlignment: calculateMethodAlignment(twelveStage, solarTerm, lunarMansion),
    dataCompleteness: calculateDataCompleteness(input),
  };
  const confidence = calculateConfidence(confidenceFactors);

  // 테마 생성 (확장)
  const themes: string[] = [];
  themes.push(`${twelveStage.stage} - ${twelveStage.lifePhase.split(' - ')[0]}`);
  themes.push(`${sibsin}운`);
  themes.push(`${solarTerm.nameKo} 절기`);
  themes.push(`${lunarMansion.nameKo}수(${lunarMansion.name})`);
  if (daeun) {
    themes.push(`${daeun.stem}${daeun.branch} 대운 시기`);
  }

  // 왜 그런 일이 있었는지 분석 (강화)
  const whyItHappened: string[] = [];

  // 인과 요인 기반 분석
  for (const factor of causalFactors.slice(0, 5)) {
    whyItHappened.push(`[${factor.factor}] ${factor.description}`);
  }

  if (score >= 70) {
    whyItHappened.push('에너지가 높은 시기로 좋은 일이 일어나기 쉬웠습니다.');
    if (['정관', '정재', '정인'].includes(sibsin)) {
      whyItHappened.push(`${sibsin}운으로 안정적인 발전이 있었습니다.`);
    }
  } else if (score <= 40) {
    whyItHappened.push('에너지가 낮은 시기로 도전이 있었을 수 있습니다.');
    if (['겁재', '상관'].includes(sibsin)) {
      whyItHappened.push(`${sibsin}운으로 경쟁이나 갈등이 있었을 수 있습니다.`);
    }
  }

  // 28수 기반 분석
  if (!lunarMansion.isAuspicious) {
    whyItHappened.push(`${lunarMansion.nameKo}수(${lunarMansion.name}) - ${lunarMansion.badFor.join(', ')}에 불리한 날`);
  } else if (lunarMansion.goodFor.length > 0) {
    whyItHappened.push(`${lunarMansion.nameKo}수(${lunarMansion.name}) - ${lunarMansion.goodFor.join(', ')}에 유리한 날`);
  }

  // 절기 기반 분석
  whyItHappened.push(`${solarTerm.nameKo} 절기의 ${solarTerm.element} 에너지가 영향을 미쳤습니다.`);

  for (const inter of branchInteractions) {
    if (inter.impact === 'positive') {
      whyItHappened.push(`${inter.description} - 긍정적 에너지 흐름`);
    } else if (inter.impact === 'negative') {
      whyItHappened.push(`${inter.description} - 충돌과 변화의 에너지`);
    }
  }

  // 교훈
  const lessonsLearned: string[] = [];
  if (twelveStage.energy === 'peak') {
    lessonsLearned.push('전성기의 에너지를 잘 활용했는지 돌아보세요.');
  } else if (twelveStage.energy === 'dormant') {
    lessonsLearned.push('휴식과 재충전의 시간이 필요했던 때입니다.');
  }
  lessonsLearned.push(twelveStage.advice);

  // 인과 요인에서 교훈 추출
  for (const factor of causalFactors) {
    if (factor.impact === 'major_positive' || factor.impact === 'major_negative') {
      lessonsLearned.push(`${factor.factor}의 영향을 이해하고 활용하세요.`);
    }
  }

  // === TIER 5: 사건별 상세 분석 ===
  const detailedAnalysis = detailed ? generateDetailedEventAnalysis(
    eventCategoryScores,
    causalFactors,
    sibsin,
    twelveStage.stage,
    solarTerm,
    lunarMansion
  ) : undefined;

  return {
    targetDate,
    dailyPillar,
    score,
    grade,
    yearGanji,
    monthGanji,
    twelveStage,
    sibsin,
    branchInteractions,
    daeun,
    themes,
    whyItHappened,
    lessonsLearned,

    // TIER 5 추가 필드
    solarTerm,
    lunarMansion,
    lunarDay,
    lunarPhase,
    planetaryHours,
    causalFactors,
    eventCategoryScores,
    confidence,
    detailedAnalysis,
  };
}

// 신살 감지 (간단한 버전)
function detectShinsals(
  input: LifePredictionInput,
  dailyPillar: { stem: string; branch: string }
): Array<{ name: string; type: 'lucky' | 'unlucky' }> {
  const shinsals: Array<{ name: string; type: 'lucky' | 'unlucky' }> = [];

  // 천을귀인 (甲戊庚: 丑未, 乙己: 子申, 丙丁: 亥酉, 壬癸: 卯巳, 辛: 午寅)
  const cheonelMap: Record<string, string[]> = {
    '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
    '乙': ['子', '申'], '己': ['子', '申'],
    '丙': ['亥', '酉'], '丁': ['亥', '酉'],
    '壬': ['卯', '巳'], '癸': ['卯', '巳'],
    '辛': ['午', '寅'],
  };

  if (cheonelMap[input.dayStem]?.includes(dailyPillar.branch)) {
    shinsals.push({ name: '천을귀인', type: 'lucky' });
  }

  // 역마 (寅午戌: 申, 申子辰: 寅, 亥卯未: 巳, 巳酉丑: 亥)
  const yeokmaMap: Record<string, string> = {
    '寅': '申', '午': '申', '戌': '申',
    '申': '寅', '子': '寅', '辰': '寅',
    '亥': '巳', '卯': '巳', '未': '巳',
    '巳': '亥', '酉': '亥', '丑': '亥',
  };

  if (yeokmaMap[input.dayBranch] === dailyPillar.branch) {
    shinsals.push({ name: '역마', type: 'lucky' });
  }

  // 문창 (甲: 巳, 乙: 午, 丙戊: 申, 丁己: 酉, 庚: 亥, 辛: 子, 壬: 寅, 癸: 卯)
  const munchangMap: Record<string, string> = {
    '甲': '巳', '乙': '午', '丙': '申', '戊': '申',
    '丁': '酉', '己': '酉', '庚': '亥', '辛': '子',
    '壬': '寅', '癸': '卯',
  };

  if (munchangMap[input.dayStem] === dailyPillar.branch) {
    shinsals.push({ name: '문창', type: 'lucky' });
  }

  // 겁살 (寅午戌: 亥, 申子辰: 巳, 亥卯未: 申, 巳酉丑: 寅)
  const geopsalMap: Record<string, string> = {
    '寅': '亥', '午': '亥', '戌': '亥',
    '申': '巳', '子': '巳', '辰': '巳',
    '亥': '申', '卯': '申', '未': '申',
    '巳': '寅', '酉': '寅', '丑': '寅',
  };

  if (geopsalMap[input.dayBranch] === dailyPillar.branch) {
    shinsals.push({ name: '겁살', type: 'unlucky' });
  }

  return shinsals;
}

// 동서양 분석 일치도 계산
function calculateMethodAlignment(
  twelveStage: PreciseTwelveStage,
  solarTerm: SolarTerm,
  lunarMansion: LunarMansion
): number {
  let alignment = 50;

  // 12운성 에너지와 28수 길흉 일치
  if (twelveStage.energy === 'peak' && lunarMansion.isAuspicious) alignment += 15;
  if (twelveStage.energy === 'dormant' && !lunarMansion.isAuspicious) alignment += 10;
  if (twelveStage.energy === 'peak' && !lunarMansion.isAuspicious) alignment -= 10;

  // 절기 에너지 방향 일치
  if (solarTerm.energy === 'yang' && twelveStage.energy === 'rising') alignment += 10;
  if (solarTerm.energy === 'yin' && twelveStage.energy === 'declining') alignment += 10;

  return Math.min(100, Math.max(0, alignment));
}

// 데이터 완성도 계산
function calculateDataCompleteness(input: LifePredictionInput): number {
  let completeness = 30; // 기본 필수 데이터

  if (input.birthHour !== undefined) completeness += 15;
  if (input.daeunList && input.daeunList.length > 0) completeness += 20;
  if (input.yongsin && input.yongsin.length > 0) completeness += 15;
  if (input.kisin && input.kisin.length > 0) completeness += 10;
  if (input.allStems.length >= 4) completeness += 5;
  if (input.allBranches.length >= 4) completeness += 5;

  return Math.min(100, completeness);
}

// 사건별 상세 분석 생성
function generateDetailedEventAnalysis(
  scores: EventCategoryScores,
  causalFactors: CausalFactor[],
  sibsin: string,
  twelveStage: string,
  solarTerm: SolarTerm,
  lunarMansion: LunarMansion
): PastRetrospective['detailedAnalysis'] {
  const generateCategoryAnalysis = (
    category: keyof EventCategoryScores,
    categoryName: string
  ) => {
    const score = scores[category];
    const factors: string[] = [];
    const whyHappened: string[] = [];

    // 십신 영향
    const sibsinEffect = getSibsinEffect(sibsin, category);
    if (sibsinEffect) factors.push(sibsinEffect);

    // 12운성 영향
    const stageEffect = getStageEffect(twelveStage, category);
    if (stageEffect) factors.push(stageEffect);

    // 인과 요인 중 해당 영역 관련
    for (const cf of causalFactors) {
      if (cf.affectedAreas.some(a =>
        a.includes(categoryName) ||
        (category === 'career' && (a.includes('커리어') || a.includes('사업'))) ||
        (category === 'finance' && (a.includes('재물') || a.includes('재정'))) ||
        (category === 'relationship' && (a.includes('관계') || a.includes('대인'))) ||
        (category === 'health' && a.includes('건강')) ||
        (category === 'travel' && (a.includes('여행') || a.includes('이동'))) ||
        (category === 'education' && (a.includes('학업') || a.includes('교육')))
      )) {
        factors.push(cf.factor);
        whyHappened.push(cf.description);
      }
    }

    // 28수 영향
    if (category === 'relationship' && lunarMansion.goodFor.includes('결혼')) {
      factors.push(`${lunarMansion.nameKo}수 - 관계에 길`);
    }

    // 절기 영향
    if (category === 'health' && solarTerm.element === '토') {
      factors.push(`${solarTerm.nameKo} - 건강 안정기`);
    }

    return { score, factors: factors.slice(0, 5), whyHappened: whyHappened.slice(0, 3) };
  };

  return {
    career: generateCategoryAnalysis('career', '직업'),
    finance: generateCategoryAnalysis('finance', '재정'),
    relationship: generateCategoryAnalysis('relationship', '관계'),
    health: generateCategoryAnalysis('health', '건강'),
    travel: generateCategoryAnalysis('travel', '여행'),
    education: generateCategoryAnalysis('education', '교육'),
  };
}

// 십신의 영역별 영향
function getSibsinEffect(sibsin: string, category: keyof EventCategoryScores): string | null {
  const effects: Record<string, Partial<Record<keyof EventCategoryScores, string>>> = {
    '정관': { career: '정관운 - 승진/안정', relationship: '정관운 - 귀인 만남' },
    '편관': { career: '편관운 - 경쟁/도전', health: '편관운 - 스트레스 주의' },
    '정재': { finance: '정재운 - 안정적 수입', relationship: '정재운 - 좋은 인연' },
    '편재': { finance: '편재운 - 투자 기회', travel: '편재운 - 활동적' },
    '정인': { education: '정인운 - 학업 성취', health: '정인운 - 건강 양호' },
    '편인': { education: '편인운 - 창의적 학습', travel: '편인운 - 이동운' },
    '식신': { health: '식신운 - 건강 좋음', finance: '식신운 - 수입 증가' },
    '상관': { career: '상관운 - 변화 가능', education: '상관운 - 학업 진전' },
    '비견': { relationship: '비견운 - 협력 기회' },
    '겁재': { finance: '겁재운 - 지출 주의', relationship: '겁재운 - 경쟁 관계' },
  };

  return effects[sibsin]?.[category] || null;
}

// 12운성의 영역별 영향
function getStageEffect(stage: string, category: keyof EventCategoryScores): string | null {
  const effects: Record<string, Partial<Record<keyof EventCategoryScores, string>>> = {
    '장생': { education: '장생 - 새로운 시작', health: '장생 - 에너지 충만' },
    '목욕': { relationship: '목욕 - 새로운 만남', travel: '목욕 - 이동 활발' },
    '관대': { career: '관대 - 성장기', relationship: '관대 - 인기 상승' },
    '건록': { career: '건록 - 직업 안정', finance: '건록 - 수입 증가' },
    '제왕': { career: '제왕 - 전성기', finance: '제왕 - 재물 최고조' },
    '쇠': { health: '쇠 - 건강 관리', career: '쇠 - 현상 유지' },
    '병': { health: '병 - 건강 주의', career: '병 - 활동 제한' },
    '사': { health: '사 - 재충전 필요', finance: '사 - 지출 주의' },
    '묘': { career: '묘 - 휴식기', health: '묘 - 회복 필요' },
    '절': { career: '절 - 전환기', relationship: '절 - 관계 정리' },
    '태': { education: '태 - 잉태기', relationship: '태 - 새 인연' },
    '양': { education: '양 - 성장 준비', health: '양 - 회복 중' },
  };

  return effects[stage]?.[category] || null;
}

// 기간별 과거 분석
export function analyzePastPeriod(
  input: LifePredictionInput,
  startDate: Date,
  endDate: Date
): PastRetrospective[] {
  const results: PastRetrospective[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    results.push(analyzePastDate(input, new Date(current)));
    current.setDate(current.getDate() + 1);
  }

  return results;
}

// ============================================================
// 3. 이벤트 타이밍 분석 (TIER 5 초정밀 버전)
// ============================================================

export function findOptimalEventTiming(
  input: LifePredictionInput,
  eventType: EventType,
  startYear: number,
  endYear: number,
  options: { useProgressions?: boolean; useSolarTerms?: boolean } = {}
): EventTimingResult {
  const { useProgressions = true, useSolarTerms = true } = options;

  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  const optimalPeriods: OptimalPeriod[] = [];
  const avoidPeriods: AvoidPeriod[] = [];

  const currentDate = new Date();

  // 생년월일 Date 객체 생성
  const birthDate = new Date(input.birthYear, (input.birthMonth || 1) - 1, input.birthDay || 1);

  // 월별 분석
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      const midMonth = new Date(year, month - 1, 15);

      // 이미 지난 달은 건너뛰기
      if (monthEnd < currentDate) continue;

      const age = year - input.birthYear;

      // 월 간지
      const monthGanji = calculateMonthlyGanji(year, month);
      const yearGanji = calculateYearlyGanji(year);

      // 12운성
      const twelveStage = calculatePreciseTwelveStage(input.dayStem, monthGanji.branch);

      // 십신
      const sibsin = calculateSibsin(input.dayStem, monthGanji.stem);

      // === TIER 5: 절기 분석 ===
      const solarTerm = useSolarTerms ? getSolarTermForDate(midMonth) : null;
      const solarTermMonth = solarTerm ? PrecisionEngine.getSolarTermMonth(midMonth) : month;

      // === TIER 5: 2차 진행법 (Progressions) ===
      let progressionBonus = 0;
      let progressionReason = '';
      if (useProgressions) {
        const progression = calculateSecondaryProgression(birthDate, midMonth);

        // 진행 달의 위상에 따른 보정
        if (progression.moon.phase === 'Full') {
          progressionBonus += 10;
          progressionReason = '진행 보름달 - 결실기';
        } else if (progression.moon.phase === 'New') {
          progressionBonus += 8;
          progressionReason = '진행 초승달 - 새 시작';
        }

        // 이벤트별 진행 행성 위치 분석
        if (eventType === 'marriage' || eventType === 'relationship') {
          if (progression.venus.sign === 'Libra' || progression.venus.sign === 'Taurus') {
            progressionBonus += 8;
            progressionReason = `진행 금성 ${progression.venus.sign} - 관계 길`;
          }
        } else if (eventType === 'career') {
          if (progression.sun.house === 10 || progression.sun.house === 1) {
            progressionBonus += 10;
            progressionReason = `진행 태양 ${progression.sun.house}하우스 - 커리어 상승`;
          }
        }
      }

      // 점수 계산
      let score = 50;
      const reasons: string[] = [];
      const avoidReasons: string[] = [];

      // 유리한 십신
      if (conditions.favorableSibsin.includes(sibsin)) {
        score += 15;
        reasons.push(`${sibsin}운 - ${eventType}에 유리`);
      }
      if (conditions.avoidSibsin.includes(sibsin)) {
        score -= 15;
        avoidReasons.push(`${sibsin}운 - ${eventType}에 불리`);
      }

      // 유리한 12운성
      if (conditions.favorableStages.includes(twelveStage.stage)) {
        score += 12;
        reasons.push(`${twelveStage.stage} - 에너지 상승기`);
      }
      if (conditions.avoidStages.includes(twelveStage.stage)) {
        score -= 12;
        avoidReasons.push(`${twelveStage.stage} - 에너지 저하기`);
      }

      // 유리한 오행
      const monthElement = STEM_ELEMENT[monthGanji.stem];
      if (conditions.favorableElements.includes(monthElement)) {
        score += 8;
        reasons.push(`${monthElement} 기운 - 조화`);
      }

      // 용신/기신
      if (input.yongsin?.includes(monthElement)) {
        score += 10;
        reasons.push('용신 월');
      }
      if (input.kisin?.includes(monthElement)) {
        score -= 10;
        avoidReasons.push('기신 월');
      }

      // === TIER 5: 절기 오행 보정 ===
      if (solarTerm) {
        if (conditions.favorableElements.includes(solarTerm.element)) {
          score += 6;
          reasons.push(`${solarTerm.nameKo} 절기 - ${solarTerm.element} 기운`);
        }
        if (input.yongsin?.includes(solarTerm.element)) {
          score += 5;
          reasons.push(`절기 용신 활성 (${solarTerm.element})`);
        }
      }

      // === TIER 5: 진행법 보정 ===
      if (progressionBonus > 0) {
        score += progressionBonus;
        reasons.push(progressionReason);
      }

      // 지지 상호작용
      const allBranches = [input.dayBranch, input.monthBranch, yearGanji.branch, monthGanji.branch];
      const interactions = analyzeBranchInteractions(allBranches);
      for (const inter of interactions) {
        if (inter.impact === 'positive') {
          score += inter.score * 0.3;
          if (inter.type === '삼합' || inter.type === '육합') {
            reasons.push(inter.description);
          }
        } else if (inter.impact === 'negative') {
          score += inter.score * 0.3;
          if (inter.type === '충') {
            avoidReasons.push(inter.description);
          }
        }
      }

      // 대운 영향
      const daeun = input.daeunList?.find(d => age >= d.startAge && age <= d.endAge);
      if (daeun) {
        const daeunStage = calculatePreciseTwelveStage(input.dayStem, daeun.branch);
        if (conditions.favorableStages.includes(daeunStage.stage)) {
          score += 8;
          reasons.push(`대운 ${daeunStage.stage} - 장기적 지원`);
        }

        // === TIER 5: 대운-절기월 동기화 ===
        if (solarTerm && daeun.element === solarTerm.element) {
          score += 7;
          reasons.push(`대운-절기 동기화 (${daeun.element})`);
        }
      }

      // === 점성 데이터 보정 ===
      const astroBonus = calculateAstroBonus(input, eventType);
      score += astroBonus.bonus;
      reasons.push(...astroBonus.reasons);
      avoidReasons.push(...astroBonus.penalties);

      // === TIER 4: 트랜짓 데이터 보정 ===
      // 현재 월이면 실시간 트랜짓 데이터 사용, 미래 월이면 예상 계산
      if (year === new Date().getFullYear() && month === new Date().getMonth() + 1) {
        // 현재 월 - 실제 트랜짓 데이터 사용
        const transitBonus = calculateTransitBonus(input, eventType);
        score += transitBonus.bonus;
        reasons.push(...transitBonus.reasons);
        avoidReasons.push(...transitBonus.penalties);

        // 트랜짓 하우스 오버레이 분석
        const houseOverlay = calculateTransitHouseOverlay(input, eventType);
        score += houseOverlay.bonus;
        reasons.push(...houseOverlay.reasons);
      } else {
        // 미래 월 - 외행성 이동 추정 + 네이탈 애스펙트 계산
        const transitEstimate = estimateMonthlyTransitScore(input, eventType, year, month);
        score += transitEstimate.bonus;
        reasons.push(...transitEstimate.reasons);
      }

      // === TIER 5+: 대운-세운-월운 복합 시너지 분석 ===
      const compoundLuck = calculateCompoundLuckScore(input, eventType, year, month);
      score += compoundLuck.bonus;
      reasons.push(...compoundLuck.reasons);
      avoidReasons.push(...compoundLuck.penalties);

      // === TIER 6: 프로그레션 + 신살 + 일주론 통합 분석 ===
      const tier6Input = {
        birthYear: input.birthYear,
        birthMonth: input.birthMonth,
        birthDay: input.birthDay,
        dayStem: input.dayStem,
        dayBranch: input.dayBranch,
        monthBranch: input.monthBranch,
        yearBranch: input.yearBranch,
        yongsin: input.yongsin,
        kisin: input.kisin,
        advancedAstro: input.advancedAstro,
      };
      const tier6 = calculateTier6Bonus(tier6Input, eventType, year, month);
      score += tier6.total;
      reasons.push(...tier6.progression.reasons);
      reasons.push(...tier6.shinsal.reasons);
      reasons.push(...tier6.dayPillar.reasons);
      avoidReasons.push(...tier6.progression.penalties);
      avoidReasons.push(...tier6.shinsal.penalties);
      avoidReasons.push(...tier6.dayPillar.warnings);

      // === TIER 7-10: 일진/시주 + 점성술 심화 + 격국/용신 + 통합 신뢰도 ===
      const tier7To10Input = {
        birthYear: input.birthYear,
        birthMonth: input.birthMonth,
        birthDay: input.birthDay,
        birthHour: input.birthHour,
        dayStem: input.dayStem,
        dayBranch: input.dayBranch,
        monthStem: input.allStems?.[1] || '',
        monthBranch: input.monthBranch,
        yearStem: input.allStems?.[0] || '',
        yearBranch: input.yearBranch,
        hourStem: input.allStems?.[3],
        hourBranch: input.allBranches?.[3],
        allStems: input.allStems,
        allBranches: input.allBranches,
        yongsin: input.yongsin,
        kisin: input.kisin,
        advancedAstro: input.advancedAstro,
      };
      const tier7To10 = calculateTier7To10Bonus(tier7To10Input, eventType, year, month);
      score += tier7To10.total;
      reasons.push(...tier7To10.reasons);
      avoidReasons.push(...tier7To10.penalties);

      score = Math.max(0, Math.min(100, score));

      // 분류
      if (score >= 70) {
        let grade: OptimalPeriod['grade'];
        if (score >= 85) grade = 'S';
        else if (score >= 75) grade = 'A';
        else grade = 'B';

        // 해당 월의 좋은 날짜 찾기 (TIER 5 버전)
        const specificDays = findSpecificGoodDays(input, monthStart, monthEnd, eventType, {
          useLunarMansions: true,
          usePlanetaryHours: false,
        });

        optimalPeriods.push({
          startDate: monthStart,
          endDate: monthEnd,
          score,
          grade,
          reasons,
          specificDays,
        });
      } else if (score <= 35) {
        avoidPeriods.push({
          startDate: monthStart,
          endDate: monthEnd,
          score,
          reasons: avoidReasons,
        });
      }
    }
  }

  // 정렬
  optimalPeriods.sort((a, b) => b.score - a.score);
  avoidPeriods.sort((a, b) => a.score - b.score);

  // 다음 최적 시기
  const futureOptimal = optimalPeriods.filter(p => p.startDate > currentDate);
  const nextBestWindow = futureOptimal.length > 0 ? futureOptimal[0] : null;

  // 조언 생성
  const advice = generateEventAdvice(eventType, optimalPeriods, avoidPeriods, nextBestWindow);

  return {
    eventType,
    searchRange: { startYear, endYear },
    optimalPeriods: optimalPeriods.slice(0, 10),
    avoidPeriods: avoidPeriods.slice(0, 5),
    nextBestWindow,
    advice,
  };
}

function findSpecificGoodDays(
  input: LifePredictionInput,
  monthStart: Date,
  monthEnd: Date,
  eventType: EventType,
  options: { useLunarMansions?: boolean; usePlanetaryHours?: boolean } = {}
): Date[] {
  const { useLunarMansions = true, usePlanetaryHours = false } = options;

  const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
  const goodDays: { date: Date; score: number; reasons: string[] }[] = [];

  const current = new Date(monthStart);
  while (current <= monthEnd) {
    const dailyPillar = calculateDailyPillar(current);
    const sibsin = calculateSibsin(input.dayStem, dailyPillar.stem);
    const twelveStage = calculatePreciseTwelveStage(input.dayStem, dailyPillar.branch);

    let score = 50;
    const reasons: string[] = [];

    // 기본 사주 분석
    if (conditions.favorableSibsin.includes(sibsin)) {
      score += 15;
      reasons.push(`${sibsin}운`);
    }
    if (conditions.avoidSibsin.includes(sibsin)) score -= 15;
    if (conditions.favorableStages.includes(twelveStage.stage)) {
      score += 12;
      reasons.push(twelveStage.stage);
    }
    if (conditions.avoidStages.includes(twelveStage.stage)) score -= 12;

    // === TIER 5: 28수 분석 ===
    if (useLunarMansions) {
      const lunarMansion = getLunarMansion(current);

      // 이벤트별 28수 길흉 분석
      const eventKeywords: Record<EventType, string[]> = {
        marriage: ['결혼'],
        career: ['개업'],
        investment: ['계약'],
        move: ['이사'],
        study: ['학업'],
        health: [],
        relationship: ['결혼', '개업'],
      };

      const keywords = eventKeywords[eventType];

      if (lunarMansion.isAuspicious) {
        score += 8;
        if (keywords.some(k => lunarMansion.goodFor.includes(k))) {
          score += 10;
          reasons.push(`${lunarMansion.nameKo}수 - ${eventType}에 최적`);
        } else {
          reasons.push(`${lunarMansion.nameKo}수 - 길일`);
        }
      } else {
        score -= 6;
        if (keywords.some(k => lunarMansion.badFor.includes(k))) {
          score -= 10;
        }
      }
    }

    // === TIER 5: 절기 분석 ===
    const solarTerm = getSolarTermForDate(current);
    const dayElement = STEM_ELEMENT[dailyPillar.stem];

    // 용신 활성 확인
    if (input.yongsin?.includes(dayElement)) {
      score += 10;
      reasons.push('용신일');
    }
    if (input.kisin?.includes(dayElement)) {
      score -= 8;
    }

    // 절기 에너지 조화
    if (conditions.favorableElements.includes(solarTerm.element)) {
      score += 5;
    }

    // === TIER 5: 신살 분석 ===
    const shinsals = detectShinsals(input, dailyPillar);
    for (const shinsal of shinsals) {
      if (shinsal.type === 'lucky') {
        if (shinsal.name === '천을귀인') {
          score += 12;
          reasons.push('천을귀인');
        } else if (shinsal.name === '역마' && eventType === 'move') {
          score += 10;
          reasons.push('역마');
        } else if (shinsal.name === '문창' && eventType === 'study') {
          score += 10;
          reasons.push('문창');
        }
      } else {
        if (shinsal.name === '겁살') {
          score -= 10;
        }
      }
    }

    // 점수 정규화
    score = Math.max(0, Math.min(100, score));

    if (score >= 65) {
      goodDays.push({ date: new Date(current), score, reasons });
    }

    current.setDate(current.getDate() + 1);
  }

  return goodDays
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(d => d.date);
}

function generateEventAdvice(
  eventType: EventType,
  optimalPeriods: OptimalPeriod[],
  avoidPeriods: AvoidPeriod[],
  nextBest: OptimalPeriod | null
): string {
  const eventNames: Record<EventType, string> = {
    marriage: '결혼',
    career: '취업/이직',
    investment: '투자',
    move: '이사',
    study: '학업/시험',
    health: '건강관리',
    relationship: '인간관계',
  };

  let advice = `${eventNames[eventType]}에 대한 타이밍 분석 결과입니다. `;

  if (optimalPeriods.length > 0) {
    const bestPeriod = optimalPeriods[0];
    const monthStr = `${bestPeriod.startDate.getFullYear()}년 ${bestPeriod.startDate.getMonth() + 1}월`;
    advice += `가장 좋은 시기는 ${monthStr}입니다 (${bestPeriod.grade}등급, ${Math.round(bestPeriod.score)}점). `;
  }

  if (nextBest && optimalPeriods[0] !== nextBest) {
    const monthStr = `${nextBest.startDate.getFullYear()}년 ${nextBest.startDate.getMonth() + 1}월`;
    advice += `다가오는 최적 시기는 ${monthStr}입니다. `;
  }

  if (avoidPeriods.length > 0) {
    const worstPeriod = avoidPeriods[0];
    const monthStr = `${worstPeriod.startDate.getFullYear()}년 ${worstPeriod.startDate.getMonth() + 1}월`;
    advice += `${monthStr}은 피하는 것이 좋습니다.`;
  }

  return advice;
}

// ============================================================
// 4. 종합 예측 생성
// ============================================================

export function generateComprehensivePrediction(
  input: LifePredictionInput,
  yearsRange: number = 10
): ComprehensivePrediction {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 2;
  const endYear = currentYear + yearsRange;

  // 다년간 트렌드
  const multiYearTrend = analyzeMultiYearTrend(input, startYear, endYear);

  // 대운-트랜짓 동기화 (대운 정보가 있는 경우)
  let lifeSync: LifeSyncAnalysis | undefined;
  if (input.daeunList && input.daeunList.length > 0) {
    const currentAge = currentYear - input.birthYear;
    lifeSync = analyzeDaeunTransitSync(input.daeunList, input.birthYear, currentAge);
  }

  // 다가오는 하이라이트 추출
  const upcomingHighlights = extractUpcomingHighlights(multiYearTrend, lifeSync, currentYear);

  // 신뢰도 계산
  let confidence = 60;
  if (input.daeunList && input.daeunList.length > 0) confidence += 15;
  if (input.yongsin && input.yongsin.length > 0) confidence += 10;
  if (input.birthHour !== undefined) confidence += 10;
  confidence = Math.min(95, confidence);

  return {
    input,
    generatedAt: new Date(),
    multiYearTrend,
    upcomingHighlights,
    lifeSync,
    confidence,
  };
}

function extractUpcomingHighlights(
  trend: MultiYearTrend,
  lifeSync: LifeSyncAnalysis | undefined,
  currentYear: number
): UpcomingHighlight[] {
  const highlights: UpcomingHighlight[] = [];
  const today = new Date();

  // 피크 연도
  for (const peakYear of trend.peakYears) {
    if (peakYear >= currentYear) {
      const yearData = trend.yearlyScores.find(y => y.year === peakYear);
      if (yearData) {
        highlights.push({
          type: 'peak',
          date: new Date(peakYear, 0, 1),
          title: `${peakYear}년 최고 운세`,
          description: `${yearData.grade}등급 (${Math.round(yearData.score)}점) - ${yearData.themes.join(', ')}`,
          score: yearData.score,
          actionItems: yearData.opportunities,
        });
      }
    }
  }

  // 대운 전환점
  for (const transition of trend.daeunTransitions) {
    if (transition.year >= currentYear) {
      highlights.push({
        type: 'transition',
        date: new Date(transition.year, 0, 1),
        title: `${transition.year}년 대운 전환`,
        description: transition.description,
        score: transition.impact.includes('positive') ? 75 : transition.impact.includes('challenging') ? 35 : 50,
        actionItems: transition.impact.includes('positive')
          ? ['새로운 시작에 적합', '중요한 계획 추진']
          : ['변화에 대한 준비', '신중한 접근 필요'],
      });
    }
  }

  // 대운-트랜짓 동기화 포인트
  if (lifeSync) {
    for (const point of lifeSync.majorTransitions.slice(0, 3)) {
      if (point.year >= currentYear) {
        highlights.push({
          type: point.synergyType === 'amplify' ? 'opportunity' : point.synergyType === 'clash' ? 'challenge' : 'transition',
          date: new Date(point.year, 0, 1),
          title: `${point.age}세 (${point.year}년) 주요 전환점`,
          description: point.themes.slice(0, 2).join(', '),
          score: point.synergyScore,
          actionItems: point.synergyType === 'amplify' ? point.opportunities : point.challenges,
        });
      }
    }
  }

  // 정렬 (날짜순)
  highlights.sort((a, b) => a.date.getTime() - b.date.getTime());

  return highlights.slice(0, 10);
}

// ============================================================
// 프롬프트 컨텍스트 생성
// ============================================================

export function generateLifePredictionPromptContext(
  prediction: ComprehensivePrediction,
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];

  if (lang === 'ko') {
    lines.push('=== 종합 인생 예측 분석 ===');
    lines.push(`분석 기간: ${prediction.multiYearTrend.startYear}~${prediction.multiYearTrend.endYear}년`);
    lines.push(`전체 트렌드: ${prediction.multiYearTrend.overallTrend}`);
    lines.push(`신뢰도: ${prediction.confidence}%`);
    lines.push('');

    lines.push('--- 연도별 운세 ---');
    for (const year of prediction.multiYearTrend.yearlyScores.slice(0, 10)) {
      lines.push(`${year.year}년 (${year.age}세): ${year.grade}등급 (${Math.round(year.score)}점) - ${year.sibsin}, ${year.twelveStage.stage}`);
      if (year.opportunities.length > 0) {
        lines.push(`  기회: ${year.opportunities.slice(0, 2).join(', ')}`);
      }
      if (year.challenges.length > 0) {
        lines.push(`  주의: ${year.challenges.slice(0, 2).join(', ')}`);
      }
    }
    lines.push('');

    if (prediction.multiYearTrend.daeunTransitions.length > 0) {
      lines.push('--- 대운 전환점 ---');
      for (const trans of prediction.multiYearTrend.daeunTransitions) {
        lines.push(`${trans.year}년 (${trans.age}세): ${trans.description} [${trans.impact}]`);
      }
      lines.push('');
    }

    lines.push('--- 다가오는 주요 시점 ---');
    for (const highlight of prediction.upcomingHighlights.slice(0, 5)) {
      lines.push(`[${highlight.type}] ${highlight.title}`);
      lines.push(`  ${highlight.description}`);
      lines.push(`  행동: ${highlight.actionItems.slice(0, 2).join(', ')}`);
    }
    lines.push('');

    lines.push(`요약: ${prediction.multiYearTrend.summary}`);

  } else {
    lines.push('=== Comprehensive Life Prediction ===');
    lines.push(`Period: ${prediction.multiYearTrend.startYear}-${prediction.multiYearTrend.endYear}`);
    lines.push(`Trend: ${prediction.multiYearTrend.overallTrend}`);
    lines.push(`Confidence: ${prediction.confidence}%`);
    lines.push('');

    for (const year of prediction.multiYearTrend.yearlyScores.slice(0, 10)) {
      lines.push(`${year.year} (Age ${year.age}): Grade ${year.grade} (${Math.round(year.score)})`);
    }
  }

  return lines.join('\n');
}

export function generateEventTimingPromptContext(
  result: EventTimingResult,
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];

  const eventNames: Record<EventType, { ko: string; en: string }> = {
    marriage: { ko: '결혼', en: 'Marriage' },
    career: { ko: '취업/이직', en: 'Career' },
    investment: { ko: '투자', en: 'Investment' },
    move: { ko: '이사', en: 'Move' },
    study: { ko: '학업/시험', en: 'Study' },
    health: { ko: '건강관리', en: 'Health' },
    relationship: { ko: '인간관계', en: 'Relationship' },
  };

  if (lang === 'ko') {
    lines.push(`=== ${eventNames[result.eventType].ko} 최적 타이밍 분석 ===`);
    lines.push(`검색 범위: ${result.searchRange.startYear}~${result.searchRange.endYear}년`);
    lines.push('');

    lines.push('--- 최적 시기 (상위 5개) ---');
    for (const period of result.optimalPeriods.slice(0, 5)) {
      const monthStr = `${period.startDate.getFullYear()}년 ${period.startDate.getMonth() + 1}월`;
      lines.push(`${monthStr}: ${period.grade}등급 (${Math.round(period.score)}점)`);
      lines.push(`  이유: ${period.reasons.slice(0, 3).join(', ')}`);
      if (period.specificDays && period.specificDays.length > 0) {
        const days = period.specificDays.map(d => `${d.getDate()}일`).join(', ');
        lines.push(`  추천일: ${days}`);
      }
    }
    lines.push('');

    if (result.avoidPeriods.length > 0) {
      lines.push('--- 피해야 할 시기 ---');
      for (const period of result.avoidPeriods.slice(0, 3)) {
        const monthStr = `${period.startDate.getFullYear()}년 ${period.startDate.getMonth() + 1}월`;
        lines.push(`${monthStr}: ${period.reasons.slice(0, 2).join(', ')}`);
      }
      lines.push('');
    }

    lines.push(`조언: ${result.advice}`);

  } else {
    lines.push(`=== ${eventNames[result.eventType].en} Optimal Timing ===`);
    lines.push(`Range: ${result.searchRange.startYear}-${result.searchRange.endYear}`);
    lines.push('');

    for (const period of result.optimalPeriods.slice(0, 5)) {
      const monthStr = `${period.startDate.getFullYear()}/${period.startDate.getMonth() + 1}`;
      lines.push(`${monthStr}: Grade ${period.grade} (${Math.round(period.score)})`);
    }
  }

  return lines.join('\n');
}

export function generatePastAnalysisPromptContext(
  retrospective: PastRetrospective,
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];
  const dateStr = retrospective.targetDate.toISOString().split('T')[0];

  if (lang === 'ko') {
    lines.push(`=== ${dateStr} 과거 분석 ===`);
    lines.push(`일진: ${retrospective.dailyPillar.stem}${retrospective.dailyPillar.branch}`);
    lines.push(`등급: ${retrospective.grade} (${Math.round(retrospective.score)}점)`);
    lines.push(`12운성: ${retrospective.twelveStage.stage}`);
    lines.push(`십신: ${retrospective.sibsin}`);
    lines.push('');

    lines.push('--- 왜 그랬을까? ---');
    for (const reason of retrospective.whyItHappened) {
      lines.push(`• ${reason}`);
    }
    lines.push('');

    lines.push('--- 배운 점 ---');
    for (const lesson of retrospective.lessonsLearned) {
      lines.push(`• ${lesson}`);
    }

  } else {
    lines.push(`=== Past Analysis: ${dateStr} ===`);
    lines.push(`Daily: ${retrospective.dailyPillar.stem}${retrospective.dailyPillar.branch}`);
    lines.push(`Grade: ${retrospective.grade} (${Math.round(retrospective.score)})`);
  }

  return lines.join('\n');
}
