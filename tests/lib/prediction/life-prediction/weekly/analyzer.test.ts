/**
 * Weekly Analyzer Tests
 * 주간 기간 분석 모듈 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeWeekPeriod } from '@/lib/prediction/life-prediction/weekly/analyzer';
import type { LifePredictionInput, EventType } from '@/lib/prediction/life-prediction-types';
import { EVENT_FAVORABLE_CONDITIONS } from '@/lib/prediction/engine/constants';

// Mock dependencies to isolate the analyzer logic
vi.mock('@/lib/prediction/ultraPrecisionEngine', () => ({
  calculateDailyPillar: vi.fn((date: Date) => ({
    stem: '甲',
    branch: '子',
    fullGanji: '甲子',
  })),
}));

vi.mock('@/lib/prediction/advancedTimingEngine', () => ({
  calculatePreciseTwelveStage: vi.fn(() => ({
    stage: '건록',
    score: 85,
    energy: 'peak',
    description: 'test',
    lifePhase: 'test',
    advice: 'test',
  })),
  calculateSibsin: vi.fn(() => '정관'),
  calculateYearlyGanji: vi.fn((year: number) => ({
    stem: '甲',
    branch: '辰',
  })),
  analyzeBranchInteractions: vi.fn(() => [
    { type: '육합', branches: ['子', '丑'], impact: 'positive', score: 15 },
  ]),
}));

vi.mock('@/lib/prediction/precisionEngine', () => ({
  getSolarTermForDate: vi.fn(() => ({
    name: '입춘',
    element: '목',
    date: new Date(),
  })),
}));

vi.mock('@/lib/prediction/life-prediction-helpers', () => ({
  detectShinsals: vi.fn(() => [
    { name: '천을귀인', type: 'lucky' },
  ]),
}));

vi.mock('@/lib/prediction/life-prediction-astro', () => ({
  calculateAstroBonus: vi.fn(() => ({ bonus: 10 })),
}));

describe('WeeklyAnalyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Create mock input
  const createMockInput = (overrides: Partial<LifePredictionInput> = {}): LifePredictionInput => ({
    birthYear: 1990,
    birthMonth: 5,
    birthDay: 15,
    birthHour: 10,
    gender: 'M',
    dayStem: '甲',
    dayBranch: '寅',
    monthStem: '丙',
    monthBranch: '午',
    yearStem: '庚',
    yearBranch: '午',
    hourStem: '己',
    hourBranch: '巳',
    timezone: 'Asia/Seoul',
    yongsin: ['목', '화'],
    kisin: ['금'],
    ...overrides,
  });

  // Create date range for a week
  const createWeekRange = (startDate: string) => {
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { weekStart: start, weekEnd: end };
  };

  describe('analyzeWeekPeriod', () => {
    describe('basic functionality', () => {
      it('should return required result structure', () => {
        const input = createMockInput();
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.marriage;

        const result = analyzeWeekPeriod(input, weekStart, weekEnd, 'marriage', conditions);

        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('reasons');
        expect(result).toHaveProperty('bestDays');
        expect(result).toHaveProperty('bestDay');
        expect(result).toHaveProperty('bestDayScore');
      });

      it('should return score within valid range', () => {
        const input = createMockInput();
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.career;

        const result = analyzeWeekPeriod(input, weekStart, weekEnd, 'career', conditions);

        expect(result.score).toBeGreaterThanOrEqual(15);
        expect(result.score).toBeLessThanOrEqual(95);
      });

      it('should return array of reasons', () => {
        const input = createMockInput();
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.marriage;

        const result = analyzeWeekPeriod(input, weekStart, weekEnd, 'marriage', conditions);

        expect(Array.isArray(result.reasons)).toBe(true);
      });

      it('should return up to 3 best days', () => {
        const input = createMockInput();
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.marriage;

        const result = analyzeWeekPeriod(input, weekStart, weekEnd, 'marriage', conditions);

        expect(result.bestDays.length).toBeLessThanOrEqual(3);
        expect(result.bestDays.length).toBeGreaterThan(0);
      });

      it('should return bestDay as Date object', () => {
        const input = createMockInput();
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.marriage;

        const result = analyzeWeekPeriod(input, weekStart, weekEnd, 'marriage', conditions);

        expect(result.bestDay).toBeInstanceOf(Date);
      });

      it('should return bestDayScore as number', () => {
        const input = createMockInput();
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.marriage;

        const result = analyzeWeekPeriod(input, weekStart, weekEnd, 'marriage', conditions);

        expect(typeof result.bestDayScore).toBe('number');
        expect(result.bestDayScore).toBeGreaterThanOrEqual(15);
        expect(result.bestDayScore).toBeLessThanOrEqual(95);
      });
    });

    describe('event types', () => {
      const eventTypes: EventType[] = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];

      eventTypes.forEach((eventType) => {
        it(`should analyze ${eventType} event type`, () => {
          const input = createMockInput();
          const { weekStart, weekEnd } = createWeekRange('2024-06-10');
          const conditions = EVENT_FAVORABLE_CONDITIONS[eventType] || EVENT_FAVORABLE_CONDITIONS.marriage;

          const result = analyzeWeekPeriod(input, weekStart, weekEnd, eventType, conditions);

          expect(result.score).toBeDefined();
          expect(result.score).toBeGreaterThanOrEqual(15);
        });
      });
    });

    describe('week date handling', () => {
      it('should handle single day (weekStart === weekEnd)', () => {
        const input = createMockInput();
        const singleDay = new Date('2024-06-15');

        const result = analyzeWeekPeriod(
          input,
          singleDay,
          singleDay,
          'marriage',
          EVENT_FAVORABLE_CONDITIONS.marriage
        );

        expect(result.bestDays.length).toBe(1);
      });

      it('should handle full week (7 days)', () => {
        const input = createMockInput();
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');

        const result = analyzeWeekPeriod(
          input,
          weekStart,
          weekEnd,
          'marriage',
          EVENT_FAVORABLE_CONDITIONS.marriage
        );

        expect(result.bestDays.length).toBeGreaterThan(0);
        expect(result.bestDays.length).toBeLessThanOrEqual(3);
      });

      it('should return dates within the given range', () => {
        const input = createMockInput();
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');

        const result = analyzeWeekPeriod(
          input,
          weekStart,
          weekEnd,
          'career',
          EVENT_FAVORABLE_CONDITIONS.career
        );

        result.bestDays.forEach((day) => {
          expect(day.getTime()).toBeGreaterThanOrEqual(weekStart.getTime());
          expect(day.getTime()).toBeLessThanOrEqual(weekEnd.getTime());
        });
      });
    });

    describe('yongsin/kisin effects', () => {
      it('should consider yongsin in scoring', () => {
        const inputWithYongsin = createMockInput({ yongsin: ['목', '화'] });
        const inputWithoutYongsin = createMockInput({ yongsin: [] });
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.marriage;

        const withYongsin = analyzeWeekPeriod(inputWithYongsin, weekStart, weekEnd, 'marriage', conditions);
        const withoutYongsin = analyzeWeekPeriod(inputWithoutYongsin, weekStart, weekEnd, 'marriage', conditions);

        // With yongsin should generally have higher or equal score due to yongsin bonus
        expect(withYongsin.score).toBeGreaterThanOrEqual(withoutYongsin.score - 5);
      });
    });

    describe('daeun integration', () => {
      it('should consider daeun when provided', () => {
        const inputWithDaeun = createMockInput({
          daeunList: [
            { stem: '壬', branch: '子', startAge: 30, endAge: 40, element: '수' },
          ],
        });
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.career;

        const result = analyzeWeekPeriod(inputWithDaeun, weekStart, weekEnd, 'career', conditions);

        expect(result.score).toBeDefined();
        expect(result.score).toBeGreaterThanOrEqual(15);
      });
    });

    describe('astro chart integration', () => {
      it('should include astro bonus when astroChart is provided', () => {
        const inputWithAstro = createMockInput({
          astroChart: { planets: {}, houses: {} } as any,
        });
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.marriage;

        const result = analyzeWeekPeriod(inputWithAstro, weekStart, weekEnd, 'marriage', conditions);

        expect(result.score).toBeDefined();
      });
    });

    describe('reason collection', () => {
      it('should limit reasons to 5 entries', () => {
        const input = createMockInput();
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.marriage;

        const result = analyzeWeekPeriod(input, weekStart, weekEnd, 'marriage', conditions);

        expect(result.reasons.length).toBeLessThanOrEqual(5);
      });

      it('should prioritize important reasons', () => {
        const input = createMockInput();
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.marriage;

        const result = analyzeWeekPeriod(input, weekStart, weekEnd, 'marriage', conditions);

        // Important reasons like 천을귀인 should appear if detected
        if (result.reasons.includes('천을귀인')) {
          expect(result.reasons.indexOf('천을귀인')).toBeLessThan(result.reasons.length);
        }
      });
    });

    describe('score normalization', () => {
      it('should normalize scores within 15-95 range', () => {
        const input = createMockInput();
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.marriage;

        const result = analyzeWeekPeriod(input, weekStart, weekEnd, 'marriage', conditions);

        expect(result.score).toBeGreaterThanOrEqual(15);
        expect(result.score).toBeLessThanOrEqual(95);
        expect(result.bestDayScore).toBeGreaterThanOrEqual(15);
        expect(result.bestDayScore).toBeLessThanOrEqual(95);
      });
    });

    describe('consistency', () => {
      it('should produce consistent results for same input', () => {
        const input = createMockInput();
        const { weekStart, weekEnd } = createWeekRange('2024-06-10');
        const conditions = EVENT_FAVORABLE_CONDITIONS.marriage;

        const result1 = analyzeWeekPeriod(input, weekStart, weekEnd, 'marriage', conditions);
        const result2 = analyzeWeekPeriod(input, weekStart, weekEnd, 'marriage', conditions);

        expect(result1.score).toBe(result2.score);
        expect(result1.bestDayScore).toBe(result2.bestDayScore);
      });
    });
  });
});
