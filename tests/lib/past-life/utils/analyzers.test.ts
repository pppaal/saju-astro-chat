/**
 * Tests for src/lib/past-life/utils/analyzers.ts
 * 전생 분석 유틸리티 테스트
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/past-life/data/constants', () => ({
  KARMIC_DEBT_CONFIG: {
    MAX_ITEMS: 4,
    PATTERNS: {
      '원진': {
        ko: { area: '관계 카르마', description: '전생 관계 갈등', healing: '용서' },
        en: { area: 'Relationship Karma', description: 'Past life conflicts', healing: 'Forgive' },
      },
      '공망': {
        ko: { area: '공허 카르마', description: '공허감의 근원', healing: '수용' },
        en: { area: 'Void Karma', description: 'Source of emptiness', healing: 'Accept' },
      },
      '겁살': {
        ko: { area: '재난 카르마', description: '위기 패턴', healing: '대비' },
        en: { area: 'Disaster Karma', description: 'Crisis patterns', healing: 'Prepare' },
      },
    },
  },
  KARMIC_PATTERN_MATCHERS: {
    '원진': ['원진', '元嗔'],
    '공망': ['공망', '空亡'],
    '겁살': ['겁살', '劫殺'],
  },
  KARMA_SCORE_CONFIG: {
    BASE_SCORE: 65,
    MIN_SCORE: 40,
    MAX_SCORE: 100,
    BONUS: {
      GEOKGUK: 10,
      NORTH_NODE: 8,
      SATURN: 5,
      DAY_MASTER: 7,
      PER_KARMIC_DEBT: 3,
    },
  },
}));

import { analyzeKarmicDebts, calculateKarmaScore } from '@/lib/past-life/utils/analyzers';

describe('past-life analyzers', () => {
  describe('analyzeKarmicDebts', () => {
    it('should return empty array for null saju', () => {
      const result = analyzeKarmicDebts(null, true);
      expect(result).toEqual([]);
    });

    it('should return empty array for saju without unlucky list', () => {
      const result = analyzeKarmicDebts({ advancedAnalysis: {} } as any, true);
      expect(result).toEqual([]);
    });

    it('should detect 원진 pattern in Korean', () => {
      const saju = {
        advancedAnalysis: {
          sinsal: {
            unluckyList: [{ name: '원진살' }],
          },
        },
      };

      const result = analyzeKarmicDebts(saju as any, true);
      expect(result).toHaveLength(1);
      expect(result[0].area).toBe('관계 카르마');
    });

    it('should detect 원진 pattern in English', () => {
      const saju = {
        advancedAnalysis: {
          sinsal: {
            unluckyList: [{ name: '원진살' }],
          },
        },
      };

      const result = analyzeKarmicDebts(saju as any, false);
      expect(result).toHaveLength(1);
      expect(result[0].area).toBe('Relationship Karma');
    });

    it('should detect multiple patterns', () => {
      const saju = {
        advancedAnalysis: {
          sinsal: {
            unluckyList: [
              { name: '원진' },
              { name: '공망' },
              { name: '겁살' },
            ],
          },
        },
      };

      const result = analyzeKarmicDebts(saju as any, true);
      expect(result).toHaveLength(3);
    });

    it('should handle string items in unlucky list', () => {
      const saju = {
        advancedAnalysis: {
          sinsal: {
            unluckyList: ['원진살', '공망'],
          },
        },
      };

      const result = analyzeKarmicDebts(saju as any, true);
      expect(result).toHaveLength(2);
    });

    it('should handle items with shinsal property', () => {
      const saju = {
        advancedAnalysis: {
          sinsal: {
            unluckyList: [{ shinsal: '공망' }],
          },
        },
      };

      const result = analyzeKarmicDebts(saju as any, true);
      expect(result).toHaveLength(1);
      expect(result[0].area).toBe('공허 카르마');
    });

    it('should limit to MAX_ITEMS', () => {
      const saju = {
        advancedAnalysis: {
          sinsal: {
            unluckyList: [
              { name: '원진' },
              { name: '공망' },
              { name: '겁살' },
              { name: '원진살' },
              { name: '추가항목' }, // 5th item, should be ignored
            ],
          },
        },
      };

      const result = analyzeKarmicDebts(saju as any, true);
      expect(result.length).toBeLessThanOrEqual(4);
    });

    it('should skip items with empty name', () => {
      const saju = {
        advancedAnalysis: {
          sinsal: {
            unluckyList: [{ name: '' }, { name: '원진' }],
          },
        },
      };

      const result = analyzeKarmicDebts(saju as any, true);
      expect(result).toHaveLength(1);
    });

    it('should skip unrecognized patterns', () => {
      const saju = {
        advancedAnalysis: {
          sinsal: {
            unluckyList: [{ name: '알수없는살' }],
          },
        },
      };

      const result = analyzeKarmicDebts(saju as any, true);
      expect(result).toEqual([]);
    });
  });

  describe('calculateKarmaScore', () => {
    it('should return base score with no inputs', () => {
      const result = calculateKarmaScore(null, null, null, null, 0);
      expect(result).toBe(65);
    });

    it('should add geokguk bonus', () => {
      const result = calculateKarmaScore('식신격' as any, null, null, null, 0);
      expect(result).toBe(75); // 65 + 10
    });

    it('should add north node bonus', () => {
      const result = calculateKarmaScore(null, 1 as any, null, null, 0);
      expect(result).toBe(73); // 65 + 8
    });

    it('should add saturn bonus', () => {
      const result = calculateKarmaScore(null, null, 10 as any, null, 0);
      expect(result).toBe(70); // 65 + 5
    });

    it('should add day master bonus', () => {
      const result = calculateKarmaScore(null, null, null, '甲' as any, 0);
      expect(result).toBe(72); // 65 + 7
    });

    it('should add per-karmic-debt bonus', () => {
      const result = calculateKarmaScore(null, null, null, null, 3);
      expect(result).toBe(74); // 65 + (3 * 3)
    });

    it('should cap at max score (100)', () => {
      const result = calculateKarmaScore(
        '식신격' as any, 1 as any, 10 as any, '甲' as any, 10
      );
      // 65 + 10 + 8 + 5 + 7 + 30 = 125, capped at 100
      expect(result).toBe(100);
    });

    it('should not go below min score (40)', () => {
      // Base is 65, no negatives possible in current formula
      // but test the min guard
      const result = calculateKarmaScore(null, null, null, null, 0);
      expect(result).toBeGreaterThanOrEqual(40);
    });

    it('should accumulate all bonuses', () => {
      const result = calculateKarmaScore(
        '식신격' as any, 1 as any, 10 as any, '甲' as any, 2
      );
      // 65 + 10 + 8 + 5 + 7 + 6 = 101, capped at 100
      expect(result).toBe(100);
    });
  });
});
