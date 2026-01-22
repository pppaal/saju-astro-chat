/**
 * Month Data Calculator
 * 월별 사주 데이터 계산을 위한 헬퍼 모듈
 */

import {
  calculateYearlyGanji,
  calculateMonthlyGanji,
  calculatePreciseTwelveStage,
  calculateSibsin,
  type PreciseTwelveStage,
} from '../advancedTimingEngine';

import {
  PrecisionEngine,
  getSolarTermForDate,
  type SolarTerm,
} from '../ultraPrecisionEngine';

import type { Ganji, SibsinKind } from '@/lib/Saju/types';

/**
 * 월별 기본 데이터
 */
export interface MonthData {
  year: number;
  month: number;
  age: number;
  monthStart: Date;
  monthEnd: Date;
  midMonth: Date;
  monthGanji: Ganji;
  yearGanji: Ganji;
  twelveStage: PreciseTwelveStage;
  sibsin: SibsinKind;
  solarTerm: SolarTerm | null;
  solarTermMonth: number;
}

/**
 * 계산 옵션
 */
export interface CalculationOptions {
  useSolarTerms?: boolean;
}

/**
 * 월별 데이터 입력
 */
export interface MonthDataInput {
  birthYear: number;
  dayStem: string;
}

/**
 * 월별 기본 데이터 계산
 *
 * @param input 생년월일 및 일간 정보
 * @param year 대상 연도
 * @param month 대상 월 (1-12)
 * @param options 계산 옵션
 * @returns 월별 계산된 데이터
 *
 * @example
 * ```typescript
 * const monthData = calculateMonthData(
 *   { birthYear: 1990, dayStem: '甲' },
 *   2024,
 *   6,
 *   { useSolarTerms: true }
 * );
 * ```
 */
export function calculateMonthData(
  input: MonthDataInput,
  year: number,
  month: number,
  options: CalculationOptions = {}
): MonthData {
  const { useSolarTerms = true } = options;

  // 날짜 계산
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const midMonth = new Date(year, month - 1, 15);

  // 나이 계산
  const age = year - input.birthYear;

  // 간지 계산
  const monthGanji = calculateMonthlyGanji(year, month);
  const yearGanji = calculateYearlyGanji(year);

  // 12운성 계산
  const twelveStage = calculatePreciseTwelveStage(input.dayStem, monthGanji.branch);

  // 십신 계산
  const sibsin = calculateSibsin(input.dayStem, monthGanji.stem);

  // 절기 분석
  const solarTerm = useSolarTerms ? getSolarTermForDate(midMonth) : null;
  const solarTermMonth = solarTerm ? PrecisionEngine.getSolarTermMonth(midMonth) : month;

  return {
    year,
    month,
    age,
    monthStart,
    monthEnd,
    midMonth,
    monthGanji,
    yearGanji,
    twelveStage,
    sibsin,
    solarTerm,
    solarTermMonth,
  };
}

/**
 * 여러 달의 데이터를 일괄 계산
 *
 * @param input 생년월일 및 일간 정보
 * @param startYear 시작 연도
 * @param endYear 종료 연도
 * @param options 계산 옵션
 * @returns 월별 데이터 배열
 */
export function calculateMonthsData(
  input: MonthDataInput,
  startYear: number,
  endYear: number,
  options: CalculationOptions = {}
): MonthData[] {
  const results: MonthData[] = [];

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const monthData = calculateMonthData(input, year, month, options);
      results.push(monthData);
    }
  }

  return results;
}
