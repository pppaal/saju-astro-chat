/**
 * Advanced Predictor - 고급 예측 분석 모듈
 *
 * 공망/신살/에너지/시간대/대운-트랜짓 동기화 분석을 담당합니다.
 */

import type { UserSajuProfile } from '../types';
import {
  calculateDailyPillar,
  analyzeGongmang,
  analyzeShinsal,
  analyzeEnergyFlow,
  generateHourlyAdvice,
} from '@/lib/prediction/ultraPrecisionEngine';
import {
  analyzeDaeunTransitSync,
  convertSajuDaeunToInfo,
} from '@/lib/prediction/daeunTransitSync';

export interface AdvancedPredictionResult {
  dailyPillar: ReturnType<typeof calculateDailyPillar>;
  gongmangStatus: {
    isEmpty: boolean;
    emptyBranches: string[];
    affectedAreas: string[];
  };
  shinsalActive: {
    name: string;
    type: 'lucky' | 'unlucky' | 'special';
    affectedArea: string;
  }[];
  energyFlow: {
    strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak';
    dominantElement: string;
    tonggeunCount: number;
    tuechulCount: number;
  };
  bestHours: {
    hour: number;
    siGan: string;
    quality: 'excellent' | 'good' | 'neutral' | 'caution';
  }[];
  transitSync: {
    isMajorTransitYear: boolean;
    transitType?: string;
    synergyType?: 'amplify' | 'clash' | 'balance' | 'neutral';
    synergyScore?: number;
  };
}

export interface AdvancedPredictionInput {
  date: Date;
  year: number;
  sajuProfile: UserSajuProfile;
  dayMasterStem: string;
  dayBranch: string;
}

/**
 * 고급 예측 분석 통합 함수
 */
export function analyzeAdvancedPrediction(input: AdvancedPredictionInput): AdvancedPredictionResult {
  const { date, year, sajuProfile, dayMasterStem, dayBranch } = input;

  // 1. 일진 간지 계산
  const dailyPillar = calculateDailyPillar(date);
  const dayStem = dayMasterStem || dailyPillar.stem;
  const effectiveDayBranch = dayBranch || dailyPillar.branch;

  // 2. 공망(空亡) 분석
  const gongmangResult = analyzeGongmang(dayStem, effectiveDayBranch, dailyPillar.branch);
  const gongmangStatus = {
    isEmpty: gongmangResult.isToday空,
    emptyBranches: gongmangResult.emptyBranches,
    affectedAreas: gongmangResult.affectedAreas,
  };

  // 3. 신살(神煞) 분석
  const shinsalResult = analyzeShinsal(effectiveDayBranch, dailyPillar.branch);
  const shinsalActive = shinsalResult.active.map(s => ({
    name: s.name,
    type: s.type,
    affectedArea: s.affectedArea,
  }));

  // 4. 에너지 흐름 분석 (통근/투출)
  const allStems = sajuProfile.pillars
    ? [
        sajuProfile.pillars.year?.stem,
        sajuProfile.pillars.month?.stem,
        sajuProfile.pillars.day?.stem,
        sajuProfile.pillars.time?.stem,
      ].filter(Boolean) as string[]
    : [dayStem];

  const allBranches = sajuProfile.pillars
    ? [
        sajuProfile.pillars.year?.branch,
        sajuProfile.pillars.month?.branch,
        sajuProfile.pillars.day?.branch,
        sajuProfile.pillars.time?.branch,
      ].filter(Boolean) as string[]
    : [effectiveDayBranch];

  const energyResult = analyzeEnergyFlow(dayStem, allStems, allBranches);
  const energyFlow = {
    strength: energyResult.energyStrength as 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak',
    dominantElement: energyResult.dominantElement,
    tonggeunCount: energyResult.tonggeun.length,
    tuechulCount: energyResult.tuechul.length,
  };

  // 5. 최적 시간대 분석
  const hourlyAdvice = generateHourlyAdvice(dayStem, effectiveDayBranch);
  const bestHours = hourlyAdvice
    .filter(h => h.quality === 'excellent' || h.quality === 'good')
    .slice(0, 4)
    .map(h => ({
      hour: h.hour,
      siGan: h.siGan,
      quality: h.quality,
    }));

  // 6. 대운-트랜짓 동기화 분석
  let transitSync: AdvancedPredictionResult['transitSync'] = {
    isMajorTransitYear: false,
  };

  if (sajuProfile.birthYear && sajuProfile.daeunCycles?.length) {
    const daeunInfo = convertSajuDaeunToInfo(sajuProfile.daeunCycles);
    const currentAge = year - sajuProfile.birthYear;
    const syncAnalysis = analyzeDaeunTransitSync(daeunInfo, sajuProfile.birthYear, currentAge);

    const majorTransitionForYear = syncAnalysis.majorTransitions.find(
      (t: { year: number }) => t.year === year
    );

    if (majorTransitionForYear) {
      const primaryTransit = majorTransitionForYear.transits[0];
      transitSync = {
        isMajorTransitYear: true,
        transitType: primaryTransit?.type || 'daeun_transition',
        synergyType: majorTransitionForYear.synergyType,
        synergyScore: majorTransitionForYear.synergyScore,
      };
    }
  }

  return {
    dailyPillar,
    gongmangStatus,
    shinsalActive,
    energyFlow,
    bestHours,
    transitSync,
  };
}
