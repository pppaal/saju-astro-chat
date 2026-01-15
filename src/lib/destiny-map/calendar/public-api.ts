/**
 * Public API Module (공개 API 모듈)
 * Module 10 of Destiny Calendar System
 *
 * 사용자가 직접 호출하는 공개 API를 제공합니다.
 * 내부 분석 로직을 캡슐화하고 간단한 인터페이스를 제공합니다.
 *
 * 주요 기능:
 * - getDailyFortuneScore(): 오늘의 운세 점수 계산
 * - calculateYearlyImportantDates(): 연간 중요 날짜 계산
 * - findBestDatesForCategory(): 특정 카테고리 최적 날짜 조회
 * - calculateMonthlyImportantDates(): 월별 중요 날짜 계산
 * - 프로필 추출 함수들 (사주/점성술)
 *
 * @module public-api
 */

import {
  analyzeDate,
  type ImportantDate,
  type ImportanceGrade,
  type EventCategory,
  type UserSajuProfile,
  type UserAstroProfile,
} from './date-analysis-orchestrator';

import {
  getYearGanzhi,
  getGanzhiForDate,
} from './temporal-scoring';

import {
  calculateAreaScores,
  generateAlerts,
  getLuckyColorFromElement,
  getLuckyNumber,
} from './daily-fortune-helpers';

import {
  STEMS,
  BRANCHES,
  STEM_TO_ELEMENT,
  BRANCH_TO_ELEMENT,
  ZODIAC_TO_ELEMENT,
} from './constants';

import { normalizeElement } from './utils';
import { getPlanetPosition } from './transit-analysis';

/**
 * 월별 캘린더 데이터
 */
export interface CalendarMonth {
  year: number;
  month: number;
  dates: ImportantDate[];
}

/**
 * 일일 운세 결과
 */
export interface DailyFortuneResult {
  overall: number;
  love: number;
  career: number;
  wealth: number;
  health: number;
  luckyColor: string;
  luckyNumber: number;
  grade: ImportanceGrade;
  ganzhi: string;
  alerts: { type: "warning" | "positive" | "info"; msg: string; icon?: string }[];
  recommendations: string[];
  warnings: string[];
  crossVerified: boolean;
  sajuFactors: string[];
  astroFactors: string[];
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 연간 중요 날짜 계산
 * ═══════════════════════════════════════════════════════════════
 *
 * 1년 365일을 모두 분석하여 중요한 날짜들을 추출합니다.
 * 선택적으로 카테고리, 등급, 개수로 필터링할 수 있습니다.
 *
 * @param year - 분석할 연도
 * @param sajuProfile - 사주 프로필
 * @param astroProfile - 점성술 프로필
 * @param options - 필터 옵션 (카테고리, 등급, 개수 제한)
 * @returns 중요 날짜 목록 (점수순 정렬)
 */
export function calculateYearlyImportantDates(
  year: number,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile,
  options?: { category?: EventCategory; limit?: number; minGrade?: ImportanceGrade }
): ImportantDate[] {
  const dates: ImportantDate[] = [];

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const analysis = analyzeDate(new Date(d), sajuProfile, astroProfile);
    if (analysis) {
      // 카테고리 필터 (복수 카테고리에서 하나라도 매치하면 OK)
      if (options?.category && !analysis.categories.includes(options.category)) continue;
      // 등급 필터
      if (options?.minGrade && analysis.grade > options.minGrade) continue;
      dates.push(analysis);
    }
  }

  // 점수순 정렬
  dates.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade;
    return b.score - a.score;
  });

  if (options?.limit) {
    return dates.slice(0, options.limit);
  }

  return dates;
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 특정 카테고리 베스트 날짜 조회
 * ═══════════════════════════════════════════════════════════════
 *
 * 특정 활동(연애/재물/건강 등)에 가장 좋은 날짜들을 찾습니다.
 *
 * @param year - 분석할 연도
 * @param category - 카테고리 (wealth, career, love, health, travel, study, general)
 * @param sajuProfile - 사주 프로필
 * @param astroProfile - 점성술 프로필
 * @param limit - 반환할 날짜 수 (기본값: 10)
 * @returns 해당 카테고리의 최적 날짜 목록
 */
export function findBestDatesForCategory(
  year: number,
  category: EventCategory,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile,
  limit: number = 10
): ImportantDate[] {
  return calculateYearlyImportantDates(year, sajuProfile, astroProfile, {
    category,
    limit,
    minGrade: 2,
  });
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 월별 중요 날짜 계산
 * ═══════════════════════════════════════════════════════════════
 *
 * 특정 월의 모든 날짜를 분석하여 중요한 날짜들을 추출합니다.
 *
 * @param year - 연도
 * @param month - 월 (1-12)
 * @param sajuProfile - 사주 프로필
 * @param astroProfile - 점성술 프로필
 * @returns 월별 캘린더 데이터
 */
export function calculateMonthlyImportantDates(
  year: number,
  month: number,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile
): CalendarMonth {
  const dates: ImportantDate[] = [];

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const analysis = analyzeDate(new Date(d), sajuProfile, astroProfile);
    if (analysis) {
      dates.push(analysis);
    }
  }

  return { year, month, dates };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 사주 프로필 추출 (완전한 사주 데이터에서)
 * ═══════════════════════════════════════════════════════════════
 *
 * 복잡한 사주 데이터 구조에서 운명 캘린더에 필요한 정보만 추출합니다.
 *
 * @param saju - 전체 사주 데이터
 * @returns 운명 캘린더용 사주 프로필
 */
export function extractSajuProfile(saju: unknown): UserSajuProfile {
  const sajuData = saju as any;
  const dayMasterRaw = sajuData?.dayMaster;
  const dayMaster = typeof dayMasterRaw === "string"
    ? dayMasterRaw
    : (dayMasterRaw?.name || dayMasterRaw?.heavenlyStem || "甲");

  const stem = typeof dayMaster === "string" && dayMaster.length > 0
    ? dayMaster.charAt(0)
    : "甲";

  const pillars = sajuData?.pillars || {};
  const dayPillar = pillars.day || {};
  const dayBranch = dayPillar.earthlyBranch?.name || dayPillar.earthlyBranch || dayPillar.branch || "";

  // 연지(年支) 추출 - 삼재/역마/도화 계산에 필요
  const yearPillar = pillars.year || {};
  const yearBranch = yearPillar.earthlyBranch?.name || yearPillar.earthlyBranch || yearPillar.branch || "";

  // 대운 데이터 추출
  const unse = sajuData?.unse || {};
  const daeunRaw = unse.daeun || [];
  const daeunCycles: any[] = daeunRaw.map((d: any) => ({
    age: d.age || 0,
    heavenlyStem: d.heavenlyStem || "",
    earthlyBranch: d.earthlyBranch || "",
    sibsin: d.sibsin || undefined,
  })).filter((d: any) => d.heavenlyStem && d.earthlyBranch);

  // 생년 추출
  const birthDateStr = sajuData?.facts?.birthDate || sajuData?.birthDate || "";
  let birthYear: number | undefined;
  if (birthDateStr) {
    const parsed = new Date(birthDateStr);
    if (!isNaN(parsed.getTime())) {
      birthYear = parsed.getFullYear();
    }
  }

  return {
    dayMaster: stem,
    dayMasterElement: STEM_TO_ELEMENT[stem] || "wood",
    dayBranch,
    yearBranch: yearBranch || undefined,
    birthYear,
    daeunCycles: daeunCycles.length > 0 ? daeunCycles : undefined,
    daeunsu: unse.daeunsu || undefined,
    yongsin: sajuData?.yongsin,
    geokguk: sajuData?.geokguk,
    pillars: pillars.year || pillars.month || pillars.day || pillars.time ? {
      year: pillars.year ? { stem: pillars.year.heavenlyStem || pillars.year.stem, branch: pillars.year.earthlyBranch?.name || pillars.year.earthlyBranch || pillars.year.branch } : undefined,
      month: pillars.month ? { stem: pillars.month.heavenlyStem || pillars.month.stem, branch: pillars.month.earthlyBranch?.name || pillars.month.earthlyBranch || pillars.month.branch } : undefined,
      day: pillars.day ? { stem: pillars.day.heavenlyStem || pillars.day.stem, branch: pillars.day.earthlyBranch?.name || pillars.day.earthlyBranch || pillars.day.branch } : undefined,
      time: pillars.time ? { stem: pillars.time.heavenlyStem || pillars.time.stem, branch: pillars.time.earthlyBranch?.name || pillars.time.earthlyBranch || pillars.time.branch } : undefined,
    } : undefined,
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 점성술 프로필 추출 (완전한 점성술 데이터에서)
 * ═══════════════════════════════════════════════════════════════
 *
 * 복잡한 점성술 데이터 구조에서 운명 캘린더에 필요한 정보만 추출합니다.
 *
 * @param astrology - 전체 점성술 데이터
 * @returns 운명 캘린더용 점성술 프로필
 */
export function extractAstroProfile(astrology: unknown): UserAstroProfile {
  const astroData = astrology as any;
  const planets = astroData?.planets || [];
  const sun = planets.find((p: any) => p.name === "Sun");
  const sunSign = sun?.sign || "Aries";

  return {
    sunSign,
    sunElement: normalizeElement(ZODIAC_TO_ELEMENT[sunSign] || "fire"),
    sunLongitude: sun?.longitude,
    birthMonth: astroData?.birthMonth,
    birthDay: astroData?.birthDay,
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 생년월일로 사주 프로필 직접 계산
 * ═══════════════════════════════════════════════════════════════
 *
 * 완전한 사주 데이터가 없을 때, 생년월일만으로 기본 프로필을 생성합니다.
 *
 * @param birthDate - 생년월일
 * @returns 기본 사주 프로필
 */
export function calculateSajuProfileFromBirthDate(birthDate: Date): UserSajuProfile {
  // 기준일: 1900년 1월 31일은 甲子일
  // UTC 기준으로 일수 계산 (서버 타임존 영향 제거)
  const baseUtc = Date.UTC(1900, 0, 31);
  const dateUtc = Date.UTC(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  const diffDays = Math.floor((dateUtc - baseUtc) / (1000 * 60 * 60 * 24));

  const stemIndex = ((diffDays % 10) + 10) % 10;
  const branchIndex = ((diffDays % 12) + 12) % 12;

  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];

  return {
    dayMaster: stem,
    dayMasterElement: STEM_TO_ELEMENT[stem] || "wood",
    dayBranch: branch,
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 생년월일로 점성술 프로필 직접 계산
 * ═══════════════════════════════════════════════════════════════
 *
 * 완전한 점성술 데이터가 없을 때, 생년월일만으로 기본 프로필을 생성합니다.
 *
 * @param birthDate - 생년월일
 * @returns 기본 점성술 프로필
 */
export function calculateAstroProfileFromBirthDate(birthDate: Date): UserAstroProfile {
  const month = birthDate.getMonth();
  const day = birthDate.getDate();

  let sunSign: string;
  if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) sunSign = "Aries";
  else if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) sunSign = "Taurus";
  else if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) sunSign = "Gemini";
  else if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) sunSign = "Cancer";
  else if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) sunSign = "Leo";
  else if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) sunSign = "Virgo";
  else if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) sunSign = "Libra";
  else if ((month === 9 && day >= 23) || (month === 10 && day <= 21)) sunSign = "Scorpio";
  else if ((month === 10 && day >= 22) || (month === 11 && day <= 21)) sunSign = "Sagittarius";
  else if ((month === 11 && day >= 22) || (month === 0 && day <= 19)) sunSign = "Capricorn";
  else if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) sunSign = "Aquarius";
  else sunSign = "Pisces";

  // 출생 태양 경도 계산 (어스펙트 분석용)
  const sunPosition = getPlanetPosition(birthDate, "sun");

  return {
    sunSign,
    sunElement: normalizeElement(ZODIAC_TO_ELEMENT[sunSign] || "fire"),
    sunLongitude: sunPosition.longitude,
    birthMonth: birthDate.getMonth() + 1,
    birthDay: birthDate.getDate(),
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * Daily Fortune 점수 계산 (오늘의 운세)
 * ═══════════════════════════════════════════════════════════════
 *
 * Destiny Calendar와 동일한 사주+점성술 교차 검증 로직 사용
 * 생년월일만으로도 기본적인 운세 계산 가능
 *
 * @param birthDate - 생년월일 (Date 또는 'YYYY-MM-DD' 문자열)
 * @param birthTime - 생시 (선택사항, 'HH:MM' 형식)
 * @param targetDate - 분석 대상 날짜 (기본값: 오늘)
 * @returns 오늘의 운세 점수 및 상세 정보
 */
export function getDailyFortuneScore(
  birthDate: Date | string,
  birthTime?: string,
  targetDate?: Date
): DailyFortuneResult {
  // 날짜 파싱
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  const today = targetDate || new Date();

  // 사주 프로필 계산
  const sajuProfile = calculateSajuProfileFromBirthDate(birth);

  // 연지(年支) 추가 - 삼재/역마/도화 계산용
  const birthYearGanzhi = getYearGanzhi(birth.getFullYear());
  sajuProfile.yearBranch = birthYearGanzhi.branch;
  sajuProfile.birthYear = birth.getFullYear();

  // 점성술 프로필 계산
  const astroProfile = calculateAstroProfileFromBirthDate(birth);
  astroProfile.birthMonth = birth.getMonth() + 1;
  astroProfile.birthDay = birth.getDate();

  // 핵심: analyzeDate 함수로 종합 분석
  const analysis = analyzeDate(today, sajuProfile, astroProfile);

  // 분석 결과가 없으면 기본값 반환
  if (!analysis) {
    const defaultScore = 50;
    return createDefaultFortuneResult(defaultScore, today, birth);
  }

  // 전체 점수 (0-100)
  const overallScore = analysis.score;

  // 영역별 점수 계산 (전체 점수 기반으로 변동)
  const areaScores = calculateAreaScores(overallScore, analysis, today);

  // 행운의 색상/숫자 계산
  const ganzhi = getGanzhiForDate(today);
  const luckyColor = getLuckyColorFromElement(ganzhi.stemElement);
  const luckyNumber = getLuckyNumber(today, birth);

  // 알림 생성
  const alerts = generateAlerts(analysis);

  return {
    overall: overallScore,
    love: areaScores.love,
    career: areaScores.career,
    wealth: areaScores.wealth,
    health: areaScores.health,
    luckyColor,
    luckyNumber,
    grade: analysis.grade,
    ganzhi: analysis.ganzhi,
    alerts,
    recommendations: analysis.recommendationKeys,
    warnings: analysis.warningKeys,
    crossVerified: analysis.crossVerified,
    sajuFactors: analysis.sajuFactorKeys,
    astroFactors: analysis.astroFactorKeys,
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 기본 운세 결과 생성 (폴백)
 * ═══════════════════════════════════════════════════════════════
 *
 * 분석이 실패하거나 데이터가 부족할 때 사용하는 기본 결과
 *
 * @param score - 기본 점수
 * @param targetDate - 대상 날짜
 * @param birthDate - 생년월일
 * @returns 기본 운세 결과
 */
function createDefaultFortuneResult(
  score: number,
  targetDate: Date,
  birthDate: Date
): DailyFortuneResult {
  const ganzhi = getGanzhiForDate(targetDate);

  return {
    overall: score,
    love: score + Math.floor(Math.random() * 10) - 5,
    career: score + Math.floor(Math.random() * 10) - 5,
    wealth: score + Math.floor(Math.random() * 10) - 5,
    health: score + Math.floor(Math.random() * 10) - 5,
    luckyColor: getLuckyColorFromElement(ganzhi.stemElement),
    luckyNumber: getLuckyNumber(targetDate, birthDate),
    grade: 3,
    ganzhi: `${ganzhi.stem}${ganzhi.branch}`,
    alerts: [],
    recommendations: [],
    warnings: [],
    crossVerified: false,
    sajuFactors: [],
    astroFactors: [],
  };
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 날짜별 천간지지 계산 (호환성을 위해 재export)
 * ═══════════════════════════════════════════════════════════════
 *
 * @param date - 계산할 날짜
 * @returns 천간지지 정보
 */
export { getGanzhiForDate };
