/**
 * Tests for src/lib/prediction/utils/saju-extractors.ts
 * Saju 사주 데이터 추출 헬퍼 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  extractPillarData,
  extractAllStems,
  extractAllBranches,
} from '@/lib/prediction/utils/saju-extractors';

describe('saju-extractors', () => {
  describe('extractPillarData', () => {
    it('should extract pillar data from object-based stems/branches', () => {
      const saju = {
        dayMaster: { heavenlyStem: '甲' },
        pillars: {
          year: { heavenlyStem: { name: '甲' }, earthlyBranch: { name: '子' } },
          month: { heavenlyStem: { name: '丙' }, earthlyBranch: { name: '寅' } },
          day: { heavenlyStem: { name: '戊' }, earthlyBranch: { name: '午' } },
          time: { heavenlyStem: { name: '庚' }, earthlyBranch: { name: '申' } },
        },
      };

      const result = extractPillarData(saju);

      expect(result.dayStem).toBe('甲');
      expect(result.dayBranch).toBe('午');
      expect(result.monthBranch).toBe('寅');
      expect(result.yearBranch).toBe('子');
      expect(result.timeBranch).toBe('申');
    });

    it('should extract pillar data from string-based stems/branches', () => {
      const saju = {
        dayMaster: '甲',
        pillars: {
          year: { heavenlyStem: '甲', earthlyBranch: '子' },
          month: { heavenlyStem: '丙', earthlyBranch: '寅' },
          day: { heavenlyStem: '戊', earthlyBranch: '午' },
          time: { heavenlyStem: '庚', earthlyBranch: '申' },
        },
      };

      const result = extractPillarData(saju);

      expect(result.dayStem).toBe('甲');
      expect(result.dayBranch).toBe('午');
    });

    it('should return defaults for undefined saju', () => {
      const result = extractPillarData(undefined);

      expect(result.dayStem).toBe('甲');
      expect(result.dayBranch).toBe('子');
      expect(result.monthBranch).toBe('子');
      expect(result.yearBranch).toBe('子');
      expect(result.timeBranch).toBe('子');
    });

    it('should return defaults for empty pillars', () => {
      const result = extractPillarData({ pillars: {} });

      expect(result.dayStem).toBe('甲');
      expect(result.dayBranch).toBe('子');
    });

    it('should handle dayMaster as object with heavenlyStem', () => {
      const result = extractPillarData({
        dayMaster: { heavenlyStem: '丙' },
      });

      expect(result.dayStem).toBe('丙');
    });

    it('should handle missing name in object stem', () => {
      const saju = {
        pillars: {
          day: { heavenlyStem: { name: '' }, earthlyBranch: { name: '' } },
        },
      };

      const result = extractPillarData(saju);

      // Empty name falls back to defaults
      expect(result.dayBranch).toBe('子');
    });

    it('should handle null-ish heavenlyStem gracefully', () => {
      const saju = {
        pillars: {
          day: { heavenlyStem: undefined, earthlyBranch: undefined },
        },
      };

      const result = extractPillarData(saju as any);

      expect(result.dayBranch).toBe('子');
    });
  });

  describe('extractAllStems', () => {
    it('should extract all stems from object-based pillars', () => {
      const saju = {
        dayMaster: { heavenlyStem: '甲' },
        pillars: {
          year: { heavenlyStem: { name: '乙' } },
          month: { heavenlyStem: { name: '丙' } },
          day: { heavenlyStem: { name: '戊' } },
          time: { heavenlyStem: { name: '庚' } },
        },
      };

      const stems = extractAllStems(saju);

      // extractAllStems uses dayMaster for day stem (index 2), not pillars.day
      expect(stems).toEqual(['乙', '丙', '甲', '庚']);
    });

    it('should extract stems from string-based pillars', () => {
      const saju = {
        dayMaster: '乙',
        pillars: {
          year: { heavenlyStem: '甲' },
          month: { heavenlyStem: '丙' },
        },
      };

      const stems = extractAllStems(saju);

      expect(stems).toContain('甲');
      expect(stems).toContain('丙');
      expect(stems).toContain('乙');
    });

    it('should filter out null values', () => {
      const stems = extractAllStems(undefined);
      expect(stems).toEqual([]);
    });

    it('should handle empty pillars', () => {
      const stems = extractAllStems({ pillars: {} });
      expect(stems).toEqual([]);
    });

    it('should handle missing name in stem object', () => {
      const saju = {
        pillars: {
          year: { heavenlyStem: { name: '' } },
        },
      };

      const stems = extractAllStems(saju);
      // Empty name returns null, which is filtered out
      expect(stems).toEqual([]);
    });
  });

  describe('extractAllBranches', () => {
    it('should extract all branches from object-based pillars', () => {
      const saju = {
        pillars: {
          year: { earthlyBranch: { name: '子' } },
          month: { earthlyBranch: { name: '丑' } },
          day: { earthlyBranch: { name: '寅' } },
          time: { earthlyBranch: { name: '卯' } },
        },
      };

      const branches = extractAllBranches(saju);

      expect(branches).toEqual(['子', '丑', '寅', '卯']);
    });

    it('should extract branches from string-based pillars', () => {
      const saju = {
        pillars: {
          year: { earthlyBranch: '子' },
          month: { earthlyBranch: '丑' },
          day: { earthlyBranch: '寅' },
          time: { earthlyBranch: '卯' },
        },
      };

      const branches = extractAllBranches(saju);

      expect(branches).toEqual(['子', '丑', '寅', '卯']);
    });

    it('should return empty array for undefined saju', () => {
      expect(extractAllBranches(undefined)).toEqual([]);
    });

    it('should filter out missing pillars', () => {
      const saju = {
        pillars: {
          year: { earthlyBranch: '子' },
          // month, day, time are undefined
        },
      };

      const branches = extractAllBranches(saju);

      expect(branches).toEqual(['子']);
    });

    it('should handle empty name in branch object', () => {
      const saju = {
        pillars: {
          year: { earthlyBranch: { name: '' } },
          month: { earthlyBranch: { name: '丑' } },
        },
      };

      const branches = extractAllBranches(saju);
      // Empty name returns null, filtered out
      expect(branches).toEqual(['丑']);
    });
  });
});
