/**
 * @file Ultra Precision Minute Analysis (TIER 5)
 * 분 단위 초정밀 분석 - Planetary Hours + Lunar Mansions
 */

import { analyzeBranchInteractions } from './advancedTimingEngine';
import { scoreToGrade } from './index';
import { normalizeScore } from './utils/scoring-utils';
import {
  PrecisionEngine,
  getSolarTermForDate,
  getLunarMansion,
  getLunarPhase,
  calculatePlanetaryHours,
  type SolarTerm,
  type LunarMansion,
  type LunarPhase,
  type PlanetaryHour as PrecisionPlanetaryHour,
} from './precisionEngine';

import type {
  FiveElement,
  MinutePrecisionResult,
} from './ultra-precision-types';

import {
  STEMS,
  HOUR_BRANCHES,
  PLANET_NAMES,
} from './ultra-precision-constants';

// ============================================================
// 분 단위 정밀 분석
// ============================================================

/**
 * 특정 시간의 분 단위 정밀 분석
 */
export function analyzeMinutePrecision(
  datetime: Date,
  dayStem: string,
  dayBranch: string,
  yongsin?: FiveElement[],
  kisin?: FiveElement[]
): MinutePrecisionResult {
  const hour = datetime.getHours();
  const minute = datetime.getMinutes();

  // 1. 시간 지지 계산 (2시간 단위)
  const hourBranchIndex = Math.floor(((hour + 1) % 24) / 2);
  const hourBranch = HOUR_BRANCHES[hourBranchIndex];

  // 시간 천간 계산 (일간 기준)
  const dayStemIndex = STEMS.indexOf(dayStem);
  const hourStemStart = (dayStemIndex * 2) % 10;
  const hourStemIndex = (hourStemStart + hourBranchIndex) % 10;
  const hourStem = STEMS[hourStemIndex];

  // 2. 행성시 분석
  const planetaryHours = calculatePlanetaryHours(datetime);
  const currentPlanetaryHour = findCurrentPlanetaryHour(planetaryHours, datetime);

  // 3. 28수 분석
  const lunarMansion = getLunarMansion(datetime);

  // 4. 달 위상 분석
  const lunarDay = ((datetime.getDate() + 10) % 30) + 1; // 근사값
  const lunarPhase = getLunarPhase(lunarDay);
  const lunarPhaseName = PrecisionEngine.getLunarPhaseName(lunarPhase);

  // 5. 절기 분석
  const solarTerm = getSolarTermForDate(datetime);

  // 6. 종합 점수 계산
  let score = 50;
  const optimalActivities: string[] = [];
  const avoidActivities: string[] = [];

  // 시지-일지 상호작용
  const hourDayInteraction = analyzeBranchInteractions([dayBranch, hourBranch]);
  for (const inter of hourDayInteraction) {
    score += inter.score * 0.3;
    if (inter.impact === 'positive') {
      optimalActivities.push(`${inter.type} - ${inter.description.split('-')[0]}`);
    }
  }

  // 행성시 영향
  if (currentPlanetaryHour) {
    if (currentPlanetaryHour.quality === 'excellent') {
      score += 15;
      optimalActivities.push(...currentPlanetaryHour.goodFor.slice(0, 2));
    } else if (currentPlanetaryHour.quality === 'good') {
      score += 8;
      optimalActivities.push(...currentPlanetaryHour.goodFor.slice(0, 1));
    } else if (currentPlanetaryHour.quality === 'caution') {
      score -= 10;
      avoidActivities.push('중요 결정', '계약');
    }

    // 용신과 행성시 오행 조화
    if (yongsin?.includes(currentPlanetaryHour.element)) {
      score += 10;
      optimalActivities.push(`용신 ${currentPlanetaryHour.element} 활성화`);
    }
    if (kisin?.includes(currentPlanetaryHour.element)) {
      score -= 8;
      avoidActivities.push(`기신 ${currentPlanetaryHour.element} 주의`);
    }
  }

  // 28수 영향
  if (lunarMansion.isAuspicious) {
    score += 8;
    optimalActivities.push(...lunarMansion.goodFor.slice(0, 2));
  } else {
    score -= 5;
    avoidActivities.push(...lunarMansion.badFor.filter(b => b !== '대부분').slice(0, 2));
  }

  // 달 위상 영향
  if (lunarPhase === 'full_moon') {
    score += 5;
    optimalActivities.push('완성', '발표', '사교');
  } else if (lunarPhase === 'new_moon') {
    score += 3;
    optimalActivities.push('시작', '계획', '명상');
  }

  // 절기 에너지
  if (solarTerm.energy === 'yang') {
    optimalActivities.push('활동적 업무', '외부 활동');
  } else {
    optimalActivities.push('내부 작업', '정리', '휴식');
  }

  score = normalizeScore(score);

  // 등급 결정 (통일된 기준 사용)
  const grade = scoreToGrade(score);

  // 정밀 조언 생성
  const advice = generateMinuteAdvice(
    currentPlanetaryHour,
    lunarMansion,
    lunarPhase,
    solarTerm,
    score
  );

  return {
    datetime,
    hour,
    minute,
    hourBranch,
    hourStem,
    planetaryHour: currentPlanetaryHour ? {
      planet: currentPlanetaryHour.planet,
      element: currentPlanetaryHour.element,
      quality: currentPlanetaryHour.quality,
      goodFor: currentPlanetaryHour.goodFor,
      startTime: currentPlanetaryHour.startTime,
      endTime: currentPlanetaryHour.endTime,
      percentComplete: calculatePercentComplete(currentPlanetaryHour, datetime),
    } : {
      planet: 'Unknown',
      element: '토',
      quality: 'neutral',
      goodFor: [],
      startTime: datetime,
      endTime: datetime,
      percentComplete: 0,
    },
    lunarMansion: {
      name: lunarMansion.name,
      nameKo: lunarMansion.nameKo,
      element: lunarMansion.element,
      isAuspicious: lunarMansion.isAuspicious,
      goodFor: lunarMansion.goodFor,
      badFor: lunarMansion.badFor,
    },
    lunarPhase: {
      phase: lunarPhase,
      phaseName: lunarPhaseName,
      influence: getLunarInfluence(lunarPhase),
    },
    solarTerm: {
      nameKo: solarTerm.nameKo,
      element: solarTerm.element,
      energy: solarTerm.energy,
      seasonPhase: solarTerm.seasonPhase,
    },
    score,
    grade,
    optimalActivities: [...new Set(optimalActivities)].slice(0, 5),
    avoidActivities: [...new Set(avoidActivities)].slice(0, 3),
    advice,
  };
}

// ============================================================
// 헬퍼 함수들
// ============================================================

// 현재 행성시 찾기
function findCurrentPlanetaryHour(
  hours: PrecisionPlanetaryHour[],
  datetime: Date
): PrecisionPlanetaryHour | null {
  for (const h of hours) {
    if (datetime >= h.startTime && datetime < h.endTime) {
      return h;
    }
  }
  return hours[0] || null;
}

// 행성시 진행률 계산
function calculatePercentComplete(hour: PrecisionPlanetaryHour, datetime: Date): number {
  const total = hour.endTime.getTime() - hour.startTime.getTime();
  const elapsed = datetime.getTime() - hour.startTime.getTime();
  return Math.round((elapsed / total) * 100);
}

// 달 위상 영향력
function getLunarInfluence(phase: LunarPhase): 'strong' | 'moderate' | 'weak' {
  if (phase === 'full_moon' || phase === 'new_moon') return 'strong';
  if (phase === 'first_quarter' || phase === 'last_quarter') return 'moderate';
  return 'weak';
}

// 분 단위 조언 생성
function generateMinuteAdvice(
  planetaryHour: PrecisionPlanetaryHour | null,
  lunarMansion: LunarMansion,
  lunarPhase: LunarPhase,
  solarTerm: SolarTerm,
  score: number
): string {
  const parts: string[] = [];

  if (planetaryHour) {
    parts.push(`${PLANET_NAMES[planetaryHour.planet] || planetaryHour.planet}의 시간`);

    if (planetaryHour.quality === 'excellent') {
      parts.push('- 최적의 시간대입니다');
    } else if (planetaryHour.quality === 'caution') {
      parts.push('- 신중한 접근이 필요합니다');
    }
  }

  parts.push(`${lunarMansion.nameKo}수(${lunarMansion.name})`);

  if (lunarPhase === 'full_moon') {
    parts.push('보름달의 강한 에너지');
  } else if (lunarPhase === 'new_moon') {
    parts.push('새로운 시작에 적합');
  }

  parts.push(`${solarTerm.nameKo} 절기`);

  if (score >= 70) {
    parts.push('- 좋은 시간대입니다');
  } else if (score <= 40) {
    parts.push('- 주의가 필요합니다');
  }

  return parts.join(', ');
}

// ============================================================
// 최적 시간 찾기
// ============================================================

/**
 * 특정 시간 범위의 최적 시간 찾기
 */
export function findOptimalMinutes(
  date: Date,
  startHour: number,
  endHour: number,
  dayStem: string,
  dayBranch: string,
  activityType?: string,
  yongsin?: FiveElement[],
  kisin?: FiveElement[]
): { time: Date; score: number; reason: string }[] {
  const results: { time: Date; score: number; reason: string }[] = [];

  for (let hour = startHour; hour <= endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) { // 30분 간격
      const datetime = new Date(date);
      datetime.setHours(hour, minute, 0, 0);

      const analysis = analyzeMinutePrecision(datetime, dayStem, dayBranch, yongsin, kisin);

      // 활동 유형에 따른 필터링
      if (activityType) {
        if (!analysis.optimalActivities.some(a =>
          a.includes(activityType) || activityType.includes(a.split(' ')[0])
        )) {
          continue;
        }
      }

      if (analysis.score >= 60) {
        results.push({
          time: datetime,
          score: analysis.score,
          reason: `${analysis.planetaryHour.planet}시 | ${analysis.lunarMansion.nameKo}수 | ${analysis.grade}등급`,
        });
      }
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 10);
}

/**
 * 하루 중 최적/최악 시간대 분석
 */
export function analyzeDayTimeSlots(
  date: Date,
  dayStem: string,
  dayBranch: string,
  yongsin?: FiveElement[],
  kisin?: FiveElement[]
): {
  best: { hour: number; score: number; reason: string }[];
  worst: { hour: number; score: number; reason: string }[];
  byActivity: Record<string, { hour: number; score: number }[]>;
} {
  const hourlyScores: { hour: number; score: number; analysis: MinutePrecisionResult }[] = [];

  for (let hour = 0; hour < 24; hour++) {
    const datetime = new Date(date);
    datetime.setHours(hour, 30, 0, 0); // 매시 30분 기준

    const analysis = analyzeMinutePrecision(datetime, dayStem, dayBranch, yongsin, kisin);
    hourlyScores.push({ hour, score: analysis.score, analysis });
  }

  // 정렬
  const sorted = [...hourlyScores].sort((a, b) => b.score - a.score);

  // 최고/최저
  const best = sorted.slice(0, 5).map(h => ({
    hour: h.hour,
    score: h.score,
    reason: `${h.analysis.planetaryHour.planet}시, ${h.analysis.grade}등급`,
  }));

  const worst = sorted.slice(-3).reverse().map(h => ({
    hour: h.hour,
    score: h.score,
    reason: h.analysis.avoidActivities[0] || '에너지 저하',
  }));

  // 활동별 최적 시간
  const activities = ['리더십', '계약', '학습', '연애', '운동', '명상'];
  const byActivity: Record<string, { hour: number; score: number }[]> = {};

  for (const activity of activities) {
    byActivity[activity] = hourlyScores
      .filter(h => h.analysis.optimalActivities.some(a => a.includes(activity)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(h => ({ hour: h.hour, score: h.score }));
  }

  return { best, worst, byActivity };
}

/**
 * 특정 시간의 빠른 점수 조회
 */
export function getQuickMinuteScore(
  datetime: Date,
  dayStem: string,
  dayBranch: string
): { score: number; grade: string; advice: string } {
  const analysis = analyzeMinutePrecision(datetime, dayStem, dayBranch);
  return {
    score: analysis.score,
    grade: analysis.grade,
    advice: analysis.advice,
  };
}
