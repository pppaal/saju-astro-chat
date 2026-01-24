/**
 * Saju Temporal Scoring Module (사주 시간 운세 점수 계산)
 *
 * 사주의 시간 흐름에 따른 운세 점수 계산
 * - 세운(歲運): 연간 운세
 * - 월운(月運): 월간 운세
 * - 일진(日辰): 일별 운세
 * - 대운(大運): 10년 주기 운세
 *
 * 기본 원리:
 * 각 시간대별로 일간(일주의 천간)과의 오행 관계를 분석하여 점수 산출
 * 상생(生) > 동행(比) > 상극(剋) 순으로 길흉을 판단
 *
 * @module saju-temporal-scoring
 * @version 1.0.0
 */

import { logger } from '@/lib/logger';
import {
  ELEMENT_RELATIONS,
  STEMS,
  BRANCHES,
  STEM_TO_ELEMENT,
  BRANCH_TO_ELEMENT,
  SAMHAP,
  YUKHAP,
  CHUNG,
  XING,
  HAI,
} from './constants';
import { getSipsin, normalizeElement } from './utils';

// ============================================================
// Type Definitions / 타입 정의
// ============================================================

/**
 * Ganzhi (천간지지) 계산 결과
 */
export interface GanzhiResult {
  /** 천간 (天干): 갑을병정무기경신임계 중 하나 */
  stem: string;
  /** 지지 (地支): 자축인묘진사오미신유술해 중 하나 */
  branch: string;
  /** 천간의 오행 (木火土金水) */
  stemElement: string;
  /** 지지의 오행 (木火土金水) */
  branchElement: string;
}

/**
 * 대운 주기 정보
 */
export interface DaeunCycle {
  /** 대운 시작 나이 */
  age: number;
  /** 대운의 천간 */
  heavenlyStem: string;
  /** 대운의 지지 */
  earthlyBranch: string;
  /** 십신 정보 */
  sibsin?: {
    /** 천간 십신 */
    cheon: string;
    /** 지지 십신 */
    ji: string;
  };
}

/**
 * 시간 운세 점수 결과
 */
export interface TemporalScoreResult {
  /** 총 점수 (-50 ~ +100) */
  score: number;
  /** 영향을 미친 요소 키 배열 */
  factorKeys: string[];
  /** 긍정적 요소 있음 여부 */
  positive: boolean;
  /** 부정적 요소 있음 여부 */
  negative: boolean;
}

/**
 * 세운 점수 결과 (연간 운세)
 */
export interface SeunScoreResult extends TemporalScoreResult {}

/**
 * 월운 점수 결과 (월간 운세)
 */
export interface WolunScoreResult extends TemporalScoreResult {}

/**
 * 일진 점수 결과 (일별 운세)
 */
export interface IljinScoreResult extends TemporalScoreResult {
  /** 해당 날짜의 천간지지 */
  ganzhi: GanzhiResult;
}

/**
 * 대운 점수 결과 (10년 주기 운세)
 */
export interface DaeunScoreResult extends TemporalScoreResult {
  /** 현재 대운 주기 정보 */
  currentDaeun: DaeunCycle | null;
}

// ============================================================
// 세운(歲運) - 연간 운세 계산 / Yearly Luck
// ============================================================

/**
 * 해당 연도의 천간지지(年干支) 계산
 *
 * 기준: 1984년은 갑자(甲子) 년
 * 60년 주기로 반복되는 천간지지 순환
 *
 * 예시:
 * ```typescript
 * const year2024 = getYearGanzhi(2024);
 * // { stem: '甲', branch: '辰', stemElement: 'wood', branchElement: 'earth' }
 * ```
 *
 * @param year - 연도 (양력 기준)
 * @returns 연의 천간지지 및 오행 정보
 *
 * 세운(歲運)은 "世運"의 음독으로, 한 해 동안의 전체적인 운의 흐름을 의미합니다.
 * 일간과 연간의 관계를 통해 그 해의 운세를 판단합니다.
 */
export function getYearGanzhi(year: number): GanzhiResult {
  try {
    // 1984년이 갑자(甲子)인 기준점
    const offset = (year - 1984) % 60;
    const index = offset < 0 ? offset + 60 : offset;
    const stemIndex = index % 10;
    const branchIndex = index % 12;

    const stem = STEMS[stemIndex];
    const branch = BRANCHES[branchIndex];

    if (!stem || !branch) {
      throw new Error(`Invalid ganzhi indices: stem=${stemIndex}, branch=${branchIndex}`);
    }

    return {
      stem,
      branch,
      stemElement: STEM_TO_ELEMENT[stem] || 'wood',
      branchElement: BRANCH_TO_ELEMENT[branch] || 'earth',
    };
  } catch (error) {
    logger.error('Error calculating year ganzhi:', { error });
    return {
      stem: '甲',
      branch: '子',
      stemElement: 'wood',
      branchElement: 'water',
    };
  }
}

/**
 * 세운 점수 계산 - 일간과 세운(연간)의 관계 분석
 *
 * 계산 방식:
 * 1. 세운 천간과 일간의 오행 관계 (-12 ~ +12)
 * 2. 세운 지지와 일지의 오행 관계 (-18 ~ +15)
 * 3. 삼합(三合), 육합(六合), 충(沖) 등 지지 상호작용
 *
 * 점수 범위: -30 ~ +35
 * - 양수(길): 운이 도움이 되는 해
 * - 음수(흉): 주의가 필요한 해
 *
 * @param dayMasterElement - 일간의 오행 (목/화/토/금/수)
 * @param dayBranch - 일지 (자/축/인/묘/진/사/오/미/신/유/술/해)
 * @param year - 해당 연도
 * @returns 세운 점수 및 영향 요소
 *
 * 예시:
 * ```typescript
 * const seunScore = calculateSeunScore('wood', '午', 2024);
 * // { score: 8, factorKeys: ['seunBijeon'], positive: true, negative: false }
 * ```
 */
export function calculateSeunScore(
  dayMasterElement: string,
  dayBranch: string | undefined,
  year: number
): SeunScoreResult {
  try {
    const yearGanzhi = getYearGanzhi(year);
    const relations = ELEMENT_RELATIONS[dayMasterElement];

    let score = 0;
    const factorKeys: string[] = [];
    let positive = false;
    let negative = false;

    if (!relations) {
      return { score: 0, factorKeys: [], positive: false, negative: false };
    }

    // 1. 세운 천간과 일간 관계 분석
    if (yearGanzhi.stemElement === dayMasterElement) {
      // 비화(比火): 같은 오행 - 힘 보충
      score += 8;
      factorKeys.push('seunBijeon');
      positive = true;
    } else if (yearGanzhi.stemElement === relations.generatedBy) {
      // 인성(印星): 일간을 생해주는 오행 - 도움받는 해
      score += 12;
      factorKeys.push('seunInseong');
      positive = true;
    } else if (yearGanzhi.stemElement === relations.controls) {
      // 재성(財星): 일간이 극하는 오행 - 재물 기회
      score += 10;
      factorKeys.push('seunJaeseong');
      positive = true;
    } else if (yearGanzhi.stemElement === relations.generates) {
      // 식상(食傷): 일간이 생해주는 오행 - 창작/표현
      score += 5;
      factorKeys.push('seunSiksang');
    } else if (yearGanzhi.stemElement === relations.controlledBy) {
      // 관살(官殺): 일간을 극하는 오행 - 압박의 해
      score -= 12;
      factorKeys.push('seunGwansal');
      negative = true;
    }

    // 2. 세운 지지와 일지 관계 분석
    if (dayBranch) {
      // 2-1. 삼합(三合) - 가장 강력한 조화
      for (const [element, branches] of Object.entries(SAMHAP)) {
        if (branches.includes(dayBranch) && branches.includes(yearGanzhi.branch)) {
          if (element === dayMasterElement || element === relations.generatedBy) {
            score += 15;
            factorKeys.push('seunSamhap');
            positive = true;
          } else if (element === relations.controlledBy) {
            score -= 10;
            factorKeys.push('seunSamhapNegative');
            negative = true;
          }
        }
      }

      // 2-2. 육합(六合) - 인연, 화합
      if (YUKHAP[dayBranch] === yearGanzhi.branch) {
        score += 12;
        factorKeys.push('seunYukhap');
        positive = true;
      }

      // 2-3. 충(沖) - 충돌, 변화
      if (CHUNG[dayBranch] === yearGanzhi.branch) {
        score -= 18;
        factorKeys.push('seunChung');
        negative = true;
      }
    }

    return { score, factorKeys, positive, negative };
  } catch (error) {
    logger.error('Error calculating seun score:', { error });
    return { score: 0, factorKeys: [], positive: false, negative: false };
  }
}

// ============================================================
// 월운(月運) - 월간 운세 계산 / Monthly Luck
// ============================================================

/**
 * 해당 월의 천간지지(月干支) 계산
 *
 * 월지는 절입 기준 12개월로 고정:
 * - 2월: 寅, 3월: 卯, 4월: 辰, ... 1월: 丑
 *
 * 월간은 연간(年干)에 따라 결정되는 규칙:
 * - 갑기토(甲己): 丙부터 시작
 * - 을경금(乙庚): 戊부터 시작
 * - 병신수(丙辛): 庚부터 시작
 * - 정임목(丁壬): 壬부터 시작
 * - 무계화(戊癸): 甲부터 시작
 *
 * @param year - 연도 (양력 기준)
 * @param month - 월 (1~12, 양력 기준)
 * @returns 월의 천간지지 및 오행 정보
 *
 * 예시:
 * ```typescript
 * const month202401 = getMonthGanzhi(2024, 1);
 * // { stem: '庚', branch: '寅', stemElement: 'metal', branchElement: 'wood' }
 * ```
 */
export function getMonthGanzhi(year: number, month: number): GanzhiResult {
  try {
    // 1단계: 월지 결정 (절입 기반)
    const branchOrder = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]; // 寅부터 시작
    const branchIndex = branchOrder[(month - 1) % 12];
    const branch = BRANCHES[branchIndex];

    if (!branch) {
      throw new Error(`Invalid branch index: ${branchIndex}`);
    }

    // 2단계: 월간 결정 (연간 기반)
    const yearGanzhi = getYearGanzhi(year);

    // 월간 천간의 시작점 규칙 (연간에 따라)
    const monthStemStart: Record<string, number> = {
      '甲': 2, '己': 2,  // 丙부터
      '乙': 4, '庚': 4,  // 戊부터
      '丙': 6, '辛': 6,  // 庚부터
      '丁': 8, '壬': 8,  // 壬부터
      '戊': 0, '癸': 0,  // 甲부터
    };

    const startStemIndex = monthStemStart[yearGanzhi.stem] || 0;
    const monthOffset = (month - 1) % 12;
    const stemIndex = (startStemIndex + monthOffset) % 10;
    const stem = STEMS[stemIndex];

    if (!stem) {
      throw new Error(`Invalid stem index: ${stemIndex}`);
    }

    return {
      stem,
      branch,
      stemElement: STEM_TO_ELEMENT[stem] || 'wood',
      branchElement: BRANCH_TO_ELEMENT[branch] || 'earth',
    };
  } catch (error) {
    logger.error('Error calculating month ganzhi:', { error });
    return {
      stem: '甲',
      branch: '寅',
      stemElement: 'wood',
      branchElement: 'wood',
    };
  }
}

/**
 * 월운 점수 계산 - 일간과 월운(월간)의 관계 분석
 *
 * 세운보다 영향력이 작으나 월 단위의 실질적 운세 변화를 나타냄
 * 점수 범위: -20 ~ +25
 *
 * @param dayMasterElement - 일간의 오행
 * @param dayBranch - 일지
 * @param year - 연도
 * @param month - 월 (1~12)
 * @returns 월운 점수 및 영향 요소
 *
 * 예시:
 * ```typescript
 * const wolunScore = calculateWolunScore('fire', '午', 2024, 3);
 * // { score: 8, factorKeys: ['wolunInseong'], positive: true, negative: false }
 * ```
 */
export function calculateWolunScore(
  dayMasterElement: string,
  dayBranch: string | undefined,
  year: number,
  month: number
): WolunScoreResult {
  try {
    const monthGanzhi = getMonthGanzhi(year, month);
    const relations = ELEMENT_RELATIONS[dayMasterElement];

    let score = 0;
    const factorKeys: string[] = [];
    let positive = false;
    let negative = false;

    if (!relations) {
      return { score: 0, factorKeys: [], positive: false, negative: false };
    }

    // 1. 월운 천간과 일간 관계
    if (monthGanzhi.stemElement === dayMasterElement) {
      score += 5;
      factorKeys.push('wolunBijeon');
      positive = true;
    } else if (monthGanzhi.stemElement === relations.generatedBy) {
      score += 8;
      factorKeys.push('wolunInseong');
      positive = true;
    } else if (monthGanzhi.stemElement === relations.controls) {
      score += 7;
      factorKeys.push('wolunJaeseong');
      positive = true;
    } else if (monthGanzhi.stemElement === relations.generates) {
      score += 3;
      factorKeys.push('wolunSiksang');
    } else if (monthGanzhi.stemElement === relations.controlledBy) {
      score -= 8;
      factorKeys.push('wolunGwansal');
      negative = true;
    }

    // 2. 월운 지지와 일지 관계
    if (dayBranch) {
      // 삼합
      for (const [element, branches] of Object.entries(SAMHAP)) {
        if (branches.includes(dayBranch) && branches.includes(monthGanzhi.branch)) {
          if (element === dayMasterElement || element === relations.generatedBy) {
            score += 10;
            factorKeys.push('wolunSamhap');
            positive = true;
          }
        }
      }

      // 육합
      if (YUKHAP[dayBranch] === monthGanzhi.branch) {
        score += 8;
        factorKeys.push('wolunYukhap');
        positive = true;
      }

      // 충
      if (CHUNG[dayBranch] === monthGanzhi.branch) {
        score -= 12;
        factorKeys.push('wolunChung');
        negative = true;
      }
    }

    return { score, factorKeys, positive, negative };
  } catch (error) {
    logger.error('Error calculating wolun score:', { error });
    return { score: 0, factorKeys: [], positive: false, negative: false };
  }
}

// ============================================================
// 일진(日辰) - 일별 운세 계산 / Daily Luck
// ============================================================

/**
 * 일진 점수 계산 - 당일 천간지지와 일간/일지 관계 분석
 *
 * 가장 상세한 일일 단위의 운세 분석
 * 십신 분석을 포함하여 더욱 세밀한 해석 제공
 *
 * 계산 요소:
 * 1. 천간 관계: 비견/인성/재성/식상/관살
 * 2. 지지 관계: 삼합/육합/충/형/해
 * 3. 십신 분석: 10가지 인간관계 패턴
 *
 * 점수 범위: -60 ~ +50
 *
 * @param dayMasterElement - 일간의 오행
 * @param dayMasterStem - 일간의 천간
 * @param dayBranch - 일지
 * @param targetDate - 분석 대상 날짜
 * @returns 일진 점수 및 해당 날짜의 천간지지
 *
 * 예시:
 * ```typescript
 * const iljinScore = calculateIljinScore('water', '癸', '卯', new Date(2024, 0, 15));
 * // {
 * //   score: 12,
 * //   factorKeys: ['iljinInseong', 'iljinSamhap'],
 * //   positive: true,
 * //   negative: false,
 * //   ganzhi: { stem: '甲', ... }
 * // }
 * ```
 */
export function calculateIljinScore(
  dayMasterElement: string,
  dayMasterStem: string,
  dayBranch: string | undefined,
  ganzhi: GanzhiResult
): IljinScoreResult {
  try {
    const relations = ELEMENT_RELATIONS[dayMasterElement];

    let score = 0;
    const factorKeys: string[] = [];
    let positive = false;
    let negative = false;

    if (!relations) {
      return {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
        ganzhi,
      };
    }

    // === 1. 일진 천간(天干)과 일간 관계 ===
    const iljinStemElement = ganzhi.stemElement;

    if (iljinStemElement === dayMasterElement) {
      // 비견: 자기 힘 강화, 경쟁도 있음
      score += 8;
      factorKeys.push('iljinBijeon');
      positive = true;
    } else if (iljinStemElement === relations.generatedBy) {
      // 인성: 도움받는 날
      score += 12;
      factorKeys.push('iljinInseong');
      positive = true;
    } else if (iljinStemElement === relations.controls) {
      // 재성: 재물운 좋은 날
      score += 10;
      factorKeys.push('iljinJaeseong');
      positive = true;
    } else if (iljinStemElement === relations.generates) {
      // 식상: 창작/표현의 날
      score += 5;
      factorKeys.push('iljinSiksang');
    } else if (iljinStemElement === relations.controlledBy) {
      // 관살: 압박의 날
      score -= 10;
      factorKeys.push('iljinGwansal');
      negative = true;
    }

    // === 2. 일진 지지(地支)와 일지 관계 ===
    if (dayBranch) {
      const iljinBranch = ganzhi.branch;

      // 삼합: 가장 강력한 조화
      for (const [element, branches] of Object.entries(SAMHAP)) {
        if (branches.includes(dayBranch) && branches.includes(iljinBranch)) {
          if (element === dayMasterElement || element === relations.generatedBy) {
            score += 15;
            factorKeys.push('iljinSamhap');
            positive = true;
          } else if (element === relations.controlledBy) {
            score -= 8;
            factorKeys.push('iljinSamhapNegative');
            negative = true;
          }
          break;
        }
      }

      // 육합: 인연, 화합
      if (YUKHAP[dayBranch] === iljinBranch) {
        score += 12;
        factorKeys.push('iljinYukhap');
        positive = true;
      }

      // 충: 충돌, 변화
      if (CHUNG[dayBranch] === iljinBranch) {
        score -= 15;
        factorKeys.push('iljinChung');
        negative = true;
      }

      // 형: 형벌, 장애
      const xingTargets = XING[dayBranch];
      if (xingTargets && xingTargets.includes(iljinBranch)) {
        score -= 8;
        factorKeys.push('iljinXing');
        negative = true;
      }

      // 해: 해침, 방해
      if (HAI[dayBranch] === iljinBranch) {
        score -= 6;
        factorKeys.push('iljinHai');
        negative = true;
      }
    }

    // === 3. 십신(十神) 세부 분석 ===
    const sipsin = getSipsin(dayMasterStem, ganzhi.stem);
    if (sipsin) {
      factorKeys.push(`iljinSipsin_${sipsin}`);

      // 십신별 추가 점수
      switch (sipsin) {
        case '정재':
          score += 5;
          positive = true;
          break;
        case '편재':
          score += 3;
          break;
        case '정인':
          score += 6;
          positive = true;
          break;
        case '편인':
          score += 2;
          break;
        case '정관':
          score += 5;
          positive = true;
          break;
        case '편관':
          score -= 4;
          negative = true;
          break;
        case '상관':
          score -= 3;
          break;
        case '식신':
          score += 4;
          positive = true;
          break;
        case '비견':
          score += 2;
          break;
        case '겁재':
          score -= 2;
          break;
      }
    }

    return { score, factorKeys, positive, negative, ganzhi };
  } catch (error) {
    logger.error('Error calculating iljin score:', { error });
    return {
      score: 0,
      factorKeys: [],
      positive: false,
      negative: false,
      ganzhi,
    };
  }
}

// ============================================================
// 대운(大運) - 10년 주기 운세 계산 / 10-Year Cycle
// ============================================================

/**
 * 현재 나이에 해당하는 대운 주기 찾기
 *
 * 대운은 출생 직후부터 시작되며, 보통 10년씩 진행됨
 * 한국식 나이(출생년 + 1)를 기준으로 계산
 *
 * @param daeunCycles - 대운 주기 배열 (age 기준으로 정렬됨)
 * @param birthYear - 출생 연도
 * @param targetYear - 분석 대상 연도
 * @returns 현재 대운 정보, 없으면 null
 *
 * 예시:
 * ```typescript
 * const daeun = getCurrentDaeun(cycles, 1990, 2024);
 * // 2024년 나이 35세 → 34~43세 대운 주기 반환
 * ```
 */
export function getCurrentDaeun(
  daeunCycles: DaeunCycle[] | undefined,
  birthYear: number | undefined,
  targetYear: number
): DaeunCycle | null {
  try {
    if (!daeunCycles || daeunCycles.length === 0 || !birthYear) {
      return null;
    }

    // 한국식 나이: 출생년 + 1
    const age = targetYear - birthYear + 1;

    // 현재 나이에 해당하는 대운 찾기
    // 내림차순으로 순회하여 첫 매칭되는 대운 반환
    for (let i = daeunCycles.length - 1; i >= 0; i--) {
      if (age >= daeunCycles[i].age) {
        return daeunCycles[i];
      }
    }

    // 첫 대운 이전인 경우 첫 번째 대운 반환
    return daeunCycles[0] || null;
  } catch (error) {
    logger.error('Error finding current daeun:', { error });
    return null;
  }
}

/**
 * 대운 점수 계산 - 현재 10년 대운과 일간 관계
 *
 * 대운은 사주 운세 중 가장 장기적이고 강한 영향을 미침
 * 세운/월운/일진보다 가중치가 높음
 *
 * 계산 요소:
 * 1. 대운 천간과 일간의 오행 관계 (영향력 가중: 1.5배)
 * 2. 대운 지지와 일지의 오행 관계
 * 3. 대운 십신 분석
 *
 * 점수 범위: -40 ~ +65
 *
 * @param dayMasterElement - 일간의 오행
 * @param dayBranch - 일지
 * @param daeunCycles - 대운 주기 배열
 * @param birthYear - 출생 연도
 * @param targetYear - 분석 대상 연도
 * @returns 대운 점수 및 현재 대운 정보
 *
 * 예시:
 * ```typescript
 * const daeunScore = calculateDaeunScore('fire', '午', cycles, 1990, 2024);
 * // {
 * //   score: 20,
 * //   factorKeys: ['daeunInseong', 'daeunSibsinJaeseong'],
 * //   positive: true,
 * //   negative: false,
 * //   currentDaeun: { age: 34, heavenlyStem: '甲', ... }
 * // }
 * ```
 */
export function calculateDaeunScore(
  dayMasterElement: string,
  dayBranch: string | undefined,
  daeunCycles: DaeunCycle[] | undefined,
  birthYear: number | undefined,
  targetYear: number
): DaeunScoreResult {
  try {
    const currentDaeun = getCurrentDaeun(daeunCycles, birthYear, targetYear);

    if (!currentDaeun) {
      return {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
        currentDaeun: null,
      };
    }

    const relations = ELEMENT_RELATIONS[dayMasterElement];
    if (!relations) {
      return {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
        currentDaeun,
      };
    }

    let score = 0;
    const factorKeys: string[] = [];
    let positive = false;
    let negative = false;

    const daeunStemElement = STEM_TO_ELEMENT[currentDaeun.heavenlyStem] || 'wood';

    // 1. 대운 천간과 일간 관계 (대운의 영향력이 크므로 점수 배수 높음)
    if (daeunStemElement === dayMasterElement) {
      score += 15; // 비화: 힘 보충
      factorKeys.push('daeunBijeon');
      positive = true;
    } else if (daeunStemElement === relations.generatedBy) {
      score += 20; // 인성: 도움받는 대운 (매우 좋음)
      factorKeys.push('daeunInseong');
      positive = true;
    } else if (daeunStemElement === relations.controls) {
      score += 18; // 재성: 재물운 대운
      factorKeys.push('daeunJaeseong');
      positive = true;
    } else if (daeunStemElement === relations.generates) {
      score += 10; // 식상: 창작/표현 대운
      factorKeys.push('daeunSiksang');
    } else if (daeunStemElement === relations.controlledBy) {
      score -= 15; // 관살: 압박의 대운
      factorKeys.push('daeunGwansal');
      negative = true;
    }

    // 2. 대운 지지와 일지 관계
    if (dayBranch) {
      // 삼합
      for (const [element, branches] of Object.entries(SAMHAP)) {
        if (branches.includes(dayBranch) && branches.includes(currentDaeun.earthlyBranch)) {
          if (element === dayMasterElement || element === relations.generatedBy) {
            score += 18;
            factorKeys.push('daeunSamhap');
            positive = true;
          } else if (element === relations.controlledBy) {
            score -= 12;
            factorKeys.push('daeunSamhapNegative');
            negative = true;
          }
          break;
        }
      }

      // 육합
      if (YUKHAP[dayBranch] === currentDaeun.earthlyBranch) {
        score += 15;
        factorKeys.push('daeunYukhap');
        positive = true;
      }

      // 충
      if (CHUNG[dayBranch] === currentDaeun.earthlyBranch) {
        score -= 20;
        factorKeys.push('daeunChung');
        negative = true;
      }
    }

    // 3. 대운 십신 분석 (sibsin 데이터 활용)
    if (currentDaeun.sibsin) {
      const { cheon, ji } = currentDaeun.sibsin;

      // 천간 십신
      if (cheon === '정인' || cheon === '편인') {
        score += 8;
        factorKeys.push('daeunSibsinInseong');
        positive = true;
      } else if (cheon === '정재' || cheon === '편재') {
        score += 10;
        factorKeys.push('daeunSibsinJaeseong');
        positive = true;
      } else if (cheon === '정관') {
        score += 8;
        factorKeys.push('daeunSibsinJeonggwan');
        positive = true;
      } else if (cheon === '편관') {
        score -= 5;
        factorKeys.push('daeunSibsinPyeongwan');
      } else if (cheon === '상관') {
        score -= 3;
        factorKeys.push('daeunSibsinSanggwan');
      }

      // 지지 십신
      if (ji === '정인' || ji === '편인') {
        score += 5;
      } else if (ji === '정재' || ji === '편재') {
        score += 7;
      } else if (ji === '정관') {
        score += 5;
      } else if (ji === '편관') {
        score -= 3;
      }
    }

    return { score, factorKeys, positive, negative, currentDaeun };
  } catch (error) {
    logger.error('Error calculating daeun score:', { error });
    return {
      score: 0,
      factorKeys: [],
      positive: false,
      negative: false,
      currentDaeun: null,
    };
  }
}

/**
 * 모든 시간 운세 점수 종합 계산
 *
 * 세운/월운/일진/대운의 점수를 통합하여 최종 운세 점수 도출
 * 각 시간 단위별 가중치 적용
 *
 * @param seunScore - 세운 점수
 * @param wolunScore - 월운 점수
 * @param iljinScore - 일진 점수
 * @param daeunScore - 대운 점수
 * @returns 종합 운세 점수 (-100 ~ +150)
 */
export function calculateTotalTemporalScore(
  seunScore: number,
  wolunScore: number,
  iljinScore: number,
  daeunScore: number
): number {
  try {
    // 가중치 적용: 대운 > 세운 > 월운 > 일진
    const weights = {
      daeun: 0.4,  // 40%
      seun: 0.3,   // 30%
      wolun: 0.15, // 15%
      iljin: 0.15, // 15%
    };

    const totalScore =
      daeunScore * weights.daeun +
      seunScore * weights.seun +
      wolunScore * weights.wolun +
      iljinScore * weights.iljin;

    return Math.round(totalScore);
  } catch (error) {
    logger.error('Error calculating total temporal score:', { error });
    return 0;
  }
}

export {
  ELEMENT_RELATIONS,
  STEMS,
  BRANCHES,
  STEM_TO_ELEMENT,
  BRANCH_TO_ELEMENT,
  SAMHAP,
  YUKHAP,
  CHUNG,
  XING,
  HAI,
};
