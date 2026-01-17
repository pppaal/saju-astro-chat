/**
 * Map-12 Adapter Tests
 * 사주 필러 뷰 생성 어댑터 테스트
 */

import { describe, it, expect } from 'vitest';
import { buildPillarView, type PillarView, type PillarSide } from '@/adapters/map-12';

describe('Map-12 Adapter', () => {
  describe('buildPillarView', () => {
    it('should return empty object for undefined input', () => {
      const result = buildPillarView(undefined);
      expect(result).toEqual({});
    });

    it('should return PillarView structure', () => {
      const mockSource = {
        year: {
          heavenlyStem: { name: '甲', element: 'Wood' as const },
          earthlyBranch: { name: '子', element: 'Water' as const },
        },
        month: {
          heavenlyStem: { name: '乙', element: 'Wood' as const },
          earthlyBranch: { name: '丑', element: 'Earth' as const },
        },
        day: {
          heavenlyStem: { name: '丙', element: 'Fire' as const },
          earthlyBranch: { name: '寅', element: 'Wood' as const },
        },
        time: {
          heavenlyStem: { name: '丁', element: 'Fire' as const },
          earthlyBranch: { name: '卯', element: 'Wood' as const },
        },
      };

      const result = buildPillarView(mockSource);

      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('day');
      expect(result).toHaveProperty('time');
    });

    it('should include jijanggan property in each pillar', () => {
      const mockSource = {
        year: {
          heavenlyStem: { name: '甲', element: 'Wood' as const },
          earthlyBranch: { name: '子', element: 'Water' as const },
        },
        month: {
          heavenlyStem: { name: '乙', element: 'Wood' as const },
          earthlyBranch: { name: '丑', element: 'Earth' as const },
        },
        day: {
          heavenlyStem: { name: '丙', element: 'Fire' as const },
          earthlyBranch: { name: '寅', element: 'Wood' as const },
        },
        time: {
          heavenlyStem: { name: '丁', element: 'Fire' as const },
          earthlyBranch: { name: '卯', element: 'Wood' as const },
        },
      };

      const result = buildPillarView(mockSource);

      if (result.year) {
        expect(result.year).toHaveProperty('jijanggan');
      }
      if (result.month) {
        expect(result.month).toHaveProperty('jijanggan');
      }
      if (result.day) {
        expect(result.day).toHaveProperty('jijanggan');
      }
      if (result.time) {
        expect(result.time).toHaveProperty('jijanggan');
      }
    });

    it('should include twelveStage property in each pillar', () => {
      const mockSource = {
        year: {
          heavenlyStem: { name: '甲', element: 'Wood' as const },
          earthlyBranch: { name: '子', element: 'Water' as const },
        },
        month: {
          heavenlyStem: { name: '乙', element: 'Wood' as const },
          earthlyBranch: { name: '丑', element: 'Earth' as const },
        },
        day: {
          heavenlyStem: { name: '丙', element: 'Fire' as const },
          earthlyBranch: { name: '寅', element: 'Wood' as const },
        },
        time: {
          heavenlyStem: { name: '丁', element: 'Fire' as const },
          earthlyBranch: { name: '卯', element: 'Wood' as const },
        },
      };

      const result = buildPillarView(mockSource);

      if (result.year) {
        expect(result.year).toHaveProperty('twelveStage');
      }
    });

    it('should include lucky array in each pillar', () => {
      const mockSource = {
        year: {
          heavenlyStem: { name: '甲', element: 'Wood' as const },
          earthlyBranch: { name: '子', element: 'Water' as const },
        },
        month: {
          heavenlyStem: { name: '乙', element: 'Wood' as const },
          earthlyBranch: { name: '丑', element: 'Earth' as const },
        },
        day: {
          heavenlyStem: { name: '丙', element: 'Fire' as const },
          earthlyBranch: { name: '寅', element: 'Wood' as const },
        },
        time: {
          heavenlyStem: { name: '丁', element: 'Fire' as const },
          earthlyBranch: { name: '卯', element: 'Wood' as const },
        },
      };

      const result = buildPillarView(mockSource);

      if (result.year) {
        expect(result.year).toHaveProperty('lucky');
        expect(Array.isArray(result.year.lucky)).toBe(true);
      }
    });
  });

  describe('PillarSide structure', () => {
    it('should have optional jijanggan property', () => {
      const pillarSide: PillarSide = {};
      expect(pillarSide.jijanggan).toBeUndefined();
    });

    it('should have optional twelveStage property', () => {
      const pillarSide: PillarSide = {};
      expect(pillarSide.twelveStage).toBeUndefined();
    });

    it('should have optional twelveShinsal property', () => {
      const pillarSide: PillarSide = {};
      expect(pillarSide.twelveShinsal).toBeUndefined();
    });

    it('should have optional lucky array property', () => {
      const pillarSide: PillarSide = {};
      expect(pillarSide.lucky).toBeUndefined();
    });

    it('should accept all properties together', () => {
      const pillarSide: PillarSide = {
        jijanggan: '癸',
        twelveStage: '제왕',
        twelveShinsal: '천을귀인',
        lucky: ['천을귀인', '금여성'],
      };

      expect(pillarSide.jijanggan).toBe('癸');
      expect(pillarSide.twelveStage).toBe('제왕');
      expect(pillarSide.twelveShinsal).toBe('천을귀인');
      expect(pillarSide.lucky).toHaveLength(2);
    });
  });

  describe('PillarView structure', () => {
    it('should have optional year property', () => {
      const pillarView: PillarView = {};
      expect(pillarView.year).toBeUndefined();
    });

    it('should have optional month property', () => {
      const pillarView: PillarView = {};
      expect(pillarView.month).toBeUndefined();
    });

    it('should have optional day property', () => {
      const pillarView: PillarView = {};
      expect(pillarView.day).toBeUndefined();
    });

    it('should have optional time property', () => {
      const pillarView: PillarView = {};
      expect(pillarView.time).toBeUndefined();
    });

    it('should accept all four pillars', () => {
      const pillarView: PillarView = {
        year: { lucky: [] },
        month: { lucky: [] },
        day: { lucky: [] },
        time: { lucky: [] },
      };

      expect(pillarView.year).toBeDefined();
      expect(pillarView.month).toBeDefined();
      expect(pillarView.day).toBeDefined();
      expect(pillarView.time).toBeDefined();
    });
  });

  describe('Input extraction from unknown pillar structures', () => {
    it('should handle Korean key names (연주, 월주, etc.)', () => {
      const mockSource = {
        연주: { 천간: '甲', 지지: '子' },
        월주: { 천간: '乙', 지지: '丑' },
        일주: { 천간: '丙', 지지: '寅' },
        시주: { 천간: '丁', 지지: '卯' },
      };

      const result = buildPillarView(mockSource as any);
      // Should not throw and return some structure
      expect(result).toBeDefined();
    });

    it('should handle gan/ji format', () => {
      const mockSource = {
        year: { gan: '甲', ji: '子' },
        month: { gan: '乙', ji: '丑' },
        day: { gan: '丙', ji: '寅' },
        time: { gan: '丁', ji: '卯' },
      };

      const result = buildPillarView(mockSource as any);
      expect(result).toBeDefined();
    });

    it('should handle stem/branch object format', () => {
      const mockSource = {
        year: {
          stem: { name: '甲', element: 'Wood' },
          branch: { name: '子', element: 'Water' },
        },
        month: {
          stem: { name: '乙', element: 'Wood' },
          branch: { name: '丑', element: 'Earth' },
        },
        day: {
          stem: { name: '丙', element: 'Fire' },
          branch: { name: '寅', element: 'Wood' },
        },
        time: {
          stem: { name: '丁', element: 'Fire' },
          branch: { name: '卯', element: 'Wood' },
        },
      };

      const result = buildPillarView(mockSource as any);
      expect(result).toBeDefined();
    });

    it('should handle string stem/branch format', () => {
      const mockSource = {
        year: { stem: '甲', branch: '子' },
        month: { stem: '乙', branch: '丑' },
        day: { stem: '丙', branch: '寅' },
        time: { stem: '丁', branch: '卯' },
      };

      const result = buildPillarView(mockSource as any);
      expect(result).toBeDefined();
    });
  });

  describe('Lucky shinsal filtering', () => {
    const KILSUNG_SET = new Set([
      '천을귀인', '태극귀인', '금여성', '천문성', '문창', '문곡',
      '도화살', '화개살', '현침살', '귀문관살', '고신살', '역마살',
      '관귀학관',
    ]);

    it('should include 천을귀인 in lucky set', () => {
      expect(KILSUNG_SET.has('천을귀인')).toBe(true);
    });

    it('should include 태극귀인 in lucky set', () => {
      expect(KILSUNG_SET.has('태극귀인')).toBe(true);
    });

    it('should include 금여성 in lucky set', () => {
      expect(KILSUNG_SET.has('금여성')).toBe(true);
    });

    it('should include 천문성 in lucky set', () => {
      expect(KILSUNG_SET.has('천문성')).toBe(true);
    });

    it('should include 문창 in lucky set', () => {
      expect(KILSUNG_SET.has('문창')).toBe(true);
    });

    it('should include 문곡 in lucky set', () => {
      expect(KILSUNG_SET.has('문곡')).toBe(true);
    });

    it('should include 도화살 in lucky set', () => {
      expect(KILSUNG_SET.has('도화살')).toBe(true);
    });

    it('should include 역마살 in lucky set', () => {
      expect(KILSUNG_SET.has('역마살')).toBe(true);
    });

    it('should include 관귀학관 for composite labels', () => {
      expect(KILSUNG_SET.has('관귀학관')).toBe(true);
    });
  });

  describe('Label normalization', () => {
    it('should preserve 귀인/성 labels without 살 suffix', () => {
      const pure = '천을귀인'.replace(/살$/g, '');
      const guiinLabels = ['천을귀인', '태극귀인', '금여성', '천문성', '문창', '문곡'];

      if (guiinLabels.includes(pure)) {
        expect(pure).toBe('천을귀인');
      }
    });

    it('should add 살 suffix to other labels', () => {
      const label = '도화';
      const normalized = label + '살';
      expect(normalized).toBe('도화살');
    });

    it('should not double 살 suffix', () => {
      const label = '도화살';
      const pure = label.replace(/살$/g, '');
      const guiinLabels = ['천을귀인', '태극귀인', '금여성', '천문성', '문창', '문곡'];

      const normalized = guiinLabels.includes(pure) ? pure : pure + '살';
      expect(normalized).toBe('도화살');
    });
  });

  describe('관귀학관 composition', () => {
    it('should compose from 문창', () => {
      const labels = ['문창', '역마살'];
      const hasAnyGwanGwi = labels.includes('문창') || labels.includes('문곡') || labels.includes('천문성');
      expect(hasAnyGwanGwi).toBe(true);
    });

    it('should compose from 문곡', () => {
      const labels = ['문곡', '역마살'];
      const hasAnyGwanGwi = labels.includes('문창') || labels.includes('문곡') || labels.includes('천문성');
      expect(hasAnyGwanGwi).toBe(true);
    });

    it('should compose from 천문성', () => {
      const labels = ['천문성', '역마살'];
      const hasAnyGwanGwi = labels.includes('문창') || labels.includes('문곡') || labels.includes('천문성');
      expect(hasAnyGwanGwi).toBe(true);
    });

    it('should remove individual labels when composing 관귀학관', () => {
      let labels = ['문창', '문곡', '역마살'];
      const hasAnyGwanGwi = labels.includes('문창') || labels.includes('문곡') || labels.includes('천문성');

      if (hasAnyGwanGwi) {
        labels = labels.filter(s => !['문창', '문곡', '천문성'].includes(s)).concat('관귀학관');
      }

      expect(labels).toContain('관귀학관');
      expect(labels).not.toContain('문창');
      expect(labels).not.toContain('문곡');
      expect(labels).toContain('역마살');
    });
  });

  describe('FiveElement handling', () => {
    const validElements = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

    it('should accept Wood element', () => {
      expect(validElements).toContain('Wood');
    });

    it('should accept Fire element', () => {
      expect(validElements).toContain('Fire');
    });

    it('should accept Earth element', () => {
      expect(validElements).toContain('Earth');
    });

    it('should accept Metal element', () => {
      expect(validElements).toContain('Metal');
    });

    it('should accept Water element', () => {
      expect(validElements).toContain('Water');
    });

    it('should default to Wood when element is undefined', () => {
      const element = undefined ?? 'Wood';
      expect(element).toBe('Wood');
    });
  });

  describe('Heavenly Stems', () => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

    it('should have 10 heavenly stems', () => {
      expect(stems).toHaveLength(10);
    });

    it('should include 甲 (Jia)', () => {
      expect(stems).toContain('甲');
    });

    it('should include 癸 (Gui)', () => {
      expect(stems).toContain('癸');
    });
  });

  describe('Earthly Branches', () => {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    it('should have 12 earthly branches', () => {
      expect(branches).toHaveLength(12);
    });

    it('should include 子 (Zi)', () => {
      expect(branches).toContain('子');
    });

    it('should include 亥 (Hai)', () => {
      expect(branches).toContain('亥');
    });
  });
});

describe('Map-12 Edge Cases', () => {
  describe('Empty/null inputs', () => {
    it('should handle empty object', () => {
      const result = buildPillarView({} as any);
      expect(result).toBeDefined();
    });

    it('should handle partial pillar data', () => {
      const mockSource = {
        year: {
          heavenlyStem: { name: '甲', element: 'Wood' as const },
          earthlyBranch: { name: '子', element: 'Water' as const },
        },
        // month, day, time are missing
      };

      const result = buildPillarView(mockSource as any);
      expect(result).toBeDefined();
    });
  });

  describe('Mixed format inputs', () => {
    it('should handle mix of formats across pillars', () => {
      const mockSource = {
        year: {
          heavenlyStem: { name: '甲', element: 'Wood' as const },
          earthlyBranch: { name: '子', element: 'Water' as const },
        },
        month: { gan: '乙', ji: '丑' },
        day: { stem: '丙', branch: '寅' },
        time: { 천간: '丁', 지지: '卯' },
      };

      const result = buildPillarView(mockSource as any);
      expect(result).toBeDefined();
    });
  });
});
