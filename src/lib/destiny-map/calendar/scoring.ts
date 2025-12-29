/**
 * Destiny Calendar Scoring Module
 * 체계적인 점수 계산 로직
 *
 * 설계 원칙:
 * 1. 사주 50점 + 점성술 50점 = 총 100점
 * 2. 각 카테고리 내 요소들은 정규화 후 합산
 * 3. 교차검증으로 최대 ±5점 보정
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
} from './scoring-config';

import type { ImportanceGrade } from './types';

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

function calculateDaeunScore(input: SajuScoreInput['daeun']): number {
  const maxScore = CATEGORY_MAX_SCORES.saju.daeun; // 5점
  let score = 2.5; // 기본 중간값

  // 긍정 요소 (영향력 증가)
  if (input.sibsin === 'inseong') score += 2.5;
  else if (input.sibsin === 'jaeseong') score += 2.2;
  else if (input.sibsin === 'bijeon') score += 1.5;
  else if (input.sibsin === 'siksang') score += 1.0;
  else if (input.sibsin === 'gwansal') score -= 2.0;

  if (input.hasYukhap) score += 1.2;
  if (input.hasSamhapPositive) score += 1.8;

  // 부정 요소 (영향력 증가)
  if (input.hasChung) score -= 2.5;
  if (input.hasGwansal) score -= 2.2;
  if (input.hasSamhapNegative) score -= 1.5;

  return Math.round(Math.max(0, Math.min(maxScore, score)) * 10) / 10;
}

function calculateSeunScore(input: SajuScoreInput['seun']): number {
  const maxScore = CATEGORY_MAX_SCORES.saju.seun; // 10점
  let score = 5.0; // 기본 중간값

  // 긍정 요소 (영향력 증가)
  if (input.sibsin === 'inseong') score += 5.0;
  else if (input.sibsin === 'jaeseong') score += 4.5;
  else if (input.sibsin === 'bijeon') score += 3.5;
  else if (input.sibsin === 'siksang') score += 3.0;
  else if (input.sibsin === 'gwansal') score -= 5.0;

  if (input.hasYukhap) score += 3.5;
  if (input.hasSamhapPositive) score += 4.5;

  // 부정 요소 (영향력 대폭 증가)
  if (input.hasChung) score -= 7.0;
  if (input.hasGwansal) score -= 6.0;
  if (input.hasSamhapNegative) score -= 5.0;
  if (input.isSamjaeYear) score -= 5.0;

  return Math.round(Math.max(0, Math.min(maxScore, score)) * 10) / 10;
}

function calculateWolunScore(input: SajuScoreInput['wolun']): number {
  const maxScore = CATEGORY_MAX_SCORES.saju.wolun; // 10점
  let score = 5.0; // 기본 중간값

  // 긍정 요소 (영향력 증가)
  if (input.sibsin === 'inseong') score += 4.5;
  else if (input.sibsin === 'jaeseong') score += 4.0;
  else if (input.sibsin === 'bijeon') score += 3.0;
  else if (input.sibsin === 'siksang') score += 2.5;
  else if (input.sibsin === 'gwansal') score -= 4.0;

  if (input.hasYukhap) score += 3.5;
  if (input.hasSamhapPositive) score += 4.0;

  // 부정 요소 (영향력 대폭 증가)
  if (input.hasChung) score -= 6.5;
  if (input.hasGwansal) score -= 6.0;
  if (input.hasSamhapNegative) score -= 5.0;

  return Math.round(Math.max(0, Math.min(maxScore, score)) * 10) / 10;
}

function calculateIljinScore(input: SajuScoreInput['iljin']): number {
  const maxScore = CATEGORY_MAX_SCORES.saju.iljin; // 20점
  let score = 10.0; // 기본 중간값

  // 십신 점수 (더 극단적인 값으로 범위 확대)
  const sipsinScores: Record<string, number> = {
    jeongyin: 10.0,   // 정인: 최고
    pyeonyin: 6.0,    // 편인: 좋음
    jeongchaae: 9.0,  // 정재: 매우 좋음
    pyeonchaae: 5.0,  // 편재: 약간 좋음
    sikshin: 7.0,     // 식신: 좋음
    sanggwan: -6.0,   // 상관: 나쁨
    jeongwan: 8.0,    // 정관: 좋음
    pyeonwan: -8.0,   // 편관: 매우 나쁨
    bijeon: 3.0,      // 비견: 약간 좋음
    gyeobjae: -5.0,   // 겁재: 나쁨
  };
  if (input.sibsin && input.sibsin in sipsinScores) {
    score += sipsinScores[input.sibsin];
  }

  // 지지 상호작용 (영향력 대폭 증가)
  if (input.hasYukhap) score += 7.0;
  if (input.hasSamhapPositive) score += 8.0;
  if (input.hasSamhapNegative) score -= 8.0;
  if (input.hasChung) score -= 12.0;  // 충: 가장 나쁨
  if (input.hasXing) score -= 10.0;   // 형: 매우 나쁨
  if (input.hasHai) score -= 7.0;     // 해: 나쁨

  // 특수 길일 (큰 보너스)
  if (input.hasCheoneulGwiin) score += 10.0;
  if (input.hasGeonrok) score += 7.0;
  if (input.hasSonEomneun) score += 6.0;
  if (input.hasYeokma) score += 4.0;
  if (input.hasDohwa) score += 3.0;

  // 추가 신살 - 길신 (보너스)
  if (input.hasTaegukGwiin) score += 8.0;       // 태극귀인: 큰 행운
  if (input.hasCheondeokGwiin) score += 6.0;   // 천덕귀인
  if (input.hasWoldeokGwiin) score += 5.0;     // 월덕귀인
  if (input.hasHwagae) score += 3.0;           // 화개: 예술/영적

  // 추가 신살 - 흉신 (페널티)
  if (input.hasGongmang) score -= 8.0;         // 공망: 허무, 공허
  if (input.hasWonjin) score -= 7.0;           // 원진: 원망, 갈등
  if (input.hasYangin) score -= 6.0;           // 양인: 위험, 사고
  if (input.hasGoegang) score -= 5.0;          // 괴강: 극단적
  if (input.hasBackho) score -= 6.0;           // 백호: 사고, 수술
  if (input.hasGuimungwan) score -= 7.0;       // 귀문관: 정신 혼란

  return Math.round(Math.max(0, Math.min(maxScore, score)) * 10) / 10;
}

function calculateYongsinScore(input: SajuScoreInput['yongsin']): number {
  const maxScore = CATEGORY_MAX_SCORES.saju.yongsin; // 5점
  let score = 2.5; // 기본 중간값

  // 긍정 요소 (영향력 증가)
  if (input.hasPrimaryMatch) score += 2.5;  // 용신 일치
  if (input.hasSecondaryMatch) score += 1.2;
  if (input.hasBranchMatch) score += 1.5;
  if (input.hasSupport) score += 1.0;

  // 부정 요소 (영향력 증가)
  if (input.hasKibsinMatch) score -= 3.0;   // 기신 일치
  if (input.hasKibsinBranch) score -= 2.0;
  if (input.hasHarm) score -= 1.5;

  // 격국 (영향력 증가)
  if (input.geokgukFavor) score += 1.5;
  if (input.geokgukAvoid) score -= 1.5;
  if (input.strengthBalance) score += 0.8;
  if (input.strengthImbalance) score -= 0.8;

  return Math.round(Math.max(0, Math.min(maxScore, score)) * 10) / 10;
}

// ============================================================
// 점성술 점수 계산
// ============================================================

function calculateTransitSunScore(input: AstroScoreInput['transitSun']): number {
  const maxScore = CATEGORY_MAX_SCORES.astro.transitSun; // 10점

  // 오행 관계 (절대값 점수) - 관계가 없으면 중간값 5.0
  // 극단적 점수로 범위 확대
  const relationScores: Record<string, number> = {
    same: 10.0,         // 같은 원소: 최고
    generatedBy: 8.5,   // 생해주는 관계: 좋음
    generates: 4.0,     // 내가 생하는 관계: 보통
    controlledBy: 0.5,  // 극당하는 관계: 매우 나쁨
    controls: 6.5,      // 내가 극하는 관계: 약간 좋음
  };

  let score = 5.0; // 기본 중간값
  if (input.elementRelation && input.elementRelation in relationScores) {
    score = relationScores[input.elementRelation];
  }

  return Math.round(Math.max(0, Math.min(maxScore, score)) * 10) / 10;
}

function calculateTransitMoonScore(input: AstroScoreInput['transitMoon']): number {
  const maxScore = CATEGORY_MAX_SCORES.astro.transitMoon; // 10점

  // 오행 관계 (절대값 점수) - 관계가 없으면 중간값 5.0
  // 극단적 점수로 범위 확대
  const relationScores: Record<string, number> = {
    same: 10.0,
    generatedBy: 8.0,
    generates: 4.0,
    controlledBy: 1.0,  // 매우 나쁨
    controls: 5.5,
  };

  let score = 5.0; // 기본 중간값
  if (input.elementRelation && input.elementRelation in relationScores) {
    score = relationScores[input.elementRelation];
  }

  // Void of Course 페널티 (영향력 증가)
  if (input.isVoidOfCourse) score -= 4.0;

  return Math.round(Math.max(0, Math.min(maxScore, score)) * 10) / 10;
}

function calculateMajorPlanetsScore(input: AstroScoreInput['majorPlanets']): number {
  const maxScore = CATEGORY_MAX_SCORES.astro.majorPlanets; // 15점
  let score = 7.5; // 기본 중간값

  // 어스펙트별 보정 점수 (영향력 대폭 증가)
  const aspectScores: Record<string, number> = {
    conjunction: 4.5,   // 합: 강력함
    trine: 5.0,         // 삼분: 가장 좋음
    sextile: 3.0,       // 육분: 좋음
    square: -4.0,       // 사분: 긴장
    opposition: -3.5,   // 충: 균형 필요
  };

  // 행성별 가중치
  const planetWeights: Record<string, number> = {
    mercury: 0.9,   // 소통
    venus: 1.1,     // 사랑/재물
    mars: 1.0,      // 행동
    jupiter: 1.4,   // 행운 (가장 중요)
    saturn: 1.1,    // 시련/성장
  };

  // 역행 페널티 (영향력 대폭 증가)
  const retrogradePenalties: Record<string, number> = {
    mercury: -4.0,  // 수성 역행: 소통 주의
    venus: -3.5,    // 금성 역행: 관계 주의
    mars: -3.0,     // 화성 역행: 행동 지연
    jupiter: -2.0,
    saturn: -2.0,
  };

  const planets: (keyof typeof input)[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

  for (const planet of planets) {
    const planetData = input[planet];
    if (!planetData) continue;

    const weight = planetWeights[planet] || 1.0;

    // 어스펙트 점수 (합산)
    if (planetData.aspect && planetData.aspect in aspectScores) {
      score += aspectScores[planetData.aspect] * weight;
    }

    // 역행 페널티
    if (planetData.isRetrograde) {
      score += retrogradePenalties[planet] || -1.0;
    }
  }

  return Math.round(Math.max(0, Math.min(maxScore, score)) * 10) / 10;
}

function calculateLunarPhaseScore(phase?: AstroScoreInput['lunarPhase']): number {
  const maxScore = CATEGORY_MAX_SCORES.astro.lunarPhase; // 10점

  if (!phase) return 5.0; // 기본 중간값

  // 달 위상별 점수 (절대값) - 범위 확대
  const phaseScores: Record<string, number> = {
    newMoon: 7.5,         // 신월: 새로운 시작
    waxingCrescent: 5.5,  // 초승달: 성장 시작
    firstQuarter: 3.0,    // 상현달: 긴장 (낮춤)
    waxingGibbous: 7.0,   // 상현망: 성숙
    fullMoon: 10.0,       // 보름달: 완성 (최고)
    waningGibbous: 5.0,   // 하현망: 수확
    lastQuarter: 2.5,     // 하현달: 반성 (낮춤)
    waningCrescent: 3.5,  // 그믐달: 휴식 (낮춤)
  };

  const score = phaseScores[phase] ?? 5.0;
  return Math.round(Math.max(0, Math.min(maxScore, score)) * 10) / 10;
}

function calculateSolarReturnScore(input: AstroScoreInput['solarReturn']): number {
  const maxScore = CATEGORY_MAX_SCORES.astro.solarReturn; // 5점
  let score = 2.5; // 기본 중간값

  // 생일 근처 보너스
  const days = input.daysFromBirthday ?? 365;
  if (days === 0) score += 2.5;       // 생일 당일: 최대 보너스
  else if (days <= 1) score += 2.0;   // ±1일
  else if (days <= 3) score += 1.2;   // ±3일
  else if (days <= 7) score += 0.6;   // ±7일

  // Progression
  if (input.progressionSupport) score += 1.0;
  if (input.progressionChallenge) score -= 0.8;

  return Math.round(Math.max(0, Math.min(maxScore, score)) * 10) / 10;
}

/**
 * 외행성 점수 계산 (추가 보정)
 * 외행성은 세대적 영향이라 개인 일일운에 미치는 영향은 작지만,
 * 네이탈 차트와 어스펙트가 있을 때 영향력 발생
 */
function calculateOuterPlanetsScore(input?: AstroScoreInput['outerPlanets']): number {
  if (!input) return 0;

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
  if (!input) return 0;

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
  if (!input) return 0;

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

  // 긍정/부정 판단 (중앙값 기준)
  const sajuPositive = sajuScore > 25;
  const sajuNegative = sajuScore < 20;
  const astroPositive = astroScore > 25;
  const astroNegative = astroScore < 20;

  // 교차검증 보너스
  let crossBonus = 0;
  const crossVerified = sajuPositive && astroPositive;

  if (sajuPositive && astroPositive) {
    crossBonus = CROSS_VERIFICATION_SCORES.bothPositive;
  } else if (sajuNegative && astroNegative) {
    crossBonus = CROSS_VERIFICATION_SCORES.bothNegative;
  }

  // 최종 점수 (0-100 범위)
  const totalScore = Math.round(Math.max(0, Math.min(100, sajuScore + astroScore + crossBonus)));

  // 등급 결정
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
    grade = 4;
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
