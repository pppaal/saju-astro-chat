/**
 * Saju Analyzer - 사주 분석 모듈
 *
 * 대운/세운/월운/일진/용신/격국 분석을 담당합니다.
 */

import type { UserSajuProfile } from '../types';
import {
  calculateDaeunScore,
  calculateSeunScore,
  calculateWolunScore,
  calculateIljinScore,
  analyzeYongsin,
  analyzeGeokguk,
  type YongsinAnalysis,
} from '../temporal-scoring';

export interface SajuAnalysisResult {
  daeunAnalysis: ReturnType<typeof calculateDaeunScore>;
  seunAnalysis: ReturnType<typeof calculateSeunScore>;
  wolunAnalysis: ReturnType<typeof calculateWolunScore>;
  iljinAnalysis: ReturnType<typeof calculateIljinScore>;
  yongsinAnalysis: YongsinAnalysis;
  geokgukAnalysis: ReturnType<typeof analyzeGeokguk>;
}

export interface SajuAnalysisInput {
  dayMasterElement: string;
  dayBranch: string;
  dayMasterStem: string;
  sajuProfile: UserSajuProfile;
  ganzhi: { stem: string; branch: string };
  year: number;
  month: number;
  date: Date;
}

/**
 * 사주 분석 통합 함수
 */
export function analyzeSaju(input: SajuAnalysisInput): SajuAnalysisResult {
  const {
    dayMasterElement,
    dayBranch,
    dayMasterStem,
    sajuProfile,
    ganzhi,
    year,
    month,
    date,
  } = input;

  // 용신(用神) 분석 - 사주의 핵심 보완 오행
  const yongsinAnalysis = analyzeYongsin(sajuProfile.yongsin, ganzhi, date);

  // 격국(格局) 분석 - 사주 구조 유형
  const geokgukAnalysis = analyzeGeokguk(sajuProfile.geokguk, ganzhi, sajuProfile.pillars);

  // 대운(大運) 분석 - 10년 주기
  const daeunAnalysis = calculateDaeunScore(
    dayMasterElement,
    dayBranch,
    sajuProfile.daeunCycles,
    sajuProfile.birthYear,
    year
  );

  // 세운(歲運) 분석
  const seunAnalysis = calculateSeunScore(dayMasterElement, dayBranch, year);

  // 월운(月運) 분석
  const wolunAnalysis = calculateWolunScore(dayMasterElement, dayBranch, year, month);

  // 일진(日辰) 분석 - 일별 운세
  const iljinAnalysis = calculateIljinScore(dayMasterElement, dayMasterStem, dayBranch, ganzhi);

  return {
    daeunAnalysis,
    seunAnalysis,
    wolunAnalysis,
    iljinAnalysis,
    yongsinAnalysis,
    geokgukAnalysis,
  };
}
