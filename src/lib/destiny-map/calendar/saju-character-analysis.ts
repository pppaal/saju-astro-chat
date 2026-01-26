/**
 * Saju Character Analysis Module (사주 성격/구조 분석)
 *
 * 사주의 기본 구조와 성격을 분석하는 모듈
 * - 용신(用神): 사주 구조에서 필요한 오행
 * - 기신(忌神): 피해야 할 오행
 * - 격국(格局): 사주 구조 유형 (정관격, 식신격 등)
 * - Solar Return: 생일 주변의 특별 에너지
 * - Progressions: 인생 단계별 발전 테마
 *
 * 기본 원리:
 * 사주의 오행 불균형을 분석하고, 필요한 오행(용신)을 보충하거나
 * 방해가 되는 오행(기신)을 피하는 방식으로 운을 개선할 수 있음을 제시
 *
 * @module saju-character-analysis
 * @version 1.0.0
 */

import { logger } from '@/lib/logger';
import { ELEMENT_RELATIONS, ZODIAC_TO_ELEMENT } from './constants';
import { getSipsin, normalizeElement } from './utils';

// ============================================================
// Type Definitions / 타입 정의
// ============================================================

/**
 * 용신(用神) 정보
 * 사주 구조에서 필요로 하는 오행을 정의
 */
export interface YongsinInfo {
  /** 주요 용신 오행 (목/화/토/금/수) */
  primary: string;
  /** 보조 용신 오행 */
  secondary?: string;
  /** 용신 유형: '억부' (억제) | '조후' (조후) | '통관' (통관) | '병약' (병약) */
  type: string;
  /** 피해야 할 기신 오행 */
  kibsin?: string;
}

/**
 * 용신 분석 결과
 */
export interface YongsinAnalysis {
  /** 점수 (-28 ~ +30) */
  score: number;
  /** 영향 요소 키 배열 */
  factorKeys: string[];
  /** 긍정적 요소 여부 */
  positive: boolean;
  /** 부정적 요소 여부 */
  negative: boolean;
  /** 용신 매칭 유형 */
  matchType?: string;
}

/**
 * 격국(格局) 정보
 * 사주의 기본 구조 유형을 정의
 */
export interface GeokgukInfo {
  /** 격국 유형: '정관격', '편관격', '식신격', '정인격', '종격' 등 */
  type: string;
  /** 신강/신약 상태: '신강' | '신약' | '중화' */
  strength: string;
}

/**
 * 기둥(柱) 정보
 */
export interface PillarInfo {
  /** 년주 (년천간/년지지) */
  year?: { stem: string; branch: string };
  /** 월주 (월천간/월지지) */
  month?: { stem: string; branch: string };
  /** 일주 (일천간/일지지) */
  day?: { stem: string; branch: string };
  /** 시주 (시천간/시지지) */
  time?: { stem: string; branch: string };
}

/**
 * 천간지지 정보
 */
export interface GanzhiInfo {
  /** 천간 */
  stem: string;
  /** 지지 */
  branch: string;
  /** 천간의 오행 */
  stemElement: string;
  /** 지지의 오행 */
  branchElement: string;
}

/**
 * 격국 분석 결과
 */
export interface GeokgukAnalysis {
  /** 점수 (-18 ~ +20) */
  score: number;
  /** 영향 요소 키 배열 */
  factorKeys: string[];
  /** 긍정적 요소 여부 */
  positive: boolean;
  /** 부정적 요소 여부 */
  negative: boolean;
}

/**
 * Solar Return 분석 결과
 * 생일 주변의 특별한 에너지를 분석
 */
export interface SolarReturnAnalysis {
  /** 점수 (0 ~ 25) */
  score: number;
  /** 영향 요소 키 배열 */
  factorKeys: string[];
  /** 긍정적 여부 */
  positive: boolean;
  /** 정확히 생일인지 여부 */
  isBirthday: boolean;
  /** 생일으로부터의 거리 (일수) */
  daysFromBirthday: number;
}

/**
 * Progressions 분석 결과
 * 인생 단계별 발전 테마를 분석
 */
export interface ProgressionAnalysis {
  /** 점수 (-5 ~ +10) */
  score: number;
  /** 영향 요소 키 배열 */
  factorKeys: string[];
  /** 긍정적 요소 여부 */
  positive: boolean;
  /** 부정적 요소 여부 */
  negative: boolean;
  /** 현재 인생 단계 ('lunar', 'mercury', 'venus', 'solar', 'mars', 'jupiter', 'saturn', 'outer') */
  currentPhase: string;
}

/**
 * 오행 한글 → 영문 매핑
 */
const ELEMENT_KO_TO_EN: Record<string, string> = {
  '목': 'wood',
  '화': 'fire',
  '토': 'earth',
  '금': 'metal',
  '수': 'water',
  '木': 'wood',
  '火': 'fire',
  '土': 'earth',
  '金': 'metal',
  '水': 'water',
};

/**
 * 격국별 좋아하는 십신/피해야 할 십신
 */
const GEOKGUK_PREFERENCES: Record<
  string,
  { favor: string[]; avoid: string[] }
> = {
  // 정격(正格)
  정관격: { favor: ['정인', '정재', '식신'], avoid: ['상관', '겁재'] },
  편관격: { favor: ['식신', '정인', '양인'], avoid: ['편재'] },
  정인격: { favor: ['정관', '비견'], avoid: ['정재', '편재'] },
  편인격: { favor: ['편관', '정관'], avoid: ['식신', '정재'] },
  정재격: { favor: ['식신', '정관', '비견'], avoid: ['겁재', '편재'] },
  편재격: { favor: ['식신', '상관'], avoid: ['겁재', '비견'] },
  식신격: { favor: ['정재', '편재', '정인'], avoid: ['편인', '편관'] },
  상관격: { favor: ['정재', '정인'], avoid: ['정관', '편관'] },
  // 특수격
  건록격: { favor: ['정관', '정재', '식신'], avoid: ['겁재', '편인'] },
  양인격: { favor: ['정관', '편관'], avoid: ['편재', '겁재'] },
  // 종격(從格) - 신약 극심
  종아격: {
    favor: ['식신', '상관', '정재', '편재'],
    avoid: ['정인', '편인'],
  },
  종재격: {
    favor: ['정재', '편재', '식신', '상관'],
    avoid: ['비견', '겁재'],
  },
  종관격: {
    favor: ['정관', '편관', '정재'],
    avoid: ['식신', '상관'],
  },
  종살격: { favor: ['편관', '정인'], avoid: ['식신', '상관'] },
};

/**
 * 달의 오행 원소 계산
 *
 * 음력 월별로 달의 오행을 근사하여 계산
 * 점성학적 달-오행 대응
 *
 * @param date - 분석 대상 날짜
 * @returns 달의 오행 (목/화/토/금/수)
 *
 * 예시:
 * ```typescript
 * const moonElement = getMoonElement(new Date(2024, 2, 15)); // March
 * // 'water' (봄철 물의 영향)
 * ```
 */
export function getMoonElement(date: Date): string {
  try {
    const month = date.getMonth();
    // 달-오행 대응 (점성학 전통)
    const signs = [
      'Capricorn', // 1월
      'Aquarius', // 2월
      'Pisces', // 3월
      'Aries', // 4월
      'Taurus', // 5월
      'Gemini', // 6월
      'Cancer', // 7월
      'Leo', // 8월
      'Virgo', // 9월
      'Libra', // 10월
      'Scorpio', // 11월
      'Sagittarius', // 12월
    ];

    const approxSign = signs[month];
    const element = ZODIAC_TO_ELEMENT[approxSign] || 'earth';
    return normalizeElement(element);
  } catch (error) {
    logger.error('Error calculating moon element:', { error });
    return 'earth';
  }
}

/**
 * 용신(用神) 분석 함수
 *
 * 일진의 오행이 용신과 일치하면 대길, 기신과 일치하면 대흉
 * 사주의 오행 불균형을 바로잡기 위해 필요한 오행(용신)을 찾는 것이 목표
 *
 * 계산 로직:
 * 1. 일진 천간 오행이 주요 용신과 일치 → +30점 (최고의 길)
 * 2. 일진 천간 오행이 보조 용신과 일치 → +18점
 * 3. 일진 지지 오행이 용신과 일치 → +15점 추가
 * 4. 일진 오행이 기신과 일치 → -28점 (흉)
 * 5. 용신을 생해주는 오행 → +12점 (간접 길)
 * 6. 용신을 극하는 오행 → -10점
 *
 * 점수 범위: -28 ~ +45
 *
 * @param yongsin - 용신 정보
 * @param ganzhi - 해당 날짜의 천간지지
 * @param date - 분석 대상 날짜
 * @returns 용신 분석 결과
 *
 * 예시:
 * ```typescript
 * const yongsin: YongsinInfo = {
 *   primary: '목', // 주요 용신: 목
 *   secondary: '수', // 보조 용신: 수
 *   type: '통관', // 통관격
 *   kibsin: '금' // 기신: 금
 * };
 *
 * const analysis = analyzeYongsin(yongsin, ganzhiData, new Date(2024, 0, 15));
 * // {
 * //   score: 30,
 * //   factorKeys: ['yongsinPrimaryMatch', 'yongsinBranchMatch', 'yongsinSupport'],
 * //   positive: true,
 * //   negative: false,
 * //   matchType: 'primaryYongsinMatch'
 * // }
 * ```
 */
export function analyzeYongsin(
  yongsin: YongsinInfo | undefined,
  ganzhi: GanzhiInfo,
  date: Date
): YongsinAnalysis {
  try {
    const result: YongsinAnalysis = {
      score: 0,
      factorKeys: [],
      positive: false,
      negative: false,
    };

    if (!yongsin?.primary) {return result;}

    // 1단계: 용신 오행 정규화 (한글 → 영문)
    const primaryYongsin =
      ELEMENT_KO_TO_EN[yongsin.primary] || yongsin.primary.toLowerCase();
    const secondaryYongsin = yongsin.secondary
      ? ELEMENT_KO_TO_EN[yongsin.secondary] ||
        yongsin.secondary.toLowerCase()
      : undefined;
    const kibsin = yongsin.kibsin
      ? ELEMENT_KO_TO_EN[yongsin.kibsin] || yongsin.kibsin.toLowerCase()
      : undefined;

    const dayStemElement = ganzhi.stemElement;
    const dayBranchElement = ganzhi.branchElement;

    // 2단계: 일진 천간이 용신과 일치 → 대길
    if (dayStemElement === primaryYongsin) {
      result.score += 30; // 최고의 길
      result.positive = true;
      result.matchType = 'primaryYongsinMatch';
      result.factorKeys.push('yongsinPrimaryMatch');
    } else if (
      secondaryYongsin &&
      dayStemElement === secondaryYongsin
    ) {
      // 보조용신 일치 → 길
      result.score += 18;
      result.positive = true;
      result.matchType = 'secondaryYongsinMatch';
      result.factorKeys.push('yongsinSecondaryMatch');
    }

    // 3단계: 일진 지지가 용신과 일치 → 추가 보너스
    if (dayBranchElement === primaryYongsin) {
      result.score += 15;
      result.positive = true;
      result.factorKeys.push('yongsinBranchMatch');
    } else if (
      secondaryYongsin &&
      dayBranchElement === secondaryYongsin
    ) {
      result.score += 10;
      result.factorKeys.push('yongsinSecondaryBranchMatch');
    }

    // 4단계: 기신(忌神) 체크 - 일진이 기신과 일치하면 흉
    if (kibsin) {
      if (dayStemElement === kibsin) {
        result.score -= 28; // 가장 흉
        result.negative = true;
        result.factorKeys.push('kibsinMatch');
      }
      if (dayBranchElement === kibsin) {
        result.score -= 15;
        result.negative = true;
        result.factorKeys.push('kibsinBranchMatch');
      }
    }

    // 5단계: 용신을 생(生)해주는 오행이 오면 간접 길 (상생)
    const yongsinRelations = ELEMENT_RELATIONS[primaryYongsin];
    if (yongsinRelations) {
      if (dayStemElement === yongsinRelations.generatedBy) {
        result.score += 12;
        result.factorKeys.push('yongsinSupport');
      }
      // 용신을 극(剋)하는 오행이 오면 흉
      if (dayStemElement === yongsinRelations.controlledBy) {
        result.score -= 10;
        result.factorKeys.push('yongsinHarmed');
      }
    }

    return result;
  } catch (error) {
    logger.error('Error analyzing yongsin:', { error });
    return {
      score: 0,
      factorKeys: [],
      positive: false,
      negative: false,
    };
  }
}

/**
 * 격국(格局) 분석 함수
 *
 * 격국은 사주 구조를 분류하는 가장 기본적인 방법
 * 정격(정관격, 식신격 등)과 특수격(종격, 건록격 등)으로 분류
 *
 * 격국이 좋아하는 십신이 일진에 나타나면 길
 * 격국이 싫어하는 십신이 나타나면 흉
 *
 * 점수 범위: -18 ~ +20
 *
 * @param geokguk - 격국 정보
 * @param ganzhi - 해당 날짜의 천간지지
 * @param pillars - 사주의 기둥 정보
 * @returns 격국 분석 결과
 *
 * 예시:
 * ```typescript
 * const geokguk: GeokgukInfo = { type: '정관격', strength: '신강' };
 * const analysis = analyzeGeokguk(geokguk, ganzhiData, pillars);
 * // {
 * //   score: 20,
 * //   factorKeys: ['geokgukFavor_정인', 'geokgukStrengthBalance'],
 * //   positive: true,
 * //   negative: false
 * // }
 * ```
 */
export function analyzeGeokguk(
  geokguk: GeokgukInfo | undefined,
  ganzhi: GanzhiInfo,
  pillars?: PillarInfo
): GeokgukAnalysis {
  try {
    const result: GeokgukAnalysis = {
      score: 0,
      factorKeys: [],
      positive: false,
      negative: false,
    };

    if (!geokguk?.type || !pillars?.day?.stem) {return result;}

    const dayMasterStem = pillars.day.stem;
    const preferences = GEOKGUK_PREFERENCES[geokguk.type as keyof typeof GEOKGUK_PREFERENCES];

    if (!preferences) {return result;}

    // 1단계: 일진 천간의 십신 계산
    const daySipsin = getSipsin(dayMasterStem, ganzhi.stem);

    if (daySipsin) {
      // 격국이 좋아하는 십신이 오면 가산
      if (preferences.favor.includes(daySipsin)) {
        result.score += 20;
        result.positive = true;
        result.factorKeys.push(`geokgukFavor_${daySipsin}`);
      }
      // 격국이 싫어하는 십신이 오면 감산
      if (preferences.avoid.includes(daySipsin)) {
        result.score -= 18;
        result.negative = true;
        result.factorKeys.push(`geokgukAvoid_${daySipsin}`);
      }
    }

    // 2단계: 신강/신약에 따른 추가 분석
    if (geokguk.strength === '신강') {
      // 신강은 설기(泄氣: 식상/재성) 또는 극제(剋制: 관성)가 좋음
      const settingElements = [
        '식신',
        '상관',
        '정재',
        '편재',
        '정관',
        '편관',
      ];
      if (daySipsin && settingElements.includes(daySipsin)) {
        result.score += 8;
        result.factorKeys.push('geokgukStrengthBalance');
      }
      // 신강에 비겁/인성 더 오면 과다
      const excessElements = ['비견', '겁재', '정인', '편인'];
      if (daySipsin && excessElements.includes(daySipsin)) {
        result.score -= 6;
        result.factorKeys.push('geokgukStrengthExcess');
      }
    } else if (geokguk.strength === '신약') {
      // 신약은 부조(扶助: 비겁/인성)가 좋음
      const supportElements = ['비견', '겁재', '정인', '편인'];
      if (daySipsin && supportElements.includes(daySipsin)) {
        result.score += 8;
        result.factorKeys.push('geokgukWeakSupport');
      }
      // 신약에 관살/재성 더 오면 과도한 압박
      const pressureElements = ['정관', '편관', '정재', '편재'];
      if (daySipsin && pressureElements.includes(daySipsin)) {
        result.score -= 6;
        result.factorKeys.push('geokgukWeakPressure');
      }
    }

    return result;
  } catch (error) {
    logger.error('Error analyzing geokguk:', { error });
    return {
      score: 0,
      factorKeys: [],
      positive: false,
      negative: false,
    };
  }
}

/**
 * Solar Return 분석 함수
 *
 * 생일 당일 및 주변(±3일)에 특별한 에너지가 있음
 * 점성학에서 태양이 원래 위치로 돌아오는 시점의 영향
 *
 * 점수 기준:
 * - 생일 당일: +25점
 * - ±1일: +18점
 * - ±3일: +10점
 * - ±7일: +5점
 *
 * @param date - 분석 대상 날짜
 * @param birthMonth - 출생월 (1~12)
 * @param birthDay - 출생일 (1~31)
 * @returns Solar Return 분석 결과
 *
 * 예시:
 * ```typescript
 * const analysis = analyzeSolarReturn(
 *   new Date(2024, 2, 15),  // 3월 15일
 *   3,   // 출생월: 3월
 *   15   // 출생일: 15일
 * );
 * // {
 * //   score: 25,
 * //   factorKeys: ['solarReturnExact'],
 * //   positive: true,
 * //   isBirthday: true,
 * //   daysFromBirthday: 0
 * // }
 * ```
 */
export function analyzeSolarReturn(
  date: Date,
  birthMonth?: number,
  birthDay?: number
): SolarReturnAnalysis {
  try {
    const result: SolarReturnAnalysis = {
      score: 0,
      factorKeys: [],
      positive: false,
      isBirthday: false,
      daysFromBirthday: 999,
    };

    if (!birthMonth || !birthDay) {return result;}

    const currentMonth = date.getMonth() + 1;
    const currentDay = date.getDate();

    // 생일까지의 일수 계산 (같은 해 기준)
    // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
    const dateUtc = Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const targetUtc = Date.UTC(
      date.getFullYear(),
      birthMonth - 1,
      birthDay
    );
    const diffDays = Math.round((targetUtc - dateUtc) / (1000 * 60 * 60 * 24));
    result.daysFromBirthday = Math.abs(diffDays);

    // 1단계: 생일 당일
    if (currentMonth === birthMonth && currentDay === birthDay) {
      result.score += 25;
      result.positive = true;
      result.isBirthday = true;
      result.factorKeys.push('solarReturnExact');
    }
    // 2단계: 생일 ±1일 (Solar Return 영향권)
    else if (result.daysFromBirthday <= 1) {
      result.score += 18;
      result.positive = true;
      result.factorKeys.push('solarReturnNear');
    }
    // 3단계: 생일 ±3일 (Solar Return 잔여 에너지)
    else if (result.daysFromBirthday <= 3) {
      result.score += 10;
      result.positive = true;
      result.factorKeys.push('solarReturnWeak');
    }
    // 4단계: 생일 ±7일 (Solar Return 여파)
    else if (result.daysFromBirthday <= 7) {
      result.score += 5;
      result.factorKeys.push('solarReturnEcho');
    }

    return result;
  } catch (error) {
    logger.error('Error analyzing solar return:', { error });
    return {
      score: 0,
      factorKeys: [],
      positive: false,
      isBirthday: false,
      daysFromBirthday: 999,
    };
  }
}

/**
 * Secondary Progressions 분석 함수
 *
 * 1일 = 1년 법칙 기반, 나이에 따른 발전 단계
 * 출생 후 경과 일수 = 진행 연도의 법칙을 따름
 *
 * 인생 단계별 지배 행성:
 * - 0~7세: 달(감정/양육)
 * - 7~14세: 수성(학습/소통)
 * - 14~21세: 금성(사랑/가치)
 * - 21~29세: 태양(정체성/성취)
 * - 29~42세: 화성(행동/야망)
 * - 42~56세: 목성(확장/지혜) ← 가장 길한 시기
 * - 56~70세: 토성(성숙/유산)
 * - 70세 이상: 외행성(영적 성장)
 *
 * 점수 범위: -5 ~ +13
 *
 * @param date - 분석 대상 날짜
 * @param birthYear - 출생 연도
 * @param natalSunElement - 출생시 태양의 오행 (선택)
 * @param dayMasterElement - 일간의 오행
 * @returns Progressions 분석 결과
 *
 * 예시:
 * ```typescript
 * const analysis = analyzeProgressions(
 *   new Date(2024, 0, 15),
 *   1990,
 *   'fire',  // 출생시 태양 화(火)
 *   'wood'   // 일간 목(木)
 * );
 * // {
 * //   score: 5,
 * //   factorKeys: ['progressionMars', 'progressionSupport'],
 * //   positive: true,
 * //   negative: false,
 * //   currentPhase: 'mars'
 * // }
 * ```
 */
export function analyzeProgressions(
  date: Date,
  birthYear?: number,
  natalSunElement?: string,
  dayMasterElement?: string
): ProgressionAnalysis {
  try {
    const result: ProgressionAnalysis = {
      score: 0,
      factorKeys: [],
      positive: false,
      negative: false,
      currentPhase: '',
    };

    if (!birthYear) {return result;}

    const currentYear = date.getFullYear();
    const age = currentYear - birthYear;

    // 1단계: 나이대별 인생 단계 판정 (점성학적 관점)
    if (age < 7) {
      result.currentPhase = 'lunar'; // 달 지배 - 감정/양육
      result.factorKeys.push('progressionLunar');
    } else if (age < 14) {
      result.currentPhase = 'mercury'; // 수성 지배 - 학습/소통
      result.factorKeys.push('progressionMercury');
    } else if (age < 21) {
      result.currentPhase = 'venus'; // 금성 지배 - 사랑/가치
      result.factorKeys.push('progressionVenus');
    } else if (age < 29) {
      result.currentPhase = 'solar'; // 태양 지배 - 정체성/성취
      result.factorKeys.push('progressionSolar');
    } else if (age < 42) {
      result.currentPhase = 'mars'; // 화성 지배 - 행동/야망
      result.factorKeys.push('progressionMars');
    } else if (age < 56) {
      result.currentPhase = 'jupiter'; // 목성 지배 - 확장/지혜
      result.factorKeys.push('progressionJupiter');
      result.score += 5; // 목성 시기는 일반적으로 긍정적
    } else if (age < 70) {
      result.currentPhase = 'saturn'; // 토성 지배 - 성숙/유산
      result.factorKeys.push('progressionSaturn');
    } else {
      result.currentPhase = 'outer'; // 외행성 지배 - 영적 성장
      result.factorKeys.push('progressionOuter');
    }

    // 2단계: 사주 오행과 현재 단계의 조화 체크
    const phaseToElement: Record<string, string> = {
      lunar: 'water',
      mercury: 'metal', // 수성=금
      venus: 'earth',
      solar: 'fire',
      mars: 'fire',
      jupiter: 'wood',
      saturn: 'earth',
      outer: 'water',
    };

    const phaseElement = phaseToElement[result.currentPhase];
    if (phaseElement && dayMasterElement) {
      const relations = ELEMENT_RELATIONS[dayMasterElement];
      if (relations) {
        // 현재 단계가 일간을 생해주면 길
        if (phaseElement === relations.generatedBy) {
          result.score += 8;
          result.positive = true;
          result.factorKeys.push('progressionSupport');
        }
        // 현재 단계가 일간을 극하면 도전
        else if (phaseElement === relations.controlledBy) {
          result.score -= 5;
          result.negative = true;
          result.factorKeys.push('progressionChallenge');
        }
      }
    }

    // 3단계: 7년 주기 전환점 (중요한 변화의 해)
    const cycleYears = [7, 14, 21, 28, 29, 30, 35, 42, 49, 56, 63, 70, 77, 84];
    if (cycleYears.includes(age)) {
      result.score += 3;
      result.factorKeys.push('progressionCycleYear');
    }

    // 4단계: Saturn Return (29-30세, 58-60세) - 중요한 성숙기
    if (age >= 29 && age <= 30) {
      result.factorKeys.push('saturnReturnFirst');
      // 도전과 성장의 시기
    } else if (age >= 58 && age <= 60) {
      result.factorKeys.push('saturnReturnSecond');
    }

    return result;
  } catch (error) {
    logger.error('Error analyzing progressions:', { error });
    return {
      score: 0,
      factorKeys: [],
      positive: false,
      negative: false,
      currentPhase: '',
    };
  }
}

/**
 * 성격/구조 분석 종합 점수 계산
 *
 * 용신/격국/Solar Return/Progressions을 통합하여 성격 구조 분석
 *
 * @param yongsinScore - 용신 점수
 * @param geokgukScore - 격국 점수
 * @param solarReturnScore - Solar Return 점수
 * @param progressionScore - Progression 점수
 * @returns 종합 성격/구조 점수
 */
export function calculateTotalCharacterScore(
  yongsinScore: number,
  geokgukScore: number,
  solarReturnScore: number,
  progressionScore: number
): number {
  try {
    // 가중치: 용신 > 격국 > Solar Return > Progression
    const weights = {
      yongsin: 0.4,       // 40%
      geokguk: 0.35,      // 35%
      solarReturn: 0.15,  // 15%
      progression: 0.1,   // 10%
    };

    const totalScore =
      yongsinScore * weights.yongsin +
      geokgukScore * weights.geokguk +
      solarReturnScore * weights.solarReturn +
      progressionScore * weights.progression;

    return Math.round(totalScore);
  } catch (error) {
    logger.error('Error calculating total character score:', { error });
    return 0;
  }
}

export { ELEMENT_RELATIONS, ZODIAC_TO_ELEMENT };
