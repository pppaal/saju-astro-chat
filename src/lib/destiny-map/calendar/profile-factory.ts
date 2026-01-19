/**
 * Profile Factory Module
 * 사주 및 점성술 프로필 생성 및 추출 모듈
 *
 * 주요 기능:
 * - 외부 데이터에서 사주 프로필 추출
 * - 외부 데이터에서 점성술 프로필 추출
 * - 생년월일로부터 사주 프로필 직접 계산
 * - 생년월일로부터 점성술 프로필 직접 계산
 *
 * 이 모듈은 사용자 정보를 표준화된 프로필 형식으로 변환합니다.
 * 두 가지 데이터 소스를 지원합니다:
 * 1. 기존 계산 데이터에서 추출 (extractSajuProfile, extractAstroProfile)
 * 2. 생년월일로부터 직접 계산 (calculateSajuProfileFromBirthDate, calculateAstroProfileFromBirthDate)
 *
 * @module profile-factory
 * @example
 * // 기존 데이터에서 추출
 * const sajuData = { dayMaster: '甲', pillars: { day: { earthlyBranch: '子' } } };
 * const profile = extractSajuProfile(sajuData);
 * // { dayMaster: '甲', dayMasterElement: 'wood', dayBranch: '子' }
 *
 * @example
 * // 생년월일로부터 직접 계산
 * const birthDate = new Date(1990, 0, 15); // 1990년 1월 15일
 * const calculatedProfile = calculateSajuProfileFromBirthDate(birthDate);
 * // { dayMaster: '戊', dayMasterElement: 'earth', dayBranch: '申' }
 */

import {
  STEMS,
  BRANCHES,
  STEM_TO_ELEMENT,
  ZODIAC_TO_ELEMENT,
} from './constants';
import { normalizeElement } from './utils';
import { getPlanetPosition } from './astrology-planets';

/**
 * 대운 주기 정보
 */
export interface DaeunCycle {
  age: number;
  heavenlyStem: string;
  earthlyBranch: string;
  sibsin?: { cheon: string; ji: string };
}

/**
 * 사주 프로필 인터페이스
 */
export interface UserSajuProfile {
  dayMaster: string;
  dayMasterElement: string;
  dayBranch?: string;
  yearBranch?: string;
  birthYear?: number;
  daeunCycles?: DaeunCycle[];
  daeunsu?: number;
}

/**
 * 점성술 프로필 인터페이스
 */
export interface UserAstroProfile {
  sunSign: string;
  sunElement: string;
  sunLongitude?: number;
  birthMonth?: number;
  birthDay?: number;
}

/**
 * 외부 데이터에서 사주 프로필 추출
 *
 * 기존에 계산된 사주 데이터(일간, 일지, 대운 등)에서
 * 필요한 정보를 추출하여 표준화된 프로필로 변환합니다.
 *
 * 이 함수는 다양한 형식의 입력을 유연하게 처리합니다:
 * - dayMaster: string 또는 { name, heavenlyStem } 객체
 * - pillars: 사주의 네 기둥 정보
 * - daeun: 대운 배열
 *
 * @param saju - 추출할 사주 데이터 (any 타입으로 유연한 처리)
 * @returns 정규화된 사주 프로필
 *
 * @example
 * // 기본 형태
 * extractSajuProfile({
 *   dayMaster: '甲',
 *   pillars: {
 *     day: { earthlyBranch: '子' },
 *     year: { earthlyBranch: '寅' }
 *   }
 * });
 * // {
 * //   dayMaster: '甲',
 * //   dayMasterElement: 'wood',
 * //   dayBranch: '子',
 * //   yearBranch: '寅'
 * // }
 *
 * @example
 * // 대운 정보 포함
 * extractSajuProfile({
 *   dayMaster: { name: '甲' },
 *   pillars: { day: { earthlyBranch: { name: '子' } }, year: { earthlyBranch: '寅' } },
 *   birthDate: '1990-01-15',
 *   unse: {
 *     daeun: [
 *       { age: 5, heavenlyStem: '丙', earthlyBranch: '寅' },
 *       { age: 15, heavenlyStem: '丁', earthlyBranch: '卯' }
 *     ],
 *     daeunsu: 5
 *   }
 * });
 * // {
 * //   dayMaster: '甲',
 * //   dayMasterElement: 'wood',
 * //   dayBranch: '子',
 * //   yearBranch: '寅',
 * //   birthYear: 1990,
 * //   daeunCycles: [
 * //     { age: 5, heavenlyStem: '丙', earthlyBranch: '寅' },
 * //     { age: 15, heavenlyStem: '丁', earthlyBranch: '卯' }
 * //   ],
 * //   daeunsu: 5
 * // }
 *
 * @example
 * // 호환성 있는 다양한 형태 처리
 * extractSajuProfile({
 *   dayMaster: { heavenlyStem: '乙' },
 *   pillars: {
 *     day: { branch: '丑' },  // earthlyBranch 대신 branch 사용
 *     year: { earthlyBranch: { name: '卯' } }
 *   }
 * });
 * // {
 * //   dayMaster: '乙',
 * //   dayMasterElement: 'wood',
 * //   dayBranch: '丑',
 * //   yearBranch: '卯'
 * // }
 */
export function extractSajuProfile(saju: unknown): UserSajuProfile {

  const sajuData = saju as Record<string, unknown> | null | undefined;

  // dayMaster 추출 - string 또는 { name, heavenlyStem } 형태 처리
  const dayMasterRaw = sajuData?.dayMaster as string | { name?: string; heavenlyStem?: string } | undefined;
  const dayMaster = typeof dayMasterRaw === 'string'
    ? dayMasterRaw
    : (dayMasterRaw?.name || dayMasterRaw?.heavenlyStem || '甲');

  // 천간 단일 글자 추출 (복합 문자열일 경우)
  const stem = typeof dayMaster === 'string' && dayMaster.length > 0
    ? dayMaster.charAt(0)
    : '甲';

  // 기둥 정보 추출
  const pillars = sajuData?.pillars || {};

  // 일지 추출
  const dayPillar = pillars.day || {};
  const dayBranch = dayPillar.earthlyBranch?.name || dayPillar.earthlyBranch || dayPillar.branch || '';

  // 연지 추출 (삼재/역마/도화 계산에 필요)
  const yearPillar = pillars.year || {};
  const yearBranch = yearPillar.earthlyBranch?.name || yearPillar.earthlyBranch || yearPillar.branch || '';

  // 대운 데이터 추출
  const unse = sajuData?.unse || {};
  const daeunRaw = unse.daeun || [];

   
  const daeunCycles: DaeunCycle[] = (daeunRaw as Array<Record<string, unknown>>)
    .map((d) => ({
      age: (d.age as number) || 0,
      heavenlyStem: (d.heavenlyStem as string) || '',
      earthlyBranch: (d.earthlyBranch as string) || '',
      sibsin: (d.sibsin as string) || undefined,
    }))
    .filter((d: DaeunCycle) => d.heavenlyStem && d.earthlyBranch);

  // 생년 추출
  const birthDateStr = sajuData?.facts?.birthDate || sajuData?.birthDate || '';
  let birthYear: number | undefined;
  if (birthDateStr) {
    const parsed = new Date(birthDateStr);
    if (!isNaN(parsed.getTime())) {
      birthYear = parsed.getFullYear();
    }
  }

  return {
    dayMaster: stem,
    dayMasterElement: STEM_TO_ELEMENT[stem] || 'wood',
    dayBranch: dayBranch || undefined,
    yearBranch: yearBranch || undefined,
    birthYear,
    daeunCycles: daeunCycles.length > 0 ? daeunCycles : undefined,
    daeunsu: unse.daeunsu || undefined,
  };
}

/**
 * 외부 데이터에서 점성술 프로필 추출
 *
 * 기존에 계산된 점성술 데이터에서 태양 정보를 추출하여
 * 표준화된 프로필로 변환합니다.
 *
 * @param astrology - 추출할 점성술 데이터 (any 타입으로 유연한 처리)
 * @returns 정규화된 점성술 프로필
 *
 * @example
 * extractAstroProfile({
 *   planets: [
 *     { name: 'Sun', sign: 'Leo' },
 *     { name: 'Moon', sign: 'Cancer' }
 *   ]
 * });
 * // {
 * //   sunSign: 'Leo',
 * //   sunElement: 'fire'
 * // }
 *
 * @example
 * // 태양이 없는 경우 기본값 사용
 * extractAstroProfile({ planets: [] });
 * // {
 * //   sunSign: 'Aries',
 * //   sunElement: 'fire'
 * // }
 */
export function extractAstroProfile(astrology: unknown): UserAstroProfile {

  const astroData = astrology as Record<string, unknown> | null | undefined;
  const planets = (astroData?.planets || []) as Array<{ name?: string; sign?: string }>;


  const sun = planets.find((p) => p.name === 'Sun');
  const sunSign = sun?.sign || 'Aries';

  return {
    sunSign,
    sunElement: normalizeElement(ZODIAC_TO_ELEMENT[sunSign] || 'fire'),
  };
}

/**
 * 생년월일로부터 사주 프로필 직접 계산
 *
 * 기준일(1900년 1월 31일 = 甲子일)로부터의 경과일수를 계산하여
 * 해당 날짜의 일간과 일지를 결정합니다.
 *
 * **계산 원리**:
 * - 천간(干): 10일 주기 (甲, 乙, 丙, ... 癸)
 * - 지지(支): 12일 주기 (子, 丑, 寅, ... 亥)
 * - 간지: 60일 주기로 반복 (갑자부터 계시까지)
 *
 * @param birthDate - 출생 날짜
 * @returns 계산된 사주 프로필
 *
 * @example
 * // 2000년 1월 1일 (토요일)
 * calculateSajuProfileFromBirthDate(new Date(2000, 0, 1));
 * // {
 * //   dayMaster: '丙',
 * //   dayMasterElement: 'fire',
 * //   dayBranch: '午'
 * // }
 *
 * @example
 * // 1990년 1월 15일
 * calculateSajuProfileFromBirthDate(new Date(1990, 0, 15));
 * // {
 * //   dayMaster: '戊',
 * //   dayMasterElement: 'earth',
 * //   dayBranch: '申'
 * // }
 *
 * @example
 * // 과거 날짜 계산도 가능
 * calculateSajuProfileFromBirthDate(new Date(1900, 0, 31));
 * // {
 * //   dayMaster: '甲',
 * //   dayMasterElement: 'wood',
 * //   dayBranch: '子'
 * // }
 */
export function calculateSajuProfileFromBirthDate(birthDate: Date): UserSajuProfile {
  // 기준일: 1900년 1월 31일은 甲子일 (간지 첫 번째)
  const baseUtc = Date.UTC(1900, 0, 31);

  // 입력 날짜를 UTC 자정으로 설정 (타임존 영향 제거)
  const dateUtc = Date.UTC(
    birthDate.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate()
  );

  // 기준일로부터의 경과 일수 계산
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));

  // 천간 인덱스 계산 (10일 주기)
  const stemIndex = ((diffDays % 10) + 10) % 10;

  // 지지 인덱스 계산 (12일 주기)
  const branchIndex = ((diffDays % 12) + 12) % 12;

  // 배열에서 해당 천간과 지지 조회
  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];

  return {
    dayMaster: stem,
    dayMasterElement: STEM_TO_ELEMENT[stem] || 'wood',
    dayBranch: branch,
  };
}

/**
 * 생년월일로부터 점성술 프로필 직접 계산
 *
 * 표준 점성학 날짜 범위를 사용하여 태양 별자리를 결정합니다.
 * 정밀한 계산이 필요하면 ephemeris와 정확한 출생 시간이 필요합니다.
 *
 * **참고**: 별자리 경계 날짜는 해마다 1-2일 정도 변할 수 있습니다.
 * 이 함수는 표준 범위를 사용하므로 경계 날짜 근처에서는 부정확할 수 있습니다.
 *
 * @param birthDate - 출생 날짜
 * @returns 계산된 점성술 프로필 (태양 별자리 포함)
 *
 * @example
 * // 1990년 7월 15일 (게자리)
 * calculateAstroProfileFromBirthDate(new Date(1990, 6, 15));
 * // {
 * //   sunSign: 'Cancer',
 * //   sunElement: 'water',
 * //   sunLongitude: 92.5,
 * //   birthMonth: 7,
 * //   birthDay: 15
 * // }
 *
 * @example
 * // 2000년 1월 1일 (염소자리)
 * calculateAstroProfileFromBirthDate(new Date(2000, 0, 1));
 * // {
 * //   sunSign: 'Capricorn',
 * //   sunElement: 'earth',
 * //   sunLongitude: 280.5,
 * //   birthMonth: 1,
 * //   birthDay: 1
 * // }
 *
 * @example
 * // 1985년 3월 20일 (물고기자리/양자리 경계)
 * calculateAstroProfileFromBirthDate(new Date(1985, 2, 20));
 * // {
 * //   sunSign: 'Pisces', // 혹은 'Aries' (경계일 근처)
 * //   sunElement: 'water', // 혹은 'fire'
 * //   sunLongitude: 359.5,
 * //   birthMonth: 3,
 * //   birthDay: 20
 * // }
 */
export function calculateAstroProfileFromBirthDate(birthDate: Date): UserAstroProfile {
  const month = birthDate.getMonth(); // 0=January, 11=December
  const day = birthDate.getDate();

  // 황도 12궁 날짜 범위에 따라 태양 별자리 결정
  // 각 궁은 약 30일씩 차지합니다
  let sunSign: string;

  if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) {
    sunSign = 'Aries'; // 양자리: 3월 21일 ~ 4월 19일
  } else if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) {
    sunSign = 'Taurus'; // 황소자리: 4월 20일 ~ 5월 20일
  } else if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) {
    sunSign = 'Gemini'; // 쌍둥이자리: 5월 21일 ~ 6월 20일
  } else if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) {
    sunSign = 'Cancer'; // 게자리: 6월 21일 ~ 7월 22일
  } else if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) {
    sunSign = 'Leo'; // 사자리: 7월 23일 ~ 8월 22일
  } else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) {
    sunSign = 'Virgo'; // 처녀자리: 8월 23일 ~ 9월 22일
  } else if ((month === 8 && day >= 23) || (month === 9 && day <= 21)) {
    sunSign = 'Libra'; // 천칭자리: 9월 23일 ~ 10월 21일
  } else if ((month === 9 && day >= 22) || (month === 10 && day <= 21)) {
    sunSign = 'Scorpio'; // 전갈자리: 10월 22일 ~ 11월 21일
  } else if ((month === 10 && day >= 22) || (month === 11 && day <= 21)) {
    sunSign = 'Sagittarius'; // 궁수자리: 11월 22일 ~ 12월 21일
  } else if ((month === 11 && day >= 22) || (month === 0 && day <= 19)) {
    sunSign = 'Capricorn'; // 염소자리: 12월 22일 ~ 1월 19일
  } else if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) {
    sunSign = 'Aquarius'; // 물병자리: 1월 20일 ~ 2월 18일
  } else {
    sunSign = 'Pisces'; // 물고기자리: 2월 19일 ~ 3월 20일
  }

  // 태양의 황경 계산 (어스펙트 분석용)
  // 근사값으로 사용하며, 정확한 값이 필요하면 ephemeris를 사용하세요
  const sunPosition = getPlanetPosition(birthDate, 'sun');

  return {
    sunSign,
    sunElement: normalizeElement(ZODIAC_TO_ELEMENT[sunSign] || 'fire'),
    sunLongitude: sunPosition.longitude,
    birthMonth: birthDate.getMonth() + 1, // 1-12 범위로 변환
    birthDay: birthDate.getDate(),
  };
}
