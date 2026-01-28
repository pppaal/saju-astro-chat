/**
 * Tests for src/lib/past-life/utils/helpers.ts
 * 전생 분석 헬퍼 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  selectLang,
  selectLangFromArray,
  isValidHeavenlyStem,
  getGeokgukType,
} from '@/lib/past-life/utils/helpers';

describe('past-life helpers', () => {
  describe('selectLang', () => {
    it('should return Korean text when isKo is true', () => {
      expect(selectLang(true, { ko: '안녕', en: 'Hello' })).toBe('안녕');
    });

    it('should return English text when isKo is false', () => {
      expect(selectLang(false, { ko: '안녕', en: 'Hello' })).toBe('Hello');
    });
  });

  describe('selectLangFromArray', () => {
    const items = [
      { ko: '하나', en: 'One' },
      { ko: '둘', en: 'Two' },
      { ko: '셋', en: 'Three' },
    ] as const;

    it('should return Korean array when isKo is true', () => {
      expect(selectLangFromArray(true, items)).toEqual(['하나', '둘', '셋']);
    });

    it('should return English array when isKo is false', () => {
      expect(selectLangFromArray(false, items)).toEqual(['One', 'Two', 'Three']);
    });

    it('should return empty array for empty input', () => {
      expect(selectLangFromArray(true, [])).toEqual([]);
    });
  });

  describe('isValidHeavenlyStem', () => {
    it('should return true for valid Korean heavenly stems', () => {
      const validStems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
      for (const stem of validStems) {
        expect(isValidHeavenlyStem(stem)).toBe(true);
      }
    });

    it('should return false for invalid characters', () => {
      expect(isValidHeavenlyStem('X')).toBe(false);
      expect(isValidHeavenlyStem('甲')).toBe(false);
      expect(isValidHeavenlyStem('')).toBe(false);
      expect(isValidHeavenlyStem('가')).toBe(false);
    });
  });

  describe('getGeokgukType', () => {
    it('should return correct type for known geokguk names', () => {
      expect(getGeokgukType('식신')).toBe('siksin');
      expect(getGeokgukType('식신격')).toBe('siksin');
      expect(getGeokgukType('상관')).toBe('sanggwan');
      expect(getGeokgukType('정관')).toBe('jeonggwan');
      expect(getGeokgukType('편관')).toBe('pyeongwan');
      expect(getGeokgukType('정재')).toBe('jeongjae');
    });

    it('should return null for undefined', () => {
      expect(getGeokgukType(undefined)).toBeNull();
    });

    it('should return null for unknown name', () => {
      expect(getGeokgukType('알수없는격')).toBeNull();
    });

    it('should handle alternate name 칠살', () => {
      expect(getGeokgukType('칠살')).toBe('pyeongwan');
    });
  });
});
