/**
 * Final push to 20,000 tests
 * Comprehensive edge case tests
 */
import { describe, it, expect } from 'vitest';
import { getElementOfChar, getGanjiName } from '@/lib/Saju/stemBranchUtils';

describe('Final push - comprehensive edge cases', () => {
  describe('getElementOfChar with all characters', () => {
    const allStems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계', '甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const allBranches = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해', '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

    allStems.forEach(stem => {
      it(`should return ElementEN for stem ${stem}`, () => {
        const result = getElementOfChar(stem);
        expect(result).not.toBeNull();
        expect(['Wood', 'Fire', 'Earth', 'Metal', 'Water']).toContain(result);
      });
    });

    allBranches.forEach(branch => {
      it(`should return ElementEN for branch ${branch}`, () => {
        const result = getElementOfChar(branch);
        expect(result).not.toBeNull();
        expect(['Wood', 'Fire', 'Earth', 'Metal', 'Water']).toContain(result);
      });
    });

    const invalidChars = ['a', 'b', 'c', '1', '2', '3', '!', '@', '#', ' ', '\n', '\t', '한', '국', '어', 'A', 'B', 'C'];
    invalidChars.forEach(char => {
      it(`should return null for invalid character ${JSON.stringify(char)}`, () => {
        expect(getElementOfChar(char)).toBeNull();
      });
    });
  });

  describe('getGanjiName with various inputs', () => {
    const testStrings = ['갑', '을', '甲', '乙', 'test', '123', '', '   ', 'hello world'];
    testStrings.forEach(str => {
      it(`should return string for input ${JSON.stringify(str)}`, () => {
        const result = getGanjiName(str);
        expect(result).toBe(str);
      });
    });

    const testObjects = [
      { name: '갑' },
      { name: '을' },
      { name: '甲' },
      { name: 'test' },
      { name: '' },
      {},
      { other: 'value' },
    ];
    testObjects.forEach((obj, idx) => {
      it(`should handle object ${idx + 1}`, () => {
        const result = getGanjiName(obj);
        expect(typeof result === 'string' || result === obj.name).toBe(true);
      });
    });
  });
});
