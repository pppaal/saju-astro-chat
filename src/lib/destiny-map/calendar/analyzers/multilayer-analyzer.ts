/**
 * Multi-Layer Analyzer - 다층 레이어 분석 모듈
 *
 * 대운+세운+월운 레이어 상호작용 분석을 담당합니다.
 */

import type { UserSajuProfile } from '../types';
import {
  analyzeMultiLayer,
  calculatePreciseTwelveStage,
  calculateYearlyGanji,
  calculateMonthlyGanji as advancedMonthlyGanji,
  type BranchInteraction,
} from '@/lib/prediction/advancedTimingEngine';
import { logger } from '@/lib/logger';

export interface MultiLayerAnalysisResult {
  advancedMultiLayerScore: number;
  advancedBranchInteractions: BranchInteraction[];
}

export interface MultiLayerAnalysisInput {
  dayMasterStem: string;
  dayBranch: string;
  sajuProfile: UserSajuProfile;
  year: number;
  month: number;
}

/**
 * 고급 다층 레이어 분석
 *
 * 대운+세운+월운의 상호작용 및 12운성 에너지를 분석합니다.
 */
export function analyzeMultiLayer(input: MultiLayerAnalysisInput): MultiLayerAnalysisResult {
  const { dayMasterStem, dayBranch, sajuProfile, year, month } = input;

  let advancedMultiLayerScore = 0;
  let advancedBranchInteractions: BranchInteraction[] = [];

  if (!dayMasterStem || !dayBranch) {
    return { advancedMultiLayerScore, advancedBranchInteractions };
  }

  try {
    // 세운/월운 간지 계산
    const advSaeun = calculateYearlyGanji(year);
    const advWolun = advancedMonthlyGanji(year, month);

    // 대운 정보 추출
    let daeunInfo: { stem: string; branch: string } | undefined;
    if (sajuProfile.daeunCycles?.length && sajuProfile.birthYear) {
      const currentAge = year - sajuProfile.birthYear;
      const sortedDaeuns = [...sajuProfile.daeunCycles].sort((a, b) => a.age - b.age);
      const currentDaeun = sortedDaeuns.find((d, idx) => {
        const nextDaeun = sortedDaeuns[idx + 1];
        if (nextDaeun) {
          return currentAge >= d.age && currentAge < nextDaeun.age;
        }
        return currentAge >= d.age;
      });

      if (currentDaeun?.heavenlyStem && currentDaeun.earthlyBranch) {
        daeunInfo = {
          stem: currentDaeun.heavenlyStem,
          branch: currentDaeun.earthlyBranch,
        };
      }
    }

    // 다층 레이어 분석
    const multiLayerResult = analyzeMultiLayer({
      dayStem: dayMasterStem,
      dayBranch: dayBranch,
      daeun: daeunInfo,
      saeun: advSaeun,
      wolun: advWolun,
    });

    // 레이어 상호작용 점수 합산
    for (const interaction of multiLayerResult.interactions) {
      advancedMultiLayerScore += interaction.scoreModifier * 0.3;
    }

    // 지지 상호작용 분석
    advancedBranchInteractions = multiLayerResult.branchInteractions;
    for (const bInter of advancedBranchInteractions) {
      advancedMultiLayerScore += bInter.score * 0.25;
    }

    // 정밀 12운성 분석
    const preciseStage = calculatePreciseTwelveStage(dayMasterStem, advWolun.branch);

    // 12운성 에너지 단계에 따른 보너스/페널티
    if (preciseStage.energy === 'peak') {
      advancedMultiLayerScore += 8;
    } else if (preciseStage.energy === 'rising') {
      advancedMultiLayerScore += 4;
    } else if (preciseStage.energy === 'declining') {
      advancedMultiLayerScore -= 2;
    } else if (preciseStage.energy === 'dormant') {
      advancedMultiLayerScore -= 5;
    }
  } catch (err) {
    logger.warn('[MultiLayerAnalyzer] Analysis failed:', err);
  }

  return { advancedMultiLayerScore, advancedBranchInteractions };
}
