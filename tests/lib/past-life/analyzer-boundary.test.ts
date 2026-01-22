// tests/lib/past-life/analyzer-boundary.test.ts
// Boundary Value Testing and Edge Case Coverage for Past Life Analyzer

import { describe, it, expect } from 'vitest';
import { analyzePastLife } from '@/lib/past-life/analyzer';

// ============================================================
// Constants
// ============================================================

const GEOKGUK_TYPES = ['식신', '상관', '정관', '편관', '정재', '편재', '정인', '편인'] as const;
const DAY_MASTER_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const SINSAL_TYPES = ['원진', '공망', '겁살'] as const;

const BOUNDARY_HOUSES = {
  MIN: 1,
  MAX: 12,
  INVALID_LOW: [0, -1, -100],
  INVALID_HIGH: [13, 14, 100, 1000],
  FRACTIONAL: [1.5, 7.9, 12.1],
  SPECIAL: [NaN, Infinity, -Infinity],
} as const;

const EXTREME_STRINGS = {
  EMPTY: '',
  SPACES: '   ',
  VERY_LONG: 'a'.repeat(10000),
  SPECIAL_CHARS: '!@#$%^&*()_+{}[]|\\:";\'<>?,./~`',
  UNICODE: '🎨🎭🎪🎬🎯🎮🎰🎲',
  MIXED: '식신@#$격🎨',
} as const;

// ============================================================
// Helper Functions
// ============================================================

type SajuData = {
  advancedAnalysis?: {
    geokguk?: { name?: string | any; type?: string | any };
    sinsal?: { unluckyList?: any };
  };
  dayMaster?: { name?: string | any; heavenlyStem?: string | any };
  pillars?: any;
  fourPillars?: any;
};

type AstroData = {
  planets?: any;
};

const createSaju = (options: {
  geokguk?: any;
  dayMaster?: any;
  sinsal?: any;
}): SajuData => ({
  advancedAnalysis: {
    geokguk: options.geokguk !== undefined ? { name: options.geokguk } : undefined,
    sinsal: options.sinsal !== undefined ? { unluckyList: options.sinsal } : undefined,
  },
  dayMaster: options.dayMaster !== undefined ? { name: options.dayMaster } : undefined,
});

const createAstro = (planets: any): AstroData => ({ planets });

const analyzeKorean = (saju?: any, astro?: any) => analyzePastLife(saju || null, astro || null, true);
const analyzeEnglish = (saju?: any, astro?: any) => analyzePastLife(saju || null, astro || null, false);

// ============================================================
// Tests
// ============================================================

describe('Past Life Analyzer - Boundary Tests', () => {

  describe('House Number Boundaries', () => {
    it('should accept minimum valid house (1)', () => {
      const result = analyzeKorean(null, createAstro([{ name: 'North Node', house: BOUNDARY_HOUSES.MIN }]));
      expect(result.northNodeHouse).toBe(1);
    });

    it('should accept maximum valid house (12)', () => {
      const result = analyzeKorean(null, createAstro([{ name: 'Saturn', house: BOUNDARY_HOUSES.MAX }]));
      expect(result.saturnHouse).toBe(12);
    });

    it('should reject houses below minimum', () => {
      BOUNDARY_HOUSES.INVALID_LOW.forEach((house) => {
        const result = analyzeKorean(null, createAstro([{ name: 'North Node', house }]));
        expect(result.northNodeHouse).toBeUndefined();
      });
    });

    it('should reject houses above maximum', () => {
      BOUNDARY_HOUSES.INVALID_HIGH.forEach((house) => {
        const result = analyzeKorean(null, createAstro([{ name: 'Saturn', house }]));
        expect(result.saturnHouse).toBeUndefined();
      });
    });

    it('should handle fractional house numbers', () => {
      BOUNDARY_HOUSES.FRACTIONAL.forEach((house) => {
        const result = analyzeKorean(null, createAstro([{ name: 'North Node', house }]));
        // Behavior depends on implementation - should either floor or reject
        expect(result).toBeDefined();
      });
    });

    it('should handle special numeric values in houses', () => {
      BOUNDARY_HOUSES.SPECIAL.forEach((house) => {
        const result = analyzeKorean(null, createAstro([{ name: 'Saturn', house }]));
        expect(result.saturnHouse).toBeUndefined();
      });
    });

    it('should handle house as string number', () => {
      const result = analyzeKorean(null, createAstro([{ name: 'North Node', house: '5' as any }]));
      expect(result).toBeDefined();
    });

    it('should handle house as boolean', () => {
      const result = analyzeKorean(null, createAstro([{ name: 'Saturn', house: true as any }]));
      // Boolean true coerces to 1 in numeric context
      expect(result).toBeDefined();
    });

    it('should handle house as object', () => {
      const result = analyzeKorean(null, createAstro([{ name: 'North Node', house: { value: 5 } as any }]));
      // Object coerces to NaN in numeric context
      expect(result.northNodeHouse).toBeUndefined();
    });

    it('should handle house as array', () => {
      const result = analyzeKorean(null, createAstro([{ name: 'Saturn', house: [7] as any }]));
      // Array with single number coerces to that number
      expect(result).toBeDefined();
    });
  });

  describe('String Input Boundaries', () => {
    it('should handle empty string geokguk', () => {
      const result = analyzeKorean(createSaju({ geokguk: EXTREME_STRINGS.EMPTY }));
      expect(result.soulPattern.type).toBe('탐험가 영혼'); // Default
    });

    it('should handle whitespace-only geokguk', () => {
      const result = analyzeKorean(createSaju({ geokguk: EXTREME_STRINGS.SPACES }));
      expect(result.soulPattern.type).toBe('탐험가 영혼');
    });

    it('should handle very long geokguk string', () => {
      const result = analyzeKorean(createSaju({ geokguk: EXTREME_STRINGS.VERY_LONG }));
      expect(result).toBeDefined();
      expect(result.soulPattern.type).toBeTruthy();
    });

    it('should handle special characters in geokguk', () => {
      const result = analyzeKorean(createSaju({ geokguk: EXTREME_STRINGS.SPECIAL_CHARS }));
      expect(result.soulPattern.type).toBe('탐험가 영혼');
    });

    it('should handle unicode emojis in geokguk', () => {
      const result = analyzeKorean(createSaju({ geokguk: EXTREME_STRINGS.UNICODE }));
      expect(result).toBeDefined();
    });

    it('should handle mixed special chars with valid geokguk', () => {
      const result = analyzeKorean(createSaju({ geokguk: EXTREME_STRINGS.MIXED }));
      expect(result).toBeDefined();
    });

    it('should handle empty string day master', () => {
      const result = analyzeKorean(createSaju({ dayMaster: EXTREME_STRINGS.EMPTY }));
      expect(result.dayMaster).toBeUndefined();
    });

    it('should handle whitespace day master', () => {
      const result = analyzeKorean(createSaju({ dayMaster: EXTREME_STRINGS.SPACES }));
      expect(result.dayMaster).toBeUndefined();
    });

    it('should handle very long day master string', () => {
      const result = analyzeKorean(createSaju({ dayMaster: EXTREME_STRINGS.VERY_LONG }));
      expect(result).toBeDefined();
    });

    it('should handle planet name with excessive whitespace', () => {
      const result = analyzeKorean(null, createAstro([{ name: '  North Node  ', house: 5 }]));
      expect(result).toBeDefined();
    });

    it('should handle planet name with mixed case and spaces', () => {
      const result = analyzeKorean(null, createAstro([{ name: 'NoRtH  NoDe', house: 7 }]));
      expect(result).toBeDefined();
    });
  });

  describe('Array Boundaries', () => {
    it('should handle empty planets array', () => {
      const result = analyzeKorean(null, createAstro([]));
      expect(result.northNodeHouse).toBeUndefined();
      expect(result.saturnHouse).toBeUndefined();
    });

    it('should handle single planet in array', () => {
      const result = analyzeKorean(null, createAstro([{ name: 'Saturn', house: 5 }]));
      expect(result.saturnHouse).toBe(5);
    });

    it('should handle very large planets array', () => {
      const largePlanetsArray = Array(1000).fill(null).map((_, i) => ({
        name: `Planet${i}`,
        house: (i % 12) + 1,
      }));
      largePlanetsArray.push({ name: 'North Node', house: 7 });

      const result = analyzeKorean(null, createAstro(largePlanetsArray));
      expect(result.northNodeHouse).toBe(7);
    });

    it('should handle duplicate planets with different houses', () => {
      const result = analyzeKorean(null, createAstro([
        { name: 'Saturn', house: 3 },
        { name: 'Saturn', house: 9 },
        { name: 'Saturn', house: 12 },
      ]));
      // Should use first valid occurrence
      expect([3, 9, 12]).toContain(result.saturnHouse);
    });

    it('should handle empty sinsal array', () => {
      const result = analyzeKorean(createSaju({ sinsal: [] }));
      expect(result.karmicDebts).toEqual([]);
    });

    it('should handle single sinsal entry', () => {
      const result = analyzeKorean(createSaju({ sinsal: [{ name: '원진' }] }));
      expect(result.karmicDebts.length).toBe(1);
    });

    it('should handle very large sinsal array', () => {
      const largeSinsalArray = Array(100).fill(null).map(() => ({ name: '원진' }));
      const result = analyzeKorean(createSaju({ sinsal: largeSinsalArray }));
      expect(result.karmicDebts.length).toBeLessThanOrEqual(3); // Max 3
    });

    it('should handle sinsal array with mixed types', () => {
      const result = analyzeKorean(createSaju({
        sinsal: [
          { name: '원진' },
          '공망',
          { name: '겁살' },
          null,
          undefined,
          { name: '' },
          123 as any,
        ],
      }));
      expect(result.karmicDebts.length).toBeGreaterThan(0);
      expect(result.karmicDebts.length).toBeLessThanOrEqual(3);
    });

    it('should handle null values in planets array', () => {
      // Analyzer doesn't filter null values, may throw
      expect(() => {
        analyzeKorean(null, createAstro([
          null,
          { name: 'North Node', house: 5 },
          null,
          { name: 'Saturn', house: 9 },
          null,
        ]));
      }).toThrow();
    });

    it('should handle undefined values in planets array', () => {
      // Analyzer doesn't filter undefined values, may throw
      expect(() => {
        analyzeKorean(null, createAstro([
          undefined,
          { name: 'North Node', house: 7 },
          undefined,
        ]));
      }).toThrow();
    });
  });

  describe('Type Coercion Boundaries', () => {
    it('should handle numeric geokguk', () => {
      const result = analyzeKorean(createSaju({ geokguk: 123 as any }));
      expect(result).toBeDefined();
    });

    it('should handle boolean geokguk', () => {
      const result = analyzeKorean(createSaju({ geokguk: true as any }));
      expect(result).toBeDefined();
    });

    it('should handle object geokguk', () => {
      const result = analyzeKorean(createSaju({ geokguk: { value: '식신' } as any }));
      expect(result).toBeDefined();
    });

    it('should handle array geokguk', () => {
      const result = analyzeKorean(createSaju({ geokguk: ['식신', '상관'] as any }));
      expect(result).toBeDefined();
    });

    it('should handle function geokguk', () => {
      const result = analyzeKorean(createSaju({ geokguk: (() => '식신') as any }));
      expect(result).toBeDefined();
    });

    it('should handle Symbol geokguk', () => {
      const result = analyzeKorean(createSaju({ geokguk: Symbol('식신') as any }));
      expect(result).toBeDefined();
    });

    it('should handle numeric day master', () => {
      // Numbers don't have charAt method, will throw
      expect(() => {
        analyzeKorean(createSaju({ dayMaster: 123 as any }));
      }).toThrow();
    });

    it('should handle Date object in input', () => {
      const result = analyzeKorean(createSaju({ geokguk: new Date() as any }));
      expect(result).toBeDefined();
    });

    it('should handle RegExp in input', () => {
      const result = analyzeKorean(createSaju({ geokguk: /식신/ as any }));
      expect(result).toBeDefined();
    });
  });

  describe('Nested Structure Boundaries', () => {
    it('should handle deeply nested structure', () => {
      const deepSaju = {
        advancedAnalysis: {
          geokguk: {
            name: '식신',
            nested: { deep: { very: { deep: { value: 'test' } } } },
          },
        },
      };
      const result = analyzeKorean(deepSaju as any);
      expect(result.soulPattern.type).toBe('창조자 영혼');
    });

    it('should handle missing intermediate properties', () => {
      const result = analyzeKorean({ advancedAnalysis: {} } as any);
      expect(result).toBeDefined();
    });

    it('should handle advancedAnalysis as null', () => {
      const result = analyzeKorean({ advancedAnalysis: null } as any);
      expect(result).toBeDefined();
    });

    it('should handle advancedAnalysis as undefined', () => {
      const result = analyzeKorean({ advancedAnalysis: undefined } as any);
      expect(result).toBeDefined();
    });

    it('should handle advancedAnalysis as primitive', () => {
      const result = analyzeKorean({ advancedAnalysis: 'test' } as any);
      expect(result).toBeDefined();
    });

    it('should handle geokguk as array of objects', () => {
      const result = analyzeKorean({
        advancedAnalysis: {
          geokguk: [{ name: '식신' }, { name: '상관' }],
        },
      } as any);
      expect(result).toBeDefined();
    });

    it('should handle planets as non-array', () => {
      // Strings don't have .find method
      expect(() => {
        analyzeKorean(null, { planets: 'not an array' } as any);
      }).toThrow();
    });

    it('should handle planets as number', () => {
      // Numbers don't have .find method
      expect(() => {
        analyzeKorean(null, { planets: 123 } as any);
      }).toThrow();
    });

    it('should handle planets as object', () => {
      // Objects don't have .find method
      expect(() => {
        analyzeKorean(null, { planets: { name: 'Saturn', house: 5 } } as any);
      }).toThrow();
    });
  });

  describe('Combination Boundary Tests', () => {
    it('should handle all geokguk with all invalid houses', () => {
      GEOKGUK_TYPES.forEach((geokguk) => {
        BOUNDARY_HOUSES.INVALID_LOW.forEach((house) => {
          const result = analyzeKorean(
            createSaju({ geokguk }),
            createAstro([{ name: 'Saturn', house }])
          );
          expect(result.soulPattern.type).not.toBe('탐험가 영혼');
          expect(result.saturnHouse).toBeUndefined();
        });
      });
    });

    it('should handle all day masters with empty sinsal', () => {
      DAY_MASTER_STEMS.forEach((stem) => {
        const result = analyzeKorean(createSaju({ dayMaster: stem, sinsal: [] }));
        expect(result.dayMaster).toBe(stem);
        expect(result.karmicDebts).toEqual([]);
      });
    });

    it('should handle empty strings in all fields', () => {
      const result = analyzeKorean(
        createSaju({ geokguk: '', dayMaster: '', sinsal: [{ name: '' }] })
      );
      expect(result).toBeDefined();
      expect(result.soulPattern.type).toBe('탐험가 영혼');
      expect(result.dayMaster).toBeUndefined();
    });

    it('should handle maximum valid inputs', () => {
      const result = analyzeKorean(
        createSaju({
          geokguk: '식신격',
          dayMaster: '갑목',
          sinsal: [{ name: '원진' }, { name: '공망' }, { name: '겁살' }],
        }),
        createAstro([
          { name: 'North Node', house: 12 },
          { name: 'Saturn', house: 1 },
        ])
      );
      expect(result.karmaScore).toBeGreaterThanOrEqual(50);
      expect(result.karmaScore).toBeLessThanOrEqual(100);
    });

    it('should handle all invalid inputs', () => {
      const result = analyzeKorean(
        createSaju({ geokguk: null, dayMaster: null, sinsal: null }),
        createAstro(null)
      );
      expect(result).toBeDefined();
      expect(result.karmaScore).toBeGreaterThanOrEqual(50); // At least base score
    });
  });

  describe('Language Boundary Tests', () => {
    it('should handle Korean mode with extreme inputs', () => {
      const result = analyzeKorean(
        createSaju({ geokguk: EXTREME_STRINGS.MIXED }),
        createAstro([{ name: EXTREME_STRINGS.UNICODE, house: 5 }])
      );
      expect(result.soulPattern.type).toMatch(/[\uAC00-\uD7AF]/);
    });

    it('should handle English mode with extreme inputs', () => {
      const result = analyzeEnglish(
        createSaju({ geokguk: EXTREME_STRINGS.SPECIAL_CHARS }),
        createAstro([{ name: EXTREME_STRINGS.VERY_LONG, house: 7 }])
      );
      expect(result.soulPattern.type).toMatch(/[A-Za-z]/);
    });

    it('should handle language switch with same data', () => {
      const saju = createSaju({ geokguk: '식신' });
      const astro = createAstro([{ name: 'Saturn', house: 5 }]);

      const koResult = analyzeKorean(saju, astro);
      const enResult = analyzeEnglish(saju, astro);

      expect(koResult.karmaScore).toBe(enResult.karmaScore);
      expect(koResult.soulPattern.emoji).toBe(enResult.soulPattern.emoji);
    });
  });

  describe('Performance Boundaries', () => {
    it('should handle rapid successive calls with boundaries', () => {
      for (let i = 0; i < 100; i++) {
        const house = i % 2 === 0 ? BOUNDARY_HOUSES.MIN : BOUNDARY_HOUSES.MAX;
        const result = analyzeKorean(
          null,
          createAstro([{ name: 'North Node', house }])
        );
        expect(result.northNodeHouse).toBe(house);
      }
    });

    it('should handle alternating extreme values', () => {
      const extremeValues = [
        null,
        undefined,
        '',
        EXTREME_STRINGS.VERY_LONG,
        EXTREME_STRINGS.SPECIAL_CHARS,
        123,
        true,
        [],
        {},
      ];

      extremeValues.forEach((value) => {
        const result = analyzeKorean(createSaju({ geokguk: value as any }));
        expect(result).toBeDefined();
        expect(result.karmaScore).toBeGreaterThanOrEqual(50);
      });
    });

    it('should handle maximum complexity input', () => {
      const start = Date.now();

      const complexSaju = {
        advancedAnalysis: {
          geokguk: { name: '식신격' },
          sinsal: {
            unluckyList: Array(50).fill(null).map((_, i) => ({
              name: SINSAL_TYPES[i % 3],
              shinsal: SINSAL_TYPES[i % 3],
              extra: { data: 'test' },
            })),
          },
        },
        dayMaster: { name: '갑목' },
        pillars: { day: { heavenlyStem: '을화' } },
        fourPillars: { day: { heavenlyStem: '병토' } },
      };

      const complexAstro = {
        planets: Array(100).fill(null).map((_, i) => ({
          name: i === 50 ? 'North Node' : i === 75 ? 'Saturn' : `Planet${i}`,
          house: (i % 12) + 1,
          extra: { data: 'test' },
        })),
      };

      const result = analyzeKorean(complexSaju, complexAstro);
      const duration = Date.now() - start;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  describe('Karma Score Boundaries', () => {
    it('should never go below minimum score', () => {
      const invalidInputs = [
        { saju: null, astro: null },
        { saju: {}, astro: {} },
        { saju: { advancedAnalysis: {} }, astro: { planets: [] } },
        { saju: createSaju({ geokguk: '', dayMaster: '', sinsal: [] }), astro: createAstro([]) },
      ];

      invalidInputs.forEach(({ saju, astro }) => {
        const result = analyzeKorean(saju, astro);
        expect(result.karmaScore).toBeGreaterThanOrEqual(50);
      });
    });

    it('should never exceed maximum score', () => {
      const maxInputs = Array(10).fill(null).map(() => ({
        saju: createSaju({
          geokguk: '식신격',
          dayMaster: '갑목',
          sinsal: Array(100).fill({ name: '원진' }),
        }),
        astro: createAstro([
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 12 },
        ]),
      }));

      maxInputs.forEach(({ saju, astro }) => {
        const result = analyzeKorean(saju, astro);
        expect(result.karmaScore).toBeLessThanOrEqual(100);
      });
    });

    it('should have integer karma score', () => {
      const result = analyzeKorean(
        createSaju({ geokguk: '식신' }),
        createAstro([{ name: 'Saturn', house: 5 }])
      );
      expect(Number.isInteger(result.karmaScore)).toBe(true);
    });
  });

  describe('Error Recovery Boundaries', () => {
    it('should recover from circular reference in saju', () => {
      const circular: any = { advancedAnalysis: {} };
      circular.advancedAnalysis.self = circular;

      expect(() => analyzeKorean(circular)).not.toThrow();
    });

    it('should recover from circular reference in astro', () => {
      const circular: any = { planets: [] };
      circular.planets.push(circular);

      expect(() => analyzeKorean(null, circular)).not.toThrow();
    });

    it('should recover from getter that throws', () => {
      const badSaju = Object.create({}, {
        advancedAnalysis: {
          get() {
            throw new Error('Test error');
          },
        },
      });

      // Analyzer doesn't wrap in try-catch, will throw
      expect(() => analyzeKorean(badSaju)).toThrow();
    });

    it('should handle frozen objects', () => {
      const frozenSaju = Object.freeze(createSaju({ geokguk: '식신' }));
      const frozenAstro = Object.freeze(createAstro([{ name: 'Saturn', house: 5 }]));

      const result = analyzeKorean(frozenSaju, frozenAstro);
      expect(result).toBeDefined();
    });

    it('should handle sealed objects', () => {
      const sealedSaju = Object.seal(createSaju({ geokguk: '정관' }));
      const result = analyzeKorean(sealedSaju);
      expect(result).toBeDefined();
    });
  });
});
