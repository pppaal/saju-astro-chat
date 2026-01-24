/**
 * Period Classifier Tests
 * Critical tests for period classification logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PeriodClassifier,
  type OptimalPeriod,
  type AvoidPeriod,
  type ClassificationThresholds,
} from '@/lib/prediction/analyzers/periodClassifier';
import type { MonthData } from '@/lib/prediction/helpers/monthDataCalculator';
import type { ScoringResult } from '@/lib/prediction/scoring/eventScorer';

describe('PeriodClassifier', () => {
  // Mock data factory
  const createMockMonthData = (year: number, month: number): MonthData => ({
    year,
    month,
    age: 34,
    yearGanji: { stem: '甲', branch: '辰' },
    monthGanji: { stem: '庚', branch: '午' },
    sibsin: '정관',
    twelveStage: { stage: '건록', energy: 'peak', lifePhase: '전성기' },
  });

  const createMockScoringResult = (
    score: number,
    reasons: string[] = [],
    avoidReasons: string[] = []
  ): ScoringResult => ({
    score,
    reasons,
    avoidReasons,
  });

  describe('Constructor', () => {
    it('should create instance with default thresholds', () => {
      const classifier = new PeriodClassifier();
      expect(classifier).toBeInstanceOf(PeriodClassifier);
    });

    it('should create instance with custom thresholds', () => {
      const thresholds: ClassificationThresholds = {
        optimal: 80,
        avoid: 30,
      };
      const classifier = new PeriodClassifier(thresholds);
      expect(classifier).toBeInstanceOf(PeriodClassifier);
    });
  });

  describe('addPeriod()', () => {
    let classifier: PeriodClassifier;

    beforeEach(() => {
      classifier = new PeriodClassifier();
    });

    it('should classify high score as optimal period', () => {
      const monthData = createMockMonthData(2024, 6);
      const scoringResult = createMockScoringResult(85, ['좋은 시기']);

      classifier.addPeriod(monthData, scoringResult);
      const result = classifier.getResult();

      expect(result.optimalPeriods).toHaveLength(1);
      expect(result.optimalPeriods[0].score).toBe(85);
    });

    it('should classify low score as avoid period', () => {
      const monthData = createMockMonthData(2024, 6);
      const scoringResult = createMockScoringResult(30, [], ['주의 필요']);

      classifier.addPeriod(monthData, scoringResult);
      const result = classifier.getResult();

      expect(result.avoidPeriods).toHaveLength(1);
      expect(result.avoidPeriods[0].score).toBe(30);
    });

    it('should classify mid-range score as candidate period', () => {
      const monthData = createMockMonthData(2024, 6);
      const scoringResult = createMockScoringResult(65, ['괜찮은 시기']);

      classifier.addPeriod(monthData, scoringResult);
      const result = classifier.getResult();

      expect(result.candidatePeriods).toHaveLength(1);
      expect(result.candidatePeriods[0].score).toBe(65);
    });

    it('should not classify scores between avoid and 60 as anything', () => {
      const monthData = createMockMonthData(2024, 6);
      const scoringResult = createMockScoringResult(50); // Between 40 and 60

      classifier.addPeriod(monthData, scoringResult);
      const result = classifier.getResult();

      expect(result.optimalPeriods).toHaveLength(0);
      expect(result.candidatePeriods).toHaveLength(0);
      expect(result.avoidPeriods).toHaveLength(0);
    });
  });

  describe('Threshold boundary conditions', () => {
    it('should classify score exactly at optimal threshold as optimal', () => {
      const classifier = new PeriodClassifier({ optimal: 70, avoid: 40 });
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(70));

      const result = classifier.getResult();
      expect(result.optimalPeriods).toHaveLength(1);
    });

    it('should classify score just below optimal as candidate if >= 60', () => {
      const classifier = new PeriodClassifier({ optimal: 70, avoid: 40 });
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(69));

      const result = classifier.getResult();
      expect(result.candidatePeriods).toHaveLength(1);
    });

    it('should classify score at avoid threshold as not avoid (>=)', () => {
      const classifier = new PeriodClassifier({ optimal: 70, avoid: 40 });
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(40));

      const result = classifier.getResult();
      expect(result.avoidPeriods).toHaveLength(0);
    });

    it('should classify score just below avoid as avoid', () => {
      const classifier = new PeriodClassifier({ optimal: 70, avoid: 40 });
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(39));

      const result = classifier.getResult();
      expect(result.avoidPeriods).toHaveLength(1);
    });
  });

  describe('Grade assignment', () => {
    let classifier: PeriodClassifier;

    beforeEach(() => {
      classifier = new PeriodClassifier();
    });

    it('should assign S grade for score >= 85', () => {
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(85));
      const result = classifier.getResult();
      expect(result.optimalPeriods[0].grade).toBe('S');
    });

    it('should assign A grade for score 75-84', () => {
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(80));
      const result = classifier.getResult();
      expect(result.optimalPeriods[0].grade).toBe('A');
    });

    it('should assign B grade for score 65-74', () => {
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(70));
      const result = classifier.getResult();
      expect(result.optimalPeriods[0].grade).toBe('B');
    });

    it('should assign C grade for score 55-64', () => {
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(60));
      const result = classifier.getResult();
      expect(result.candidatePeriods[0].grade).toBe('C');
    });

    it('should assign D grade for score < 55', () => {
      const classifier = new PeriodClassifier({ optimal: 50, avoid: 30 });
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(50));
      const result = classifier.getResult();
      expect(result.optimalPeriods[0].grade).toBe('D');
    });
  });

  describe('Date formatting', () => {
    it('should format dates correctly', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(85));

      const result = classifier.getResult();
      expect(result.optimalPeriods[0].startDate).toBe('2024-06-01');
      expect(result.optimalPeriods[0].endDate).toBe('2024-06-30');
    });

    it('should handle single-digit months', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 1), createMockScoringResult(85));

      const result = classifier.getResult();
      expect(result.optimalPeriods[0].startDate).toBe('2024-01-01');
      expect(result.optimalPeriods[0].endDate).toBe('2024-01-31');
    });

    it('should handle February in leap year', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 2), createMockScoringResult(85));

      const result = classifier.getResult();
      expect(result.optimalPeriods[0].endDate).toBe('2024-02-29');
    });

    it('should handle February in non-leap year', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2023, 2), createMockScoringResult(85));

      const result = classifier.getResult();
      expect(result.optimalPeriods[0].endDate).toBe('2023-02-28');
    });
  });

  describe('Advice generation', () => {
    let classifier: PeriodClassifier;

    beforeEach(() => {
      classifier = new PeriodClassifier();
    });

    it('should generate enthusiastic advice for score >= 85', () => {
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(90));
      const result = classifier.getResult();
      expect(result.optimalPeriods[0].advice).toContain('최고');
    });

    it('should generate positive advice for score 75-84', () => {
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(80));
      const result = classifier.getResult();
      expect(result.optimalPeriods[0].advice).toContain('매우 좋은');
    });

    it('should generate cautiously positive advice for score 65-74', () => {
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(70));
      const result = classifier.getResult();
      expect(result.optimalPeriods[0].advice).toContain('긍정');
    });
  });

  describe('Warning generation', () => {
    it('should generate warning from avoid reasons', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(
        createMockMonthData(2024, 6),
        createMockScoringResult(30, [], ['겁재운 주의'])
      );

      const result = classifier.getResult();
      expect(result.avoidPeriods[0].warning).toContain('겁재운 주의');
    });

    it('should generate default warning when no reasons', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(
        createMockMonthData(2024, 6),
        createMockScoringResult(30, [], [])
      );

      const result = classifier.getResult();
      expect(result.avoidPeriods[0].warning).toContain('신중');
    });
  });

  describe('Sorting', () => {
    it('should sort optimal periods by score descending', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 1), createMockScoringResult(75));
      classifier.addPeriod(createMockMonthData(2024, 2), createMockScoringResult(90));
      classifier.addPeriod(createMockMonthData(2024, 3), createMockScoringResult(80));

      const result = classifier.getResult();
      expect(result.optimalPeriods[0].score).toBe(90);
      expect(result.optimalPeriods[1].score).toBe(80);
      expect(result.optimalPeriods[2].score).toBe(75);
    });

    it('should sort candidate periods by score descending', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 1), createMockScoringResult(62));
      classifier.addPeriod(createMockMonthData(2024, 2), createMockScoringResult(68));
      classifier.addPeriod(createMockMonthData(2024, 3), createMockScoringResult(65));

      const result = classifier.getResult();
      expect(result.candidatePeriods[0].score).toBe(68);
      expect(result.candidatePeriods[1].score).toBe(65);
      expect(result.candidatePeriods[2].score).toBe(62);
    });

    it('should sort avoid periods by score ascending', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 1), createMockScoringResult(35));
      classifier.addPeriod(createMockMonthData(2024, 2), createMockScoringResult(25));
      classifier.addPeriod(createMockMonthData(2024, 3), createMockScoringResult(30));

      const result = classifier.getResult();
      expect(result.avoidPeriods[0].score).toBe(25);
      expect(result.avoidPeriods[1].score).toBe(30);
      expect(result.avoidPeriods[2].score).toBe(35);
    });
  });

  describe('getOptimalPeriods()', () => {
    it('should return copy of optimal periods', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(85));

      const periods1 = classifier.getOptimalPeriods();
      const periods2 = classifier.getOptimalPeriods();

      expect(periods1).not.toBe(periods2);
      expect(periods1).toEqual(periods2);
    });
  });

  describe('getAvoidPeriods()', () => {
    it('should return copy of avoid periods', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(30));

      const periods1 = classifier.getAvoidPeriods();
      const periods2 = classifier.getAvoidPeriods();

      expect(periods1).not.toBe(periods2);
      expect(periods1).toEqual(periods2);
    });
  });

  describe('getCandidatePeriods()', () => {
    it('should return copy of candidate periods', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(65));

      const periods1 = classifier.getCandidatePeriods();
      const periods2 = classifier.getCandidatePeriods();

      expect(periods1).not.toBe(periods2);
      expect(periods1).toEqual(periods2);
    });
  });

  describe('getStatistics()', () => {
    it('should calculate correct statistics', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 1), createMockScoringResult(85));
      classifier.addPeriod(createMockMonthData(2024, 2), createMockScoringResult(75));
      classifier.addPeriod(createMockMonthData(2024, 3), createMockScoringResult(65));
      classifier.addPeriod(createMockMonthData(2024, 4), createMockScoringResult(30));

      const stats = classifier.getStatistics();

      expect(stats.totalPeriods).toBe(4);
      expect(stats.optimalCount).toBe(2);
      expect(stats.candidateCount).toBe(1);
      expect(stats.avoidCount).toBe(1);
      expect(stats.averageOptimalScore).toBe(80);
    });

    it('should handle empty classifier', () => {
      const classifier = new PeriodClassifier();
      const stats = classifier.getStatistics();

      expect(stats.totalPeriods).toBe(0);
      expect(stats.optimalCount).toBe(0);
      expect(stats.averageOptimalScore).toBe(0);
    });
  });

  describe('reset()', () => {
    it('should clear all periods', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 1), createMockScoringResult(85));
      classifier.addPeriod(createMockMonthData(2024, 2), createMockScoringResult(65));
      classifier.addPeriod(createMockMonthData(2024, 3), createMockScoringResult(30));

      classifier.reset();
      const result = classifier.getResult();

      expect(result.optimalPeriods).toHaveLength(0);
      expect(result.candidatePeriods).toHaveLength(0);
      expect(result.avoidPeriods).toHaveLength(0);
    });

    it('should allow adding periods after reset', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 1), createMockScoringResult(85));
      classifier.reset();
      classifier.addPeriod(createMockMonthData(2024, 2), createMockScoringResult(90));

      const result = classifier.getResult();
      expect(result.optimalPeriods).toHaveLength(1);
      expect(result.optimalPeriods[0].score).toBe(90);
    });
  });

  describe('Edge cases', () => {
    it('should handle year boundary', () => {
      const classifier = new PeriodClassifier();
      classifier.addPeriod(createMockMonthData(2024, 12), createMockScoringResult(85));
      classifier.addPeriod(createMockMonthData(2025, 1), createMockScoringResult(80));

      const result = classifier.getResult();
      expect(result.optimalPeriods).toHaveLength(2);
      expect(result.optimalPeriods[0].startDate).toContain('2024');
      expect(result.optimalPeriods[1].startDate).toContain('2025');
    });

    it('should handle large number of periods', () => {
      const classifier = new PeriodClassifier();

      for (let i = 0; i < 100; i++) {
        const month = (i % 12) + 1;
        const year = 2024 + Math.floor(i / 12);
        classifier.addPeriod(
          createMockMonthData(year, month),
          createMockScoringResult(50 + (i % 40))
        );
      }

      const result = classifier.getResult();
      expect(result.optimalPeriods.length + result.candidatePeriods.length + result.avoidPeriods.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Custom thresholds', () => {
    it('should respect higher optimal threshold', () => {
      const classifier = new PeriodClassifier({ optimal: 80, avoid: 40 });
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(75));

      const result = classifier.getResult();
      expect(result.optimalPeriods).toHaveLength(0);
      expect(result.candidatePeriods).toHaveLength(1);
    });

    it('should respect lower avoid threshold', () => {
      const classifier = new PeriodClassifier({ optimal: 70, avoid: 30 });
      classifier.addPeriod(createMockMonthData(2024, 6), createMockScoringResult(35));

      const result = classifier.getResult();
      expect(result.avoidPeriods).toHaveLength(0);
    });
  });
});
