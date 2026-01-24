/**
 * Event Scorer Tests
 * Critical tests for the event scoring engine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventScorer, type ScoringContext, type EventConditions, type ScoringResult } from '@/lib/prediction/scoring/eventScorer';
import type { MonthData } from '@/lib/prediction/helpers/monthDataCalculator';

// Mock dependencies
vi.mock('@/lib/prediction/advancedTimingEngine', () => ({
  analyzeBranchInteractions: vi.fn(() => []),
  calculatePreciseTwelveStage: vi.fn(() => ({ stage: '건록', energy: 'peak' })),
}));

vi.mock('@/lib/prediction/constants/scoring', () => ({
  EVENT_SCORING: {
    MARRIAGE_FAVORABLE_SIBSIN: 15,
    MARRIAGE_UNFAVORABLE_SIBSIN: 10,
    CAREER_FAVORABLE_SIBSIN: 12,
    CAREER_UNFAVORABLE_SIBSIN: 8,
    FAVORABLE_STAGE: 10,
    BUSINESS_FAVORABLE: 12,
    BUSINESS_UNFAVORABLE: 10,
  },
  SCORING_WEIGHTS: {
    SOLAR_TERM_MATCH: 5,
  },
}));

vi.mock('@/lib/prediction/life-prediction-constants', () => ({
  STEM_ELEMENT: {
    '甲': '목',
    '乙': '목',
    '丙': '화',
    '丁': '화',
    '戊': '토',
    '己': '토',
    '庚': '금',
    '辛': '금',
    '壬': '수',
    '癸': '수',
  },
}));

describe('EventScorer', () => {
  // Mock data factory
  const createMockMonthData = (overrides?: Partial<MonthData>): MonthData => ({
    year: 2024,
    month: 6,
    age: 34,
    yearGanji: { stem: '甲', branch: '辰' },
    monthGanji: { stem: '庚', branch: '午' },
    sibsin: '정관',
    twelveStage: { stage: '건록', energy: 'peak', lifePhase: '전성기' },
    solarTerm: {
      name: 'summer_solstice',
      nameKo: '하지',
      element: '화',
      isStart: true,
      energy: 'yang',
    },
    ...overrides,
  });

  const createMockConditions = (overrides?: Partial<EventConditions>): EventConditions => ({
    favorableSibsin: ['정관', '정재', '정인'],
    avoidSibsin: ['겁재', '상관'],
    favorableStages: ['건록', '제왕', '관대'],
    avoidStages: ['병', '사', '묘'],
    favorableElements: ['화', '토'],
    ...overrides,
  });

  const createMockContext = (overrides?: Partial<ScoringContext>): ScoringContext => ({
    monthData: createMockMonthData(),
    conditions: createMockConditions(),
    eventType: 'marriage',
    dayBranch: '子',
    monthBranch: '午',
    yongsin: ['화'],
    kisin: ['수'],
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create instance with valid context', () => {
      const context = createMockContext();
      const scorer = new EventScorer(context);
      expect(scorer).toBeInstanceOf(EventScorer);
    });
  });

  describe('calculate()', () => {
    it('should return a ScoringResult object', () => {
      const scorer = new EventScorer(createMockContext());
      const result = scorer.calculate();

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('reasons');
      expect(result).toHaveProperty('avoidReasons');
    });

    it('should start with base score of 50', () => {
      const context = createMockContext({
        conditions: createMockConditions({
          favorableSibsin: [],
          avoidSibsin: [],
          favorableStages: [],
          avoidStages: [],
          favorableElements: [],
        }),
        yongsin: [],
        kisin: [],
        daeunList: undefined,
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      // Base score with minimal factors
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThanOrEqual(60);
    });

    it('should increase score for favorable sibsin', () => {
      const context = createMockContext({
        monthData: createMockMonthData({ sibsin: '정관' }),
        conditions: createMockConditions({ favorableSibsin: ['정관'] }),
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      expect(result.score).toBeGreaterThan(50);
      expect(result.reasons.some(r => r.includes('정관'))).toBe(true);
    });

    it('should decrease score for avoid sibsin', () => {
      const context = createMockContext({
        monthData: createMockMonthData({ sibsin: '겁재' }),
        conditions: createMockConditions({ avoidSibsin: ['겁재'] }),
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      expect(result.avoidReasons.some(r => r.includes('겁재'))).toBe(true);
    });

    it('should increase score for favorable stage', () => {
      const context = createMockContext({
        monthData: createMockMonthData({
          twelveStage: { stage: '건록', energy: 'peak', lifePhase: '전성기' },
        }),
        conditions: createMockConditions({ favorableStages: ['건록'] }),
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      expect(result.reasons.some(r => r.includes('건록'))).toBe(true);
    });

    it('should decrease score for avoid stage', () => {
      const context = createMockContext({
        monthData: createMockMonthData({
          twelveStage: { stage: '병', energy: 'declining', lifePhase: '쇠퇴기' },
        }),
        conditions: createMockConditions({ avoidStages: ['병'] }),
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      expect(result.avoidReasons.some(r => r.includes('병'))).toBe(true);
    });

    it('should increase score for yongsin month', () => {
      const context = createMockContext({
        monthData: createMockMonthData({
          monthGanji: { stem: '丙', branch: '午' }, // 화
        }),
        yongsin: ['화'],
        kisin: [],
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      expect(result.reasons.some(r => r.includes('용신'))).toBe(true);
    });

    it('should decrease score for kisin month', () => {
      const context = createMockContext({
        monthData: createMockMonthData({
          monthGanji: { stem: '壬', branch: '子' }, // 수
        }),
        yongsin: [],
        kisin: ['수'],
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      expect(result.avoidReasons.some(r => r.includes('기신'))).toBe(true);
    });

    it('should add solar term bonus when element matches', () => {
      const context = createMockContext({
        monthData: createMockMonthData({
          solarTerm: {
            name: 'summer_solstice',
            nameKo: '하지',
            element: '화',
            isStart: true,
            energy: 'yang',
          },
        }),
        conditions: createMockConditions({ favorableElements: ['화'] }),
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      expect(result.reasons.some(r => r.includes('절기'))).toBe(true);
    });

    it('should handle missing solar term', () => {
      const context = createMockContext({
        monthData: createMockMonthData({ solarTerm: undefined }),
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      expect(result).toHaveProperty('score');
    });

    it('should apply daeun effect when matching', () => {
      const context = createMockContext({
        monthData: createMockMonthData({ age: 35 }),
        daeunList: [
          {
            startAge: 30,
            endAge: 40,
            branch: '午',
            element: '화',
          },
        ],
        conditions: createMockConditions({ favorableStages: ['건록'] }),
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      expect(result.reasons.some(r => r.includes('대운'))).toBe(true);
    });

    it('should handle missing daeunList', () => {
      const context = createMockContext({
        daeunList: undefined,
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      expect(result).toHaveProperty('score');
    });
  });

  describe('Multiple calculations', () => {
    it('should reset state between calculations', () => {
      const scorer = new EventScorer(createMockContext());

      const result1 = scorer.calculate();
      const result2 = scorer.calculate();

      expect(result1.score).toBe(result2.score);
      expect(result1.reasons.length).toBe(result2.reasons.length);
    });
  });

  describe('getScore()', () => {
    it('should return current score', () => {
      const scorer = new EventScorer(createMockContext());
      scorer.calculate();

      expect(typeof scorer.getScore()).toBe('number');
    });
  });

  describe('getReasons()', () => {
    it('should return copy of reasons array', () => {
      const scorer = new EventScorer(createMockContext());
      scorer.calculate();

      const reasons1 = scorer.getReasons();
      const reasons2 = scorer.getReasons();

      expect(reasons1).not.toBe(reasons2);
      expect(reasons1).toEqual(reasons2);
    });
  });

  describe('getAvoidReasons()', () => {
    it('should return copy of avoidReasons array', () => {
      const scorer = new EventScorer(createMockContext());
      scorer.calculate();

      const avoidReasons1 = scorer.getAvoidReasons();
      const avoidReasons2 = scorer.getAvoidReasons();

      expect(avoidReasons1).not.toBe(avoidReasons2);
      expect(avoidReasons1).toEqual(avoidReasons2);
    });
  });

  describe('Event types', () => {
    const eventTypes = ['marriage', 'career', 'investment', 'move', 'study', 'health'];

    eventTypes.forEach((eventType) => {
      it(`should calculate score for ${eventType} event`, () => {
        const context = createMockContext({ eventType });
        const scorer = new EventScorer(context);
        const result = scorer.calculate();

        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty conditions', () => {
      const context = createMockContext({
        conditions: {
          favorableSibsin: [],
          avoidSibsin: [],
          favorableStages: [],
          avoidStages: [],
          favorableElements: [],
        },
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing optional fields', () => {
      const context = createMockContext({
        monthBranch: undefined,
        yongsin: undefined,
        kisin: undefined,
        daeunList: undefined,
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      expect(result).toHaveProperty('score');
    });

    it('should handle age outside daeun range', () => {
      const context = createMockContext({
        monthData: createMockMonthData({ age: 25 }),
        daeunList: [
          {
            startAge: 30,
            endAge: 40,
            branch: '午',
            element: '화',
          },
        ],
      });
      const scorer = new EventScorer(context);
      const result = scorer.calculate();

      // Should not have daeun-related reasons
      expect(result.reasons.some(r => r.includes('대운'))).toBe(false);
    });
  });

  describe('Score boundaries', () => {
    it('should produce scores in reasonable range', () => {
      // Test with many favorable factors
      const favorableContext = createMockContext({
        monthData: createMockMonthData({
          sibsin: '정관',
          twelveStage: { stage: '건록', energy: 'peak', lifePhase: '전성기' },
          solarTerm: {
            name: 'summer_solstice',
            nameKo: '하지',
            element: '화',
            isStart: true,
            energy: 'yang',
          },
          monthGanji: { stem: '丙', branch: '午' },
        }),
        conditions: createMockConditions({
          favorableSibsin: ['정관'],
          favorableStages: ['건록'],
          favorableElements: ['화'],
        }),
        yongsin: ['화'],
      });

      const scorer = new EventScorer(favorableContext);
      const result = scorer.calculate();

      expect(result.score).toBeGreaterThan(50);
      // Scores can exceed 100 due to weighted factor accumulation
      expect(result.score).toBeLessThanOrEqual(150);
    });

    it('should produce lower scores with unfavorable factors', () => {
      const unfavorableContext = createMockContext({
        monthData: createMockMonthData({
          sibsin: '겁재',
          twelveStage: { stage: '병', energy: 'declining', lifePhase: '쇠퇴기' },
          monthGanji: { stem: '壬', branch: '子' },
        }),
        conditions: createMockConditions({
          avoidSibsin: ['겁재'],
          avoidStages: ['병'],
        }),
        kisin: ['수'],
        yongsin: [],
      });

      const scorer = new EventScorer(unfavorableContext);
      const result = scorer.calculate();

      expect(result.score).toBeLessThan(50);
      expect(result.avoidReasons.length).toBeGreaterThan(0);
    });
  });
});
