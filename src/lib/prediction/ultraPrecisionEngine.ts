// src/lib/prediction/ultraPrecisionEngine.ts
// 초정밀 타이밍 엔진 - 일진 + 공망 + 신살 + 통근투출 + 실시간 트랜짓
// TIER 5: Planetary Hours + Lunar Mansions + 분 단위 분석
//
// 이 파일은 분할된 모듈들을 재내보내기합니다.
// 실제 구현은 다음 파일들에 있습니다:
// - ultra-precision-types.ts: 타입 정의
// - ultra-precision-constants.ts: 상수
// - ultra-precision-daily.ts: 일진/공망/신살/통근투출 분석
// - ultra-precision-minute.ts: 분 단위 초정밀 분석 (TIER 5)
// - ultra-precision-helpers.ts: 헬퍼 함수

import { scoreToGrade } from './index';

// ============================================================
// 타입 재내보내기
// ============================================================

export type {
  FiveElement,
  TwelveStage,
  DailyPillarAnalysis,
  GongmangAnalysis,
  ShinsalAnalysis,
  ShinsalHit,
  ShinsalRule,
  EnergyFlowAnalysis,
  TonggeunResult,
  TuechulResult,
  TransitIntegration,
  PlanetaryHour,
  MoonPhaseInfo,
  HourlyAdvice,
  UltraPrecisionScore,
  CalculateDailyScoreInput,
  MinutePrecisionResult,
} from './ultra-precision-types';

// ============================================================
// 상수 재내보내기
// ============================================================

export {
  STEMS,
  BRANCHES,
  HOUR_BRANCHES,
  HIDDEN_STEMS,
  BRANCH_MEANINGS,
  SIBSIN_SCORES,
  SHINSAL_RULES,
  PLANET_NAMES,
  DAY_PLANETS,
} from './ultra-precision-constants';

// ============================================================
// 일진/공망/신살/에너지 분석 재내보내기
// ============================================================

export {
  calculateDailyPillar,
  analyzeDailyPillar,
  calculateGongmang,
  analyzeGongmang,
  analyzeShinsal,
  analyzeTonggeun,
  analyzeTuechul,
  analyzeEnergyFlow,
  generateHourlyAdvice,
} from './ultra-precision-daily';

// ============================================================
// 분 단위 정밀 분석 재내보내기 (TIER 5)
// ============================================================

export {
  analyzeMinutePrecision,
  findOptimalMinutes,
  analyzeDayTimeSlots,
  getQuickMinuteScore,
} from './ultra-precision-minute';

// ============================================================
// 헬퍼 함수 재내보내기
// ============================================================

export {
  getStemElement,
  getPlanetaryHourPlanet,
} from './ultra-precision-helpers';

// ============================================================
// 종합 일별 점수 계산
// ============================================================

import type {
  UltraPrecisionScore,
  CalculateDailyScoreInput,
  TransitIntegration,
} from './ultra-precision-types';

import {
  analyzeDailyPillar,
  analyzeGongmang,
  analyzeShinsal,
  analyzeEnergyFlow,
  generateHourlyAdvice,
} from './ultra-precision-daily';

import { getPlanetaryHourPlanet } from './ultra-precision-helpers';

export function calculateUltraPrecisionScore(input: CalculateDailyScoreInput): UltraPrecisionScore {
  const { date, dayStem, dayBranch, monthBranch, yearBranch, allStems, allBranches, moonPhase } = input;
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 1. 일진 분석
  const dailyPillar = analyzeDailyPillar(date, dayStem, dayBranch, monthBranch, yearBranch);

  // 2. 공망 분석
  const gongmang = analyzeGongmang(dayStem, dayBranch, dailyPillar.branch);

  // 3. 신살 분석
  const shinsal = analyzeShinsal(dayBranch, dailyPillar.branch);

  // 4. 에너지 흐름 분석
  const allBranchesWithDaily = [...allBranches, dailyPillar.branch];
  const allStemsWithDaily = [...allStems, dailyPillar.stem];
  const energyFlow = analyzeEnergyFlow(dayStem, allStemsWithDaily, allBranchesWithDaily);

  // 5. 시간대별 조언
  const hourlyAdvice = generateHourlyAdvice(dailyPillar.stem, dailyPillar.branch);

  // 6. 트랜짓 통합 (간략화)
  const transitIntegration: TransitIntegration = {
    planetaryHour: {
      planet: getPlanetaryHourPlanet(date),
      quality: 'neutral',
      bestFor: ['일반 활동'],
    },
    moonPhase: moonPhase || {
      phase: 'unknown',
      illumination: 50,
      quality: 'growing',
      advice: '달 정보 없음',
    },
    retrogradeWarnings: [],
    aspectHighlights: [],
    score: 0,
  };

  // 7. 종합 점수 계산
  let totalScore = 50;
  totalScore += (dailyPillar.score - 50) * 0.4;  // 일진 40%
  totalScore += gongmang.score * 0.15;           // 공망 15%
  totalScore += shinsal.score * 0.2;             // 신살 20%
  totalScore += (energyFlow.score - 50) * 0.25;  // 에너지 25%

  totalScore = Math.max(0, Math.min(100, totalScore));

  // 8. 신뢰도 (데이터 완전성)
  const confidence = 75 + (allBranches.length * 2);

  // 9. 등급 (통일된 기준 사용)
  const grade = scoreToGrade(totalScore);

  // 10. 일 품질
  let dayQuality: UltraPrecisionScore['dayQuality'];
  if (totalScore >= 80) dayQuality = 'excellent';
  else if (totalScore >= 60) dayQuality = 'good';
  else if (totalScore >= 40) dayQuality = 'neutral';
  else if (totalScore >= 25) dayQuality = 'caution';
  else dayQuality = 'avoid';

  // 11. 활동 추천
  const themes: string[] = [dailyPillar.description];
  const bestActivities: string[] = [];
  const avoidActivities: string[] = [];

  if (dailyPillar.twelveStage.energy === 'peak') {
    bestActivities.push('중요 결정', '계약', '면접', '프로젝트 시작');
  } else if (dailyPillar.twelveStage.energy === 'rising') {
    bestActivities.push('계획 수립', '학습', '네트워킹');
  }

  if (gongmang.isToday空) {
    avoidActivities.push(...gongmang.affectedAreas.map(a => `${a} 관련 중요 결정`));
  }

  for (const s of shinsal.active) {
    if (s.type === 'lucky') {
      bestActivities.push(s.affectedArea);
    } else if (s.type === 'unlucky') {
      avoidActivities.push(s.affectedArea);
    }
  }

  if (shinsal.active.length > 0) {
    themes.push(shinsal.interpretation);
  }

  return {
    date,
    year,
    month,
    day,
    dailyPillar,
    gongmang,
    shinsal,
    energyFlow,
    transitIntegration,
    totalScore,
    confidence: Math.min(100, confidence),
    grade,
    dayQuality,
    themes,
    bestActivities: [...new Set(bestActivities)].slice(0, 5),
    avoidActivities: [...new Set(avoidActivities)].slice(0, 5),
    hourlyAdvice,
  };
}

// ============================================================
// 프롬프트 컨텍스트 생성
// ============================================================

export function generateUltraPrecisionPromptContext(
  scores: UltraPrecisionScore[],
  lang: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];

  if (lang === 'ko') {
    lines.push(`=== 초정밀 일별 타이밍 분석 (일진+공망+신살+통근투출) ===`);
    lines.push('');

    for (const s of scores) {
      lines.push(`【${s.month}/${s.day}】 ${s.grade}등급 (${Math.round(s.totalScore)}점) | ${s.dayQuality}`);
      lines.push(`  일진: ${s.dailyPillar.stem}${s.dailyPillar.branch} (${s.dailyPillar.sibsin}, ${s.dailyPillar.twelveStage.stage})`);

      if (s.gongmang.isToday空) {
        lines.push(`  ⚠️ 공망: ${s.gongmang.advice}`);
      }

      if (s.shinsal.active.length > 0) {
        const shinsalStr = s.shinsal.active.map(sh => `${sh.name}(${sh.type === 'lucky' ? '길' : sh.type === 'unlucky' ? '흉' : '특'})`).join(', ');
        lines.push(`  신살: ${shinsalStr}`);
      }

      lines.push(`  에너지: ${s.energyFlow.description}`);
      lines.push(`  추천: ${s.bestActivities.slice(0, 3).join(', ') || '특별 추천 없음'}`);
      if (s.avoidActivities.length > 0) {
        lines.push(`  주의: ${s.avoidActivities.slice(0, 2).join(', ')}`);
      }

      // 좋은 시간대
      const excellentHours = s.hourlyAdvice.filter(h => h.quality === 'excellent').map(h => `${h.hour}시`);
      if (excellentHours.length > 0) {
        lines.push(`  최적 시간: ${excellentHours.join(', ')}`);
      }

      lines.push('');
    }
  } else {
    lines.push(`=== Ultra-Precision Daily Timing (Iljin+Gongmang+Shinsal+Energy) ===`);
    lines.push('');

    for (const s of scores) {
      lines.push(`【${s.month}/${s.day}】 Grade ${s.grade} (${Math.round(s.totalScore)}) | ${s.dayQuality}`);
      lines.push(`  Daily: ${s.dailyPillar.stem}${s.dailyPillar.branch} (${s.dailyPillar.sibsin})`);
      if (s.gongmang.isToday空) {
        lines.push(`  ⚠️ Empty: ${s.gongmang.emptyBranches.join(', ')}`);
      }
      lines.push(`  Energy: ${s.energyFlow.energyStrength}`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ============================================================
// 주간 예측 생성
// ============================================================

export function generateWeeklyPrediction(
  startDate: Date,
  dayStem: string,
  dayBranch: string,
  monthBranch: string,
  yearBranch: string,
  allStems: string[],
  allBranches: string[]
): UltraPrecisionScore[] {
  const scores: UltraPrecisionScore[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    const score = calculateUltraPrecisionScore({
      date,
      dayStem,
      dayBranch,
      monthBranch,
      yearBranch,
      allStems,
      allBranches,
    });

    scores.push(score);
  }

  return scores;
}
