// tests/lib/destiny-map/calendar/scoring-comprehensive.test.ts
import { describe, it, expect } from 'vitest';
import { createScoreCalculator } from '@/lib/destiny-map/calendar/scoring-factory';
import {
  DAEUN_CONFIG,
  SEUN_CONFIG,
  WOLUN_CONFIG,
  ILJIN_CONFIG,
} from '@/lib/destiny-map/calendar/scoring-factory-config';
import { calculateAdjustedScore } from '@/lib/destiny-map/calendar/scoring-config';

describe('Scoring Factory - Comprehensive Tests', () => {
  describe('Daeun Score Calculator', () => {
    const calculateDaeunScore = createScoreCalculator(DAEUN_CONFIG);
    const baseScore = calculateAdjustedScore(DAEUN_CONFIG.maxScore, [], DAEUN_CONFIG.maxRaw);

    it('should return 0 for empty input', () => {
      expect(calculateDaeunScore({})).toBe(baseScore);
    });

    it('should score positive sibsin: inseong', () => {
      const score = calculateDaeunScore({ sibsin: 'inseong' });
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(DAEUN_CONFIG.maxScore);
    });

    it('should score negative sibsin: gwansal', () => {
      const score = calculateDaeunScore({ sibsin: 'gwansal' });
      expect(score).toBeLessThan(calculateDaeunScore({}));
    });

    it('should add bonus for hasYukhap', () => {
      const baseline = calculateDaeunScore({});
      const withYukhap = calculateDaeunScore({ hasYukhap: true });
      expect(withYukhap).toBeGreaterThan(baseline);
    });

    it('should penalize for hasChung', () => {
      const baseline = calculateDaeunScore({});
      const withChung = calculateDaeunScore({ hasChung: true });
      expect(withChung).toBeLessThan(baseline);
    });

    it('should handle combined factors', () => {
      const score = calculateDaeunScore({
        sibsin: 'inseong',
        hasYukhap: true,
        hasSamhapPositive: true,
      });
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(DAEUN_CONFIG.maxScore);
    });

    it('should cap at maxScore', () => {
      const score = calculateDaeunScore({
        sibsin: 'inseong',
        hasYukhap: true,
        hasSamhapPositive: true,
      });
      expect(score).toBeLessThanOrEqual(DAEUN_CONFIG.maxScore);
    });
  });

  describe('Seun Score Calculator', () => {
    const calculateSeunScore = createScoreCalculator(SEUN_CONFIG);
    const baseScore = calculateAdjustedScore(SEUN_CONFIG.maxScore, [], SEUN_CONFIG.maxRaw);

    it('should return 0 for empty input', () => {
      expect(calculateSeunScore({})).toBe(baseScore);
    });

    it('should handle samjae with gwiin (cancellation)', () => {
      const baseline = calculateSeunScore({ isSamjaeYear: true });
      const withGwiin = calculateSeunScore({ isSamjaeYear: true, hasGwiin: true });
      expect(withGwiin).toBeGreaterThan(baseline);
    });

    it('should handle samjae with chung (worse)', () => {
      const samjaeOnly = calculateSeunScore({ isSamjaeYear: true });
      const samjaeWithChung = calculateSeunScore({ isSamjaeYear: true, hasChung: true });
      expect(samjaeWithChung).toBeLessThan(samjaeOnly);
    });

    it('should handle samjae base penalty', () => {
      const noSamjae = calculateSeunScore({});
      const withSamjae = calculateSeunScore({ isSamjaeYear: true });
      expect(withSamjae).toBeLessThan(noSamjae);
    });

    it('should handle all positive factors', () => {
      const score = calculateSeunScore({
        sibsin: 'inseong',
        hasYukhap: true,
        hasSamhapPositive: true,
      });
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Wolun Score Calculator', () => {
    const calculateWolunScore = createScoreCalculator(WOLUN_CONFIG);
    const baseScore = calculateAdjustedScore(WOLUN_CONFIG.maxScore, [], WOLUN_CONFIG.maxRaw);

    it('should return 0 for empty input', () => {
      expect(calculateWolunScore({})).toBe(baseScore);
    });

    it('should score positive sibsin', () => {
      const score = calculateWolunScore({ sibsin: 'jaeseong' });
      expect(score).toBeGreaterThan(0);
    });

    it('should score negative sibsin', () => {
      const score = calculateWolunScore({ sibsin: 'gwansal' });
      expect(score).toBeLessThan(calculateWolunScore({}));
    });
  });

  describe('Iljin Score Calculator', () => {
    const calculateIljinScore = createScoreCalculator(ILJIN_CONFIG);
    const baseScore = calculateAdjustedScore(ILJIN_CONFIG.maxScore, [], ILJIN_CONFIG.maxRaw);

    it('should return 0 for empty input', () => {
      expect(calculateIljinScore({})).toBe(baseScore);
    });

    it('should score sipsin (not sibsin)', () => {
      const score = calculateIljinScore({ sibsin: 'jeongyin' });
      expect(score).toBeGreaterThan(0);
    });

    it('should add bonus for special days: hasCheoneulGwiin', () => {
      const baseline = calculateIljinScore({});
      const withGwiin = calculateIljinScore({ hasCheoneulGwiin: true });
      expect(withGwiin).toBeGreaterThan(baseline);
    });

    it('should add bonus for hasGeonrok', () => {
      const baseline = calculateIljinScore({});
      const withGeonrok = calculateIljinScore({ hasGeonrok: true });
      expect(withGeonrok).toBeGreaterThan(baseline);
    });

    it('should penalize for hasGongmang', () => {
      const baseline = calculateIljinScore({});
      const withGongmang = calculateIljinScore({ hasGongmang: true });
      expect(withGongmang).toBeLessThan(baseline);
    });

    it('should penalize for hasWonjin', () => {
      const baseline = calculateIljinScore({});
      const withWonjin = calculateIljinScore({ hasWonjin: true });
      expect(withWonjin).toBeLessThan(baseline);
    });

    it('should handle branch interactions: hasChung', () => {
      const baseline = calculateIljinScore({});
      const withChung = calculateIljinScore({ hasChung: true });
      expect(withChung).toBeLessThan(baseline);
    });

    it('should handle multiple special days', () => {
      const score = calculateIljinScore({
        hasCheoneulGwiin: true,
        hasGeonrok: true,
        hasDohwa: true,
      });
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined properties gracefully', () => {
      const calculateDaeunScore = createScoreCalculator(DAEUN_CONFIG);
      const score = calculateDaeunScore({ sibsin: undefined, hasYukhap: undefined });
      const baseScore = calculateAdjustedScore(DAEUN_CONFIG.maxScore, [], DAEUN_CONFIG.maxRaw);
      expect(score).toBe(baseScore);
    });

    it('should handle unknown sibsin values', () => {
      const calculateDaeunScore = createScoreCalculator(DAEUN_CONFIG);
      const score = calculateDaeunScore({ sibsin: 'unknown_value' });
      const baseScore = calculateAdjustedScore(DAEUN_CONFIG.maxScore, [], DAEUN_CONFIG.maxRaw);
      expect(score).toBe(baseScore);
    });

    it('should handle mixed positive and negative factors', () => {
      const calculateDaeunScore = createScoreCalculator(DAEUN_CONFIG);
      const score = calculateDaeunScore({
        sibsin: 'inseong',
        hasYukhap: true,
        hasChung: true,
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(DAEUN_CONFIG.maxScore);
    });
  });

  describe('Consistency Tests', () => {
    it('should return same result for same input (Daeun)', () => {
      const calculateDaeunScore = createScoreCalculator(DAEUN_CONFIG);
      const input = { sibsin: 'inseong', hasYukhap: true };
      const score1 = calculateDaeunScore(input);
      const score2 = calculateDaeunScore(input);
      expect(score1).toBe(score2);
    });

    it('should return same result for same input (Iljin)', () => {
      const calculateIljinScore = createScoreCalculator(ILJIN_CONFIG);
      const input = { sibsin: 'jeongyin', hasCheoneulGwiin: true };
      const score1 = calculateIljinScore(input);
      const score2 = calculateIljinScore(input);
      expect(score1).toBe(score2);
    });
  });

  describe('Boundary Tests', () => {
    it('should never return negative scores', () => {
      const calculateDaeunScore = createScoreCalculator(DAEUN_CONFIG);
      const score = calculateDaeunScore({
        sibsin: 'gwansal',
        hasChung: true,
        hasGwansal: true,
        hasSamhapNegative: true,
      });
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should never exceed maxScore', () => {
      const calculateSeunScore = createScoreCalculator(SEUN_CONFIG);
      const score = calculateSeunScore({
        sibsin: 'inseong',
        hasYukhap: true,
        hasSamhapPositive: true,
        isSamjaeYear: true,
        hasGwiin: true,
      });
      expect(score).toBeLessThanOrEqual(SEUN_CONFIG.maxScore);
    });
  });
});
