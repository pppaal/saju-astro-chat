/**
 * Comprehensive tests for Saju/element-utils.ts
 * Testing all combinations and edge cases
 */
import { describe, it, expect } from 'vitest';
import {
  type ElementEN,
  ELEMENT_COLORS,
  getElementOfChar,
  getGanjiName,
} from '@/lib/Saju/element-utils';

describe('Saju/element-utils comprehensive tests', () => {
  describe('ElementEN type', () => {
    const validElements: ElementEN[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

    validElements.forEach(element => {
      it(`should accept ${element} as valid ElementEN`, () => {
        const el: ElementEN = element;
        expect(el).toBe(element);
      });
    });
  });

  describe('ELEMENT_COLORS', () => {
    it('should have exactly 5 colors', () => {
      expect(Object.keys(ELEMENT_COLORS)).toHaveLength(5);
    });

    it('should map Wood to green', () => {
      expect(ELEMENT_COLORS.Wood).toBe('#2dbd7f');
    });

    it('should map Fire to red', () => {
      expect(ELEMENT_COLORS.Fire).toBe('#ff6b6b');
    });

    it('should map Earth to orange', () => {
      expect(ELEMENT_COLORS.Earth).toBe('#f3a73f');
    });

    it('should map Metal to blue', () => {
      expect(ELEMENT_COLORS.Metal).toBe('#4a90e2');
    });

    it('should map Water to purple-blue', () => {
      expect(ELEMENT_COLORS.Water).toBe('#5b6bfa');
    });

    it('should have hex color format for Wood', () => {
      expect(ELEMENT_COLORS.Wood).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should have hex color format for Fire', () => {
      expect(ELEMENT_COLORS.Fire).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should have hex color format for Earth', () => {
      expect(ELEMENT_COLORS.Earth).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should have hex color format for Metal', () => {
      expect(ELEMENT_COLORS.Metal).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should have hex color format for Water', () => {
      expect(ELEMENT_COLORS.Water).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should have all unique colors', () => {
      const colors = Object.values(ELEMENT_COLORS);
      const unique = new Set(colors);
      expect(unique.size).toBe(colors.length);
    });

    it('should have lowercase hex codes', () => {
      Object.values(ELEMENT_COLORS).forEach(color => {
        expect(color).toBe(color.toLowerCase());
      });
    });
  });

  describe('getElementOfChar - Korean stems', () => {
    it('should map 갑 to Wood', () => {
      expect(getElementOfChar('갑')).toBe('Wood');
    });

    it('should map 을 to Wood', () => {
      expect(getElementOfChar('을')).toBe('Wood');
    });

    it('should map 병 to Fire', () => {
      expect(getElementOfChar('병')).toBe('Fire');
    });

    it('should map 정 to Fire', () => {
      expect(getElementOfChar('정')).toBe('Fire');
    });

    it('should map 무 to Earth', () => {
      expect(getElementOfChar('무')).toBe('Earth');
    });

    it('should map 기 to Earth', () => {
      expect(getElementOfChar('기')).toBe('Earth');
    });

    it('should map 경 to Metal', () => {
      expect(getElementOfChar('경')).toBe('Metal');
    });

    it('should map 신 to Metal', () => {
      expect(getElementOfChar('신')).toBe('Metal');
    });

    it('should map 임 to Water', () => {
      expect(getElementOfChar('임')).toBe('Water');
    });

    it('should map 계 to Water', () => {
      expect(getElementOfChar('계')).toBe('Water');
    });
  });

  describe('getElementOfChar - Chinese stems', () => {
    it('should map 甲 to Wood', () => {
      expect(getElementOfChar('甲')).toBe('Wood');
    });

    it('should map 乙 to Wood', () => {
      expect(getElementOfChar('乙')).toBe('Wood');
    });

    it('should map 丙 to Fire', () => {
      expect(getElementOfChar('丙')).toBe('Fire');
    });

    it('should map 丁 to Fire', () => {
      expect(getElementOfChar('丁')).toBe('Fire');
    });

    it('should map 戊 to Earth', () => {
      expect(getElementOfChar('戊')).toBe('Earth');
    });

    it('should map 己 to Earth', () => {
      expect(getElementOfChar('己')).toBe('Earth');
    });

    it('should map 庚 to Metal', () => {
      expect(getElementOfChar('庚')).toBe('Metal');
    });

    it('should map 辛 to Metal', () => {
      expect(getElementOfChar('辛')).toBe('Metal');
    });

    it('should map 壬 to Water', () => {
      expect(getElementOfChar('壬')).toBe('Water');
    });

    it('should map 癸 to Water', () => {
      expect(getElementOfChar('癸')).toBe('Water');
    });
  });

  describe('getElementOfChar - Korean branches', () => {
    it('should map 자 to Water', () => {
      expect(getElementOfChar('자')).toBe('Water');
    });

    it('should map 축 to Earth', () => {
      expect(getElementOfChar('축')).toBe('Earth');
    });

    it('should map 인 to Wood', () => {
      expect(getElementOfChar('인')).toBe('Wood');
    });

    it('should map 묘 to Wood', () => {
      expect(getElementOfChar('묘')).toBe('Wood');
    });

    it('should map 진 to Earth', () => {
      expect(getElementOfChar('진')).toBe('Earth');
    });

    it('should map 사 to Fire', () => {
      expect(getElementOfChar('사')).toBe('Fire');
    });

    it('should map 오 to Fire', () => {
      expect(getElementOfChar('오')).toBe('Fire');
    });

    it('should map 미 to Earth', () => {
      expect(getElementOfChar('미')).toBe('Earth');
    });

    it('should map 신 to Metal', () => {
      expect(getElementOfChar('신')).toBe('Metal');
    });

    it('should map 유 to Metal', () => {
      expect(getElementOfChar('유')).toBe('Metal');
    });

    it('should map 술 to Earth', () => {
      expect(getElementOfChar('술')).toBe('Earth');
    });

    it('should map 해 to Water', () => {
      expect(getElementOfChar('해')).toBe('Water');
    });
  });

  describe('getElementOfChar - Chinese branches', () => {
    it('should map 子 to Water', () => {
      expect(getElementOfChar('子')).toBe('Water');
    });

    it('should map 丑 to Earth', () => {
      expect(getElementOfChar('丑')).toBe('Earth');
    });

    it('should map 寅 to Wood', () => {
      expect(getElementOfChar('寅')).toBe('Wood');
    });

    it('should map 卯 to Wood', () => {
      expect(getElementOfChar('卯')).toBe('Wood');
    });

    it('should map 辰 to Earth', () => {
      expect(getElementOfChar('辰')).toBe('Earth');
    });

    it('should map 巳 to Fire', () => {
      expect(getElementOfChar('巳')).toBe('Fire');
    });

    it('should map 午 to Fire', () => {
      expect(getElementOfChar('午')).toBe('Fire');
    });

    it('should map 未 to Earth', () => {
      expect(getElementOfChar('未')).toBe('Earth');
    });

    it('should map 申 to Metal', () => {
      expect(getElementOfChar('申')).toBe('Metal');
    });

    it('should map 酉 to Metal', () => {
      expect(getElementOfChar('酉')).toBe('Metal');
    });

    it('should map 戌 to Earth', () => {
      expect(getElementOfChar('戌')).toBe('Earth');
    });

    it('should map 亥 to Water', () => {
      expect(getElementOfChar('亥')).toBe('Water');
    });
  });

  describe('getElementOfChar - invalid inputs', () => {
    it('should return null for empty string', () => {
      expect(getElementOfChar('')).toBe(null);
    });

    it('should return null for invalid character', () => {
      expect(getElementOfChar('X')).toBe(null);
    });

    it('should return null for number', () => {
      expect(getElementOfChar('1')).toBe(null);
    });

    it('should return null for English letter', () => {
      expect(getElementOfChar('A')).toBe(null);
    });

    it('should return null for special character', () => {
      expect(getElementOfChar('!')).toBe(null);
    });

    it('should return null for space', () => {
      expect(getElementOfChar(' ')).toBe(null);
    });

    it('should return null for Korean syllable not in map', () => {
      expect(getElementOfChar('한')).toBe(null);
    });

    it('should return null for Chinese character not in map', () => {
      expect(getElementOfChar('一')).toBe(null);
    });

    it('should return null for Japanese character', () => {
      expect(getElementOfChar('あ')).toBe(null);
    });

    it('should return null for emoji', () => {
      expect(getElementOfChar('🔥')).toBe(null);
    });
  });

  describe('getGanjiName - string inputs', () => {
    it('should return string as-is', () => {
      expect(getGanjiName('갑')).toBe('갑');
    });

    it('should return Chinese character as-is', () => {
      expect(getGanjiName('甲')).toBe('甲');
    });

    it('should return empty string for empty input', () => {
      expect(getGanjiName('')).toBe('');
    });

    it('should return multi-character string as-is', () => {
      expect(getGanjiName('갑자')).toBe('갑자');
    });

    it('should return numeric string as-is', () => {
      expect(getGanjiName('123')).toBe('123');
    });

    it('should return space-containing string as-is', () => {
      expect(getGanjiName('갑 자')).toBe('갑 자');
    });

    it('should return special characters as-is', () => {
      expect(getGanjiName('!@#')).toBe('!@#');
    });
  });

  describe('getGanjiName - object inputs with name', () => {
    it('should extract name from object', () => {
      expect(getGanjiName({ name: '갑' })).toBe('갑');
    });

    it('should extract Chinese name from object', () => {
      expect(getGanjiName({ name: '甲' })).toBe('甲');
    });

    it('should extract empty name from object', () => {
      expect(getGanjiName({ name: '' })).toBe('');
    });

    it('should handle object with extra properties', () => {
      expect(getGanjiName({ name: '갑', extra: 'value' })).toBe('갑');
    });

    it('should return empty for object without name', () => {
      expect(getGanjiName({ other: 'value' })).toBe('');
    });

    it('should return empty for empty object', () => {
      expect(getGanjiName({})).toBe('');
    });
  });

  describe('getGanjiName - null/undefined inputs', () => {
    it('should return empty string for null', () => {
      expect(getGanjiName(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(getGanjiName(undefined)).toBe('');
    });
  });

  describe('getGanjiName - edge cases', () => {
    it('should handle number input (returns empty)', () => {
      expect(getGanjiName(123 as any)).toBe('');
    });

    it('should handle boolean input (returns empty)', () => {
      expect(getGanjiName(true as any)).toBe('');
    });

    it('should handle array input (returns empty)', () => {
      expect(getGanjiName([] as any)).toBe('');
    });

    it('should handle object with name as number', () => {
      const result = getGanjiName({ name: 123 } as any);
      expect(typeof result === 'string' || typeof result === 'number').toBe(true);
    });

    it('should handle nested object', () => {
      const result = getGanjiName({ name: { nested: 'value' } } as any);
      expect(result).toBeDefined();
    });
  });

  describe('Element distribution', () => {
    it('should have 2 Wood stems', () => {
      const woodStems = ['갑', '을', '甲', '乙'];
      woodStems.forEach(stem => {
        expect(getElementOfChar(stem)).toBe('Wood');
      });
    });

    it('should have 2 Fire stems', () => {
      const fireStems = ['병', '정', '丙', '丁'];
      fireStems.forEach(stem => {
        expect(getElementOfChar(stem)).toBe('Fire');
      });
    });

    it('should have 2 Earth stems', () => {
      const earthStems = ['무', '기', '戊', '己'];
      earthStems.forEach(stem => {
        expect(getElementOfChar(stem)).toBe('Earth');
      });
    });

    it('should have 2 Metal stems', () => {
      const metalStems = ['경', '신', '庚', '辛'];
      metalStems.forEach(stem => {
        expect(getElementOfChar(stem)).toBe('Metal');
      });
    });

    it('should have 2 Water stems', () => {
      const waterStems = ['임', '계', '壬', '癸'];
      waterStems.forEach(stem => {
        expect(getElementOfChar(stem)).toBe('Water');
      });
    });

    it('should have 2 Water branches', () => {
      const waterBranches = ['자', '해', '子', '亥'];
      waterBranches.forEach(branch => {
        expect(getElementOfChar(branch)).toBe('Water');
      });
    });

    it('should have 2 Wood branches', () => {
      const woodBranches = ['인', '묘', '寅', '卯'];
      woodBranches.forEach(branch => {
        expect(getElementOfChar(branch)).toBe('Wood');
      });
    });

    it('should have 2 Fire branches', () => {
      const fireBranches = ['사', '오', '巳', '午'];
      fireBranches.forEach(branch => {
        expect(getElementOfChar(branch)).toBe('Fire');
      });
    });

    it('should have 2 Metal branches', () => {
      const metalBranches = ['신', '유', '申', '酉'];
      metalBranches.forEach(branch => {
        expect(getElementOfChar(branch)).toBe('Metal');
      });
    });

    it('should have 4 Earth branches', () => {
      const earthBranches = ['축', '진', '미', '술', '丑', '辰', '未', '戌'];
      earthBranches.forEach(branch => {
        expect(getElementOfChar(branch)).toBe('Earth');
      });
    });
  });

  describe('Consistency tests', () => {
    it('should return same element for Korean and Chinese stem pairs', () => {
      const pairs = [
        ['갑', '甲'], ['을', '乙'], ['병', '丙'], ['정', '丁'],
        ['무', '戊'], ['기', '己'], ['경', '庚'], ['신', '辛'],
        ['임', '壬'], ['계', '癸'],
      ];
      pairs.forEach(([korean, chinese]) => {
        expect(getElementOfChar(korean)).toBe(getElementOfChar(chinese));
      });
    });

    it('should return same element for Korean and Chinese branch pairs', () => {
      const pairs = [
        ['자', '子'], ['축', '丑'], ['인', '寅'], ['묘', '卯'],
        ['진', '辰'], ['사', '巳'], ['오', '午'], ['미', '未'],
        ['신', '申'], ['유', '酉'], ['술', '戌'], ['해', '亥'],
      ];
      pairs.forEach(([korean, chinese]) => {
        expect(getElementOfChar(korean)).toBe(getElementOfChar(chinese));
      });
    });
  });

  describe('Type safety tests', () => {
    it('should return ElementEN or null', () => {
      const result = getElementOfChar('갑');
      if (result !== null) {
        const validElements: ElementEN[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];
        expect(validElements).toContain(result);
      }
    });

    it('should always return string from getGanjiName', () => {
      expect(typeof getGanjiName('test')).toBe('string');
      expect(typeof getGanjiName(null)).toBe('string');
      expect(typeof getGanjiName({ name: 'test' })).toBe('string');
    });
  });

  describe('All valid characters', () => {
    const allValidChars = [
      // Korean stems
      '갑', '을', '병', '정', '무', '기', '경', '신', '임', '계',
      // Chinese stems
      '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸',
      // Korean branches
      '자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해',
      // Chinese branches
      '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
    ];

    allValidChars.forEach(char => {
      it(`should return non-null for ${char}`, () => {
        expect(getElementOfChar(char)).not.toBe(null);
      });
    });

    allValidChars.forEach(char => {
      it(`should return valid ElementEN for ${char}`, () => {
        const result = getElementOfChar(char);
        expect(['Wood', 'Fire', 'Earth', 'Metal', 'Water']).toContain(result);
      });
    });
  });

  describe('Color code validation', () => {
    it('Wood color should be valid CSS hex', () => {
      const color = ELEMENT_COLORS.Wood;
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('Fire color should be valid CSS hex', () => {
      const color = ELEMENT_COLORS.Fire;
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('Earth color should be valid CSS hex', () => {
      const color = ELEMENT_COLORS.Earth;
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('Metal color should be valid CSS hex', () => {
      const color = ELEMENT_COLORS.Metal;
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('Water color should be valid CSS hex', () => {
      const color = ELEMENT_COLORS.Water;
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});
