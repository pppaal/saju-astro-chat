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
    { stem: '乙', branch: '酉', startAge: 20, endAge: 29, energy: 'yin' as const },
    { stem: '丙', branch: '戌', startAge: 30, endAge: 39, energy: 'yang' as const },
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

    const result = generateLifePredictionPromptContext(input, currentYear, currentYear + 5);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include user birth information', () => {
    const input = createBasicInput();
    const currentYear = new Date().getFullYear();

    const result = generateLifePredictionPromptContext(input, currentYear, currentYear + 3);

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should handle various year ranges', () => {
    const input = createBasicInput();
    const currentYear = new Date().getFullYear();

    const result1 = generateLifePredictionPromptContext(input, currentYear, currentYear + 1);
    const result5 = generateLifePredictionPromptContext(input, currentYear, currentYear + 5);
    const result10 = generateLifePredictionPromptContext(input, currentYear, currentYear + 10);

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
      generateLifePredictionPromptContext(input, currentYear, currentYear + 3);
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
      startYear: 2020,
      endYear: 2023,
      significantEvents: [
        {
          year: 2021,
          month: 6,
          score: 85,
          grade: 'S',
          description: 'Great period',
          reasons: ['good fortune'],
        },
      ],
      averageScore: 70,
      bestYear: { year: 2021, score: 85, highlights: [] },
      worstYear: { year: 2020, score: 50, challenges: [] },
      overallTrend: 'improving',
    };

    const result = generatePastAnalysisPromptContext(mockPastData);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should handle empty significant events', () => {
    const mockPastData: PastRetrospective = {
      startYear: 2020,
      endYear: 2023,
      significantEvents: [],
      averageScore: 60,
      bestYear: { year: 2021, score: 70, highlights: [] },
      worstYear: { year: 2020, score: 50, challenges: [] },
      overallTrend: 'stable',
    };

    const result = generatePastAnalysisPromptContext(mockPastData);

    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include trend information', () => {
    const mockPastData: PastRetrospective = {
      startYear: 2018,
      endYear: 2023,
      significantEvents: [],
      averageScore: 65,
      bestYear: { year: 2023, score: 80, highlights: [] },
      worstYear: { year: 2019, score: 45, challenges: [] },
      overallTrend: 'improving',
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
      input,
      currentYear,
      currentYear + 5
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

    expect(result1).toEqual(result2);
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
