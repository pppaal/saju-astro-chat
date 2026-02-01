/**
 * Destiny Calendar Scoring Module
 * 체계적인 점수 계산 로직 (v2 - 논리적 개선)
 *
 * 설계 원칙:
 * 1. 사주 50점 + 점성술 50점 = 총 100점
 * 2. 각 카테고리 내 요소들은 정규화 후 합산
 * 3. 교차검증으로 최대 ±3점 보정 (완화)
 * 4. 삼재: 조건부 처리 (충과 함께일 때만 가중, 귀인 있으면 상쇄)
 */

import {
  CATEGORY_MAX_SCORES,
  DAEUN_SCORES,
  SEUN_SCORES,
  WOLUN_SCORES,
  ILJIN_SCORES,
  YONGSIN_SCORES,
  TRANSIT_SUN_SCORES,
  TRANSIT_MOON_SCORES,
  MAJOR_PLANETS_SCORES,
  LUNAR_PHASE_SCORES,
  SOLAR_RETURN_SCORES,
  CROSS_VERIFICATION_SCORES,
  GRADE_THRESHOLDS,
  calculateAdjustedScore,
} from './scoring-config';

import type { ImportanceGrade } from './types';
import { createScoreCalculator } from './scoring-factory';
import {
  DAEUN_CONFIG,
  SEUN_CONFIG,
  WOLUN_CONFIG,
  ILJIN_CONFIG,
} from './scoring-factory-config';

// ============================================================
// 입력 타입 정의
// ============================================================

export interface SajuScoreInput {
  // 대운 요소
  daeun: {
    sibsin?: string;      // 십신 (inseong, jaeseong, etc.)
    hasYukhap?: boolean;
    hasSamhapPositive?: boolean;
    hasChung?: boolean;
    hasGwansal?: boolean;
    hasSamhapNegative?: boolean;
  };
  // 세운 요소
  seun: {
    sibsin?: string;
    hasYukhap?: boolean;
    hasSamhapPositive?: boolean;
    hasChung?: boolean;
    hasGwansal?: boolean;
    hasSamhapNegative?: boolean;
    isSamjaeYear?: boolean;
    // 삼재 조건부 처리를 위한 추가 필드
    hasGwiin?: boolean;  // 귀인이 있으면 삼재 상쇄
  };
  // 월운 요소
  wolun: {
    sibsin?: string;
    hasYukhap?: boolean;
    hasSamhapPositive?: boolean;
    hasChung?: boolean;
    hasGwansal?: boolean;
    hasSamhapNegative?: boolean;
  };
  // 일진 요소
  iljin: {
    sibsin?: string;       // 일간과 일진 천간의 십신
    branchSibsin?: string; // 일간과 일진 지지의 십신
    hasYukhap?: boolean;
    hasSamhapPositive?: boolean;
    hasSamhapNegative?: boolean;
    hasChung?: boolean;
    hasXing?: boolean;
    hasHai?: boolean;
    hasCheoneulGwiin?: boolean;
    hasGeonrok?: boolean;
    hasSonEomneun?: boolean;
    hasYeokma?: boolean;
    hasDohwa?: boolean;
    // 추가 신살
    hasGongmang?: boolean;      // 공망 (空亡) - 허공, 공허
    hasWonjin?: boolean;        // 원진 (怨嗔) - 원망, 갈등
    hasYangin?: boolean;        // 양인 (羊刃) - 강한 에너지, 위험
    hasGoegang?: boolean;       // 괴강 (魁罡) - 강력함, 극단
    hasHwagae?: boolean;        // 화개 (華蓋) - 예술, 종교
    hasBackho?: boolean;        // 백호 (白虎) - 사고, 수술
    hasGuimungwan?: boolean;    // 귀문관 (鬼門關) - 정신적 혼란
    hasTaegukGwiin?: boolean;   // 태극귀인 - 큰 행운
    hasCheondeokGwiin?: boolean; // 천덕귀인 - 하늘의 덕
    hasWoldeokGwiin?: boolean;  // 월덕귀인 - 달의 덕
  };
  // 용신/격국
  yongsin: {
    hasPrimaryMatch?: boolean;
    hasSecondaryMatch?: boolean;
    hasBranchMatch?: boolean;
    hasSupport?: boolean;
    hasKibsinMatch?: boolean;
    hasKibsinBranch?: boolean;
    hasHarm?: boolean;
    geokgukFavor?: boolean;
    geokgukAvoid?: boolean;
    strengthBalance?: boolean;
    strengthImbalance?: boolean;
  };
}

export interface AstroScoreInput {
  // 트랜짓 태양
  transitSun: {
    elementRelation?: 'same' | 'generatedBy' | 'generates' | 'controlledBy' | 'controls';
  };
  // 트랜짓 달
  transitMoon: {
    elementRelation?: 'same' | 'generatedBy' | 'generates' | 'controlledBy' | 'controls';
    isVoidOfCourse?: boolean;
  };
  // 주요 행성 (내행성 + 사회 행성)
  majorPlanets: {
    mercury?: { aspect?: string; isRetrograde?: boolean };
    venus?: { aspect?: string; isRetrograde?: boolean };
    mars?: { aspect?: string; isRetrograde?: boolean };
    jupiter?: { aspect?: string; isRetrograde?: boolean };
    saturn?: { aspect?: string; isRetrograde?: boolean };
  };
  // 외행성 (세대 행성) - 추가
  outerPlanets?: {
    uranus?: { aspect?: string };    // 천왕성: 변화, 혁신, 예상치 못한 일
    neptune?: { aspect?: string };   // 해왕성: 영감, 환상, 혼란
    pluto?: { aspect?: string };     // 명왕성: 변혁, 재탄생, 권력
  };
  // 특수점 - 추가
  specialPoints?: {
    chiron?: { aspect?: string };           // 키론: 상처와 치유
    northNode?: { aspect?: string };        // 북교점: 운명, 목표
    southNode?: { aspect?: string };        // 남교점: 과거, 카르마
    lilith?: { aspect?: string };           // 릴리스: 본능, 억압
  };
  // 일식/월식 영향 - 추가
  eclipse?: {
    isEclipseDay?: boolean;           // 일식/월식 당일
    isNearEclipse?: boolean;          // 일식/월식 ±3일
    eclipseType?: 'solar' | 'lunar';
  };
  // 달 위상
  lunarPhase?: 'newMoon' | 'waxingCrescent' | 'firstQuarter' | 'waxingGibbous' |
               'fullMoon' | 'waningGibbous' | 'lastQuarter' | 'waningCrescent';
  // Solar Return
  solarReturn: {
    daysFromBirthday?: number;
    progressionSupport?: boolean;
    progressionChallenge?: boolean;
  };
}

export interface ScoreResult {
  // 세부 점수
  sajuScore: number;       // 0-50
  astroScore: number;      // 0-50
  crossBonus: number;      // -3 to +5
  // 최종 점수
  totalScore: number;      // 0-100
  // 등급
  grade: ImportanceGrade;
  // 세부 내역 (디버깅용)
  breakdown: {
    daeun: number;
    seun: number;
    wolun: number;
    iljin: number;
    yongsin: number;
    transitSun: number;
    transitMoon: number;
    majorPlanets: number;
    lunarPhase: number;
    solarReturn: number;
  };
  // 플래그
  sajuPositive: boolean;
  sajuNegative: boolean;
  astroPositive: boolean;
  astroNegative: boolean;
  crossVerified: boolean;
}

// ============================================================
// 사주 점수 계산
// ============================================================

// Factory-generated calculator (replaces original calculateDaeunScore)
export const calculateDaeunScore = createScoreCalculator(DAEUN_CONFIG);

// Factory-generated calculator (replaces original calculateSeunScore)
export const calculateSeunScore = createScoreCalculator(SEUN_CONFIG);

// Factory-generated calculator (replaces original calculateWolunScore)
export const calculateWolunScore = createScoreCalculator(WOLUN_CONFIG);

// Factory-generated calculator (replaces original calculateIljinScore)
export const calculateIljinScore = createScoreCalculator(ILJIN_CONFIG);

function calculateYongsinScore(input: SajuScoreInput['yongsin']): number {
  const maxScore = CATEGORY_MAX_SCORES.saju.yongsin; // 5점
  const adjustments: number[] = [];

  // 긍정 요소 - config 비율 사용
  if (input.hasPrimaryMatch) {adjustments.push(YONGSIN_SCORES.positive.primaryMatch);}
  if (input.hasSecondaryMatch) {adjustments.push(YONGSIN_SCORES.positive.secondaryMatch);}
  if (input.hasBranchMatch) {adjustments.push(YONGSIN_SCORES.positive.branchMatch);}
  if (input.hasSupport) {adjustments.push(YONGSIN_SCORES.positive.support);}

  // 부정 요소
  if (input.hasKibsinMatch) {adjustments.push(YONGSIN_SCORES.negative.kibsinMatch);}
  if (input.hasKibsinBranch) {adjustments.push(YONGSIN_SCORES.negative.kibsinBranch);}
  if (input.hasHarm) {adjustments.push(YONGSIN_SCORES.negative.harm);}

  // 격국
  if (input.geokgukFavor) {adjustments.push(YONGSIN_SCORES.geokguk.favor);}
  if (input.geokgukAvoid) {adjustments.push(YONGSIN_SCORES.geokguk.avoid);}
  if (input.strengthBalance) {adjustments.push(YONGSIN_SCORES.geokguk.strengthBalance);}
  if (input.strengthImbalance) {adjustments.push(YONGSIN_SCORES.geokguk.strengthImbalance);}

  return calculateAdjustedScore(maxScore, adjustments, YONGSIN_SCORES.maxRaw);
}

// ============================================================
// 점성술 점수 계산
// ============================================================

function calculateTransitSunScore(input: AstroScoreInput['transitSun']): number {
  const maxScore = CATEGORY_MAX_SCORES.astro.transitSun; // 8점 (개선)
  const adjustments: number[] = [];

  // 오행 관계 - config 비율 사용
  const relationKey = input.elementRelation as keyof typeof TRANSIT_SUN_SCORES.elementRelation;
  if (relationKey && relationKey in TRANSIT_SUN_SCORES.elementRelation) {
    adjustments.push(TRANSIT_SUN_SCORES.elementRelation[relationKey]);
  }

  return calculateAdjustedScore(maxScore, adjustments, TRANSIT_SUN_SCORES.maxRaw);
}

function calculateTransitMoonScore(input: AstroScoreInput['transitMoon']): number {
  const maxScore = CATEGORY_MAX_SCORES.astro.transitMoon; // 12점 (개선)
  const adjustments: number[] = [];

  // 오행 관계 - config 비율 사용
  const relationKey = input.elementRelation as keyof typeof TRANSIT_MOON_SCORES.elementRelation;
  if (relationKey && relationKey in TRANSIT_MOON_SCORES.elementRelation) {
    adjustments.push(TRANSIT_MOON_SCORES.elementRelation[relationKey]);
  }

  // Void of Course 페널티 - config 사용 (완화됨)
  if (input.isVoidOfCourse) {adjustments.push(TRANSIT_MOON_SCORES.voidOfCourse);}

  return calculateAdjustedScore(maxScore, adjustments, TRANSIT_MOON_SCORES.maxRaw);
}

function calculateMajorPlanetsScore(input: AstroScoreInput['majorPlanets']): number {
  const maxScore = CATEGORY_MAX_SCORES.astro.majorPlanets; // 15점
  const adjustments: number[] = [];

  const planets: (keyof typeof input)[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

  for (const planet of planets) {
    const planetData = input[planet];
    if (!planetData) {continue;}

    const weight = MAJOR_PLANETS_SCORES.weights[planet] || 1.0;

    // 어스펙트 점수 - config 사용 (완화됨)
    const aspectKey = planetData.aspect as keyof typeof MAJOR_PLANETS_SCORES.aspects;
    if (aspectKey && aspectKey in MAJOR_PLANETS_SCORES.aspects) {
      adjustments.push(MAJOR_PLANETS_SCORES.aspects[aspectKey] * weight);
    }

    // 역행 페널티 - config 사용 (완화됨)
    if (planetData.isRetrograde) {
      const retrograde = MAJOR_PLANETS_SCORES.retrograde[planet as keyof typeof MAJOR_PLANETS_SCORES.retrograde];
      if (retrograde) {adjustments.push(retrograde);}
    }
  }

  return calculateAdjustedScore(maxScore, adjustments, MAJOR_PLANETS_SCORES.maxRaw);
}

function calculateLunarPhaseScore(phase?: AstroScoreInput['lunarPhase']): number {
  const maxScore = CATEGORY_MAX_SCORES.astro.lunarPhase; // 8점 (개선)
  const adjustments: number[] = [];

  if (!phase) {return maxScore * 0.5;} // 기본 중간값

  // 달 위상별 점수 - config 사용 (완만한 분포)
  const phaseKey = phase as keyof typeof LUNAR_PHASE_SCORES;
  if (phaseKey && phaseKey in LUNAR_PHASE_SCORES && phaseKey !== 'maxRaw') {
    adjustments.push(LUNAR_PHASE_SCORES[phaseKey] as number);
  }

  return calculateAdjustedScore(maxScore, adjustments, LUNAR_PHASE_SCORES.maxRaw);
}

function calculateSolarReturnScore(input: AstroScoreInput['solarReturn']): number {
  const maxScore = CATEGORY_MAX_SCORES.astro.solarReturn; // 7점 (개선)
  const adjustments: number[] = [];

  // 생일 근처 보너스 - config 사용
  const days = input.daysFromBirthday ?? 365;
  if (days === 0) {adjustments.push(SOLAR_RETURN_SCORES.exactBirthday);}
  else if (days <= 1) {adjustments.push(SOLAR_RETURN_SCORES.nearBirthday1);}
  else if (days <= 3) {adjustments.push(SOLAR_RETURN_SCORES.nearBirthday3);}
  else if (days <= 7) {adjustments.push(SOLAR_RETURN_SCORES.nearBirthday7);}

  // Progression - config 사용
  if (input.progressionSupport) {adjustments.push(SOLAR_RETURN_SCORES.progressionSupport);}
  if (input.progressionChallenge) {adjustments.push(SOLAR_RETURN_SCORES.progressionChallenge);}

  return calculateAdjustedScore(maxScore, adjustments, SOLAR_RETURN_SCORES.maxRaw);
}

/**
 * 외행성 점수 계산 (추가 보정)
 * 외행성은 세대적 영향이라 개인 일일운에 미치는 영향은 작지만,
 * 네이탈 차트와 어스펙트가 있을 때 영향력 발생
 */
function calculateOuterPlanetsScore(input?: AstroScoreInput['outerPlanets']): number {
  if (!input) {return 0;}

  let score = 0;

  const aspectScores: Record<string, number> = {
    conjunction: 3.0,   // 합: 강력한 변화
    trine: 2.5,         // 삼분: 조화로운 변화
    sextile: 1.5,       // 육분: 기회
    square: -2.5,       // 사분: 긴장/도전
    opposition: -2.0,   // 충: 대립
  };

  // 천왕성: 갑작스러운 변화, 혁신
  if (input.uranus?.aspect && input.uranus.aspect in aspectScores) {
    score += aspectScores[input.uranus.aspect] * 1.2;
  }
  // 해왕성: 영감, 환상, 혼란
  if (input.neptune?.aspect && input.neptune.aspect in aspectScores) {
    score += aspectScores[input.neptune.aspect] * 0.8;
  }
  // 명왕성: 변혁, 재탄생
  if (input.pluto?.aspect && input.pluto.aspect in aspectScores) {
    score += aspectScores[input.pluto.aspect] * 1.0;
  }

  return Math.round(score * 10) / 10;
}

/**
 * 특수점 점수 계산 (키론, 노드, 릴리스)
 */
function calculateSpecialPointsScore(input?: AstroScoreInput['specialPoints']): number {
  if (!input) {return 0;}

  let score = 0;

  const aspectScores: Record<string, number> = {
    conjunction: 4.0,
    trine: 3.0,
    sextile: 2.0,
    square: -3.0,
    opposition: -2.5,
  };

  // 키론: 상처와 치유
  if (input.chiron?.aspect && input.chiron.aspect in aspectScores) {
    // 키론 어스펙트는 도전이자 치유의 기회
    const chironScore = aspectScores[input.chiron.aspect];
    score += chironScore > 0 ? chironScore * 0.8 : chironScore * 0.5;
  }

  // 북교점: 운명적 방향, 성장
  if (input.northNode?.aspect && input.northNode.aspect in aspectScores) {
    score += aspectScores[input.northNode.aspect] * 1.2; // 운명적 영향 강화
  }

  // 남교점: 과거 카르마, 익숙한 패턴
  if (input.southNode?.aspect && input.southNode.aspect in aspectScores) {
    // 남교점은 편안하지만 성장에 방해될 수 있음
    const southScore = aspectScores[input.southNode.aspect];
    score += southScore > 0 ? southScore * 0.5 : southScore * 0.8;
  }

  // 릴리스: 본능, 억압된 에너지
  if (input.lilith?.aspect && input.lilith.aspect in aspectScores) {
    score += aspectScores[input.lilith.aspect] * 0.6;
  }

  return Math.round(score * 10) / 10;
}

/**
 * 일식/월식 점수 계산
 * 일식/월식은 강력한 에너지 포인트 - 변화와 전환점
 */
function calculateEclipseScore(input?: AstroScoreInput['eclipse']): number {
  if (!input) {return 0;}

  let score = 0;

  if (input.isEclipseDay) {
    // 일식/월식 당일: 매우 강력한 에너지
    // 일식: 새로운 시작, 월식: 마무리/해방
    if (input.eclipseType === 'solar') {
      score += 5.0;  // 일식: 새로운 시작의 강력한 에너지
    } else {
      score += 3.0;  // 월식: 감정적 해방, 마무리
    }
  } else if (input.isNearEclipse) {
    // 일식/월식 ±3일: 영향권
    score += 2.0;
  }

  return Math.round(score * 10) / 10;
}

// ============================================================
// 메인 점수 계산 함수
// ============================================================

export function calculateTotalScore(
  sajuInput: SajuScoreInput,
  astroInput: AstroScoreInput
): ScoreResult {
  // 사주 세부 점수 (기존)
  const daeunScore = calculateDaeunScore(sajuInput.daeun);
  const seunScore = calculateSeunScore(sajuInput.seun);
  const wolunScore = calculateWolunScore(sajuInput.wolun);
  const iljinScore = calculateIljinScore(sajuInput.iljin);
  const yongsinScore = calculateYongsinScore(sajuInput.yongsin);

  // 점성술 세부 점수 (기존)
  const transitSunScore = calculateTransitSunScore(astroInput.transitSun);
  const transitMoonScore = calculateTransitMoonScore(astroInput.transitMoon);
  const majorPlanetsScore = calculateMajorPlanetsScore(astroInput.majorPlanets);
  const lunarPhaseScore = calculateLunarPhaseScore(astroInput.lunarPhase);
  const solarReturnScore = calculateSolarReturnScore(astroInput.solarReturn);

  // 점성술 추가 점수 (외행성, 특수점, 일식/월식)
  const outerPlanetsScore = calculateOuterPlanetsScore(astroInput.outerPlanets);
  const specialPointsScore = calculateSpecialPointsScore(astroInput.specialPoints);
  const eclipseScore = calculateEclipseScore(astroInput.eclipse);

  // 합산 (추가 요소는 보정값으로 적용)
  const sajuScore = daeunScore + seunScore + wolunScore + iljinScore + yongsinScore;
  const baseAstroScore = transitSunScore + transitMoonScore + majorPlanetsScore + lunarPhaseScore + solarReturnScore;
  // 추가 점수는 보정으로 적용 (최대 ±10점)
  const astroBonus = Math.max(-10, Math.min(10, outerPlanetsScore + specialPointsScore + eclipseScore));
  const astroScore = Math.max(0, Math.min(50, baseAstroScore + astroBonus));

  // 긍정/부정 판단 (v7: 명확한 기준값 사용)
  // 긍정: 25점 초과 (50점 중 상위 50%)
  // 부정: 20점 미만 (50점 중 하위 40%)
  // 중립: 20~25점 (회색지대)
  const positiveThreshold = CROSS_VERIFICATION_SCORES.positiveThreshold ?? 25;
  const negativeThreshold = CROSS_VERIFICATION_SCORES.negativeThreshold ?? 20;

  const sajuPositive = sajuScore > positiveThreshold;
  const sajuNegative = sajuScore < negativeThreshold;
  const sajuNeutral = !sajuPositive && !sajuNegative;  // 20~25점 구간

  const astroPositive = astroScore > positiveThreshold;
  const astroNegative = astroScore < negativeThreshold;
  const astroNeutral = !astroPositive && !astroNegative;  // 20~25점 구간

  // 교차검증 보너스 (v7: 중립 구간 처리 개선)
  let crossBonus = 0;
  const crossVerified = sajuPositive && astroPositive;

  if (sajuPositive && astroPositive) {
    // 둘 다 긍정: 최대 보너스
    crossBonus = CROSS_VERIFICATION_SCORES.bothPositive;
  } else if (sajuNegative && astroNegative) {
    // 둘 다 부정: 페널티
    crossBonus = CROSS_VERIFICATION_SCORES.bothNegative;
  } else if ((sajuPositive && astroNeutral) || (sajuNeutral && astroPositive)) {
    // 하나 긍정, 하나 중립: 작은 보너스
    crossBonus = 2;
  } else if ((sajuNegative && astroNeutral) || (sajuNeutral && astroNegative)) {
    // 하나 부정, 하나 중립: 작은 페널티
    crossBonus = -1;
  }
  // 나머지 경우 (혼합 또는 둘 다 중립): 0

  // 최종 점수 (0-100 범위)
  const totalScore = Math.round(Math.max(0, Math.min(100, sajuScore + astroScore + crossBonus)));

  // 등급 결정 (5등급 시스템 - v3 분포 개선)
  // Grade 0: 최고 (68+) ~5-8%, Grade 1: 좋음 (62+) ~15%
  // Grade 2: 보통 (42+) ~50%, Grade 3: 안좋음 (28+) ~25%, Grade 4: 최악 (<28) ~5%
  let grade: ImportanceGrade;
  if (totalScore >= GRADE_THRESHOLDS.grade0) {
    grade = 0;
  } else if (totalScore >= GRADE_THRESHOLDS.grade1) {
    grade = 1;
  } else if (totalScore >= GRADE_THRESHOLDS.grade2) {
    grade = 2;
  } else if (totalScore >= GRADE_THRESHOLDS.grade3) {
    grade = 3;
  } else {
    grade = 4; // 최악
  }

  return {
    sajuScore: Math.round(sajuScore * 10) / 10,
    astroScore: Math.round(astroScore * 10) / 10,
    crossBonus,
    totalScore,
    grade,
    breakdown: {
      daeun: daeunScore,
      seun: seunScore,
      wolun: wolunScore,
      iljin: iljinScore,
      yongsin: yongsinScore,
      transitSun: transitSunScore,
      transitMoon: transitMoonScore,
      majorPlanets: majorPlanetsScore,
      lunarPhase: lunarPhaseScore,
      solarReturn: solarReturnScore,
    },
    sajuPositive,
    sajuNegative,
    astroPositive,
    astroNegative,
    crossVerified,
  };
}

// ============================================================
// 테스트용 샘플 데이터
// ============================================================

export const SAMPLE_INPUTS = {
  // 천운의 날 (모든 요소 최상)
  bestDay: {
    saju: {
      daeun: { sibsin: 'inseong', hasYukhap: true },
      seun: { sibsin: 'jaeseong', hasSamhapPositive: true },
      wolun: { sibsin: 'inseong', hasYukhap: true },
      iljin: {
        sibsin: 'jeongyin',
        hasSamhapPositive: true,
        hasYukhap: true,
        hasCheoneulGwiin: true,
        hasGeonrok: true,
        hasSonEomneun: true,
        // 추가 길신
        hasTaegukGwiin: true,
        hasCheondeokGwiin: true,
        hasWoldeokGwiin: true,
      },
      yongsin: { hasPrimaryMatch: true, hasSecondaryMatch: true, geokgukFavor: true, strengthBalance: true },
    },
    astro: {
      transitSun: { elementRelation: 'same' as const },
      transitMoon: { elementRelation: 'generatedBy' as const },
      majorPlanets: {
        jupiter: { aspect: 'trine' },
        venus: { aspect: 'conjunction' },
      },
      // 추가 요소: 외행성, 특수점, 일식
      outerPlanets: {
        uranus: { aspect: 'trine' },
        pluto: { aspect: 'sextile' },
      },
      specialPoints: {
        northNode: { aspect: 'conjunction' },  // 운명적 날
        chiron: { aspect: 'trine' },
      },
      eclipse: {
        isEclipseDay: true,
        eclipseType: 'solar',
      },
      lunarPhase: 'fullMoon' as const,
      solarReturn: { daysFromBirthday: 0 },
    },
  },
  // 나쁜 날 (부정 요소 많음)
  worstDay: {
    saju: {
      daeun: { hasChung: true, hasGwansal: true },
      seun: { hasChung: true, isSamjaeYear: true },
      wolun: { hasChung: true },
      iljin: {
        sibsin: 'pyeonwan',
        hasChung: true,
        hasXing: true,
        // 추가 흉신
        hasGongmang: true,
        hasWonjin: true,
        hasBackho: true,
        hasGuimungwan: true,
      },
      yongsin: { hasKibsinMatch: true, geokgukAvoid: true },
    },
    astro: {
      transitSun: { elementRelation: 'controlledBy' as const },
      transitMoon: { elementRelation: 'controlledBy' as const, isVoidOfCourse: true },
      majorPlanets: {
        saturn: { aspect: 'square', isRetrograde: true },
        mercury: { aspect: 'square', isRetrograde: true },
        mars: { aspect: 'opposition', isRetrograde: true },
      },
      // 추가 부정 요소
      outerPlanets: {
        uranus: { aspect: 'square' },
        neptune: { aspect: 'opposition' },
        pluto: { aspect: 'square' },
      },
      specialPoints: {
        chiron: { aspect: 'square' },
        southNode: { aspect: 'conjunction' },
      },
      lunarPhase: 'lastQuarter' as const,
      solarReturn: { daysFromBirthday: 180 },
    },
  },
  // 평범한 날
  normalDay: {
    saju: {
      daeun: {},
      seun: { sibsin: 'bijeon' },
      wolun: {},
      iljin: { sibsin: 'bijeon' },
      yongsin: {},
    },
    astro: {
      transitSun: { elementRelation: 'generates' as const },
      transitMoon: {},
      majorPlanets: {},
      lunarPhase: 'waxingGibbous' as const,
      solarReturn: { daysFromBirthday: 100 },
    },
  },
};
