/**
 * Translation Maps Tests
 * Tests for Korean translation utilities for Saju/Four Pillars
 */

import { describe, it, expect } from 'vitest';
import {
  stemToKorean,
  branchToKorean,
  formatGanjiEasy,
  parseGanjiEasy,
} from '@/lib/destiny-map/prompt/fortune/base/translation-maps';

describe('translation-maps', () => {
  describe('stemToKorean', () => {
    it('should have all 10 heavenly stems', () => {
      expect(Object.keys(stemToKorean)).toHaveLength(10);
    });

    it('should translate wood stems correctly', () => {
      expect(stemToKorean['甲']).toBe('갑목(나무+)');
      expect(stemToKorean['乙']).toBe('을목(나무-)');
    });

    it('should translate fire stems correctly', () => {
      expect(stemToKorean['丙']).toBe('병화(불+)');
      expect(stemToKorean['丁']).toBe('정화(불-)');
    });

    it('should translate earth stems correctly', () => {
      expect(stemToKorean['戊']).toBe('무토(흙+)');
      expect(stemToKorean['己']).toBe('기토(흙-)');
    });

    it('should translate metal stems correctly', () => {
      expect(stemToKorean['庚']).toBe('경금(쇠+)');
      expect(stemToKorean['辛']).toBe('신금(쇠-)');
    });

    it('should translate water stems correctly', () => {
      expect(stemToKorean['壬']).toBe('임수(물+)');
      expect(stemToKorean['癸']).toBe('계수(물-)');
    });
  });

  describe('branchToKorean', () => {
    it('should have all 12 earthly branches', () => {
      expect(Object.keys(branchToKorean)).toHaveLength(12);
    });

    it('should translate water branches correctly', () => {
      expect(branchToKorean['子']).toBe('자(쥐/물)');
      expect(branchToKorean['亥']).toBe('해(돼지/물)');
    });

    it('should translate earth branches correctly', () => {
      expect(branchToKorean['丑']).toBe('축(소/흙)');
      expect(branchToKorean['辰']).toBe('진(용/흙)');
      expect(branchToKorean['未']).toBe('미(양/흙)');
      expect(branchToKorean['戌']).toBe('술(개/흙)');
    });

    it('should translate wood branches correctly', () => {
      expect(branchToKorean['寅']).toBe('인(호랑이/나무)');
      expect(branchToKorean['卯']).toBe('묘(토끼/나무)');
    });

    it('should translate fire branches correctly', () => {
      expect(branchToKorean['巳']).toBe('사(뱀/불)');
      expect(branchToKorean['午']).toBe('오(말/불)');
    });

    it('should translate metal branches correctly', () => {
      expect(branchToKorean['申']).toBe('신(원숭이/쇠)');
      expect(branchToKorean['酉']).toBe('유(닭/쇠)');
    });
  });

  describe('formatGanjiEasy', () => {
    it('should format 갑자 correctly', () => {
      const result = formatGanjiEasy('甲', '子');
      expect(result).toBe('갑목(나무+) + 자(쥐/물)');
    });

    it('should format 병오 correctly', () => {
      const result = formatGanjiEasy('丙', '午');
      expect(result).toBe('병화(불+) + 오(말/불)');
    });

    it('should format 무진 correctly', () => {
      const result = formatGanjiEasy('戊', '辰');
      expect(result).toBe('무토(흙+) + 진(용/흙)');
    });

    it('should return dash for undefined stem', () => {
      const result = formatGanjiEasy(undefined, '子');
      expect(result).toBe('-');
    });

    it('should return dash for undefined branch', () => {
      const result = formatGanjiEasy('甲', undefined);
      expect(result).toBe('-');
    });

    it('should return dash for both undefined', () => {
      const result = formatGanjiEasy(undefined, undefined);
      expect(result).toBe('-');
    });

    it('should return original character for unknown stem', () => {
      const result = formatGanjiEasy('X', '子');
      expect(result).toBe('X + 자(쥐/물)');
    });

    it('should return original character for unknown branch', () => {
      const result = formatGanjiEasy('甲', 'Y');
      expect(result).toBe('갑목(나무+) + Y');
    });

    it('should handle empty string as falsy', () => {
      const result = formatGanjiEasy('', '');
      expect(result).toBe('-');
    });
  });

  describe('parseGanjiEasy', () => {
    it('should parse 甲子 correctly', () => {
      const result = parseGanjiEasy('甲子');
      expect(result).toBe('갑목(나무+) + 자(쥐/물)');
    });

    it('should parse 丙午 correctly', () => {
      const result = parseGanjiEasy('丙午');
      expect(result).toBe('병화(불+) + 오(말/불)');
    });

    it('should parse 壬寅 correctly', () => {
      const result = parseGanjiEasy('壬寅');
      expect(result).toBe('임수(물+) + 인(호랑이/나무)');
    });

    it('should return dash for undefined', () => {
      const result = parseGanjiEasy(undefined);
      expect(result).toBe('-');
    });

    it('should return dash for empty string', () => {
      const result = parseGanjiEasy('');
      expect(result).toBe('-');
    });

    it('should return as-is for single character', () => {
      const result = parseGanjiEasy('X');
      expect(result).toBe('X');
    });

    it('should handle longer strings by taking first two chars', () => {
      const result = parseGanjiEasy('甲子丙午');
      // Should only parse first two characters
      expect(result).toBe('갑목(나무+) + 자(쥐/물)');
    });

    it('should handle unknown characters', () => {
      const result = parseGanjiEasy('XY');
      expect(result).toBe('X + Y');
    });

    it('should handle mixed known/unknown characters', () => {
      const result = parseGanjiEasy('甲Y');
      expect(result).toBe('갑목(나무+) + Y');
    });
  });
});
