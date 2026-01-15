// tests/lib/prediction/lifePredictionEngine.test.ts
// 종합 인생 예측 엔진 테스트 - 다년간 트렌드 + 과거 회고 + 이벤트 타이밍

import { describe, it, expect } from 'vitest';
import {
  analyzeMultiYearTrend,
  analyzePastDate,
  analyzePastPeriod,
  findOptimalEventTiming,
  findWeeklyOptimalTiming,
  generateComprehensivePrediction,
  generateLifePredictionPromptContext,
  generateEventTimingPromptContext,
  generatePastAnalysisPromptContext,
  convertSajuDaeunToInfo,
  type LifePredictionInput,
  type DaeunInfo,
  type EventType,
} from '@/lib/prediction/lifePredictionEngine';

// ============================================================
// 테스트 데이터 헬퍼
// ============================================================

function createTestDaeunList(): DaeunInfo[] {
  return [
    { startAge: 0, endAge: 9, stem: '甲', branch: '寅', element: '목', yinYang: '양' },
    { startAge: 10, endAge: 19, stem: '乙', branch: '卯', element: '목', yinYang: '음' },
    { startAge: 20, endAge: 29, stem: '丙', branch: '辰', element: '화', yinYang: '양' },
    { startAge: 30, endAge: 39, stem: '丁', branch: '巳', element: '화', yinYang: '음' },
    { startAge: 40, endAge: 49, stem: '戊', branch: '午', element: '토', yinYang: '양' },
    { startAge: 50, endAge: 59, stem: '己', branch: '未', element: '토', yinYang: '음' },
    { startAge: 60, endAge: 69, stem: '庚', branch: '申', element: '금', yinYang: '양' },
    { startAge: 70, endAge: 79, stem: '辛', branch: '酉', element: '금', yinYang: '음' },
  ];
}

function createBasicInput(): LifePredictionInput {
  return {
    birthYear: 1990,
    birthMonth: 3,
    birthDay: 15,
    birthHour: 10,
    gender: 'male',
    dayStem: '甲',
    dayBranch: '子',
    monthBranch: '卯',
    yearBranch: '午',
    allStems: ['甲', '乙', '丙', '丁'],
    allBranches: ['子', '卯', '午', '酉'],
    daeunList: createTestDaeunList(),
    yongsin: ['목', '수'],
    kisin: ['금'],
  };
}

function createInputWithAstro(): LifePredictionInput {
  const basic = createBasicInput();
  return {
    ...basic,
    astroChart: {
      sun: { sign: 'Aries', house: 1, longitude: 25 },
      moon: { sign: 'Cancer', house: 4, longitude: 15 },
      venus: { sign: 'Taurus', house: 2, longitude: 10, isRetrograde: false },
      jupiter: { sign: 'Sagittarius', house: 9, longitude: 20, isRetrograde: false },
      mars: { sign: 'Capricorn', house: 10, longitude: 5, isRetrograde: false },
    },
    advancedAstro: {
      electional: {
        moonPhase: { phase: 'waxing_gibbous', illumination: 75 },
        retrograde: [],
      },
    },
  };
}

// ============================================================
// analyzeMultiYearTrend 테스트
// ============================================================

describe('lifePredictionEngine - analyzeMultiYearTrend', () => {
  it('should return multi-year trend analysis', () => {
    const input = createBasicInput();
    const startYear = 2020;
    const endYear = 2030;

    const result = analyzeMultiYearTrend(input, startYear, endYear);

    expect(result).toBeDefined();
    expect(result.startYear).toBe(startYear);
    expect(result.endYear).toBe(endYear);
    expect(result.yearlyScores).toBeDefined();
    expect(Array.isArray(result.yearlyScores)).toBe(true);
    expect(result.yearlyScores.length).toBe(endYear - startYear + 1);
  });

  it('should calculate yearly scores with proper structure', () => {
    const input = createBasicInput();
    const result = analyzeMultiYearTrend(input, 2024, 2026);

    for (const yearly of result.yearlyScores) {
      expect(yearly.year).toBeDefined();
      expect(yearly.age).toBeDefined();
      expect(yearly.score).toBeGreaterThanOrEqual(0);
      expect(yearly.score).toBeLessThanOrEqual(100);
      expect(yearly.grade).toBeDefined();
      expect(yearly.yearGanji).toBeDefined();
      expect(yearly.yearGanji.stem).toBeTruthy();
      expect(yearly.yearGanji.branch).toBeTruthy();
      expect(yearly.twelveStage).toBeDefined();
      expect(yearly.sibsin).toBeTruthy();
      expect(yearly.themes).toBeDefined();
      expect(Array.isArray(yearly.themes)).toBe(true);
      expect(yearly.opportunities).toBeDefined();
      expect(Array.isArray(yearly.opportunities)).toBe(true);
      expect(yearly.challenges).toBeDefined();
      expect(Array.isArray(yearly.challenges)).toBe(true);
    }
  });

  it('should identify overall trend', () => {
    const input = createBasicInput();
    const result = analyzeMultiYearTrend(input, 2024, 2034);

    expect(result.overallTrend).toBeDefined();
    expect(['ascending', 'descending', 'stable', 'volatile']).toContain(result.overallTrend);
  });

  it('should identify peak years', () => {
    const input = createBasicInput();
    const result = analyzeMultiYearTrend(input, 2024, 2034);

    expect(result.peakYears).toBeDefined();
    expect(Array.isArray(result.peakYears)).toBe(true);

    for (const year of result.peakYears) {
      expect(year).toBeGreaterThanOrEqual(2024);
      expect(year).toBeLessThanOrEqual(2034);
    }
  });

  it('should identify low years', () => {
    const input = createBasicInput();
    const result = analyzeMultiYearTrend(input, 2024, 2034);

    expect(result.lowYears).toBeDefined();
    expect(Array.isArray(result.lowYears)).toBe(true);
  });

  it('should identify daeun transitions', () => {
    const input = createBasicInput();
    const result = analyzeMultiYearTrend(input, 2024, 2034);

    expect(result.daeunTransitions).toBeDefined();
    expect(Array.isArray(result.daeunTransitions)).toBe(true);

    for (const transition of result.daeunTransitions) {
      expect(transition.year).toBeDefined();
      expect(transition.age).toBeDefined();
      expect(transition.fromDaeun).toBeDefined();
      expect(transition.toDaeun).toBeDefined();
      expect(transition.impact).toBeDefined();
      expect(transition.description).toBeTruthy();
    }
  });

  it('should identify life cycles', () => {
    const input = createBasicInput();
    const result = analyzeMultiYearTrend(input, 2024, 2044);

    expect(result.lifeCycles).toBeDefined();
    expect(Array.isArray(result.lifeCycles)).toBe(true);

    for (const cycle of result.lifeCycles) {
      expect(cycle.name).toBeTruthy();
      expect(cycle.startYear).toBeDefined();
      expect(cycle.endYear).toBeDefined();
      expect(cycle.startAge).toBeDefined();
      expect(cycle.endAge).toBeDefined();
      expect(cycle.theme).toBeTruthy();
      expect(['rising', 'peak', 'declining', 'dormant']).toContain(cycle.energy);
      expect(Array.isArray(cycle.recommendations)).toBe(true);
    }
  });

  it('should provide summary', () => {
    const input = createBasicInput();
    const result = analyzeMultiYearTrend(input, 2024, 2034);

    expect(result.summary).toBeTruthy();
    expect(typeof result.summary).toBe('string');
  });

  it('should handle single year range', () => {
    const input = createBasicInput();
    const result = analyzeMultiYearTrend(input, 2024, 2024);

    expect(result.yearlyScores.length).toBe(1);
    expect(result.yearlyScores[0].year).toBe(2024);
  });

  it('should handle input without daeun list', () => {
    const input = createBasicInput();
    delete input.daeunList;

    const result = analyzeMultiYearTrend(input, 2024, 2026);

    expect(result).toBeDefined();
    expect(result.yearlyScores.length).toBe(3);
  });
});

// ============================================================
// analyzePastDate 테스트
// ============================================================

describe('lifePredictionEngine - analyzePastDate', () => {
  it('should analyze a past date', () => {
    const input = createBasicInput();
    const targetDate = new Date(2020, 0, 15); // 2020-01-15

    const result = analyzePastDate(input, targetDate);

    expect(result).toBeDefined();
    expect(result.targetDate).toEqual(targetDate);
    expect(result.dailyPillar).toBeDefined();
    expect(result.dailyPillar.stem).toBeTruthy();
    expect(result.dailyPillar.branch).toBeTruthy();
  });

  it('should provide score and grade', () => {
    const input = createBasicInput();
    const targetDate = new Date(2020, 5, 20);

    const result = analyzePastDate(input, targetDate);

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.grade).toBeDefined();
    expect(['S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']).toContain(result.grade);
  });

  it('should calculate year and month ganji', () => {
    const input = createBasicInput();
    const targetDate = new Date(2020, 3, 10);

    const result = analyzePastDate(input, targetDate);

    expect(result.yearGanji).toBeDefined();
    expect(result.yearGanji.stem).toBeTruthy();
    expect(result.yearGanji.branch).toBeTruthy();
    expect(result.monthGanji).toBeDefined();
    expect(result.monthGanji.stem).toBeTruthy();
    expect(result.monthGanji.branch).toBeTruthy();
  });

  it('should provide twelve stage and sibsin', () => {
    const input = createBasicInput();
    const targetDate = new Date(2020, 6, 25);

    const result = analyzePastDate(input, targetDate);

    expect(result.twelveStage).toBeDefined();
    expect(result.twelveStage.stage).toBeTruthy();
    expect(result.twelveStage.score).toBeGreaterThanOrEqual(0);
    expect(result.sibsin).toBeTruthy();
  });

  it('should analyze branch interactions', () => {
    const input = createBasicInput();
    const targetDate = new Date(2021, 2, 5);

    const result = analyzePastDate(input, targetDate);

    expect(result.branchInteractions).toBeDefined();
    expect(Array.isArray(result.branchInteractions)).toBe(true);
  });

  it('should provide themes and explanations', () => {
    const input = createBasicInput();
    const targetDate = new Date(2019, 11, 31);

    const result = analyzePastDate(input, targetDate);

    expect(result.themes).toBeDefined();
    expect(Array.isArray(result.themes)).toBe(true);
    expect(result.whyItHappened).toBeDefined();
    expect(Array.isArray(result.whyItHappened)).toBe(true);
    expect(result.lessonsLearned).toBeDefined();
    expect(Array.isArray(result.lessonsLearned)).toBe(true);
  });

  it('should include TIER5 analysis when enabled', () => {
    const input = createBasicInput();
    const targetDate = new Date(2022, 4, 15);

    const result = analyzePastDate(input, targetDate, { enableTier5: true });

    expect(result.solarTerm).toBeDefined();
    expect(result.lunarMansion).toBeDefined();
    expect(result.causalFactors).toBeDefined();
    expect(Array.isArray(result.causalFactors)).toBe(true);
    expect(result.confidence).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('should provide event category scores when TIER5 enabled', () => {
    const input = createBasicInput();
    const targetDate = new Date(2022, 7, 20);

    const result = analyzePastDate(input, targetDate, { enableTier5: true });

    if (result.eventCategoryScores) {
      expect(result.eventCategoryScores.career).toBeGreaterThanOrEqual(0);
      expect(result.eventCategoryScores.career).toBeLessThanOrEqual(100);
      expect(result.eventCategoryScores.finance).toBeGreaterThanOrEqual(0);
      expect(result.eventCategoryScores.relationship).toBeGreaterThanOrEqual(0);
      expect(result.eventCategoryScores.health).toBeGreaterThanOrEqual(0);
      expect(result.eventCategoryScores.travel).toBeGreaterThanOrEqual(0);
      expect(result.eventCategoryScores.education).toBeGreaterThanOrEqual(0);
    }
  });

  it('should provide detailed analysis when TIER5 enabled', () => {
    const input = createBasicInput();
    const targetDate = new Date(2021, 9, 10);

    const result = analyzePastDate(input, targetDate, { enableTier5: true });

    if (result.detailedAnalysis) {
      expect(result.detailedAnalysis.career).toBeDefined();
      expect(result.detailedAnalysis.career.score).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.detailedAnalysis.career.factors)).toBe(true);
      expect(Array.isArray(result.detailedAnalysis.career.whyHappened)).toBe(true);

      expect(result.detailedAnalysis.finance).toBeDefined();
      expect(result.detailedAnalysis.relationship).toBeDefined();
      expect(result.detailedAnalysis.health).toBeDefined();
    }
  });

  it('should handle dates with astrological data', () => {
    const input = createInputWithAstro();
    const targetDate = new Date(2023, 1, 14);

    const result = analyzePastDate(input, targetDate, { enableTier5: true });

    expect(result).toBeDefined();
    expect(result.score).toBeDefined();
  });

  it('should handle very old dates', () => {
    const input = createBasicInput();
    const targetDate = new Date(1950, 0, 1);

    const result = analyzePastDate(input, targetDate);

    expect(result).toBeDefined();
    expect(result.dailyPillar).toBeDefined();
  });

  it('should handle dates close to birth', () => {
    const input = createBasicInput();
    const targetDate = new Date(1990, 2, 20); // Close to birth date

    const result = analyzePastDate(input, targetDate);

    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================
// analyzePastPeriod 테스트
// ============================================================

describe('lifePredictionEngine - analyzePastPeriod', () => {
  it('should analyze past period with multiple dates', () => {
    const input = createBasicInput();
    const startDate = new Date(2020, 0, 1);
    const endDate = new Date(2020, 2, 31);

    const results = analyzePastPeriod(input, startDate, endDate);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should respect sampleSize parameter', () => {
    const input = createBasicInput();
    const startDate = new Date(2020, 0, 1);
    const endDate = new Date(2020, 11, 31); // Full year
    const sampleSize = 5;

    const results = analyzePastPeriod(input, startDate, endDate, { sampleSize });

    expect(results.length).toBeLessThanOrEqual(sampleSize);
  });

  it('should analyze all dates when sampleSize not specified', () => {
    const input = createBasicInput();
    const startDate = new Date(2020, 0, 1);
    const endDate = new Date(2020, 0, 7); // 7 days

    const results = analyzePastPeriod(input, startDate, endDate);

    expect(results.length).toBe(7);
  });

  it('should handle single day period', () => {
    const input = createBasicInput();
    const date = new Date(2020, 5, 15);

    const results = analyzePastPeriod(input, date, date);

    expect(results.length).toBe(1);
  });

  it('should enable TIER5 when specified', () => {
    const input = createBasicInput();
    const startDate = new Date(2021, 0, 1);
    const endDate = new Date(2021, 0, 10);

    const results = analyzePastPeriod(input, startDate, endDate, {
      enableTier5: true,
      sampleSize: 3,
    });

    for (const result of results) {
      expect(result.solarTerm).toBeDefined();
      expect(result.confidence).toBeDefined();
    }
  });
});

// ============================================================
// findOptimalEventTiming 테스트
// ============================================================

describe('lifePredictionEngine - findOptimalEventTiming', () => {
  const eventTypes: EventType[] = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];

  it('should find optimal timing for marriage', () => {
    const input = createBasicInput();
    const result = findOptimalEventTiming(input, 'marriage', 2024, 2026);

    expect(result).toBeDefined();
    expect(result.eventType).toBe('marriage');
    expect(result.searchRange.startYear).toBe(2024);
    expect(result.searchRange.endYear).toBe(2026);
    expect(result.optimalPeriods).toBeDefined();
    expect(Array.isArray(result.optimalPeriods)).toBe(true);
    expect(result.advice).toBeTruthy();
  });

  eventTypes.forEach(eventType => {
    it(`should handle ${eventType} event type`, () => {
      const input = createBasicInput();
      const result = findOptimalEventTiming(input, eventType, 2024, 2025);

      expect(result.eventType).toBe(eventType);
      expect(result.optimalPeriods).toBeDefined();
      expect(result.avoidPeriods).toBeDefined();
    });
  });

  it('should provide optimal periods with proper structure', () => {
    const input = createBasicInput();
    const result = findOptimalEventTiming(input, 'career', 2024, 2025);

    for (const period of result.optimalPeriods) {
      expect(period.startDate).toBeInstanceOf(Date);
      expect(period.endDate).toBeInstanceOf(Date);
      expect(period.score).toBeGreaterThanOrEqual(0);
      expect(period.score).toBeLessThanOrEqual(100);
      expect(period.grade).toBeDefined();
      expect(period.reasons).toBeDefined();
      expect(Array.isArray(period.reasons)).toBe(true);
      expect(period.startDate <= period.endDate).toBe(true);
    }
  });

  it('should provide avoid periods', () => {
    const input = createBasicInput();
    const result = findOptimalEventTiming(input, 'investment', 2024, 2025);

    expect(result.avoidPeriods).toBeDefined();
    expect(Array.isArray(result.avoidPeriods)).toBe(true);

    for (const period of result.avoidPeriods) {
      expect(period.startDate).toBeInstanceOf(Date);
      expect(period.endDate).toBeInstanceOf(Date);
      expect(period.score).toBeLessThan(50); // Avoid periods should have low scores
      expect(period.reasons).toBeDefined();
    }
  });

  it('should identify next best window', () => {
    const input = createBasicInput();
    const result = findOptimalEventTiming(input, 'marriage', 2024, 2027);

    if (result.nextBestWindow) {
      expect(result.nextBestWindow.startDate).toBeInstanceOf(Date);
      expect(result.nextBestWindow.score).toBeGreaterThan(60);
      expect(result.nextBestWindow.reasons.length).toBeGreaterThan(0);
    }
  });

  it('should consider astrology data when available', () => {
    const input = createInputWithAstro();
    const result = findOptimalEventTiming(input, 'marriage', 2024, 2025);

    expect(result).toBeDefined();
    expect(result.optimalPeriods.length).toBeGreaterThan(0);
  });

  it('should work with yongsin and kisin', () => {
    const input = createBasicInput();
    input.yongsin = ['목', '화'];
    input.kisin = ['금'];

    const result = findOptimalEventTiming(input, 'career', 2024, 2025);

    expect(result).toBeDefined();
    expect(result.optimalPeriods.length).toBeGreaterThan(0);
  });

  it('should handle single year range', () => {
    const input = createBasicInput();
    const result = findOptimalEventTiming(input, 'study', 2024, 2024);

    expect(result.searchRange.startYear).toBe(2024);
    expect(result.searchRange.endYear).toBe(2024);
    expect(result.optimalPeriods).toBeDefined();
  });

  it('should handle long time range', () => {
    const input = createBasicInput();
    const result = findOptimalEventTiming(input, 'career', 2024, 2034);

    expect(result.searchRange.endYear - result.searchRange.startYear).toBe(10);
    expect(result.optimalPeriods.length).toBeGreaterThan(0);
  });
});

// ============================================================
// findWeeklyOptimalTiming 테스트
// ============================================================

describe('lifePredictionEngine - findWeeklyOptimalTiming', () => {
  it('should find weekly optimal timing', () => {
    const input = createBasicInput();
    const startDate = new Date(2024, 0, 1);

    const result = findWeeklyOptimalTiming(input, 'career', startDate, 4);

    expect(result).toBeDefined();
    expect(result.eventType).toBe('career');
    expect(result.searchWeeks).toBe(4);
    expect(result.weeklyPeriods).toBeDefined();
    expect(Array.isArray(result.weeklyPeriods)).toBe(true);
  });

  it('should analyze multiple weeks', () => {
    const input = createBasicInput();
    const startDate = new Date(2024, 0, 1);
    const weeks = 8;

    const result = findWeeklyOptimalTiming(input, 'investment', startDate, weeks);

    expect(result.weeklyPeriods.length).toBe(weeks);
  });

  it('should provide weekly period structure', () => {
    const input = createBasicInput();
    const startDate = new Date(2024, 0, 1);

    const result = findWeeklyOptimalTiming(input, 'marriage', startDate, 4);

    for (const period of result.weeklyPeriods) {
      expect(period.weekNumber).toBeDefined();
      expect(period.startDate).toBeInstanceOf(Date);
      expect(period.endDate).toBeInstanceOf(Date);
      expect(period.averageScore).toBeGreaterThanOrEqual(0);
      expect(period.averageScore).toBeLessThanOrEqual(100);
      expect(period.bestDay).toBeInstanceOf(Date);
      expect(period.bestDayScore).toBeGreaterThanOrEqual(0);
      expect(period.grade).toBeDefined();
      expect(period.summary).toBeTruthy();
    }
  });

  it('should identify best week', () => {
    const input = createBasicInput();
    const startDate = new Date(2024, 0, 1);

    const result = findWeeklyOptimalTiming(input, 'career', startDate, 4);

    if (result.bestWeek) {
      expect(result.bestWeek.weekNumber).toBeDefined();
      expect(result.bestWeek.averageScore).toBeGreaterThan(0);
    }
  });

  it('should provide overall advice', () => {
    const input = createBasicInput();
    const startDate = new Date(2024, 0, 1);

    const result = findWeeklyOptimalTiming(input, 'study', startDate, 4);

    expect(result.overallAdvice).toBeTruthy();
    expect(typeof result.overallAdvice).toBe('string');
  });

  it('should handle single week', () => {
    const input = createBasicInput();
    const startDate = new Date(2024, 0, 1);

    const result = findWeeklyOptimalTiming(input, 'health', startDate, 1);

    expect(result.weeklyPeriods.length).toBe(1);
  });
});

// ============================================================
// generateComprehensivePrediction 테스트
// ============================================================

describe('lifePredictionEngine - generateComprehensivePrediction', () => {
  it('should generate comprehensive prediction', () => {
    const input = createBasicInput();
    const result = generateComprehensivePrediction(input);

    expect(result).toBeDefined();
    expect(result.input).toEqual(input);
    expect(result.generatedAt).toBeInstanceOf(Date);
    expect(result.multiYearTrend).toBeDefined();
    expect(result.upcomingHighlights).toBeDefined();
    expect(Array.isArray(result.upcomingHighlights)).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('should include multi-year trend', () => {
    const input = createBasicInput();
    const result = generateComprehensivePrediction(input);

    expect(result.multiYearTrend.yearlyScores).toBeDefined();
    expect(result.multiYearTrend.overallTrend).toBeDefined();
    expect(result.multiYearTrend.peakYears).toBeDefined();
    expect(result.multiYearTrend.lowYears).toBeDefined();
  });

  it('should provide upcoming highlights', () => {
    const input = createBasicInput();
    const result = generateComprehensivePrediction(input);

    for (const highlight of result.upcomingHighlights) {
      expect(['peak', 'transition', 'challenge', 'opportunity']).toContain(highlight.type);
      expect(highlight.date).toBeInstanceOf(Date);
      expect(highlight.title).toBeTruthy();
      expect(highlight.description).toBeTruthy();
      expect(highlight.score).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(highlight.actionItems)).toBe(true);
    }
  });

  it('should include lifeSync when daeun available', () => {
    const input = createBasicInput();
    const result = generateComprehensivePrediction(input);

    if (input.daeunList && input.daeunList.length > 0) {
      expect(result.lifeSync).toBeDefined();
    }
  });

  it('should work with astrology data', () => {
    const input = createInputWithAstro();
    const result = generateComprehensivePrediction(input);

    expect(result).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('should handle custom year range', () => {
    const input = createBasicInput();
    const startYear = 2025;
    const endYear = 2030;

    const result = generateComprehensivePrediction(input, { startYear, endYear });

    expect(result.multiYearTrend.startYear).toBe(startYear);
    expect(result.multiYearTrend.endYear).toBe(endYear);
  });
});

// ============================================================
// 프롬프트 생성 테스트
// ============================================================

describe('lifePredictionEngine - prompt context generation', () => {
  it('should generate life prediction prompt in Korean', () => {
    const input = createBasicInput();
    const prediction = generateComprehensivePrediction(input);
    const context = generateLifePredictionPromptContext(prediction);

    expect(context).toBeTruthy();
    expect(typeof context).toBe('string');
    expect(context).toContain('인생 예측');
    expect(context).toContain('년');
  });

  it('should generate life prediction prompt in English', () => {
    const input = createBasicInput();
    const prediction = generateComprehensivePrediction(input);
    const context = generateLifePredictionPromptContext(prediction, 'en');

    expect(context).toBeTruthy();
    expect(context).toContain('Life Prediction');
    expect(context).toContain('year');
  });

  it('should generate event timing prompt in Korean', () => {
    const input = createBasicInput();
    const timing = findOptimalEventTiming(input, 'marriage', 2024, 2026);
    const context = generateEventTimingPromptContext(timing);

    expect(context).toBeTruthy();
    expect(context).toContain('최적 타이밍');
    expect(context).toContain('marriage');
  });

  it('should generate event timing prompt in English', () => {
    const input = createBasicInput();
    const timing = findOptimalEventTiming(input, 'career', 2024, 2025);
    const context = generateEventTimingPromptContext(timing, 'en');

    expect(context).toBeTruthy();
    expect(context).toContain('Optimal Timing');
  });

  it('should generate past analysis prompt in Korean', () => {
    const input = createBasicInput();
    const past = analyzePastDate(input, new Date(2020, 0, 15));
    const context = generatePastAnalysisPromptContext(past);

    expect(context).toBeTruthy();
    expect(context).toContain('과거 분석');
    expect(context).toContain('점수');
  });

  it('should generate past analysis prompt in English', () => {
    const input = createBasicInput();
    const past = analyzePastDate(input, new Date(2020, 0, 15));
    const context = generatePastAnalysisPromptContext(past, 'en');

    expect(context).toBeTruthy();
    expect(context).toContain('Past Analysis');
  });
});

// ============================================================
// convertSajuDaeunToInfo 테스트
// ============================================================

describe('lifePredictionEngine - convertSajuDaeunToInfo', () => {
  it('should convert raw daeun to DaeunInfo', () => {
    const rawDaeun = [
      { startAge: 0, stem: '甲', branch: '子' },
      { startAge: 10, stem: '乙', branch: '丑' },
      { startAge: 20, stem: '丙', branch: '寅' },
    ];

    const result = convertSajuDaeunToInfo(rawDaeun);

    expect(result.length).toBe(3);
    expect(result[0].element).toBe('목');
    expect(result[0].yinYang).toBe('양');
    expect(result[1].element).toBe('목');
    expect(result[2].element).toBe('화');
  });

  it('should handle alternative property names', () => {
    const rawDaeun = [
      { age: 5, heavenlyStem: '庚', earthlyBranch: '申' },
      { age: 15, heavenlyStem: '辛', earthlyBranch: '酉' },
    ];

    const result = convertSajuDaeunToInfo(rawDaeun);

    expect(result.length).toBe(2);
    expect(result[0].startAge).toBe(5);
    expect(result[0].stem).toBe('庚');
    expect(result[0].branch).toBe('申');
    expect(result[0].element).toBe('금');
  });
});

// ============================================================
// 엣지 케이스 테스트
// ============================================================

describe('lifePredictionEngine - edge cases', () => {
  it('should handle missing optional fields', () => {
    const input: LifePredictionInput = {
      birthYear: 1990,
      birthMonth: 3,
      birthDay: 15,
      gender: 'female',
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '卯',
      yearBranch: '午',
      allStems: ['甲', '乙'],
      allBranches: ['子', '卯'],
    };

    const result = generateComprehensivePrediction(input);

    expect(result).toBeDefined();
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it('should handle empty arrays', () => {
    const input = createBasicInput();
    input.yongsin = [];
    input.kisin = [];

    const result = generateComprehensivePrediction(input);

    expect(result).toBeDefined();
  });

  it('should handle very young age', () => {
    const input = createBasicInput();
    input.birthYear = 2020;

    const result = analyzeMultiYearTrend(input, 2024, 2026);

    expect(result).toBeDefined();
    expect(result.yearlyScores.length).toBeGreaterThan(0);
  });

  it('should handle very old age', () => {
    const input = createBasicInput();
    input.birthYear = 1940;

    const result = analyzeMultiYearTrend(input, 2024, 2026);

    expect(result).toBeDefined();
  });

  it('should handle date at year boundary', () => {
    const input = createBasicInput();
    const targetDate = new Date(2020, 0, 1); // January 1

    const result = analyzePastDate(input, targetDate);

    expect(result).toBeDefined();
    expect(result.dailyPillar).toBeDefined();
  });

  it('should handle leap year dates', () => {
    const input = createBasicInput();
    const targetDate = new Date(2020, 1, 29); // Feb 29, 2020

    const result = analyzePastDate(input, targetDate);

    expect(result).toBeDefined();
  });
});
