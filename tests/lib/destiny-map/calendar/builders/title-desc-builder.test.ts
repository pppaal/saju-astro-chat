/**
 * @file Title Description Builder Tests
 *
 * Comprehensive test coverage for title-desc-builder.ts
 * Target: 85%+ lines, 80%+ branches
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildTitleDescKeys,
  type TitleDescBuilderInput,
  type TitleDescBuilderResult,
} from '@/lib/destiny-map/calendar/builders/title-desc-builder';

// Mock constants
vi.mock('@/lib/destiny-map/calendar/constants', () => ({
  SAMHAP: {
    목: ['寅', '卯', '辰'],
    화: ['巳', '午', '未'],
    금: ['申', '酉', '戌'],
    수: ['亥', '子', '丑'],
  },
  YUKHAP: {
    子: '丑',
    丑: '子',
    寅: '亥',
    亥: '寅',
    卯: '戌',
    戌: '卯',
    辰: '酉',
    酉: '辰',
    巳: '申',
    申: '巳',
    午: '未',
    未: '午',
  },
  CHUNG: {
    子: '午',
    午: '子',
    丑: '未',
    未: '丑',
    寅: '申',
    申: '寅',
    卯: '酉',
    酉: '卯',
    辰: '戌',
    戌: '辰',
    巳: '亥',
    亥: '巳',
  },
}));

describe('Title Description Builder Module', () => {
  let baseInput: TitleDescBuilderInput;

  beforeEach(() => {
    baseInput = {
      ganzhi: { stem: '甲', branch: '巳', stemElement: '목' }, // Changed to avoid samhap
      dayMasterElement: '목',
      dayBranch: '辰', // Changed to avoid yukhap/chung
      relations: {
        generates: '화',
        generatedBy: '수',
        controls: '토',
        controlledBy: '금',
      },
      specialFlags: {
        hasCheoneulGwiin: false,
      },
    };
  });

  describe('buildTitleDescKeys - Basic Functionality', () => {
    it('should return titleKey and descKey properties', () => {
      const result = buildTitleDescKeys(baseInput);

      expect(result).toHaveProperty('titleKey');
      expect(result).toHaveProperty('descKey');
      expect(typeof result.titleKey).toBe('string');
      expect(typeof result.descKey).toBe('string');
    });

    it('should return bijeon keys when same element as dayMaster', () => {
      const result = buildTitleDescKeys(baseInput);

      expect(result.titleKey).toBe('calendar.bijeon');
      expect(result.descKey).toBe('calendar.bijeonDesc');
    });
  });

  describe('Priority 1 - 천을귀인 (Highest Priority)', () => {
    it('should return cheoneulGwiin keys when flag is true', () => {
      const input = {
        ...baseInput,
        specialFlags: { hasCheoneulGwiin: true },
      };
      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.cheoneulGwiin');
      expect(result.descKey).toBe('calendar.cheoneulGwiinDesc');
    });

    it('should prioritize cheoneulGwiin over samhap', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '寅', stemElement: '목' },
        dayMasterElement: '목',
        dayBranch: '卯', // 寅-卯-辰 samhap
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: true },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.cheoneulGwiin');
      expect(result.descKey).not.toBe('calendar.samhapDesc');
    });

    it('should prioritize cheoneulGwiin over all other conditions', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '丑', stemElement: '목' }, // 子-丑 yukhap
        dayMasterElement: '목',
        dayBranch: '子',
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: true },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.cheoneulGwiin');
    });
  });

  describe('Priority 2 - 삼합 (Samhap)', () => {
    it('should return samhap keys for 목 samhap (寅-卯-辰)', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '寅', stemElement: '화' },
        dayMasterElement: '목',
        dayBranch: '卯', // 寅-卯-辰
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.samhap');
      expect(result.descKey).toBe('calendar.samhapDesc');
    });

    it('should return samhap keys for 화 samhap (巳-午-未)', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '丙', branch: '巳', stemElement: '금' },
        dayMasterElement: '화',
        dayBranch: '午',
        relations: {
          generates: '토',
          generatedBy: '목',
          controls: '금',
          controlledBy: '수',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.samhap');
      expect(result.descKey).toBe('calendar.samhapDesc');
    });

    it('should return samhap keys for 금 samhap (申-酉-戌)', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '庚', branch: '申', stemElement: '토' },
        dayMasterElement: '금',
        dayBranch: '酉',
        relations: {
          generates: '수',
          generatedBy: '토',
          controls: '목',
          controlledBy: '화',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.samhap');
      expect(result.descKey).toBe('calendar.samhapDesc');
    });

    it('should return samhap keys for 수 samhap (亥-子-丑)', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '壬', branch: '亥', stemElement: '목' },
        dayMasterElement: '수',
        dayBranch: '子',
        relations: {
          generates: '목',
          generatedBy: '금',
          controls: '화',
          controlledBy: '토',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.samhap');
      expect(result.descKey).toBe('calendar.samhapDesc');
    });

    it('should match samhap when element equals dayMasterElement', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '寅', stemElement: '금' },
        dayMasterElement: '목', // Matches SAMHAP element
        dayBranch: '卯',
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.samhap');
    });

    it('should match samhap when element equals generatedBy', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '寅', stemElement: '토' },
        dayMasterElement: '화',
        dayBranch: '卯',
        relations: {
          generates: '토',
          generatedBy: '목', // Matches SAMHAP element
          controls: '금',
          controlledBy: '수',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.samhap');
    });

    it('should not match samhap if element does not match conditions', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '寅', stemElement: '화' },
        dayMasterElement: '금', // Does not match
        dayBranch: '卯',
        relations: {
          generates: '수',
          generatedBy: '토', // Does not match
          controls: '목',
          controlledBy: '화',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).not.toBe('calendar.samhap');
    });

    it('should not match samhap if branches do not match', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '巳', stemElement: '화' }, // Not in 목 samhap
        dayMasterElement: '목',
        dayBranch: '卯',
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).not.toBe('calendar.samhap');
    });

    it('should handle empty dayBranch for samhap check', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '寅', stemElement: '목' },
        dayMasterElement: '목',
        dayBranch: '', // Empty
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).not.toBe('calendar.samhap');
    });
  });

  describe('Priority 3 - 육합 (Yukhap)', () => {
    it('should return yukhap keys for 子-丑 pair', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '丑', stemElement: '화' },
        dayMasterElement: '금',
        dayBranch: '子',
        relations: {
          generates: '수',
          generatedBy: '토',
          controls: '목',
          controlledBy: '화',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.yukhap');
      expect(result.descKey).toBe('calendar.yukhapDesc');
    });

    it('should return yukhap keys for all 6 yukhap pairs', () => {
      const yukhapPairs: [string, string][] = [
        ['子', '丑'],
        ['寅', '亥'],
        ['卯', '戌'],
        ['辰', '酉'],
        ['巳', '申'],
        ['午', '未'],
      ];

      yukhapPairs.forEach(([day, ganzhi]) => {
        const input: TitleDescBuilderInput = {
          ganzhi: { stem: '甲', branch: ganzhi, stemElement: '화' },
          dayMasterElement: '금',
          dayBranch: day,
          relations: {
            generates: '수',
            generatedBy: '토',
            controls: '목',
            controlledBy: '화',
          },
          specialFlags: { hasCheoneulGwiin: false },
        };

        const result = buildTitleDescKeys(input);

        expect(result.titleKey).toBe('calendar.yukhap');
      });
    });

    it('should not match yukhap if branches do not match', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '午', stemElement: '화' }, // Not yukhap with 子
        dayMasterElement: '금',
        dayBranch: '子',
        relations: {
          generates: '수',
          generatedBy: '토',
          controls: '목',
          controlledBy: '화',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).not.toBe('calendar.yukhap');
    });

    it('should handle empty dayBranch for yukhap check', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '丑', stemElement: '목' },
        dayMasterElement: '목',
        dayBranch: '', // Empty
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).not.toBe('calendar.yukhap');
    });
  });

  describe('Priority 4 - 충 (Chung)', () => {
    it('should return chung keys for 子-午 pair', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '午', stemElement: '토' },
        dayMasterElement: '금',
        dayBranch: '子',
        relations: {
          generates: '수',
          generatedBy: '토',
          controls: '목',
          controlledBy: '화',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.chung');
      expect(result.descKey).toBe('calendar.chungDesc');
    });

    it('should return chung keys for all 6 chung pairs', () => {
      const chungPairs: [string, string][] = [
        ['子', '午'],
        ['丑', '未'],
        ['寅', '申'],
        ['卯', '酉'],
        ['辰', '戌'],
        ['巳', '亥'],
      ];

      chungPairs.forEach(([day, ganzhi]) => {
        const input: TitleDescBuilderInput = {
          ganzhi: { stem: '甲', branch: ganzhi, stemElement: '토' },
          dayMasterElement: '금',
          dayBranch: day,
          relations: {
            generates: '수',
            generatedBy: '토',
            controls: '목',
            controlledBy: '화',
          },
          specialFlags: { hasCheoneulGwiin: false },
        };

        const result = buildTitleDescKeys(input);

        expect(result.titleKey).toBe('calendar.chung');
      });
    });

    it('should handle empty dayBranch for chung check', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '午', stemElement: '목' },
        dayMasterElement: '목',
        dayBranch: '', // Empty
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).not.toBe('calendar.chung');
    });
  });

  describe('Priority 5 - Stem Element Relations', () => {
    it('should return bijeon keys when stemElement equals dayMasterElement', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '巳', stemElement: '목' },
        dayMasterElement: '목', // Same
        dayBranch: '辰',
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.bijeon');
      expect(result.descKey).toBe('calendar.bijeonDesc');
    });

    it('should return inseong keys when stemElement equals generatedBy', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '巳', stemElement: '수' },
        dayMasterElement: '목',
        dayBranch: '辰',
        relations: {
          generates: '화',
          generatedBy: '수', // Matches
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.inseong');
      expect(result.descKey).toBe('calendar.inseongDesc');
    });

    it('should return jaeseong keys when stemElement equals controls', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '巳', stemElement: '토' },
        dayMasterElement: '목',
        dayBranch: '辰',
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토', // Matches
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.jaeseong');
      expect(result.descKey).toBe('calendar.jaeseongDesc');
    });

    it('should return siksang keys when stemElement equals generates', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '巳', stemElement: '화' },
        dayMasterElement: '목',
        dayBranch: '辰',
        relations: {
          generates: '화', // Matches
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.siksang');
      expect(result.descKey).toBe('calendar.siksangDesc');
    });

    it('should return gwansal keys when stemElement equals controlledBy', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '巳', stemElement: '금' },
        dayMasterElement: '목',
        dayBranch: '辰',
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금', // Matches
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.gwansal');
      expect(result.descKey).toBe('calendar.gwansalDesc');
    });

    it('should return empty keys when no stem relation matches', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '巳', stemElement: '수' }, // No match with any relation
        dayMasterElement: '화', // No match
        dayBranch: '辰',
        relations: {
          generates: '금', // Changed
          generatedBy: '목', // No match
          controls: '목', // Changed
          controlledBy: '토', // Changed
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('');
      expect(result.descKey).toBe('');
    });
  });

  describe('Priority Chain Fallback', () => {
    it('should prioritize samhap over yukhap', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '寅', stemElement: '금' },
        dayMasterElement: '목', // Triggers samhap
        dayBranch: '卯', // 寅-卯 samhap
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.samhap');
      expect(result.titleKey).not.toBe('calendar.yukhap');
    });

    it('should prioritize yukhap over chung', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '丑', stemElement: '금' },
        dayMasterElement: '화',
        dayBranch: '子', // 子-丑 yukhap (not chung)
        relations: {
          generates: '토',
          generatedBy: '목',
          controls: '금',
          controlledBy: '수',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.yukhap');
      expect(result.titleKey).not.toBe('calendar.chung');
    });

    it('should prioritize chung over stem relations', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '午', stemElement: '목' }, // Matches bijeon
        dayMasterElement: '목',
        dayBranch: '子', // 子-午 chung
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.chung');
      expect(result.titleKey).not.toBe('calendar.bijeon');
    });

    it('should fall back to stem relations when no branch relations match', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '巳', stemElement: '목' },
        dayMasterElement: '목', // Will trigger bijeon
        dayBranch: '辰', // No yukhap/chung/samhap with 巳
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.bijeon');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal input with empty strings', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '', branch: '', stemElement: '' },
        dayMasterElement: '',
        dayBranch: '',
        relations: {
          generates: '',
          generatedBy: '',
          controls: '',
          controlledBy: '',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      // Empty strings match '' === '' so bijeon is returned
      expect(result.titleKey).toBe('calendar.bijeon');
      expect(result.descKey).toBe('calendar.bijeonDesc');
    });

    it('should not mutate input object', () => {
      const originalInput = JSON.parse(JSON.stringify(baseInput));

      buildTitleDescKeys(baseInput);

      expect(baseInput).toEqual(originalInput);
    });

    it('should return new objects each time (not references)', () => {
      const result1 = buildTitleDescKeys(baseInput);
      const result2 = buildTitleDescKeys(baseInput);

      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2); // Same values but different objects
    });

    it('should handle cheoneulGwiin with all other conditions true', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '丑', stemElement: '목' }, // Yukhap + Bijeon
        dayMasterElement: '목',
        dayBranch: '子',
        relations: {
          generates: '화',
          generatedBy: '수',
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: true },
      };

      const result = buildTitleDescKeys(input);

      // Should override everything
      expect(result.titleKey).toBe('calendar.cheoneulGwiin');
    });
  });

  describe('Stem Element Relation Priority', () => {
    it('should prioritize bijeon over inseong', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '巳', stemElement: '목' },
        dayMasterElement: '목', // Matches (bijeon)
        dayBranch: '辰',
        relations: {
          generates: '화',
          generatedBy: '목', // Also matches (inseong)
          controls: '토',
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.bijeon');
      expect(result.titleKey).not.toBe('calendar.inseong');
    });

    it('should prioritize inseong over jaeseong', () => {
      const input: TitleDescBuilderInput = {
        ganzhi: { stem: '甲', branch: '巳', stemElement: '수' },
        dayMasterElement: '목',
        dayBranch: '辰',
        relations: {
          generates: '화',
          generatedBy: '수', // Matches (inseong)
          controls: '수', // Also matches (jaeseong)
          controlledBy: '금',
        },
        specialFlags: { hasCheoneulGwiin: false },
      };

      const result = buildTitleDescKeys(input);

      expect(result.titleKey).toBe('calendar.inseong');
      expect(result.titleKey).not.toBe('calendar.jaeseong');
    });
  });
});
