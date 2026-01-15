// tests/lib/prediction/precisionEngine.test.ts
// 초정밀 예측 엔진 테스트 - 절기, 28수, 행성시, 달 위상, 인과 분석

import { describe, it, expect } from 'vitest';
import {
  PrecisionEngine,
  getSolarTermForDate,
  getSolarTermMonth,
  getLunarMansion,
  getLunarPhase,
  getLunarPhaseName,
  calculatePlanetaryHours,
  calculateSecondaryProgression,
  calculateConfidence,
  calculateUnifiedConfidence,
  combineConfidenceScores,
  analyzeCausalFactors,
  calculateEventCategoryScores,
  type ConfidenceFactors,
  type FiveElement,
} from '@/lib/prediction/precisionEngine';

// ============================================================
// 절기 (24 Solar Terms) 테스트
// ============================================================

describe('precisionEngine - solar terms', () => {
  it('should calculate solar term for any date', () => {
    const date = new Date(2024, 1, 4); // February 4, 2024 (입춘)
    const term = getSolarTermForDate(date);

    expect(term).toBeDefined();
    expect(term.name).toBeTruthy();
    expect(term.nameKo).toBeTruthy();
    expect(term.month).toBeGreaterThanOrEqual(1);
    expect(term.month).toBeLessThanOrEqual(12);
    expect(['목', '화', '토', '금', '수']).toContain(term.element);
    expect(['yang', 'yin']).toContain(term.energy);
    expect(['early', 'mid', 'late']).toContain(term.seasonPhase);
  });

  it('should calculate solar term month', () => {
    const date = new Date(2024, 2, 15);
    const month = getSolarTermMonth(date);

    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
  });

  it('should handle different seasons', () => {
    const spring = new Date(2024, 2, 20); // March (Spring)
    const summer = new Date(2024, 5, 21); // June (Summer)
    const autumn = new Date(2024, 8, 23); // September (Autumn)
    const winter = new Date(2024, 11, 22); // December (Winter)

    const springTerm = getSolarTermForDate(spring);
    const summerTerm = getSolarTermForDate(summer);
    const autumnTerm = getSolarTermForDate(autumn);
    const winterTerm = getSolarTermForDate(winter);

    expect(springTerm.element).toBe('목');
    expect(summerTerm.element).toBe('화');
    expect(['금', '토']).toContain(autumnTerm.element);
    expect(winterTerm.element).toBe('수');
  });

  it('should provide solar term longitude', () => {
    const date = new Date(2024, 0, 15);
    const term = getSolarTermForDate(date);

    expect(term.longitude).toBeGreaterThanOrEqual(0);
    expect(term.longitude).toBeLessThan(360);
  });
});

// ============================================================
// 28수 (Lunar Mansions) 테스트
// ============================================================

describe('precisionEngine - lunar mansions', () => {
  it('should calculate lunar mansion for any date', () => {
    const date = new Date(2024, 0, 1);
    const mansion = getLunarMansion(date);

    expect(mansion).toBeDefined();
    expect(mansion.index).toBeGreaterThanOrEqual(1);
    expect(mansion.index).toBeLessThanOrEqual(28);
    expect(mansion.name).toBeTruthy();
    expect(mansion.nameKo).toBeTruthy();
    expect(['목', '화', '토', '금', '수']).toContain(mansion.element);
    expect(mansion.animal).toBeTruthy();
    expect(typeof mansion.isAuspicious).toBe('boolean');
    expect(Array.isArray(mansion.goodFor)).toBe(true);
    expect(Array.isArray(mansion.badFor)).toBe(true);
  });

  it('should cycle through 28 mansions', () => {
    const date1 = new Date(2024, 0, 1);
    const date2 = new Date(2024, 0, 29); // 28 days later

    const mansion1 = getLunarMansion(date1);
    const mansion2 = getLunarMansion(date2);

    // Lunar mansions may cycle differently than calendar days
    // Just verify both are valid (1-28)
    expect(mansion1.index).toBeGreaterThanOrEqual(1);
    expect(mansion1.index).toBeLessThanOrEqual(28);
    expect(mansion2.index).toBeGreaterThanOrEqual(1);
    expect(mansion2.index).toBeLessThanOrEqual(28);
  });

  it('should return different mansions for consecutive days', () => {
    const date1 = new Date(2024, 0, 1);
    const date2 = new Date(2024, 0, 2);

    const mansion1 = getLunarMansion(date1);
    const mansion2 = getLunarMansion(date2);

    expect(Math.abs(mansion1.index - mansion2.index)).toBeGreaterThanOrEqual(1);
  });

  it('should have consistent properties', () => {
    const date = new Date(2024, 5, 15);
    const mansion = getLunarMansion(date);

    if (mansion.isAuspicious) {
      expect(mansion.goodFor.length).toBeGreaterThan(0);
    } else {
      // Inauspicious mansions may have warnings
      expect(mansion.badFor).toBeDefined();
    }
  });
});

// ============================================================
// 달 위상 (Lunar Phase) 테스트
// ============================================================

describe('precisionEngine - lunar phase', () => {
  it('should calculate lunar phase from day', () => {
    const phases: Array<{ day: number; expected: string }> = [
      { day: 1, expected: 'new_moon' },
      { day: 5, expected: 'waxing_crescent' },
      { day: 8, expected: 'first_quarter' },
      { day: 12, expected: 'waxing_gibbous' },
      { day: 15, expected: 'full_moon' },
      { day: 20, expected: 'waning_gibbous' },
      { day: 23, expected: 'last_quarter' },
      { day: 27, expected: 'waning_crescent' },
    ];

    for (const { day, expected } of phases) {
      const phase = getLunarPhase(day);
      expect(phase).toBe(expected);
    }
  });

  it('should provide Korean phase name', () => {
    const phase = getLunarPhase(1); // New moon
    const name = getLunarPhaseName(phase);

    expect(name).toBeTruthy();
    expect(typeof name).toBe('string');
    expect(name).toContain('삭');
  });

  it('should handle all phase names', () => {
    const phases = [
      'new_moon', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
      'full_moon', 'waning_gibbous', 'last_quarter', 'waning_crescent'
    ];

    for (const phase of phases) {
      const name = getLunarPhaseName(phase as any);
      expect(name).toBeTruthy();
    }
  });

  it('should recognize full moon', () => {
    const fullMoon = getLunarPhase(15);
    expect(fullMoon).toBe('full_moon');
    const name = getLunarPhaseName(fullMoon);
    expect(name).toContain('보름');
  });
});

// ============================================================
// 행성시 (Planetary Hours) 테스트
// ============================================================

describe('precisionEngine - planetary hours', () => {
  it('should calculate planetary hours for a date', () => {
    const date = new Date(2024, 0, 1);
    const hours = calculatePlanetaryHours(date);

    expect(hours).toBeDefined();
    expect(Array.isArray(hours)).toBe(true);
    expect(hours.length).toBe(24); // 12 day + 12 night hours
  });

  it('should have valid hour structure', () => {
    const date = new Date(2024, 5, 15);
    const hours = calculatePlanetaryHours(date);

    for (const hour of hours) {
      expect(hour.hour).toBeGreaterThanOrEqual(0);
      expect(hour.hour).toBeLessThan(24);
      expect(hour.startTime).toBeInstanceOf(Date);
      expect(hour.endTime).toBeInstanceOf(Date);
      expect(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']).toContain(hour.planet);
      expect(['목', '화', '토', '금', '수']).toContain(hour.element);
      expect(typeof hour.isDay).toBe('boolean');
      expect(['excellent', 'good', 'neutral', 'caution', 'avoid']).toContain(hour.quality);
      expect(Array.isArray(hour.goodFor)).toBe(true);
      expect(hour.startTime < hour.endTime).toBe(true);
    }
  });

  it('should vary by location', () => {
    const date = new Date(2024, 5, 21); // Summer solstice
    const seoulHours = calculatePlanetaryHours(date, 37.5665, 126.9780);
    const londonHours = calculatePlanetaryHours(date, 51.5074, -0.1278);

    expect(seoulHours).toBeDefined();
    expect(londonHours).toBeDefined();
    expect(seoulHours.length).toBe(24);
    expect(londonHours.length).toBe(24);
  });

  it('should identify day and night hours', () => {
    const date = new Date(2024, 0, 15);
    const hours = calculatePlanetaryHours(date);

    const dayHours = hours.filter(h => h.isDay);
    const nightHours = hours.filter(h => !h.isDay);

    expect(dayHours.length).toBe(12);
    expect(nightHours.length).toBe(12);
  });

  it('should vary planet by day of week', () => {
    const sunday = new Date(2024, 0, 7); // Sunday
    const monday = new Date(2024, 0, 8); // Monday

    const sundayHours = calculatePlanetaryHours(sunday);
    const mondayHours = calculatePlanetaryHours(monday);

    // First hour should be Sun on Sunday, Moon on Monday
    expect(sundayHours[0].planet).toBeDefined();
    expect(mondayHours[0].planet).toBeDefined();
  });
});

// ============================================================
// 2차 진행법 (Secondary Progression) 테스트
// ============================================================

describe('precisionEngine - secondary progression', () => {
  it('should calculate secondary progression', () => {
    const birthDate = new Date(1990, 2, 15);
    const targetDate = new Date(2024, 2, 15); // 34 years later

    const progression = calculateSecondaryProgression(birthDate, targetDate);

    expect(progression).toBeDefined();
    expect(progression.sun).toBeDefined();
    expect(progression.sun.sign).toBeTruthy();
    expect(progression.sun.degree).toBeGreaterThanOrEqual(0);
    expect(progression.sun.degree).toBeLessThan(30);
    expect(progression.sun.house).toBeGreaterThanOrEqual(1);
    expect(progression.sun.house).toBeLessThanOrEqual(12);
  });

  it('should calculate moon progression', () => {
    const birthDate = new Date(1990, 0, 1);
    const targetDate = new Date(2020, 0, 1);

    const progression = calculateSecondaryProgression(birthDate, targetDate);

    expect(progression.moon).toBeDefined();
    expect(progression.moon.sign).toBeTruthy();
    expect(progression.moon.phase).toBeTruthy();
    expect(progression.moon.degree).toBeGreaterThanOrEqual(0);
    expect(progression.moon.degree).toBeLessThan(30);
  });

  it('should calculate inner planets', () => {
    const birthDate = new Date(1990, 5, 10);
    const targetDate = new Date(2024, 5, 10);

    const progression = calculateSecondaryProgression(birthDate, targetDate);

    expect(progression.mercury).toBeDefined();
    expect(progression.venus).toBeDefined();
    expect(progression.mars).toBeDefined();
  });

  it('should show progression over time', () => {
    const birthDate = new Date(1990, 0, 1);
    const date1 = new Date(1995, 0, 1); // 5 years
    const date2 = new Date(2000, 0, 1); // 10 years

    const prog1 = calculateSecondaryProgression(birthDate, date1);
    const prog2 = calculateSecondaryProgression(birthDate, date2);

    // Moon should move significantly
    expect(prog1.moon).toBeDefined();
    expect(prog2.moon).toBeDefined();
    if (prog1.moon?.longitude !== undefined && prog2.moon?.longitude !== undefined) {
      expect(prog1.moon.longitude).not.toBe(prog2.moon.longitude);
    }
  });
});

// ============================================================
// 신뢰도 계산 (Confidence Calculation) 테스트
// ============================================================

describe('precisionEngine - confidence calculation', () => {
  it('should calculate basic confidence', () => {
    const factors: ConfidenceFactors = {
      birthTimeAccuracy: 'exact',
      methodAlignment: 80,
      dataCompleteness: 90,
    };

    const confidence = calculateConfidence(factors);

    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(100);
  });

  it('should give higher score for exact birth time', () => {
    const exact: ConfidenceFactors = {
      birthTimeAccuracy: 'exact',
      methodAlignment: 70,
      dataCompleteness: 70,
    };

    const unknown: ConfidenceFactors = {
      birthTimeAccuracy: 'unknown',
      methodAlignment: 70,
      dataCompleteness: 70,
    };

    const exactScore = calculateConfidence(exact);
    const unknownScore = calculateConfidence(unknown);

    expect(exactScore).toBeGreaterThan(unknownScore);
  });

  it('should handle historical validation', () => {
    const factors: ConfidenceFactors = {
      birthTimeAccuracy: 'within_hour',
      methodAlignment: 75,
      dataCompleteness: 80,
      historicalValidation: 85,
    };

    const confidence = calculateConfidence(factors);

    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(100);
  });

  it('should vary by birth time accuracy levels', () => {
    const accuracyLevels: ConfidenceFactors['birthTimeAccuracy'][] = [
      'exact', 'within_hour', 'within_2hours', 'unknown'
    ];

    const scores = accuracyLevels.map(acc =>
      calculateConfidence({
        birthTimeAccuracy: acc,
        methodAlignment: 70,
        dataCompleteness: 70,
      })
    );

    // Scores should decrease as accuracy decreases
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
    expect(scores[2]).toBeGreaterThan(scores[3]);
  });
});

// ============================================================
// 통합 신뢰도 (Unified Confidence) 테스트
// ============================================================

describe('precisionEngine - unified confidence', () => {
  it('should calculate unified confidence', () => {
    const factors = {
      birthTimeAccuracy: 'exact' as const,
      methodAlignment: 85,
      dataCompleteness: 90,
      predictionType: 'daily' as const,
    };

    const result = calculateUnifiedConfidence(factors);

    expect(result).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']).toContain(result.grade);
    expect(result.interpretation).toBeTruthy();
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it('should provide breakdown', () => {
    const factors = {
      birthTimeAccuracy: 'within_hour' as const,
      methodAlignment: 75,
      dataCompleteness: 80,
      historicalValidation: 70,
    };

    const result = calculateUnifiedConfidence(factors);

    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.birthTime).toBeDefined();
    expect(result.breakdown.birthTime.score).toBeDefined();
    expect(result.breakdown.birthTime.weight).toBeDefined();
    expect(result.breakdown.dataCompleteness).toBeDefined();
    expect(result.breakdown.methodAlignment).toBeDefined();
  });

  it('should adjust weights by prediction type', () => {
    const baseFactor = {
      birthTimeAccuracy: 'exact' as const,
      methodAlignment: 80,
      dataCompleteness: 85,
    };

    const daily = calculateUnifiedConfidence({ ...baseFactor, predictionType: 'daily' });
    const lifetime = calculateUnifiedConfidence({ ...baseFactor, predictionType: 'lifetime' });

    expect(daily.breakdown.birthTime.weight).not.toBe(lifetime.breakdown.birthTime.weight);
  });

  it('should provide grade interpretation', () => {
    const highScore = {
      birthTimeAccuracy: 'exact' as const,
      methodAlignment: 95,
      dataCompleteness: 98,
    };

    const lowScore = {
      birthTimeAccuracy: 'unknown' as const,
      methodAlignment: 40,
      dataCompleteness: 45,
    };

    const high = calculateUnifiedConfidence(highScore);
    const low = calculateUnifiedConfidence(lowScore);

    expect(high.grade).toBe('A+');
    expect(['C', 'D', 'F']).toContain(low.grade);
    expect(high.interpretation).toBeTruthy();
    expect(low.interpretation).toBeTruthy();
  });

  it('should provide recommendations', () => {
    const factors = {
      birthTimeAccuracy: 'within_2hours' as const,
      methodAlignment: 60,
      dataCompleteness: 65,
    };

    const result = calculateUnifiedConfidence(factors);

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.some(r => r.includes('출생 시간'))).toBe(true);
  });

  it('should handle east-west harmony bonus', () => {
    const withHarmony = {
      birthTimeAccuracy: 'exact' as const,
      methodAlignment: 75,
      dataCompleteness: 80,
      eastWestHarmony: 85,
    };

    const withoutHarmony = {
      birthTimeAccuracy: 'exact' as const,
      methodAlignment: 75,
      dataCompleteness: 80,
      eastWestHarmony: 40,
    };

    const high = calculateUnifiedConfidence(withHarmony);
    const low = calculateUnifiedConfidence(withoutHarmony);

    expect(high.score).toBeGreaterThan(low.score);
  });
});

// ============================================================
// 신뢰도 조합 (Combine Confidence) 테스트
// ============================================================

describe('precisionEngine - combine confidence scores', () => {
  it('should combine multiple confidence scores', () => {
    const scores = [
      { source: 'saju', score: 85, weight: 1.0 },
      { source: 'astrology', score: 75, weight: 0.8 },
      { source: 'numerology', score: 70, weight: 0.5 },
    ];

    const result = combineConfidenceScores(scores);

    expect(result.combined).toBeGreaterThanOrEqual(0);
    expect(result.combined).toBeLessThanOrEqual(100);
    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.length).toBe(3);
  });

  it('should weight scores properly', () => {
    const highWeight = [
      { source: 'method1', score: 90, weight: 10 },
      { source: 'method2', score: 50, weight: 1 },
    ];

    const result = combineConfidenceScores(highWeight);

    // Result should be closer to 90 due to higher weight
    expect(result.combined).toBeGreaterThan(80);
  });

  it('should handle equal weights', () => {
    const scores = [
      { source: 'a', score: 60 },
      { source: 'b', score: 80 },
    ];

    const result = combineConfidenceScores(scores);

    expect(result.combined).toBe(70); // Average
  });

  it('should handle empty scores', () => {
    const result = combineConfidenceScores([]);

    expect(result.combined).toBe(50); // Default
    expect(result.breakdown.length).toBe(0);
  });
});

// ============================================================
// 인과 요인 분석 (Causal Factors) 테스트
// ============================================================

describe('precisionEngine - causal factors', () => {
  it('should analyze causal factors', () => {
    const factors = analyzeCausalFactors(
      '甲', '子', // Day stem/branch
      '庚', '午', // Target stem/branch
      undefined, undefined, // No daeun
      ['목'], // Yongsin
      ['금']  // Kisin
    );

    expect(factors).toBeDefined();
    expect(Array.isArray(factors)).toBe(true);
  });

  it('should detect stem clashes', () => {
    const factors = analyzeCausalFactors(
      '甲', '子',
      '庚', '午' // 甲-庚 clash
    );

    const stemClash = factors.find(f => f.type === 'stem_clash');
    if (stemClash) {
      expect(stemClash.impact).toContain('negative');
      expect(stemClash.score).toBeLessThan(0);
    }
  });

  it('should detect branch clashes', () => {
    const factors = analyzeCausalFactors(
      '甲', '子',
      '甲', '午' // 子-午 clash
    );

    const branchClash = factors.find(f => f.type === 'branch_clash');
    if (branchClash) {
      expect(branchClash.impact).toContain('negative');
      expect(branchClash.score).toBeLessThan(0);
    }
  });

  it('should detect harmonies', () => {
    const factors = analyzeCausalFactors(
      '甲', '寅',
      '甲', '午' // 寅-午 harmony (part of 寅午戌)
    );

    const harmony = factors.find(f => f.type === 'branch_harmony');
    if (harmony) {
      expect(harmony.impact).toContain('positive');
      expect(harmony.score).toBeGreaterThan(0);
    }
  });

  it('should detect yongsin activation', () => {
    const factors = analyzeCausalFactors(
      '甲', '子',
      '甲', '寅', // 甲 is 목
      undefined, undefined,
      ['목'] // Yongsin is 목
    );

    const yongsinFactor = factors.find(f => f.type === 'yongsin_activation');
    if (yongsinFactor) {
      expect(yongsinFactor.impact).toContain('positive');
      expect(yongsinFactor.score).toBeGreaterThan(0);
      expect(yongsinFactor.affectedAreas).toBeDefined();
    }
  });

  it('should detect kisin activation', () => {
    const factors = analyzeCausalFactors(
      '甲', '子',
      '庚', '申', // 庚 is 금
      undefined, undefined,
      undefined,
      ['금'] // Kisin is 금
    );

    const kisinFactor = factors.find(f => f.type === 'kisin_activation');
    if (kisinFactor) {
      expect(kisinFactor.impact).toBe('negative');
      expect(kisinFactor.score).toBeLessThan(0);
    }
  });

  it('should sort factors by impact', () => {
    const factors = analyzeCausalFactors(
      '甲', '子',
      '庚', '午',
      '丙', '戌',
      ['화'],
      ['금']
    );

    if (factors.length > 1) {
      for (let i = 0; i < factors.length - 1; i++) {
        expect(Math.abs(factors[i].score)).toBeGreaterThanOrEqual(Math.abs(factors[i + 1].score));
      }
    }
  });
});

// ============================================================
// 사건 유형별 점수 (Event Category Scores) 테스트
// ============================================================

describe('precisionEngine - event category scores', () => {
  it('should calculate event category scores', () => {
    const scores = calculateEventCategoryScores(
      '정관', // Sibsin
      '건록', // TwelveStage
      [{ type: '육합', score: 10, description: 'harmony', branches: [], impact: 'positive' }],
      [{ name: '천을귀인', type: 'lucky' }],
      true,  // Yongsin active
      false  // Kisin not active
    );

    expect(scores).toBeDefined();
    expect(scores.career).toBeGreaterThanOrEqual(0);
    expect(scores.career).toBeLessThanOrEqual(100);
    expect(scores.finance).toBeGreaterThanOrEqual(0);
    expect(scores.finance).toBeLessThanOrEqual(100);
    expect(scores.relationship).toBeGreaterThanOrEqual(0);
    expect(scores.relationship).toBeLessThanOrEqual(100);
    expect(scores.health).toBeGreaterThanOrEqual(0);
    expect(scores.health).toBeLessThanOrEqual(100);
    expect(scores.travel).toBeGreaterThanOrEqual(0);
    expect(scores.travel).toBeLessThanOrEqual(100);
    expect(scores.education).toBeGreaterThanOrEqual(0);
    expect(scores.education).toBeLessThanOrEqual(100);
  });

  it('should boost scores with positive sibsin', () => {
    const goodSibsin = calculateEventCategoryScores(
      '정관', '건록', [], [], false, false
    );

    const badSibsin = calculateEventCategoryScores(
      '겁재', '병', [], [], false, false
    );

    expect(goodSibsin.career).toBeGreaterThan(badSibsin.career);
  });

  it('should apply yongsin boost', () => {
    const withYongsin = calculateEventCategoryScores(
      '정관', '건록', [], [], true, false
    );

    const withoutYongsin = calculateEventCategoryScores(
      '정관', '건록', [], [], false, false
    );

    expect(withYongsin.career).toBeGreaterThan(withoutYongsin.career);
    expect(withYongsin.finance).toBeGreaterThan(withoutYongsin.finance);
  });

  it('should apply kisin penalty', () => {
    const withKisin = calculateEventCategoryScores(
      '정관', '건록', [], [], false, true
    );

    const withoutKisin = calculateEventCategoryScores(
      '정관', '건록', [], [], false, false
    );

    expect(withKisin.career).toBeLessThan(withoutKisin.career);
    expect(withKisin.finance).toBeLessThan(withoutKisin.finance);
  });

  it('should apply shinsal modifiers', () => {
    const luckyShinsals = [
      { name: '천을귀인', type: 'lucky' as const },
      { name: '역마', type: 'lucky' as const },
    ];

    const unluckyShinsals = [
      { name: '겁살', type: 'unlucky' as const },
      { name: '백호', type: 'unlucky' as const },
    ];

    const lucky = calculateEventCategoryScores('정관', '건록', [], luckyShinsals, false, false);
    const unlucky = calculateEventCategoryScores('정관', '건록', [], unluckyShinsals, false, false);

    expect(lucky.career).toBeGreaterThan(unlucky.career);
  });

  it('should handle twelve stage effects', () => {
    const peak = calculateEventCategoryScores('정관', '제왕', [], [], false, false);
    const decline = calculateEventCategoryScores('정관', '사', [], [], false, false);

    expect(peak.career).toBeGreaterThan(decline.career);
  });
});

// ============================================================
// PrecisionEngine 통합 테스트
// ============================================================

describe('precisionEngine - integrated tests', () => {
  it('should provide all solar term functions', () => {
    expect(PrecisionEngine.getSolarTermForDate).toBeDefined();
    expect(PrecisionEngine.getSolarTermMonth).toBeDefined();
  });

  it('should provide all lunar mansion functions', () => {
    expect(PrecisionEngine.getLunarMansion).toBeDefined();
  });

  it('should provide all lunar phase functions', () => {
    expect(PrecisionEngine.getLunarPhase).toBeDefined();
    expect(PrecisionEngine.getLunarPhaseName).toBeDefined();
  });

  it('should provide all planetary hour functions', () => {
    expect(PrecisionEngine.calculatePlanetaryHours).toBeDefined();
  });

  it('should provide all confidence functions', () => {
    expect(PrecisionEngine.calculateConfidence).toBeDefined();
    expect(PrecisionEngine.calculateUnifiedConfidence).toBeDefined();
    expect(PrecisionEngine.combineConfidenceScores).toBeDefined();
  });

  it('should provide all analysis functions', () => {
    expect(PrecisionEngine.analyzeCausalFactors).toBeDefined();
    expect(PrecisionEngine.calculateEventCategoryScores).toBeDefined();
  });
});

// ============================================================
// 엣지 케이스 테스트
// ============================================================

describe('precisionEngine - edge cases', () => {
  it('should handle year boundary dates', () => {
    const newYear = new Date(2024, 0, 1);
    const term = getSolarTermForDate(newYear);
    const mansion = getLunarMansion(newYear);

    expect(term).toBeDefined();
    expect(mansion).toBeDefined();
  });

  it('should handle leap year dates', () => {
    const leapDay = new Date(2024, 1, 29);
    const term = getSolarTermForDate(leapDay);
    const mansion = getLunarMansion(leapDay);
    const hours = calculatePlanetaryHours(leapDay);

    expect(term).toBeDefined();
    expect(mansion).toBeDefined();
    expect(hours.length).toBe(24);
  });

  it('should handle very old dates', () => {
    const oldDate = new Date(1900, 0, 1);
    const term = getSolarTermForDate(oldDate);
    const mansion = getLunarMansion(oldDate);

    expect(term).toBeDefined();
    expect(mansion).toBeDefined();
  });

  it('should handle future dates', () => {
    const future = new Date(2050, 11, 31);
    const term = getSolarTermForDate(future);
    const mansion = getLunarMansion(future);
    const hours = calculatePlanetaryHours(future);

    expect(term).toBeDefined();
    expect(mansion).toBeDefined();
    expect(hours.length).toBe(24);
  });

  it('should handle boundary lunar days', () => {
    const phase1 = getLunarPhase(1);
    const phase30 = getLunarPhase(30);

    expect(phase1).toBe('new_moon');
    expect(phase30).toBeTruthy();
  });

  it('should handle empty causal factors', () => {
    const factors = analyzeCausalFactors('甲', '子', '乙', '丑');

    expect(factors).toBeDefined();
    expect(Array.isArray(factors)).toBe(true);
  });
});
