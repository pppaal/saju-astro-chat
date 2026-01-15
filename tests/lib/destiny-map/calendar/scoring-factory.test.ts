import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock scoring-config
vi.mock('@/lib/destiny-map/calendar/scoring-config', () => ({
  calculateAdjustedScore: vi.fn((maxScore: number, adjustments: number[], maxRaw: number) => {
    const rawSum = adjustments.reduce((sum, val) => sum + val, 0);
    const normalizedSum = Math.min(rawSum / maxRaw, 1);
    return Math.round(maxScore * normalizedSum * 100) / 100;
  }),
}));

import {
  createScoreCalculator,
  type ScorerConfig,
  type ScorerInput,
} from '@/lib/destiny-map/calendar/scoring-factory';

describe('Scoring Factory', () => {
  describe('createScoreCalculator', () => {
    it('should create a score calculator function', () => {
      const config: ScorerConfig<ScorerInput> = {
        categoryName: 'test',
        maxScore: 10,
        maxRaw: 1.0,
        booleanPropertyMap: {},
      };

      const calculator = createScoreCalculator(config);

      expect(typeof calculator).toBe('function');
    });

    it('should return 0 for empty input with no matching scores', () => {
      const config: ScorerConfig<ScorerInput> = {
        categoryName: 'test',
        maxScore: 10,
        maxRaw: 1.0,
        booleanPropertyMap: {},
      };

      const calculator = createScoreCalculator(config);
      const score = calculator({});

      expect(score).toBe(0);
    });
  });

  describe('Sibsin Scores', () => {
    const configWithSibsin: ScorerConfig<ScorerInput> = {
      categoryName: 'daeun',
      maxScore: 8,
      maxRaw: 0.5,
      sibsinScores: {
        positive: {
          인성: 0.25,
          재성: 0.22,
          비견: 0.15,
        },
        negative: {
          관살: -0.18,
          상관: -0.15,
        },
      },
      booleanPropertyMap: {},
    };

    it('should apply positive sibsin score', () => {
      const calculator = createScoreCalculator(configWithSibsin);
      const score = calculator({ sibsin: '인성' });

      expect(score).toBeGreaterThan(0);
    });

    it('should apply negative sibsin score', () => {
      const calculator = createScoreCalculator(configWithSibsin);
      const score = calculator({ sibsin: '관살' });

      // Score should be 0 or negative normalized
      expect(score).toBeLessThanOrEqual(0);
    });

    it('should return 0 for unknown sibsin', () => {
      const calculator = createScoreCalculator(configWithSibsin);
      const score = calculator({ sibsin: '알수없음' });

      expect(score).toBe(0);
    });
  });

  describe('Sipsin Scores (Iljin style)', () => {
    const configWithSipsin: ScorerConfig<ScorerInput> = {
      categoryName: 'iljin',
      maxScore: 13,
      maxRaw: 0.8,
      sipsinScores: {
        인수: 0.35,
        식신: 0.30,
        정재: 0.25,
        편관: -0.25,
        상관: -0.20,
      },
      booleanPropertyMap: {},
    };

    it('should apply sipsin score', () => {
      const calculator = createScoreCalculator(configWithSipsin);
      const score = calculator({ sibsin: '인수' });

      expect(score).toBeGreaterThan(0);
    });

    it('should apply negative sipsin score', () => {
      const calculator = createScoreCalculator(configWithSipsin);
      const score = calculator({ sibsin: '편관' });

      expect(score).toBeLessThanOrEqual(0);
    });
  });

  describe('Boolean Property Map - Positive', () => {
    const config: ScorerConfig<ScorerInput> = {
      categoryName: 'test',
      maxScore: 10,
      maxRaw: 1.0,
      sibsinScores: {
        positive: {
          hasInseong: 0.3,
          hasJaeseong: 0.25,
        },
      },
      booleanPropertyMap: {
        positive: ['hasInseong', 'hasJaeseong'],
      },
    };

    it('should apply score for positive boolean property', () => {
      const calculator = createScoreCalculator(config);
      const score = calculator({ hasInseong: true });

      expect(score).toBeGreaterThan(0);
    });

    it('should not apply score for false boolean property', () => {
      const calculator = createScoreCalculator(config);
      const score = calculator({ hasInseong: false });

      expect(score).toBe(0);
    });

    it('should cumulate multiple positive properties', () => {
      const calculator = createScoreCalculator(config);
      const scoreSingle = calculator({ hasInseong: true });
      const scoreBoth = calculator({ hasInseong: true, hasJaeseong: true });

      expect(scoreBoth).toBeGreaterThan(scoreSingle);
    });
  });

  describe('Boolean Property Map - Negative', () => {
    const config: ScorerConfig<ScorerInput> = {
      categoryName: 'test',
      maxScore: 10,
      maxRaw: 1.0,
      sibsinScores: {
        negative: {
          hasChung: -0.2,
        },
      },
      negativeScores: {
        hyung: -0.15,
      },
      booleanPropertyMap: {
        negative: ['hasChung', 'hasHyung'],
      },
    };

    it('should apply negative score for negative property in sibsinScores', () => {
      const calculator = createScoreCalculator(config);
      const score = calculator({ hasChung: true });

      expect(score).toBeLessThanOrEqual(0);
    });

    it('should apply negative score from negativeScores', () => {
      const calculator = createScoreCalculator(config);
      const score = calculator({ hasHyung: true });

      expect(score).toBeLessThanOrEqual(0);
    });
  });

  describe('Branch Scores', () => {
    const config: ScorerConfig<ScorerInput> = {
      categoryName: 'branch',
      maxScore: 12,
      maxRaw: 0.6,
      branchScores: {
        yukhap: 0.2,
        samhap: 0.25,
        bangHap: 0.15,
        chung: -0.2,
        hyung: -0.15,
      },
      booleanPropertyMap: {
        branch: ['hasYukhap', 'hasSamhap', 'hasBangHap', 'hasChung', 'hasHyung'],
      },
    };

    it('should apply positive branch score', () => {
      const calculator = createScoreCalculator(config);
      const score = calculator({ hasYukhap: true });

      expect(score).toBeGreaterThan(0);
    });

    it('should apply negative branch score', () => {
      const calculator = createScoreCalculator(config);
      const score = calculator({ hasChung: true });

      expect(score).toBeLessThanOrEqual(0);
    });

    it('should handle multiple branch interactions', () => {
      const calculator = createScoreCalculator(config);
      const score = calculator({ hasYukhap: true, hasSamhap: true });

      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Special Scores', () => {
    const config: ScorerConfig<ScorerInput> = {
      categoryName: 'special',
      maxScore: 10,
      maxRaw: 0.5,
      specialScores: {
        cheoneulGwiin: 0.25,
        taeeul: 0.2,
        gilil: 0.15,
      },
      booleanPropertyMap: {
        special: ['hasCheoneulGwiin', 'hasTaeeul', 'hasGilil'],
      },
    };

    it('should apply special score', () => {
      const calculator = createScoreCalculator(config);
      const score = calculator({ hasCheoneulGwiin: true });

      expect(score).toBeGreaterThan(0);
    });

    it('should cumulate multiple special scores', () => {
      const calculator = createScoreCalculator(config);
      const scoreSingle = calculator({ hasCheoneulGwiin: true });
      const scoreMultiple = calculator({ hasCheoneulGwiin: true, hasTaeeul: true });

      expect(scoreMultiple).toBeGreaterThan(scoreSingle);
    });
  });

  describe('Samjae Special Case', () => {
    const config: ScorerConfig<ScorerInput> = {
      categoryName: 'seun',
      maxScore: 12,
      maxRaw: 0.8,
      samjaeConfig: {
        base: -0.15,
        withChung: -0.25,
        withGwiin: -0.05,
      },
      booleanPropertyMap: {},
    };

    it('should apply base samjae penalty', () => {
      const calculator = createScoreCalculator(config);
      const score = calculator({ isSamjaeYear: true });

      expect(score).toBeLessThan(0);
    });

    it('should apply samjae with chung penalty', () => {
      const calculator = createScoreCalculator(config);
      const scoreBase = calculator({ isSamjaeYear: true });
      const scoreWithChung = calculator({ isSamjaeYear: true, hasChung: true });

      // withChung should be worse than base
      expect(scoreWithChung).toBeLessThan(scoreBase);
    });

    it('should apply samjae with gwiin (mitigated)', () => {
      const calculator = createScoreCalculator(config);
      const scoreBase = calculator({ isSamjaeYear: true });
      const scoreWithGwiin = calculator({ isSamjaeYear: true, hasGwiin: true });

      // withGwiin should be better than base (less negative)
      expect(scoreWithGwiin).toBeGreaterThan(scoreBase);
    });

    it('should prioritize gwiin over chung', () => {
      const calculator = createScoreCalculator(config);
      const score = calculator({ isSamjaeYear: true, hasGwiin: true, hasChung: true });

      // Gwiin is checked first, so should get the mitigated score
      const scoreGwiinOnly = calculator({ isSamjaeYear: true, hasGwiin: true });
      expect(score).toBe(scoreGwiinOnly);
    });
  });

  describe('Combined Scoring', () => {
    const fullConfig: ScorerConfig<ScorerInput> = {
      categoryName: 'full',
      maxScore: 15,
      maxRaw: 1.0,
      sibsinScores: {
        positive: {
          인성: 0.25,
          재성: 0.2,
        },
        negative: {
          hasChung: -0.2,
        },
      },
      branchScores: {
        yukhap: 0.15,
        chung: -0.15,
      },
      specialScores: {
        cheoneulGwiin: 0.2,
      },
      booleanPropertyMap: {
        positive: [],
        negative: ['hasChung'],
        branch: ['hasYukhap'],
        special: ['hasCheoneulGwiin'],
      },
    };

    it('should combine multiple score sources', () => {
      const calculator = createScoreCalculator(fullConfig);
      const score = calculator({
        sibsin: '인성',
        hasYukhap: true,
        hasCheoneulGwiin: true,
      });

      expect(score).toBeGreaterThan(0);
    });

    it('should balance positive and negative scores', () => {
      const calculator = createScoreCalculator(fullConfig);
      const positiveScore = calculator({ sibsin: '인성' });
      const mixedScore = calculator({ sibsin: '인성', hasChung: true });

      expect(mixedScore).toBeLessThan(positiveScore);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty booleanPropertyMap', () => {
      const config: ScorerConfig<ScorerInput> = {
        categoryName: 'empty',
        maxScore: 10,
        maxRaw: 0.5,
        booleanPropertyMap: {},
      };

      const calculator = createScoreCalculator(config);
      const score = calculator({ randomProp: true });

      expect(score).toBe(0);
    });

    it('should handle undefined sibsin', () => {
      const config: ScorerConfig<ScorerInput> = {
        categoryName: 'test',
        maxScore: 10,
        maxRaw: 0.5,
        sibsinScores: {
          positive: { 인성: 0.3 },
        },
        booleanPropertyMap: {},
      };

      const calculator = createScoreCalculator(config);
      const score = calculator({});

      expect(score).toBe(0);
    });

    it('should handle missing score mappings', () => {
      const config: ScorerConfig<ScorerInput> = {
        categoryName: 'test',
        maxScore: 10,
        maxRaw: 0.5,
        booleanPropertyMap: {
          positive: ['unmappedProp'],
        },
      };

      const calculator = createScoreCalculator(config);
      const score = calculator({ unmappedProp: true });

      // Should not add any score if mapping not found
      expect(score).toBe(0);
    });

    it('should handle property with "has" prefix for negativeScores lookup', () => {
      const config: ScorerConfig<ScorerInput> = {
        categoryName: 'test',
        maxScore: 10,
        maxRaw: 0.5,
        negativeScores: {
          chung: -0.2, // Without "has" prefix
        },
        booleanPropertyMap: {
          negative: ['hasChung'], // With "has" prefix
        },
      };

      const calculator = createScoreCalculator(config);
      const score = calculator({ hasChung: true });

      expect(score).toBeLessThanOrEqual(0);
    });

    it('should handle property without "has" prefix for branch scores', () => {
      const config: ScorerConfig<ScorerInput> = {
        categoryName: 'test',
        maxScore: 10,
        maxRaw: 0.5,
        branchScores: {
          directProp: 0.2,
        },
        booleanPropertyMap: {
          branch: ['directProp'], // No "has" prefix
        },
      };

      const calculator = createScoreCalculator(config);
      const score = calculator({ directProp: true });

      expect(score).toBeGreaterThan(0);
    });
  });

  describe('Score Normalization', () => {
    it('should normalize scores within bounds', () => {
      const config: ScorerConfig<ScorerInput> = {
        categoryName: 'bounded',
        maxScore: 10,
        maxRaw: 0.5,
        sibsinScores: {
          positive: {
            인성: 0.5, // Max raw value
          },
        },
        booleanPropertyMap: {},
      };

      const calculator = createScoreCalculator(config);
      const score = calculator({ sibsin: '인성' });

      expect(score).toBeLessThanOrEqual(10);
    });

    it('should handle scores exceeding maxRaw', () => {
      const config: ScorerConfig<ScorerInput> = {
        categoryName: 'exceed',
        maxScore: 10,
        maxRaw: 0.3,
        sibsinScores: {
          positive: {
            인성: 0.5, // Exceeds maxRaw
          },
        },
        booleanPropertyMap: {},
      };

      const calculator = createScoreCalculator(config);
      const score = calculator({ sibsin: '인성' });

      // calculateAdjustedScore should cap at maxScore
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  describe('Real-world Configurations', () => {
    // Simulating Daeun (대운) configuration
    const daeunConfig: ScorerConfig<ScorerInput> = {
      categoryName: 'daeun',
      maxScore: 8,
      maxRaw: 0.5,
      sibsinScores: {
        positive: {
          인성: 0.25,
          재성: 0.22,
          비견: 0.15,
          식상: 0.12,
        },
        negative: {
          관살: -0.18,
          hasChung: -0.20,
        },
      },
      branchScores: {
        yukhap: 0.15,
        samhapPositive: 0.20,
      },
      booleanPropertyMap: {
        negative: ['hasChung'],
        branch: ['hasYukhap', 'hasSamhapPositive'],
      },
    };

    it('should calculate daeun score correctly', () => {
      const calculator = createScoreCalculator(daeunConfig);

      // Good daeun: 인성 sibsin with 육합
      const goodScore = calculator({ sibsin: '인성', hasYukhap: true });
      expect(goodScore).toBeGreaterThan(0);

      // Challenging daeun: 관살 sibsin with 충
      const challengingScore = calculator({ sibsin: '관살', hasChung: true });
      expect(challengingScore).toBeLessThanOrEqual(0);
    });

    // Simulating Seun (세운) configuration
    const seunConfig: ScorerConfig<ScorerInput> = {
      categoryName: 'seun',
      maxScore: 12,
      maxRaw: 0.8,
      sibsinScores: {
        positive: {
          인성: 0.30,
          재성: 0.28,
          식신: 0.25,
        },
        negative: {
          상관: -0.22,
          편관: -0.20,
        },
      },
      specialScores: {
        cheoneulGwiin: 0.15,
        taeeul: 0.12,
      },
      samjaeConfig: {
        base: -0.15,
        withChung: -0.25,
        withGwiin: -0.05,
      },
      booleanPropertyMap: {
        special: ['hasCheoneulGwiin', 'hasTaeeul'],
      },
    };

    it('should calculate seun score with samjae consideration', () => {
      const calculator = createScoreCalculator(seunConfig);

      // Good year: 인성 with 천을귀인
      const goodYear = calculator({ sibsin: '인성', hasCheoneulGwiin: true });
      expect(goodYear).toBeGreaterThan(0);

      // Samjae year with gwiin mitigation
      const samjaeWithGwiin = calculator({ isSamjaeYear: true, hasGwiin: true });
      const samjaeBase = calculator({ isSamjaeYear: true });
      expect(samjaeWithGwiin).toBeGreaterThan(samjaeBase);
    });
  });
});
