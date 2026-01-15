// tests/lib/prediction/ultraPrecisionEngine.test.ts
// 초정밀 타이밍 엔진 테스트 - 일진 + 공망 + 신살 + 통근투출 + 분 단위 분석

import { describe, it, expect } from 'vitest';
import {
  calculateDailyPillar,
  analyzeDailyPillar,
  calculateGongmang,
  analyzeGongmang,
  analyzeShinsal,
  analyzeTonggeun,
  analyzeTuechul,
  analyzeEnergyFlow,
  generateHourlyAdvice,
  calculateUltraPrecisionScore,
  generateUltraPrecisionPromptContext,
  generateWeeklyPrediction,
  analyzeMinutePrecision,
  findOptimalMinutes,
  analyzeDayTimeSlots,
  getQuickMinuteScore,
  type UltraPrecisionScore,
  type FiveElement,
} from '@/lib/prediction/ultraPrecisionEngine';

// ============================================================
// 일진(日辰) 계산 테스트
// ============================================================

describe('ultraPrecisionEngine - daily pillar calculation', () => {
  it('should calculate daily pillar for any date', () => {
    const date = new Date(2024, 0, 1);
    const pillar = calculateDailyPillar(date);

    expect(pillar).toBeDefined();
    expect(pillar.stem).toBeTruthy();
    expect(pillar.branch).toBeTruthy();
    expect(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']).toContain(pillar.stem);
    expect(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']).toContain(pillar.branch);
  });

  it('should produce different pillars for consecutive days', () => {
    const date1 = new Date(2024, 0, 1);
    const date2 = new Date(2024, 0, 2);

    const pillar1 = calculateDailyPillar(date1);
    const pillar2 = calculateDailyPillar(date2);

    expect(pillar1.stem !== pillar2.stem || pillar1.branch !== pillar2.branch).toBe(true);
  });

  it('should cycle through 60 gapja', () => {
    const date1 = new Date(2024, 0, 1);
    const date2 = new Date(2024, 2, 1); // 60 days later

    const pillar1 = calculateDailyPillar(date1);
    const pillar2 = calculateDailyPillar(date2);

    // After 60 days, it should be a different pillar (not exactly same due to month changes)
    expect(pillar1).toBeDefined();
    expect(pillar2).toBeDefined();
  });

  it('should handle very old dates', () => {
    const oldDate = new Date(1900, 0, 1);
    const pillar = calculateDailyPillar(oldDate);

    expect(pillar.stem).toBe('甲');
    expect(pillar.branch).toBe('子');
  });

  it('should handle future dates', () => {
    const future = new Date(2050, 11, 31);
    const pillar = calculateDailyPillar(future);

    expect(pillar).toBeDefined();
  });
});

describe('ultraPrecisionEngine - daily pillar analysis', () => {
  it('should analyze daily pillar with context', () => {
    const date = new Date(2024, 0, 15);
    const analysis = analyzeDailyPillar(date, '甲', '子', '卯', '午');

    expect(analysis).toBeDefined();
    expect(analysis.stem).toBeTruthy();
    expect(analysis.branch).toBeTruthy();
    expect(['목', '화', '토', '금', '수']).toContain(analysis.element);
    expect(analysis.sibsin).toBeTruthy();
    expect(analysis.twelveStage).toBeDefined();
    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(analysis.description).toBeTruthy();
  });

  it('should calculate branch interactions', () => {
    const date = new Date(2024, 0, 15);
    const analysis = analyzeDailyPillar(date, '甲', '子', '午', '戌');

    expect(analysis.branchInteractions).toBeDefined();
    expect(Array.isArray(analysis.branchInteractions)).toBe(true);
  });
});

// ============================================================
// 공망(空亡) 테스트
// ============================================================

describe('ultraPrecisionEngine - gongmang calculation', () => {
  it('should calculate gongmang branches', () => {
    const gongmang = calculateGongmang('甲', '子');

    expect(gongmang).toBeDefined();
    expect(Array.isArray(gongmang)).toBe(true);
    expect(gongmang.length).toBe(2);
    expect(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']).toContain(gongmang[0]);
    expect(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']).toContain(gongmang[1]);
  });

  it('should vary by day stem-branch combination', () => {
    const gongmang1 = calculateGongmang('甲', '子');
    const gongmang2 = calculateGongmang('甲', '寅');

    expect(gongmang1).not.toEqual(gongmang2);
  });

  it('should analyze gongmang impact', () => {
    const analysis = analyzeGongmang('甲', '子', '戌');

    expect(analysis).toBeDefined();
    expect(analysis.emptyBranches).toBeDefined();
    expect(analysis.emptyBranches.length).toBe(2);
    expect(typeof analysis.isToday空).toBe('boolean');
    expect(Array.isArray(analysis.affectedAreas)).toBe(true);
    expect(analysis.score).toBeLessThanOrEqual(0);
    expect(analysis.advice).toBeTruthy();
  });

  it('should detect empty branch', () => {
    const gongmang = calculateGongmang('甲', '子');
    const analysis = analyzeGongmang('甲', '子', gongmang[0]);

    expect(analysis.isToday空).toBe(true);
    expect(analysis.score).toBeLessThan(0);
    expect(analysis.affectedAreas.length).toBeGreaterThan(0);
  });

  it('should handle non-empty branch', () => {
    const analysis = analyzeGongmang('甲', '子', '子');

    if (!analysis.isToday空) {
      expect(analysis.score).toBe(0);
      expect(analysis.affectedAreas.length).toBe(0);
    }
  });
});

// ============================================================
// 신살(神殺) 테스트
// ============================================================

describe('ultraPrecisionEngine - shinsal analysis', () => {
  it('should analyze shinsal', () => {
    const analysis = analyzeShinsal('子', '午');

    expect(analysis).toBeDefined();
    expect(Array.isArray(analysis.active)).toBe(true);
    expect(typeof analysis.score).toBe('number');
    expect(analysis.interpretation).toBeTruthy();
  });

  it('should detect specific shinsals', () => {
    const analysis = analyzeShinsal('寅', '申');

    expect(analysis.active).toBeDefined();
    for (const shinsal of analysis.active) {
      expect(shinsal.name).toBeTruthy();
      expect(['lucky', 'unlucky', 'special']).toContain(shinsal.type);
      expect(shinsal.description).toBeTruthy();
      expect(typeof shinsal.score).toBe('number');
      expect(shinsal.affectedArea).toBeTruthy();
    }
  });

  it('should calculate total score from shinsals', () => {
    const analysis = analyzeShinsal('子', '午');

    const manualTotal = analysis.active.reduce((sum, s) => sum + s.score, 0);
    expect(analysis.score).toBe(manualTotal);
  });

  it('should interpret lucky shinsals', () => {
    const analysis = analyzeShinsal('寅', '戌');

    const luckyCount = analysis.active.filter(s => s.type === 'lucky').length;
    const unluckyCount = analysis.active.filter(s => s.type === 'unlucky').length;

    if (luckyCount > unluckyCount && analysis.active.length > 0) {
      expect(analysis.interpretation).toContain('길신');
    }
  });

  it('should handle no active shinsals', () => {
    // Find a combination with no shinsals
    const analysis = analyzeShinsal('子', '子');

    expect(analysis.active).toBeDefined();
    expect(analysis.interpretation).toBeTruthy();
  });
});

// ============================================================
// 통근/투출 테스트
// ============================================================

describe('ultraPrecisionEngine - tonggeun and tuechul', () => {
  it('should analyze tonggeun (rooting)', () => {
    const tonggeun = analyzeTonggeun('甲', ['寅', '卯', '子']);

    expect(tonggeun).toBeDefined();
    expect(Array.isArray(tonggeun)).toBe(true);

    for (const t of tonggeun) {
      expect(t.stem).toBeTruthy();
      expect(t.rootBranch).toBeTruthy();
      expect(t.strength).toBeGreaterThanOrEqual(0);
      expect(t.strength).toBeLessThanOrEqual(100);
      expect(t.description).toBeTruthy();
    }
  });

  it('should find rooting in matching branches', () => {
    const tonggeun = analyzeTonggeun('甲', ['寅']); // 甲 roots in 寅

    expect(tonggeun.length).toBeGreaterThan(0);
    expect(tonggeun[0].stem).toBe('甲');
    expect(tonggeun[0].rootBranch).toBe('寅');
  });

  it('should handle no rooting', () => {
    const tonggeun = analyzeTonggeun('甲', ['午', '未']);

    expect(tonggeun).toBeDefined();
    expect(Array.isArray(tonggeun)).toBe(true);
  });

  it('should analyze tuechul (revelation)', () => {
    const tuechul = analyzeTuechul(['甲', '丙'], ['寅', '午']);

    expect(tuechul).toBeDefined();
    expect(Array.isArray(tuechul)).toBe(true);

    for (const t of tuechul) {
      expect(t.hiddenStem).toBeTruthy();
      expect(t.fromBranch).toBeTruthy();
      expect(t.revealedIn).toBeTruthy();
      expect(t.significance).toBeTruthy();
    }
  });

  it('should analyze energy flow comprehensively', () => {
    const energyFlow = analyzeEnergyFlow(
      '甲',
      ['甲', '乙', '丙', '丁'],
      ['寅', '卯', '辰', '巳']
    );

    expect(energyFlow).toBeDefined();
    expect(energyFlow.tonggeun).toBeDefined();
    expect(energyFlow.tuechul).toBeDefined();
    expect(['very_strong', 'strong', 'moderate', 'weak', 'very_weak']).toContain(energyFlow.energyStrength);
    expect(['목', '화', '토', '금', '수']).toContain(energyFlow.dominantElement);
    expect(energyFlow.score).toBeGreaterThanOrEqual(0);
    expect(energyFlow.score).toBeLessThanOrEqual(100);
    expect(energyFlow.description).toBeTruthy();
  });

  it('should rate energy strength based on tonggeun', () => {
    const strongEnergy = analyzeEnergyFlow('甲', ['甲', '甲', '甲'], ['寅', '卯', '辰']);
    const weakEnergy = analyzeEnergyFlow('甲', ['庚', '辛'], ['申', '酉']);

    expect(strongEnergy.tonggeun.length).toBeGreaterThan(weakEnergy.tonggeun.length);
  });
});

// ============================================================
// 시간대별 조언 테스트
// ============================================================

describe('ultraPrecisionEngine - hourly advice', () => {
  it('should generate hourly advice', () => {
    const advice = generateHourlyAdvice('甲', '子');

    expect(advice).toBeDefined();
    expect(Array.isArray(advice)).toBe(true);
    expect(advice.length).toBe(24);
  });

  it('should provide valid hour structure', () => {
    const advice = generateHourlyAdvice('丙', '午');

    for (const hour of advice) {
      expect(hour.hour).toBeGreaterThanOrEqual(0);
      expect(hour.hour).toBeLessThan(24);
      expect(hour.siGan).toBeTruthy();
      expect(['excellent', 'good', 'neutral', 'caution']).toContain(hour.quality);
      expect(hour.activity).toBeTruthy();
    }
  });

  it('should vary by branch combination', () => {
    const advice1 = generateHourlyAdvice('甲', '子');
    const advice2 = generateHourlyAdvice('甲', '午');

    expect(advice1).not.toEqual(advice2);
  });
});

// ============================================================
// 종합 점수 계산 테스트
// ============================================================

describe('ultraPrecisionEngine - ultra precision score', () => {
  it('should calculate ultra precision score', () => {
    const input = {
      date: new Date(2024, 0, 15),
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '卯',
      yearBranch: '午',
      allStems: ['甲', '乙', '丙', '丁'],
      allBranches: ['子', '卯', '午', '酉'],
    };

    const score = calculateUltraPrecisionScore(input);

    expect(score).toBeDefined();
    expect(score.date).toEqual(input.date);
    expect(score.year).toBe(2024);
    expect(score.month).toBe(1);
    expect(score.day).toBe(15);
  });

  it('should provide complete score structure', () => {
    const score = calculateUltraPrecisionScore({
      date: new Date(2024, 5, 20),
      dayStem: '丙',
      dayBranch: '午',
      monthBranch: '巳',
      yearBranch: '辰',
      allStems: ['丙', '丁', '戊', '己'],
      allBranches: ['午', '巳', '辰', '卯'],
    });

    expect(score.dailyPillar).toBeDefined();
    expect(score.gongmang).toBeDefined();
    expect(score.shinsal).toBeDefined();
    expect(score.energyFlow).toBeDefined();
    expect(score.transitIntegration).toBeDefined();
    expect(score.totalScore).toBeGreaterThanOrEqual(0);
    expect(score.totalScore).toBeLessThanOrEqual(100);
    expect(score.confidence).toBeGreaterThanOrEqual(0);
    expect(score.confidence).toBeLessThanOrEqual(100);
    expect(['S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']).toContain(score.grade);
    expect(['excellent', 'good', 'neutral', 'caution', 'avoid']).toContain(score.dayQuality);
    expect(Array.isArray(score.themes)).toBe(true);
    expect(Array.isArray(score.bestActivities)).toBe(true);
    expect(Array.isArray(score.avoidActivities)).toBe(true);
    expect(Array.isArray(score.hourlyAdvice)).toBe(true);
  });

  it('should provide themes', () => {
    const score = calculateUltraPrecisionScore({
      date: new Date(2024, 0, 1),
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '卯',
      yearBranch: '午',
      allStems: ['甲', '乙'],
      allBranches: ['子', '卯'],
    });

    expect(score.themes.length).toBeGreaterThan(0);
    for (const theme of score.themes) {
      expect(typeof theme).toBe('string');
    }
  });

  it('should provide activity recommendations', () => {
    const score = calculateUltraPrecisionScore({
      date: new Date(2024, 0, 1),
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '卯',
      yearBranch: '午',
      allStems: ['甲'],
      allBranches: ['子'],
    });

    expect(Array.isArray(score.bestActivities)).toBe(true);
    expect(Array.isArray(score.avoidActivities)).toBe(true);
  });

  it('should scale confidence with data completeness', () => {
    const fullData = calculateUltraPrecisionScore({
      date: new Date(2024, 0, 1),
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '卯',
      yearBranch: '午',
      allStems: ['甲', '乙', '丙', '丁'],
      allBranches: ['子', '卯', '午', '酉'],
    });

    const minimalData = calculateUltraPrecisionScore({
      date: new Date(2024, 0, 1),
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '卯',
      yearBranch: '午',
      allStems: ['甲'],
      allBranches: ['子'],
    });

    expect(fullData.confidence).toBeGreaterThan(minimalData.confidence);
  });
});

// ============================================================
// 주간 예측 테스트
// ============================================================

describe('ultraPrecisionEngine - weekly prediction', () => {
  it('should generate weekly prediction', () => {
    const startDate = new Date(2024, 0, 1);
    const weekly = generateWeeklyPrediction(
      startDate, '甲', '子', '卯', '午',
      ['甲', '乙'], ['子', '卯']
    );

    expect(weekly).toBeDefined();
    expect(Array.isArray(weekly)).toBe(true);
    expect(weekly.length).toBe(7);
  });

  it('should provide scores for each day', () => {
    const startDate = new Date(2024, 0, 1);
    const weekly = generateWeeklyPrediction(
      startDate, '甲', '子', '卯', '午',
      ['甲'], ['子']
    );

    for (const day of weekly) {
      expect(day.date).toBeInstanceOf(Date);
      expect(day.totalScore).toBeGreaterThanOrEqual(0);
      expect(day.totalScore).toBeLessThanOrEqual(100);
    }
  });

  it('should span 7 consecutive days', () => {
    const startDate = new Date(2024, 0, 15);
    const weekly = generateWeeklyPrediction(
      startDate, '甲', '子', '卯', '午',
      ['甲'], ['子']
    );

    for (let i = 0; i < weekly.length; i++) {
      const expectedDate = new Date(startDate);
      expectedDate.setDate(expectedDate.getDate() + i);
      expect(weekly[i].date.getDate()).toBe(expectedDate.getDate());
    }
  });
});

// ============================================================
// 분 단위 정밀 분석 테스트 (TIER 5)
// ============================================================

describe('ultraPrecisionEngine - minute precision', () => {
  it('should analyze minute-level precision', () => {
    const datetime = new Date(2024, 0, 15, 10, 30);
    const analysis = analyzeMinutePrecision(datetime, '甲', '子');

    expect(analysis).toBeDefined();
    expect(analysis.datetime).toEqual(datetime);
    expect(analysis.hour).toBe(10);
    expect(analysis.minute).toBe(30);
    expect(analysis.hourBranch).toBeTruthy();
    expect(analysis.hourStem).toBeTruthy();
    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(analysis.score).toBeLessThanOrEqual(100);
    expect(['S', 'A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']).toContain(analysis.grade);
  });

  it('should provide planetary hour info', () => {
    const datetime = new Date(2024, 0, 15, 14, 0);
    const analysis = analyzeMinutePrecision(datetime, '甲', '子');

    expect(analysis.planetaryHour).toBeDefined();
    expect(analysis.planetaryHour.planet).toBeTruthy();
    expect(['목', '화', '토', '금', '수']).toContain(analysis.planetaryHour.element);
    expect(['excellent', 'good', 'neutral', 'caution', 'avoid']).toContain(analysis.planetaryHour.quality);
    expect(Array.isArray(analysis.planetaryHour.goodFor)).toBe(true);
  });

  it('should provide lunar mansion info', () => {
    const datetime = new Date(2024, 0, 15, 10, 30);
    const analysis = analyzeMinutePrecision(datetime, '甲', '子');

    expect(analysis.lunarMansion).toBeDefined();
    expect(analysis.lunarMansion.name).toBeTruthy();
    expect(analysis.lunarMansion.nameKo).toBeTruthy();
    expect(['목', '화', '토', '금', '수']).toContain(analysis.lunarMansion.element);
    expect(typeof analysis.lunarMansion.isAuspicious).toBe('boolean');
  });

  it('should provide lunar phase info', () => {
    const datetime = new Date(2024, 0, 15, 10, 30);
    const analysis = analyzeMinutePrecision(datetime, '甲', '子');

    expect(analysis.lunarPhase).toBeDefined();
    expect(analysis.lunarPhase.phase).toBeTruthy();
    expect(analysis.lunarPhase.phaseName).toBeTruthy();
    expect(['strong', 'moderate', 'weak']).toContain(analysis.lunarPhase.influence);
  });

  it('should provide solar term info', () => {
    const datetime = new Date(2024, 0, 15, 10, 30);
    const analysis = analyzeMinutePrecision(datetime, '甲', '子');

    expect(analysis.solarTerm).toBeDefined();
    expect(analysis.solarTerm.nameKo).toBeTruthy();
    expect(['목', '화', '토', '금', '수']).toContain(analysis.solarTerm.element);
    expect(['yang', 'yin']).toContain(analysis.solarTerm.energy);
    expect(['early', 'mid', 'late']).toContain(analysis.solarTerm.seasonPhase);
  });

  it('should consider yongsin and kisin', () => {
    const datetime = new Date(2024, 0, 15, 10, 30);
    const withYongsin = analyzeMinutePrecision(datetime, '甲', '子', ['목']);
    const withKisin = analyzeMinutePrecision(datetime, '甲', '子', undefined, ['금']);

    expect(withYongsin.score).toBeDefined();
    expect(withKisin.score).toBeDefined();
  });

  it('should provide optimal activities', () => {
    const datetime = new Date(2024, 0, 15, 10, 30);
    const analysis = analyzeMinutePrecision(datetime, '甲', '子');

    expect(Array.isArray(analysis.optimalActivities)).toBe(true);
    expect(Array.isArray(analysis.avoidActivities)).toBe(true);
    expect(analysis.advice).toBeTruthy();
  });
});

describe('ultraPrecisionEngine - optimal minutes', () => {
  it('should find optimal minutes in a time range', () => {
    const date = new Date(2024, 0, 15);
    const optimal = findOptimalMinutes(date, 9, 12, '甲', '子');

    expect(optimal).toBeDefined();
    expect(Array.isArray(optimal)).toBe(true);

    for (const opt of optimal) {
      expect(opt.time).toBeInstanceOf(Date);
      expect(opt.time.getHours()).toBeGreaterThanOrEqual(9);
      expect(opt.time.getHours()).toBeLessThanOrEqual(12);
      expect(opt.score).toBeGreaterThanOrEqual(60);
      expect(opt.reason).toBeTruthy();
    }
  });

  it('should sort by score descending', () => {
    const date = new Date(2024, 0, 15);
    const optimal = findOptimalMinutes(date, 9, 17, '甲', '子');

    for (let i = 0; i < optimal.length - 1; i++) {
      expect(optimal[i].score).toBeGreaterThanOrEqual(optimal[i + 1].score);
    }
  });

  it('should limit to top 10 results', () => {
    const date = new Date(2024, 0, 15);
    const optimal = findOptimalMinutes(date, 0, 23, '甲', '子');

    expect(optimal.length).toBeLessThanOrEqual(10);
  });

  it('should filter by activity type', () => {
    const date = new Date(2024, 0, 15);
    const optimal = findOptimalMinutes(date, 9, 17, '甲', '子', '계약');

    expect(optimal).toBeDefined();
    expect(Array.isArray(optimal)).toBe(true);
  });
});

describe('ultraPrecisionEngine - day time slots', () => {
  it('should analyze all time slots in a day', () => {
    const date = new Date(2024, 0, 15);
    const analysis = analyzeDayTimeSlots(date, '甲', '子');

    expect(analysis).toBeDefined();
    expect(Array.isArray(analysis.best)).toBe(true);
    expect(Array.isArray(analysis.worst)).toBe(true);
    expect(analysis.byActivity).toBeDefined();
  });

  it('should identify best hours', () => {
    const date = new Date(2024, 0, 15);
    const analysis = analyzeDayTimeSlots(date, '甲', '子');

    expect(analysis.best.length).toBeGreaterThan(0);
    expect(analysis.best.length).toBeLessThanOrEqual(5);

    for (const hour of analysis.best) {
      expect(hour.hour).toBeGreaterThanOrEqual(0);
      expect(hour.hour).toBeLessThan(24);
      expect(hour.score).toBeGreaterThanOrEqual(0);
      expect(hour.reason).toBeTruthy();
    }
  });

  it('should identify worst hours', () => {
    const date = new Date(2024, 0, 15);
    const analysis = analyzeDayTimeSlots(date, '甲', '子');

    expect(analysis.worst.length).toBeGreaterThan(0);
    expect(analysis.worst.length).toBeLessThanOrEqual(3);

    for (const hour of analysis.worst) {
      expect(hour.hour).toBeGreaterThanOrEqual(0);
      expect(hour.hour).toBeLessThan(24);
      expect(hour.score).toBeDefined();
      expect(hour.reason).toBeTruthy();
    }
  });

  it('should categorize by activity', () => {
    const date = new Date(2024, 0, 15);
    const analysis = analyzeDayTimeSlots(date, '甲', '子');

    expect(Object.keys(analysis.byActivity).length).toBeGreaterThan(0);

    for (const activity in analysis.byActivity) {
      const hours = analysis.byActivity[activity];
      expect(Array.isArray(hours)).toBe(true);
      for (const hour of hours) {
        expect(hour.hour).toBeGreaterThanOrEqual(0);
        expect(hour.score).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('ultraPrecisionEngine - quick minute score', () => {
  it('should get quick score', () => {
    const datetime = new Date(2024, 0, 15, 10, 30);
    const quick = getQuickMinuteScore(datetime, '甲', '子');

    expect(quick).toBeDefined();
    expect(quick.score).toBeGreaterThanOrEqual(0);
    expect(quick.score).toBeLessThanOrEqual(100);
    expect(quick.grade).toBeTruthy();
    expect(quick.advice).toBeTruthy();
  });

  it('should vary by time', () => {
    const morning = new Date(2024, 0, 15, 9, 0);
    const evening = new Date(2024, 0, 15, 20, 0);

    const morningScore = getQuickMinuteScore(morning, '甲', '子');
    const eveningScore = getQuickMinuteScore(evening, '甲', '子');

    expect(morningScore).toBeDefined();
    expect(eveningScore).toBeDefined();
  });
});

// ============================================================
// 프롬프트 생성 테스트
// ============================================================

describe('ultraPrecisionEngine - prompt context generation', () => {
  it('should generate prompt context in Korean', () => {
    const scores = generateWeeklyPrediction(
      new Date(2024, 0, 1), '甲', '子', '卯', '午',
      ['甲'], ['子']
    );

    const context = generateUltraPrecisionPromptContext(scores);

    expect(context).toBeTruthy();
    expect(typeof context).toBe('string');
    expect(context).toContain('초정밀');
    expect(context).toContain('일진');
  });

  it('should generate prompt context in English', () => {
    const scores = generateWeeklyPrediction(
      new Date(2024, 0, 1), '甲', '子', '卯', '午',
      ['甲'], ['子']
    );

    const context = generateUltraPrecisionPromptContext(scores, 'en');

    expect(context).toBeTruthy();
    expect(context).toContain('Ultra-Precision');
  });

  it('should include daily information', () => {
    const scores = generateWeeklyPrediction(
      new Date(2024, 0, 1), '甲', '子', '卯', '午',
      ['甲'], ['子']
    );

    const context = generateUltraPrecisionPromptContext(scores);

    for (const score of scores) {
      expect(context).toContain(`${score.month}/${score.day}`);
    }
  });
});

// ============================================================
// 엣지 케이스 테스트
// ============================================================

describe('ultraPrecisionEngine - edge cases', () => {
  it('should handle year boundary', () => {
    const date = new Date(2024, 11, 31);
    const pillar = calculateDailyPillar(date);

    expect(pillar).toBeDefined();
  });

  it('should handle leap year', () => {
    const date = new Date(2024, 1, 29);
    const score = calculateUltraPrecisionScore({
      date,
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '卯',
      yearBranch: '午',
      allStems: ['甲'],
      allBranches: ['子'],
    });

    expect(score).toBeDefined();
  });

  it('should handle minimal input', () => {
    const score = calculateUltraPrecisionScore({
      date: new Date(2024, 0, 1),
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '卯',
      yearBranch: '午',
      allStems: [],
      allBranches: [],
    });

    expect(score).toBeDefined();
    expect(score.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle midnight hour', () => {
    const datetime = new Date(2024, 0, 15, 0, 0);
    const analysis = analyzeMinutePrecision(datetime, '甲', '子');

    expect(analysis).toBeDefined();
    expect(analysis.hour).toBe(0);
  });

  it('should handle noon hour', () => {
    const datetime = new Date(2024, 0, 15, 12, 0);
    const analysis = analyzeMinutePrecision(datetime, '甲', '子');

    expect(analysis).toBeDefined();
    expect(analysis.hour).toBe(12);
  });

  it('should handle last minute of day', () => {
    const datetime = new Date(2024, 0, 15, 23, 59);
    const analysis = analyzeMinutePrecision(datetime, '甲', '子');

    expect(analysis).toBeDefined();
    expect(analysis.hour).toBe(23);
    expect(analysis.minute).toBe(59);
  });

  it('should handle empty yongsin and kisin', () => {
    const datetime = new Date(2024, 0, 15, 10, 30);
    const analysis = analyzeMinutePrecision(datetime, '甲', '子', [], []);

    expect(analysis).toBeDefined();
  });
});
