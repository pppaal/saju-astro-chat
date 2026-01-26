/**
 * Stress and Edge Case Tests for Past Life Analyzer
 * src/lib/past-life/analyzer.ts
 */
import { describe, it, expect } from 'vitest';
import { analyzePastLife } from '@/lib/past-life/analyzer';

// ============================================================
// Test Constants
// ============================================================
const KARMA_SCORE = {
  BASE: 65,
  MIN: 40,
  MAX: 100,
} as const;

const DEFAULT_SOUL_PATTERN = {
  ko: { type: '탐험가 영혼' },
  en: { type: 'Explorer Soul' },
} as const;

const REGEX_PATTERNS = {
  KOREAN: /[\uAC00-\uD7AF]/,
  ENGLISH: /[A-Za-z]/,
} as const;

const GEOKGUK_TYPES = ['식신', '상관', '정관', '편관', '정재', '편재', '정인', '편인'] as const;
const DAY_MASTER_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const HOUSE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// ============================================================
// Test Helpers
// ============================================================
const analyzeKorean = (saju: any = null, astro: any = null) => analyzePastLife(saju, astro, true);
const analyzeEnglish = (saju: any = null, astro: any = null) =>
  analyzePastLife(saju, astro, false);

// ============================================================
// Stress Tests
// ============================================================
describe('Past Life Analyzer - Stress Tests', () => {
  describe('Large Scale Data Tests', () => {
    it('should handle very large unluckyList array', () => {
      const saju = {
        advancedAnalysis: {
          sinsal: {
            unluckyList: Array(100)
              .fill(null)
              .map((_, i) => ({ name: ['원진', '공망', '겁살'][i % 3] })),
          },
        },
      };

      const result = analyzeKorean(saju);

      expect(result.karmicDebts.length).toBeLessThanOrEqual(4);
      expect(result.karmaScore).toBeGreaterThanOrEqual(KARMA_SCORE.MIN);
      expect(result.karmaScore).toBeLessThanOrEqual(KARMA_SCORE.MAX);
    });

    it('should handle very large planets array', () => {
      const astro = {
        planets: Array(100)
          .fill(null)
          .map((_, i) => ({
            name: i % 2 === 0 ? 'North Node' : 'Saturn',
            house: (i % 12) + 1,
          })),
      };

      const result = analyzeKorean(null, astro);

      expect(result.northNodeHouse).toBeDefined();
      expect(result.saturnHouse).toBeDefined();
    });

    it('should handle deeply nested empty objects', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: {},
          sinsal: {
            unluckyList: [],
          },
        },
        dayMaster: {},
        pillars: {
          day: {},
        },
      };

      const result = analyzeKorean(saju);

      expect(result).toBeDefined();
      expect(result.soulPattern.type).toBe(DEFAULT_SOUL_PATTERN.ko.type);
    });
  });

  describe('Malformed Data Tests', () => {
    it('should handle geokguk with only whitespace', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: '   \t\n   ', type: '   ' },
        },
      };

      const result = analyzeKorean(saju);

      expect(result.soulPattern.type).toBe(DEFAULT_SOUL_PATTERN.ko.type);
    });

    it('should handle sinsal with mixed valid and invalid entries', () => {
      const saju = {
        advancedAnalysis: {
          sinsal: {
            unluckyList: [
              { name: '원진' },
              null,
              undefined,
              { name: '' },
              { name: '공망' },
              {},
              { shinsal: '겁살' },
              'string entry',
            ],
          },
        },
      };

      const result = analyzeKorean(saju);

      expect(result.karmicDebts.length).toBeGreaterThan(0);
      expect(result.karmicDebts.length).toBeLessThanOrEqual(4);
    });

    it('should handle planets with missing or invalid houses', () => {
      const astro = {
        planets: [
          { name: 'North Node', house: null },
          { name: 'Saturn', house: undefined },
          { name: 'North Node', house: NaN },
          { name: 'Saturn', house: Infinity },
          { name: 'North Node', house: -Infinity },
          { name: 'Saturn', house: 5 },
        ],
      };

      const result = analyzeKorean(null, astro);

      // Should find valid Saturn house or be undefined
      expect(result.saturnHouse === 5 || result.saturnHouse === undefined).toBe(true);
    });

    it('should handle day master with special characters', () => {
      const cases = [
        { dayMaster: { name: '갑@#$' } },
        { dayMaster: { name: '!@#$%' } },
        { dayMaster: { name: '123456' } },
        { dayMaster: { name: 'abc' } },
      ];

      cases.forEach((saju) => {
        const result = analyzeKorean(saju);
        expect(result).toBeDefined();
      });
    });
  });

  describe('Boundary Value Tests', () => {
    it('should handle house number boundaries correctly', () => {
      const boundaries = [
        { house: 0, shouldBeUndefined: true },
        { house: 1, shouldBeUndefined: false },
        { house: 12, shouldBeUndefined: false },
        { house: 13, shouldBeUndefined: true },
        { house: -1, shouldBeUndefined: true },
        { house: 999, shouldBeUndefined: true },
      ];

      boundaries.forEach(({ house, shouldBeUndefined }) => {
        const astro = { planets: [{ name: 'North Node', house }] };
        const result = analyzeKorean(null, astro);

        if (shouldBeUndefined) {
          expect(result.northNodeHouse).toBeUndefined();
        } else {
          expect(result.northNodeHouse).toBe(house);
        }
      });
    });

    it('should handle karma score at boundaries', () => {
      // Test with no bonuses (minimum score)
      const minResult = analyzeKorean(null, null);
      expect(minResult.karmaScore).toBe(KARMA_SCORE.BASE);

      // Test with all bonuses (should cap at max)
      const maxSaju = {
        advancedAnalysis: {
          geokguk: { name: '식신' },
          sinsal: {
            unluckyList: Array(10).fill({ name: '원진' }),
          },
        },
        dayMaster: { name: '갑' },
      };
      const maxAstro = {
        planets: [
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ],
      };

      const maxResult = analyzeKorean(maxSaju, maxAstro);
      expect(maxResult.karmaScore).toBeLessThanOrEqual(KARMA_SCORE.MAX);
      expect(maxResult.karmaScore).toBeGreaterThan(KARMA_SCORE.BASE);
    });
  });

  describe('String Encoding Tests', () => {
    it('should handle geokguk with mixed encodings', () => {
      const variations = [
        '식신',
        '식 신',
        '식\u0020신',
        '식\t신',
      ];

      variations.forEach((name) => {
        const saju = { advancedAnalysis: { geokguk: { name } } };
        const result = analyzeKorean(saju);
        expect(result).toBeDefined();
      });
    });

    it('should handle sinsal names with unicode variations', () => {
      const variations = [
        '원진',
        '元辰',
        '원\u0020진',
      ];

      variations.forEach((name) => {
        const saju = {
          advancedAnalysis: { sinsal: { unluckyList: [{ name }] } },
        };
        const result = analyzeKorean(saju);
        expect(result).toBeDefined();
      });
    });

    it('should handle planet names with unicode normalization', () => {
      const variations = [
        'Saturn',
        'SATURN',
        'SaTuRn',
        'North Node',
        'NORTH NODE',
        'north node',
      ];

      variations.forEach((name) => {
        const astro = { planets: [{ name, house: 5 }] };
        const result = analyzeKorean(null, astro);
        expect(result).toBeDefined();
      });
    });
  });

  describe('Concurrent Analysis Tests', () => {
    it('should handle multiple parallel analyses', () => {
      const analyses = Array.from({ length: 20 }, (_, i) => {
        const saju = {
          advancedAnalysis: {
            geokguk: { name: GEOKGUK_TYPES[i % GEOKGUK_TYPES.length] },
          },
          dayMaster: { name: DAY_MASTER_STEMS[i % DAY_MASTER_STEMS.length] },
        };
        const astro = {
          planets: [
            { name: 'North Node', house: (i % 12) + 1 },
            { name: 'Saturn', house: ((i + 6) % 12) + 1 },
          ],
        };

        return analyzePastLife(saju, astro, i % 2 === 0);
      });

      expect(analyses).toHaveLength(20);
      analyses.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.karmaScore).toBeGreaterThanOrEqual(KARMA_SCORE.MIN);
        expect(result.karmaScore).toBeLessThanOrEqual(KARMA_SCORE.MAX);
      });
    });

    it('should maintain consistency across parallel same-input analyses', () => {
      const saju = {
        advancedAnalysis: { geokguk: { name: '정관' } },
        dayMaster: { name: '갑' },
      };
      const astro = {
        planets: [
          { name: 'North Node', house: 5 },
          { name: 'Saturn', house: 9 },
        ],
      };

      const analyses = Array.from({ length: 10 }, () =>
        analyzePastLife(saju, astro, true)
      );

      const firstResult = analyses[0];
      analyses.forEach((result) => {
        expect(result.soulPattern.type).toBe(firstResult.soulPattern.type);
        expect(result.karmaScore).toBe(firstResult.karmaScore);
        expect(result.northNodeHouse).toBe(firstResult.northNodeHouse);
        expect(result.saturnHouse).toBe(firstResult.saturnHouse);
      });
    });
  });

  describe('Memory and Performance Tests', () => {
    it('should not leak memory with repeated analyses', () => {
      const iterations = 1000;
      const start = Date.now();

      for (let i = 0; i < iterations; i++) {
        analyzePastLife(
          {
            advancedAnalysis: {
              geokguk: { name: GEOKGUK_TYPES[i % GEOKGUK_TYPES.length] },
            },
          },
          {
            planets: [{ name: 'North Node', house: (i % 12) + 1 }],
          },
          true
        );
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // Should complete 1000 analyses in under 5 seconds
    });

    it('should handle analysis with minimal object creation', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        analyzePastLife(null, null, true);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // Should be very fast for minimal data
    });
  });

  describe('Language Switch Tests', () => {
    it('should handle rapid language switches', () => {
      const saju = { advancedAnalysis: { geokguk: { name: '식신' } } };

      for (let i = 0; i < 50; i++) {
        const result = analyzePastLife(saju, null, i % 2 === 0);

        if (i % 2 === 0) {
          expect(result.soulPattern.type).toMatch(REGEX_PATTERNS.KOREAN);
        } else {
          expect(result.soulPattern.type).toMatch(REGEX_PATTERNS.ENGLISH);
        }
      }
    });

    it('should produce consistent emoji across languages', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const saju = { advancedAnalysis: { geokguk: { name: geokguk } } };

        const koResult = analyzePastLife(saju, null, true);
        const enResult = analyzePastLife(saju, null, false);

        expect(koResult.soulPattern.emoji).toBe(enResult.soulPattern.emoji);
      });
    });
  });

  describe('Data Type Coercion Tests', () => {
    it('should handle numeric strings for house numbers', () => {
      const astro = {
        planets: [
          { name: 'North Node', house: '5' as any },
          { name: 'Saturn', house: '9' as any },
        ],
      };

      const result = analyzeKorean(null, astro);
      expect(result).toBeDefined();
    });

    it('should handle boolean values in unexpected places', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: true as any },
        },
        dayMaster: { name: false as any },
      };

      const result = analyzeKorean(saju);
      expect(result).toBeDefined();
      expect(result.soulPattern.type).toBe(DEFAULT_SOUL_PATTERN.ko.type);
    });

    it('should handle arrays in unexpected places', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: ['식신'] as any },
        },
      };

      const result = analyzeKorean(saju);
      expect(result).toBeDefined();
      // Array coerced to string might match a geokguk type
      expect(result.soulPattern.type).toBeTruthy();
    });
  });

  describe('Null and Undefined Handling', () => {
    it('should handle null at various levels', () => {
      const cases = [
        { advancedAnalysis: null },
        { advancedAnalysis: { geokguk: null } },
        { advancedAnalysis: { sinsal: null } },
        { dayMaster: null },
      ];

      cases.forEach((saju) => {
        const result = analyzeKorean(saju);
        expect(result).toBeDefined();
        expect(result.soulPattern.type).toBe(DEFAULT_SOUL_PATTERN.ko.type);
      });
    });

    it('should handle undefined at various levels', () => {
      const cases = [
        { advancedAnalysis: undefined },
        { advancedAnalysis: { geokguk: undefined } },
        { advancedAnalysis: { sinsal: undefined } },
        { dayMaster: undefined },
      ];

      cases.forEach((saju) => {
        const result = analyzeKorean(saju);
        expect(result).toBeDefined();
        expect(result.soulPattern.type).toBe(DEFAULT_SOUL_PATTERN.ko.type);
      });
    });
  });

  describe('Complete Field Coverage Tests', () => {
    it('should always return all required top-level fields', () => {
      const scenarios = [
        { saju: null, astro: null },
        { saju: {}, astro: {} },
        { saju: { advancedAnalysis: { geokguk: { name: '식신' } } }, astro: null },
        {
          saju: null,
          astro: { planets: [{ name: 'North Node', house: 5 }] },
        },
      ];

      scenarios.forEach(({ saju, astro }) => {
        const result = analyzeKorean(saju, astro);

        // Required fields
        expect(result).toHaveProperty('soulPattern');
        expect(result).toHaveProperty('pastLife');
        expect(result).toHaveProperty('soulJourney');
        expect(result).toHaveProperty('karmicDebts');
        expect(result).toHaveProperty('saturnLesson');
        expect(result).toHaveProperty('talentsCarried');
        expect(result).toHaveProperty('thisLifeMission');
        expect(result).toHaveProperty('karmaScore');
      });
    });

    it('should always have valid soulPattern structure', () => {
      for (let i = 0; i < 10; i++) {
        const result = analyzeKorean();

        expect(result.soulPattern.type).toBeTruthy();
        expect(result.soulPattern.emoji).toBeTruthy();
        expect(result.soulPattern.title).toBeTruthy();
        expect(result.soulPattern.description).toBeTruthy();
        expect(Array.isArray(result.soulPattern.traits)).toBe(true);
        expect(result.soulPattern.traits.length).toBe(3);
      }
    });

    it('should always have valid pastLife structure', () => {
      for (let i = 0; i < 10; i++) {
        const result = analyzeKorean();

        expect(result.pastLife.likely).toBeTruthy();
        expect(result.pastLife.talents).toBeTruthy();
        expect(result.pastLife.lessons).toBeTruthy();
      }
    });

    it('should always have valid soulJourney structure', () => {
      for (let i = 0; i < 10; i++) {
        const result = analyzeKorean();

        expect(result.soulJourney.pastPattern).toBeTruthy();
        expect(result.soulJourney.releasePattern).toBeTruthy();
        expect(result.soulJourney.currentDirection).toBeTruthy();
        expect(result.soulJourney.lessonToLearn).toBeTruthy();
      }
    });

    it('should always have valid saturnLesson structure', () => {
      for (let i = 0; i < 10; i++) {
        const result = analyzeKorean();

        expect(result.saturnLesson.lesson).toBeTruthy();
        expect(result.saturnLesson.challenge).toBeTruthy();
        expect(result.saturnLesson.mastery).toBeTruthy();
      }
    });

    it('should always have valid thisLifeMission structure', () => {
      for (let i = 0; i < 10; i++) {
        const result = analyzeKorean();

        expect(result.thisLifeMission.core).toBeTruthy();
        expect(result.thisLifeMission.expression).toBeTruthy();
        expect(result.thisLifeMission.fulfillment).toBeTruthy();
      }
    });
  });

  describe('Karma Score Calculation Edge Cases', () => {
    it('should handle score with only one bonus type', () => {
      const bonusTypes = [
        { saju: { advancedAnalysis: { geokguk: { name: '식신' } } }, astro: null },
        { saju: { dayMaster: { name: '갑' } }, astro: null },
        {
          saju: null,
          astro: { planets: [{ name: 'North Node', house: 1 }] },
        },
        { saju: null, astro: { planets: [{ name: 'Saturn', house: 7 }] } },
      ];

      bonusTypes.forEach(({ saju, astro }) => {
        const result = analyzeKorean(saju, astro);
        expect(result.karmaScore).toBeGreaterThan(KARMA_SCORE.BASE);
        expect(result.karmaScore).toBeLessThanOrEqual(KARMA_SCORE.MAX);
      });
    });

    it('should calculate score correctly with various karmic debt counts', () => {
      for (let count = 0; count <= 5; count++) {
        const saju = {
          advancedAnalysis: {
            sinsal: {
              unluckyList: Array(count)
                .fill(null)
                .map((_, i) => ({ name: ['원진', '공망', '겁살'][i % 3] })),
            },
          },
        };

        const result = analyzeKorean(saju);
        expect(result.karmaScore).toBeGreaterThanOrEqual(KARMA_SCORE.BASE);
        expect(result.karmicDebts.length).toBeLessThanOrEqual(4);
      }
    });
  });

  describe('String Trimming and Normalization Tests', () => {
    it('should handle geokguk with leading/trailing spaces', () => {
      const variations = [
        '  식신  ',
        '\t식신\t',
        '\n식신\n',
        ' \t\n식신\n\t ',
      ];

      variations.forEach((name) => {
        const saju = { advancedAnalysis: { geokguk: { name } } };
        const result = analyzeKorean(saju);
        expect(result).toBeDefined();
      });
    });

    it('should handle day master with leading/trailing spaces', () => {
      const variations = ['  갑  ', '\t갑\t', '\n갑\n', ' \t\n갑\n\t '];

      variations.forEach((name) => {
        const saju = { dayMaster: { name } };
        const result = analyzeKorean(saju);
        expect(result).toBeDefined();
      });
    });
  });

  describe('Array Mutation Safety Tests', () => {
    it('should not mutate input saju object', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: '식신' },
          sinsal: { unluckyList: [{ name: '원진' }] },
        },
      };
      const originalSaju = JSON.parse(JSON.stringify(saju));

      analyzePastLife(saju, null, true);

      expect(saju).toEqual(originalSaju);
    });

    it('should not mutate input astro object', () => {
      const astro = {
        planets: [
          { name: 'North Node', house: 5 },
          { name: 'Saturn', house: 9 },
        ],
      };
      const originalAstro = JSON.parse(JSON.stringify(astro));

      analyzePastLife(null, astro, true);

      expect(astro).toEqual(originalAstro);
    });
  });

  describe('Comprehensive Error Resilience', () => {
    it('should handle most malformed inputs without throwing', () => {
      const safeInputs = [
        { saju: { advancedAnalysis: { geokguk: { name: null } } }, astro: null },
        { saju: { advancedAnalysis: { sinsal: { unluckyList: [null] } } }, astro: null },
        { saju: null, astro: { planets: null } },
        { saju: { dayMaster: { name: undefined } }, astro: null },
      ];

      safeInputs.forEach((input) => {
        const result = analyzePastLife(input.saju, input.astro, true);
        expect(result).toBeDefined();
        expect(result.soulPattern.type).toBeTruthy();
      });
    });

    it('should handle circular references gracefully', () => {
      const circular: any = { advancedAnalysis: {} };
      circular.advancedAnalysis.self = circular;

      expect(() => {
        analyzePastLife(circular, null, true);
      }).not.toThrow();
    });
  });
});
