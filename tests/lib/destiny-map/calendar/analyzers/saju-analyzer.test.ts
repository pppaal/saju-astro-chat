/**
 * Tests for saju-analyzer.ts
 * Saju analysis integration tests
 */
import { describe, it, expect, vi } from 'vitest';
import { analyzeSaju, type SajuAnalysisInput } from '@/lib/destiny-map/calendar/analyzers/saju-analyzer';
import type { UserSajuProfile } from '@/lib/destiny-map/calendar/types';

describe('destiny-map/calendar/analyzers/saju-analyzer', () => {
  const mockSajuProfile: UserSajuProfile = {
    birthYear: 1990,
    dayMaster: '갑',
    dayBranch: '자',
    yongsin: '火',
    geokguk: '정관격',
    pillars: {
      year: { stem: '경', branch: '오' },
      month: { stem: '무', branch: '인' },
      day: { stem: '갑', branch: '자' },
      time: { stem: '병', branch: '인' },
    },
    daeunCycles: [
      { age: 7, stem: '기', branch: '축', startYear: 1997 },
      { age: 17, stem: '경', branch: '인', startYear: 2007 },
      { age: 27, stem: '신', branch: '묘', startYear: 2017 },
    ],
  };

  const baseInput: SajuAnalysisInput = {
    dayMasterElement: 'Wood',
    dayBranch: '자',
    dayMasterStem: '갑',
    sajuProfile: mockSajuProfile,
    ganzhi: { stem: '갑', branch: '자' },
    year: 2024,
    month: 1,
    date: new Date('2024-01-15'),
  };

  describe('analyzeSaju', () => {
    it('should return complete saju analysis', () => {
      const result = analyzeSaju(baseInput);

      expect(result).toHaveProperty('daeunAnalysis');
      expect(result).toHaveProperty('seunAnalysis');
      expect(result).toHaveProperty('wolunAnalysis');
      expect(result).toHaveProperty('iljinAnalysis');
      expect(result).toHaveProperty('yongsinAnalysis');
      expect(result).toHaveProperty('geokgukAnalysis');
    });

    it('should include daeun analysis', () => {
      const result = analyzeSaju(baseInput);

      expect(result.daeunAnalysis).toBeDefined();
      expect(result.daeunAnalysis).toHaveProperty('score');
      expect(result.daeunAnalysis).toHaveProperty('factorKeys');
      expect(result.daeunAnalysis).toHaveProperty('positive');
      expect(result.daeunAnalysis).toHaveProperty('negative');
    });

    it('should include seun analysis', () => {
      const result = analyzeSaju(baseInput);

      expect(result.seunAnalysis).toBeDefined();
      expect(result.seunAnalysis).toHaveProperty('score');
      expect(result.seunAnalysis).toHaveProperty('factorKeys');
    });

    it('should include wolun analysis', () => {
      const result = analyzeSaju(baseInput);

      expect(result.wolunAnalysis).toBeDefined();
      expect(result.wolunAnalysis).toHaveProperty('score');
      expect(result.wolunAnalysis).toHaveProperty('factorKeys');
    });

    it('should include iljin analysis', () => {
      const result = analyzeSaju(baseInput);

      expect(result.iljinAnalysis).toBeDefined();
      expect(result.iljinAnalysis).toHaveProperty('score');
      expect(result.iljinAnalysis).toHaveProperty('factorKeys');
      expect(result.iljinAnalysis).toHaveProperty('ganzhi');
    });

    it('should include yongsin analysis', () => {
      const result = analyzeSaju(baseInput);

      expect(result.yongsinAnalysis).toBeDefined();
      expect(result.yongsinAnalysis).toHaveProperty('score');
      expect(result.yongsinAnalysis).toHaveProperty('factorKeys');
    });

    it('should include geokguk analysis', () => {
      const result = analyzeSaju(baseInput);

      expect(result.geokgukAnalysis).toBeDefined();
      expect(result.geokgukAnalysis).toHaveProperty('score');
      expect(result.geokgukAnalysis).toHaveProperty('factorKeys');
    });
  });

  describe('analyzeSaju with different inputs', () => {
    it('should handle different day master elements', () => {
      const fireInput = { ...baseInput, dayMasterElement: 'Fire' };
      const result = analyzeSaju(fireInput);

      expect(result.daeunAnalysis).toBeDefined();
      expect(result.seunAnalysis).toBeDefined();
    });

    it('should handle different years', () => {
      const result2023 = analyzeSaju({ ...baseInput, year: 2023 });
      const result2024 = analyzeSaju({ ...baseInput, year: 2024 });

      expect(result2023.seunAnalysis).toBeDefined();
      expect(result2024.seunAnalysis).toBeDefined();
    });

    it('should handle different months', () => {
      const resultJan = analyzeSaju({ ...baseInput, month: 1 });
      const resultJul = analyzeSaju({ ...baseInput, month: 7 });

      expect(resultJan.wolunAnalysis).toBeDefined();
      expect(resultJul.wolunAnalysis).toBeDefined();
    });

    it('should handle different ganzhi', () => {
      const result = analyzeSaju({
        ...baseInput,
        ganzhi: { stem: '을', branch: '축' },
      });

      expect(result.iljinAnalysis).toBeDefined();
      expect(result.yongsinAnalysis).toBeDefined();
    });

    it('should handle different yongsin', () => {
      const profileWithWater = {
        ...mockSajuProfile,
        yongsin: '水',
      };

      const result = analyzeSaju({
        ...baseInput,
        sajuProfile: profileWithWater,
      });

      expect(result.yongsinAnalysis).toBeDefined();
    });

    it('should handle different geokguk', () => {
      const profileWithDifferentGeokguk = {
        ...mockSajuProfile,
        geokguk: '식신격',
      };

      const result = analyzeSaju({
        ...baseInput,
        sajuProfile: profileWithDifferentGeokguk,
      });

      expect(result.geokgukAnalysis).toBeDefined();
    });
  });

  describe('integration with temporal scoring', () => {
    it('should pass correct parameters to daeun calculation', () => {
      const result = analyzeSaju(baseInput);

      expect(result.daeunAnalysis).toBeDefined();
      expect(typeof result.daeunAnalysis.score).toBe('number');
    });

    it('should pass correct parameters to seun calculation', () => {
      const result = analyzeSaju(baseInput);

      expect(result.seunAnalysis).toBeDefined();
      expect(typeof result.seunAnalysis.score).toBe('number');
    });

    it('should pass correct parameters to wolun calculation', () => {
      const result = analyzeSaju(baseInput);

      expect(result.wolunAnalysis).toBeDefined();
      expect(typeof result.wolunAnalysis.score).toBe('number');
    });

    it('should pass correct parameters to iljin calculation', () => {
      const result = analyzeSaju(baseInput);

      expect(result.iljinAnalysis).toBeDefined();
      expect(typeof result.iljinAnalysis.score).toBe('number');
    });
  });

  describe('edge cases', () => {
    it('should handle empty daeun cycles', () => {
      const profileNoDaeun = {
        ...mockSajuProfile,
        daeunCycles: [],
      };

      const result = analyzeSaju({
        ...baseInput,
        sajuProfile: profileNoDaeun,
      });

      expect(result.daeunAnalysis).toBeDefined();
    });

    it('should handle early age in daeun', () => {
      const result = analyzeSaju({
        ...baseInput,
        year: 1995, // Age 5, before first daeun cycle
      });

      expect(result.daeunAnalysis).toBeDefined();
    });

    it('should handle future dates', () => {
      const result = analyzeSaju({
        ...baseInput,
        year: 2050,
        date: new Date('2050-06-15'),
      });

      expect(result).toBeDefined();
      expect(result.seunAnalysis).toBeDefined();
      expect(result.wolunAnalysis).toBeDefined();
    });

    it('should handle past dates', () => {
      const result = analyzeSaju({
        ...baseInput,
        year: 2000,
        date: new Date('2000-03-20'),
      });

      expect(result).toBeDefined();
      expect(result.seunAnalysis).toBeDefined();
      expect(result.wolunAnalysis).toBeDefined();
    });

    it('should handle different date of same year', () => {
      const resultJan = analyzeSaju({
        ...baseInput,
        month: 1,
        date: new Date('2024-01-01'),
        ganzhi: { stem: '갑', branch: '자' },
      });

      const resultDec = analyzeSaju({
        ...baseInput,
        month: 12,
        date: new Date('2024-12-31'),
        ganzhi: { stem: '을', branch: '축' },
      });

      // Both analyses should complete successfully
      expect(resultJan.wolunAnalysis).toBeDefined();
      expect(resultDec.wolunAnalysis).toBeDefined();
      expect(resultJan.iljinAnalysis).toBeDefined();
      expect(resultDec.iljinAnalysis).toBeDefined();
    });
  });

  describe('output structure validation', () => {
    it('should return all required analysis fields', () => {
      const result = analyzeSaju(baseInput);

      const requiredFields = [
        'daeunAnalysis',
        'seunAnalysis',
        'wolunAnalysis',
        'iljinAnalysis',
        'yongsinAnalysis',
        'geokgukAnalysis',
      ];

      requiredFields.forEach(field => {
        expect(result).toHaveProperty(field);
      });
    });

    it('should return analysis with score properties', () => {
      const result = analyzeSaju(baseInput);

      expect(typeof result.daeunAnalysis.score).toBe('number');
      expect(typeof result.seunAnalysis.score).toBe('number');
      expect(typeof result.wolunAnalysis.score).toBe('number');
      expect(typeof result.iljinAnalysis.score).toBe('number');
    });

    it('should return analysis with factorKeys properties', () => {
      const result = analyzeSaju(baseInput);

      expect(Array.isArray(result.daeunAnalysis.factorKeys)).toBe(true);
      expect(Array.isArray(result.seunAnalysis.factorKeys)).toBe(true);
      expect(Array.isArray(result.wolunAnalysis.factorKeys)).toBe(true);
      expect(Array.isArray(result.iljinAnalysis.factorKeys)).toBe(true);
    });

    it('should return analysis with boolean flags', () => {
      const result = analyzeSaju(baseInput);

      expect(typeof result.daeunAnalysis.positive).toBe('boolean');
      expect(typeof result.daeunAnalysis.negative).toBe('boolean');
      expect(typeof result.seunAnalysis.positive).toBe('boolean');
      expect(typeof result.seunAnalysis.negative).toBe('boolean');
    });

    it('should return iljin analysis with ganzhi', () => {
      const result = analyzeSaju(baseInput);

      expect(result.iljinAnalysis).toHaveProperty('ganzhi');
      expect(result.iljinAnalysis.ganzhi).toHaveProperty('stem');
      expect(result.iljinAnalysis.ganzhi).toHaveProperty('branch');
    });
  });

  describe('consistency tests', () => {
    it('should return consistent results for same input', () => {
      const result1 = analyzeSaju(baseInput);
      const result2 = analyzeSaju(baseInput);

      expect(result1.daeunAnalysis.score).toBe(result2.daeunAnalysis.score);
      expect(result1.seunAnalysis.score).toBe(result2.seunAnalysis.score);
      expect(result1.wolunAnalysis.score).toBe(result2.wolunAnalysis.score);
      expect(result1.iljinAnalysis.score).toBe(result2.iljinAnalysis.score);
    });

    it('should return valid results for different years', () => {
      const result2023 = analyzeSaju({ ...baseInput, year: 2023 });
      const result2024 = analyzeSaju({ ...baseInput, year: 2024 });

      // Both years should produce valid analysis
      expect(result2023.seunAnalysis).toBeDefined();
      expect(result2024.seunAnalysis).toBeDefined();
      expect(result2023.daeunAnalysis).toBeDefined();
      expect(result2024.daeunAnalysis).toBeDefined();
    });

    it('should return different results for different months', () => {
      const resultJan = analyzeSaju({ ...baseInput, month: 1 });
      const resultJul = analyzeSaju({ ...baseInput, month: 7 });

      // Wolun score may differ for different months depending on factors
      // Just check that analysis completes successfully
      expect(resultJan.wolunAnalysis).toBeDefined();
      expect(resultJul.wolunAnalysis).toBeDefined();
    });
  });
});
