// src/app/api/saju/services/advancedAnalysis.ts
// 고급 분석 실행 함수들

import { logger } from '@/lib/logger';
import { determineGeokguk, getGeokgukDescription } from '@/lib/Saju/geokguk';
import {
  determineYongsin,
  getYongsinDescription,
  getLuckyColors,
  getLuckyDirection,
  getLuckyNumbers,
} from '@/lib/Saju/yongsin';
import { analyzeHyeongchung } from '@/lib/Saju/hyeongchung';
import { calculateTonggeun, calculateDeukryeong } from '@/lib/Saju/tonggeun';
import { getJohuYongsin } from '@/lib/Saju/johuYongsin';
import { analyzeSibsinComprehensive } from '@/lib/Saju/sibsinAnalysis';
import { analyzeHealth, analyzeCareer } from '@/lib/Saju/healthCareer';
import { generateComprehensiveReport } from '@/lib/Saju/comprehensiveReport';
import { calculateComprehensiveScore } from '@/lib/Saju/strengthScore';
import {
  getTwelveStageInterpretation,
  getElementInterpretation,
} from '@/lib/Saju/interpretations';
import type { SajuPillars, FiveElement } from '@/lib/Saju/types';
import { isFiveElement, isTwelveStageType } from './utilities';

export interface SimplePillars {
  year: { stem: string; branch: string };
  month: { stem: string; branch: string };
  day: { stem: string; branch: string };
  time: { stem: string; branch: string };
  hour: { stem: string; branch: string };
}

export interface PillarsWithHour {
  year: { stem: string; branch: string };
  month: { stem: string; branch: string };
  day: { stem: string; branch: string };
  hour: { stem: string; branch: string };
}

export interface AdvancedAnalysisResult {
  geokguk: ReturnType<typeof determineGeokguk> & { description: string } | null;
  yongsin: ReturnType<typeof determineYongsin> & {
    description: string;
    luckyColors: string[];
    luckyDirection: string;
    luckyNumbers: number[];
  } | null;
  hyeongchung: ReturnType<typeof analyzeHyeongchung> | null;
  tonggeun: ReturnType<typeof calculateTonggeun> | null;
  deukryeong: ReturnType<typeof calculateDeukryeong> | null;
  johuYongsin: ReturnType<typeof getJohuYongsin> | null;
  sibsin: ReturnType<typeof analyzeSibsinComprehensive> | null;
  health: ReturnType<typeof analyzeHealth> | null;
  career: ReturnType<typeof analyzeCareer> | null;
  score: ReturnType<typeof calculateComprehensiveScore> | null;
  report: ReturnType<typeof generateComprehensiveReport> | null;
  interpretations: {
    twelveStages: Record<string, ReturnType<typeof getTwelveStageInterpretation>>;
    elements: Record<string, ReturnType<typeof getElementInterpretation>>;
  };
}

/**
 * 고급 분석 실행
 */
export function performAdvancedAnalysis(
  simplePillars: SimplePillars,
  pillarsWithHour: PillarsWithHour,
  sajuPillars: SajuPillars,
  dayMasterStem: string,
  monthBranch: string,
  twelveStages: Record<string, string>,
  fiveElements: Record<string, number>
): AdvancedAnalysisResult {
  const result: AdvancedAnalysisResult = {
    geokguk: null,
    yongsin: null,
    hyeongchung: null,
    tonggeun: null,
    deukryeong: null,
    johuYongsin: null,
    sibsin: null,
    health: null,
    career: null,
    score: null,
    report: null,
    interpretations: { twelveStages: {}, elements: {} },
  };

  // 1. 격국 분석
  try {
    const geokguk = determineGeokguk(simplePillars);
    result.geokguk = {
      ...geokguk,
      description: getGeokgukDescription(geokguk.primary),
    };
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {logger.warn('[Saju API] Geokguk analysis failed:', e);}
  }

  // 2. 용신 분석
  try {
    const yongsin = determineYongsin(simplePillars);
    const luckyColors = getLuckyColors(yongsin.primaryYongsin);
    const luckyDirection = getLuckyDirection(yongsin.primaryYongsin);
    const luckyNumbers = getLuckyNumbers(yongsin.primaryYongsin);
    result.yongsin = {
      ...yongsin,
      description: getYongsinDescription(yongsin.primaryYongsin),
      luckyColors,
      luckyDirection,
      luckyNumbers,
    };
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {logger.warn('[Saju API] Yongsin analysis failed:', e);}
  }

  // 3. 형충회합 분석
  try {
    result.hyeongchung = analyzeHyeongchung(simplePillars);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {logger.warn('[Saju API] Hyeongchung analysis failed:', e);}
  }

  // 4. 통근/득령 분석
  try {
    result.tonggeun = calculateTonggeun(dayMasterStem, simplePillars);
    result.deukryeong = calculateDeukryeong(dayMasterStem, monthBranch);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {logger.warn('[Saju API] Tonggeun/Deukryeong analysis failed:', e);}
  }

  // 5. 조후용신 (궁통보감)
  try {
    result.johuYongsin = getJohuYongsin(dayMasterStem, monthBranch);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {logger.warn('[Saju API] JohuYongsin analysis failed:', e);}
  }

  // 6. 십신 종합 분석
  try {
    result.sibsin = analyzeSibsinComprehensive(pillarsWithHour);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {logger.warn('[Saju API] Sibsin analysis failed:', e);}
  }

  // 7. 건강 분석
  try {
    result.health = analyzeHealth(pillarsWithHour);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {logger.warn('[Saju API] Health analysis failed:', e);}
  }

  // 8. 직업 적성 분석
  try {
    result.career = analyzeCareer(pillarsWithHour);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {logger.warn('[Saju API] Career analysis failed:', e);}
  }

  // 9. 종합 점수
  try {
    result.score = calculateComprehensiveScore(sajuPillars);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {logger.warn('[Saju API] Comprehensive score failed:', e);}
  }

  // 10. 종합 리포트
  try {
    result.report = generateComprehensiveReport(pillarsWithHour);
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {logger.warn('[Saju API] Comprehensive report failed:', e);}
  }

  // 11. 해석 데이터 수집
  try {
    // 12운성 해석
    for (const [pillar, stage] of Object.entries(twelveStages)) {
      if (stage && typeof stage === 'string' && isTwelveStageType(stage)) {
        result.interpretations.twelveStages[pillar] = getTwelveStageInterpretation(stage);
      }
    }
    // 오행 해석
    for (const [elem, count] of Object.entries(fiveElements)) {
      const countValue = Number(count);
      if (countValue > 0 && isFiveElement(elem)) {
        result.interpretations.elements[elem] = getElementInterpretation(elem as FiveElement);
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {logger.warn('[Saju API] Interpretations failed:', e);}
  }

  return result;
}
