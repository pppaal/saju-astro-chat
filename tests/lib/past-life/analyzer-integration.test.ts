/**
 * Integration and Regression Tests for Past Life Analyzer
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
  GEOKGUK_BONUS: 10,
  NORTH_NODE_BONUS: 8,
  SATURN_BONUS: 5,
  DAY_MASTER_BONUS: 5,
  KARMIC_DEBT_BONUS: 3,
} as const;

const REGEX_PATTERNS = {
  KOREAN: /[\uAC00-\uD7AF]/,
  ENGLISH: /[A-Za-z]/,
} as const;

const GEOKGUK_TYPES = ['식신', '상관', '정관', '편관', '정재', '편재', '정인', '편인'] as const;
const DAY_MASTER_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;

// ============================================================
// Test Helpers
// ============================================================
const analyzeKorean = (saju: any = null, astro: any = null) => analyzePastLife(saju, astro, true);
const analyzeEnglish = (saju: any = null, astro: any = null) =>
  analyzePastLife(saju, astro, false);

// ============================================================
// Integration Tests
// ============================================================
describe('Past Life Analyzer - Integration Tests', () => {
  describe('Real-World Scenario Simulations', () => {
    it('should handle typical user input with complete birth data', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: '정관격', type: '정관' },
          sinsal: {
            unluckyList: [
              { name: '원진살' },
              { name: '공망' },
            ],
          },
        },
        dayMaster: { name: '갑', heavenlyStem: '갑목' },
        pillars: {
          day: { heavenlyStem: '갑목' },
        },
      };
      const astro = {
        planets: [
          { name: 'Sun', house: 1 },
          { name: 'Moon', house: 7 },
          { name: 'Mercury', house: 3 },
          { name: 'Venus', house: 5 },
          { name: 'Mars', house: 10 },
          { name: 'Jupiter', house: 9 },
          { name: 'Saturn', house: 4 },
          { name: 'Uranus', house: 11 },
          { name: 'Neptune', house: 12 },
          { name: 'Pluto', house: 8 },
          { name: 'North Node', house: 6 },
          { name: 'South Node', house: 12 },
        ],
      };

      const result = analyzeKorean(saju, astro);

      expect(result.soulPattern.type).toBe('지도자 영혼');
      expect(result.dayMaster).toBe('갑');
      expect(result.northNodeHouse).toBe(6);
      expect(result.saturnHouse).toBe(4);
      expect(result.karmicDebts.length).toBe(2);
      expect(result.karmaScore).toBeGreaterThan(KARMA_SCORE.BASE);
      expect(result.talentsCarried.length).toBeGreaterThan(0);
    });

    it('should handle minimal user input', () => {
      const saju = {
        dayMaster: { name: '을' },
      };

      const result = analyzeKorean(saju);

      expect(result.dayMaster).toBe('을');
      expect(result.thisLifeMission.core).toContain('부드러운 힘');
      expect(result.karmaScore).toBe(KARMA_SCORE.BASE + KARMA_SCORE.DAY_MASTER_BONUS);
    });

    it('should handle user with no karmic debts', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: '식신' },
          sinsal: { unluckyList: [] },
        },
        dayMaster: { name: '병' },
      };
      const astro = {
        planets: [
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ],
      };

      const result = analyzeKorean(saju, astro);

      expect(result.karmicDebts).toEqual([]);
      expect(result.soulPattern.type).toBe('창조자 영혼');
      const expectedScore =
        KARMA_SCORE.BASE +
        KARMA_SCORE.GEOKGUK_BONUS +
        KARMA_SCORE.NORTH_NODE_BONUS +
        KARMA_SCORE.SATURN_BONUS +
        KARMA_SCORE.DAY_MASTER_BONUS;
      expect(result.karmaScore).toBe(expectedScore);
    });

    it('should handle user with maximum karmic complexity', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: '편인격' },
          sinsal: {
            unluckyList: [
              { name: '원진살' },
              { name: '원진' },
              { name: '공망' },
              { name: '空亡' },
              { name: '겁살' },
              { name: '劫殺' },
              { name: '재살' },
              { name: '화개' },
            ],
          },
        },
        dayMaster: { name: '계', heavenlyStem: '계수' },
      };
      const astro = {
        planets: [
          { name: 'North Node', house: 12 },
          { name: 'Saturn', house: 8 },
        ],
      };

      const result = analyzeKorean(saju, astro);

      expect(result.soulPattern.type).toBe('신비가 영혼');
      expect(result.karmicDebts.length).toBe(4);
      expect(result.karmaScore).toBeLessThanOrEqual(KARMA_SCORE.MAX);
      expect(result.karmaScore).toBeGreaterThan(KARMA_SCORE.BASE);
    });
  });

  describe('Multi-Language Consistency', () => {
    it('should provide consistent analysis across languages', () => {
      const testData = [
        {
          saju: { advancedAnalysis: { geokguk: { name: '식신' } } },
          astro: { planets: [{ name: 'North Node', house: 5 }] },
        },
        {
          saju: { dayMaster: { name: '갑' } },
          astro: { planets: [{ name: 'Saturn', house: 9 }] },
        },
      ];

      testData.forEach(({ saju, astro }) => {
        const koResult = analyzePastLife(saju, astro, true);
        const enResult = analyzePastLife(saju, astro, false);

        expect(koResult.karmaScore).toBe(enResult.karmaScore);
        expect(koResult.karmicDebts.length).toBe(enResult.karmicDebts.length);
        expect(koResult.soulPattern.traits.length).toBe(enResult.soulPattern.traits.length);
        expect(koResult.talentsCarried.length).toBe(enResult.talentsCarried.length);
      });
    });

    it('should translate all text content appropriately', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: '정관' },
          sinsal: { unluckyList: [{ name: '원진' }] },
        },
        dayMaster: { name: '갑' },
      };
      const astro = {
        planets: [
          { name: 'North Node', house: 10 },
          { name: 'Saturn', house: 4 },
        ],
      };

      const koResult = analyzePastLife(saju, astro, true);
      const enResult = analyzePastLife(saju, astro, false);

      expect(koResult.soulPattern.type).toMatch(REGEX_PATTERNS.KOREAN);
      expect(enResult.soulPattern.type).toMatch(REGEX_PATTERNS.ENGLISH);

      expect(koResult.pastLife.likely).toMatch(REGEX_PATTERNS.KOREAN);
      expect(enResult.pastLife.likely).toMatch(REGEX_PATTERNS.ENGLISH);

      expect(koResult.soulJourney.pastPattern).toMatch(REGEX_PATTERNS.KOREAN);
      expect(enResult.soulJourney.pastPattern).toMatch(REGEX_PATTERNS.ENGLISH);
    });
  });

  describe('Data Combination Patterns', () => {
    it('should handle all geokguk with all day master combinations', () => {
      let testCount = 0;
      GEOKGUK_TYPES.forEach((geokguk) => {
        DAY_MASTER_STEMS.forEach((stem) => {
          const saju = {
            advancedAnalysis: { geokguk: { name: geokguk } },
            dayMaster: { name: stem },
          };

          const result = analyzeKorean(saju);

          expect(result.soulPattern.type).toBeTruthy();
          expect(result.dayMaster).toBe(stem);
          expect(result.geokguk).toBe(geokguk);
          testCount++;
        });
      });

      expect(testCount).toBe(80); // 8 geokguk × 10 stems
    });

    it('should handle all house combinations for North Node and Saturn', () => {
      let testCount = 0;
      for (let northHouse = 1; northHouse <= 12; northHouse++) {
        for (let saturnHouse = 1; saturnHouse <= 12; saturnHouse++) {
          const astro = {
            planets: [
              { name: 'North Node', house: northHouse },
              { name: 'Saturn', house: saturnHouse },
            ],
          };

          const result = analyzeKorean(null, astro);

          expect(result.northNodeHouse).toBe(northHouse);
          expect(result.saturnHouse).toBe(saturnHouse);
          expect(result.soulJourney.pastPattern).toBeTruthy();
          expect(result.saturnLesson.lesson).toBeTruthy();
          testCount++;
        }
      }

      expect(testCount).toBe(144); // 12 × 12
    });
  });

  describe('Edge Case Combinations', () => {
    it('should handle geokguk with 격 suffix and complex sinsal', () => {
      const suffixVariations = ['식신격', '상관격', '정관격', '편관격'];

      suffixVariations.forEach((geokguk) => {
        const saju = {
          advancedAnalysis: {
            geokguk: { name: geokguk },
            sinsal: {
              unluckyList: [
                { name: '원진살' },
                { name: '공망' },
                { name: '겁살' },
              ],
            },
          },
        };

        const result = analyzeKorean(saju);

        expect(result.geokguk).toBe(geokguk);
        expect(result.karmicDebts.length).toBe(3);
      });
    });

    it('should handle mixed planet name formats', () => {
      const planetVariations = [
        { name: 'North Node', house: 5 },
        { name: 'north node', house: 6 },
        { name: 'NorthNode', house: 7 },
        { name: 'NORTH NODE', house: 8 },
        { name: 'Saturn', house: 9 },
        { name: 'saturn', house: 10 },
        { name: 'SATURN', house: 11 },
      ];

      const astro = { planets: planetVariations };
      const result = analyzeKorean(null, astro);

      expect(result.northNodeHouse).toBeDefined();
      expect(result.saturnHouse).toBeDefined();
    });
  });

  describe('Regression Tests', () => {
    it('should maintain backward compatibility with old data format', () => {
      const oldFormatSaju = {
        advancedAnalysis: {
          geokguk: { name: '식신' },
        },
        dayMaster: { name: '갑' },
      };

      const result = analyzeKorean(oldFormatSaju);

      expect(result.soulPattern.type).toBe('창조자 영혼');
      expect(result.dayMaster).toBe('갑');
    });

    it('should handle legacy sinsal format with string items', () => {
      const saju = {
        advancedAnalysis: {
          sinsal: {
            unluckyList: ['원진', '공망', '겁살', '재살'],
          },
        },
      };

      const result = analyzeKorean(saju);

      expect(result.karmicDebts.length).toBeGreaterThan(0);
      expect(result.karmicDebts.length).toBeLessThanOrEqual(4);
    });

    it('should handle special geokguk name 칠살', () => {
      const saju = {
        advancedAnalysis: {
          geokguk: { name: '칠살' },
        },
      };

      const result = analyzeKorean(saju);

      expect(result.soulPattern.type).toBe('전사 영혼');
      expect(result.soulPattern.emoji).toBe('⚔️');
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain fast analysis for simple data', () => {
      const start = Date.now();
      const iterations = 50;

      for (let i = 0; i < iterations; i++) {
        analyzePastLife(null, null, true);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(250); // 50 simple analyses in under 250ms
    });

    it('should handle complex data efficiently', () => {
      const complexSaju = {
        advancedAnalysis: {
          geokguk: { name: '정관격', type: '정관' },
          sinsal: {
            unluckyList: Array(10)
              .fill(null)
              .map((_, i) => ({ name: ['원진', '공망', '겁살'][i % 3] })),
          },
        },
        dayMaster: { name: '갑', heavenlyStem: '갑목' },
        pillars: { day: { heavenlyStem: '갑목' } },
      };
      const complexAstro = {
        planets: Array(12)
          .fill(null)
          .map((_, i) => ({
            name: i % 2 === 0 ? 'North Node' : 'Saturn',
            house: (i % 12) + 1,
          })),
      };

      const start = Date.now();
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        analyzePastLife(complexSaju, complexAstro, true);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // 20 complex analyses in under 500ms
    });
  });

  describe('Data Integrity Tests', () => {
    it('should never return null or undefined for required fields', () => {
      const scenarios = [
        { saju: null, astro: null },
        { saju: {}, astro: {} },
        {
          saju: { advancedAnalysis: { geokguk: { name: '식신' } } },
          astro: null,
        },
        {
          saju: null,
          astro: { planets: [{ name: 'North Node', house: 5 }] },
        },
      ];

      scenarios.forEach((scenario) => {
        const result = analyzePastLife(scenario.saju, scenario.astro, true);

        expect(result.soulPattern).not.toBeNull();
        expect(result.soulPattern).not.toBeUndefined();
        expect(result.pastLife).not.toBeNull();
        expect(result.pastLife).not.toBeUndefined();
        expect(result.soulJourney).not.toBeNull();
        expect(result.soulJourney).not.toBeUndefined();
        expect(result.saturnLesson).not.toBeNull();
        expect(result.saturnLesson).not.toBeUndefined();
        expect(result.thisLifeMission).not.toBeNull();
        expect(result.thisLifeMission).not.toBeUndefined();
        expect(result.karmicDebts).not.toBeNull();
        expect(result.karmicDebts).not.toBeUndefined();
        expect(result.talentsCarried).not.toBeNull();
        expect(result.talentsCarried).not.toBeUndefined();
        expect(result.karmaScore).not.toBeNull();
        expect(result.karmaScore).not.toBeUndefined();
      });
    });

    it('should always return valid arrays', () => {
      const result = analyzeKorean();

      expect(Array.isArray(result.karmicDebts)).toBe(true);
      expect(Array.isArray(result.talentsCarried)).toBe(true);
      expect(Array.isArray(result.soulPattern.traits)).toBe(true);
    });

    it('should always return valid numbers for karma score', () => {
      const scenarios = [
        { saju: null, astro: null },
        {
          saju: { advancedAnalysis: { geokguk: { name: '식신' } } },
          astro: null,
        },
      ];

      scenarios.forEach((scenario) => {
        const result = analyzePastLife(scenario.saju, scenario.astro, true);

        expect(typeof result.karmaScore).toBe('number');
        expect(Number.isFinite(result.karmaScore)).toBe(true);
        expect(Number.isNaN(result.karmaScore)).toBe(false);
        expect(result.karmaScore).toBeGreaterThanOrEqual(KARMA_SCORE.MIN);
        expect(result.karmaScore).toBeLessThanOrEqual(KARMA_SCORE.MAX);
      });
    });
  });

  describe('Completeness Validation', () => {
    it('should provide complete soulPattern data', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const saju = { advancedAnalysis: { geokguk: { name: geokguk } } };
        const result = analyzeKorean(saju);

        expect(result.soulPattern.type).toBeTruthy();
        expect(result.soulPattern.emoji).toBeTruthy();
        expect(result.soulPattern.title).toBeTruthy();
        expect(result.soulPattern.description).toBeTruthy();
        expect(result.soulPattern.traits).toHaveLength(5);
        result.soulPattern.traits.forEach((trait) => {
          expect(trait).toBeTruthy();
        });
      });
    });

    it('should provide complete pastLife data', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        const saju = { advancedAnalysis: { geokguk: { name: geokguk } } };
        const result = analyzeKorean(saju);

        expect(result.pastLife.likely).toBeTruthy();
        expect(result.pastLife.talents).toBeTruthy();
        expect(result.pastLife.lessons).toBeTruthy();
        expect(result.pastLife.era).toBeTruthy();
      });
    });

    it('should provide complete thisLifeMission data', () => {
      DAY_MASTER_STEMS.forEach((stem) => {
        const saju = { dayMaster: { name: stem } };
        const result = analyzeKorean(saju);

        expect(result.thisLifeMission.core).toBeTruthy();
        expect(result.thisLifeMission.expression).toBeTruthy();
        expect(result.thisLifeMission.fulfillment).toBeTruthy();
      });
    });
  });

  describe('Karma Score Calculation Integration', () => {
    it('should accumulate all bonuses correctly', () => {
      const testCases = [
        {
          description: 'only geokguk',
          saju: { advancedAnalysis: { geokguk: { name: '식신' } } },
          astro: null,
          expected: KARMA_SCORE.BASE + KARMA_SCORE.GEOKGUK_BONUS,
        },
        {
          description: 'geokguk + day master',
          saju: {
            advancedAnalysis: { geokguk: { name: '식신' } },
            dayMaster: { name: '갑' },
          },
          astro: null,
          expected:
            KARMA_SCORE.BASE + KARMA_SCORE.GEOKGUK_BONUS + KARMA_SCORE.DAY_MASTER_BONUS,
        },
        {
          description: 'geokguk + day master + North Node',
          saju: {
            advancedAnalysis: { geokguk: { name: '식신' } },
            dayMaster: { name: '갑' },
          },
          astro: { planets: [{ name: 'North Node', house: 5 }] },
          expected:
            KARMA_SCORE.BASE +
            KARMA_SCORE.GEOKGUK_BONUS +
            KARMA_SCORE.DAY_MASTER_BONUS +
            KARMA_SCORE.NORTH_NODE_BONUS,
        },
      ];

      testCases.forEach(({ description, saju, astro, expected }) => {
        const result = analyzePastLife(saju, astro, true);
        expect(result.karmaScore).toBe(expected);
      });
    });

    it('should never exceed maximum score', () => {
      const testCases = [
        {
          saju: {
            advancedAnalysis: {
              geokguk: { name: '식신' },
              sinsal: {
                unluckyList: Array(20).fill({ name: '원진' }),
              },
            },
            dayMaster: { name: '갑' },
          },
          astro: {
            planets: [
              { name: 'North Node', house: 1 },
              { name: 'Saturn', house: 7 },
            ],
          },
        },
      ];

      testCases.forEach(({ saju, astro }) => {
        const result = analyzePastLife(saju, astro, true);
        expect(result.karmaScore).toBeLessThanOrEqual(KARMA_SCORE.MAX);
      });
    });
  });

  describe('Text Quality Validation', () => {
    it('should provide meaningful Korean text', () => {
      const saju = {
        advancedAnalysis: { geokguk: { name: '정관' } },
        dayMaster: { name: '갑' },
      };
      const astro = {
        planets: [
          { name: 'North Node', house: 10 },
          { name: 'Saturn', house: 4 },
        ],
      };

      const result = analyzeKorean(saju, astro);

      expect(result.soulPattern.description.length).toBeGreaterThan(10);
      expect(result.pastLife.likely.length).toBeGreaterThan(5);
      expect(result.soulJourney.pastPattern.length).toBeGreaterThan(5);
      expect(result.saturnLesson.lesson.length).toBeGreaterThan(5);
      expect(result.thisLifeMission.core.length).toBeGreaterThan(5);
    });

    it('should provide meaningful English text', () => {
      const saju = {
        advancedAnalysis: { geokguk: { name: '정관' } },
        dayMaster: { name: '갑' },
      };
      const astro = {
        planets: [
          { name: 'North Node', house: 10 },
          { name: 'Saturn', house: 4 },
        ],
      };

      const result = analyzeEnglish(saju, astro);

      expect(result.soulPattern.description.length).toBeGreaterThan(10);
      expect(result.pastLife.likely.length).toBeGreaterThan(5);
      expect(result.soulJourney.pastPattern.length).toBeGreaterThan(5);
      expect(result.saturnLesson.lesson.length).toBeGreaterThan(5);
      expect(result.thisLifeMission.core.length).toBeGreaterThan(5);
    });
  });
});
