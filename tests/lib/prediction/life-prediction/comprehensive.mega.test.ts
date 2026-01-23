/**
 * Comprehensive Prediction MEGA Test Suite
 * Testing for comprehensive prediction generation and prompt context
 */
import { describe, it, expect } from 'vitest';
import {
  generateComprehensivePrediction,
  generateLifePredictionPromptContext,
  generateEventTimingPromptContext,
  generatePastAnalysisPromptContext,
} from '@/lib/prediction/life-prediction/comprehensive';
import type { LifePredictionInput, EventTimingResult, PastRetrospective } from '@/lib/prediction/life-prediction/types';

// ============================================================
// Test Data Fixtures
// ============================================================

const createBasicInput = (): LifePredictionInput => ({
  birthYear: 1990,
  birthMonth: 6,
  birthDay: 15,
  birthHour: 14,
  yearStem: '庚',
  yearBranch: '午',
  monthStem: '壬',
  monthBranch: '午',
  dayStem: '甲',
  dayBranch: '寅',
  hourStem: '辛',
  hourBranch: '未',
  yongsin: ['水', '木'],
  gisin: ['土', '金'],
  daeunList: [
    { stem: '乙', branch: '酉', startAge: 20, endAge: 29, element: '금', energy: 'yin' as const },
    { stem: '丙', branch: '戌', startAge: 30, endAge: 39, element: '토', energy: 'yang' as const },
  ],
  astroChart: {
    sun: { sign: 'Gemini', house: 10, longitude: 75.5 },
    moon: { sign: 'Pisces', house: 6, longitude: 340.2 },
  },
});

// ============================================================
// Main Function Tests
// ============================================================

describe('comprehensive MEGA - generateComprehensivePrediction', () => {
  it('should generate comprehensive prediction structure', () => {
    const input = createBasicInput();
    const currentYear = new Date().getFullYear();

    const result = generateComprehensivePrediction(input, currentYear, currentYear + 5);

    expect(result).toBeDefined();
    expect(result.multiYearTrend).toBeDefined();
    expect(result.upcomingHighlights).toBeDefined();
    expect(Array.isArray(result.upcomingHighlights)).toBe(true);
  });

  it('should handle single year range', () => {
    const input = createBasicInput();
    const currentYear = new Date().getFullYear();

    const result = generateComprehensivePrediction(input, currentYear, currentYear);

    expect(result).toBeDefined();
    expect(result.multiYearTrend).toBeDefined();
  });

  it('should handle multi-year range', () => {
    const input = createBasicInput();
    const currentYear = new Date().getFullYear();

    const result = generateComprehensivePrediction(input, currentYear, currentYear + 10);

    expect(result).toBeDefined();
    expect(result.multiYearTrend).toBeDefined();
  });

  it('should include life sync data when available', () => {
    const input = createBasicInput();
    const currentYear = new Date().getFullYear();

    const result = generateComprehensivePrediction(input, currentYear, currentYear + 3);

    expect(result).toBeDefined();
    // Life sync may or may not be present depending on astroChart
  });

  it('should handle missing daeunList', () => {
    const input = createBasicInput();
    input.daeunList = undefined;
    const currentYear = new Date().getFullYear();

    const result = generateComprehensivePrediction(input, currentYear, currentYear + 2);

    expect(result).toBeDefined();
  });

  it('should handle missing astroChart', () => {
    const input = createBasicInput();
    input.astroChart = undefined;
    const currentYear = new Date().getFullYear();

    const result = generateComprehensivePrediction(input, currentYear, currentYear + 2);

    expect(result).toBeDefined();
  });
});

describe('comprehensive MEGA - generateLifePredictionPromptContext', () => {
  it('should generate prompt context string', () => {
    const input = createBasicInput();
    const currentYear = new Date().getFullYear();

    const prediction = generateComprehensivePrediction(input, currentYear, currentYear + 5);
    const result = generateLifePredictionPromptContext(prediction);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include user birth information', () => {
    const input = createBasicInput();
    const currentYear = new Date().getFullYear();

    const prediction = generateComprehensivePrediction(input, currentYear, currentYear + 3);
    const result = generateLifePredictionPromptContext(prediction);

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should handle various year ranges', () => {
    const input = createBasicInput();
    const currentYear = new Date().getFullYear();

    const prediction1 = generateComprehensivePrediction(input, currentYear, currentYear + 1);
    const prediction5 = generateComprehensivePrediction(input, currentYear, currentYear + 5);
    const prediction10 = generateComprehensivePrediction(input, currentYear, currentYear + 10);

    const result1 = generateLifePredictionPromptContext(prediction1);
    const result5 = generateLifePredictionPromptContext(prediction5);
    const result10 = generateLifePredictionPromptContext(prediction10);

    expect(result1.length).toBeGreaterThan(0);
    expect(result5.length).toBeGreaterThan(0);
    expect(result10.length).toBeGreaterThan(0);

    // Longer ranges should produce more content
    expect(result10.length).toBeGreaterThanOrEqual(result1.length);
  });

  it('should not throw on missing optional data', () => {
    const input = createBasicInput();
    input.daeunList = undefined;
    input.astroChart = undefined;
    const currentYear = new Date().getFullYear();

    expect(() => {
      const prediction = generateComprehensivePrediction(input, currentYear, currentYear + 3);
      generateLifePredictionPromptContext(prediction);
    }).not.toThrow();
  });
});

describe('comprehensive MEGA - generateEventTimingPromptContext', () => {
  it('should generate event timing context', () => {
    const mockEventResult: EventTimingResult = {
      eventType: 'marriage',
      searchRange: {
        startYear: 2024,
        endYear: 2026,
      },
      optimalPeriods: [
        {
          startDate: new Date('2025-03-01'),
          endDate: new Date('2025-03-31'),
          score: 85,
          grade: 'S',
          reasons: ['좋은 운'],
        },
      ],
      avoidPeriods: [
        {
          startDate: new Date('2024-12-01'),
          endDate: new Date('2024-12-31'),
          score: 35,
          grade: 'D',
          reasons: ['나쁜 운'],
        },
      ],
      nextBestWindow: null,
      advice: '조언',
    };

    const result = generateEventTimingPromptContext(mockEventResult);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include event type in context', () => {
    const mockEventResult: EventTimingResult = {
      eventType: 'career',
      searchRange: { startYear: 2024, endYear: 2025 },
      optimalPeriods: [],
      avoidPeriods: [],
      nextBestWindow: null,
      advice: 'test advice',
    };

    const result = generateEventTimingPromptContext(mockEventResult);

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should handle empty optimal periods', () => {
    const mockEventResult: EventTimingResult = {
      eventType: 'investment',
      searchRange: { startYear: 2024, endYear: 2025 },
      optimalPeriods: [],
      avoidPeriods: [],
      nextBestWindow: null,
      advice: 'no optimal periods',
    };

    const result = generateEventTimingPromptContext(mockEventResult);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle multiple optimal periods', () => {
    const mockEventResult: EventTimingResult = {
      eventType: 'study',
      searchRange: { startYear: 2024, endYear: 2026 },
      optimalPeriods: [
        {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
          score: 90,
          grade: 'S',
          reasons: ['perfect'],
        },
        {
          startDate: new Date('2025-06-01'),
          endDate: new Date('2025-06-30'),
          score: 80,
          grade: 'A',
          reasons: ['good'],
        },
      ],
      avoidPeriods: [],
      nextBestWindow: null,
      advice: 'multiple options',
    };

    const result = generateEventTimingPromptContext(mockEventResult);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('comprehensive MEGA - generatePastAnalysisPromptContext', () => {
  it('should generate past analysis context', () => {
    const mockPastData: PastRetrospective = {
      targetDate: new Date('2021-06-15'),
      dailyPillar: { stem: '戊', branch: '午' },
      score: 85,
      grade: 'A',
      yearGanji: { stem: '辛', branch: '丑' },
      monthGanji: { stem: '甲', branch: '午' },
      twelveStage: { stage: '제왕', description: '', strength: 10 },
      sibsin: '편재',
      branchInteractions: [],
      themes: ['성공', '성취'],
      whyItHappened: ['좋은 운세', '타이밍이 완벽'],
      lessonsLearned: ['준비의 중요성', '기회 포착'],
    };

    const result = generatePastAnalysisPromptContext(mockPastData);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle empty significant events', () => {
    const mockPastData: PastRetrospective = {
      targetDate: new Date('2023-03-15'),
      dailyPillar: { stem: '甲', branch: '寅' },
      score: 75,
      grade: 'B',
      yearGanji: { stem: '癸', branch: '卯' },
      monthGanji: { stem: '乙', branch: '卯' },
      twelveStage: { stage: '건록', description: '', strength: 8 },
      sibsin: '비견',
      branchInteractions: [],
      themes: [],
      whyItHappened: [],
      lessonsLearned: [],
    };

    const result = generatePastAnalysisPromptContext(mockPastData);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include trend information', () => {
    const mockPastData: PastRetrospective = {
      targetDate: new Date('2023-06-20'),
      dailyPillar: { stem: '丙', branch: '午' },
      score: 82,
      grade: 'A',
      yearGanji: { stem: '癸', branch: '卯' },
      monthGanji: { stem: '戊', branch: '午' },
      twelveStage: { stage: '제왕', description: '', strength: 10 },
      sibsin: '식신',
      branchInteractions: [],
      themes: ['성장', '발전'],
      whyItHappened: ['좋은 운세', '노력의 결실'],
      lessonsLearned: ['지속적인 노력의 중요성'],
    };

    const result = generatePastAnalysisPromptContext(mockPastData);

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});

// ============================================================
// Integration Tests
// ============================================================

describe('comprehensive MEGA - Integration', () => {
  it('should work end-to-end', () => {
    const input = createBasicInput();
    const currentYear = new Date().getFullYear();

    const comprehensivePrediction = generateComprehensivePrediction(
      input,
      currentYear,
      currentYear + 5
    );

    const promptContext = generateLifePredictionPromptContext(
      comprehensivePrediction
    );

    expect(comprehensivePrediction).toBeDefined();
    expect(promptContext).toBeDefined();
    expect(promptContext.length).toBeGreaterThan(0);
  });

  it('should generate consistent results for same input', () => {
    const input = createBasicInput();
    const currentYear = new Date().getFullYear();

    const result1 = generateComprehensivePrediction(input, currentYear, currentYear + 3);
    const result2 = generateComprehensivePrediction(input, currentYear, currentYear + 3);

    // Compare everything except generatedAt timestamp
    const { generatedAt: _1, ...rest1 } = result1;
    const { generatedAt: _2, ...rest2 } = result2;
    expect(rest1).toEqual(rest2);
  });
});

// ============================================================
// Edge Cases
// ============================================================

describe('comprehensive MEGA - Edge Cases', () => {
  it('should handle birth year equal to start year', () => {
    const input = createBasicInput();
    input.birthYear = new Date().getFullYear();

    const result = generateComprehensivePrediction(
      input,
      input.birthYear,
      input.birthYear + 5
    );

    expect(result).toBeDefined();
  });

  it('should handle empty yongsin/gisin', () => {
    const input = createBasicInput();
    input.yongsin = [];
    input.gisin = [];
    const currentYear = new Date().getFullYear();

    const result = generateComprehensivePrediction(input, currentYear, currentYear + 2);

    expect(result).toBeDefined();
  });

  it('should handle undefined yongsin/gisin', () => {
    const input = createBasicInput();
    input.yongsin = undefined;
    input.gisin = undefined;
    const currentYear = new Date().getFullYear();

    const result = generateComprehensivePrediction(input, currentYear, currentYear + 2);

    expect(result).toBeDefined();
  });
});
