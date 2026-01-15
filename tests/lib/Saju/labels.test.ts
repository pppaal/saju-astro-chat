import { describe, it, expect } from 'vitest';
import { STEM_LABELS, BRANCH_LABELS } from '@/lib/Saju/labels';

describe('Saju Labels', () => {
  describe('STEM_LABELS', () => {
    it('should have 10 heavenly stems', () => {
      expect(Object.keys(STEM_LABELS).length).toBe(10);
    });

    it('should have hangul and roman for each stem', () => {
      Object.entries(STEM_LABELS).forEach(([key, value]) => {
        expect(value).toHaveProperty('hangul');
        expect(value).toHaveProperty('roman');
        expect(typeof value.hangul).toBe('string');
        expect(typeof value.roman).toBe('string');
      });
    });

    it('should contain all 10 stems', () => {
      const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      stems.forEach(stem => {
        expect(STEM_LABELS).toHaveProperty(stem);
      });
    });

    it('should have Gap for 甲', () => {
      expect(STEM_LABELS['甲'].hangul).toBe('갑');
      expect(STEM_LABELS['甲'].roman).toBe('Gap');
    });

    it('should have Gye for 癸', () => {
      expect(STEM_LABELS['癸'].hangul).toBe('계');
      expect(STEM_LABELS['癸'].roman).toBe('Gye');
    });
  });

  describe('BRANCH_LABELS', () => {
    it('should have 12 earthly branches', () => {
      expect(Object.keys(BRANCH_LABELS).length).toBe(12);
    });

    it('should have hangul and roman for each branch', () => {
      Object.entries(BRANCH_LABELS).forEach(([key, value]) => {
        expect(value).toHaveProperty('hangul');
        expect(value).toHaveProperty('roman');
        expect(typeof value.hangul).toBe('string');
        expect(typeof value.roman).toBe('string');
      });
    });

    it('should contain all 12 branches', () => {
      const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      branches.forEach(branch => {
        expect(BRANCH_LABELS).toHaveProperty(branch);
      });
    });

    it('should have Ja for 子', () => {
      expect(BRANCH_LABELS['子'].hangul).toBe('자');
      expect(BRANCH_LABELS['子'].roman).toBe('Ja');
    });

    it('should have Hae for 亥', () => {
      expect(BRANCH_LABELS['亥'].hangul).toBe('해');
      expect(BRANCH_LABELS['亥'].roman).toBe('Hae');
    });
  });
});
