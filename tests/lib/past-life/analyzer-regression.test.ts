// tests/lib/past-life/analyzer-regression.test.ts
// Regression Tests and Scenario-Based Testing for Past Life Analyzer

import { describe, it, expect } from 'vitest';
import { analyzePastLife } from '@/lib/past-life/analyzer';

// ============================================================
// Constants
// ============================================================

const GEOKGUK_TYPES = ['식신', '상관', '정관', '편관', '정재', '편재', '정인', '편인'] as const;
const DAY_MASTER_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const HOUSE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// User persona test data
const USER_PERSONAS = [
  {
    name: 'Artist',
    saju: { advancedAnalysis: { geokguk: { name: '식신' } }, dayMaster: { name: '갑' } },
    astro: { planets: [{ name: 'North Node', house: 5 }, { name: 'Saturn', house: 9 }] },
    expectedSoul: '창조자 영혼',
    expectedEmoji: '🎨',
  },
  {
    name: 'Leader',
    saju: { advancedAnalysis: { geokguk: { name: '정관' } }, dayMaster: { name: '병' } },
    astro: { planets: [{ name: 'North Node', house: 10 }, { name: 'Saturn', house: 1 }] },
    expectedSoul: '지도자 영혼',
    expectedEmoji: '👑',
  },
  {
    name: 'Scholar',
    saju: { advancedAnalysis: { geokguk: { name: '정인' } }, dayMaster: { name: '임' } },
    astro: { planets: [{ name: 'North Node', house: 9 }, { name: 'Saturn', house: 3 }] },
    expectedSoul: '현자 영혼',
    expectedEmoji: '📚',
  },
  {
    name: 'Warrior',
    saju: { advancedAnalysis: { geokguk: { name: '편관' } }, dayMaster: { name: '경' } },
    astro: { planets: [{ name: 'North Node', house: 1 }, { name: 'Saturn', house: 8 }] },
    expectedSoul: '전사 영혼',
    expectedEmoji: '⚔️',
  },
  {
    name: 'Merchant',
    saju: { advancedAnalysis: { geokguk: { name: '정재' } }, dayMaster: { name: '무' } },
    astro: { planets: [{ name: 'North Node', house: 2 }, { name: 'Saturn', house: 6 }] },
    expectedSoul: '보존자 영혼',
    expectedEmoji: '🏛️',
  },
] as const;

// Known edge cases from production
const REGRESSION_CASES = [
  {
    id: 'EMPTY_DATA',
    description: 'User with no birth data',
    input: { saju: null, astro: null },
    expectedMinScore: 50,
    expectedSoul: '탐험가 영혼',
  },
  {
    id: 'PARTIAL_SAJU',
    description: 'User with only geokguk',
    input: { saju: { advancedAnalysis: { geokguk: { name: '식신' } } }, astro: null },
    expectedMinScore: 55,
    expectedSoul: '창조자 영혼',
  },
  {
    id: 'PARTIAL_ASTRO',
    description: 'User with only astrology data',
    input: { saju: null, astro: { planets: [{ name: 'Saturn', house: 7 }] } },
    expectedMinScore: 55,
    expectedSoul: '탐험가 영혼',
  },
  {
    id: 'COMPLETE_DATA',
    description: 'User with complete birth chart',
    input: {
      saju: {
        advancedAnalysis: {
          geokguk: { name: '정관' },
          sinsal: { unluckyList: [{ name: '원진' }] },
        },
        dayMaster: { name: '갑' },
      },
      astro: {
        planets: [
          { name: 'North Node', house: 10 },
          { name: 'Saturn', house: 4 },
        ],
      },
    },
    expectedMinScore: 70,
    expectedSoul: '지도자 영혼',
  },
] as const;

// ============================================================
// Helper Functions
// ============================================================

const analyzeKorean = (saju?: any, astro?: any) => analyzePastLife(saju || null, astro || null, true);
const analyzeEnglish = (saju?: any, astro?: any) => analyzePastLife(saju || null, astro || null, false);

// ============================================================
// Tests
// ============================================================

describe('Past Life Analyzer - Regression Tests', () => {

  describe('User Persona Scenarios', () => {
    USER_PERSONAS.forEach((persona) => {
      it(`should correctly analyze ${persona.name} persona`, () => {
        const result = analyzeKorean(persona.saju, persona.astro);

        expect(result.soulPattern.type).toBe(persona.expectedSoul);
        expect(result.soulPattern.emoji).toBe(persona.expectedEmoji);
        expect(result.soulPattern.traits).toHaveLength(5);
        expect(result.karmaScore).toBeGreaterThanOrEqual(50);
        expect(result.karmaScore).toBeLessThanOrEqual(100);
      });

      it(`should provide complete analysis for ${persona.name}`, () => {
        const result = analyzeKorean(persona.saju, persona.astro);

        expect(result.pastLife.likely).toBeTruthy();
        expect(result.soulJourney.pastPattern).toBeTruthy();
        expect(result.saturnLesson.lesson).toBeTruthy();
        expect(result.thisLifeMission.core).toBeTruthy();
      });

      it(`should work in English for ${persona.name}`, () => {
        const result = analyzeEnglish(persona.saju, persona.astro);

        expect(result.soulPattern.type).toMatch(/[A-Za-z]/);
        expect(result.soulPattern.emoji).toBe(persona.expectedEmoji);
      });
    });
  });

  describe('Known Regression Cases', () => {
    REGRESSION_CASES.forEach((testCase) => {
      it(`should handle ${testCase.id}: ${testCase.description}`, () => {
        const result = analyzeKorean(testCase.input.saju, testCase.input.astro);

        expect(result).toBeDefined();
        expect(result.soulPattern.type).toBe(testCase.expectedSoul);

        if ('expectedScore' in testCase) {
          expect(result.karmaScore).toBe(testCase.expectedScore);
        }
        if ('expectedMinScore' in testCase) {
          expect(result.karmaScore).toBeGreaterThanOrEqual(testCase.expectedMinScore);
        }
      });
    });
  });

  describe('Real-World Data Patterns', () => {
    it('should handle typical Korean user with Saju + Western astrology', () => {
      const result = analyzeKorean(
        {
          advancedAnalysis: {
            geokguk: { name: '식신격' },
            sinsal: { unluckyList: [{ name: '원진살' }] },
          },
          dayMaster: { name: '갑목' },
          pillars: { day: { heavenlyStem: '갑목' } },
        },
        {
          planets: [
            { name: 'Sun', house: 1 },
            { name: 'Moon', house: 7 },
            { name: 'Mercury', house: 2 },
            { name: 'Venus', house: 3 },
            { name: 'Mars', house: 4 },
            { name: 'Jupiter', house: 5 },
            { name: 'Saturn', house: 6 },
            { name: 'Uranus', house: 8 },
            { name: 'Neptune', house: 9 },
            { name: 'Pluto', house: 10 },
            { name: 'North Node', house: 11 },
            { name: 'South Node', house: 5 },
          ],
        }
      );

      expect(result.soulPattern.type).toBe('창조자 영혼');
      expect(result.northNodeHouse).toBe(11);
      expect(result.saturnHouse).toBe(6);
      expect(result.dayMaster).toBe('갑');
      expect(result.karmicDebts.length).toBe(1);
      expect(result.karmaScore).toBeGreaterThan(70);
    });

    it('should handle Western user with only astrology data', () => {
      const result = analyzeEnglish(null, {
        planets: [
          { name: 'North Node', house: 7 },
          { name: 'Saturn', house: 10 },
        ],
      });

      expect(result.soulPattern.type).toBe('Explorer Soul');
      expect(result.northNodeHouse).toBe(7);
      expect(result.saturnHouse).toBe(10);
      expect(result.karmaScore).toBeGreaterThanOrEqual(55);
    });

    it('should handle user with only Saju data (no astrology)', () => {
      const result = analyzeKorean(
        {
          advancedAnalysis: {
            geokguk: { name: '정관' },
            sinsal: { unluckyList: [{ name: '공망' }, { name: '겁살' }] },
          },
          dayMaster: { name: '을' },
        },
        null
      );

      expect(result.soulPattern.type).toBe('지도자 영혼');
      expect(result.dayMaster).toBe('을');
      expect(result.karmicDebts.length).toBe(2);
      expect(result.northNodeHouse).toBeUndefined();
      expect(result.saturnHouse).toBeUndefined();
    });

    it('should handle minimal valid input', () => {
      const result = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '식신' } } },
        null
      );

      expect(result.soulPattern.type).toBe('창조자 영혼');
      expect(result.karmaScore).toBeGreaterThanOrEqual(55);
    });
  });

  describe('Cross-Feature Integration', () => {
    it('should combine all features correctly for maximum karma score', () => {
      const result = analyzeKorean(
        {
          advancedAnalysis: {
            geokguk: { name: '식신' },
            sinsal: {
              unluckyList: [{ name: '원진' }, { name: '공망' }, { name: '겁살' }],
            },
          },
          dayMaster: { name: '갑' },
        },
        {
          planets: [
            { name: 'North Node', house: 1 },
            { name: 'Saturn', house: 12 },
          ],
        }
      );

      // Should have all bonuses: geokguk + dayMaster + northNode + saturn + 3 karmic debts
      expect(result.karmaScore).toBeGreaterThanOrEqual(85);
      expect(result.karmaScore).toBeLessThanOrEqual(100);
    });

    it('should maintain consistency across multiple analyses', () => {
      const input = {
        saju: {
          advancedAnalysis: { geokguk: { name: '정관' } },
          dayMaster: { name: '병' },
        },
        astro: { planets: [{ name: 'Saturn', house: 7 }] },
      };

      const results = Array(10).fill(null).map(() =>
        analyzeKorean(input.saju, input.astro)
      );

      // All results should be identical
      results.forEach((result) => {
        expect(result.soulPattern.type).toBe(results[0].soulPattern.type);
        expect(result.karmaScore).toBe(results[0].karmaScore);
        expect(result.dayMaster).toBe(results[0].dayMaster);
      });
    });

    it('should not affect input data', () => {
      const originalSaju = {
        advancedAnalysis: { geokguk: { name: '식신' } },
        dayMaster: { name: '갑' },
      };
      const originalAstro = {
        planets: [{ name: 'Saturn', house: 5 }],
      };

      const sajuCopy = JSON.parse(JSON.stringify(originalSaju));
      const astroCopy = JSON.parse(JSON.stringify(originalAstro));

      analyzePastLife(originalSaju, originalAstro, true);

      expect(originalSaju).toEqual(sajuCopy);
      expect(originalAstro).toEqual(astroCopy);
    });
  });

  describe('Language Consistency Regression', () => {
    it('should return same structure for Korean and English', () => {
      const saju = { advancedAnalysis: { geokguk: { name: '식신' } } };
      const astro = { planets: [{ name: 'North Node', house: 5 }] };

      const koResult = analyzeKorean(saju, astro);
      const enResult = analyzeEnglish(saju, astro);

      expect(Object.keys(koResult)).toEqual(Object.keys(enResult));
      expect(Object.keys(koResult.soulPattern)).toEqual(Object.keys(enResult.soulPattern));
      expect(Object.keys(koResult.pastLife)).toEqual(Object.keys(enResult.pastLife));
      expect(koResult.karmaScore).toBe(enResult.karmaScore);
      expect(koResult.soulPattern.emoji).toBe(enResult.soulPattern.emoji);
    });

    it('should have matching metadata across languages', () => {
      const saju = {
        advancedAnalysis: { geokguk: { name: '정관격' } },
        dayMaster: { name: '을' },
      };
      const astro = {
        planets: [
          { name: 'North Node', house: 7 },
          { name: 'Saturn', house: 3 },
        ],
      };

      const koResult = analyzeKorean(saju, astro);
      const enResult = analyzeEnglish(saju, astro);

      expect(koResult.geokguk).toBe(enResult.geokguk);
      expect(koResult.dayMaster).toBe(enResult.dayMaster);
      expect(koResult.northNodeHouse).toBe(enResult.northNodeHouse);
      expect(koResult.saturnHouse).toBe(enResult.saturnHouse);
    });
  });

  describe('Data Integrity Regression', () => {
    it('should never return undefined for required fields', () => {
      const testCases = [
        { saju: null, astro: null },
        { saju: { advancedAnalysis: {} }, astro: { planets: [] } },
        { saju: { advancedAnalysis: { geokguk: { name: '식신' } } }, astro: null },
      ];

      testCases.forEach((testCase) => {
        const result = analyzeKorean(testCase.saju, testCase.astro);

        expect(result.soulPattern.type).toBeDefined();
        expect(result.soulPattern.emoji).toBeDefined();
        expect(result.soulPattern.title).toBeDefined();
        expect(result.soulPattern.description).toBeDefined();
        expect(result.soulPattern.traits).toBeDefined();
        expect(result.pastLife.likely).toBeDefined();
        expect(result.soulJourney.pastPattern).toBeDefined();
        expect(result.saturnLesson.lesson).toBeDefined();
        expect(result.thisLifeMission.core).toBeDefined();
        expect(result.karmicDebts).toBeDefined();
        expect(result.talentsCarried).toBeDefined();
        expect(result.karmaScore).toBeDefined();
      });
    });

    it('should always return arrays for array fields', () => {
      const result = analyzeKorean(null, null);

      expect(Array.isArray(result.soulPattern.traits)).toBe(true);
      expect(Array.isArray(result.karmicDebts)).toBe(true);
      expect(Array.isArray(result.talentsCarried)).toBe(true);
    });

    it('should always return numbers in valid range for karma score', () => {
      const testInputs = [
        { saju: null, astro: null },
        { saju: { advancedAnalysis: { geokguk: { name: '식신' } } }, astro: null },
        {
          saju: {
            advancedAnalysis: {
              geokguk: { name: '정관' },
              sinsal: { unluckyList: [{ name: '원진' }] },
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

      testInputs.forEach((input) => {
        const result = analyzeKorean(input.saju, input.astro);

        expect(typeof result.karmaScore).toBe('number');
        expect(result.karmaScore).toBeGreaterThanOrEqual(50);
        expect(result.karmaScore).toBeLessThanOrEqual(100);
        expect(Number.isInteger(result.karmaScore)).toBe(true);
      });
    });
  });

  describe('Scenario: Career Change Analysis', () => {
    it('should analyze person considering career change (Artist to Leader)', () => {
      const currentLife = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '식신' } }, dayMaster: { name: '갑' } },
        { planets: [{ name: 'Saturn', house: 10 }] } // Saturn in 10th (career house)
      );

      expect(currentLife.soulPattern.type).toBe('창조자 영혼');
      expect(currentLife.saturnLesson.lesson).toBe('세상에서 자신의 역할을 찾는 것');
      expect(currentLife.talentsCarried.length).toBeGreaterThan(0);
      expect(currentLife.talentsCarried.some((t: string) => t.includes('창작') || t.includes('감각'))).toBe(true);
    });

    it('should analyze natural leader seeking purpose', () => {
      const result = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '정관' } }, dayMaster: { name: '병' } },
        { planets: [{ name: 'North Node', house: 10 }, { name: 'Saturn', house: 4 }] }
      );

      expect(result.soulPattern.type).toBe('지도자 영혼');
      expect(result.soulJourney.pastPattern).toBe('가정에만 갇혀 살았던 전생');
      expect(result.thisLifeMission.core).toBe('빛과 열정으로 세상을 밝히세요');
    });
  });

  describe('Scenario: Relationship Compatibility Preparation', () => {
    it('should analyze person with relationship karma', () => {
      const result = analyzeKorean(
        {
          advancedAnalysis: {
            geokguk: { name: '정재' },
            sinsal: { unluckyList: [{ name: '원진살' }] },
          },
          dayMaster: { name: '무' },
        },
        { planets: [{ name: 'North Node', house: 7 }] } // 7th house = partnerships
      );

      expect(result.karmicDebts.some((d) => d.area === '관계 카르마')).toBe(true);
      expect(result.soulJourney.pastPattern).toBe('혼자서 모든 것을 해결한 전생');
    });

    it('should analyze person seeking true partnership', () => {
      const result = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '편재' } }, dayMaster: { name: '기' } },
        { planets: [{ name: 'Saturn', house: 7 }] }
      );

      expect(result.soulPattern.type).toBe('모험가 영혼');
      expect(result.saturnLesson.lesson).toBe('진정한 파트너십을 만드는 것');
    });
  });

  describe('Scenario: Spiritual Growth Journey', () => {
    it('should analyze person on spiritual path', () => {
      const result = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '편인' } }, dayMaster: { name: '계' } },
        { planets: [{ name: 'North Node', house: 12 }, { name: 'Saturn', house: 12 }] }
      );

      expect(result.soulPattern.type).toBe('신비가 영혼');
      expect(result.soulJourney.pastPattern).toBe('물질과 일에만 집중한 전생');
      expect(result.saturnLesson.lesson).toBe('영적 성장과 내면 평화 찾기');
    });

    it('should analyze scholar seeking wisdom', () => {
      const result = analyzeKorean(
        { advancedAnalysis: { geokguk: { name: '정인' } }, dayMaster: { name: '임' } },
        { planets: [{ name: 'North Node', house: 9 }] }
      );

      expect(result.soulPattern.type).toBe('현자 영혼');
      expect(result.soulJourney.pastPattern).toBe('사소한 것에 매몰된 전생');
    });
  });

  describe('Performance Regression', () => {
    it('should maintain fast performance with complex data', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        analyzePastLife(
          {
            advancedAnalysis: {
              geokguk: { name: GEOKGUK_TYPES[i % 8] },
              sinsal: { unluckyList: [{ name: '원진' }, { name: '공망' }] },
            },
            dayMaster: { name: DAY_MASTER_STEMS[i % 10] },
          },
          {
            planets: [
              { name: 'North Node', house: HOUSE_NUMBERS[i % 12] },
              { name: 'Saturn', house: HOUSE_NUMBERS[(i + 6) % 12] },
            ],
          },
          i % 2 === 0
        );
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle concurrent analyses efficiently', () => {
      const start = Date.now();

      const promises = Array(50).fill(null).map((_, i) =>
        Promise.resolve(analyzePastLife(
          { advancedAnalysis: { geokguk: { name: '식신' } } },
          { planets: [{ name: 'Saturn', house: (i % 12) + 1 }] },
          true
        ))
      );

      return Promise.all(promises).then((results) => {
        const duration = Date.now() - start;
        expect(duration).toBeLessThan(500);
        expect(results.length).toBe(50);
        results.forEach((result) => expect(result).toBeDefined());
      });
    });
  });

  describe('Edge Case Combinations', () => {
    it('should handle all geokguk × all day masters', () => {
      let count = 0;
      GEOKGUK_TYPES.forEach((geokguk) => {
        DAY_MASTER_STEMS.forEach((stem) => {
          const result = analyzeKorean(
            {
              advancedAnalysis: { geokguk: { name: geokguk } },
              dayMaster: { name: stem },
            },
            null
          );
          expect(result).toBeDefined();
          expect(result.soulPattern.type).toBeTruthy();
          expect(result.dayMaster).toBe(stem);
          count++;
        });
      });
      expect(count).toBe(80); // 8 × 10
    });

    it('should handle all houses × both planets', () => {
      let count = 0;
      HOUSE_NUMBERS.forEach((house) => {
        const result = analyzeKorean(null, {
          planets: [
            { name: 'North Node', house },
            { name: 'Saturn', house: ((house + 5) % 12) + 1 },
          ],
        });
        expect(result.northNodeHouse).toBe(house);
        count++;
      });
      expect(count).toBe(12);
    });
  });

  describe('Regression: Previous Bug Fixes', () => {
    it('should not crash with null planet name', () => {
      expect(() => {
        analyzeKorean(null, { planets: [{ name: null, house: 5 }] });
      }).not.toThrow();
    });

    it('should handle geokguk with 격 suffix correctly', () => {
      const withSuffix = analyzeKorean({ advancedAnalysis: { geokguk: { name: '식신격' } } });
      const withoutSuffix = analyzeKorean({ advancedAnalysis: { geokguk: { name: '식신' } } });

      expect(withSuffix.soulPattern.type).toBe(withoutSuffix.soulPattern.type);
    });

    it('should correctly identify 칠살 as 편관', () => {
      const result = analyzeKorean({ advancedAnalysis: { geokguk: { name: '칠살' } } });
      expect(result.soulPattern.type).toBe('전사 영혼');
    });

    it('should handle case-insensitive planet names', () => {
      const lower = analyzeKorean(null, { planets: [{ name: 'saturn', house: 5 }] });
      const upper = analyzeKorean(null, { planets: [{ name: 'SATURN', house: 5 }] });
      const mixed = analyzeKorean(null, { planets: [{ name: 'Saturn', house: 5 }] });

      expect(lower.saturnHouse).toBe(5);
      expect(upper.saturnHouse).toBe(5);
      expect(mixed.saturnHouse).toBe(5);
    });

    it('should extract first character from compound day master', () => {
      const result = analyzeKorean({ dayMaster: { name: '갑목' } });
      expect(result.dayMaster).toBe('갑');
    });
  });
});
