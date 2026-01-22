/**
 * Mega comprehensive tests for stemBranchUtils.ts
 * Testing all stem-branch utility functions with all combinations
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeStem,
  normalizeBranch,
  getStemInfo,
  getBranchInfo,
  getStemElement,
  getBranchElement,
  getStemYinYang,
  getBranchYinYang,
  isValidStem,
  isValidBranch,
  getStemIndex,
  getBranchIndex,
  getStemByIndex,
  getBranchByIndex,
} from '@/lib/Saju/stemBranchUtils';

describe('stemBranchUtils - comprehensive tests', () => {
  const koreanStems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  const chineseStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const koreanBranches = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  const chineseBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const allElements = ['목', '화', '토', '금', '수'];
  const yinYangValues = ['음', '양'];

  describe('normalizeStem - Korean to Chinese', () => {
    koreanStems.forEach((korean, idx) => {
      it(`should normalize ${korean} to ${chineseStems[idx]}`, () => {
        expect(normalizeStem(korean)).toBe(chineseStems[idx]);
      });
    });
  });

  describe('normalizeStem - Chinese unchanged', () => {
    chineseStems.forEach(chinese => {
      it(`should keep ${chinese} unchanged`, () => {
        expect(normalizeStem(chinese)).toBe(chinese);
      });
    });
  });

  describe('normalizeStem - edge cases', () => {
    it('should handle empty string', () => {
      expect(normalizeStem('')).toBe('');
    });

    it('should handle whitespace', () => {
      expect(normalizeStem('  갑  ')).toBe('甲');
    });

    it('should handle invalid stem', () => {
      expect(normalizeStem('invalid')).toBe('invalid');
    });

    it('should handle null', () => {
      expect(normalizeStem(null as any)).toBe('');
    });

    it('should handle undefined', () => {
      expect(normalizeStem(undefined as any)).toBe('');
    });
  });

  describe('normalizeBranch - Korean to Chinese', () => {
    koreanBranches.forEach((korean, idx) => {
      it(`should normalize ${korean} to ${chineseBranches[idx]}`, () => {
        expect(normalizeBranch(korean)).toBe(chineseBranches[idx]);
      });
    });
  });

  describe('normalizeBranch - Chinese unchanged', () => {
    chineseBranches.forEach(chinese => {
      it(`should keep ${chinese} unchanged`, () => {
        expect(normalizeBranch(chinese)).toBe(chinese);
      });
    });
  });

  describe('normalizeBranch - edge cases', () => {
    it('should handle empty string', () => {
      expect(normalizeBranch('')).toBe('');
    });

    it('should handle whitespace', () => {
      expect(normalizeBranch('  자  ')).toBe('子');
    });

    it('should handle invalid branch', () => {
      expect(normalizeBranch('invalid')).toBe('invalid');
    });

    it('should handle null', () => {
      expect(normalizeBranch(null as any)).toBe('');
    });

    it('should handle undefined', () => {
      expect(normalizeBranch(undefined as any)).toBe('');
    });
  });

  describe('getStemInfo - Korean stems', () => {
    koreanStems.forEach(stem => {
      it(`should return info for Korean stem ${stem}`, () => {
        const info = getStemInfo(stem);
        expect(info).toBeDefined();
        expect(info?.name).toBeDefined();
      });
    });
  });

  describe('getStemInfo - Chinese stems', () => {
    chineseStems.forEach(stem => {
      it(`should return info for Chinese stem ${stem}`, () => {
        const info = getStemInfo(stem);
        expect(info).toBeDefined();
        expect(info?.name).toBe(stem);
      });
    });
  });

  describe('getStemInfo - invalid stems', () => {
    it('should return undefined for invalid stem', () => {
      expect(getStemInfo('invalid')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getStemInfo('')).toBeUndefined();
    });
  });

  describe('getBranchInfo - Korean branches', () => {
    koreanBranches.forEach(branch => {
      it(`should return info for Korean branch ${branch}`, () => {
        const info = getBranchInfo(branch);
        expect(info).toBeDefined();
        expect(info?.name).toBeDefined();
      });
    });
  });

  describe('getBranchInfo - Chinese branches', () => {
    chineseBranches.forEach(branch => {
      it(`should return info for Chinese branch ${branch}`, () => {
        const info = getBranchInfo(branch);
        expect(info).toBeDefined();
        expect(info?.name).toBe(branch);
      });
    });
  });

  describe('getBranchInfo - invalid branches', () => {
    it('should return undefined for invalid branch', () => {
      expect(getBranchInfo('invalid')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(getBranchInfo('')).toBeUndefined();
    });
  });

  describe('getStemElement - all stems', () => {
    [...koreanStems, ...chineseStems].forEach(stem => {
      it(`should return element for ${stem}`, () => {
        const element = getStemElement(stem);
        expect(allElements).toContain(element);
      });
    });
  });

  describe('getStemElement - invalid stems', () => {
    it('should return default 토 for invalid stem', () => {
      expect(getStemElement('invalid')).toBe('토');
    });

    it('should return default 토 for empty string', () => {
      expect(getStemElement('')).toBe('토');
    });
  });

  describe('getBranchElement - all branches', () => {
    [...koreanBranches, ...chineseBranches].forEach(branch => {
      it(`should return element for ${branch}`, () => {
        const element = getBranchElement(branch);
        expect(allElements).toContain(element);
      });
    });
  });

  describe('getBranchElement - invalid branches', () => {
    it('should return default 토 for invalid branch', () => {
      expect(getBranchElement('invalid')).toBe('토');
    });

    it('should return default 토 for empty string', () => {
      expect(getBranchElement('')).toBe('토');
    });
  });

  describe('getStemYinYang - all stems', () => {
    [...koreanStems, ...chineseStems].forEach(stem => {
      it(`should return yin/yang for ${stem}`, () => {
        const yinyang = getStemYinYang(stem);
        expect(yinYangValues).toContain(yinyang);
      });
    });
  });

  describe('getStemYinYang - invalid stems', () => {
    it('should return default 양 for invalid stem', () => {
      expect(getStemYinYang('invalid')).toBe('양');
    });

    it('should return default 양 for empty string', () => {
      expect(getStemYinYang('')).toBe('양');
    });
  });

  describe('getBranchYinYang - all branches', () => {
    [...koreanBranches, ...chineseBranches].forEach(branch => {
      it(`should return yin/yang for ${branch}`, () => {
        const yinyang = getBranchYinYang(branch);
        expect(yinYangValues).toContain(yinyang);
      });
    });
  });

  describe('getBranchYinYang - invalid branches', () => {
    it('should return default 양 for invalid branch', () => {
      expect(getBranchYinYang('invalid')).toBe('양');
    });

    it('should return default 양 for empty string', () => {
      expect(getBranchYinYang('')).toBe('양');
    });
  });

  describe('isValidStem - Korean stems', () => {
    koreanStems.forEach(stem => {
      it(`should return true for Korean stem ${stem}`, () => {
        expect(isValidStem(stem)).toBe(true);
      });
    });
  });

  describe('isValidStem - Chinese stems', () => {
    chineseStems.forEach(stem => {
      it(`should return true for Chinese stem ${stem}`, () => {
        expect(isValidStem(stem)).toBe(true);
      });
    });
  });

  describe('isValidStem - invalid stems', () => {
    const invalidStems = ['invalid', '', '한', '글', 'ABC', '123'];
    invalidStems.forEach(stem => {
      it(`should return false for invalid stem ${JSON.stringify(stem)}`, () => {
        expect(isValidStem(stem)).toBe(false);
      });
    });
  });

  describe('isValidBranch - Korean branches', () => {
    koreanBranches.forEach(branch => {
      it(`should return true for Korean branch ${branch}`, () => {
        expect(isValidBranch(branch)).toBe(true);
      });
    });
  });

  describe('isValidBranch - Chinese branches', () => {
    chineseBranches.forEach(branch => {
      it(`should return true for Chinese branch ${branch}`, () => {
        expect(isValidBranch(branch)).toBe(true);
      });
    });
  });

  describe('isValidBranch - invalid branches', () => {
    const invalidBranches = ['invalid', '', '한', '글', 'ABC', '123'];
    invalidBranches.forEach(branch => {
      it(`should return false for invalid branch ${JSON.stringify(branch)}`, () => {
        expect(isValidBranch(branch)).toBe(false);
      });
    });
  });

  describe('getStemIndex - Korean stems', () => {
    koreanStems.forEach((stem, expectedIdx) => {
      it(`should return index ${expectedIdx} for ${stem}`, () => {
        expect(getStemIndex(stem)).toBe(expectedIdx);
      });
    });
  });

  describe('getStemIndex - Chinese stems', () => {
    chineseStems.forEach((stem, expectedIdx) => {
      it(`should return index ${expectedIdx} for ${stem}`, () => {
        expect(getStemIndex(stem)).toBe(expectedIdx);
      });
    });
  });

  describe('getStemIndex - invalid stems', () => {
    it('should return -1 for invalid stem', () => {
      expect(getStemIndex('invalid')).toBe(-1);
    });

    it('should return -1 for empty string', () => {
      expect(getStemIndex('')).toBe(-1);
    });
  });

  describe('getBranchIndex - Korean branches', () => {
    koreanBranches.forEach((branch, expectedIdx) => {
      it(`should return index ${expectedIdx} for ${branch}`, () => {
        expect(getBranchIndex(branch)).toBe(expectedIdx);
      });
    });
  });

  describe('getBranchIndex - Chinese branches', () => {
    chineseBranches.forEach((branch, expectedIdx) => {
      it(`should return index ${expectedIdx} for ${branch}`, () => {
        expect(getBranchIndex(branch)).toBe(expectedIdx);
      });
    });
  });

  describe('getBranchIndex - invalid branches', () => {
    it('should return -1 for invalid branch', () => {
      expect(getBranchIndex('invalid')).toBe(-1);
    });

    it('should return -1 for empty string', () => {
      expect(getBranchIndex('')).toBe(-1);
    });
  });

  describe('getStemByIndex - 0-9 range', () => {
    for (let i = 0; i < 10; i++) {
      it(`should return stem for index ${i}`, () => {
        const stem = getStemByIndex(i);
        expect(stem).toBeDefined();
        expect(stem.name).toBe(chineseStems[i]);
      });
    }
  });

  describe('getStemByIndex - cycling', () => {
    it('should cycle for index 10', () => {
      expect(getStemByIndex(10).name).toBe(getStemByIndex(0).name);
    });

    it('should cycle for index 20', () => {
      expect(getStemByIndex(20).name).toBe(getStemByIndex(0).name);
    });

    it('should cycle for index 15', () => {
      expect(getStemByIndex(15).name).toBe(getStemByIndex(5).name);
    });

    it('should handle negative index -1', () => {
      expect(getStemByIndex(-1).name).toBe(getStemByIndex(9).name);
    });

    it('should handle negative index -10', () => {
      expect(getStemByIndex(-10).name).toBe(getStemByIndex(0).name);
    });

    it('should handle negative index -5', () => {
      expect(getStemByIndex(-5).name).toBe(getStemByIndex(5).name);
    });
  });

  describe('getBranchByIndex - 0-11 range', () => {
    for (let i = 0; i < 12; i++) {
      it(`should return branch for index ${i}`, () => {
        const branch = getBranchByIndex(i);
        expect(branch).toBeDefined();
        expect(branch.name).toBe(chineseBranches[i]);
      });
    }
  });

  describe('getBranchByIndex - cycling', () => {
    it('should cycle for index 12', () => {
      expect(getBranchByIndex(12).name).toBe(getBranchByIndex(0).name);
    });

    it('should cycle for index 24', () => {
      expect(getBranchByIndex(24).name).toBe(getBranchByIndex(0).name);
    });

    it('should cycle for index 18', () => {
      expect(getBranchByIndex(18).name).toBe(getBranchByIndex(6).name);
    });

    it('should handle negative index -1', () => {
      expect(getBranchByIndex(-1).name).toBe(getBranchByIndex(11).name);
    });

    it('should handle negative index -12', () => {
      expect(getBranchByIndex(-12).name).toBe(getBranchByIndex(0).name);
    });

    it('should handle negative index -6', () => {
      expect(getBranchByIndex(-6).name).toBe(getBranchByIndex(6).name);
    });
  });

  describe('Element consistency', () => {
    koreanStems.forEach((korean, idx) => {
      const chinese = chineseStems[idx];
      it(`should have same element for ${korean} and ${chinese}`, () => {
        expect(getStemElement(korean)).toBe(getStemElement(chinese));
      });
    });

    koreanBranches.forEach((korean, idx) => {
      const chinese = chineseBranches[idx];
      it(`should have same element for ${korean} and ${chinese}`, () => {
        expect(getBranchElement(korean)).toBe(getBranchElement(chinese));
      });
    });
  });

  describe('YinYang consistency', () => {
    koreanStems.forEach((korean, idx) => {
      const chinese = chineseStems[idx];
      it(`should have same yin/yang for ${korean} and ${chinese}`, () => {
        expect(getStemYinYang(korean)).toBe(getStemYinYang(chinese));
      });
    });

    koreanBranches.forEach((korean, idx) => {
      const chinese = chineseBranches[idx];
      it(`should have same yin/yang for ${korean} and ${chinese}`, () => {
        expect(getBranchYinYang(korean)).toBe(getBranchYinYang(chinese));
      });
    });
  });

  describe('Index round-trip', () => {
    chineseStems.forEach((stem, idx) => {
      it(`should round-trip stem ${stem}`, () => {
        const stemInfo = getStemByIndex(idx);
        const retrievedIdx = getStemIndex(stemInfo.name);
        expect(retrievedIdx).toBe(idx);
      });
    });

    chineseBranches.forEach((branch, idx) => {
      it(`should round-trip branch ${branch}`, () => {
        const branchInfo = getBranchByIndex(idx);
        const retrievedIdx = getBranchIndex(branchInfo.name);
        expect(retrievedIdx).toBe(idx);
      });
    });
  });

  describe('Whitespace handling', () => {
    it('should trim leading whitespace in stems', () => {
      expect(normalizeStem('  갑')).toBe('甲');
    });

    it('should trim trailing whitespace in stems', () => {
      expect(normalizeStem('갑  ')).toBe('甲');
    });

    it('should trim both sides whitespace in stems', () => {
      expect(normalizeStem('  갑  ')).toBe('甲');
    });

    it('should trim leading whitespace in branches', () => {
      expect(normalizeBranch('  자')).toBe('子');
    });

    it('should trim trailing whitespace in branches', () => {
      expect(normalizeBranch('자  ')).toBe('子');
    });

    it('should trim both sides whitespace in branches', () => {
      expect(normalizeBranch('  자  ')).toBe('子');
    });
  });

  describe('Large index cycling', () => {
    it('should handle large positive stem index', () => {
      const result = getStemByIndex(1000);
      expect(result).toBeDefined();
      expect(chineseStems).toContain(result.name);
    });

    it('should handle large negative stem index', () => {
      const result = getStemByIndex(-1000);
      expect(result).toBeDefined();
      expect(chineseStems).toContain(result.name);
    });

    it('should handle large positive branch index', () => {
      const result = getBranchByIndex(1000);
      expect(result).toBeDefined();
      expect(chineseBranches).toContain(result.name);
    });

    it('should handle large negative branch index', () => {
      const result = getBranchByIndex(-1000);
      expect(result).toBeDefined();
      expect(chineseBranches).toContain(result.name);
    });
  });

  describe('Info object structure', () => {
    chineseStems.forEach(stem => {
      it(`should have complete info for stem ${stem}`, () => {
        const info = getStemInfo(stem);
        expect(info).toBeDefined();
        expect(info?.name).toBeDefined();
        expect(info?.element).toBeDefined();
        expect(info?.yin_yang).toBeDefined();
      });
    });

    chineseBranches.forEach(branch => {
      it(`should have complete info for branch ${branch}`, () => {
        const info = getBranchInfo(branch);
        expect(info).toBeDefined();
        expect(info?.name).toBeDefined();
        expect(info?.element).toBeDefined();
        expect(info?.yin_yang).toBeDefined();
      });
    });
  });
});
